import { NextRequest, NextResponse } from 'next/server'
import nodemailer from 'nodemailer'

export async function POST(req: NextRequest) {
  const { to_email, otp_code } = await req.json()

  if (!to_email || !otp_code) {
    return NextResponse.json({ success: false, error: 'Missing to_email or otp_code' }, { status: 400 })
  }

  // Create a Nodemailer transporter using Gmail
  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.GMAIL_USER,
      pass: process.env.GMAIL_PASS,
    },
  })

  const mailOptions = {
    from: `What's Cooking <${process.env.GMAIL_USER}>`,
    to: to_email,
    subject: "Your OTP Code for What's Cooking",
    text: `Your OTP code is: ${otp_code}`,
    html: `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <title>Verification Code</title>
  <style>
    body {
      font-family: Arial, sans-serif;
      background-color: #f9f9fb;
      margin: 0;
      padding: 0;
    }
    .container {
      max-width: 600px;
      margin: 40px auto;
      background: #ffffff;
      border-radius: 8px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.08);
      overflow: hidden;
    }
    .header {
      background: linear-gradient(90deg, #f6a623, #e67e22);
      color: #fff;
      text-align: center;
      padding: 20px;
    }
    .header h1 {
      margin: 0;
      font-size: 22px;
    }
    .header p {
      margin: 5px 0 0;
      font-size: 14px;
      opacity: 0.9;
    }
    .content {
      padding: 30px 25px;
      color: #333;
    }
    .content h2 {
      color: #5c2d91;
      margin-top: 0;
    }
    .otp-box {
      background: #fff7e6;
      border: 2px dashed #f6a623;
      text-align: center;
      font-size: 28px;
      font-weight: bold;
      color: #f39c12;
      letter-spacing: 5px;
      padding: 18px;
      border-radius: 6px;
      margin: 25px 0;
    }
    .footer {
      font-size: 12px;
      color: #777;
      padding: 20px 25px;
      border-top: 1px solid #eee;
    }
    .footer ul {
      padding-left: 20px;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>🔎 What's Cooking?</h1>
      <p>Your culinary adventure awaits!</p>
    </div>
    <div class="content">
      <h2>Hello!</h2>
      <p>Welcome to <b>What's Cooking!</b> We're excited to have you join our community of food enthusiasts.</p>
      <p>To complete your account setup, please enter this verification code:</p>

      <div class="otp-box">
          ${otp_code}
      </div>

      <p><b>Important:</b></p>
      <ul>
        <li>This code will expire in <b>10 minutes</b></li>
        <li>Don’t share this code with anyone</li>
        <li>Enter it exactly as shown above</li>
      </ul>
      <p>If you didn’t request this verification code, you can safely ignore this email.</p>
    </div>
    <div class="footer">
      &copy; 2025 What's Cooking? | All rights reserved.
    </div>
  </div>
</body>
</html>
`
  }

  try {
    const info = await transporter.sendMail(mailOptions)
    return NextResponse.json({ success: true, info })
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}

