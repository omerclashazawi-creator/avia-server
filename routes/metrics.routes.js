const router = require('express').Router()
const { auth, admin } = require('../middlewares/auth')
const Product = require('../models/Product')
const Order = require('../models/Order')
const Visit = require('../models/Visit')

router.post('/visit', async (req, res, next) => {
  try {
    const ip = req.headers['x-forwarded-for']?.split(',')[0]?.trim() || req.socket.remoteAddress
    const ua = req.headers['user-agent'] || ''
    const { path, ref } = req.body || {}
    await Visit.create({ path, ref, ua, ip })
    res.status(201).json({ ok: true })
  } catch (e) { next(e) }
})

router.get('/', auth, admin, async (req, res, next) => {
  try {
    const PAID = ['paid','shipped','completed']
    const tz = 'Asia/Jerusalem'
    const since = new Date()
    since.setHours(0,0,0,0)
    since.setDate(since.getDate() - 6)

    const [
      productsCount,
      salesCount,
      revenueAgg,
      stockAgg,
      shipmentsDone,
      shipmentsInProgress,
      topRated,
      visitsTotal,
      visitsTrend,
      ordersTrend
    ] = await Promise.all([
      Product.countDocuments({}),
      Order.countDocuments({ status: { $in: PAID } }),
      Order.aggregate([
        { $match: { status: { $in: PAID } } },
        { $group: { _id: null, total: { $sum: '$total' } } }
      ]),
      Product.aggregate([
        { $match: { isActive: true } },
        { $group: { _id: null, stock: { $sum: '$stock' } } }
      ]),
      Order.countDocuments({ status: 'completed' }),
      Order.countDocuments({ status: { $in: ['paid','shipped'] } }),
      Product.find({ isActive: true })
        .sort({ ratingAvg: -1, ratingCount: -1 })
        .limit(5)
        .select('title slug price images ratingAvg ratingCount stock'),
      Visit.estimatedDocumentCount(),
      Visit.aggregate([
        { $match: { createdAt: { $gte: since } } },
        { $group: {
            _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt', timezone: tz } },
            count: { $sum: 1 }
        } },
        { $sort: { _id: 1 } }
      ]),
      Order.aggregate([
        { $match: { createdAt: { $gte: since }, status: { $in: PAID } } },
        { $group: {
            _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt', timezone: tz } },
            count: { $sum: 1 }
        } },
        { $sort: { _id: 1 } }
      ])
    ])

    const revenue = revenueAgg[0]?.total || 0
    const stockUnits = stockAgg[0]?.stock || 0

    const fill7 = (rows=[]) => {
      const map = new Map(rows.map(r => [r._id, r.count]))
      const out = []
      for (let i = 6; i >= 0; i--) {
        const d = new Date()
        d.setHours(0,0,0,0)
        d.setDate(d.getDate() - i)
        const key = d.toISOString().slice(0,10)
        out.push({ _id: key, count: map.get(key) || 0 })
      }
      return out
    }

    res.json({
      products: productsCount,
      sales: salesCount,
      revenue,
      stockUnits,
      shipments: {
        done: shipmentsDone,
        inProgress: shipmentsInProgress
      },
      topRated,
      visits: {
        total: visitsTotal,
        trend: fill7(visitsTrend)
      },
      ordersTrend: fill7(ordersTrend)
    })
  } catch (e) { next(e) }
})

module.exports = router
