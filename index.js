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

const app = express();

// ===== Middlewares
app.use(
  helmet({
    // מאפשר לטעון תמונות משרת אחר (למשל קליינט ב-Netlify/Render)
    crossOriginResourcePolicy: { policy: "cross-origin" },
  })
);

app.use(morgan("dev"));
app.use(express.json({ limit: "10mb" })); // מאפשר Base64
app.use(cookieParser());

// ===== CORS (Whitelist)
const allowedOrigins = [process.env.CLIENT_URL, process.env.CLIENT_URL_2].filter(Boolean);

app.use(
  cors({
    origin: function (origin, callback) {
      // requests בלי origin (למשל Postman) נאפשר
      if (!origin) return callback(null, true);
      if (allowedOrigins.includes(origin)) return callback(null, true);
      return callback(new Error("Not allowed by CORS"));
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);

// Preflight
app.options("*", cors());

// ===== Static for uploads (category icons etc.)
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

// ===== DB
const MONGO_URI = process.env.MONGO_URI;

if (!MONGO_URI) {
  console.warn("⚠️ MONGO_URI is not set. Skipping MongoDB connection.");
} else {
  mongoose
    .connect(MONGO_URI)
    .then(() => console.log("✅ MongoDB connected"))
    .catch((e) => console.error("Mongo error", e));
}

// ===== Routes
routesInit(app);

// ===== Error handler
app.use((err, req, res, next) => {
  console.error(err);
  res.status(err.status || 500).json({ message: err.message || "Server Error" });
});

const port = process.env.PORT || 3000;
app.listen(port, () => console.log(`🚀 Server running on http://localhost:${port}`));