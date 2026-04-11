import jwt from 'jsonwebtoken'

const JWT_SECRET =
  process.env.JWT_SECRET || process.env.SESSION_SECRET || 'xiuhongqi_super_secret_key_2026'

function extractToken(req) {
  const authHeader = req.headers.authorization || ''

  if (!authHeader.startsWith('Bearer ')) {
    return ''
  }

  return authHeader.slice(7).trim()
}

export function signUserToken(user) {
  return jwt.sign(
    {
      id: user.id,
      username: user.username,
      display_name: user.display_name,
      role: user.role,
    },
    JWT_SECRET,
    { expiresIn: '24h' },
  )
}

export function optionalAuth(req, res, next) {
  const token = extractToken(req)

  if (!token) {
    return next()
  }

  try {
    req.user = jwt.verify(token, JWT_SECRET)
  } catch (error) {
    req.user = null
  }

  return next()
}

export function requireAuth(req, res, next) {
  const token = extractToken(req)

  if (!token) {
    return res.status(401).json({ success: false, message: '请先登录后再继续操作' })
  }

  try {
    req.user = jwt.verify(token, JWT_SECRET)
    return next()
  } catch (error) {
    return res.status(401).json({ success: false, message: '登录状态已失效，请重新登录' })
  }
}

export function requireAdmin(req, res, next) {
  return requireAuth(req, res, () => {
    if (!['admin', 'moderator'].includes(req.user?.role)) {
      return res.status(403).json({ success: false, message: '当前账号没有后台管理权限' })
    }

    return next()
  })
}
