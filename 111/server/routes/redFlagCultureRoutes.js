import express from 'express'
import { pool } from '../../config/db.js'
import multer from 'multer'
import path from 'path'

const router = express.Router()

const storage = multer.diskStorage({
  destination(req, file, cb) {
    cb(null, 'public/uploads/')
  },
  filename(req, file, cb) {
    cb(null, `${file.fieldname}_${Date.now()}${path.extname(file.originalname)}`)
  },
})

const upload = multer({ storage })

router.get('/galleries', async (req, res) => {
  try {
    const [rows] = await pool.query(`
      SELECT
        id,
        title,
        content AS description,
        image_url,
        author,
        year,
        location,
        views_count,
        likes_count,
        created_at
      FROM red_culture_stories
      WHERE status IN ('published', 'archived')
      ORDER BY COALESCE(published_at, created_at) DESC
    `)

    res.json({ success: true, data: rows })
  } catch (error) {
    console.error('red culture galleries error:', error)
    res.status(500).json({ success: false, message: '获取红旗故事失败' })
  }
})

router.post(
  '/galleries',
  upload.fields([
    { name: 'image', maxCount: 1 },
    { name: 'qr_code', maxCount: 1 },
  ]),
  async (req, res) => {
    try {
      const { title, description, author, year, location } = req.body
      const imageUrl = req.files?.image?.[0] ? `/uploads/${req.files.image[0].filename}` : ''

      await pool.query(
        `
        INSERT INTO red_culture_stories
          (title, content, author, year, location, image_url, status, published_at)
        VALUES (?, ?, ?, ?, ?, ?, 'published', NOW())
        `,
        [title, description, author || null, year || null, location || null, imageUrl],
      )

      res.json({ success: true, message: '红旗故事发布成功' })
    } catch (error) {
      console.error('create red culture gallery error:', error)
      res.status(500).json({ success: false, message: '红旗故事发布失败' })
    }
  },
)

router.delete('/galleries/:id', async (req, res) => {
  try {
    await pool.query('DELETE FROM red_culture_stories WHERE id = ?', [req.params.id])
    res.json({ success: true, message: '删除成功' })
  } catch (error) {
    console.error('delete red culture gallery error:', error)
    res.status(500).json({ success: false, message: '删除失败' })
  }
})

router.get('/timelines', async (req, res) => {
  try {
    const [rows] = await pool.query(`
      SELECT
        id,
        year,
        COALESCE(location, '历史节点') AS event_name,
        title,
        content AS description,
        image_url,
        created_at
      FROM red_culture_history
      WHERE status IN ('published', 'archived')
      ORDER BY year ASC, created_at ASC
    `)

    res.json({ success: true, data: rows })
  } catch (error) {
    console.error('red culture timelines error:', error)
    res.status(500).json({ success: false, message: '获取红旗历程失败' })
  }
})

router.post('/timelines', upload.single('image'), async (req, res) => {
  try {
    const { year, event_name, title, description } = req.body
    const imageUrl = req.file ? `/uploads/${req.file.filename}` : ''

    await pool.query(
      `
      INSERT INTO red_culture_history
        (title, content, year, location, image_url, status, published_at)
      VALUES (?, ?, ?, ?, ?, 'published', NOW())
      `,
      [title, description, year || null, event_name || null, imageUrl],
    )

    res.json({ success: true, message: '历史节点发布成功' })
  } catch (error) {
    console.error('create red culture timeline error:', error)
    res.status(500).json({ success: false, message: '历史节点发布失败' })
  }
})

router.delete('/timelines/:id', async (req, res) => {
  try {
    await pool.query('DELETE FROM red_culture_history WHERE id = ?', [req.params.id])
    res.json({ success: true, message: '删除成功' })
  } catch (error) {
    console.error('delete red culture timeline error:', error)
    res.status(500).json({ success: false, message: '删除失败' })
  }
})

router.get('/quotes', async (req, res) => {
  try {
    const [rows] = await pool.query(`
      SELECT
        id,
        title AS author_name,
        '红旗精神' AS author_title,
        content AS quote,
        icon_url AS avatar_url,
        created_at
      FROM red_culture_spirit
      WHERE status IN ('published', 'archived')
      ORDER BY COALESCE(published_at, created_at) DESC
    `)

    res.json({ success: true, data: rows })
  } catch (error) {
    console.error('red culture quotes error:', error)
    res.status(500).json({ success: false, message: '获取精神语录失败' })
  }
})

router.post('/quotes', upload.single('avatar'), async (req, res) => {
  try {
    const { author_name, quote } = req.body
    const avatarUrl = req.file ? `/uploads/${req.file.filename}` : ''

    await pool.query(
      `
      INSERT INTO red_culture_spirit
        (title, content, icon_url, status, published_at)
      VALUES (?, ?, ?, 'published', NOW())
      `,
      [author_name, quote, avatarUrl],
    )

    res.json({ success: true, message: '精神语录发布成功' })
  } catch (error) {
    console.error('create red culture quote error:', error)
    res.status(500).json({ success: false, message: '精神语录发布失败' })
  }
})

router.delete('/quotes/:id', async (req, res) => {
  try {
    await pool.query('DELETE FROM red_culture_spirit WHERE id = ?', [req.params.id])
    res.json({ success: true, message: '删除成功' })
  } catch (error) {
    console.error('delete red culture quote error:', error)
    res.status(500).json({ success: false, message: '删除失败' })
  }
})

export default router
