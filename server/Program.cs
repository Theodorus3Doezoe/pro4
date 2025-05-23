using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.Hosting;
using Microsoft.EntityFrameworkCore;
using MySql.EntityFrameworkCore.Extensions;
using System.Linq;
using BCrypt.Net;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.IdentityModel.Tokens;
using System.Text;
using System.Security.Claims;
using Dapper;

var builder = WebApplication.CreateBuilder(args);
var jwtKey = builder.Configuration["Jwt:Key"];
var jwtIssuer = builder.Configuration["Jwt:Issuer"];
var jwtAudience = builder.Configuration["Jwt:Audience"];

if (string.IsNullOrEmpty(jwtKey))
{
    throw new InvalidOperationException("JWT Key is niet geconfigureerd in appsettings.json");
}

const string MyAllowSpecificOrigins = "_myAllowSpecificOrigins";

builder.Services.AddCors(options =>
{
    options.AddPolicy(name: MyAllowSpecificOrigins,
                      policy =>
                      {
                          policy.WithOrigins(
                                  "http://localhost:5173" // VERVANG DIT met de exacte URL van je React app
                                  // Je kunt meerdere origins toevoegen als dat nodig is:
                                  // "http://localhost:5173", // Bijvoorbeeld als je Vite gebruikt
                                  // "https://jouw-productie-frontend.com"
                                )
                                .AllowAnyHeader()
                                .AllowAnyMethod()
                                .AllowCredentials(); // << BELANGRIJK: Deze regel toevoegen!
                      });
});



// Voeg de DbContext toe voor MySQL
var connectionString = builder.Configuration.GetConnectionString("MySQLConnection");
if (connectionString == null)
{
    throw new InvalidOperationException("Connection string 'MySQLConnection' not found.");
}

builder.Services.AddDbContext<MyDbContext>(options =>
    options.UseMySQL(connectionString)
);

builder.Services.AddAuthentication(options =>
{
    options.DefaultAuthenticateScheme = JwtBearerDefaults.AuthenticationScheme;
    options.DefaultChallengeScheme = JwtBearerDefaults.AuthenticationScheme;
})
.AddJwtBearer(options =>
{
    options.TokenValidationParameters = new TokenValidationParameters
    {
        ValidateIssuer = true,
        ValidateAudience = true,
        ValidateLifetime = true,
        ValidateIssuerSigningKey = true,
        ValidIssuer = jwtIssuer,
        ValidAudience = jwtAudience,
        IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwtKey))
    };
    // JWT uit cookie lezen
    options.Events = new JwtBearerEvents
    {
        OnMessageReceived = context =>
        {
            context.Token = context.Request.Cookies["AuthToken"]; // Cookie naam, pas aan indien nodig
            return Task.CompletedTask;
        }
    };
});

builder.Services.AddAuthorization();

var app = builder.Build();

app.UseCors(MyAllowSpecificOrigins);
app.UseAuthentication();
app.UseAuthorization();

app.MapGet("/users", async (MyDbContext dbContext) =>
{
    var users = await dbContext.Users.Select(u => new UserDto { Id = u.Id, Name = u.Name }).ToListAsync();
    return Results.Ok(users);
});

app.MapGet("/users/{id}", async (int id, MyDbContext dbContext) =>
{
    var user = await dbContext.Users.Select(u => new UserDto { Id = u.Id, Name = u.Name }).FirstOrDefaultAsync(u => u.Id == id);
    if (user == null)
    {
        return Results.NotFound(new { message = $"User with ID '{id}' not found." });
    }
    return Results.Ok(user);
});

app.MapDelete("/users/{id}", async (int id, MyDbContext dbContext) =>
{
    var userToDelete = await dbContext.Users.FindAsync(id);
    if (userToDelete == null)
    {
        return Results.NotFound(new { message = $"User with ID '{id}' not found." });
    }

    dbContext.Users.Remove(userToDelete);
    await dbContext.SaveChangesAsync();

    return Results.Ok(new { message = "User deleted" });
});

