import nodemailer from "nodemailer";
import dns from "node:dns";

// 1. Keeps your previous IPv6 connection error blocked
dns.setDefaultResultOrder("ipv4first");

// 2. Default to Port 465 (Resend's preferred standard) or pull from environment
const SMTP_PORT = Number(process.env.SMTP_PORT) || 465;

const transporter = nodemailer.createTransport({
  // If you are switching to Resend, make sure your .env has SMTP_HOST="smtp.resend.com"
  host: process.env.SMTP_HOST || "smtp.gmail.com",
  port: SMTP_PORT,

  // 3. FIXED: If port is 465 it MUST be true. If port is 587 it MUST be false.
  secure: process.env.SMTP_SECURE
    ? process.env.SMTP_SECURE === "true"
    : SMTP_PORT === 465,

  auth: {
    user: process.env.SMTP_USER || "mikemanuueli@gmail.com",
    pass: process.env.SMTP_PASS || "kkbikkrvkxxoqcsh",
  },
});

const FROM_ADDRESS = process.env.SMTP_FROM || "noreply@trackio.app";

export async function sendVerificationEmail(
  email: string,
  name: string,
  code: string,
): Promise<void> {
  try {
    await transporter.sendMail({
      from: `"Trackio" <${FROM_ADDRESS}>`,
      to: email,
      subject: "Verify your Trackio account",
      html: `
        <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto;">
          <h2>Welcome to Trackio, ${name}!</h2>
          <p>Use the verification code below to activate your account:</p>
          <div style="text-align: center; margin: 32px 0;">
            <span style="display: inline-block; padding: 16px 32px; background: #f0fdf4; 
                         border: 2px dashed #16a34a; border-radius: 12px; 
                         font-size: 32px; font-weight: 700; letter-spacing: 8px; color: #16a34a;
                         font-family: monospace;">
              ${code}
            </span>
          </div>
          <p style="color: #666; font-size: 14px;">
            Enter this code on the verification page to complete your registration.
          </p>
          <p style="color: #999; font-size: 12px; margin-top: 32px;">
            This code expires once used. If you did not create this account, you can ignore this email.
          </p>
        </div>
      `,
    });
  } catch (error) {
    console.error("SMTP Client Delivery Failure:", error);
    throw error;
  }
}
