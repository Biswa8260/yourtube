import video from "../Modals/video.js";
import Download from "../Modals/Download.js";
import users from "../Modals/Auth.js";
import mongoose from "mongoose";

export const uploadvideo = async (req, res) => {
  if (req.file === undefined) {
    return res
      .status(404)
      .json({ message: "plz upload a mp4 video file only" });
  } else {
    try {
      const file = new video({
        videotitle: req.body.videotitle,
        filename: req.file.originalname,
        filepath: req.file.path.replace(/\\/g, "/"),
        filetype: req.file.mimetype,
        filesize: req.file.size,
        videochanel: req.body.videochanel,
        uploader: req.body.uploader,
        isPremium: req.body.isPremium === "true" || req.body.isPremium === true,
      });
      await file.save();
      return res.status(201).json("file uploaded successfully");
    } catch (error) {
      console.error(" error:", error);
      return res.status(500).json({ message: "Something went wrong" });
    }
  }
};
export const getallvideo = async (req, res) => {
  try {
    const files = await video.find();
    return res.status(200).send(files);
  } catch (error) {
    console.error(" error:", error);
    return res.status(500).json({ message: "Something went wrong" });
  }
};

export const downloadVideo = async (req, res) => {
  const { id } = req.params; // Video ID
  const { userId } = req.body;

  if (!mongoose.Types.ObjectId.isValid(userId)) {
    return res.status(400).json({ message: "Invalid user ID" });
  }
  if (!mongoose.Types.ObjectId.isValid(id)) {
    return res.status(400).json({ message: "Invalid video ID" });
  }

  try {
    const user = await users.findById(userId);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const videoObj = await video.findById(id);
    if (!videoObj) {
      return res.status(404).json({ message: "Video not found" });
    }

    const plan = user.plan || "Free";
    const limits = {
      "Free": 1,
      "Bronze": 3,
      "Silver": 5,
      "Gold": 10
    };

    const maxDownloads = limits[plan] || 1;

    // Count user downloads in the current calendar day (in UTC)
    const startOfDay = new Date();
    startOfDay.setUTCHours(0, 0, 0, 0);
    const endOfDay = new Date();
    endOfDay.setUTCHours(23, 59, 59, 999);

    const todayDownloads = await Download.find({
      userId,
      downloadDate: { $gte: startOfDay, $lte: endOfDay }
    });

    const uniqueVideosDownloadedToday = new Set(todayDownloads.map(d => d.videoid.toString()));

    if (!uniqueVideosDownloadedToday.has(id.toString())) {
      if (uniqueVideosDownloadedToday.size >= maxDownloads) {
        return res.status(403).json({
          message: `Daily download limit reached (${maxDownloads}/${maxDownloads}) for plan '${plan}'. Upgrade your plan to download more.`
        });
      }
    }

    // Save download record
    const newDownload = new Download({
      userId,
      videoid: id,
      userPlan: plan,
      downloadDate: new Date()
    });
    await newDownload.save();

    return res.status(200).json({
      message: "Download approved",
      download: newDownload
    });
  } catch (error) {
    console.error("Download error:", error);
    return res.status(500).json({ message: "Something went wrong" });
  }
};

export const getUserDownloads = async (req, res) => {
  const { userId } = req.params;
  if (!mongoose.Types.ObjectId.isValid(userId)) {
    return res.status(400).json({ message: "Invalid user ID" });
  }

  try {
    const downloads = await Download.find({ userId })
      .populate("videoid")
      .sort({ downloadDate: -1 });
    return res.status(200).json(downloads);
  } catch (error) {
    console.error("Get user downloads error:", error);
    return res.status(500).json({ message: "Something went wrong" });
  }
};
