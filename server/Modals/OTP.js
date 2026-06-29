import mongoose from "mongoose";

const otpSchema = mongoose.Schema(
  {
    email: {
      type: String,
      required: true,
    },
    otp: {
      type: String,
      required: true,
    },
    tempLoginData: {
      type: mongoose.Schema.Types.Mixed,
      required: true,
    },
    createdAt: {
      type: Date,
      default: Date.now,
      expires: 600, // Expires in 10 minutes (600 seconds)
    },
  },
  {
    timestamps: true,
  }
);

export default mongoose.model("OTPVerification", otpSchema);
