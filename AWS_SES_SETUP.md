# AWS SES Setup Guide

This guide will help you configure AWS SES for email forwarding in Fortress.

## 📧 Overview

Fortress now uses AWS Simple Email Service (SES) to forward emails from your aliases (e.g., `netflix.abc123@myfortress.shop`) to your real email address.

## 🔧 Configuration Steps

### 1. AWS Account Setup

1. **Create AWS Account** (if you don't have one)
   - Go to https://aws.amazon.com/
   - Sign up for an account

2. **Navigate to SES Console**
   - Go to https://console.aws.amazon.com/ses/
   - Select your preferred region: **US East (Ohio) - us-east-2**

### 2. Verify Your Domain

1. **In SES Console:**
   - Go to "Verified identities" → "Create identity"
   - Select "Domain"
   - Enter: `fortresskey.shop`
   - Click "Create identity"

2. **Add DNS Records:**
   - SES will provide DNS records to add
   - Add these to your domain's DNS settings:
     - **CNAME records** for DKIM verification
     - **TXT record** for domain verification
     - **MX record** (if you want to receive emails)

3. **Wait for Verification:**
   - Status will change to "Verified" once DNS records propagate
   - This can take a few minutes to 48 hours

### 3. Verify Sender Email (Required for Production)

1. **In SES Console:**
   - Go to "Verified identities" → "Create identity"
   - Select "Email address"
   - Enter: `forwarder@fortresskey.shop`
   - Click "Create identity"
   - Check your email and click verification link

### 4. Get AWS Credentials

1. **Create IAM User:**
   - Go to IAM Console → Users → "Create user"
   - Username: `fortress-ses-user`
   - Select "Attach policies directly"
   - Add policy: `AmazonSESFullAccess` (or create custom policy with only SendEmail permission)
   - Create user

2. **Create Access Keys:**
   - Click on the user → "Security credentials" tab
   - Click "Create access key"
   - Select "Application running outside AWS"
   - Copy the **Access Key ID** and **Secret Access Key**

### 5. Update Configuration

**Update `appsettings.json` or `appsettings.Production.json`:**

```json
{
  "AWS": {
    "Region": "us-east-2",
    "AccessKey": "YOUR_ACCESS_KEY_ID",
    "SecretKey": "YOUR_SECRET_ACCESS_KEY"
  }
}
```

**For Production, use Environment Variables instead:**

```bash
export AWS__Region=us-east-2
export AWS__AccessKey=YOUR_ACCESS_KEY_ID
export AWS__SecretKey=YOUR_SECRET_ACCESS_KEY
```

Or in your hosting platform (AWS, Azure, etc.), set these as environment variables.

### 6. Move Out of SES Sandbox (For Production)

By default, SES is in "sandbox mode" which only allows sending to verified email addresses.

**To send to any email:**

1. **Request Production Access:**
   - In SES Console → "Account dashboard"
   - Click "Request production access"
   - Fill out the form explaining your use case
   - Wait for approval (usually 24-48 hours)

2. **While in Sandbox:**
   - You can only send to verified email addresses
   - Perfect for testing!

## 🧪 Testing

### Test via Swagger

1. Start your API: `dotnet run`
2. Go to `http://localhost:5254/swagger`
3. Find `POST /api/webhooks/inbound`
4. Use this test payload:
   ```json
   {
     "recipient": "netflix.abc123@myfortress.shop",
     "sender": "test@example.com",
     "subject": "Test Email",
     "body": "This is a test email body"
   }
   ```
5. Execute and check your email inbox

### Test via AWS SES Console

1. Go to SES Console → "Send test email"
2. Send to a verified email address
3. Check if it arrives

## 🔒 Security Best Practices

1. **Use IAM Roles (Recommended for AWS-hosted apps):**
   - If running on EC2, use IAM roles instead of access keys
   - More secure and easier to manage

2. **Limit IAM Permissions:**
   - Create custom IAM policy with only `ses:SendEmail` permission
   - Don't use `AmazonSESFullAccess` in production

3. **Rotate Credentials:**
   - Regularly rotate access keys
   - Use AWS Secrets Manager for credential storage

4. **Environment Variables:**
   - Never commit AWS credentials to git
   - Use environment variables or secrets management

## 📝 Custom IAM Policy (Recommended)

Instead of `AmazonSESFullAccess`, use this minimal policy:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "ses:SendEmail",
        "ses:SendRawEmail"
      ],
      "Resource": "*"
    }
  ]
}
```

## 🐛 Troubleshooting

### "Email address not verified" Error

- **Cause:** You're trying to send from/to an unverified email
- **Solution:** Verify `forwarder@fortresskey.shop` in SES Console

### "Account is in SES Sandbox" Error

- **Cause:** Trying to send to unverified email addresses
- **Solution:** Request production access or verify recipient email

### "Invalid credentials" Error

- **Cause:** Wrong AWS access key/secret
- **Solution:** Double-check credentials in configuration

### Emails Not Arriving

1. **Check SES Console:**
   - Go to "Sending statistics"
   - Check for bounces or complaints

2. **Check Logs:**
   - Look for errors in API logs
   - Check AWS CloudWatch logs

3. **Verify Configuration:**
   - Ensure domain is verified
   - Check sender email is verified
   - Verify AWS credentials are correct

## 📊 Monitoring

- **SES Console:** View sending statistics, bounces, complaints
- **CloudWatch:** Set up alarms for failed sends
- **Application Logs:** Check `_logger` output for forwarding status

---

**Note:** The source email `forwarder@fortresskey.shop` must be verified in SES before you can send emails. Make sure to complete domain and email verification steps!
