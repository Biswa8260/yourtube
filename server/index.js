import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import bodyParser from "body-parser";
import mongoose from "mongoose";
import dns from "dns";

// Set DNS servers to Google DNS to resolve connection string lookup issues (querySrv ECONNREFUSED)
dns.setServers(["8.8.8.8", "8.8.4.4"]);
import userroutes from "./routes/auth.js";
import videoroutes from "./routes/video.js";
import likeroutes from "./routes/like.js";
import watchlaterroutes from "./routes/watchlater.js";
import historyrroutes from "./routes/history.js";
import commentroutes from "./routes/comment.js";
import paymentroutes from "./routes/payment.js";
dotenv.config();
const app = express();
import path from "path";
app.use(cors());
app.use(express.json({ limit: "30mb", extended: true }));
app.use(express.urlencoded({ limit: "30mb", extended: true }));
app.use("/uploads", express.static(path.join("uploads")));
app.get("/", (req, res) => {
  res.send("You tube backend is working");
});
app.use(bodyParser.json());
app.use("/user", userroutes);
app.use("/video", videoroutes);
app.use("/like", likeroutes);
app.use("/watch", watchlaterroutes);
app.use("/history", historyrroutes);
app.use("/comment", commentroutes);
app.use("/payment", paymentroutes);
const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`server running on port ${PORT}`);
});

const DBURL = process.env.DB_URL;
console.log("DB_URL:", process.env.DB_URL);
mongoose
  .connect(DBURL)
  .then(() => {
    console.log("Mongodb connected");
    // Windows backslash path self-healing migration
    import("./Modals/video.js").then((m) => {
      const videoModel = m.default;
      videoModel.find({ filepath: { $regex: /\\/ } })
        .then((videos) => {
          if (videos.length > 0) {
            console.log(`🔧 Migrating ${videos.length} video paths to replace backslashes with forward slashes...`);
            Promise.all(videos.map(async (vid) => {
              vid.filepath = vid.filepath.replace(/\\/g, "/");
              await vid.save();
            })).then(() => {
              console.log("✅ Video path migrations completed successfully.");
            });
          }
        })
        .catch((err) => console.error("Migration check error:", err));
    });
  })
  .catch((error) => {
    console.log(error);
  });
