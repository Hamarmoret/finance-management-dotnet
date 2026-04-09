using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using FinanceManagement.Api.Middleware;
using FinanceManagement.Api.Models;
using FinanceManagement.Api.Services.Users;

namespace FinanceManagement.Api.Controllers;

[ApiController]
[Route("api/users")]
[Authorize]
public class UsersController : ControllerBase
{
    private readonly UsersService _usersService;

    public UsersController(UsersService usersService)
    {
        _usersService = usersService;
    }

    /// <summary>
    /// GET /api/users
    /// List all users (admin only)
    /// </summary>
    [HttpGet]
    public async Task<IActionResult> GetAll(
        [FromQuery] int page = 1,
        [FromQuery] int limit = 20,
        [FromQuery] string? search = null,
        [FromQuery] string? role = null,
        [FromQuery] bool? isActive = null)
    {
        RequireAdmin();
        var (users, total) = await _usersService.GetAllAsync(page, limit, search, role, isActive);

        return Ok(new PaginatedResponse<UserDto>
        {
            Data = users,
            Pagination = new PaginationInfo
            {
                Page = page,
                Limit = limit,
                Total = total,
                TotalPages = (int)Math.Ceiling((double)total / limit),
            }
        });
    }

    /// <summary>
    /// GET /api/users/{id}
    /// Get user by ID. Admins may view any profile; others may only view their own.
    /// </summary>
    [HttpGet("{id:guid}")]
    public async Task<IActionResult> GetById(Guid id)
    {
        var requesterId = HttpContext.GetRequiredUserId();
        if (id != requesterId)
            RequireAdmin();

        var user = await _usersService.GetByIdAsync(id);
        return Ok(ApiResponse<UserWithPermissionsDto>.Ok(user));
    }

    /// <summary>
    /// PATCH /api/users/{id}/role
    /// Update user role (admin only)
    /// </summary>
    [HttpPatch("{id:guid}/role")]
    public async Task<IActionResult> UpdateRole(Guid id, [FromBody] UpdateRoleRequest request)
    {
        RequireAdmin();
        var adminUserId = HttpContext.GetRequiredUserId();
        var requesterRole = HttpContext.GetUserRole()!;
        var user = await _usersService.UpdateRoleAsync(id, request.Role, adminUserId, requesterRole);
        return Ok(ApiResponse<UserDto>.Ok(user));
    }

    /// <summary>
    /// PATCH /api/users/{id}/active
    /// Toggle user active status (admin only)
    /// </summary>
    [HttpPatch("{id:guid}/active")]
    public async Task<IActionResult> ToggleActive(Guid id, [FromBody] ToggleActiveRequest request)
    {
        RequireAdmin();
        var adminUserId = HttpContext.GetRequiredUserId();
        var requesterRole = HttpContext.GetUserRole()!;
        var user = await _usersService.ToggleActiveAsync(id, request.IsActive, adminUserId, requesterRole);
        return Ok(ApiResponse<UserDto>.Ok(user));
    }

    /// <summary>
    /// DELETE /api/users/{id}
    /// Delete user (admin only)
    /// </summary>
    [HttpDelete("{id:guid}")]
    public async Task<IActionResult> Delete(Guid id)
    {
        RequireAdmin();
        var adminUserId = HttpContext.GetRequiredUserId();
        var requesterRole = HttpContext.GetUserRole()!;
        await _usersService.DeleteAsync(id, adminUserId, requesterRole);
        return Ok(ApiResponse<object>.Ok(new { message = "User permanently deleted" }));
    }

    /// <summary>
    /// GET /api/users/{id}/permissions
    /// Get user's P&amp;L permissions (admin only)
    /// </summary>
    [HttpGet("{id:guid}/permissions")]
    public async Task<IActionResult> GetPnlPermissions(Guid id)
    {
        RequireAdmin();
        var permissions = await _usersService.GetPnlPermissionsAsync(id);
        return Ok(ApiResponse<List<PnlPermissionDto>>.Ok(permissions));
    }

    /// <summary>
    /// PUT /api/users/{id}/permissions
    /// Set user's P&amp;L permissions (admin only)
    /// </summary>
    [HttpPut("{id:guid}/permissions")]
    public async Task<IActionResult> SetPnlPermissions(Guid id, [FromBody] SetPnlPermissionsRequest request)
    {
        RequireAdmin();
        var adminUserId = HttpContext.GetRequiredUserId();
        var permissions = await _usersService.SetPnlPermissionsAsync(id, request.Permissions, adminUserId);
        return Ok(ApiResponse<List<PnlPermissionDto>>.Ok(permissions));
    }

    /// <summary>
    /// POST /api/users/invite
    /// Invite a new user (admin only)
    /// </summary>
    [HttpPost("invite")]
    public async Task<IActionResult> InviteUser([FromBody] InviteUserRequest request)
    {
        RequireAdmin();
        var adminUserId = HttpContext.GetRequiredUserId();
        var requesterRole = HttpContext.GetUserRole()!;
        var user = await _usersService.InviteUserAsync(
            request.Email, request.FirstName, request.LastName, request.Role, adminUserId, requesterRole);
        return StatusCode(201, ApiResponse<UserDto>.Ok(user));
    }

    // =============================================
    // Helper
    // =============================================

    private void RequireAdmin()
    {
        var role = HttpContext.GetUserRole();
        if (role != "admin" && role != "owner")
            throw new AppException("Admin access required", 403, "FORBIDDEN");
    }
}
