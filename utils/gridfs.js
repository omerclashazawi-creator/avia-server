const mongoose = require("mongoose");
const { GridFSBucket, ObjectId } = require("mongodb");

let bucket = null;
const BUCKET_NAME = "files";

function tryInitBucket() {
    const db = mongoose.connection?.db;
    if (!db) return false;
    bucket = new GridFSBucket(db, { bucketName: BUCKET_NAME });
    return true;
}

/**
 * אפשר לקרוא לזה פעם אחת אחרי connect,
 * אבל גם אם שכחת - אנחנו עושים Lazy init ב-ensureBucket
 */
function initGridFS() {
    if (!tryInitBucket()) {
        throw new Error("MongoDB not connected yet (no connection.db)");
    }
}

function ensureBucket() {
    if (bucket) return;

    // Lazy init
    const ok = tryInitBucket();
    if (!ok) {
        const state = mongoose.connection?.readyState; // 0,1,2,3
        // 0=disconnected, 1=connected, 2=connecting, 3=disconnecting
        throw new Error(`GridFS not ready (mongo readyState=${state}).`);
    }
}

function parseDataUrl(dataUrl) {
    const match = /^data:([^;]+);base64,(.+)$/.exec(String(dataUrl || ""));
    if (!match) return null;
    return { mime: match[1], buffer: Buffer.from(match[2], "base64") };
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