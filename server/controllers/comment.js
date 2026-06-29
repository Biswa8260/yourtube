import comment from "../Modals/comment.js";
import mongoose from "mongoose";

export const postcomment = async (req, res) => {
  const { videoid, userid, commentbody, usercommented, location, showLocation } = req.body;

  if (!commentbody || !commentbody.trim()) {
    return res.status(400).json({ message: "Comment body cannot be empty." });
  }

  // 1. Detect abusive words
  const abusiveWords = ["abuse", "hate", "spam", "stupid", "idiot", "jerk", "bastard", "asshole", "bitch", "crap", "fuck", "shit"];
  const containsAbusive = abusiveWords.some(word => 
    new RegExp(`\\b${word}\\b`, "i").test(commentbody)
  );
  if (containsAbusive) {
    return res.status(400).json({ message: "Comment blocked: Abusive content detected." });
  }

  // 2. Detect repeated special characters (e.g. !!!, @@@, ---, etc.)
  const repeatedSpecialCharRegex = /([^\w\s])\1{2,}/;
  if (repeatedSpecialCharRegex.test(commentbody)) {
    return res.status(400).json({ message: "Comment blocked: Too many repetitive special characters." });
  }

  // 3. Spam protection: Cooldown and duplicate checks
  try {
    const lastComment = await comment.findOne({ userid, videoid }).sort({ commentedon: -1 });
    if (lastComment) {
      const timeDiff = (Date.now() - new Date(lastComment.commentedon).getTime()) / 1000;
      if (timeDiff < 10) { // 10 seconds cooldown
        return res.status(400).json({ message: "Please wait before posting another comment (cooldown active)." });
      }
      if (lastComment.commentbody.trim().toLowerCase() === commentbody.trim().toLowerCase()) {
        return res.status(400).json({ message: "Duplicate comment detected. Please avoid posting repetitive content." });
      }
    }

    const postcomment = new comment({
      videoid,
      userid,
      commentbody,
      usercommented,
      location: location || "",
      showLocation: !!showLocation,
    });
    await postcomment.save();
    return res.status(200).json({ comment: true, commentdata: postcomment });
  } catch (error) {
    console.error(" error:", error);
    return res.status(500).json({ message: "Something went wrong" });
  }
};
export const getallcomment = async (req, res) => {
  const { videoid } = req.params;
  try {
    const commentvideo = await comment.find({ videoid: videoid });
    return res.status(200).json(commentvideo);
  } catch (error) {
    console.error(" error:", error);
    return res.status(500).json({ message: "Something went wrong" });
  }
};
export const deletecomment = async (req, res) => {
  const { id: _id } = req.params;
  if (!mongoose.Types.ObjectId.isValid(_id)) {
    return res.status(404).send("comment unavailable");
  }
  try {
    await comment.findByIdAndDelete(_id);
    return res.status(200).json({ comment: true });
  } catch (error) {
    console.error(" error:", error);
    return res.status(500).json({ message: "Something went wrong" });
  }
};

export const editcomment = async (req, res) => {
  const { id: _id } = req.params;
  const { commentbody } = req.body;
  if (!mongoose.Types.ObjectId.isValid(_id)) {
    return res.status(404).send("comment unavailable");
  }
  try {
    const updatecomment = await comment.findByIdAndUpdate(_id, {
      $set: { commentbody: commentbody },
    });
    res.status(200).json(updatecomment);
  } catch (error) {
    console.error(" error:", error);
    return res.status(500).json({ message: "Something went wrong" });
  }
};

export const likeComment = async (req, res) => {
  const { id } = req.params;
  const { userid } = req.body;
  if (!mongoose.Types.ObjectId.isValid(id)) {
    return res.status(404).send("Comment unavailable");
  }
  try {
    const targetComment = await comment.findById(id);
    if (!targetComment) return res.status(404).send("Comment not found");

    const dislikeIndex = targetComment.dislikes.indexOf(userid);
    if (dislikeIndex !== -1) {
      targetComment.dislikes.splice(dislikeIndex, 1);
    }

    const likeIndex = targetComment.likes.indexOf(userid);
    if (likeIndex === -1) {
      targetComment.likes.push(userid);
    } else {
      targetComment.likes.splice(likeIndex, 1);
    }

    await targetComment.save();
    return res.status(200).json(targetComment);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Something went wrong" });
  }
};

export const dislikeComment = async (req, res) => {
  const { id } = req.params;
  const { userid } = req.body;
  if (!mongoose.Types.ObjectId.isValid(id)) {
    return res.status(404).send("Comment unavailable");
  }
  try {
    const targetComment = await comment.findById(id);
    if (!targetComment) return res.status(404).send("Comment not found");

    const likeIndex = targetComment.likes.indexOf(userid);
    if (likeIndex !== -1) {
      targetComment.likes.splice(likeIndex, 1);
    }

    const dislikeIndex = targetComment.dislikes.indexOf(userid);
    if (dislikeIndex === -1) {
      targetComment.dislikes.push(userid);
    } else {
      targetComment.dislikes.splice(dislikeIndex, 1);
    }

    await targetComment.save();
    return res.status(200).json(targetComment);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Something went wrong" });
  }
};

export const reportComment = async (req, res) => {
  const { id } = req.params;
  const { userid } = req.body;
  if (!mongoose.Types.ObjectId.isValid(id)) {
    return res.status(404).send("Comment unavailable");
  }
  try {
    const targetComment = await comment.findById(id);
    if (!targetComment) return res.status(404).send("Comment not found");

    const reportIndex = targetComment.reports.indexOf(userid);
    if (reportIndex === -1) {
      targetComment.reports.push(userid);
      targetComment.isFlagged = true;
    }

    await targetComment.save();
    return res.status(200).json(targetComment);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Something went wrong" });
  }
};
