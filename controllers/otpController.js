/**
 * OTP Controller
 * 
 * HOW TO TEST WITH POSTMAN:
 * 
 * 1. Request OTP for Registration Verification:
 *    - Method: POST
 *    - URL: http://localhost:5000/api/otp/request
 *    - Headers: Content-Type: application/json
 *    - Body: 
 *      {
 *        "email": "your_test_email@example.com",
 *        "purpose": "verification"
 *      }
 *    - Response: Will return success message and expiresAt timestamp
 * 
 * 2. Request OTP for Password Reset:
 *    - Method: POST
 *    - URL: http://localhost:5000/api/otp/request-password-reset
 *    - Headers: Content-Type: application/json
 *    - Body: 
 *      {
 *        "email": "your_test_email@example.com"
 *      }
 *    - Response: Will return success message and expiresAt timestamp
 * 
 * 3. Verify OTP:
 *    - Method: POST
 *    - URL: http://localhost:YOUR_PORT/api/otp/verify
 *    - Headers: Content-Type: application/json
 *    - Body: 
 *      {
 *        "email": "your_test_email@example.com",
 *        "otp": "123456"
 *      }
 *    - Response: Will return success message if verification successful
 * 
 * 4. Reset Password with OTP:
 *    - Method: POST
 *    - URL: http://localhost:YOUR_PORT/api/otp/reset-password
 *    - Headers: Content-Type: application/json
 *    - Body: 
 *      {
 *        "email": "your_test_email@example.com",
 *        "otp": "123456",
 *        "newPassword": "yourNewPassword123"
 *      }
 *    - Response: Will return success message if password reset successful
 * 
 * TROUBLESHOOTING SMTP AUTHENTICATION ERRORS:
 * 1. Check that BREVO_SMTP_USER and BREVO_SMTP_PASS are set correctly in your .env file
 * 2. Verify your Brevo account is active and API keys are valid
 * 3. Make sure you're using the correct SMTP credentials (not the API key)
 */
const nodemailer = require('nodemailer');
require('dotenv').config();
// We'll need a model for users to update passwords
// Assuming User model is defined elsewhere. Import it here:
const User = require('../models/userModel'); // Adjust path if needed

// Log environment variables (for debugging) - remove in production
console.log('Email Environment Variables Status:');
console.log('- GMAIL_USER:', process.env.GMAIL_USER ? 'Set ✓' : 'Not set ✗');
console.log('- GMAIL_APP_PASSWORD:', process.env.GMAIL_APP_PASSWORD ? 'Set ✓' : 'Not set ✗');
console.log('- BREVO_SMTP_USER:', process.env.BREVO_SMTP_USER ? 'Set ✓' : 'Not set ✗');
console.log('- BREVO_SMTP_PASS:', process.env.BREVO_SMTP_PASS ? 'Set ✓' : 'Not set ✗');
console.log('- BREVO_FROM_EMAIL:', process.env.BREVO_FROM_EMAIL ? 'Set ✓' : 'Not set ✗');
console.log('- BREVO_FROM_NAME:', process.env.BREVO_FROM_NAME ? 'Set ✓' : 'Not set ✗');
console.log('- EMAIL_FROM_ADDRESS:', process.env.EMAIL_FROM_ADDRESS ? 'Set ✓' : 'Not set (will use BREVO_FROM_EMAIL if available) ✗');

// In-memory OTP storage (consider using Redis or database for production)
const otpStorage = new Map();

// Add a new field to track purpose of the OTP
const OTP_PURPOSE = {
  VERIFICATION: 'verification',  // For account verification after registration
  PASSWORD_RESET: 'password_reset'  // For password reset
};

/**
 * Generates a random 6-digit OTP
 * @returns {string} 6-digit OTP
 */
const generateOTP = () => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

// Create a promise-based transporter initialization
let transporter = null;
let transporterReady = false;
let transporterType = 'not initialized';

/**
 * Initialize and verify email transporter
 * @returns {Promise<boolean>} Whether transporter was successfully initialized
 */
