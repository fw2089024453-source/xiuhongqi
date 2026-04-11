import express from 'express'
import multer from 'multer'
import fs from 'fs'
import path from 'path'
import { pool } from '../../config/db.js'
import { optionalAuth, requireAuth } from '../middleware/auth.js'

const router = express.Router()

const storage = multer.diskStorage({
  destination(req, file, cb) {
    const dir = './public/uploads/embroidery'
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })
    cb(null, dir)
  },
  filename(req, file, cb) {
    cb(null, `emb_${Date.now()}_${Math.round(Math.random() * 1e6)}${path.extname(file.originalname)}`)
  },
})

const upload = multer({ storage }).array('images', 5)

router.get('/overview', async (req, res) => {
  try {
    const [[worksRows], [votesRows], [latestRows], [topRows], [categoryRows]] = await Promise.all([
      pool.query("SELECT COUNT(*) AS total FROM emb_works WHERE status = 'approved'"),
      pool.query('SELECT COALESCE(SUM(votes_count), 0) AS total FROM emb_works'),
      pool.query(`
        SELECT id, title, author_name, category, created_at, votes_count, image_url
        FROM emb_works
        WHERE status = 'approved'
        ORDER BY created_at DESC
        LIMIT 6
      `),
      pool.query(`
        SELECT id, title, author_name, votes_count, image_url
        FROM emb_works
        WHERE status = 'approved'
        ORDER BY votes_count DESC, created_at ASC
        LIMIT 3
      `),
      pool.query(`
        SELECT category, COUNT(*) AS count
        FROM emb_works
        WHERE status = 'approved' AND category IS NOT NULL AND category != ''
        GROUP BY category
        ORDER BY count DESC
      `),
    ])

    res.json({
      success: true,
      data: {
        summary: {
          works: Number(worksRows[0]?.total || 0),
          votes: Number(votesRows[0]?.total || 0),
        },
        latest: latestRows,
        topWorks: topRows,
        categories: categoryRows,
      },
    })
  } catch (error) {
    console.error('emb contest overview error:', error)
    res.status(500).json({ success: false, message: '绣红旗大赛概览加载失败' })
  }
})

router.post('/works', requireAuth, upload, async (req, res) => {
  try {
    const { title, description, category, phone } = req.body
    const authorId = req.user?.id || null
    const authorName = req.user?.display_name || req.user?.username || '平台用户'

    if (!title || !req.files?.length) {
      return res.status(400).json({ success: false, message: '请填写完整的作品信息并至少上传一张图片' })
    }

    const imageUrls = req.files.map((file) => `/uploads/embroidery/${file.filename}`)

    await pool.query(
      `
        INSERT INTO emb_works (
          title, description, image_url, author_id, author_name, category, phone, status
        ) VALUES (?, ?, ?, ?, ?, ?, ?, 'pending')
      `,
      [title, description || '', JSON.stringify(imageUrls), authorId, authorName, category || '', phone || ''],
    )

    res.status(201).json({ success: true, message: '作品提交成功，等待后台审核' })
  } catch (error) {
    console.error('emb contest create work error:', error)
    res.status(500).json({ success: false, message: '作品提交失败' })
  }
})

router.get('/works', optionalAuth, async (req, res) => {
  const { sort = 'hot', keyword = '', category = 'all', page = 1, limit = 8 } = req.query
  const currentUserId = Number(req.user?.id || 0)

  try {
    const offset = (Number(page) - 1) * Number(limit)
    const filters = ["w.status = 'approved'"]
    const params = []

    if (category && category !== 'all') {
      filters.push('w.category = ?')
      params.push(category)
    }

    if (keyword) {
      filters.push('(w.title LIKE ? OR w.author_name LIKE ?)')
      const searchValue = `%${keyword}%`
      params.push(searchValue, searchValue)
    }

    const orderBy = sort === 'new' ? 'w.created_at DESC' : 'w.votes_count DESC, w.created_at DESC'
    const whereClause = filters.join(' AND ')

    const [countRows] = await pool.query(`SELECT COUNT(*) AS total FROM emb_works w WHERE ${whereClause}`, params)
    const totalItems = countRows[0]?.total || 0
    const totalPages = Math.max(1, Math.ceil(totalItems / Number(limit)))

    const [rows] = await pool.query(
      `
        SELECT
          w.*,
          (SELECT COUNT(*) FROM emb_votes_record vr WHERE vr.work_id = w.id AND vr.user_id = ?) AS has_voted,
          (SELECT COUNT(*) FROM emb_comments c WHERE c.work_id = w.id) AS comment_count
        FROM emb_works w
        WHERE ${whereClause}
        ORDER BY ${orderBy}
        LIMIT ? OFFSET ?
      `,
      [currentUserId, ...params, Number(limit), offset],
    )

    res.json({
      success: true,
      data: {
        items: rows,
        totalPages,
        currentPage: Number(page),
        total: totalItems,
      },
    })
  } catch (error) {
    console.error('emb contest works error:', error)
    res.status(500).json({ success: false, message: '作品列表加载失败' })
  }
})

