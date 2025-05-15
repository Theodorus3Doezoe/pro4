using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.Hosting;
using Microsoft.EntityFrameworkCore;
using MySql.EntityFrameworkCore.Extensions;
using System.Linq;
using BCrypt.Net;

var builder = WebApplication.CreateBuilder(args);

// Voeg de DbContext toe voor MySQL
var connectionString = builder.Configuration.GetConnectionString("MySQLConnection");
if (connectionString == null)
{
    throw new InvalidOperationException("Connection string 'MySQLConnection' not found.");
}

builder.Services.AddDbContext<MyDbContext>(options =>
    options.UseMySQL(connectionString)
);

var app = builder.Build();

// In-memory store
var users = new List<User>();

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
    if (creds == null || string.IsNullOrWhiteSpace(creds.Username) || string.IsNullOrWhiteSpace(creds.Password))
        return Results.BadRequest(new { message = "Invalid payload" }); //versturen als object vanwege toast

    if (await dbContext.Users.AnyAsync(u => u.Name == creds.Username))
        return Results.Conflict(new { message = "User already exists" });

    // check if passwords match
    if (creds.Password != creds.ConfirmPassword)
        return Results.BadRequest(new { message = "Passwords don't match" });

    string hashedPassword = BCrypt.Net.BCrypt.HashPassword(creds.Password);

    // For demo: storing plain text (not for production!)
    var newUser = new User { Name = creds.Username, Password = hashedPassword };
    dbContext.Users.Add(newUser);
    await dbContext.SaveChangesAsync();
    return Results.Ok(new { message = "Registration successful" });
});

// Login endpoint
app.MapPost("/login", async (MyDbContext dbContext, HttpContext http) =>
{
    var creds = await http.Request.ReadFromJsonAsync<LoginDto>();
    if (creds == null)
        return Results.BadRequest(new { message = "Invalid payload" });

    var user = await dbContext.Users.FirstOrDefaultAsync(u => u.Name == creds.Username);

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

// DTO's
public class RegisterDto
{
    public required string Username { get; set; }
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

// DB Context
public class MyDbContext : DbContext
{
    public MyDbContext(DbContextOptions<MyDbContext> options) : base(options)
    {
    }

    public DbSet<User> Users { get; set; }

    // Andere DbSets en configuraties...
}

public class User
{
    public int Id { get; set; }
    public required string Name { get; set; }
    public required string Password { get; set; }
}