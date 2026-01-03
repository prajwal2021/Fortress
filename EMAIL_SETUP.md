# Email Forwarding Setup Guide

This guide will help you set up email forwarding for Fortress so that emails sent to your aliases (e.g., `netflix.abc123@myfortress.shop`) are forwarded to your real email address.

## 📧 How It Works

1. When an email is sent to an alias like `netflix.abc123@myfortress.shop`
2. Your email service (SendGrid, Mailgun, etc.) receives it
3. Your email service calls the webhook: `POST /api/webhooks/inbound`
4. Fortress looks up which user owns that alias
5. Fortress forwards the email to the user's real email address

## 🔧 SMTP Configuration

### Option 1: Gmail SMTP (For Local Testing)

1. **Enable 2-Factor Authentication** on your Gmail account
2. **Generate an App Password:**
   - Go to https://myaccount.google.com/apppasswords
   - Create an app password for "Mail"
   - Copy the 16-character password

3. **Update `appsettings.Development.json`:**
   ```json
   "Smtp": {
     "Host": "smtp.gmail.com",
     "Port": 587,
     "EnableSsl": true,
     "Username": "your-email@gmail.com",
     "Password": "your-16-char-app-password",
     "FromEmail": "noreply@myfortress.shop",
     "FromName": "Fortress"
   }
   ```

### Option 2: Mailtrap (For Testing - No Real Emails)

1. **Sign up at https://mailtrap.io** (free tier available)
2. **Get SMTP credentials** from your inbox
3. **Update `appsettings.Development.json`:**
   ```json
   "Smtp": {
     "Host": "smtp.mailtrap.io",
     "Port": 2525,
     "EnableSsl": false,
     "Username": "your-mailtrap-username",
     "Password": "your-mailtrap-password",
     "FromEmail": "noreply@myfortress.shop",
     "FromName": "Fortress"
   }
   ```

### Option 3: SendGrid (For Production)

1. **Sign up at https://sendgrid.com** (free tier: 100 emails/day)
2. **Create an API Key** with "Mail Send" permissions
3. **Update `appsettings.Production.json`:**
   ```json
   "Smtp": {
     "Host": "smtp.sendgrid.net",
     "Port": 587,
     "EnableSsl": true,
     "Username": "apikey",
     "Password": "your-sendgrid-api-key",
     "FromEmail": "noreply@myfortress.shop",
     "FromName": "Fortress"
   }
   ```

## 🧪 Testing Email Forwarding

### Manual Test via Swagger

1. Start your API: `dotnet run`
2. Go to `http://localhost:5254/swagger`
3. Find `POST /api/webhooks/inbound`
4. Click "Try it out"
5. Use this test payload:
   ```json
   {
     "recipient": "ttt.6PqQ9HbG@myfortress.shop",
     "subject": "Test Email",
     "body": "This is a test email body"
   }
   ```
6. Click "Execute"
7. Check your email inbox (or Mailtrap inbox if using Mailtrap)

### What to Expect

- **If SMTP is configured:** You'll receive an email with subject `[Forwarded] Test Email`
- **If SMTP is NOT configured:** You'll see a warning in logs, but the webhook will still return OK

## 🔒 Security Notes

1. **Never commit SMTP passwords to git**
   - Use environment variables in production
   - Add `appsettings.Development.json` to `.gitignore` if it contains secrets

2. **Use App Passwords, not your main password**
   - Gmail requires app passwords for SMTP
   - Other services should use API keys

3. **Production Setup:**
   ```csharp
   // In Program.cs or use environment variables
   var smtpPassword = Environment.GetEnvironmentVariable("SMTP_PASSWORD");
   ```

## 📝 Email Service Setup (For Receiving Emails)

To actually receive emails at `@myfortress.shop`, you need:

1. **DNS MX Records:**
   - Point `myfortress.shop` MX records to your email service
   - Example for SendGrid: `mx.sendgrid.net`

2. **Email Service Configuration:**
   - Configure webhook URL: `https://myfortress.shop/api/webhooks/inbound`
   - Set up inbound email parsing
   - Configure to call webhook on incoming emails

3. **Domain Verification:**
   - Verify domain ownership with your email service
   - Set up SPF, DKIM records for email authentication

## 🐛 Troubleshooting

### Emails Not Sending

1. **Check logs:** Look for SMTP errors in console
2. **Verify credentials:** Double-check username/password
3. **Check firewall:** Ensure port 587/465 is not blocked
4. **Test SMTP connection:** Use a tool like `telnet smtp.gmail.com 587`

### Webhook Not Receiving Emails

1. **Check webhook URL:** Must be publicly accessible
2. **Verify email service:** Make sure emails are actually being received
3. **Check logs:** Look for webhook calls in API logs
4. **Test manually:** Use Swagger to test webhook endpoint

### "SMTP not configured" Warning

This is normal if you haven't set up SMTP yet. The webhook will still work, but emails won't be forwarded. Configure SMTP settings to enable forwarding.

---

**For local testing, Mailtrap is recommended** as it doesn't send real emails and shows you exactly what would be sent.
