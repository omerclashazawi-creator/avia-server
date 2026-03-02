// routes/files.routes.js
const router = require("express").Router();
const mongoose = require("mongoose");
const { ObjectId } = require("mongodb");
const { getBucket } = require("../utils/gridfs");

/**
 * GET /api/files/:id
 * מחזיר את הקובץ מה-GridFS ב-stream
 */
router.get("/:id", async (req, res, next) => {
    try {
        const id = String(req.params.id || "").trim();
        if (!/^[0-9a-fA-F]{24}$/.test(id)) {
            return res.status(400).json({ message: "Bad file id" });
        }

        // לוודא שיש חיבור DB
        if (mongoose.connection.readyState !== 1) {
            return res.status(503).json({ message: "DB not connected" });
        }

        const bucket = getBucket();

        // ננסה להביא metadata כדי להחזיר content-type נכון
        const files = await bucket.find({ _id: new ObjectId(id) }).toArray();
        if (!files?.length) return res.status(404).json({ message: "File not found" });

        const file = files[0];
        if (file?.contentType) res.set("Content-Type", file.contentType);
        res.set("Cache-Control", "public, max-age=31536000, immutable");

        const dl = bucket.openDownloadStream(new ObjectId(id));
        dl.on("error", () => res.status(404).json({ message: "File not found" }));
        dl.pipe(res);
    } catch (e) {
        next(e);
    }
});

module.exports = router;