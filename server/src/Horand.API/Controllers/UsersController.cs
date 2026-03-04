namespace Horand.API.Controllers;

using Horand.Application.DTOs.User;
using Horand.Infrastructure.Data;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

[ApiController]
[Route("api/users")]
[Authorize]
public class UsersController : ControllerBase
{
    private readonly HorandDbContext _dbContext;

    public UsersController(HorandDbContext dbContext)
    {
        _dbContext = dbContext;
    }

    [HttpGet("search")]
    public async Task<IActionResult> Search([FromQuery] string q = "")
    {
        if (string.IsNullOrWhiteSpace(q) || q.Length < 2)
            return Ok(Array.Empty<UserSearchResponse>());

        var users = await _dbContext.Users
            .Where(u => u.FullName.ToLower().Contains(q.ToLower()) || u.Email.ToLower().Contains(q.ToLower()))
            .OrderBy(u => u.FullName)
            .Take(20)
            .Select(u => new UserSearchResponse(u.Id, u.Email, u.FullName))
            .ToListAsync();

        return Ok(users);
    }
}
