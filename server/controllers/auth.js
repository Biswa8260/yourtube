import mongoose from "mongoose";
import users from "../Modals/Auth.js";
import OTPVerification from "../Modals/OTP.js";
import nodemailer from "nodemailer";
import fs from "fs";
import path from "path";
import crypto from "crypto";

const parseDevice = (userAgent) => {
  if (!userAgent) return "Unknown Device";
  if (userAgent.includes("Mobi")) {
    if (userAgent.includes("Android")) return "Android Mobile";
    if (userAgent.includes("iPhone")) return "iPhone Mobile";
    return "Mobile Device";
  }
  if (userAgent.includes("Windows")) return "Windows Desktop";
  if (userAgent.includes("Macintosh")) return "Mac Desktop";
  if (userAgent.includes("Linux")) return "Linux Desktop";
  return "Desktop Device";
};

const calculateTimeTheme = () => {
  const now = new Date();
  const istTimeStr = now.toLocaleString("en-US", { timeZone: "Asia/Kolkata" });
  const istDate = new Date(istTimeStr);
  const hours = istDate.getHours();
  const minutes = istDate.getMinutes();
  
  // between 10:00 AM and 12:00 PM IST (inclusive)
  const isLightTime = hours === 10 || hours === 11 || (hours === 12 && minutes === 0);
  return isLightTime ? "light" : "dark";
};

const sendOTPEmail = async (email, name, otp, city, state, device, ip) => {
  const dateStr = new Date().toLocaleString();
  const otpHtml = `
    <div style="font-family: Arial, sans-serif; max-width: 500px; margin: 0 auto; border: 1px solid #eaeaea; padding: 25px; border-radius: 8px;">
      <div style="text-align: center; border-bottom: 2px solid #ff0000; padding-bottom: 10px; margin-bottom: 20px;">
        <h2 style="color: #ff0000; margin: 0;">YourTube Security Alert</h2>
        <p style="color: #666; margin: 5px 0 0 0;">New Login Location or Device Detected</p>
      </div>
      
      <p>Hello <strong>${name || "User"}</strong>,</p>
      <p>We noticed a login attempt to your YourTube account from a location or device we don't recognize:</p>
      
      <div style="background-color: #f9f9f9; padding: 15px; border-radius: 6px; font-size: 14px; margin: 20px 0; border-left: 4px solid #ff0000;">
        <div style="margin-bottom: 6px;"><strong>Device:</strong> ${device}</div>
        <div style="margin-bottom: 6px;"><strong>Location:</strong> ${city}, ${state}</div>
        <div style="margin-bottom: 6px;"><strong>IP Address:</strong> ${ip}</div>
        <div><strong>Time:</strong> ${dateStr}</div>
      </div>
      
      <p>Please enter the following security code to authorize this login:</p>
      <div style="text-align: center; margin: 30px 0;">
        <span style="font-size: 32px; font-weight: bold; color: #ff0000; letter-spacing: 4px; border: 1px dashed #ff0000; padding: 10px 25px; border-radius: 4px; background-color: #fff5f5;">
          ${otp}
        </span>
      </div>
      
      <p style="color: #555; font-size: 13px;">This security code is temporary and will expire in 10 minutes. If you did not initiate this request, please secure your Google credentials immediately.</p>
      
      <div style="text-align: center; margin-top: 30px; font-size: 12px; color: #999; border-top: 1px solid #eaeaea; padding-top: 15px;">
        <p>&copy; 2026 YourTube Security Services</p>
      </div>
    </div>
  `;

  try {
    const invoicesDir = path.join("uploads", "invoices");
    if (!fs.existsSync(invoicesDir)) {
      fs.mkdirSync(invoicesDir, { recursive: true });
    }
    const filename = `otp_${otp}.html`;
    const filepath = path.join(invoicesDir, filename);
    fs.writeFileSync(filepath, otpHtml);
    console.log(`🔑 [Security Code] Saved backup OTP html to: ${filepath}`);
  } catch (err) {
    console.error("Failed to write backup OTP file:", err);
  }

  const emailUser = process.env.EMAIL_USER;
  const emailPass = process.env.EMAIL_PASS;

  if (!emailUser || !emailPass) {
    console.log("------------------ SECURITY CODE EMAIL PRINT ------------------");
    console.log(`To: ${email}`);
    console.log(`Subject: YourTube Verification Code: ${otp}`);
    console.log(`OTP Code: ${otp}`);
    console.log(`New Device: ${device}`);
    console.log(`Location: ${city}, ${state}`);
    console.log("----------------------------------------------------------------");
    return;
  }

  try {
    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: emailUser,
        pass: emailPass,
      },
    });

    const mailOptions = {
      from: `"YourTube Security" <${emailUser}>`,
      to: email,
      subject: `YourTube Security Verification Code: ${otp}`,
      html: otpHtml,
    };

    await transporter.sendMail(mailOptions);
    console.log(`✉️ Security OTP email successfully dispatched to ${email}`);
  } catch (error) {
    console.error("Failed to send OTP verification email:", error);
  }
};

