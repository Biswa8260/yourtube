import React, { useEffect, useState } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar";
import { Textarea } from "./ui/textarea";
import { Button } from "./ui/button";
import { formatDistanceToNow } from "date-fns";
import { useUser } from "@/lib/AuthContext";
import axiosInstance from "@/lib/axiosinstance";
import { ThumbsUp, ThumbsDown, Flag, AlertTriangle, Globe } from "lucide-react";
import { toast } from "sonner";

interface Comment {
  _id: string;
  videoid: string;
  userid: string;
  commentbody: string;
  usercommented: string;
  commentedon: string;
  likes?: string[];
  dislikes?: string[];
  reports?: string[];
  isFlagged?: boolean;
  location?: string;
  showLocation?: boolean;
}

const Comments = ({ videoId }: any) => {
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editingCommentId, setEditingCommentId] = useState<string | null>(null);
  const [editText, setEditText] = useState("");
  const { user } = useUser();
  const [loading, setLoading] = useState(true);

  // New States
  const [includeLocation, setIncludeLocation] = useState(false);
  const [detectedLocation, setDetectedLocation] = useState("");
  const [fetchingLocation, setFetchingLocation] = useState(false);
  const [revealedFlaggedComments, setRevealedFlaggedComments] = useState<{ [commentId: string]: boolean }>({});
  const [translatedText, setTranslatedText] = useState<{ [commentId: string]: string }>({});
  const [translatingId, setTranslatingId] = useState<string | null>(null);

  useEffect(() => {
    loadComments();
  }, [videoId]);

  const loadComments = async () => {
    try {
      const res = await axiosInstance.get(`/comment/${videoId}`);
      setComments(res.data);
    } catch (error) {
      console.log(error);
    } finally {
      setLoading(false);
    }
  };

  const fetchCoarseLocation = async () => {
    setFetchingLocation(true);
    try {
      const res = await fetch("https://ipapi.co/json/");
      const data = await res.json();
      if (data && data.country_name) {
        setDetectedLocation(data.country_name);
      } else {
        setDetectedLocation("Unknown Region");
      }
    } catch (error) {
      console.error("Error fetching location:", error);
      setDetectedLocation("Unknown Region");
    } finally {
      setFetchingLocation(false);
    }
  };

  const handleSubmitComment = async () => {
    if (!user || !newComment.trim()) return;

    setIsSubmitting(true);
    try {
      const payload = {
        videoid: videoId,
        userid: user._id,
        commentbody: newComment,
        usercommented: user.name,
        location: includeLocation ? detectedLocation : "",
        showLocation: includeLocation,
      };

      const res = await axiosInstance.post("/comment/postcomment", payload);
      
      if (res.data.comment) {
        toast.success("Comment posted successfully!");
        await loadComments();
        setNewComment("");
        setIncludeLocation(false);
      }
    } catch (error: any) {
      console.error("Error adding comment:", error);
      const errMsg = error.response?.data?.message || "Error posting comment. Please try again.";
      toast.error(errMsg);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEdit = (comment: Comment) => {
    setEditingCommentId(comment._id);
    setEditText(comment.commentbody);
  };

  const handleUpdateComment = async () => {
    if (!editText.trim()) return;
    try {
      const res = await axiosInstance.post(
        `/comment/editcomment/${editingCommentId}`,
        { commentbody: editText }
      );
      if (res.data) {
        toast.success("Comment updated!");
        setComments((prev) =>
          prev.map((c) =>
            c._id === editingCommentId ? { ...c, commentbody: editText } : c
          )
        );
        setEditingCommentId(null);
        setEditText("");
      }
    } catch (error: any) {
      const errMsg = error.response?.data?.message || "Error updating comment.";
      toast.error(errMsg);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const res = await axiosInstance.delete(`/comment/deletecomment/${id}`);
      if (res.data.comment) {
        toast.success("Comment deleted.");
        setComments((prev) => prev.filter((c) => c._id !== id));
      }
    } catch (error) {
      console.log(error);
      toast.error("Error deleting comment.");
    }
  };

  const handleLike = async (commentId: string) => {
    if (!user) {
      toast.error("Please sign in to like comments.");
      return;
    }
    try {
      const res = await axiosInstance.post(`/comment/like/${commentId}`, { userid: user._id });
      setComments(prev => prev.map(c => c._id === commentId ? {
        ...c,
        likes: res.data.likes,
        dislikes: res.data.dislikes
      } : c));
    } catch (error) {
      console.error("Error liking comment:", error);
    }
  };

  const handleDislike = async (commentId: string) => {
    if (!user) {
      toast.error("Please sign in to dislike comments.");
      return;
    }
    try {
      const res = await axiosInstance.post(`/comment/dislike/${commentId}`, { userid: user._id });
      setComments(prev => prev.map(c => c._id === commentId ? {
        ...c,
        likes: res.data.likes,
        dislikes: res.data.dislikes
      } : c));
    } catch (error) {
      console.error("Error disliking comment:", error);
    }
  };

  const handleReport = async (commentId: string) => {
    if (!user) {
      toast.error("Please sign in to report comments.");
      return;
    }
    try {
      const res = await axiosInstance.post(`/comment/report/${commentId}`, { userid: user._id });
      toast.success("Thank you. This comment has been flagged for review.");
      setComments(prev => prev.map(c => c._id === commentId ? {
        ...c,
        reports: res.data.reports,
        isFlagged: res.data.isFlagged
      } : c));
    } catch (error) {
      console.error("Error reporting comment:", error);
    }
  };

  const handleTranslate = async (commentId: string, text: string, targetLang: string) => {
    setTranslatingId(commentId);
    try {
      const res = await fetch(
        `https://api.mymemory.translated.net/get?q=${encodeURIComponent(text)}&langpair=Autodetect|${targetLang}`
      );
      const data = await res.json();
      if (data && data.responseData && data.responseData.translatedText) {
        setTranslatedText(prev => ({ ...prev, [commentId]: data.responseData.translatedText }));
      } else {
        toast.error("Translation API limit reached. Showing mock translation instead.");
        setTranslatedText(prev => ({ ...prev, [commentId]: `[Mock Translation to ${targetLang.toUpperCase()}]: ${text}` }));
      }
    } catch (error) {
      console.error("Translation error:", error);
      setTranslatedText(prev => ({ ...prev, [commentId]: `[Mock Translation]: ${text}` }));
    } finally {
      setTranslatingId(null);
    }
  };

  if (loading) {
    return <div className="py-4 text-center text-sm text-gray-500">Loading comments...</div>;
  }

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-semibold">{comments.length} Comments</h2>

      {user && (
        <div className="flex gap-4 bg-gray-50/50 p-4 rounded-xl border border-gray-100">
          <Avatar className="w-10 h-10 border border-gray-200 shadow-sm">
            <AvatarImage src={user.image || ""} />
            <AvatarFallback>{user.name?.[0] || "U"}</AvatarFallback>
          </Avatar>
          <div className="flex-1 space-y-3">
            <Textarea
              placeholder="Add a comment..."
              value={newComment}
              onChange={(e: any) => setNewComment(e.target.value)}
              className="min-h-[80px] resize-none border-0 border-b-2 border-gray-200 rounded-none focus-visible:ring-0 focus-visible:border-red-500 transition-colors p-2 text-sm bg-transparent"
            />
            <div className="flex items-center justify-between">
              <label className="flex items-center gap-2 text-xs text-gray-500 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={includeLocation}
                  onChange={(e) => {
                    setIncludeLocation(e.target.checked);
                    if (e.target.checked && !detectedLocation) {
                      fetchCoarseLocation();
                    }
                  }}
                  className="rounded border-gray-300 text-red-600 focus:ring-red-500"
                />
                <span>Include Coarse Location (Optional)</span>
                {fetchingLocation && <span className="text-[10px] text-gray-400 animate-pulse">Detecting...</span>}
                {!fetchingLocation && includeLocation && detectedLocation && (
                  <span className="text-[11px] font-semibold text-red-600 bg-red-50 px-1.5 py-0.5 rounded">
                    📍 {detectedLocation}
                  </span>
                )}
              </label>
              <div className="flex gap-2">
                <Button
                  variant="ghost"
                  onClick={() => {
                    setNewComment("");
                    setIncludeLocation(false);
                  }}
                  disabled={!newComment.trim()}
                  className="text-xs"
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleSubmitComment}
                  disabled={!newComment.trim() || isSubmitting}
                  className="bg-red-600 hover:bg-red-700 text-white text-xs font-semibold px-4 rounded-full"
                >
                  {isSubmitting ? "Posting..." : "Comment"}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="space-y-4">
        {comments.length === 0 ? (
          <p className="text-sm text-gray-500 italic">
            No comments yet. Be the first to comment!
          </p>
        ) : (
          comments.map((comment) => {
            const hasLiked = comment.likes?.includes(user?._id || "");
            const hasDisliked = comment.dislikes?.includes(user?._id || "");
            const isRevealed = revealedFlaggedComments[comment._id] || false;

            return (
              <div key={comment._id} className="flex gap-4 p-3 hover:bg-gray-50/80 rounded-lg transition-colors border border-transparent hover:border-gray-100">
                <Avatar className="w-10 h-10 border border-gray-100">
                  <AvatarImage src="/placeholder.svg?height=40&width=40" />
                  <AvatarFallback className="bg-red-50 text-red-700 font-semibold">{comment.usercommented?.[0] || "?"}</AvatarFallback>
                </Avatar>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <span className="font-semibold text-sm text-gray-800">
                      {comment.usercommented}
                    </span>
                    <span className="text-xs text-gray-500">
                      {formatDistanceToNow(new Date(comment.commentedon))} ago
                    </span>
                    {comment.showLocation && comment.location && (
                      <span className="text-[10px] font-medium text-gray-500 bg-gray-100 px-1.5 py-0.5 rounded flex items-center gap-0.5" title="Poster's Location">
                        📍 {comment.location}
                      </span>
                    )}
                  </div>

                  {/* Flagged / Reported message indicator */}
                  {comment.isFlagged && (
                    <div className="bg-amber-50 border border-amber-200/50 rounded-lg p-2.5 my-2 text-xs text-amber-800 flex items-center gap-2">
                      <AlertTriangle className="w-4 h-4 text-amber-600 flex-shrink-0" />
                      <span>This comment is flagged for review. Content may be sensitive.</span>
                      <button
                        onClick={() => setRevealedFlaggedComments(prev => ({ ...prev, [comment._id]: !isRevealed }))}
                        className="underline font-semibold ml-auto hover:text-amber-900"
                      >
                        {isRevealed ? "Hide" : "Show comment"}
                      </button>
                    </div>
                  )}

                  {editingCommentId === comment._id ? (
                    <div className="space-y-2 mt-2">
                      <Textarea
                        value={editText}
                        onChange={(e) => setEditText(e.target.value)}
                        className="text-sm"
                      />
                      <div className="flex gap-2 justify-end">
                        <Button
                          variant="ghost"
                          onClick={() => {
                            setEditingCommentId(null);
                            setEditText("");
                          }}
                          className="text-xs"
                        >
                          Cancel
                        </Button>
                        <Button
                          onClick={handleUpdateComment}
                          disabled={!editText.trim()}
                          className="bg-red-600 hover:bg-red-700 text-white text-xs font-semibold px-4"
                        >
                          Save
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <>
                      {(!comment.isFlagged || isRevealed) && (
                        <p className="text-sm text-gray-800 whitespace-pre-wrap mt-1 leading-relaxed">
                          {comment.commentbody}
                        </p>
                      )}

                      {/* Display translated text inline if present */}
                      {translatedText[comment._id] && (
                        <div className="mt-2 p-2 bg-blue-50/60 border-l-4 border-blue-500 rounded text-sm text-gray-800">
                          <div className="text-[10px] text-blue-600 font-semibold mb-0.5 flex items-center gap-1">
                            <Globe className="w-3 h-3" /> Translated comment:
                          </div>
                          <p className="leading-relaxed">{translatedText[comment._id]}</p>
                          <button
                            onClick={() => setTranslatedText(prev => {
                              const copy = { ...prev };
                              delete copy[comment._id];
                              return copy;
                            })}
                            className="text-xs text-blue-600 underline mt-1 block font-medium hover:text-blue-800"
                          >
                            Show original
                          </button>
                        </div>
                      )}

                      <div className="flex items-center gap-3 mt-3 text-xs text-gray-500 select-none flex-wrap">
                        {/* Like Button */}
                        <button
                          onClick={() => handleLike(comment._id)}
                          className={`flex items-center gap-1 hover:text-blue-600 transition-colors p-1 rounded hover:bg-gray-100/50 ${hasLiked ? 'text-blue-600 font-semibold' : ''}`}
                        >
                          <ThumbsUp className="w-3.5 h-3.5" />
                          <span>{comment.likes?.length || 0}</span>
                        </button>

                        {/* Dislike Button */}
                        <button
                          onClick={() => handleDislike(comment._id)}
                          className={`flex items-center gap-1 hover:text-red-600 transition-colors p-1 rounded hover:bg-gray-100/50 ${hasDisliked ? 'text-red-600 font-semibold' : ''}`}
                        >
                          <ThumbsDown className="w-3.5 h-3.5" />
                          <span>{comment.dislikes?.length || 0}</span>
                        </button>

                        {/* Flag/Report Button */}
                        <button
                          onClick={() => handleReport(comment._id)}
                          className={`flex items-center gap-1 hover:text-red-500 transition-colors p-1 rounded hover:bg-gray-100/50 ${comment.reports?.includes(user?._id || "") ? 'text-red-500 font-semibold' : ''}`}
                          title="Report comment"
                        >
                          <Flag className="w-3.5 h-3.5" />
                          <span>Report</span>
                        </button>

                        {/* Translation Selector */}
                        <span className="text-gray-300">|</span>
                        <div className="flex items-center gap-1 text-xs">
                          <Globe className="w-3 h-3 text-gray-400" />
                          <select
                            onChange={(e) => {
                              if (e.target.value) {
                                handleTranslate(comment._id, comment.commentbody, e.target.value);
                              }
                            }}
                            className="bg-transparent border-0 text-xs text-gray-500 hover:text-gray-700 cursor-pointer focus:ring-0 focus:outline-none py-0 pl-1 pr-6"
                            defaultValue=""
                            disabled={translatingId === comment._id}
                          >
                            <option value="" disabled>
                              {translatingId === comment._id ? "Translating..." : "Translate"}
                            </option>
                            <option value="en">English</option>
                            <option value="es">Spanish</option>
                            <option value="hi">Hindi</option>
                            <option value="fr">French</option>
                            <option value="de">German</option>
                            <option value="zh">Chinese</option>
                            <option value="ja">Japanese</option>
                          </select>
                        </div>

                        {comment.userid === user?._id && (
                          <>
                            <span className="text-gray-300">|</span>
                            <button onClick={() => handleEdit(comment)} className="hover:text-gray-700 px-1 py-0.5 rounded hover:bg-gray-100/50">Edit</button>
                            <button onClick={() => handleDelete(comment._id)} className="hover:text-red-600 px-1 py-0.5 rounded hover:bg-gray-100/50">Delete</button>
                          </>
                        )}
                      </div>
                    </>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};

export default Comments;
