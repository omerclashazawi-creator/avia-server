// models/Product.js
const { Schema, model } = require("mongoose");

const productSchema = new Schema(
  {
    title: { type: String, required: true },
    slug: { type: String, required: true, unique: true },
    description: String,

    price: { type: Number, required: true },

    // ✅ מבצע
    onSale: { type: Boolean, default: false },
    salePrice: { type: Number, default: null },

    images: [{ type: String }],
    category: { type: Schema.Types.ObjectId, ref: "Category", required: false },
    productType: {
      type: String,
      enum: ["food", "accessories", "toys", "grooming"],
      default: "accessories",
    },
    stock: { type: Number, default: 0 },
    ratingAvg: { type: Number, default: 0 },
    ratingCount: { type: Number, default: 0 },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

productSchema.index({ title: "text", description: "text" });

module.exports = model("Product", productSchema);
