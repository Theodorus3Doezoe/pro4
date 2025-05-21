using System;
using Microsoft.EntityFrameworkCore.Migrations;
using MySql.EntityFrameworkCore.Metadata;

#nullable disable

namespace server.Migrations
{
    /// <inheritdoc />
    public partial class InitialSetupWithAllUserFields : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AlterDatabase()
                .Annotation("MySQL:Charset", "utf8mb4");

    migrationBuilder.AddColumn<string>(
    name: "Email",
    table: "Users",
    type: "varchar(255)", // << GEWIJZIGD TYPE
    nullable: false,
    defaultValue: "" 
    );

    migrationBuilder.AddColumn<DateTime>(
        name: "DateJoined",
        table: "Users", // De bestaande tabelnaam
        type: "datetime(6)", // Het type zoals bepaald door EF Core
        nullable: false,
        // Standaardwaarde voor DateTime als de kolom NOT NULL is.
        // DateTime.MinValue (0001-01-01) wordt vaak gebruikt.
        defaultValue: new DateTime(1, 1, 1, 0, 0, 0, 0, DateTimeKind.Unspecified)
    );
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "Email",
                table: "Users");

            migrationBuilder.DropColumn(
                name: "DateJoined",
                table: "Users");
        }
    }
}
