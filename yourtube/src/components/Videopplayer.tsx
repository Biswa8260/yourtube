"use client";

import { useRef, useEffect, useState } from "react";
import { useUser } from "@/lib/AuthContext";
import AdBanner from "./AdBanner";
import UpgradeModal from "./UpgradeModal";
import {
  Lock,
  Sparkles,
  Play,
  Pause,
  RotateCcw,
  RotateCw,
  Volume2,
  VolumeX,
  Maximize,
  Minimize,
  SkipForward,
  Loader2,
} from "lucide-react";
import { Button } from "./ui/button";

interface VideoPlayerProps {
  video: {
    _id: string;
    videotitle: string;
    filepath: string;
    isPremium?: boolean;
  };
  onNext?: () => void;
  hasNext?: boolean;
  nextVideoTitle?: string;
}

export default function VideoPlayer({
  video,
  onNext,
  hasNext = false,
  nextVideoTitle = "",
}: VideoPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const singleClickTimer = useRef<any>(null);
  const { user } = useUser();

  const isPremiumUser = user && ["Bronze", "Silver", "Gold"].includes(user.plan);

  const [adCompleted, setAdCompleted] = useState(false);
  const [previewLocked, setPreviewLocked] = useState(false);
  const [upgradeOpen, setUpgradeOpen] = useState(false);

  // Custom playback states
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isBuffering, setIsBuffering] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const [feedback, setFeedback] = useState<{ type: "forward" | "rewind"; x: number; y: number } | null>(null);

  useEffect(() => {
    // Reset state when video changes
    setAdCompleted(isPremiumUser ? true : false);
    setPreviewLocked(false);
    setIsPlaying(false);
    setCurrentTime(0);
    setDuration(0);
    setIsBuffering(false);
    if (videoRef.current) {
      videoRef.current.load();
    }
  }, [video, user]);

  useEffect(() => {
    if (!adCompleted && videoRef.current) {
      videoRef.current.pause();
    }
  }, [adCompleted]);

  // Sync controls auto-hide
  useEffect(() => {
    if (!isPlaying) {
      setShowControls(true);
      return;
    }

    const handleMouseMove = () => {
      setShowControls(true);
    };

    let timeoutId: NodeJS.Timeout;
    if (showControls && isPlaying) {
      timeoutId = setTimeout(() => {
        setShowControls(false);
      }, 2500);
    }

    window.addEventListener("mousemove", handleMouseMove);
    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      clearTimeout(timeoutId);
    };
  }, [showControls, isPlaying]);

  // Sync fullscreen change event
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener("fullscreenchange", handleFullscreenChange);
    return () => {
      document.removeEventListener("fullscreenchange", handleFullscreenChange);
    };
  }, []);

  const handleTimeUpdate = () => {
    if (!videoRef.current) return;
    setCurrentTime(videoRef.current.currentTime);

    // Check watch time limit: free users watching premium video can watch at most 60s
    if (video.isPremium && !isPremiumUser) {
      if (videoRef.current.currentTime >= 60) {
        videoRef.current.pause();
        setPreviewLocked(true);
      }
    }
  };

  const handleAdComplete = () => {
    setAdCompleted(true);
    if (videoRef.current) {
      videoRef.current.play().catch((err) => console.log("Autoplay blocked:", err));
    }
  };

  // Custom playback functions
  const togglePlay = () => {
    if (!videoRef.current || !adCompleted || previewLocked) return;
    if (isPlaying) {
      videoRef.current.pause();
    } else {
      videoRef.current.play().catch((err) => console.log("Autoplay blocked:", err));
    }
  };

  const handleSeekChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!videoRef.current || !adCompleted || previewLocked) return;
    const time = parseFloat(e.target.value);
    videoRef.current.currentTime = time;
    setCurrentTime(time);
  };

  const skipTime = (seconds: number) => {
    if (!videoRef.current || !adCompleted || previewLocked) return;
    const newTime = videoRef.current.currentTime + seconds;
    videoRef.current.currentTime = Math.max(0, Math.min(duration, newTime));
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const vol = parseFloat(e.target.value);
    setVolume(vol);
    if (videoRef.current) {
      videoRef.current.volume = vol;
      videoRef.current.muted = vol === 0;
    }
    setIsMuted(vol === 0);
  };

  const toggleMute = () => {
    if (!videoRef.current) return;
    const muteState = !isMuted;
    setIsMuted(muteState);
    videoRef.current.muted = muteState;
    if (!muteState && volume === 0) {
      setVolume(0.5);
      videoRef.current.volume = 0.5;
    }
  };

  const toggleFullscreen = async () => {
    if (!containerRef.current) return;
    try {
      if (!document.fullscreenElement) {
        await containerRef.current.requestFullscreen();
        setIsFullscreen(true);
      } else {
        await document.exitFullscreen();
        setIsFullscreen(false);
      }
    } catch (err) {
      console.error("Fullscreen toggle failed:", err);
    }
  };

  // Tap/Click controls (Single/Double click resolution)
  const handleVideoClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.detail === 1) {
      singleClickTimer.current = setTimeout(() => {
        togglePlay();
      }, 2500000000000000000); // Use small delay
      // Actually standard: 220ms is perfect
      clearTimeout(singleClickTimer.current);
      singleClickTimer.current = setTimeout(() => {
        togglePlay();
      }, 220);
    } else if (e.detail === 2) {
      clearTimeout(singleClickTimer.current);
      handleVideoDoubleClick(e);
    }
  };

  const handleVideoDoubleClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!videoRef.current || !adCompleted || previewLocked) return;

    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const width = rect.width;
    const isLeft = x < width / 2;

    if (isLeft) {
      skipTime(-10);
      showDoubleTapFeedback("rewind", e.clientX - rect.left, e.clientY - rect.top);
    } else {
      skipTime(10);
      showDoubleTapFeedback("forward", e.clientX - rect.left, e.clientY - rect.top);
    }
  };

  const showDoubleTapFeedback = (type: "forward" | "rewind", x: number, y: number) => {
    setFeedback({ type, x, y });
    setTimeout(() => {
      setFeedback(null);
    }, 600);
  };

  const formatTime = (timeInSeconds: number) => {
    if (isNaN(timeInSeconds)) return "0:00";
    const mins = Math.floor(timeInSeconds / 60);
    const secs = Math.floor(timeInSeconds % 60);
    return `${mins}:${secs < 10 ? "0" : ""}${secs}`;
  };

  return (
    <div
      ref={containerRef}
      className="relative aspect-video bg-black rounded-lg overflow-hidden group select-none"
    >
      {/* Tap/Click Event Layer & Video Shell */}
      <div
        onClick={handleVideoClick}
        className="w-full h-full cursor-pointer flex items-center justify-center relative"
      >
        <video
          ref={videoRef}
          className="w-full h-full"
          controls={false}
          onTimeUpdate={handleTimeUpdate}
          onDurationChange={() => setDuration(videoRef.current?.duration || 0)}
          onPlay={() => setIsPlaying(true)}
          onPause={() => setIsPlaying(false)}
          onWaiting={() => setIsBuffering(true)}
          onPlaying={() => setIsBuffering(false)}
          onCanPlay={() => setIsBuffering(false)}
          onSeeking={() => setIsBuffering(true)}
          onSeeked={() => setIsBuffering(false)}
          poster={`/placeholder.svg`}
        >
          <source
            src={`${process.env.BACKEND_URL}/${video?.filepath?.replace(/\\/g, "/")}`}
            type="video/mp4"
          />
          Your browser does not support the video tag.
        </video>

        {/* Double-Click Feedback ripple */}
        {feedback && (
          <div
            className="absolute pointer-events-none transform -translate-x-1/2 -translate-y-1/2 bg-white/20 text-white font-extrabold rounded-full p-4 flex flex-col items-center justify-center gap-1.5 animate-ping z-20"
            style={{ left: feedback.x, top: feedback.y }}
          >
            {feedback.type === "rewind" ? (
              <>
                <RotateCcw className="w-5 h-5" />
                <span className="text-[10px] uppercase">Rewind 10s</span>
              </>
            ) : (
              <>
                <RotateCw className="w-5 h-5" />
                <span className="text-[10px] uppercase">Skip 10s</span>
              </>
            )}
          </div>
        )}
      </div>

      {/* Buffering Spinner */}
      {isBuffering && adCompleted && !previewLocked && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/35 z-25 pointer-events-none">
          <Loader2 className="w-12 h-12 text-red-600 animate-spin" />
        </div>
      )}

      {/* Ad Overlay */}
      {!adCompleted && !isPremiumUser && (
        <AdBanner onComplete={handleAdComplete} />
      )}

      {/* Lock Overlay */}
      {previewLocked && (
        <div className="absolute inset-0 bg-black/85 backdrop-blur-sm flex flex-col items-center justify-center text-center p-6 z-40 text-white space-y-4">
          <div className="w-16 h-16 bg-red-600 rounded-full flex items-center justify-center shadow-lg border border-red-500 animate-bounce">
            <Lock className="w-8 h-8" />
          </div>
          <div className="space-y-2 max-w-md">
            <div className="flex items-center justify-center gap-1.5 text-yellow-500 font-extrabold text-sm uppercase">
              <Sparkles className="w-4 h-4 fill-yellow-500 animate-pulse" />
              <span>Premium Video</span>
            </div>
            <h3 className="text-xl font-bold">60-Second Free Preview Ended</h3>
            <p className="text-sm text-gray-300">
              This is a Premium video. Upgrade your subscription to watch the full video, unlock high daily download limits, and enjoy ad-free viewing.
            </p>
          </div>
          <Button
            onClick={() => setUpgradeOpen(true)}
            className="bg-red-600 hover:bg-red-700 text-white font-extrabold px-8 py-3 rounded-full text-sm transform hover:scale-105 transition-transform"
          >
            Upgrade Subscription
          </Button>
        </div>
      )}

      {/* Custom Controls Bar overlay */}
      {adCompleted && !previewLocked && (
        <div
          className={`absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/90 via-black/50 to-transparent p-4 flex flex-col gap-3 z-30 transition-all duration-300 transform ${
            showControls ? "opacity-100 translate-y-0" : "opacity-0 translate-y-2 pointer-events-none"
          }`}
        >
          {/* Seek progress Slider */}
          <div className="w-full flex items-center gap-3">
            <span className="text-xs font-mono text-gray-300">
              {formatTime(currentTime)}
            </span>
            <div className="relative flex-1 group/slider h-4 flex items-center">
              <input
                type="range"
                min={0}
                max={duration || 100}
                value={currentTime}
                onChange={handleSeekChange}
                className="w-full h-1 bg-white/20 rounded-lg appearance-none cursor-pointer accent-red-600 focus:outline-none group-hover/slider:h-1.5 transition-all"
                style={{
                  background: `linear-gradient(to right, #dc2626 0%, #dc2626 ${(currentTime / (duration || 1)) * 100}%, rgba(255,255,255,0.2) ${(currentTime / (duration || 1)) * 100}%, rgba(255,255,255,0.2) 100%)`,
                }}
              />
            </div>
            <span className="text-xs font-mono text-gray-300">
              {formatTime(duration)}
            </span>
          </div>

          {/* Action Row */}
          <div className="flex items-center justify-between">
            {/* Left Hand Controls */}
            <div className="flex items-center gap-3">
              {/* Play / Pause Toggle */}
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={togglePlay}
                className="text-white hover:bg-white/10 h-9 w-9 rounded-full"
              >
                {isPlaying ? (
                  <Pause className="w-5 h-5 fill-white" />
                ) : (
                  <Play className="w-5 h-5 fill-white" />
                )}
              </Button>

              {/* Rewind 10s */}
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={() => skipTime(-10)}
                className="text-white hover:bg-white/10 h-9 w-9 rounded-full"
                title="Rewind 10s"
              >
                <RotateCcw className="w-5 h-5" />
              </Button>

              {/* Fast Forward 10s */}
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={() => skipTime(10)}
                className="text-white hover:bg-white/10 h-9 w-9 rounded-full"
                title="Forward 10s"
              >
                <RotateCw className="w-5 h-5" />
              </Button>

              {/* Volume Slider Section */}
              <div className="flex items-center gap-1 group/volume">
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={toggleMute}
                  className="text-white hover:bg-white/10 h-9 w-9 rounded-full"
                >
                  {isMuted || volume === 0 ? (
                    <VolumeX className="w-5 h-5" />
                  ) : (
                    <Volume2 className="w-5 h-5" />
                  )}
                </Button>
                <input
                  type="range"
                  min={0}
                  max={1}
                  step={0.05}
                  value={isMuted ? 0 : volume}
                  onChange={handleVolumeChange}
                  className="w-0 group-hover/volume:w-16 h-1 bg-white/30 rounded-lg appearance-none cursor-pointer accent-white transition-all duration-300"
                />
              </div>
            </div>

            {/* Right Hand Controls */}
            <div className="flex items-center gap-3">
              {/* Next Video Option */}
              {hasNext && (
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={onNext}
                  className="text-white hover:bg-white/10 h-9 w-9 rounded-full"
                  title={`Play Next: ${nextVideoTitle}`}
                >
                  <SkipForward className="w-5 h-5 fill-white" />
                </Button>
              )}

              {/* Full Screen Mode */}
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={toggleFullscreen}
                className="text-white hover:bg-white/10 h-9 w-9 rounded-full"
                title={isFullscreen ? "Exit Fullscreen" : "Fullscreen"}
              >
                {isFullscreen ? (
                  <Minimize className="w-5 h-5" />
                ) : (
                  <Maximize className="w-5 h-5" />
                )}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Upgrade modal triggered from Lock screen */}
      <UpgradeModal isOpen={upgradeOpen} onClose={() => setUpgradeOpen(false)} />
    </div>
  );
}
