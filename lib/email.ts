import { Resend } from 'resend'

const resend = new Resend(process.env.RESEND_API_KEY)

export async function sendOTPEmail(email: string, otp: string, fullName?: string) {
  try {
    const { data, error } = await resend.emails.send({
      from: 'What\'s Cooking <noreply@whatscooking.app>', // Replace with your domain
      to: [email],
      subject: 'Your verification code for What\'s Cooking',
      html: `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="utf-8">
            <title>Verification Code</title>
            <style>
              body {
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                line-height: 1.6;
                color: #333;
                max-width: 600px;
                margin: 0 auto;
                padding: 20px;
              }
              .header {
                text-align: center;
                padding: 40px 0;
                background: linear-gradient(135deg, #f59e0b, #d97706);
                color: white;
                border-radius: 8px;
                margin-bottom: 30px;
              }
              .otp-code {
                font-size: 36px;
                font-weight: bold;
                letter-spacing: 8px;
                color: #f59e0b;
                text-align: center;
                padding: 20px;
                background: #fef3c7;
                border-radius: 8px;
                margin: 30px 0;
                border: 2px dashed #f59e0b;
              }
              .content {
                background: #f9fafb;
                padding: 30px;
                border-radius: 8px;
                margin: 20px 0;
              }
              .footer {
                text-align: center;
                margin-top: 30px;
                font-size: 14px;
                color: #6b7280;
              }
            </style>
          </head>
          <body>
            <div class="header">
              <h1>🍳 What's Cooking?</h1>
              <p>Your culinary adventure awaits!</p>
            </div>
            
            <div class="content">
              <h2>Hello${fullName ? ` ${fullName}` : ''}!</h2>
              <p>Welcome to What's Cooking! We're excited to have you join our community of food enthusiasts.</p>
              
              <p>To complete your account setup, please enter this verification code:</p>
              
              <div class="otp-code">${otp}</div>
              
              <p><strong>Important:</strong></p>
              <ul>
                <li>This code will expire in <strong>10 minutes</strong></li>
                <li>Don't share this code with anyone</li>
                <li>Enter it exactly as shown above</li>
              </ul>
              
              <p>If you didn't request this verification code, please ignore this email.</p>
            </div>
            
            <div class="footer">
              <p>Happy cooking! 🍽️<br>
              The What's Cooking Team</p>
              <p style="margin-top: 20px;">
                <em>This is an automated message, please don't reply to this email.</em>
              </p>
            </div>
          </body>
        </html>
      `,
      text: `
Hello${fullName ? ` ${fullName}` : ''}!

Welcome to What's Cooking! 

Your verification code is: ${otp}

This code will expire in 10 minutes. Please don't share it with anyone.

If you didn't request this verification code, please ignore this email.

Happy cooking!
The What's Cooking Team
      `
    })

    if (error) {
      console.error('Failed to send OTP email:', error)
      return { success: false, error }
    }

    console.log('OTP email sent successfully:', data?.id)
    return { success: true, data }
  } catch (error) {
    console.error('Error sending OTP email:', error)
    return { success: false, error }
  }
}

export async function sendWelcomeEmail(email: string, fullName: string) {
  try {
    const { data, error } = await resend.emails.send({
      from: 'What\'s Cooking <noreply@whatscooking.app>', // Replace with your domain
      to: [email],
      subject: 'Welcome to What\'s Cooking! 🍳',
      html: `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="utf-8">
            <title>Welcome to What's Cooking!</title>
            <style>
              body {
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                line-height: 1.6;
                color: #333;
                max-width: 600px;
                margin: 0 auto;
                padding: 20px;
              }
              .header {
                text-align: center;
                padding: 40px 0;
                background: linear-gradient(135deg, #f59e0b, #d97706);
                color: white;
                border-radius: 8px;
                margin-bottom: 30px;
              }
              .content {
                background: #f9fafb;
                padding: 30px;
                border-radius: 8px;
                margin: 20px 0;
              }
              .cta-button {
                display: inline-block;
                background: #f59e0b;
                color: white;
                padding: 12px 24px;
                text-decoration: none;
                border-radius: 6px;
                font-weight: bold;
                margin: 20px 0;
              }
              .footer {
                text-align: center;
                margin-top: 30px;
                font-size: 14px;
                color: #6b7280;
              }
            </style>
          </head>
          <body>
            <div class="header">
              <h1>🍳 Welcome to What's Cooking!</h1>
              <p>Your account is ready!</p>
            </div>
            
            <div class="content">
              <h2>Hi ${fullName}!</h2>
              <p>Congratulations! Your What's Cooking account has been successfully created.</p>
              
              <p>Now you can:</p>
              <ul>
                <li>🥘 Generate personalized recipes based on your ingredients</li>
                <li>🍽️ Discover new cuisines and cooking techniques</li>
                <li>📱 Save your favorite recipes for later</li>
                <li>🔥 Set your preferred spice levels and dietary restrictions</li>
              </ul>
              
              <div style="text-align: center;">
                <a href="${process.env.NEXT_PUBLIC_SITE_URL || 'https://whatscooking.app'}" class="cta-button">
                  Start Cooking! 🍳
                </a>
              </div>
              
              <p>We're excited to be part of your culinary journey. Happy cooking!</p>
            </div>
            
            <div class="footer">
              <p>Best regards,<br>
              The What's Cooking Team</p>
            </div>
          </body>
        </html>
      `,
      text: `
Hi ${fullName}!

Welcome to What's Cooking! Your account has been successfully created.

Now you can:
- Generate personalized recipes based on your ingredients
- Discover new cuisines and cooking techniques  
- Save your favorite recipes for later
- Set your preferred spice levels and dietary restrictions

Visit ${process.env.NEXT_PUBLIC_SITE_URL || 'https://whatscooking.app'} to start cooking!

We're excited to be part of your culinary journey.

Happy cooking!
The What's Cooking Team
      `
    })

    if (error) {
      console.error('Failed to send welcome email:', error)
      return { success: false, error }
    }

    console.log('Welcome email sent successfully:', data?.id)
    return { success: true, data }
  } catch (error) {
    console.error('Error sending welcome email:', error)
    return { success: false, error }
  }
}
