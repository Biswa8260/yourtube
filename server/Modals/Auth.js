import mongoose from "mongoose";
const userschema = mongoose.Schema({
  email: { type: String, required: true },
  name: { type: String },
  channelname: { type: String },
  description: { type: String },
  image: { type: String },
  joinedon: { type: Date, default: Date.now },
  plan: { type: String, enum: ["Free", "Bronze", "Silver", "Gold"], default: "Free" },
  theme: { type: String, enum: ["light", "dark"], default: null },
  loginHistory: {
    type: [
      {
        city: String,
        state: String,
        device: String,
        approvedAt: { type: Date, default: Date.now }
      }
    ],
    default: []
  }
});

export default mongoose.model("user", userschema);
