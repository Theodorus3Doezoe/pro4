using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.Hosting;
using Microsoft.EntityFrameworkCore;
using System.Collections.Generic;
using System.Linq;
using BCrypt.Net;

var builder = WebApplication.CreateBuilder(args);

// Voeg de DbContext toe voor MySQL
builder.Services.AddDbContext<YourDbContext>(options =>
    options.UseMySql(builder.Configuration.GetConnectionString("MySQLConnection"),
                     new MySqlServerVersion(new Version(8, 0, 42)))); // Vervang met jouw MySQL server versie

var app = builder.Build();

// In-memory store
var users = new List<User>();

app.MapGet("/users", () => Results.Ok(users));

app.MapPatch("/users/{id}", async (int id, YourDbContext dbContext, HttpContext http) =>
{
    var creds = await http.Request.ReadFromJsonAsync<LoginDto>();
    if (creds == null)
        return Results.BadRequest(new { message = "Invalid payload" });



    return Results.Ok(new {message = "Values changed"});
});

app.MapDelete("/users/{id}", async (int id, YourDbContext dbContext, HttpContext http) =>
{
    // Logica om het item met het gegeven 'id' te verwijderen
     var userToDelete = await dbContext.Users.FindAsync(id);

    if (userToDelete is null)
    {
        return Results.NotFound(new { message = $"User with ID '{id}' not found." });
    }

    dbContext.Users.Remove(userToDelete);
    await dbContext.SaveChangesAsync();

    return Results.NoContent();
});

// Register endpoint
app.MapPost("/register", async (YourDbContext dbContext, HttpContext http) =>
{
    var creds = await http.Request.ReadFromJsonAsync<RegisterDto>();
    if (creds == null || string.IsNullOrWhiteSpace(creds.Username) || string.IsNullOrWhiteSpace(creds.Password))
        return Results.BadRequest(new { message = "Invalid payload" }); //versturen als object vanwege toast

    if (users.Any(u => u.Username == creds.Username))
        return Results.Conflict(new { message = "User already exists" });

    // check if passwords match

    if (creds.Password != creds.ConfirmPassword)
        return Results.BadRequest(new { message = "Passwords don't match"});

    string hashedPassword = BCrypt.Net.BCrypt.HashPassword(creds.Password);

    // For demo: storing plain text (not for production!)
    users.Add(new User { Username = creds.Username, Password = hashedPassword });
    return Results.Ok(new { message = "Registration successful" });
});

// Login endpoint
app.MapPost("/login", async (YourDbContext dbContext, HttpContext http) =>
{
    var creds = await http.Request.ReadFromJsonAsync<LoginDto>();
    if (creds == null)
        return Results.BadRequest(new { message = "Invalid payload" });

    var user = users.FirstOrDefault(u => u.Username == creds.Username);

    if (user == null)
        return Results.BadRequest(new { message = "User does not exist" });

    bool isPasswordValid = BCrypt.Net.BCrypt.Verify(creds.Password, user.Password);

    if (!isPasswordValid)
    {
        return Results.BadRequest(new { message = "Invalid password" }); // Using a generic message for security
    }

    return Results.Ok(new { message = "Login successful" });
});

app.Run();

// Models


public class RegisterDto
{
    public string Username { get; set; }
    public string Password { get; set; }
    public string ConfirmPassword {get; set;}
}

public class LoginDto {
    public string Username { get; set; }
    public string Password { get; set; }
}

public class User
{
    public int Id { get; set; }
    public string Username { get; set; }
    public string Password { get; set; }
}

// DB Context
public class YourDbContext : DbContext
{
    public YourDbContext(DbContextOptions<YourDbContext> options) : base(options)
    {
    }

    public DbSet<User> Users { get; set; }
    

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        // Hier kun je je database mapping configureren (fluent API)
        // modelBuilder.Entity<User>().HasKey(u => u.Id);
        base.OnModelCreating(modelBuilder);
    }
}