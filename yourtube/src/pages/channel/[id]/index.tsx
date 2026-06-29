import ChannelHeader from "@/components/ChannelHeader";
import Channeltabs from "@/components/Channeltabs";
import ChannelVideos from "@/components/ChannelVideos";
import VideoUploader from "@/components/VideoUploader";
import DownloadsContent from "@/components/DownloadsContent";
import { useUser } from "@/lib/AuthContext";
import { useRouter } from "next/router";
import React, { useEffect, useState } from "react";
import axiosInstance from "@/lib/axiosinstance";

const index = () => {
  const router = useRouter();
  const { id } = router.query;
  const { user } = useUser();
  const [allVideos, setAllVideos] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("videos");

  useEffect(() => {
    const fetchVideos = async () => {
      try {
        const res = await axiosInstance.get("/video/getall");
        setAllVideos(res.data || []);
      } catch (err) {
        console.error("Error fetching channel videos:", err);
      } finally {
        setLoading(false);
      }
    };
    if (id) {
      fetchVideos();
    }
  }, [id]);

  const channelVideos = allVideos.filter((vid: any) => vid.uploader === id);
  const isOwnChannel = user && (user._id === id || user.id === id);

  const channel = isOwnChannel
    ? user
    : {
        _id: id,
        channelname: channelVideos[0]?.videochanel || "Channel Name",
        description: "Welcome to my channel!",
        image: "https://github.com/shadcn.png",
      };

  if (loading) {
    return <div className="p-6 text-center">Loading channel...</div>;
  }

  return (
    <div className="flex-1 min-h-screen bg-white">
      <div className="max-w-full mx-auto">
        <ChannelHeader channel={channel} user={user} />
        <Channeltabs
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          isOwnChannel={isOwnChannel}
        />

        <div className="px-4 py-6">
          {activeTab === "videos" && (
            <>
              {isOwnChannel && (
                <div className="mb-8">
                  <VideoUploader channelId={id} channelName={channel?.channelname} />
                </div>
              )}
              <ChannelVideos videos={channelVideos} />
            </>
          )}

          {activeTab === "downloads" && isOwnChannel && (
            <DownloadsContent />
          )}

          {activeTab === "about" && (
            <div className="bg-gray-50 rounded-lg p-6 border max-w-4xl">
              <h3 className="font-semibold text-lg mb-3">About</h3>
              <p className="text-gray-700 text-sm whitespace-pre-wrap leading-relaxed">
                {channel?.description || "No description provided."}
              </p>
              <div className="mt-6 pt-4 border-t text-xs text-gray-500 font-medium">
                Joined {channel?.joinedon ? new Date(channel.joinedon).toLocaleDateString() : "recently"}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default index;
