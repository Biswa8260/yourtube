"use client";

import React, { useEffect, useRef, useState, FormEvent } from "react";
import {
  Mic,
  MicOff,
  Video,
  VideoOff,
  Monitor,
  PhoneOff,
  Users,
  Send,
  Copy,
  Check,
  Disc,
  MessageSquare,
  Sparkles,
} from "lucide-react";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { useUser } from "@/lib/AuthContext";
import { toast } from "sonner";

interface WatchPartyPanelProps {
  partyId: string;
  onLeave: () => void;
}

interface ChatMessage {
  id: string;
  sender: string;
  text: string;
  time: string;
  isSelf: boolean;
}

export default function WatchPartyPanel({ partyId, onLeave }: WatchPartyPanelProps) {
  const { user } = useUser();
  const [copied, setCopied] = useState(false);
  const [activeTab, setActiveTab] = useState<"chat" | "participants">("chat");

  // Call settings
  const [cameraActive, setCameraActive] = useState(true);
  const [micActive, setMicActive] = useState(true);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [isRecording, setIsRecording] = useState(false);

  // Streams
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const screenStreamRef = useRef<MediaStream | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);

  // Chat message logs
  const [chatMessage, setChatMessage] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: "1",
      sender: "Sarah",
      text: "Hey! Glad to join the watch party! 🎉",
      time: "10:42 AM",
      isSelf: false,
    },
    {
      id: "2",
      sender: "Alex",
      text: "Awesome video choice. The quality is smooth.",
      time: "10:43 AM",
      isSelf: false,
    },
  ]);

  // Request webcam & mic permissions on mount
  useEffect(() => {
    const initializeMedia = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: true,
          audio: true,
        });
        setLocalStream(stream);
        if (localVideoRef.current) {
          localVideoRef.current.srcObject = stream;
        }
      } catch (error) {
        console.error("Webcam media access error:", error);
        toast.error("Could not access camera/microphone. Using placeholder layout.");
        setCameraActive(false);
      }
    };
    initializeMedia();

    return () => {
      // Cleanup tracks on unmount
      if (localStream) {
        localStream.getTracks().forEach((track) => track.stop());
      }
      if (screenStreamRef.current) {
        screenStreamRef.current.getTracks().forEach((track) => track.stop());
      }
    };
  }, []);

  const handleCopyLink = () => {
    if (typeof window === "undefined") return;
    const inviteLink = `${window.location.origin}${window.location.pathname}?partyId=${partyId}`;
    navigator.clipboard.writeText(inviteLink);
    setCopied(true);
    toast.success("Watch Party invite link copied!");
    setTimeout(() => setCopied(false), 2000);
  };

  // Toggle Camera
  const toggleCamera = () => {
    if (localStream) {
      const videoTrack = localStream.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = !videoTrack.enabled;
        setCameraActive(videoTrack.enabled);
      }
    } else {
      setCameraActive(!cameraActive);
    }
  };

  // Toggle Mic
  const toggleMic = () => {
    if (localStream) {
      const audioTrack = localStream.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        setMicActive(audioTrack.enabled);
      }
    } else {
      setMicActive(!micActive);
    }
  };

  // Screen Share Toggle
  const toggleScreenShare = async () => {
    if (isScreenSharing) {
      stopScreenShare();
    } else {
      try {
        const stream = await navigator.mediaDevices.getDisplayMedia({ video: true });
        screenStreamRef.current = stream;
        setIsScreenSharing(true);

        if (localVideoRef.current) {
          localVideoRef.current.srcObject = stream;
        }

        stream.getVideoTracks()[0].onended = () => {
          stopScreenShare();
        };

        toast.success("Screen sharing started.");
      } catch (err) {
        console.error("Screen share error:", err);
        toast.error("Screen sharing failed to launch.");
      }
    }
  };

  const stopScreenShare = () => {
    if (screenStreamRef.current) {
      screenStreamRef.current.getTracks().forEach((track) => track.stop());
      screenStreamRef.current = null;
    }
    setIsScreenSharing(false);
    if (localVideoRef.current && localStream) {
      localVideoRef.current.srcObject = localStream;
    }
  };

  // Session Recording using MediaRecorder API
  const handleRecording = () => {
    if (isRecording) {
      if (mediaRecorderRef.current) {
        mediaRecorderRef.current.stop();
        setIsRecording(false);
      }
    } else {
      const streamToRecord = screenStreamRef.current || localStream;
      if (!streamToRecord) {
        toast.error("No camera or screen capture stream to record.");
        return;
      }

      const chunks: Blob[] = [];
      try {
        const recorder = new MediaRecorder(streamToRecord, { mimeType: "video/webm" });
        recorder.ondataavailable = (e) => {
          if (e.data.size > 0) chunks.push(e.data);
        };
        recorder.onstop = () => {
          const blob = new Blob(chunks, { type: "video/webm" });
          const url = URL.createObjectURL(blob);
          const a = document.createElement("a");
          a.href = url;
          a.download = `party_session_${partyId}.webm`;
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          URL.revokeObjectURL(url);
          toast.success("Session recording compiled & downloaded successfully!");
        };
        recorder.start();
        mediaRecorderRef.current = recorder;
        setIsRecording(true);
        toast.success("Recording started. The file will download when stopped.");
      } catch (err) {
        console.error("Recording error:", err);
        toast.error("Failed to start session recording.");
      }
    }
  };

  const handleSendChat = (e: FormEvent) => {
    e.preventDefault();
    if (!chatMessage.trim()) return;

    const newMsg: ChatMessage = {
      id: Date.now().toString(),
      sender: user?.name || "You",
      text: chatMessage.trim(),
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      isSelf: true,
    };

    setMessages((prev) => [...prev, newMsg]);
    setChatMessage("");

    // Simulate mock friends responding in real-time
    const mockResponses = [
      "Sarah: Totally agree with that! 😮",
      "Alex: That quality is super sharp.",
      "David: Watch this next part guys, it gets crazy!",
      "Sarah: Let's turn up the volume! 🎧",
    ];

    setTimeout(() => {
      const randomResponse = mockResponses[Math.floor(Math.random() * mockResponses.length)];
      const parts = randomResponse.split(": ");
      const friendMsg: ChatMessage = {
        id: (Date.now() + 1).toString(),
        sender: parts[0],
        text: parts[1],
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        isSelf: false,
      };
      setMessages((prev) => [...prev, friendMsg]);
    }, 1500);
  };

  const handleLeaveCall = () => {
    if (localStream) {
      localStream.getTracks().forEach((track) => track.stop());
    }
    if (screenStreamRef.current) {
      screenStreamRef.current.getTracks().forEach((track) => track.stop());
    }
    toast.info("Left the Watch Party.");
    onLeave();
  };

  return (
    <div className="bg-[#18181b] text-white border border-[#27272a] rounded-xl overflow-hidden shadow-2xl flex flex-col max-h-[550px] min-h-[500px]">
      {/* Title Header */}
      <div className="bg-[#27272a] p-3 flex items-center justify-between border-b border-[#3f3f46]">
        <div className="flex items-center gap-2">
          <div className="w-2.5 h-2.5 bg-red-500 rounded-full animate-ping" />
          <span className="font-extrabold text-sm uppercase tracking-wider flex items-center gap-1.5">
            <Sparkles className="w-4 h-4 text-red-500 fill-red-500" />
            Watch Party Live
          </span>
        </div>
        <Button
          onClick={handleLeaveCall}
          variant="destructive"
          size="sm"
          className="bg-red-600 hover:bg-red-700 text-xs px-3 h-8 flex items-center gap-1.5 font-bold rounded-lg"
        >
          <PhoneOff className="w-3.5 h-3.5" />
          Leave Call
        </Button>
      </div>

      {/* Grid of User Webcams & Streams */}
      <div className="grid grid-cols-2 gap-2 p-3 bg-black/45">
        {/* Local Stream (Host) */}
        <div className="relative aspect-video bg-[#27272a] border border-[#3f3f46] rounded-lg overflow-hidden flex items-center justify-center">
          {cameraActive ? (
            <video
              ref={localVideoRef}
              autoPlay
              playsInline
              muted
              className="w-full h-full object-cover transform -scale-x-100"
            />
          ) : (
            <div className="flex flex-col items-center justify-center space-y-1">
              <div className="w-10 h-10 bg-red-600 rounded-full flex items-center justify-center text-sm font-extrabold shadow-md uppercase">
                {user?.name?.[0] || "U"}
              </div>
              <span className="text-[10px] text-gray-400 font-semibold">{user?.name || "You"} (Cam Off)</span>
            </div>
          )}
          <span className="absolute bottom-1.5 left-2 bg-black/60 backdrop-blur-xs px-2 py-0.5 rounded-md text-[10px] font-bold text-white flex items-center gap-1 border border-white/10">
            {isScreenSharing ? <Monitor className="w-3 h-3 text-red-500" /> : <Users className="w-3 h-3 text-green-500" />}
            {user?.name || "You"}
          </span>
          {!micActive && (
            <span className="absolute top-1.5 right-2 bg-red-600/90 p-1 rounded-full text-white">
              <MicOff className="w-3 h-3" />
            </span>
          )}
        </div>

        {/* Mock Participant: Sarah */}
        <div className="relative aspect-video bg-[#27272a] border border-[#3f3f46] rounded-lg overflow-hidden flex items-center justify-center">
          <div className="flex flex-col items-center justify-center space-y-1">
            <div className="w-10 h-10 bg-indigo-600 rounded-full flex items-center justify-center text-sm font-extrabold shadow-md">
              S
            </div>
            <span className="text-[10px] text-gray-400 font-semibold">Sarah (Muted)</span>
          </div>
          <span className="absolute bottom-1.5 left-2 bg-black/60 backdrop-blur-xs px-2 py-0.5 rounded-md text-[10px] font-bold text-white">
            Sarah
          </span>
          <span className="absolute top-1.5 right-2 bg-red-600/90 p-1 rounded-full text-white">
            <MicOff className="w-3 h-3" />
          </span>
        </div>

        {/* Mock Participant: Alex */}
        <div className="relative aspect-video bg-[#27272a] border border-[#3f3f46] rounded-lg overflow-hidden flex items-center justify-center">
          <div className="flex flex-col items-center justify-center space-y-1 animate-pulse">
            <div className="w-10 h-10 bg-amber-600 rounded-full flex items-center justify-center text-sm font-extrabold shadow-md">
              A
            </div>
            <span className="text-[10px] text-gray-400 font-semibold">Alex Speaking...</span>
          </div>
          <span className="absolute bottom-1.5 left-2 bg-black/60 backdrop-blur-xs px-2 py-0.5 rounded-md text-[10px] font-bold text-white">
            Alex
          </span>
        </div>

        {/* Mock Participant: David */}
        <div className="relative aspect-video bg-[#27272a] border border-[#3f3f46] rounded-lg overflow-hidden flex items-center justify-center">
          <div className="flex flex-col items-center justify-center space-y-1">
            <div className="w-10 h-10 bg-emerald-600 rounded-full flex items-center justify-center text-sm font-extrabold shadow-md">
              D
            </div>
            <span className="text-[10px] text-gray-400 font-semibold">David (Cam Off)</span>
          </div>
          <span className="absolute bottom-1.5 left-2 bg-black/60 backdrop-blur-xs px-2 py-0.5 rounded-md text-[10px] font-bold text-white">
            David
          </span>
        </div>
      </div>

      {/* Call Media Controllers */}
      <div className="flex justify-between items-center bg-[#27272a] px-3 py-2 border-y border-[#3f3f46]">
        <div className="flex gap-2">
          {/* Audio Switcher */}
          <Button
            onClick={toggleMic}
            variant="ghost"
            size="icon"
            className={`w-9 h-9 rounded-lg hover:bg-white/10 ${!micActive ? "bg-red-600/25 text-red-500 border border-red-500/30" : "text-white"}`}
            title={micActive ? "Mute Microphone" : "Unmute Microphone"}
          >
            {micActive ? <Mic className="w-4 h-4" /> : <MicOff className="w-4 h-4" />}
          </Button>

          {/* Camera Switcher */}
          <Button
            onClick={toggleCamera}
            variant="ghost"
            size="icon"
            className={`w-9 h-9 rounded-lg hover:bg-white/10 ${!cameraActive ? "bg-red-600/25 text-red-500 border border-red-500/30" : "text-white"}`}
            title={cameraActive ? "Turn Off Camera" : "Turn On Camera"}
          >
            {cameraActive ? <Video className="w-4 h-4" /> : <VideoOff className="w-4 h-4" />}
          </Button>

          {/* Screen Share Switcher */}
          <Button
            onClick={toggleScreenShare}
            variant="ghost"
            size="icon"
            className={`w-9 h-9 rounded-lg hover:bg-white/10 ${isScreenSharing ? "bg-red-600/25 text-red-500 border border-red-500/30" : "text-white"}`}
            title={isScreenSharing ? "Stop Screen Share" : "Share Screen"}
          >
            <Monitor className="w-4 h-4" />
          </Button>
        </div>

        <div className="flex gap-2">
          {/* Media Recorder */}
          <Button
            onClick={handleRecording}
            variant="ghost"
            size="icon"
            className={`w-9 h-9 rounded-lg hover:bg-white/10 ${isRecording ? "bg-red-600/25 text-red-500 border border-red-500/30 animate-pulse" : "text-white"}`}
            title={isRecording ? "Stop Recording" : "Record Watch Party"}
          >
            <Disc className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Copy Invite Link block */}
      <div className="p-3 bg-[#18181b] border-b border-[#27272a] flex items-center justify-between gap-2 text-xs">
        <span className="text-gray-400 select-none font-semibold uppercase tracking-wider text-[10px]">Invite link:</span>
        <div className="flex-1 bg-black/40 px-2 py-1.5 rounded-lg border border-[#27272a] truncate font-mono text-[10px] text-gray-300">
          {partyId}
        </div>
        <Button
          onClick={handleCopyLink}
          size="sm"
          variant="outline"
          className="bg-black/50 text-[10px] px-2 h-7 flex items-center gap-1 border border-[#3f3f46] hover:bg-white/10 font-bold"
        >
          {copied ? <Check className="w-3.5 h-3.5 text-green-500" /> : <Copy className="w-3.5 h-3.5" />}
          {copied ? "Copied" : "Copy"}
        </Button>
      </div>

      {/* Navigation tabs: Live Chat / Participants */}
      <div className="flex bg-[#27272a] text-xs font-bold border-b border-[#3f3f46]">
        <button
          onClick={() => setActiveTab("chat")}
          className={`flex-1 py-2 flex items-center justify-center gap-1.5 ${activeTab === "chat" ? "bg-[#18181b] text-red-500 border-b-2 border-red-500" : "text-gray-400 hover:text-white"}`}
        >
          <MessageSquare className="w-3.5 h-3.5" />
          Live Chat ({messages.length})
        </button>
        <button
          onClick={() => setActiveTab("participants")}
          className={`flex-1 py-2 flex items-center justify-center gap-1.5 ${activeTab === "participants" ? "bg-[#18181b] text-red-500 border-b-2 border-red-500" : "text-gray-400 hover:text-white"}`}
        >
          <Users className="w-3.5 h-3.5" />
          Participants (4)
        </button>
      </div>

      {/* Tab Panels */}
      <div className="flex-1 overflow-y-auto p-3 space-y-3 bg-black/20 flex flex-col justify-between">
        {activeTab === "chat" ? (
          <>
            {/* Messages Log list */}
            <div className="flex-1 overflow-y-auto space-y-3 pr-1 max-h-[180px]">
              {messages.map((msg) => (
                <div key={msg.id} className="text-xs">
                  <div className="flex justify-between items-baseline mb-0.5">
                    <span className={`font-bold ${msg.isSelf ? "text-red-400" : "text-gray-300"}`}>
                      {msg.sender}
                    </span>
                    <span className="text-[9px] text-gray-500">{msg.time}</span>
                  </div>
                  <p className="bg-[#27272a]/60 px-2.5 py-1.5 rounded-lg border border-[#27272a] inline-block max-w-[90%] text-gray-200">
                    {msg.text}
                  </p>
                </div>
              ))}
            </div>

            {/* Chat Send Input Box */}
            <form onSubmit={handleSendChat} className="flex gap-2 pt-2 border-t border-[#27272a] mt-2">
              <Input
                placeholder="Type a message..."
                value={chatMessage}
                onChange={(e) => setChatMessage(e.target.value)}
                className="bg-black/50 text-white text-xs border border-[#27272a] focus-visible:ring-red-500 h-9"
              />
              <Button type="submit" size="icon" className="bg-red-600 hover:bg-red-700 h-9 w-9 shrink-0">
                <Send className="w-4 h-4 fill-white" />
              </Button>
            </form>
          </>
        ) : (
          /* Participants List */
          <div className="space-y-2.5 flex-1 max-h-[220px] overflow-y-auto">
            {/* Host */}
            <div className="flex items-center justify-between text-xs p-2 bg-[#27272a]/40 border border-[#27272a] rounded-lg">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 bg-red-600 rounded-full flex items-center justify-center font-bold">
                  {user?.name?.[0] || "U"}
                </div>
                <div>
                  <div className="font-bold flex items-center gap-1.5">
                    {user?.name || "You"}
                    <span className="text-[9px] bg-red-500/20 text-red-500 border border-red-500/30 px-1 py-0.2 rounded font-extrabold uppercase">Host</span>
                  </div>
                  <div className="text-[9.5px] text-gray-400">Approved Location</div>
                </div>
              </div>
              <span className="text-[10px] text-green-500 font-semibold uppercase">Active</span>
            </div>

            {/* Sarah */}
            <div className="flex items-center justify-between text-xs p-2 bg-[#27272a]/40 border border-[#27272a] rounded-lg">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 bg-indigo-600 rounded-full flex items-center justify-center font-bold">S</div>
                <div>
                  <div className="font-bold">Sarah</div>
                  <div className="text-[9.5px] text-gray-400">Co-watcher</div>
                </div>
              </div>
              <span className="text-[10px] text-green-400 font-semibold">Muted</span>
            </div>

            {/* Alex */}
            <div className="flex items-center justify-between text-xs p-2 bg-[#27272a]/40 border border-[#27272a] rounded-lg">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 bg-amber-600 rounded-full flex items-center justify-center font-bold">A</div>
                <div>
                  <div className="font-bold">Alex</div>
                  <div className="text-[9.5px] text-gray-400">Co-watcher</div>
                </div>
              </div>
              <span className="text-[10px] text-green-500 font-semibold">Speaking</span>
            </div>

            {/* David */}
            <div className="flex items-center justify-between text-xs p-2 bg-[#27272a]/40 border border-[#27272a] rounded-lg">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 bg-emerald-600 rounded-full flex items-center justify-center font-bold">D</div>
                <div>
                  <div className="font-bold">David</div>
                  <div className="text-[9.5px] text-gray-400">Co-watcher</div>
                </div>
              </div>
              <span className="text-[10px] text-gray-500 font-semibold">Cam Off</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
