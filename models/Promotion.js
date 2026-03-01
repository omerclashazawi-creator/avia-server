const mongoose = require('mongoose');
const { Schema, Types } = mongoose;

/**
 * סכימת מבצעים גמישה ותואמת-לאחור:
 * - type: כל סוגי המבצעים הנתמכים
 * - valuePercent/valueFlat: ערך הנחה גנרי (במקום value/discountType הישנים)
 * - שדות ייעודיים לפי סוג (xQty, fixedPrice, buyQty, getQty, minSubtotal וכו')
 * - productIds/categoryIds/bundleProductIds: מערכי יעד (ObjectId)
 */
const ALLOWED_TYPES = [
  'percentage',        // אחוז על מוצר/ים/קטגוריות
  'flat',              // סכום קבוע על מוצר/ים/קטגוריות
  'xforfixed',         // X מוצרים במחיר קבוע
  'xforone',           // X מוצרים במחיר של 1
  'bogo',              // קנה N קבל M (הנחה על המקבלים)
  'categories',        // הנחה על קטגוריות (אחוז/סכום)
  'threshold',         // הנחת סל מעל סכום/כמות
  'shipping',          // משלוח חינם מעל סכום
  'bundle',            // חבילת מוצרים במחיר קבוע
  'firstPurchase',     // הנחה ללקוח חדש
  'coupon',            // קופון עם קוד
];

const Money = { type: Number, min: 0 };
const Percent = { type: Number, min: 0, max: 100 };

const promotionSchema = new Schema({
  title: { type: String, trim: true, required: true },

  // שדה חדש במקום discountType הישן
  type: { type: String, enum: ALLOWED_TYPES, default: 'percentage', index: true },

  // תאימות לאחור (נחזיק גם את הישנים אם קיימים בבסיס הנתונים)
  discountType: { type: String, enum: ['percentage', 'flat'], required: false, select: false },
  value:        { type: Number, required: false, select: false },

  // ערכי הנחה גנריים
  valuePercent: Percent, // לדוגמה 10 (%)
  valueFlat: Money,      // לדוגמה 20 (₪)

  // X-for-* / BOGO
  xQty: { type: Number, min: 1 },
  fixedPrice: Money,
  buyQty: { type: Number, min: 1 },
  getQty: { type: Number, min: 1 },
  getDiscountPercent: Percent, // אחוז על הפריטים המתקבלים (ברירת מחדל 100%)

  // ספי סל
  minSubtotal: Money,
  minQty: { type: Number, min: 0 },

  // דגלים כלליים
  isActive: { type: Boolean, default: true, index: true },
  autoApply: { type: Boolean, default: true },     // threshold וכד׳
  freeShipping: { type: Boolean, default: false }, // shipping
  firstPurchaseOnly: { type: Boolean, default: false },

  // קופונים
  code: { type: String, trim: true, index: true, sparse: true },
  usageLimit: { type: Number, min: 0 },      // 0/undefined = ללא הגבלה
  perUserLimit: { type: Number, min: 0 },

  // טווח תאריכים
  startsAt: { type: Date, index: true },
  endsAt:   { type: Date, index: true },

  // יעדי החלה
  productIds: [{ type: Schema.Types.ObjectId, ref: 'Product' }],
  categoryIds: [{ type: Schema.Types.ObjectId, ref: 'Category' }],
  bundleProductIds: [{ type: Schema.Types.ObjectId, ref: 'Product' }],
}, { timestamps: true });

/** ולידציה לוגית לפי type */
promotionSchema.pre('validate', function(next){
  const p = this;

  if (p.startsAt && p.endsAt && p.startsAt > p.endsAt) {
    return next(new Error('טווח התאריכים שגוי (startsAt > endsAt)'));
  }

  // ברירות מחדל קטנות
  if (p.type === 'bogo' && (p.getDiscountPercent == null)) p.getDiscountPercent = 100;

  // תנאים מינימליים לפי סוג
  switch (p.type) {
    case 'percentage':
      if (p.valuePercent == null && p.value == null)
        return next(new Error('אחוז הנחה נדרש'));
      break;
    case 'flat':
      if (p.valueFlat == null && p.value == null)
        return next(new Error('ערך שקלי נדרש'));
      break;
    case 'xforfixed':
      if (!(p.xQty > 0 && p.fixedPrice >= 0))
        return next(new Error('נדרשים xQty ו־fixedPrice תקינים'));
      break;
    case 'xforone':
      if (!(p.xQty > 0))
        return next(new Error('נדרש xQty תקין'));
      break;
    case 'bogo':
      if (!(p.buyQty > 0 && p.getQty > 0))
        return next(new Error('נדרשים buyQty ו־getQty תקינים'));
      break;
    case 'categories':
      if (!((p.valuePercent != null) || (p.valueFlat != null)))
        return next(new Error('הזן valuePercent או valueFlat'));
      if (!Array.isArray(p.categoryIds) || p.categoryIds.length === 0)
        return next(new Error('יש לבחור קטגוריות יעד'));
      break;
    case 'threshold':
      if (!((p.minSubtotal != null) || (p.minQty != null)))
        return next(new Error('הזן minSubtotal או minQty'));
      if (!((p.valuePercent != null) || (p.valueFlat != null)))
        return next(new Error('הזן valuePercent או valueFlat'));
      break;
    case 'shipping':
      if (!(p.freeShipping === true && p.minSubtotal != null))
        return next(new Error('נדרשים freeShipping=true ו־minSubtotal'));
      break;
    case 'bundle':
      if (!Array.isArray(p.bundleProductIds) || p.bundleProductIds.length === 0)
        return next(new Error('בחר מוצרי חבילה'));
      if (!(p.fixedPrice >= 0))
        return next(new Error('fixedPrice נדרש'));
      break;
    case 'firstPurchase':
      if (!((p.valuePercent != null) || (p.valueFlat != null)))
        return next(new Error('הזן valuePercent או valueFlat'));
      break;
    case 'coupon':
      if (!p.code) return next(new Error('יש להזין code'));
      if (!((p.valuePercent != null) || (p.valueFlat != null)))
        return next(new Error('הזן valuePercent או valueFlat'));
      break;
  }

  next();
});

/** תאימות לאחור:
 * אם הגיעו discountType/value – נרמול ל־type + valuePercent/valueFlat
 */
promotionSchema.pre('save', function(next){
  if (!this.type && this.discountType) this.type = this.discountType;
  if (this.value != null) {
    if ((this.type || this.discountType) === 'percentage' && this.valuePercent == null) {
      this.valuePercent = this.value;
    }
    if ((this.type || this.discountType) === 'flat' && this.valueFlat == null) {
      this.valueFlat = this.value;
    }
  }
  next();
});

module.exports = mongoose.models.Promotion || mongoose.model('Promotion', promotionSchema);
