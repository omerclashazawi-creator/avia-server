const router = require('express').Router()
const bcrypt = require("bcryptjs")
const jwt = require('jsonwebtoken')
const User = require('../models/User')

router.post('/register', async (req, res, next) => {
  try {
    const { name, email, password } = req.body
    if (!name || !email || !password) return res.status(400).json({ message: 'Missing fields' })
    const exists = await User.findOne({ email })
    if (exists) return res.status(409).json({ message: 'Email taken' })
    const passwordHash = await bcrypt.hash(password, 10)
    const user = await User.create({ name, email, passwordHash })
    res.status(201).json({ id: user._id })
  } catch (e) { next(e) }
})

router.post('/login', async (req, res, next) => {
  try {
    const { email, password } = req.body
    const user = await User.findOne({ email })
    if (!user) return res.status(401).json({ message: 'Invalid credentials' })
    const ok = await bcrypt.compare(password, user.passwordHash)
    if (!ok) return res.status(401).json({ message: 'Invalid credentials' })
    const token = jwt.sign({ id: user._id, role: user.role, email: user.email }, process.env.JWT_SECRET, { expiresIn: '7d' })
    res.json({ token })
  } catch (e) { next(e) }
})

router.get('/me', require('../middlewares/auth').auth, async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id).select('_id name email role')
    res.json(user)
  } catch (e) { next(e) }
})

module.exports = router
