const mongoose = require('mongoose');
const { Schema } = mongoose;

const orderSchema = new Schema({
  user: { type: Schema.Types.ObjectId, ref: 'User' },
  items: [{
    product: { type: Schema.Types.ObjectId, ref: 'Product' },
    qty: Number,
    price: Number
  }],
  total: Number,
  status: { type: String, enum: ['pending','paid','shipped','completed','canceled'], default: 'pending' },
  deliveryMethod: { type: String, enum: ['delivery','pickup'], default: 'delivery' },
  address: String
}, { timestamps: true });

module.exports = mongoose.models.Order || mongoose.model('Order', orderSchema);
