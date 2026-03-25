using System.Net;
using System.Net.Mail;

namespace FinanceManagement.Api.Services;

public class EmailService
{
    private readonly ILogger<EmailService> _logger;
    private readonly string? _gmailUser;
    private readonly string? _gmailAppPassword;
    private readonly string _frontendUrl;
    private const string AppName = "Finance Management";

    public EmailService(ILogger<EmailService> logger)
    {
        _logger = logger;
        _gmailUser = Environment.GetEnvironmentVariable("GMAIL_USER");
        _gmailAppPassword = Environment.GetEnvironmentVariable("GMAIL_APP_PASSWORD");
        _frontendUrl = Environment.GetEnvironmentVariable("FRONTEND_URL") ?? "http://localhost:5173";
    }

    private bool IsConfigured => !string.IsNullOrEmpty(_gmailUser) && !string.IsNullOrEmpty(_gmailAppPassword);

    private async Task<bool> SendAsync(string to, string subject, string htmlBody, string? textBody = null)
    {
        if (!IsConfigured)
        {
            _logger.LogWarning("Email not configured. Set GMAIL_USER and GMAIL_APP_PASSWORD environment variables.");
            return false;
        }

        try
        {
            using var client = new SmtpClient("smtp.gmail.com", 587)
            {
                Credentials = new NetworkCredential(_gmailUser, _gmailAppPassword),
                EnableSsl = true,
            };

            var message = new MailMessage
            {
                From = new MailAddress(_gmailUser!, AppName),
                Subject = subject,
                IsBodyHtml = true,
                Body = htmlBody,
            };
            message.To.Add(to);

            await client.SendMailAsync(message);
            _logger.LogInformation("Email sent to {To}: {Subject}", to, subject);
            return true;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to send email to {To}: {Subject}", to, subject);
            return false;
        }
    }

    public async Task<bool> SendPasswordResetAsync(string email, string firstName, string resetToken)
    {
        var resetLink = $"{_frontendUrl}/reset-password?token={resetToken}";

        var html = $"""
            <!DOCTYPE html>
            <html>
            <head>
              <meta charset="utf-8">
              <meta name="viewport" content="width=device-width, initial-scale=1.0">
            </head>
            <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
              <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; border-radius: 10px 10px 0 0; text-align: center;">
                <h1 style="color: white; margin: 0; font-size: 24px;">Password Reset</h1>
              </div>
              <div style="background: #f9fafb; padding: 30px; border-radius: 0 0 10px 10px; border: 1px solid #e5e7eb; border-top: none;">
                <p>Hi {firstName},</p>
                <p>We received a request to reset your password for {AppName}.</p>
                <div style="text-align: center; margin: 30px 0;">
                  <a href="{resetLink}" style="display: inline-block; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; text-decoration: none; padding: 12px 30px; border-radius: 6px; font-weight: 500;">Reset Password</a>
                </div>
                <p style="color: #6b7280; font-size: 14px;">This link will expire in 1 hour.</p>
                <p style="color: #6b7280; font-size: 14px;">If you didn't request a password reset, you can safely ignore this email. Your password will remain unchanged.</p>
                <p style="color: #6b7280; font-size: 12px; margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb;">
                  If the button doesn't work, copy and paste this link into your browser:<br>
                  <a href="{resetLink}" style="color: #667eea; word-break: break-all;">{resetLink}</a>
                </p>
              </div>
            </body>
            </html>
            """;

        return await SendAsync(email, $"Password Reset - {AppName}", html);
    }

    public async Task<bool> SendUserInviteAsync(string email, string inviterName, string tempPassword, string role)
    {
        var loginUrl = $"{_frontendUrl}/login";

        var html = $"""
            <!DOCTYPE html>
            <html>
            <head>
              <meta charset="utf-8">
              <meta name="viewport" content="width=device-width, initial-scale=1.0">
            </head>
            <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
              <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; border-radius: 10px 10px 0 0; text-align: center;">
                <h1 style="color: white; margin: 0; font-size: 24px;">Welcome to {AppName}</h1>
              </div>
              <div style="background: #f9fafb; padding: 30px; border-radius: 0 0 10px 10px; border: 1px solid #e5e7eb; border-top: none;">
                <p>Hi there,</p>
                <p><strong>{inviterName}</strong> has invited you to join {AppName} as a <strong>{role}</strong>.</p>
                <p>Here are your login credentials:</p>
                <div style="background: white; padding: 20px; border-radius: 8px; border: 1px solid #e5e7eb; margin: 20px 0;">
                  <p style="margin: 0 0 10px 0;"><strong>Email:</strong> {email}</p>
                  <p style="margin: 0;"><strong>Temporary Password:</strong> <code style="background: #f3f4f6; padding: 2px 8px; border-radius: 4px; font-size: 14px;">{tempPassword}</code></p>
                </div>
                <p style="color: #6b7280; font-size: 14px;">You will be required to change your password upon first login.</p>
                <div style="text-align: center; margin: 30px 0;">
                  <a href="{loginUrl}" style="display: inline-block; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; text-decoration: none; padding: 12px 30px; border-radius: 6px; font-weight: 500;">Sign In Now</a>
                </div>
              </div>
            </body>
            </html>
            """;

        return await SendAsync(email, $"You've been invited to {AppName}", html);
    }

    public async Task<bool> SendPasswordChangeNotificationAsync(string email, string firstName)
    {
        var html = $"""
            <!DOCTYPE html>
            <html>
            <head>
              <meta charset="utf-8">
              <meta name="viewport" content="width=device-width, initial-scale=1.0">
            </head>
            <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
              <div style="background: #10b981; padding: 30px; border-radius: 10px 10px 0 0; text-align: center;">
                <h1 style="color: white; margin: 0; font-size: 24px;">Password Changed</h1>
              </div>
              <div style="background: #f9fafb; padding: 30px; border-radius: 0 0 10px 10px; border: 1px solid #e5e7eb; border-top: none;">
                <p>Hi {firstName},</p>
                <p>Your password for {AppName} was successfully changed.</p>
                <div style="background: #fef3c7; padding: 15px; border-radius: 8px; border: 1px solid #f59e0b; margin: 20px 0;">
                  <p style="margin: 0; color: #92400e; font-size: 14px;">
                    <strong>Security Notice:</strong> If you did not make this change, please contact your administrator immediately and reset your password.
                  </p>
                </div>
              </div>
            </body>
            </html>
            """;

        return await SendAsync(email, $"Password changed - {AppName}", html);
    }
}
