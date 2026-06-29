"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { formatDistanceToNow } from "date-fns";
import { Download as DownloadIcon, Play } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useUser } from "@/lib/AuthContext";
import axiosInstance from "@/lib/axiosinstance";

export default function DownloadsContent() {
  const [downloads, setDownloads] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useUser();

  useEffect(() => {
    if (user) {
      loadDownloads();
    } else {
      setLoading(false);
    }
  }, [user]);

  const loadDownloads = async () => {
    if (!user) return;
    try {
      const response = await axiosInstance.get(`/video/downloads/${user._id || user.id}`);
      setDownloads(response.data);
    } catch (error) {
      console.error("Error loading downloads:", error);
    } finally {
      setLoading(false);
    }
  };

  if (!user) {
    return (
      <div className="text-center py-12">
        <DownloadIcon className="w-16 h-16 mx-auto text-gray-400 mb-4" />
        <h2 className="text-xl font-semibold mb-2">Keep track of your downloads</h2>
        <p className="text-gray-600">Sign in to view your downloaded videos.</p>
      </div>
    );
  }

  if (loading) {
    return <div className="text-center py-12">Loading downloads...</div>;
  }

  if (downloads.length === 0) {
    return (
      <div className="text-center py-12">
        <DownloadIcon className="w-16 h-16 mx-auto text-gray-400 mb-4 animate-bounce" />
        <h2 className="text-xl font-semibold mb-2">No downloads yet</h2>
        <p className="text-gray-600">Videos you download will appear here.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <p className="text-sm text-gray-600 font-medium">
          {downloads.length} {downloads.length === 1 ? "video" : "videos"} downloaded
        </p>
      </div>

      <div className="space-y-4">
        {downloads.map((item) => {
          if (!item.videoid) return null;
          return (
            <div key={item._id} className="flex gap-4 group bg-gray-50/50 p-3 rounded-lg border hover:bg-gray-50 transition-colors">
              <Link href={`/watch/${item.videoid._id}`} className="flex-shrink-0">
                <div className="relative w-40 aspect-video bg-gray-100 rounded overflow-hidden">
                  <video
                    src={`${process.env.BACKEND_URL}/${item.videoid.filepath.replace(/\\/g, "/")}`}
                    className="pointer-events-none object-cover group-hover:scale-105 transition-transform duration-200 w-full h-full"
                  />
                  <div className="absolute inset-0 bg-black/10 group-hover:bg-black/30 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                    <Play className="w-8 h-8 text-white fill-white" />
                  </div>
                </div>
              </Link>

              <div className="flex-1 min-w-0 flex flex-col justify-between">
                <div>
                  <Link href={`/watch/${item.videoid._id}`}>
                    <h3 className="font-semibold text-sm line-clamp-2 group-hover:text-red-600 transition-colors mb-1">
                      {item.videoid.videotitle}
                    </h3>
                  </Link>
                  <p className="text-xs text-gray-500 font-medium mb-1">
                    {item.videoid.videochanel}
                  </p>
                  <p className="text-xs text-gray-500">
                    {item.videoid.views.toLocaleString()} views
                  </p>
                </div>
                
                <div className="flex flex-wrap items-center gap-2 mt-2">
                  <span className="text-xs px-2 py-0.5 bg-gray-100 border text-gray-600 rounded-full">
                    Downloaded {formatDistanceToNow(new Date(item.downloadDate))} ago
                  </span>
                  <span className="text-xs px-2 py-0.5 bg-red-50 border border-red-200 text-red-600 rounded-full font-medium">
                    Plan at download: {item.userPlan}
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
