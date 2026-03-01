const mongoose = require("mongoose");
const { Schema } = mongoose;

function slugify(str) {
  return String(str ?? "")
    .trim()
    .toLowerCase()
    .replace(/['"]/g, "")
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9\u0590-\u05FF-]/g, "") // כולל עברית
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

const categorySchema = new Schema(
  {
    name: { type: String, required: true, unique: true },
    slug: { type: String, required: true, unique: true, index: true },
    parent: { type: Schema.Types.ObjectId, ref: "Category", default: null },
    icon: { type: String, default: null },
  },
  { timestamps: true }
);

categorySchema.pre("validate", function (next) {
  if (!this.slug && this.name) this.slug = slugify(this.name);
  next();
});

module.exports =
  mongoose.models.Category || mongoose.model("Category", categorySchema);
