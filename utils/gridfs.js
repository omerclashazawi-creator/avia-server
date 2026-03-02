// utils/gridfs.js
const mongoose = require("mongoose");
const { GridFSBucket, ObjectId } = require("mongodb");

let bucket = null;
const BUCKET_NAME = "files";

/**
 * חייבים לקרוא לזה אחרי ש-Mongoose התחבר (mongoose.connection.readyState === 1)
 */
function initGridFS() {
    const db = mongoose.connection.db;
    if (!db) throw new Error("MongoDB is not connected yet (no connection.db)");
    bucket = new GridFSBucket(db, { bucketName: BUCKET_NAME });
}

/**
 * dataUrl: "data:image/png;base64,...."
 */
function parseDataUrl(dataUrl) {
    const match = /^data:([^;]+);base64,(.+)$/.exec(String(dataUrl || ""));
    if (!match) return null;
    const mime = match[1];
    const base64 = match[2];
    const buffer = Buffer.from(base64, "base64");
    return { mime, buffer };
}

function ensureBucket() {
    if (!bucket) {
        throw new Error("GridFS bucket not initialized. Call initGridFS() after DB connect.");
    }
}

async function uploadBuffer({ buffer, filename, contentType }) {
    ensureBucket();

    return new Promise((resolve, reject) => {
        const stream = bucket.openUploadStream(filename, {
            contentType: contentType || "application/octet-stream",
        });

        stream.on("finish", (file) => resolve(file));
        stream.on("error", reject);

        stream.end(buffer);
    });
}

/**
 * מקבל dataUrl ומחזיר URL להציג בצד לקוח: /api/files/<id>
 */
async function saveDataUrlToGridFS(dataUrl, folder = "misc") {
    const parsed = parseDataUrl(dataUrl);
    if (!parsed) throw new Error("Invalid data URL");

    const ext = parsed.mime.split("/")[1] || "bin";
    const filename = `${folder}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;

    const file = await uploadBuffer({
        buffer: parsed.buffer,
        filename,
        contentType: parsed.mime,
    });

    return {
        fileId: file._id.toString(),
        url: `/api/files/${file._id.toString()}`,
        filename: file.filename,
        contentType: file.contentType,
    };
}

async function deleteFileById(id) {
    ensureBucket();
    const _id = new ObjectId(String(id));
    await bucket.delete(_id);
}

function getBucket() {
    ensureBucket();
    return bucket;
}

module.exports = {
    initGridFS,
    saveDataUrlToGridFS,
    deleteFileById,
    getBucket,
};