// Register endpoint
app.MapPost("/register", async (MyDbContext dbContext, HttpContext http) =>
{
    var creds = await http.Request.ReadFromJsonAsync<RegisterDto>();
    if (creds == null || string.IsNullOrWhiteSpace(creds.Username) || string.IsNullOrWhiteSpace(creds.Email) || string.IsNullOrWhiteSpace(creds.Password) || string.IsNullOrWhiteSpace(creds.ConfirmPassword))
        return Results.BadRequest(new { message = "Invalid payload" }); //versturen als object vanwege toast

    if (await dbContext.Users.AnyAsync(u => u.Name == creds.Username))
        return Results.Conflict(new { message = "User already exists" });

    if (await dbContext.Users.AnyAsync(u => u.Email == creds.Email))
    return Results.Conflict(new { message = "Email is already in use" });

    // check if passwords match
    if (creds.Password != creds.ConfirmPassword)
        return Results.BadRequest(new { message = "Passwords don't match" });

    string hashedPassword = BCrypt.Net.BCrypt.HashPassword(creds.Password);

    // For demo: storing plain text (not for production!)
    var newUser = new User
    {
        Name = creds.Username,
        Password = hashedPassword,
        Email = creds.Email,
        DateJoined = DateTime.UtcNow
    };
    dbContext.Users.Add(newUser);
    await dbContext.SaveChangesAsync();
    return Results.Ok(new { message = "Registration successful" });
});

// Login endpoint
// Login Endpoint (aangepast)
app.MapPost("/login", async (MyDbContext dbContext, HttpContext http, IConfiguration config) =>
{
    var creds = await http.Request.ReadFromJsonAsync<LoginDto>();
    if (creds == null || string.IsNullOrWhiteSpace(creds.Username) || string.IsNullOrWhiteSpace(creds.Password))
        return Results.BadRequest(new { message = "Ongeldige payload" });

    var user = await dbContext.Users.FirstOrDefaultAsync(u => u.Name == creds.Username);

    if (user == null)
        return Results.BadRequest(new { message = "Ongeldige gebruikersnaam of wachtwoord" }); // Gebruik BadRequest (401)

    bool isPasswordValid = BCrypt.Net.BCrypt.Verify(creds.Password, user.Password);

    if (!isPasswordValid)
    {
        return Results.BadRequest(new { message = "Ongeldige gebruikersnaam of wachtwoord" }); // Gebruik BadRequest (401)
    }

    // Genereer JWT
    var tokenHandler = new System.IdentityModel.Tokens.Jwt.JwtSecurityTokenHandler();
    var key = Encoding.UTF8.GetBytes(config["Jwt:Key"]!);
    var tokenDescriptor = new SecurityTokenDescriptor
    {
        Subject = new ClaimsIdentity(new[]
        {
            new Claim(ClaimTypes.NameIdentifier, user.Id.ToString()), // Gebruikers-ID
            new Claim(ClaimTypes.Name, user.Name),
            // Voeg eventueel andere claims toe (bijv. rollen)
        }),
        Expires = DateTime.UtcNow.AddHours(1), // Token geldigheidsduur
        Issuer = config["Jwt:Issuer"],
        Audience = config["Jwt:Audience"],
        SigningCredentials = new SigningCredentials(new SymmetricSecurityKey(key), SecurityAlgorithms.HmacSha256Signature)
    };
    var token = tokenHandler.CreateToken(tokenDescriptor);
    var tokenString = tokenHandler.WriteToken(token);

    // Stel cookie in
    http.Response.Cookies.Append("AuthToken", tokenString, new CookieOptions
    {
        HttpOnly = true, // Kan niet via JS benaderd worden
        Secure = http.Request.IsHttps, // Verstuur alleen via HTTPS (zet op true in productie)
        SameSite = SameSiteMode.Lax,   // Bescherming tegen CSRF. Gebruik .None als frontend en backend op totaal verschillende domeinen draaien (vereist Secure=true)
        Expires = DateTime.UtcNow.AddHours(1), // Laat cookie verlopen met token
        Path = "/" // Cookie beschikbaar voor hele site
    });

    return Results.Ok(new { message = "Login succesvol" }); // Stuur token niet meer mee in body
});

