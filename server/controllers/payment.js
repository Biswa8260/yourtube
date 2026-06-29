import Razorpay from "razorpay";
import crypto from "crypto";
import nodemailer from "nodemailer";
import fs from "fs";
import path from "path";
import Order from "../Modals/Order.js";
import users from "../Modals/Auth.js";

// Initialize Razorpay if keys are available
const getRazorpayInstance = () => {
  const key_id = process.env.RAZORPAY_KEY_ID;
  const key_secret = process.env.RAZORPAY_KEY_SECRET;

  if (!key_id || !key_secret) {
    console.warn("⚠️ Razorpay API keys missing in environment. Using Sandbox/Mock checkout mode.");
    return null;
  }

  try {
    return new Razorpay({
      key_id,
      key_secret,
    });
  } catch (err) {
    console.error("Failed to initialize Razorpay SDK:", err);
    return null;
  }
};

// Helper to send email or log invoice fallback
const sendInvoiceEmail = async (user, plan, amount, txId) => {
  const dateStr = new Date().toLocaleString();
  const invoiceHtml = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #eaeaea; padding: 20px; border-radius: 8px;">
      <div style="text-align: center; border-bottom: 2px solid #ff0000; padding-bottom: 10px; margin-bottom: 20px;">
        <h1 style="color: #ff0000; margin: 0;">YourTube Premium</h1>
        <p style="color: #666; margin: 5px 0 0 0;">Subscription Purchase Invoice</p>
      </div>
      
      <p>Dear <strong>${user.name || "Subscriber"}</strong>,</p>
      <p>Thank you for upgrading! Your subscription to the <strong>YourTube ${plan} Plan</strong> has been activated successfully.</p>
      
      <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
        <tr style="background-color: #f9f9f9;">
          <th style="text-align: left; padding: 8px; border-bottom: 1px solid #eaeaea;">Item</th>
          <th style="text-align: right; padding: 8px; border-bottom: 1px solid #eaeaea;">Price</th>
        </tr>
        <tr>
          <td style="padding: 8px; border-bottom: 1px solid #eaeaea;">YourTube ${plan} Subscription (1 Month)</td>
          <td style="text-align: right; padding: 8px; border-bottom: 1px solid #eaeaea;">INR ${amount}.00</td>
        </tr>
        <tr style="font-weight: bold;">
          <td style="padding: 8px;">Total Paid</td>
          <td style="text-align: right; padding: 8px;">INR ${amount}.00</td>
        </tr>
      </table>

      <div style="background-color: #f5f5f5; padding: 12px; border-radius: 4px; font-size: 13px; color: #555; margin-top: 20px;">
        <h4 style="margin: 0 0 8px 0; color: #333;">Transaction details</h4>
        <div><strong>Transaction ID:</strong> ${txId}</div>
        <div><strong>Date:</strong> ${dateStr}</div>
        <div><strong>User Email:</strong> ${user.email}</div>
        <div><strong>Account Plan Status:</strong> ${plan} (Active)</div>
      </div>
      
      <div style="text-align: center; margin-top: 30px; font-size: 12px; color: #888; border-top: 1px solid #eaeaea; padding-top: 15px;">
        <p>This is an automated transaction confirmation. Please do not reply directly to this email.</p>
        <p>&copy; 2026 YourTube Inc. All rights reserved.</p>
      </div>
    </div>
  `;

  // Fallback storage path if email SMTP is not working
  const saveInvoiceBackup = (htmlContent) => {
    try {
      const invoicesDir = path.join("uploads", "invoices");
      if (!fs.existsSync(invoicesDir)) {
        fs.mkdirSync(invoicesDir, { recursive: true });
      }
      const filename = `invoice_${txId}.html`;
      const filepath = path.join(invoicesDir, filename);
      fs.writeFileSync(filepath, htmlContent);
      console.log(`📄 Saved offline backup of invoice to: ${filepath}`);
    } catch (err) {
      console.error("Failed to write invoice fallback file:", err);
    }
  };

  saveInvoiceBackup(invoiceHtml);

  const emailUser = process.env.EMAIL_USER;
  const emailPass = process.env.EMAIL_PASS;

  if (!emailUser || !emailPass) {
    console.log("------------------ FALLBACK INVOICE EMAIL PRINT ------------------");
    console.log(`To: ${user.email}`);
    console.log(`Subject: YourTube Premium Invoice - ${plan} Upgrade`);
    console.log("Invoice HTML preview saved in uploads/invoices/ folder.");
    console.log("------------------------------------------------------------------");
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
      from: `"YourTube Premium" <${emailUser}>`,
      to: user.email,
      subject: `YourTube Premium Invoice - ${plan} Upgrade Successful`,
      html: invoiceHtml,
    };

    const info = await transporter.sendMail(mailOptions);
    console.log("✉️ Email sent successfully:", info.messageId);
  } catch (error) {
    console.error("Failed to deliver invoice email:", error);
  }
};

export const createOrder = async (req, res) => {
  const { plan, amount, userId } = req.body;

  if (!plan || !amount || !userId) {
    return res.status(400).json({ message: "Missing required fields" });
  }

  try {
    const rzp = getRazorpayInstance();

    if (!rzp) {
      // Mock order creation for testing without credentials
      const mockOrderId = `order_mock_${crypto.randomBytes(6).toString("hex")}`;
      const newOrder = new Order({
        userId,
        plan,
        amount,
        razorpayOrderId: mockOrderId,
        status: "pending",
      });
      await newOrder.save();

      return res.status(200).json({
        id: mockOrderId,
        amount: amount * 100, // in paisa
        currency: "INR",
        mockMode: true,
        key: "rzp_test_mockkey_id",
      });
    }

    const options = {
      amount: amount * 100, // in paisa
      currency: "INR",
      receipt: `receipt_order_${Date.now()}`,
    };

    const rzpOrder = await rzp.orders.create(options);

    const newOrder = new Order({
      userId,
      plan,
      amount,
      razorpayOrderId: rzpOrder.id,
      status: "pending",
    });
    await newOrder.save();

    return res.status(200).json({
      id: rzpOrder.id,
      amount: rzpOrder.amount,
      currency: rzpOrder.currency,
      mockMode: false,
      key: process.env.RAZORPAY_KEY_ID,
    });
  } catch (error) {
    console.error("Create order error:", error);
    return res.status(500).json({ message: "Failed to generate payment order" });
  }
};

export const verifyPayment = async (req, res) => {
  const {
    razorpay_payment_id,
    razorpay_order_id,
    razorpay_signature,
    userId,
    isMock,
  } = req.body;

  if (!razorpay_order_id || !userId) {
    return res.status(400).json({ message: "Invalid verification request parameters" });
  }

  try {
    const order = await Order.findOne({ razorpayOrderId: razorpay_order_id });
    if (!order) {
      return res.status(404).json({ message: "Order records not found" });
    }

    const user = await users.findById(userId);
    if (!user) {
      return res.status(404).json({ message: "User account not found" });
    }

    if (isMock || razorpay_order_id.startsWith("order_mock_")) {
      // Mock payment verification approval
      order.status = "success";
      order.paymentId = razorpay_payment_id || `pay_mock_${crypto.randomBytes(6).toString("hex")}`;
      await order.save();

      // Upgrade user plan
      user.plan = order.plan;
      const updatedUser = await user.save();

      // Send invoice
      await sendInvoiceEmail(updatedUser, order.plan, order.amount, order.paymentId);

      return res.status(200).json({
        message: "Payment verified successfully (Mock Mode)",
        user: updatedUser,
        invoiceSaved: true,
      });
    }

    // Standard Razorpay validation
    const key_secret = process.env.RAZORPAY_KEY_SECRET;
    const body = razorpay_order_id + "|" + razorpay_payment_id;
    const expectedSignature = crypto
      .createHmac("sha256", key_secret)
      .update(body.toString())
      .digest("hex");

    const isSignatureValid = expectedSignature === razorpay_signature;

    if (!isSignatureValid) {
      order.status = "failed";
      await order.save();
      return res.status(400).json({ message: "Payment verification signature mismatch" });
    }

    order.status = "success";
    order.paymentId = razorpay_payment_id;
    await order.save();

    user.plan = order.plan;
    const updatedUser = await user.save();

    // Send invoice
    await sendInvoiceEmail(updatedUser, order.plan, order.amount, order.paymentId);

    return res.status(200).json({
      message: "Payment verified successfully",
      user: updatedUser,
      invoiceSaved: true,
    });
  } catch (error) {
    console.error("Verification error:", error);
    return res.status(500).json({ message: "Verification processing failed" });
  }
};
