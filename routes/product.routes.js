const router = require("express").Router();
const { auth, admin } = require("../middlewares/auth");
const Product = require("../models/Product");
const Category = require("../models/Category");
const saveBase64Image = require("../utils/saveBase64Image");

function normalizeImages(input) {
  if (!input) return [];
  let imgs = [];
  if (Array.isArray(input)) imgs = input;
  else if (typeof input === "string")
    imgs = input.split(",").map((s) => s.trim()).filter(Boolean);

  return imgs.map((src) =>
    typeof src === "string" && src.startsWith("data:")
      ? saveBase64Image(src, "products")
      : src
  );
}

const withCategory = {
  path: "category",
  select: "name slug parent icon",
  populate: { path: "parent", select: "name slug icon" },
};

// GET /api/products?q=&category=&parent=&min=&max=&sort=&page=&limit=
router.get("/", async (req, res, next) => {
  try {
    const {
      q,
      category,
      parent,
      min,
      max,
      sort = "createdAt_desc",
      page = 1,
      limit = 12,
      sale, // ✅ חדש
    } = req.query;

    const filter = { isActive: true };

    if (q) filter.$text = { $search: q };

        if (String(sale) === "1" || String(sale).toLowerCase() === "true") {
      // או onSale=true
      filter.onSale = true;
        }

    // category: slug או id (עם הגנה)
    if (category) {
      const catStr = String(category).trim();

      if (!catStr || catStr === "undefined" || catStr === "null") {
        // מתעלמים
      } else {
        const isId = /^[0-9a-fA-F]{24}$/.test(catStr);
        if (isId) {
          filter.category = catStr;
        } else {
          const cat = await Category.findOne({ slug: catStr }).select("_id");
          if (cat) filter.category = cat._id;
          else filter.category = "__nope__";
        }
      }
    }

    // parent -> כל הילדים של parent (רק אם לא נבחרה category ספציפית)
    if (parent && !filter.category) {
      const children = await Category.find({ parent }).select("_id");
      filter.category = { $in: children.map((c) => c._id) };
    }

    if (min) filter.price = { ...(filter.price || {}), $gte: Number(min) };
    if (max) filter.price = { ...(filter.price || {}), $lte: Number(max) };

    const sortMap = {
      price_asc: { price: 1 },
      price_desc: { price: -1 },
      rating_desc: { ratingAvg: -1 },
      createdAt_desc: { createdAt: -1 },
    };
    const sortObj = sortMap[sort] || sortMap.createdAt_desc;

    const pageNum = Math.max(1, Number(page) || 1);
    const limitNum = Math.min(100, Math.max(1, Number(limit) || 12));
    const skip = (pageNum - 1) * limitNum;

    const [items, total] = await Promise.all([
      Product.find(filter)
        .sort(sortObj)
        .skip(skip)
        .limit(limitNum)
        .populate(withCategory)
        .lean(),
      Product.countDocuments(filter),
    ]);

    res.json({
      items,
      total,
      page: pageNum,
      pages: Math.ceil(total / limitNum),
    });
  } catch (e) {
    next(e);
  }
});


// GET /api/products/:slug – פריט יחיד לפי slug
router.get("/:slug", async (req, res, next) => {
  try {
    const item = await Product.findOne({ slug: req.params.slug })
      .populate(withCategory)
      .lean();

    if (!item) return res.status(404).json({ message: "Not found" });
    res.json(item);
  } catch (e) {
    next(e);
  }
});

// POST /api/products – יצירה
router.post("/", auth, admin, async (req, res, next) => {
  try {
    const body = { ...req.body };
    if (body.images) body.images = normalizeImages(body.images);

    const doc = await Product.create(body);
    const populated = await doc.populate(withCategory);
    res.status(201).json(populated);
  } catch (e) {
    next(e);
  }
});

// PUT /api/products/:id – עדכון
router.put("/:id", auth, admin, async (req, res, next) => {
  try {
    const body = { ...req.body };
    if ("images" in body) body.images = normalizeImages(body.images);

    const updated = await Product.findByIdAndUpdate(req.params.id, body, {
      new: true,
    }).populate(withCategory);

    res.json(updated);
  } catch (e) {
    next(e);
  }
});

// DELETE /api/products/:id – מחיקה בודדת
router.delete("/:id", auth, admin, async (req, res, next) => {
  try {
    await Product.findByIdAndDelete(req.params.id);
    res.json({ ok: true });
  } catch (e) {
    next(e);
  }
});

// DELETE /api/products?ids=a,b,c – מחיקה מרובה
router.delete("/", auth, admin, async (req, res, next) => {
  try {
    const ids =
      Array.isArray(req.body?.ids)
        ? req.body.ids
        : String(req.query.ids || "")
            .split(",")
            .map((s) => s.trim())
            .filter(Boolean);

    if (!ids.length) return res.status(400).json({ message: "No ids provided" });

    const r = await Product.deleteMany({ _id: { $in: ids } });
    res.json({ ok: true, deleted: r.deletedCount || 0 });
  } catch (e) {
    next(e);
  }
});

module.exports = router;