const initializeTransporter = async () => {
  try {
    // Gmail configuration
    if (process.env.GMAIL_USER && process.env.GMAIL_APP_PASSWORD) {
      console.log('Setting up Gmail transporter');
      transporterType = 'Gmail';
      
      transporter = nodemailer.createTransport({
        service: 'gmail',
        host: 'smtp.gmail.com',
        port: 465,
        secure: true, // Use SSL
        auth: {
          user: process.env.GMAIL_USER,
          pass: process.env.GMAIL_APP_PASSWORD, // App password, not regular password
        },
        debug: true,
        logger: true
      });
    } 
    // Brevo configuration
    else if (process.env.BREVO_SMTP_USER && process.env.BREVO_SMTP_PASS) {
      console.log('Setting up Brevo transporter');
      transporterType = 'Brevo';
      
      // Log partial password for debugging (only first 4 chars)
      const passHint = process.env.BREVO_SMTP_PASS ? 
        `${process.env.BREVO_SMTP_PASS.substring(0, 4)}...` : 
        'not set';
      console.log(`Using Brevo credentials: ${process.env.BREVO_SMTP_USER} / ${passHint}`);
      
      transporter = nodemailer.createTransport({
        host: 'smtp-relay.brevo.com',  // Use the specific host that's working
        port: 587,  // Use port 587 as shown in logs
        secure: false,  // TLS is being used (STARTTLS), not SSL
        auth: {
          user: process.env.BREVO_SMTP_USER,
          pass: process.env.BREVO_SMTP_PASS,
        },
        debug: true,
        logger: true
      });
    } 
    // Fallback to ethereal email for testing
    else {
      console.warn('No email credentials found or fallback enabled. Setting up test transporter with ethereal email');
      transporterType = 'Ethereal';
      
      // Generate test SMTP service account from ethereal.email
      const testAccount = await nodemailer.createTestAccount();
      console.log('Created test email account:', testAccount.user);
      
      transporter = nodemailer.createTransport({
        host: 'smtp.ethereal.email',
        port: 587,
        secure: false,
        auth: {
          user: testAccount.user,
          pass: testAccount.pass,
        },
        debug: true,
        logger: true
      });
      
      console.log('Using Ethereal Email test account for email delivery');
      console.log('NOTE: Emails will NOT be delivered to real recipients when using Ethereal');
      console.log('Preview emails at: https://ethereal.email/messages');
    }
    
    // Verify the transporter configuration
    if (transporter) {
      try {
        await new Promise((resolve, reject) => {
          transporter.verify(function(error, success) {
            if (error) {
              console.error('SMTP configuration error:', error);
              reject(error);
            } else {
              console.log(`${transporterType} SMTP server is ready to send emails`);
              transporterReady = true;
              resolve(success);
            }
          });
        });
      } catch (verifyError) {
        console.error('Failed to verify SMTP connection:', verifyError);
        
        // If in development mode and fallback is enabled, switch to Ethereal automatically
        if ((process.env.NODE_ENV === 'development' || process.env.FALLBACK_TO_ETHEREAL === 'true') && 
            transporterType !== 'Ethereal') {
          console.log('Falling back to Ethereal email for development...');
          transporterType = 'Ethereal';
          transporterReady = false;
          
          // Generate test SMTP service account from ethereal.email
          const testAccount = await nodemailer.createTestAccount();
          console.log('Created test email account:', testAccount.user);
          
          transporter = nodemailer.createTransport({
            host: 'smtp.ethereal.email',
            port: 587,
            secure: false,
            auth: {
              user: testAccount.user,
              pass: testAccount.pass,
            },
            debug: true,
            logger: true
          });
          
          // Verify again with Ethereal
          await new Promise((resolve, reject) => {
            transporter.verify(function(err, success) {
              if (err) {
                console.error('Ethereal SMTP configuration error:', err);
                reject(err);
              } else {
                console.log('Ethereal SMTP server is ready to send emails');
                transporterReady = true;
                resolve(success);
              }
            });
          });
        } else {
          throw verifyError;
        }
      }
      
      // Send a test email if admin email is configured
      if (transporterReady && process.env.ADMIN_EMAIL) {
        try {
          await testSMTPConnection();
        } catch (err) {
          console.error('Failed to send test email:', err);
          // Don't fail initialization if test email fails
        }
      }
      
      return transporterReady;
    }
    
    return false;
  } catch (error) {
    console.error('Failed to initialize email transporter:', error);
    transporterReady = false;
    return false;
  }
};

