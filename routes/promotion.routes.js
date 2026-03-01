const router = require('express').Router()
const { auth, admin } = require('../middlewares/auth')
const Promotion = require('../models/Promotion')

router.get('/', async (req, res, next) => {
  try { res.json(await Promotion.find().sort({ createdAt: -1 })) } catch (e) { next(e) }
})
router.post('/', auth, admin, async (req, res, next) => {
  try { res.status(201).json(await Promotion.create(req.body)) } catch (e) { next(e) }
})
router.put('/:id', auth, admin, async (req, res, next) => {
  try { res.json(await Promotion.findByIdAndUpdate(req.params.id, req.body, { new: true })) } catch (e) { next(e) }
})
router.delete('/:id', auth, admin, async (req, res, next) => {
  try { await Promotion.findByIdAndDelete(req.params.id); res.json({ ok:true }) } catch (e) { next(e) }
})
module.exports = router
