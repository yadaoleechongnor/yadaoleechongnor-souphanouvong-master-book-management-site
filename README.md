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




   .envfile data

<!-- PORT=5000
MONGODB_URI=mongodb+srv://magnetnoone:yd24820011@cluster0.iarbh.mongodb.net/
JWT_SECRET=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6ImFkbWluIiwicGFzc3dvcmQiOjEyM30.zWZv2GSbL0ycJTBVO6I1pLNaTJWrVPJOPn6iiw34z08
JWT_EXPIRES_IN=30d

# Frontend URL for reset password links
FRONTEND_URL=http://localhost:5173

# Email settings
EMAIL_FROM_ADDRESS=yadaoleebx@gmail.com
EMAIL_FROM_NAME=Souphanouvong University Master Library

# Environment setting
NODE_ENV=development

# Application Settings
APP_NAME=Souphanouvong University Library

# Brevo SMTP Configuration - Fix authentication problem
# NOTE: Check these credentials in your Brevo dashboard
BREVO_SMTP_HOST=smtp-relay.brevo.com
BREVO_SMTP_PORT=587
BREVO_SMTP_SECURE=false
BREVO_SMTP_USER=887a5d002@smtp-brevo.com
# Replace this with your actual password from Brevo dashboard
BREVO_SMTP_PASS=xsmtpsib-484e0ecc9e5582d62d871e5e739f54eec226a6545555d4ed1ac8f722a5208aa0-YANBvpy9Tc2VSW6s
BREVO_FROM_EMAIL=yadaoleebx@gmail.com

# For testing in development mode when SMTP isn't working
FALLBACK_TO_ETHEREAL=true

# Remove any Cloudinary-related environment variables if they exist
# CLOUDINARY_CLOUD_NAME=xxx
# CLOUDINARY_API_KEY=xxx
# CLOUDINARY_API_SECRET=xxx -->