/**
 * Test SMTP connection by sending a test email
 */
const testSMTPConnection = async () => {
  if (!process.env.ADMIN_EMAIL) {
    console.log('ADMIN_EMAIL not set in .env, skipping test email');
    return;
  }
  
  if (!transporter || !transporterReady) {
    throw new Error('Transporter not initialized or not ready');
  }
  
  try {
    console.log('Attempting to send test email to admin...');
    const fromEmail = process.env.EMAIL_FROM_ADDRESS || process.env.GMAIL_USER || process.env.BREVO_SMTP_USER || 'noreply@example.com';
    
    const info = await transporter.sendMail({
      from: `"${process.env.EMAIL_FROM_NAME || 'System Test'}" <${fromEmail}>`,
      to: process.env.ADMIN_EMAIL,
      subject: 'SMTP Configuration Test',
      text: `This is a test email to verify SMTP configuration is working correctly. Email provider: ${transporterType}`,
      html: `<p>This is a test email to verify SMTP configuration is working correctly.</p><p>Email provider: ${transporterType}</p>`
    });
    
    console.log('Test email sent successfully!', info.messageId);
    
    // Check for Ethereal URL
    if (transporterType === 'Ethereal' && nodemailer.getTestMessageUrl(info)) {
      console.log('Preview URL:', nodemailer.getTestMessageUrl(info));
    }
    
    return info;
  } catch (error) {
    console.error('Test email failed:', error);
    throw error;
  }
};

/**
 * Send OTP via email
 * @param {string} email - Recipient email address
 * @param {string} otp - One-time password to send
 * @param {string} purpose - Purpose of the OTP (verification or password reset)
 * @returns {Promise} - Email send result
 */
