// server/index.js
require("dotenv").config();
const path = require("path");
const express = require("express");
const mongoose = require("mongoose");
const morgan = require("morgan");
const helmet = require("helmet");
const cors = require("cors");
const cookieParser = require("cookie-parser");
const { routesInit } = require("./routes/config_routes");
const { initGridFS } = require("./utils/gridfs");

const app = express();

app.use(
  helmet({
    crossOriginResourcePolicy: { policy: "cross-origin" },
  })
);

app.use(morgan("dev"));
app.use(express.json({ limit: "20mb" })); // Base64 יכול להיות גדול
app.use(cookieParser());

const allowedOrigins = [process.env.CLIENT_URL, process.env.CLIENT_URL_2].filter(Boolean);

app.use(
  cors({
    origin: function (origin, callback) {
      if (!origin) return callback(null, true);
      if (allowedOrigins.includes(origin)) return callback(null, true);
      return callback(new Error("Not allowed by CORS"));
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);

app.options("*", cors());

// אפשר להשאיר לתאימות אחורה – אבל לא לסמוך על זה בפרודקשן
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

const MONGO_URI = process.env.MONGO_URI;

if (MONGO_URI) {
  mongoose
    .connect(MONGO_URI)
    .then(async () => {
      console.log("✅ MongoDB connected");

      // ✅ חובה: GridFS init אחרי החיבור
      initGridFS();

      // ניקוי אינדקס ישן אם קיים
      try {
        const Category = require("./models/Category");
        const indexes = await Category.collection.indexes();
        const hasSlugIdx = indexes.some((ix) => ix.name === "slug_1");
        if (hasSlugIdx) {
          await Category.collection.dropIndex("slug_1");
          console.log("🧹 Dropped legacy Category index: slug_1");
        }
      } catch (err) {
        if (err?.codeName !== "IndexNotFound") console.warn("Index cleanup warning:", err.message);
      }
    })
    .catch((e) => console.error("Mongo error", e));
} else {
  console.warn("⚠️ MONGO_URI is not set. Skipping MongoDB connection.");
}

routesInit(app);

app.use((err, req, res, next) => {
  console.error(err);
  res.status(err.status || 500).json({ message: err.message || "Server Error" });
});

const port = process.env.PORT || 3000;
app.listen(port, () => console.log(`🚀 Server running on http://localhost:${port}`));