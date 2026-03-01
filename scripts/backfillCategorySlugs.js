require("dotenv").config();
const mongoose = require("mongoose");
const Category = require("../models/Category");

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

(async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);

    const cats = await Category.find({
      $or: [{ slug: { $exists: false } }, { slug: null }, { slug: "" }],
    });

    console.log("Found categories missing slug:", cats.length);

    for (const c of cats) {
      const nextSlug = slugify(c.name);

      // אם יש התנגשות ייחודיות, נוסיף סיומת
      let finalSlug = nextSlug;
      let i = 2;
      while (await Category.exists({ slug: finalSlug, _id: { $ne: c._id } })) {
        finalSlug = `${nextSlug}-${i++}`;
      }

      c.slug = finalSlug;
      await c.save();
      console.log("Updated:", c.name, "=>", finalSlug);
    }

    console.log("Done.");
    process.exit(0);
  } catch (e) {
    console.error(e);
    process.exit(1);
  }
})();
