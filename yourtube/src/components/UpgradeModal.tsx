"use client";

import React, { useState } from "react";
import Script from "next/script";
import { Check, ShieldCheck, CreditCard, Sparkles, X, ChevronRight, CheckCircle2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "./ui/dialog";
import { Button } from "./ui/button";
import { useUser } from "@/lib/AuthContext";
import axiosInstance from "@/lib/axiosinstance";
import { toast } from "sonner";

interface UpgradeModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function UpgradeModal({ isOpen, onClose }: UpgradeModalProps) {
  const { user, login } = useUser();
  const [loadingPlan, setLoadingPlan] = useState<string | null>(null);
  const [showMockInvoice, setShowMockInvoice] = useState<any | null>(null);

  React.useEffect(() => {
    const loadRazorpay = () => {
      if (typeof window !== "undefined" && !(window as any).Razorpay) {
        const script = document.createElement("script");
        script.src = "https://checkout.razorpay.com/v1/checkout.js";
        script.async = true;
        document.body.appendChild(script);
      }
    };
    loadRazorpay();
  }, []);

  const handleMockSimulation = async (planName: string, price: number) => {
    if (!user) {
      toast.error("Please sign in to upgrade subscription plans.");
      return;
    }
    try {
      setLoadingPlan(planName);
      toast.info(`Simulating payment upgrade for plan ${planName}...`);
      const orderRes = await axiosInstance.post("/payment/order", {
        plan: planName,
        amount: price,
        userId: user._id || user.id
      });
      await handleMockVerify(orderRes.data.id, planName);
    } catch (err) {
      console.error(err);
      toast.error("Failed to run payment simulation.");
      setLoadingPlan(null);
    }
  };

  const plans = [
    {
      name: "Free",
      price: 0,
      period: "forever",
      features: [
        "1 Video download per day",
        "Playback interrupted by ads",
        "Limited access to Premium videos (60s preview)",
        "Standard stream quality",
      ],
      badge: "Basic",
      cta: "Current Plan",
      disabled: true,
      color: "bg-gray-100 border-gray-200 text-gray-800",
    },
    {
      name: "Bronze",
      price: 99,
      period: "month",
      features: [
        "3 Video downloads per day",
        "Ad-free viewing on Standard videos",
        "Unlimited access to Premium videos",
        "Full playback watch time",
      ],
      badge: "Popular",
      cta: "Upgrade Bronze",
      disabled: false,
      color: "bg-orange-50 border-orange-200 text-orange-800",
      themeColor: "orange",
    },
    {
      name: "Silver",
      price: 199,
      period: "month",
      features: [
        "5 Video downloads per day",
        "Ad-free viewing on ALL videos",
        "Unlimited access to Premium videos",
        "Priority stream quality & watch time",
      ],
      badge: "Value",
      cta: "Upgrade Silver",
      disabled: false,
      color: "bg-slate-100 border-slate-300 text-slate-800",
      themeColor: "silver",
    },
    {
      name: "Gold",
      price: 399,
      period: "month",
      features: [
        "10 Video downloads per day",
        "Ad-free viewing on ALL videos",
        "Unlimited access to Premium videos",
        "Priority uploader benefits & priority streaming",
      ],
      badge: "VIP Elite",
      cta: "Upgrade Gold",
      disabled: false,
      color: "bg-yellow-50 border-yellow-200 text-yellow-800",
      themeColor: "gold",
    },
  ];

  const handleMockVerify = async (orderId: string, planName: string) => {
    try {
      const res = await axiosInstance.post("/payment/verify", {
        razorpay_order_id: orderId,
        userId: user._id || user.id,
        isMock: true,
      });

      if (res.status === 200) {
        login(res.data.user);
        toast.success(`Successfully upgraded to ${planName}!`);
        setShowMockInvoice({
          planName,
          amount: plans.find((p) => p.name === planName)?.price,
          txId: res.data.paymentId || "tx_mock_123456",
          date: new Date().toLocaleString(),
        });
      }
    } catch (err) {
      console.error(err);
      toast.error("Failed to verify mockup transaction.");
    } finally {
      setLoadingPlan(null);
    }
  };

  const handleUpgrade = async (planName: string, price: number) => {
    if (!user) {
      toast.error("Please sign in to upgrade subscription plans.");
      return;
    }

    try {
      setLoadingPlan(planName);
      
      const res = await axiosInstance.post("/payment/order", {
        plan: planName,
        amount: price,
        userId: user._id || user.id,
      });

      if (res.data.mockMode) {
        toast.info("Razorpay keys missing. Initializing Mock Sandbox Checkout.");
        // Instantly trigger mock payment verification
        await handleMockVerify(res.data.id, planName);
        return;
      }

      // Live / Sandbox Razorpay script call
      const options = {
        key: res.data.key,
        amount: res.data.amount,
        currency: res.data.currency,
        name: "YourTube Premium",
        description: `Upgrade to ${planName} Plan`,
        order_id: res.data.id,
        handler: async function (response: any) {
          try {
            const verifyRes = await axiosInstance.post("/payment/verify", {
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_order_id: response.razorpay_order_id,
              razorpay_signature: response.razorpay_signature,
              userId: user._id || user.id,
            });

            if (verifyRes.status === 200) {
              login(verifyRes.data.user);
              toast.success(`Successfully upgraded to ${planName}!`);
              setShowMockInvoice({
                planName,
                amount: price,
                txId: response.razorpay_payment_id,
                date: new Date().toLocaleString(),
              });
            }
          } catch (err) {
            console.error(err);
            toast.error("Transaction signature verification failed.");
          }
        },
        prefill: {
          name: user.name,
          email: user.email,
        },
        theme: {
          color: "#ef4444",
        },
      };

      const rzp = new (window as any).Razorpay(options);
      rzp.open();
      setLoadingPlan(null);
    } catch (error) {
      console.error("Upgrade error:", error);
      toast.error("Failed to initialize transaction. Please try again.");
      setLoadingPlan(null);
    }
  };

  return (
    <>
      <Script src="https://checkout.razorpay.com/v1/checkout.js" strategy="lazyOnload" />

      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="sm:max-w-xl md:max-w-4xl max-h-[90vh] overflow-y-auto">
          {showMockInvoice ? (
            <div className="py-6 text-center space-y-6">
              <DialogHeader className="sr-only">
                <DialogTitle>Billing Invoice Details</DialogTitle>
                <DialogDescription>
                  Your subscription payment transaction completed successfully.
                </DialogDescription>
              </DialogHeader>
              <div className="w-16 h-16 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto">
                <CheckCircle2 className="w-10 h-10" />
              </div>
              <div className="space-y-2">
                <h2 className="text-2xl font-bold text-gray-900">Upgrade Successful!</h2>
                <p className="text-gray-500">Your account is now active on the {showMockInvoice.planName} tier.</p>
              </div>

              {/* Invoice details */}
              <div className="bg-gray-50 rounded-lg p-5 border text-left max-w-md mx-auto space-y-3 font-mono text-xs text-gray-600">
                <div className="flex justify-between border-b pb-2">
                  <span className="font-bold text-gray-800">INVOICE DETAILS</span>
                  <span className="text-red-500 font-bold">PAID</span>
                </div>
                <div className="flex justify-between">
                  <span>Product:</span>
                  <span className="text-gray-900 font-semibold">YourTube {showMockInvoice.planName} Plan</span>
                </div>
                <div className="flex justify-between">
                  <span>Amount:</span>
                  <span className="text-gray-900 font-semibold">INR {showMockInvoice.amount}.00</span>
                </div>
                <div className="flex justify-between border-t pt-2">
                  <span>Transaction ID:</span>
                  <span className="text-gray-900 select-all font-semibold">{showMockInvoice.txId}</span>
                </div>
                <div className="flex justify-between">
                  <span>Date/Time:</span>
                  <span className="text-gray-900">{showMockInvoice.date}</span>
                </div>
              </div>

              <p className="text-xs text-gray-400">
                A confirmation email with an HTML copy of the invoice has been dispatched to {user?.email}.
              </p>

              <Button onClick={() => {
                setShowMockInvoice(null);
                onClose();
              }} className="px-8 bg-red-600 hover:bg-red-700">
                Done
              </Button>
            </div>
          ) : (
            <>
              <DialogHeader>
                <div className="flex items-center gap-2 text-red-600 font-semibold text-sm mb-1">
                  <Sparkles className="w-4 h-4 fill-red-600 animate-spin" />
                  <span>PREMIUM BENFITS ACCESS</span>
                </div>
                <DialogTitle className="text-2xl md:text-3xl font-extrabold tracking-tight">
                  Choose your YourTube Plan
                </DialogTitle>
                <DialogDescription className="text-gray-500 text-sm">
                  Support content creators and unlock downloads, ad-free streaming, and exclusive content.
                </DialogDescription>
              </DialogHeader>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 py-4">
                {plans.map((plan) => {
                  const isCurrent = user?.plan === plan.name || (!user?.plan && plan.name === "Free");

                  return (
                    <div
                      key={plan.name}
                      className={`flex flex-col justify-between p-4 rounded-xl border-2 transition-all relative ${
                        isCurrent
                          ? "border-red-600 shadow-md ring-2 ring-red-100"
                          : "border-gray-200 hover:border-gray-300"
                      }`}
                    >
                      {/* Top section */}
                      <div className="space-y-3">
                        <div className="flex justify-between items-start">
                          <h3 className="font-bold text-lg text-gray-900">{plan.name}</h3>
                          <span className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded-full ${plan.color}`}>
                            {plan.badge}
                          </span>
                        </div>

                        <div className="flex items-baseline gap-1">
                          <span className="text-3xl font-extrabold text-gray-900">₹{plan.price}</span>
                          <span className="text-xs text-gray-500">/{plan.period}</span>
                        </div>

                        <ul className="space-y-2 border-t pt-3">
                          {plan.features.map((feat, i) => (
                            <li key={i} className="flex items-start gap-2 text-xs text-gray-600">
                              <Check className="w-3.5 h-3.5 text-green-600 flex-shrink-0 mt-0.5" />
                              <span>{feat}</span>
                            </li>
                          ))}
                        </ul>
                      </div>

                      {/* Bottom Upgrade Action */}
                      <div className="mt-5 pt-3">
                        {isCurrent ? (
                          <Button variant="secondary" className="w-full font-bold cursor-default" disabled>
                            Active Plan
                          </Button>
                        ) : (
                          <Button
                            onClick={() => handleUpgrade(plan.name, plan.price)}
                            disabled={plan.disabled || (loadingPlan !== null)}
                            className={`w-full font-bold transition-all ${
                              plan.themeColor === "gold"
                                ? "bg-amber-500 hover:bg-amber-600 text-white"
                                : plan.themeColor === "silver"
                                ? "bg-slate-700 hover:bg-slate-800 text-white"
                                : plan.themeColor === "orange"
                                ? "bg-orange-600 hover:bg-orange-700 text-white"
                                : "bg-red-600 hover:bg-red-700 text-white"
                            }`}
                          >
                            {loadingPlan === plan.name ? "Processing..." : plan.cta}
                          </Button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="text-center text-xs text-gray-400 mt-2 border-t pt-3 flex flex-col items-center gap-2">
                <div className="flex items-center justify-center gap-1.5 font-medium">
                  <ShieldCheck className="w-4 h-4 text-green-600" />
                  <span>Secure transactions powered by Razorpay.</span>
                </div>
                <div className="text-[10px] text-gray-400 max-w-md">
                  Trouble with Razorpay checkout loading or tracker CORS blocked by ad blockers? 
                  <div className="mt-1.5 flex flex-wrap justify-center gap-2">
                    <span className="font-semibold text-gray-500">Run Simulator:</span>
                    <button onClick={() => handleMockSimulation("Bronze", 99)} className="text-red-500 hover:underline font-bold">Bronze (₹99)</button>
                    <span>•</span>
                    <button onClick={() => handleMockSimulation("Silver", 199)} className="text-red-500 hover:underline font-bold">Silver (₹199)</button>
                    <span>•</span>
                    <button onClick={() => handleMockSimulation("Gold", 399)} className="text-red-500 hover:underline font-bold">Gold (₹399)</button>
                  </div>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