export const login = async (req, res) => {
  const { email, name, image, ip, device } = req.body;
  const userAgent = req.headers["user-agent"] || device || "Unknown User Agent";
  const clientDevice = parseDevice(userAgent);

  let city = "Local / Test City";
  let state = "Local / Test State";
  const clientIp = ip || req.ip || "127.0.0.1";

  if (clientIp && clientIp !== "127.0.0.1" && clientIp !== "::1") {
    try {
      const geoRes = await fetch(`http://ip-api.com/json/${clientIp}`);
      const geoData = await geoRes.json();
      if (geoData && geoData.status === "success") {
        city = geoData.city || "Unknown City";
        state = geoData.regionName || geoData.region || "Unknown State";
      }
    } catch (err) {
      console.error("Geolocation fetch error:", err);
    }
  }

  try {
    let existingUser = await users.findOne({ email });

    if (!existingUser) {
      // First login: auto-approve this location and device. Apply theme rule.
      const initialTheme = calculateTimeTheme();
      const firstHistory = {
        city,
        state,
        device: clientDevice,
        approvedAt: new Date()
      };
      
      existingUser = await users.create({
        email,
        name,
        image,
        theme: initialTheme,
        loginHistory: [firstHistory]
      });
      
      return res.status(201).json({ result: existingUser });
    } else {
      // Existing user: check if city, state, or device is new.
      const isKnown = existingUser.loginHistory.some(h => 
        h.city?.toLowerCase() === city.toLowerCase() &&
        h.state?.toLowerCase() === state.toLowerCase() &&
        h.device?.toLowerCase() === clientDevice.toLowerCase()
      );

      if (!isKnown) {
        // Send OTP Verification code
        const otpCode = Math.floor(100000 + Math.random() * 900000).toString();

        const newOTP = new OTPVerification({
          email,
          otp: otpCode,
          tempLoginData: {
            city,
            state,
            device: clientDevice,
            ip: clientIp,
            userPayload: { email, name, image }
          }
        });
        await newOTP.save();

        // Send Email
        await sendOTPEmail(email, name, otpCode, city, state, clientDevice, clientIp);

        return res.status(202).json({
          requireOTP: true,
          email,
          tempToken: newOTP._id
        });
      }

      // If known, update theme if not set and login succeeds immediately
      if (!existingUser.theme) {
        existingUser.theme = calculateTimeTheme();
        await existingUser.save();
      }

      return res.status(200).json({ result: existingUser });
    }
  } catch (error) {
    console.error("Login error:", error);
    return res.status(500).json({ message: "Something went wrong" });
  }
};

export const verifyLoginOTP = async (req, res) => {
  const { tempToken, otp } = req.body;

  if (!tempToken || !otp) {
    return res.status(400).json({ message: "Invalid verification inputs" });
  }

  try {
    const record = await OTPVerification.findById(tempToken);
    if (!record) {
      return res.status(400).json({ message: "Verification session expired or invalid." });
    }

    if (record.otp !== otp) {
      return res.status(400).json({ message: "Invalid verification OTP code. Please check and try again." });
    }

    // Success: update approved list on User
    const { city, state, device, userPayload } = record.tempLoginData;
    let user = await users.findOne({ email: record.email });

    if (!user) {
      user = new users({
        email: userPayload.email,
        name: userPayload.name,
        image: userPayload.image
      });
    }

    // Append new login history
    user.loginHistory.push({
      city,
      state,
      device,
      approvedAt: new Date()
    });

    // Auto theme rule if not set
    if (!user.theme) {
      user.theme = calculateTimeTheme();
    }

    await user.save();
    await OTPVerification.findByIdAndDelete(tempToken);

    return res.status(200).json({ result: user });
  } catch (err) {
    console.error("Verify OTP error:", err);
    return res.status(500).json({ message: "Something went wrong during verification." });
  }
};

export const updateprofile = async (req, res) => {
  const { id: _id } = req.params;
  const { channelname, description } = req.body;
  if (!mongoose.Types.ObjectId.isValid(_id)) {
    return res.status(500).json({ message: "User unavailable..." });
  }
  try {
    const updatedata = await users.findByIdAndUpdate(
      _id,
      {
        $set: {
          channelname: channelname,
          description: description,
        },
      },
      { new: true }
    );
    return res.status(201).json(updatedata);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Something went wrong" });
  }
};

export const updateplan = async (req, res) => {
  const { id: _id } = req.params;
  const { plan } = req.body;
  if (!mongoose.Types.ObjectId.isValid(_id)) {
    return res.status(500).json({ message: "User unavailable..." });
  }
  try {
    const updatedUser = await users.findByIdAndUpdate(
      _id,
      {
        $set: { plan: plan },
      },
      { new: true }
    );
    return res.status(200).json(updatedUser);
  } catch (error) {
    console.error("Error updating plan:", error);
    return res.status(500).json({ message: "Something went wrong" });
  }
};

export const updateTheme = async (req, res) => {
  const { id } = req.params;
  const { theme } = req.body;

  if (!mongoose.Types.ObjectId.isValid(id)) {
    return res.status(500).json({ message: "User unavailable..." });
  }

  if (theme !== "light" && theme !== "dark") {
    return res.status(400).json({ message: "Invalid theme value" });
  }

  try {
    const updatedUser = await users.findByIdAndUpdate(
      id,
      {
        $set: { theme: theme },
      },
      { new: true }
    );
    return res.status(200).json(updatedUser);
  } catch (error) {
    console.error("Error updating theme:", error);
    return res.status(500).json({ message: "Something went wrong" });
  }
};
