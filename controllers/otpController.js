/**
 * OTP Controller
 * 
 * HOW TO TEST WITH POSTMAN:
 * 
 * 1. Request OTP:
 *    - Method: POST
 *    - URL: http://localhost:5000/api/otp/request
 *    - Headers: Content-Type: application/json
 *    - Body: 
 *      {
 *        "email": "your_test_email@example.com"
 *      }
 *    - Response: Will return success message and expiresAt timestamp
 * 
 * 2. Verify OTP:
 *    - Method: POST
 *    - URL: http://localhost:YOUR_PORT/api/otp/verify
 *    - Headers: Content-Type: application/json
 *    - Body: 
 *      {
 *        "email": "your_test_email@example.com",
 *        "otp": "123456"  // The OTP you received in email
 *      }
 *    - Response: Will return success message if verification successful
 * 
 * TROUBLESHOOTING SMTP AUTHENTICATION ERRORS:
 * 1. Check that BREVO_SMTP_USER and BREVO_SMTP_PASS are set correctly in your .env file
 * 2. Verify your Brevo account is active and API keys are valid
 * 3. Make sure you're using the correct SMTP credentials (not the API key)
 */
const nodemailer = require('nodemailer');
require('dotenv').config();

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
      
      transporter = nodemailer.createTransport({
        host: process.env.BREVO_SMTP_HOST || 'smtp-relay.brevo.com',
        port: process.env.BREVO_SMTP_PORT || 587,
        secure: false, // Use TLS
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
      console.warn('No email credentials found. Setting up test transporter with ethereal email');
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
    }
    
    // Verify the transporter configuration
    if (transporter) {
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
 * @returns {Promise} - Email send result
 */
const sendOTPEmail = async (email, otp) => {
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
  console.log(`TEST MODE: OTP for ${email} is ${otp}`);
  
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
  
  const mailOptions = {
    from: `"${fromName}" <${fromEmail}>`,
    to: email,
    subject: 'Your Verification Code',
    priority: 'high', // Mark as high priority
    headers: {
      'X-Priority': '1', // Another way to mark priority
      'X-MSMail-Priority': 'High',
      'Importance': 'High'
    },
    text: `Your verification code is: ${otp}. It will expire in 10 minutes.`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 5px;">
        <h2 style="color: #4a4a4a;">Email Verification</h2>
        <p style="color: #666;">Please use the verification code below to complete your request:</p>
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
 * Request OTP controller
 * Generates and sends OTP to the provided email
 */
const requestOTP = async (req, res) => {
  try {
    const { email } = req.body;
    
    if (!email) {
      return res.status(400).json({ success: false, message: 'Email is required' });
    }
    
    console.log(`Processing OTP request for ${email}`);
    
    // Ensure transporter is initialized
    if (!transporterReady) {
      try {
        await initializeTransporter();
      } catch (error) {
        console.error('Failed to initialize email service:', error);
        return res.status(500).json({ 
          success: false, 
          message: 'Email service not available. Please try again later.',
          error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
      }
    }
    
    // Generate OTP
    const otp = generateOTP();
    
    // Store OTP with expiration time (10 minutes)
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000);
    otpStorage.set(email, { otp, expiresAt });
    
    try {
      // Send OTP via email
      const emailResult = await sendOTPEmail(email, otp);
      
      // Always include OTP in development for testing
      const response = {
        success: true,
        message: 'OTP sent successfully',
        expiresAt,
        emailDetails: process.env.NODE_ENV === 'development' ? {
          messageId: emailResult.messageId,
          accepted: emailResult.accepted,
          rejected: emailResult.rejected,
          emailProvider: transporterType
        } : undefined
      };
      
      // For development or testing environments, include the OTP
      if (process.env.NODE_ENV === 'development' || process.env.NODE_ENV === 'test') {
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
 * Verify OTP controller
 * Validates the OTP submitted by user
 */
const verifyOTP = (req, res) => {
  try {
    const { email, otp } = req.body;
    
    if (!email || !otp) {
      return res.status(400).json({ success: false, message: 'Email and OTP are required' });
    }
    
    const storedData = otpStorage.get(email);
    
    // Check if OTP exists and is valid
    if (!storedData) {
      return res.status(400).json({ success: false, message: 'OTP not found or expired' });
    }
    
    // Check if OTP has expired
    if (new Date() > storedData.expiresAt) {
      otpStorage.delete(email);
      return res.status(400).json({ success: false, message: 'OTP has expired' });
    }
    
    // Verify OTP
    if (storedData.otp !== otp) {
      return res.status(400).json({ success: false, message: 'Invalid OTP' });
    }
    
    // OTP verified successfully, clean up storage
    otpStorage.delete(email);
    
    res.status(200).json({ 
      success: true, 
      message: 'OTP verified successfully' 
    });
  } catch (error) {
    console.error('OTP verification error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to verify OTP',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// Initialize transporter when module is loaded
initializeTransporter().catch(err => console.error('Initial transporter setup failed:', err));

module.exports = {
  requestOTP,
  verifyOTP
};
