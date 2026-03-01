require('dotenv').config()
const mongoose = require('mongoose')
const Product = require('../models/Product')
const Category = require('../models/Category')

async function run(){
  await mongoose.connect(process.env.MONGO_URI)

  const cur = Product.find({
    $or: [{ productType: { $exists: false } }, { productType: null }]
  }).cursor()

  let updated = 0
  for (let p = await cur.next(); p != null; p = await cur.next()){
    // משיכה של הקטגוריה כדי לגזור ממנה את ה-type וה-pet
    const c = p.category ? await Category.findById(p.category) : null
    const slug = c?.slug || ''

    // ברירת מחדל
    let productType = 'accessories'
    if (/-food$/.test(slug)) productType = 'food'
    else if (/-toys$/.test(slug)) productType = 'toys'
    else if (/-grooming$/.test(slug)) productType = 'grooming'

    // גיבוי ל-petType אם חסר
    let petType = p.petType
    if (!petType) {
      if (/^dogs-/.test(slug)) petType = 'dogs'
      else if (/^cats-/.test(slug)) petType = 'cats'
      else if (/^birds-/.test(slug)) petType = 'birds'
      else if (/^fish-/.test(slug)) petType = 'fish'
      else petType = 'other'
    }

    p.productType = productType
    p.petType = petType
    await p.save()
    updated++
  }

  console.log('✅ Backfill done. Updated docs:', updated)
  await mongoose.disconnect()
  process.exit(0)
}

run().catch(e=>{ console.error(e); process.exit(1) })
