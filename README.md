# Souphanouvong Library Backend

## Email Configuration Guide

### Troubleshooting SMTP Authentication

If you encounter the error `"Invalid login: 535 5.7.8 Authentication failed"`, follow these steps:

#### Option 1: Use Brevo (SendinBlue)

1. Sign up for a [Brevo account](https://www.brevo.com/)
2. Navigate to SMTP & API → SMTP
3. Get your SMTP credentials
4. Update your `.env` file:

```
BREVO_SMTP_HOST=smtp-relay.brevo.com
BREVO_SMTP_PORT=587
BREVO_SMTP_SECURE=false
BREVO_SMTP_USER=your_brevo_smtp_username
BREVO_SMTP_PASS=your_brevo_smtp_password
BREVO_FROM_EMAIL=your_verified_email@example.com
```

#### Option 2: Use Gmail

1. Enable 2-factor authentication for your Google account
2. Create an App Password: Go to [App Passwords](https://myaccount.google.com/apppasswords)
3. Update your `.env` file:

```
GMAIL_USER=your_gmail_address@gmail.com
GMAIL_APP_PASSWORD=your_app_password
```

#### Development Mode Workaround

For development, you can set `FALLBACK_TO_ETHEREAL=true` in your `.env` file to use ethereal.email, which provides a test email account and shows email previews without actually sending them.

## API Testing with Postman

### OTP Endpoints

1. **Request OTP for verification:**
   - `POST /api/otp/request`
   - Body: `{"email": "user@example.com", "purpose": "verification"}`

2. **Request Password Reset OTP:**
   - `POST /api/otp/request-password-reset`
   - Body: `{"email": "user@example.com"}`

3. **Verify OTP:**
   - `POST /api/otp/verify`
   - Body: `{"email": "user@example.com", "otp": "123456"}`

4. **Reset Password with OTP:**
   - `POST /api/otp/reset-password`
   - Body: `{"email": "user@example.com", "otp": "123456", "newPassword": "newPass123"}`