const sendOTPEmail = async (email, otp, purpose) => {
  // Check transporter status
  if (!transporter || !transporterReady) {
    console.log('Transporter not ready, attempting initialization...');
    try {
      await initializeTransporter();
    } catch (error) {
      console.error('Failed to initialize transporter:', error);
      throw new Error(`Email service not available: ${error.message}`);
    }
  }
  
  // For testing purposes, log the OTP to console
  // Remove this in production
  console.log(`TEST MODE: OTP for ${email} is ${otp} (Purpose: ${purpose})`);
  
  // Log active transporter configuration
  console.log('Active Email Transporter:', {
    type: transporterType,
    ready: transporterReady,
    options: transporter ? {
      host: transporter.options.host,
      port: transporter.options.port,
      secure: transporter.options.secure,
      auth: transporter.options.auth ? { user: transporter.options.auth.user } : null
    } : null
  });
  
  // Determine the from address based on available configuration
  // Prioritize specific Brevo variables, then fall back to generic ones
  const fromEmail = process.env.BREVO_FROM_EMAIL || process.env.EMAIL_FROM_ADDRESS || process.env.GMAIL_USER || process.env.BREVO_SMTP_USER || 'noreply@example.com';
  const fromName = process.env.BREVO_FROM_NAME || process.env.EMAIL_FROM_NAME || 'App Verification';
  
  // Log active email configuration 
  console.log('Active Email Configuration:', {
    provider: transporterType,
    from: `${fromName} <${fromEmail}>`,
    to: email
  });

  // Customize email subject and content based on purpose
  let subject = 'Your Verification Code';
  let purposeText = 'verification';
  
  if (purpose === OTP_PURPOSE.PASSWORD_RESET) {
    subject = 'Password Reset Code';
    purposeText = 'password reset';
  }
  
  const mailOptions = {
    from: `"${fromName}" <${fromEmail}>`,
    to: email,
    subject,
    priority: 'high', // Mark as high priority
    headers: {
      'X-Priority': '1', // Another way to mark priority
      'X-MSMail-Priority': 'High',
      'Importance': 'High'
    },
    text: `Your ${purposeText} code is: ${otp}. It will expire in 10 minutes.`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 5px;">
        <h2 style="color: #4a4a4a;">${purpose === OTP_PURPOSE.PASSWORD_RESET ? 'Password Reset' : 'Email Verification'}</h2>
        <p style="color: #666;">Please use the code below to complete your ${purposeText} request:</p>
        <div style="background-color: #f8f8f8; padding: 15px; border-radius: 4px; text-align: center; margin: 20px 0;">
          <h1 style="color: #333; letter-spacing: 5px; margin: 0;">${otp}</h1>
        </div>
        <p style="color: #666; font-size: 14px;">This code will expire in 10 minutes.</p>
        <p style="color: #666; font-size: 14px;">If you didn't request this code, please ignore this email.</p>
      </div>
    `
  };

  // Implement retry mechanism (try up to 3 times)
  let retries = 0;
  const maxRetries = 3;
  
  while (retries < maxRetries) {
    try {
      console.log(`Attempt ${retries + 1} to send email to ${email}`);
      const info = await transporter.sendMail(mailOptions);
      console.log('Email sent successfully:', info);
      
      // Log all information returned by the SMTP server
      console.log('Email details:', {
        messageId: info.messageId,
        response: info.response,
        accepted: info.accepted,
        rejected: info.rejected,
        pending: info.pending,
        envelope: info.envelope
      });
      
      // Check for Ethereal URL (for testing)
      if (transporterType === 'Ethereal' && nodemailer.getTestMessageUrl(info)) {
        console.log('Preview URL:', nodemailer.getTestMessageUrl(info));
      }
      
      return info;
    } catch (error) {
      retries++;
      console.error(`Email sending attempt ${retries} failed:`, error);
      
      // Gmail specific error handling
      if (transporterType === 'Gmail' && error.message.includes('Invalid login')) {
        console.error('Gmail authentication failed. Make sure you\'re using an App Password, not your regular Gmail password.');
        console.error('Create an App Password at: https://myaccount.google.com/apppasswords');
        break;
      }
      
      // Brevo specific error handling
      if (transporterType === 'Brevo' && error.message.includes('authentication')) {
        console.error('Brevo authentication failed. Check your SMTP credentials in the Brevo dashboard.');
        break;
      }
      
      if (retries >= maxRetries) {
        console.error('Max retries reached, giving up');
        throw error;
      }
      
      // Wait before retrying (exponential backoff)
      await new Promise(resolve => setTimeout(resolve, 1000 * retries));
    }
  }
};

/**
 * Request OTP for general verification or after registration
 * This can be used after user registration to verify the email
 */
const requestOTP = async (req, res) => {
  try {
    const { email, purpose = OTP_PURPOSE.VERIFICATION } = req.body;
    
    // Improved logging
    console.log('OTP request received:', { email, purpose, requestBody: req.body });
    
    if (!email) {
      return res.status(400).json({ success: false, message: 'Email is required' });
    }
    
    // Validate purpose if provided
    if (purpose && !Object.values(OTP_PURPOSE).includes(purpose)) {
      return res.status(400).json({ 
        success: false, 
        message: 'Invalid purpose. Must be either "verification" or "password_reset"' 
      });
    }
    
    console.log(`Processing OTP request for ${email} (Purpose: ${purpose})`);
    
    // Generate OTP first, so we always have it
    const otp = generateOTP();
    
    // Store OTP with expiration time (10 minutes) and purpose
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000);
    
    // Store OTP as string to ensure type consistency in comparisons
    otpStorage.set(email, { 
      otp: String(otp), 
      expiresAt, 
      purpose,
      createdAt: new Date()
    });
    
    // Log stored OTP for debugging
    console.log('Stored OTP data:', {
      email,
      otp: String(otp),
      expiresAt,
      purpose
    });
    
    // Force developer mode response in certain cases
    const forceDeveloperMode = process.env.NODE_ENV === 'development' || 
                               process.env.FALLBACK_TO_ETHEREAL === 'true';
    
    // Ensure transporter is initialized
    if (!transporterReady) {
      try {
        await initializeTransporter();
      } catch (error) {
        console.error('Failed to initialize email service:', error);
        
        // When email service fails but we're in development mode, create a bypass
        if (forceDeveloperMode) {
          return res.status(200).json({
            success: true,
            message: 'Development mode: OTP generated without sending email',
            testOtp: otp,
            expiresAt,
            purpose,
            emailServiceStatus: 'Failed but bypassed in development mode',
            errorDetails: error.message
          });
        }
        
        return res.status(500).json({ 
          success: false, 
          message: 'Email service not available. Please try again later.',
          error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
      }
    }
    
    try {
      // Send OTP via email
      const emailResult = await sendOTPEmail(email, otp, purpose);
      
      // Always include OTP in development for testing
      const response = {
        success: true,
        message: purpose === OTP_PURPOSE.PASSWORD_RESET 
          ? 'Password reset code sent successfully' 
          : 'Verification code sent successfully',
        expiresAt,
        purpose,
        emailDetails: forceDeveloperMode ? {
          messageId: emailResult.messageId,
          accepted: emailResult.accepted,
          rejected: emailResult.rejected,
          emailProvider: transporterType
        } : undefined
      };
      
      // For development or testing environments, include the OTP
      if (forceDeveloperMode) {
        response.testOtp = otp;
      }
      
      // If using Ethereal for testing, include preview URL
      if (transporterType === 'Ethereal' && emailResult && nodemailer.getTestMessageUrl(emailResult)) {
        response.previewUrl = nodemailer.getTestMessageUrl(emailResult);
        response.message += ' (Ethereal test email - check preview URL)';
      }
      
      res.status(200).json(response);
    } catch (emailError) {
      console.error('Email sending failed:', emailError);
      
      // OTP is generated but email failed - we should still return the OTP for testing
      // In development or test mode, return a successful response with the OTP anyway
      if (forceDeveloperMode) {
        return res.status(200).json({
          success: true,
          message: 'Development mode: OTP generated but email sending failed',
          testOtp: otp,
          expiresAt,
          purpose,
          emailError: emailError.message
        });
      }
      
      res.status(500).json({
        success: false,
        message: 'Failed to send OTP via email, but OTP was generated',
        error: emailError.message,
        // Only include OTP in response during development
        testOtp: process.env.NODE_ENV === 'development' ? otp : undefined
      });
    }
  } catch (error) {
    console.error('OTP request error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to send OTP',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Request OTP specifically for password reset
 * This is to be used when a user forgets their password
 */
const requestPasswordResetOTP = async (req, res) => {
  try {
    const { email } = req.body;
    
    if (!email) {
      return res.status(400).json({ success: false, message: 'Email is required' });
    }
    
    // Check if user exists
    try {
      const user = await User.findOne({ email });
      if (!user) {
        return res.status(404).json({ 
          success: false, 
          message: 'User with this email does not exist' 
        });
      }
    } catch (err) {
      console.error('Database error when checking user:', err);
      return res.status(500).json({ 
        success: false, 
        message: 'Failed to verify user account',
        error: process.env.NODE_ENV === 'development' ? err.message : undefined
      });
    }
    
    // Use the common requestOTP function with password reset purpose
    req.body.purpose = OTP_PURPOSE.PASSWORD_RESET;
    return await requestOTP(req, res);
  } catch (error) {
    console.error('Password reset OTP request error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to process password reset request',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Verify user's email after registration
 * This should be called when a user enters the OTP they received after registration
 */
const verifyUserEmail = async (req, res) => {
  try {
    const { email, otp } = req.body;
    
    if (!email || !otp) {
      return res.status(400).json({ 
        success: false, 
        message: 'Email and OTP are required' 
      });
    }
    
    const storedData = otpStorage.get(email);
    
    // Check if OTP exists and is valid
    if (!storedData) {
      return res.status(400).json({ 
        success: false, 
        message: 'OTP not found or expired' 
      });
    }
    
    // Check if OTP has expired
    if (new Date() > storedData.expiresAt) {
      otpStorage.delete(email);
      return res.status(400).json({ 
        success: false, 
        message: 'OTP has expired' 
      });
    }
    
    // Check if OTP matches
    if (storedData.otp !== otp) {
      return res.status(400).json({ 
        success: false, 
        message: 'Invalid OTP' 
      });
    }
    
    try {
      // Find user and mark as verified
      const user = await User.findOne({ email });
      
      if (!user) {
        return res.status(404).json({ 
          success: false, 
          message: 'User not found' 
        });
      }
      
      // Update user's verification status without changing other fields
      user.emailVerified = true;
      
      // Make sure the role is valid before saving
      // If user's role is 'student' and that's not valid in the schema,
      // set it to a default valid role
      if (user.role === 'student' && 
          !User.schema.path('role').enumValues.includes('student')) {
        user.role = 'user'; // Set to default role
        console.log('Changed invalid role "student" to "user"');
      }
      
      await user.save();
      
      // Clean up OTP storage
      otpStorage.delete(email);
      
      res.status(200).json({ 
        success: true, 
        message: 'Email verified successfully' 
      });
    } catch (dbError) {
      console.error('Database error during email verification:', dbError);
      res.status(500).json({ 
        success: false, 
        message: 'Failed to verify email',
        error: process.env.NODE_ENV === 'development' ? dbError.message : undefined
      });
    }
  } catch (error) {
    console.error('Email verification error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to verify email',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Verify OTP controller
 * Validates the OTP submitted by user for any purpose
 */
const verifyOTP = async (req, res) => {
  try {
    const { email, otp, purpose } = req.body;
    
    // Improved debugging logging
    console.log('Verifying OTP request received:', { 
      email, 
      otp, 
      purpose,
      requestHeaders: req.headers['content-type'],
      requestBody: req.body
    });

    if (!email || !otp) {
      console.log('Missing required fields:', { email: !!email, otp: !!otp });
      return res.status(400).json({ 
        success: false, 
        message: 'Email and OTP are required' 
      });
    }

    // Find stored OTP data
    const storedData = otpStorage.get(email);
    
    // Better debug logging of stored data
    console.log('Found stored OTP data:', storedData ? {
      email,
      storedOtp: storedData.otp,
      providedOtp: otp,
      match: storedData.otp === otp,
      expiresAt: storedData.expiresAt,
      now: new Date(),
      isExpired: new Date() > storedData.expiresAt,
      purpose: storedData.purpose,
      requestedPurpose: purpose
    } : 'No OTP found for this email');

    if (!storedData) {
      return res.status(400).json({ 
        success: false, 
        message: 'OTP not found or expired' 
      });
    }

    // Check if OTP has expired
    if (new Date() > storedData.expiresAt) {
      console.log(`OTP expired. Expired at: ${storedData.expiresAt}, Current time: ${new Date()}`);
      otpStorage.delete(email);
      return res.status(400).json({ 
        success: false, 
        message: 'OTP has expired' 
      });
    }

    // If purpose is specified, make sure it matches
    if (purpose && storedData.purpose && storedData.purpose !== purpose) {
      console.log(`Purpose mismatch: requested ${purpose}, stored ${storedData.purpose}`);
      return res.status(400).json({ 
        success: false, 
        message: 'Invalid OTP purpose' 
      });
    }

    // Check if OTP matches - this is the most likely source of the error
    if (storedData.otp !== otp) {
      console.log('OTP validation failed:', { 
        provided: otp, 
        stored: storedData.otp,
        typesMatch: typeof otp === typeof storedData.otp,
        lengthsMatch: otp.length === storedData.otp.length
      });
      return res.status(400).json({ 
        success: false, 
        message: 'Invalid OTP' 
      });
    }

    console.log('OTP validation successful!');

    // CHANGE: Instead of deleting the OTP, mark it as verified and extend its lifetime for 2 minutes
    // This allows the OTP to be used for password reset after verification
    const resetWindowMinutes = 5; // Increased from 2 to 5 minutes for more flexibility
    const verifiedExpiresAt = new Date(Date.now() + resetWindowMinutes * 60 * 1000);
    
    // Update OTP data to mark as verified with new expiration
    otpStorage.set(email, { 
      ...storedData,
      verified: true, 
      verifiedAt: new Date(),
      // Use the original expiry time if it's longer than our verification window
      expiresAt: storedData.expiresAt > verifiedExpiresAt ? storedData.expiresAt : verifiedExpiresAt
    });
    
    console.log(`OTP verified and extended for ${resetWindowMinutes} minutes for password reset`);

    return res.status(200).json({ 
      success: true, 
      message: 'OTP verified successfully',
      email: email
    });
  } catch (error) {
    console.error('OTP verification error:', error);
    return res.status(500).json({ 
      success: false, 
      message: 'Server error during OTP verification',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Reset password after OTP verification
 * This should be called when a user wants to set a new password after forgetting their old one
 */
const resetPassword = async (req, res) => {
  try {
    const { email, otp, newPassword } = req.body;
    
    // Enhanced logging for debugging
    console.log('Password reset request received:', { 
      email, 
      otp, 
      newPasswordLength: newPassword?.length,
      requestBody: req.body
    });
    
    if (!email || !otp || !newPassword) {
      return res.status(400).json({ 
        success: false, 
        message: 'Email, OTP and new password are required' 
      });
    }
    
    // Password validation
    if (newPassword.length < 8) {
      return res.status(400).json({
        success: false,
        message: 'Password must be at least 8 characters long'
      });
    }
    
    const storedData = otpStorage.get(email);
    
    // Extra comprehensive logging for debugging
    console.log('Found stored OTP data for reset:', storedData ? {
      email,
      storedOtp: storedData.otp,
      providedOtp: otp,
      match: storedData.otp === otp,
      expiresAt: storedData.expiresAt,
      now: new Date(),
      isExpired: new Date() > storedData.expiresAt,
      purpose: storedData.purpose,
      verified: !!storedData.verified,
      verifiedAt: storedData.verifiedAt
    } : 'No OTP found for this email');
    
    // Check if OTP exists and is valid
    if (!storedData) {
      return res.status(400).json({ 
        success: false, 
        message: 'OTP not found or expired. Please request a new password reset code.' 
      });
    }
    
    // Check if OTP has expired
    if (new Date() > storedData.expiresAt) {
      console.log(`OTP expired. Expired at: ${storedData.expiresAt}, Current time: ${new Date()}`);
      otpStorage.delete(email);
      return res.status(400).json({ 
        success: false, 
        message: 'OTP has expired. Please request a new password reset code.' 
      });
    }
    
    // Check if OTP matches - ensure string comparison
    if (String(storedData.otp) !== String(otp)) {
      console.log('OTP validation failed for reset:', { 
        provided: otp, 
        stored: storedData.otp,
        typesMatch: typeof otp === typeof storedData.otp,
        lengthsMatch: otp.length === storedData.otp.length
      });
      return res.status(400).json({ 
        success: false, 
        message: 'Invalid OTP' 
      });
    }
    
    // For flexibility, consider allowing password reset even without prior verification
    // if this is specifically a password reset OTP
    const canResetPassword = storedData.verified || storedData.purpose === OTP_PURPOSE.PASSWORD_RESET;
    
    if (!canResetPassword) {
      return res.status(400).json({
        success: false,
        message: 'This OTP cannot be used for password reset'
      });
    }
    
    try {
      // Find user and update password
      const user = await User.findOne({ email });
      
      if (!user) {
        return res.status(404).json({ 
          success: false, 
          message: 'User not found' 
        });
      }
      
      console.log(`Updating password for user: ${user.email}`);
      
      // Update the password
      user.password = newPassword;  // Assuming password hashing is handled in the User model's pre-save hook
      await user.save();
      
      console.log(`Password updated successfully for user: ${user.email}`);
      
      // Clean up OTP storage only after successful password reset
      otpStorage.delete(email);
      
      res.status(200).json({ 
        success: true, 
        message: 'Password has been reset successfully' 
      });
    } catch (dbError) {
      console.error('Database error during password reset:', dbError);
      res.status(500).json({ 
        success: false, 
        message: 'Failed to update password',
        error: process.env.NODE_ENV === 'development' ? dbError.message : undefined
      });
    }
  } catch (error) {
    console.error('Password reset error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to reset password',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// Initialize transporter when module is loaded
initializeTransporter().catch(err => console.error('Initial transporter setup failed:', err));

module.exports = {
  requestOTP,
  verifyOTP,
  requestPasswordResetOTP,
  resetPassword,
  verifyUserEmail
};