app.MapGet("/api/me", async (ClaimsPrincipal claimsUser, MyDbContext dbContext) =>
{
    var userIdString = claimsUser.FindFirstValue(ClaimTypes.NameIdentifier);
    if (string.IsNullOrEmpty(userIdString) || !int.TryParse(userIdString, out var userId)) // Of ander type ID
    {
        return Results.BadRequest(new { message = "Gebruiker niet geautoriseerd of ID niet gevonden in token." });
    }

    var user = await dbContext.Users.FindAsync(userId); // Of FirstOrDefaultAsync, afhankelijk van je ID type
    if (user == null)
    {
        return Results.NotFound(new { message = "Gebruiker niet gevonden." });
    }

    // Stuur alleen veilige data terug (geen wachtwoord hash!)
    return Results.Ok(new { id = user.Id, username = user.Name, email = user.Email, dateJoined = user.DateJoined /* andere veilige properties */ });
})
.RequireAuthorization(); // Deze regel beveiligt het endpoint

// Logout Endpoint
app.MapPost("/logout", (HttpContext http) =>
{
    http.Response.Cookies.Delete("AuthToken", new CookieOptions
    {
        HttpOnly = true,
        Secure = http.Request.IsHttps,
        SameSite = SameSiteMode.Lax,
        Path = "/"
    });
    return Results.Ok(new { message = "Uitgelogd" });
});

app.MapPost("/api/workouts", async (MyDbContext dbContext, ClaimsPrincipal claimsUser, LogWorkoutDto workoutDto) =>
{
    var userIdString = claimsUser.FindFirstValue(ClaimTypes.NameIdentifier); // Haal ID van ingelogde gebruiker op
    if (!int.TryParse(userIdString, out var userId))
    {
        return Results.BadRequest(new { message = "Gebruikers ID niet gevonden of ongeldig." });
    }

    // Optioneel: controleer of de gebruiker bestaat, hoewel de foreign key dit later ook zou afvangen.
    // var user = await dbContext.Users.FindAsync(userId);
    // if (user == null) { return Results.NotFound(new { message = "Gebruiker niet gevonden." }); }

    var newWorkout = new Workout
    {
        Score = workoutDto.Score,
        Duration = TimeSpan.FromSeconds(workoutDto.DurationInSeconds), // Converteer seconden naar TimeSpan
        WorkoutDate = TimeZoneInfo.ConvertTimeFromUtc(workoutDto.WorkoutDate.ToUniversalTime(), TimeZoneInfo.FindSystemTimeZoneById("Central European Standard Time")),
        UserId = userId // Koppel aan de huidige gebruiker
    };

    dbContext.Workouts.Add(newWorkout);
    await dbContext.SaveChangesAsync();

    return Results.Created($"/api/workouts/{newWorkout.Id}", new { message = "Workout succesvol opgeslagen!", workoutId = newWorkout.Id });
})
.RequireAuthorization(); // Zorg ervoor dat alleen ingelogde gebruikers dit endpoint kunnen aanroepen

app.MapGet("/api/workouts/my", async (MyDbContext dbContext, ClaimsPrincipal claimsUser) =>
{
    var userIdString = claimsUser.FindFirstValue(ClaimTypes.NameIdentifier);
    if (!int.TryParse(userIdString, out var userId))
    {
        return Results.BadRequest(new { message = "Gebruikers ID niet gevonden of ongeldig." });
    }

    var workouts = await dbContext.Workouts
        .Where(w => w.UserId == userId)
        .OrderByDescending(w => w.WorkoutDate) // Nieuwste workouts eerst
        .Select(w => new // Projecteer naar een anoniem type of DTO voor de frontend
        {
            w.Id, // Handig voor een 'key' in React lijsten
            w.Score,
            DurationInSeconds = w.Duration.TotalSeconds, // Stuur als seconden, makkelijker voor JS
            WorkoutDate = w.WorkoutDate // JS kan dit formatteren
        })
        .ToListAsync();

    if (workouts == null) // Hoewel ToListAsync een lege lijst retourneert, niet null
    {
        return Results.Ok(new List<object>()); // Stuur een lege lijst als er geen workouts zijn
    }

    return Results.Ok(workouts);
})
.RequireAuthorization(); // Alleen ingelogde gebruikers kunnen hun workouts zien

