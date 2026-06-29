import Comments from "@/components/Comments";
import RelatedVideos from "@/components/RelatedVideos";
import VideoInfo from "@/components/VideoInfo";
import Videopplayer from "@/components/Videopplayer";
import WatchPartyPanel from "@/components/WatchPartyPanel";
import axiosInstance from "@/lib/axiosinstance";
import { notFound } from "next/navigation";
import { useRouter } from "next/router";
import React, { useEffect, useMemo, useState } from "react";

const index = () => {
  const router = useRouter();
  const { id } = router.query;
  const [videos, setvideo] = useState<any>(null);
  const [video, setvide] = useState<any>(null);
  const [loading, setloading] = useState(true);
  const [partyId, setPartyId] = useState<string | null>(null);

  useEffect(() => {
    const fetchvideo = async () => {
      if (!id || typeof id !== "string") return;
      try {
        const res = await axiosInstance.get("/video/getall");
        const video = res.data?.filter((vid: any) => vid._id === id);
        setvideo(video[0]);
        setvide(res.data);
      } catch (error) {
        console.log(error);
      } finally {
        setloading(false);
      }
    };
    fetchvideo();
  }, [id]);

  useEffect(() => {
    if (router.query.partyId && typeof router.query.partyId === "string") {
      setPartyId(router.query.partyId);
    }
  }, [router.query.partyId]);

  const nextVideo = useMemo(() => {
    if (!video || !videos) return null;
    const currentIndex = video.findIndex((v: any) => v._id === videos._id);
    if (currentIndex !== -1 && currentIndex + 1 < video.length) {
      return video[currentIndex + 1];
    }
    return video[0] && video[0]._id !== videos._id ? video[0] : null;
  }, [video, videos]);

  const playNextVideo = () => {
    if (nextVideo) {
      router.push(`/watch/${nextVideo._id}`);
    }
  };

  const startParty = () => {
    const newId = Math.random().toString(36).substring(2, 11);
    setPartyId(newId);
    router.replace({
      pathname: router.pathname,
      query: { ...router.query, partyId: newId }
    }, undefined, { shallow: true });
  };

  const endParty = () => {
    setPartyId(null);
    const newQuery = { ...router.query };
    delete newQuery.partyId;
    router.replace({
      pathname: router.pathname,
      query: newQuery
    }, undefined, { shallow: true });
  };

  if (loading) {
    return <div>Loading..</div>;
  }
  
  if (!videos) {
    return <div>Video not found</div>;
  }
  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-7xl mx-auto p-4">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-4">
            <Videopplayer
              video={videos}
              onNext={playNextVideo}
              hasNext={!!nextVideo}
              nextVideoTitle={nextVideo?.videotitle}
            />
            <VideoInfo
              video={videos}
              onStartParty={startParty}
              isPartyActive={!!partyId}
            />
            <Comments videoId={id} />
          </div>
          <div className="space-y-4">
            {partyId && (
              <WatchPartyPanel partyId={partyId} onLeave={endParty} />
            )}
            <RelatedVideos videos={video} />
          </div>
        </div>
      </div>
    </div>
  );
};

export default index;
