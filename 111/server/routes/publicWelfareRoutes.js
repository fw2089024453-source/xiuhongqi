import express from 'express'
import multer from 'multer'
import path from 'path'
import { fileURLToPath } from 'url'
import { pool } from '../../config/db.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const router = express.Router()

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, path.join(__dirname, '../../public/uploads')),
  filename: (req, file, cb) =>
    cb(null, `welfare_${Date.now()}_${Math.round(Math.random() * 1000)}${path.extname(file.originalname)}`),
})

const upload = multer({ storage })
const uploadMulti = multer({ storage }).array('images', 9)

router.get('/activities', async (req, res) => {
  try {
    const [rows] = await pool.query(`
      SELECT
        id,
        title,
        description,
        detailed_content,
        start_date,
        end_date,
        location,
        organizer,
        contact_info,
        participant_count,
        target_participants,
        cover_image AS image_url,
        gallery_images,
        status,
        created_at
      FROM public_welfare_activities
      ORDER BY created_at DESC
    `)

    res.json({ success: true, data: rows })
  } catch (error) {
    console.error('public welfare activities error:', error)
    res.status(500).json({ success: false, message: '获取公益活动失败' })
  }
})

router.post('/activities', upload.single('image'), async (req, res) => {
  try {
    const {
      title,
      description,
      detailed_content,
      start_date,
      end_date,
      location,
      organizer,
      contact_info,
      target_participants,
      status,
    } = req.body

    const imageUrl = req.file ? `/uploads/${req.file.filename}` : ''

    await pool.query(
      `
      INSERT INTO public_welfare_activities
        (title, description, detailed_content, start_date, end_date, location, organizer, contact_info, target_participants, cover_image, status)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `,
      [
        title,
        description,
        detailed_content || null,
        start_date || null,
        end_date || null,
        location || null,
        organizer || null,
        contact_info || null,
        target_participants || null,
        imageUrl,
        status || 'planning',
      ],
    )

    res.json({ success: true, message: '公益活动发布成功' })
  } catch (error) {
    console.error('create welfare activity error:', error)
    res.status(500).json({ success: false, message: '公益活动发布失败' })
  }
})

router.put('/activities/:id', upload.single('image'), async (req, res) => {
  try {
    const {
      title,
      description,
      detailed_content,
      start_date,
      end_date,
      location,
      organizer,
      contact_info,
      target_participants,
      status,
    } = req.body

    if (req.file) {
      await pool.query(
        `
        UPDATE public_welfare_activities
        SET title = ?, description = ?, detailed_content = ?, start_date = ?, end_date = ?, location = ?, organizer = ?, contact_info = ?, target_participants = ?, cover_image = ?, status = ?
        WHERE id = ?
        `,
        [
          title,
          description,
          detailed_content || null,
          start_date || null,
          end_date || null,
          location || null,
          organizer || null,
          contact_info || null,
          target_participants || null,
          `/uploads/${req.file.filename}`,
          status || 'planning',
          req.params.id,
        ],
      )
    } else {
      await pool.query(
        `
        UPDATE public_welfare_activities
        SET title = ?, description = ?, detailed_content = ?, start_date = ?, end_date = ?, location = ?, organizer = ?, contact_info = ?, target_participants = ?, status = ?
        WHERE id = ?
        `,
        [
          title,
          description,
          detailed_content || null,
          start_date || null,
          end_date || null,
          location || null,
          organizer || null,
          contact_info || null,
          target_participants || null,
          status || 'planning',
          req.params.id,
        ],
      )
    }

    res.json({ success: true, message: '公益活动更新成功' })
  } catch (error) {
    console.error('update welfare activity error:', error)
    res.status(500).json({ success: false, message: '公益活动更新失败' })
  }
})

router.delete('/activities/:id', async (req, res) => {
  try {
    await pool.query('DELETE FROM public_welfare_activities WHERE id = ?', [req.params.id])
    res.json({ success: true, message: '删除成功' })
  } catch (error) {
    console.error('delete welfare activity error:', error)
    res.status(500).json({ success: false, message: '删除失败' })
  }
})

router.get('/volunteers', async (req, res) => {
  try {
    const [rows] = await pool.query(`
      SELECT *
      FROM public_welfare_volunteers
      ORDER BY sort_order ASC, created_at DESC
    `)

    res.json({ success: true, data: rows })
  } catch (error) {
    console.error('public welfare volunteers error:', error)
    res.status(500).json({ success: false, message: '获取志愿者失败' })
  }
})

