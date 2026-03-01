const router = require('express').Router()
const { auth, admin } = require('../middlewares/auth')
const Order = require('../models/Order')

router.post('/', auth, async (req, res, next) => {
  try { res.status(201).json(await Order.create({ ...req.body, user: req.user.id })) } catch (e) { next(e) }
})

router.get('/me', auth, async (req, res, next) => {
  try { res.json(await Order.find({ user: req.user.id }).sort({ createdAt: -1 })) } catch (e) { next(e) }
})

router.get('/', auth, admin, async (req, res, next) => {
  try {
    const list = await Order.find().sort({ createdAt: -1 }).populate('user','name email').populate('items.product','title')
    res.json(list)
  } catch (e) { next(e) }
})

router.put('/:id/status', auth, admin, async (req, res, next) => {
  try {
    const updated = await Order.findByIdAndUpdate(req.params.id, { status: req.body.status }, { new: true })
    res.json(updated)
  } catch (e) { next(e) }
})

module.exports = router