router.get('/top-works', async (req, res) => {
  try {
    const [rows] = await pool.query(`
      SELECT id, title, author_name, votes_count, image_url
      FROM emb_works
      WHERE status = 'approved'
      ORDER BY votes_count DESC, created_at ASC
      LIMIT 10
    `)

    res.json({ success: true, data: rows })
  } catch (error) {
    console.error('emb contest top works error:', error)
    res.status(500).json({ success: false, message: '榜单加载失败' })
  }
})

router.get('/works/:id/detail', async (req, res) => {
  try {
    const [rows] = await pool.query(
      `
        SELECT id, title, description, image_url, author_name, category, votes_count, views_count, created_at
        FROM emb_works
        WHERE id = ? AND status = 'approved'
        LIMIT 1
      `,
      [req.params.id],
    )

    if (!rows.length) {
      return res.status(404).json({ success: false, message: '作品不存在' })
    }

    await pool.query('UPDATE emb_works SET views_count = views_count + 1 WHERE id = ?', [req.params.id])
    res.json({ success: true, data: rows[0] })
  } catch (error) {
    console.error('emb contest work detail error:', error)
    res.status(500).json({ success: false, message: '作品详情加载失败' })
  }
})

router.post('/works/:id/vote', requireAuth, async (req, res) => {
  const userId = Number(req.user?.id || 0)

  if (!userId) {
    return res.status(401).json({ success: false, message: '请先登录后再投票' })
  }

  try {
    const [existingRows] = await pool.query(
      'SELECT id FROM emb_votes_record WHERE user_id = ? AND work_id = ? LIMIT 1',
      [userId, req.params.id],
    )

    if (existingRows.length) {
      return res.status(400).json({ success: false, message: '你已经为该作品投过票了' })
    }

    const [todayRows] = await pool.query(
      'SELECT COUNT(*) AS total FROM emb_votes_record WHERE user_id = ? AND DATE(created_at) = CURDATE()',
      [userId],
    )

    if ((todayRows[0]?.total || 0) >= 2) {
      return res.status(400).json({ success: false, message: '今日 2 次投票机会已用完，请明天再来' })
    }

    await pool.query('INSERT INTO emb_votes_record (user_id, work_id) VALUES (?, ?)', [userId, req.params.id])
    await pool.query('UPDATE emb_works SET votes_count = votes_count + 1 WHERE id = ?', [req.params.id])

    res.json({ success: true, message: '投票成功，感谢你的支持' })
  } catch (error) {
    console.error('emb contest vote error:', error)
    res.status(500).json({ success: false, message: '投票失败' })
  }
})

router.get('/works/:id/comments', optionalAuth, async (req, res) => {
  const userId = Number(req.user?.id || 0)

  try {
    const [rows] = await pool.query(
      `
        SELECT
          c.*,
          u.avatar_url,
          CASE WHEN ecl.id IS NULL THEN 0 ELSE 1 END AS is_liked
        FROM emb_comments c
        LEFT JOIN users u ON u.id = c.user_id
        LEFT JOIN emb_comment_likes ecl
          ON ecl.comment_id = c.id
          AND ecl.user_id = ?
        WHERE c.work_id = ?
        ORDER BY c.created_at DESC
      `,
      [userId, req.params.id],
    )

    res.json({ success: true, data: rows })
  } catch (error) {
    console.error('emb contest comments error:', error)
    res.status(500).json({ success: false, message: '评论列表加载失败' })
  }
})

router.post('/works/:id/comments', requireAuth, async (req, res) => {
  const { content } = req.body
  const userId = Number(req.user?.id || 0)
  const username = req.user?.display_name || req.user?.username || '平台用户'

  if (!content) {
    return res.status(400).json({ success: false, message: '请先登录并填写评论内容' })
  }

  try {
    await pool.query(
      'INSERT INTO emb_comments (work_id, user_id, username, content) VALUES (?, ?, ?, ?)',
      [req.params.id, userId, username, content],
    )

    res.json({ success: true, message: '评论发布成功' })
  } catch (error) {
    console.error('emb contest create comment error:', error)
    res.status(500).json({ success: false, message: '评论发布失败' })
  }
})

router.post('/works/comments/:id/like', requireAuth, async (req, res) => {
  const userId = Number(req.user?.id || 0)

  if (!userId) {
    return res.status(401).json({ success: false, message: '请先登录' })
  }

  try {
    const [existingRows] = await pool.query(
      'SELECT id FROM emb_comment_likes WHERE comment_id = ? AND user_id = ? LIMIT 1',
      [req.params.id, userId],
    )

    if (existingRows.length) {
      await pool.query('DELETE FROM emb_comment_likes WHERE comment_id = ? AND user_id = ?', [
        req.params.id,
        userId,
      ])
      await pool.query('UPDATE emb_comments SET likes_count = GREATEST(likes_count - 1, 0) WHERE id = ?', [
        req.params.id,
      ])
      return res.json({ success: true, action: 'unliked' })
    }

    await pool.query('INSERT INTO emb_comment_likes (comment_id, user_id) VALUES (?, ?)', [
      req.params.id,
      userId,
    ])
    await pool.query('UPDATE emb_comments SET likes_count = likes_count + 1 WHERE id = ?', [req.params.id])
    res.json({ success: true, action: 'liked' })
  } catch (error) {
    console.error('emb contest like comment error:', error)
    res.status(500).json({ success: false, message: '评论点赞失败' })
  }
})

export default router
