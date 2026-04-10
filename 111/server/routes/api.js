import express from 'express'
import bcrypt from 'bcrypt'
import { pool } from '../../config/db.js'
import { signUserToken } from '../middleware/auth.js'
import adminRoutes from './adminRoutes.js'
import userRoutes from './userRoutes.js'
import videoContestRoutes from './videoContestRoutes.js'
import redFlagCultureRoutes from './redFlagCultureRoutes.js'
import publicWelfareRoutes from './publicWelfareRoutes.js'
import skillTeachingRoutes from './skillTeachingRoutes.js'
import interactionRoutes from './interactionRoutes.js'
import contactRoutes from './contactRoutes.js'
import embContestRoutes from './embContestRoutes.js'

const router = express.Router()

function buildUserEmail(username, phone) {
  return `${phone || username}@xhq.local`
}

router.use('/admin', adminRoutes)
router.use('/video-contest', videoContestRoutes)
router.use('/red-culture', redFlagCultureRoutes)
router.use('/public-welfare', publicWelfareRoutes)
router.use('/skill-teaching', skillTeachingRoutes)
router.use('/interaction', interactionRoutes)
router.use('/contact', contactRoutes)
router.use('/user', userRoutes)
router.use('/emb-contest', embContestRoutes)

router.post('/auth/register', async (req, res) => {
  const { username, password, phone } = req.body

  if (!username || !password || !phone) {
    return res.status(400).json({ success: false, message: '请填写完整的注册信息' })
  }

  try {
    const email = buildUserEmail(username, phone)
    const [existing] = await pool.query(
      'SELECT id FROM users WHERE username = ? OR phone = ? OR email = ?',
      [username, phone, email],
    )

    if (existing.length > 0) {
      return res.status(400).json({ success: false, message: '用户名、手机号或邮箱已被占用' })
    }

    const hashedPassword = await bcrypt.hash(password, 10)
    await pool.query(
      `
        INSERT INTO users (username, email, password_hash, display_name, phone, role, status)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `,
      [username, email, hashedPassword, username, phone, 'user', 'active'],
    )

    return res.json({ success: true, message: '账号注册成功，请前往登录' })
  } catch (error) {
    console.error('register error:', error)
    return res.status(500).json({ success: false, message: '服务器繁忙，注册失败' })
  }
})

router.post('/auth/login', async (req, res) => {
  const { username, password } = req.body

  if (!username || !password) {
    return res.status(400).json({ success: false, message: '请输入用户名和密码' })
  }

  try {
    const [rows] = await pool.query('SELECT * FROM users WHERE username = ?', [username])
    const user = rows[0]

    if (!user) {
      return res.status(400).json({ success: false, message: '用户不存在' })
    }

    if (user.status && user.status !== 'active') {
      return res.status(403).json({ success: false, message: '当前账号状态不可登录' })
    }

    const isMatch = await bcrypt.compare(password, user.password_hash)
    if (!isMatch) {
      return res.status(400).json({ success: false, message: '密码错误' })
    }

    await pool.query('UPDATE users SET last_login_at = NOW() WHERE id = ?', [user.id])

    const token = signUserToken(user)

    return res.json({
      success: true,
      message: '欢迎回来，登录成功',
      data: {
        token,
        user: {
          id: user.id,
          username: user.username,
          role: user.role,
          display_name: user.display_name,
          phone: user.phone,
        },
      },
    })
  } catch (error) {
    console.error('login error:', error)
    return res.status(500).json({ success: false, message: '登录请求处理失败' })
  }
})

router.get('/health', (req, res) => {
  res.json({ status: 'healthy', timestamp: new Date().toISOString() })
})

router.get('/home/overview', async (req, res) => {
  try {
    const [
      [usersCount],
      [cultureCount],
      [welfareCount],
      [courseCount],
      [topicCount],
      [cultureLatest],
      [welfareLatest],
      [courseLatest],
      [topicLatest],
    ] = await Promise.all([
      pool.query('SELECT COUNT(*) AS total FROM users'),
      pool.query("SELECT COUNT(*) AS total FROM red_culture_history WHERE status = 'published'"),
      pool.query('SELECT COUNT(*) AS total FROM public_welfare_activities'),
      pool.query("SELECT COUNT(*) AS total FROM skill_teaching_courses WHERE status = 'published'"),
      pool.query("SELECT COUNT(*) AS total FROM forum_topics WHERE status = 'active'"),
      pool.query(`
        SELECT id, title, created_at, 'culture' AS category
        FROM red_culture_history
        WHERE status = 'published'
        ORDER BY COALESCE(published_at, created_at) DESC
        LIMIT 3
      `),
      pool.query(`
        SELECT id, title, created_at, status, 'welfare' AS category
        FROM public_welfare_activities
        ORDER BY created_at DESC
        LIMIT 3
      `),
      pool.query(`
        SELECT id, title, created_at, status, 'course' AS category
        FROM skill_teaching_courses
        ORDER BY COALESCE(published_at, created_at) DESC
        LIMIT 3
      `),
      pool.query(`
        SELECT id, title, created_at, replies_count, 'topic' AS category
        FROM forum_topics
        WHERE status = 'active'
        ORDER BY created_at DESC
        LIMIT 3
      `),
    ])

    return res.json({
      success: true,
      data: {
        overview: {
          users: Number(usersCount[0]?.total || 0),
          culture: Number(cultureCount[0]?.total || 0),
          welfare: Number(welfareCount[0]?.total || 0),
          courses: Number(courseCount[0]?.total || 0),
          topics: Number(topicCount[0]?.total || 0),
        },
        latest: [...cultureLatest, ...welfareLatest, ...courseLatest, ...topicLatest]
          .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
          .slice(0, 6),
      },
    })
  } catch (error) {
    console.error('home overview error:', error)
    return res.status(500).json({ success: false, message: '首页数据加载失败' })
  }
})

router.get('/announcements', async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM announcements ORDER BY created_at DESC')
    return res.json({ success: true, data: rows })
  } catch (error) {
    console.error('get announcements error:', error)
    return res.status(500).json({ success: false, message: '无法加载公告' })
  }
})

export default router
