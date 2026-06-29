"use client";

import React, { FormEvent, useState } from "react";
import { ShieldAlert, KeyRound, CheckCircle2, ArrowRight } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "./ui/dialog";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { useUser } from "@/lib/AuthContext";
import axiosInstance from "@/lib/axiosinstance";
import { toast } from "sonner";

export default function OTPVerificationModal() {
  const { otpVerificationData, setOtpVerificationData, login, logout } = useUser();
  const [otp, setOtp] = useState("");
  const [verifying, setVerifying] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!otpVerificationData) return;
    if (otp.length !== 6 || isNaN(Number(otp))) {
      toast.error("Please enter a valid 6-digit security code.");
      return;
    }

    try {
      setVerifying(true);
      const res = await axiosInstance.post("/user/verify-otp", {
        tempToken: otpVerificationData.tempToken,
        otp,
      });

      if (res.status === 200) {
        toast.success("Security verification completed successfully! Logging in...");
        login(res.data.result);
        setOtpVerificationData(null);
      }
    } catch (error: any) {
      console.error("Verification failed:", error);
      if (error.response && error.response.data && error.response.data.message) {
        toast.error(error.response.data.message);
      } else {
        toast.error("Invalid verification code. Please check server logs or files.");
      }
    } finally {
      setVerifying(false);
    }
  };

  const handleCancel = () => {
    logout();
  };

  const isOpen = otpVerificationData !== null;

  return (
    <Dialog open={isOpen} onOpenChange={handleCancel}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-2 text-amber-600 font-semibold text-sm mb-1">
            <ShieldAlert className="w-4 h-4 text-amber-500 fill-amber-500 animate-pulse" />
            <span>MFA ACCOUNT PROTECTION</span>
          </div>
          <DialogTitle className="text-xl font-bold">
            Verify Login Request
          </DialogTitle>
          <DialogDescription className="text-gray-500 text-sm">
            We noticed a login request from a new city, state, or device. To secure your account, we have sent a 6-digit verification code to your email.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6 pt-2">
          {/* Info Details */}
          <div className="bg-amber-50/50 border border-amber-200 rounded-lg p-3 text-xs text-amber-800 space-y-1">
            <div><strong>Verification Email:</strong> {otpVerificationData?.email}</div>
            <div className="text-[10px] text-amber-600">
              *If SMTP parameters are missing, view the printed verification code in your server logs or terminal window.
            </div>
          </div>

          {/* OTP Code input */}
          <div className="space-y-2">
            <Label htmlFor="otpCode" className="font-semibold text-xs text-gray-700 uppercase tracking-wider flex items-center gap-1.5">
              <KeyRound className="w-3.5 h-3.5" />
              6-Digit Verification Code
            </Label>
            <Input
              id="otpCode"
              type="text"
              maxLength={6}
              placeholder="0 0 0 0 0 0"
              value={otp}
              onChange={(e) => setOtp(e.target.value.replace(/\D/g, ""))}
              className="text-center font-mono text-2xl tracking-widest h-12 focus-visible:ring-amber-500"
              disabled={verifying}
              autoFocus
            />
          </div>

          {/* Dialog Actions */}
          <div className="flex gap-3 justify-end pt-2 border-t">
            <Button
              type="button"
              variant="outline"
              onClick={handleCancel}
              disabled={verifying}
              className="px-6"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={verifying || otp.length !== 6}
              className="bg-amber-600 hover:bg-amber-700 text-white font-bold px-6 flex items-center gap-1.5"
            >
              {verifying ? "Verifying..." : (
                <>
                  Verify Login
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
