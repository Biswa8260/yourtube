"use client";

import React, { useEffect, useState } from "react";
import { Play, Volume2, XCircle } from "lucide-react";

interface AdBannerProps {
  onComplete: () => void;
}

export default function AdBanner({ onComplete }: AdBannerProps) {
  const [timeLeft, setTimeLeft] = useState(5);
  const [canSkip, setCanSkip] = useState(false);

  useEffect(() => {
    if (timeLeft <= 0) {
      setCanSkip(true);
      return;
    }

    const timer = setTimeout(() => {
      setTimeLeft((prev) => prev - 1);
    }, 1000);

    return () => clearTimeout(timer);
  }, [timeLeft]);

  return (
    <div className="absolute inset-0 bg-black/90 flex flex-col items-center justify-center z-50 text-white p-4">
      {/* Top Banner Details */}
      <div className="absolute top-4 left-4 flex items-center gap-2 bg-black/40 px-3 py-1 rounded text-xs">
        <span className="bg-yellow-500 text-black font-extrabold px-1.5 py-0.5 rounded text-[10px]">AD</span>
        <span>Mock Advertisement (Upgrade to Premium to remove ads)</span>
      </div>

      {/* Main Ad Content */}
      <div className="text-center max-w-md space-y-4">
        <div className="w-16 h-16 bg-red-600 rounded-full flex items-center justify-center mx-auto shadow-lg animate-pulse">
          <Play className="w-8 h-8 text-white fill-white ml-1" />
        </div>
        <h3 className="text-xl font-bold">Discover YourTube Premium</h3>
        <p className="text-sm text-gray-400">
          Unlock unlimited downloads, watch premium videos, get longer watch times, and enjoy absolute ad-free playback!
        </p>
      </div>

      {/* Bottom Ad Status Controls */}
      <div className="absolute bottom-4 right-4 flex items-center gap-3">
        <span className="text-xs bg-black/50 px-3 py-1.5 rounded-full text-gray-300 font-medium">
          {timeLeft > 0 ? `Ad will end in ${timeLeft}s` : "Ad ready to skip"}
        </span>
        <button
          onClick={onComplete}
          disabled={!canSkip}
          className={`flex items-center gap-2 px-5 py-2 rounded-full font-bold text-sm shadow-md transition-all ${
            canSkip
              ? "bg-white text-black hover:bg-gray-100 cursor-pointer scale-105"
              : "bg-white/20 text-white/50 cursor-not-allowed"
          }`}
        >
          Skip Ad
        </button>
      </div>
    </div>
  );
}
