const { Schema, model } = require('mongoose')

const visitSchema = new Schema({
  path: String,
  ref: String,
  ua: String,
  ip: String
}, { timestamps: true })

module.exports = model('Visit', visitSchema)