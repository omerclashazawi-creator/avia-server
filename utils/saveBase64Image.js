const fs = require('fs')
const path = require('path')

module.exports = function saveBase64Image(dataUri, subdir = 'products') {
  // data:image/png;base64,AAAA...
  const m = /^data:(.+);base64,(.+)$/i.exec(dataUri || '')
  if (!m) throw new Error('Invalid data URI')
  const mime = m[1]
  const base64 = m[2]
  const ext = (mime.split('/')[1] || 'png').replace(/[^\w]/g, '')
  const buf = Buffer.from(base64, 'base64')

  const dir = path.join(__dirname, '..', 'uploads', subdir)
  fs.mkdirSync(dir, { recursive: true })
  const name = `${Date.now()}-${Math.random().toString(36).slice(2,8)}.${ext}`
  const filePath = path.join(dir, name)
  fs.writeFileSync(filePath, buf)

  // URL ציבורי
  return `/uploads/${subdir}/${name}`
}
