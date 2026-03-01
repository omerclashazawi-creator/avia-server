const router = require("express").Router();
const { auth, admin } = require("../middlewares/auth");
const Category = require("../models/Category");
const saveBase64Image = require("../utils/saveBase64Image");

function slugify(str) {
  return String(str ?? "")
    .trim()
    .toLowerCase()
    .replace(/['"]/g, "")
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9\u0590-\u05FF-]/g, "")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

// GET /api/categories?parent=null|<id>
router.get("/", async (req, res, next) => {
  try {
    const q = {};
    if (typeof req.query.parent !== "undefined") {
      q.parent = req.query.parent === "null" ? null : req.query.parent;
    }
    const items = await Category.find(q).sort({ createdAt: -1 }).lean();
    res.set("Cache-Control", "no-cache");
    res.json(items);
  } catch (e) {
    next(e);
  }
});

// POST /api/categories
router.post("/", auth, admin, async (req, res, next) => {
  try {
    const { name, parent, icon } = req.body;

    const cleanName = String(name).trim();

    const doc = {
      name: cleanName,
      slug: slugify(cleanName),
      parent: parent ? parent : null,
      icon: null,
    };

    if (icon && icon.startsWith("data:")) {
      doc.icon = saveBase64Image(icon, "categories");
    }

    const created = await Category.create(doc);
    res.status(201).json(created);
  } catch (e) {
    next(e);
  }
});

// PUT /api/categories/:id
router.put("/:id", auth, admin, async (req, res, next) => {
  try {
    const { name, parent, icon } = req.body;
    const patch = {};

    if (typeof name !== "undefined") {
      patch.name = String(name).trim();
      patch.slug = slugify(patch.name);
    }

    if (typeof parent !== "undefined") patch.parent = parent ? parent : null;

    if (typeof icon !== "undefined") {
      if (icon === "") patch.icon = null;
      else if (icon && icon.startsWith("data:")) {
        patch.icon = saveBase64Image(icon, "categories");
      }
    }

    const updated = await Category.findByIdAndUpdate(req.params.id, patch, {
      new: true,
      runValidators: true,
    }).lean();

    res.json(updated);
  } catch (e) {
    next(e);
  }
});

// DELETE /api/categories/:id
router.delete("/:id", auth, admin, async (req, res, next) => {
  try {
    await Category.updateMany(
      { parent: req.params.id },
      { $set: { parent: null } }
    );
    await Category.findByIdAndDelete(req.params.id);
    res.json({ ok: true });
  } catch (e) {
    next(e);
  }
});

module.exports = router;