// --- NIEUW ENDPOINT VOOR HIGHSCORES ---
app.MapGet("/api/highscores/top/{count}", async (int count, MyDbContext dbContext) =>
{
    if (count <= 0)
    {
        return Results.BadRequest(new { message = "Het aantal highscores moet groter zijn dan 0." });
    }

    var highscores = await dbContext.Workouts
        .GroupBy(w => w.UserId) // Groepeer workouts per gebruiker
        .Select(g => new {
            UserId = g.Key,
            MaxScore = g.Max(w => w.Score) // Selecteer de hoogste score per gebruiker
        })
        .OrderByDescending(s => s.MaxScore) // Sorteer op de hoogste score aflopend
        .Take(count) // Neem het opgegeven aantal (top X)
        .Join(dbContext.Users, // Join met de Users tabel om de gebruikersnaam op te halen
            highscoreEntry => highscoreEntry.UserId,
            user => user.Id,
            (highscoreEntry, user) => new UserHighscoreDto // Projecteer naar de DTO
            {
                Username = user.Name,
                Score = highscoreEntry.MaxScore
            })
        .ToListAsync();

    return Results.Ok(highscores);
});
// --- EINDE NIEUW ENDPOINT ---

app.Run();

// DTO's
public class RegisterDto
{
    public required string Username { get; set; }
    
    public required string Email { get; set; }

    public required string Password { get; set; }
    public required string ConfirmPassword { get; set; }
}

public class LoginDto
{
    public required string Username { get; set; }
    public required string Password { get; set; }
}

public class UserDto
{
    public int Id { get; set; }
    public required string Name { get; set; }
}

// --- NIEUWE DTO VOOR HIGHSCORES ---
public class UserHighscoreDto
{
    public required string Username { get; set; }
    public int Score { get; set; }
}
// --- EINDE NIEUWE DTO ---

public record LogWorkoutDto(int Score, double DurationInSeconds, DateTime WorkoutDate);

// DB Context
public class MyDbContext : DbContext // Of IdentityDbContext etc.
{
    public DbSet<User> Users { get; set; }
    public DbSet<Workout> Workouts { get; set; } // << NIEUWE DbSet

    public MyDbContext(DbContextOptions<MyDbContext> options) : base(options) { }

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder); // Belangrijk!

        // Configuratie voor de User-Workout relatie
        modelBuilder.Entity<User>()
            .HasMany(u => u.Workouts)      // Een User heeft veel Workouts
            .WithOne(w => w.User)          // Een Workout heeft één User
            .HasForeignKey(w => w.UserId)  // De foreign key in Workout is UserId
            .IsRequired();                 // Een workout moet altijd aan een User gekoppeld zijn
                                           // Optioneel: .OnDelete(DeleteBehavior.Cascade) als workouts
                                           // verwijderd moeten worden als de gebruiker wordt verwijderd.
    }
}


public class User
{
    public int Id { get; set; }
    public required string Name { get; set; }
    public required string Email { get; set; }
    public DateTime DateJoined { get; set; } // Aanbevolen: DateTime
    public required string Password { get; set; }
    public virtual ICollection<Workout> Workouts { get; set; } = new List<Workout>();
}

public class Workout
{
    public int Id { get; set; } // Primaire sleutel

    public int Score { get; set; } // De score van deze specifieke workout
    public TimeSpan Duration { get; set; } // Hoe lang de workout duurde
    public DateTime WorkoutDate { get; set; } // Wanneer de workout is uitgevoerd

    // Foreign Key naar de User tabel
    public int UserId { get; set; }
    // Navigatie-eigenschap naar de gerelateerde User
    public virtual User User { get; set; } = null!;
}