router.post('/volunteers', upload.single('avatar'), async (req, res) => {
  try {
    const { name, role, quote, introduction, stat_years, stat_projects, stat_people, sort_order } = req.body
    const avatarUrl = req.file ? `/uploads/${req.file.filename}` : ''

    await pool.query(
      `
      INSERT INTO public_welfare_volunteers
        (name, role, quote, introduction, stat_years, stat_projects, stat_people, avatar_url, sort_order)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `,
      [
        name,
        role,
        quote || null,
        introduction || null,
        stat_years || 0,
        stat_projects || 0,
        stat_people || 0,
        avatarUrl,
        sort_order || 0,
      ],
    )

    res.json({ success: true, message: '志愿者故事发布成功' })
  } catch (error) {
    console.error('create welfare volunteer error:', error)
    res.status(500).json({ success: false, message: '志愿者故事发布失败' })
  }
})

router.put('/volunteers/:id', upload.single('avatar'), async (req, res) => {
  try {
    const { name, role, quote, introduction, stat_years, stat_projects, stat_people, sort_order } = req.body

    if (req.file) {
      await pool.query(
        `
        UPDATE public_welfare_volunteers
        SET name = ?, role = ?, quote = ?, introduction = ?, stat_years = ?, stat_projects = ?, stat_people = ?, avatar_url = ?, sort_order = ?
        WHERE id = ?
        `,
        [
          name,
          role,
          quote || null,
          introduction || null,
          stat_years || 0,
          stat_projects || 0,
          stat_people || 0,
          `/uploads/${req.file.filename}`,
          sort_order || 0,
          req.params.id,
        ],
      )
    } else {
      await pool.query(
        `
        UPDATE public_welfare_volunteers
        SET name = ?, role = ?, quote = ?, introduction = ?, stat_years = ?, stat_projects = ?, stat_people = ?, sort_order = ?
        WHERE id = ?
        `,
        [
          name,
          role,
          quote || null,
          introduction || null,
          stat_years || 0,
          stat_projects || 0,
          stat_people || 0,
          sort_order || 0,
          req.params.id,
        ],
      )
    }

    res.json({ success: true, message: '志愿者故事更新成功' })
  } catch (error) {
    console.error('update welfare volunteer error:', error)
    res.status(500).json({ success: false, message: '志愿者故事更新失败' })
  }
})

router.delete('/volunteers/:id', async (req, res) => {
  try {
    await pool.query('DELETE FROM public_welfare_volunteers WHERE id = ?', [req.params.id])
    res.json({ success: true, message: '删除成功' })
  } catch (error) {
    console.error('delete welfare volunteer error:', error)
    res.status(500).json({ success: false, message: '删除失败' })
  }
})

router.get('/timelines', async (req, res) => {
  try {
    const [rows] = await pool.query(`
      SELECT *
      FROM public_welfare_timelines
      ORDER BY year ASC, sort_order ASC, created_at ASC
    `)

    res.json({ success: true, data: rows })
  } catch (error) {
    console.error('public welfare timelines error:', error)
    res.status(500).json({ success: false, message: '获取公益历程失败' })
  }
})

router.post('/timelines', uploadMulti, async (req, res) => {
  try {
    const { year, event_name, title, description, sort_order } = req.body
    const imageUrls = req.files?.length ? req.files.map((file) => `/uploads/${file.filename}`) : []

    await pool.query(
      `
      INSERT INTO public_welfare_timelines
        (year, event_name, title, description, image_urls, sort_order)
      VALUES (?, ?, ?, ?, ?, ?)
      `,
      [year || null, event_name || null, title, description || null, JSON.stringify(imageUrls), sort_order || 0],
    )

    res.json({ success: true, message: '公益历程发布成功' })
  } catch (error) {
    console.error('create welfare timeline error:', error)
    res.status(500).json({ success: false, message: '公益历程发布失败' })
  }
})

router.put('/timelines/:id', uploadMulti, async (req, res) => {
  try {
    const { year, event_name, title, description, sort_order } = req.body

    if (req.files?.length) {
      const imageUrls = req.files.map((file) => `/uploads/${file.filename}`)
      await pool.query(
        `
        UPDATE public_welfare_timelines
        SET year = ?, event_name = ?, title = ?, description = ?, image_urls = ?, sort_order = ?
        WHERE id = ?
        `,
        [year || null, event_name || null, title, description || null, JSON.stringify(imageUrls), sort_order || 0, req.params.id],
      )
    } else {
      await pool.query(
        `
        UPDATE public_welfare_timelines
        SET year = ?, event_name = ?, title = ?, description = ?, sort_order = ?
        WHERE id = ?
        `,
        [year || null, event_name || null, title, description || null, sort_order || 0, req.params.id],
      )
    }

    res.json({ success: true, message: '公益历程更新成功' })
  } catch (error) {
    console.error('update welfare timeline error:', error)
    res.status(500).json({ success: false, message: '公益历程更新失败' })
  }
})

router.delete('/timelines/:id', async (req, res) => {
  try {
    await pool.query('DELETE FROM public_welfare_timelines WHERE id = ?', [req.params.id])
    res.json({ success: true, message: '删除成功' })
  } catch (error) {
    console.error('delete welfare timeline error:', error)
    res.status(500).json({ success: false, message: '删除失败' })
  }
})

export default router
