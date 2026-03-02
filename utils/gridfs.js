// utils/gridfs.js
const mongoose = require("mongoose");
const { GridFSBucket, ObjectId } = require("mongodb");

let bucket = null;
const BUCKET_NAME = "files";

function initGridFS() {
    const db = mongoose.connection.db;
    if (!db) throw new Error("MongoDB not connected (no connection.db)");
    bucket = new GridFSBucket(db, { bucketName: BUCKET_NAME });
}

function ensureBucket() {
    if (!bucket) throw new Error("GridFS bucket not initialized. Call initGridFS() after connect.");
}

function parseDataUrl(dataUrl) {
    const match = /^data:([^;]+);base64,(.+)$/.exec(String(dataUrl || ""));
    if (!match) return null;
    return {
        mime: match[1],
        buffer: Buffer.from(match[2], "base64"),
    };
}

function uploadBuffer({ buffer, filename, contentType }) {
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
    await bucket.delete(new ObjectId(String(id)));
}

function getBucket() {
    ensureBucket();
    return bucket;
}

module.exports = { initGridFS, saveDataUrlToGridFS, deleteFileById, getBucket };