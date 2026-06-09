const jwt = require('jsonwebtoken')

module.exports = (req, res, next) => {
  // 1. Get token from request header
  const authHeader = req.headers.authorization

  // 2. Check if token exists
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ message: 'No token, access denied' })
  }

  // 3. Extract token (remove "Bearer " prefix)
  const token = authHeader.split(' ')[1]

  try {
    // 4. Verify token is valid and not expired
    const decoded = jwt.verify(token, process.env.JWT_SECRET)

    // 5. Attach user info to request
    req.user = decoded

    // 6. Move on to the actual route
    next()
  } catch (err) {
    res.status(401).json({ message: 'Invalid token' })
  }
}