<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta http-equiv="Content-Type" content="text/html; charset=UTF-8">
    <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: #0d6efd; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
        .header h1 { margin: 0; font-size: 24px; }
        .content { background: #f8f9fa; padding: 20px; border-radius: 0 0 8px 8px; }
        .credentials { background: white; padding: 15px; margin: 15px 0; border-radius: 4px; border-left: 4px solid #0d6efd; }
        .credentials p { margin: 8px 0; }
        .credentials strong { display: inline-block; width: 100px; }
        .warning { background: #fff3cd; border: 1px solid #ffc107; padding: 12px; border-radius: 4px; margin: 15px 0; }
        .warning strong { color: #856404; }
        .cta-button { display: inline-block; background: #0d6efd; color: #ffffff !important; padding: 12px 24px; text-decoration: none; border-radius: 5px; margin: 15px 0; }
        .footer { text-align: center; margin-top: 20px; color: #6c757d; font-size: 12px; padding: 20px 0; border-top: 1px solid #dee2e6; }
    </style>
</head>
<body>
    <div class="header">
        <h1>Welcome to {$site_title}!</h1>
    </div>
    <div class="content">
        <p>Hello {$display_name},</p>
        <p>Your account has been created. Here are your login credentials:</p>
        <div class="credentials">
            <p><strong>Username:</strong> {$username}</p>
            <p><strong>Password:</strong> {$password}</p>
        </div>
        <div class="warning">
            <strong>Important:</strong> Please change your password after your first login for security.
        </div>
        <p style="text-align: center;">
            <a href="{$site_url}" class="cta-button">Login to {$site_title}</a>
        </p>
    </div>
    <div class="footer">
        <p>This email was sent automatically. Please do not reply.</p>
    </div>
</body>
</html>
