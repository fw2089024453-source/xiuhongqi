import express from 'express'
import multer from 'multer'
import path from 'path'
import { fileURLToPath } from 'url'
import { pool } from '../../config/db.js'
import { requireAdmin } from '../middleware/auth.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const router = express.Router()

const ACTIVITY_STATUSES = ['planning', 'ongoing', 'completed', 'cancelled']

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, path.join(__dirname, '../../public/uploads')),
  filename: (req, file, cb) =>
    cb(null, `welfare_${Date.now()}_${Math.round(Math.random() * 1000)}${path.extname(file.originalname)}`),
})

const upload = multer({ storage })
const uploadMulti = multer({ storage }).array('images', 9)

function normalizeText(value) {
  return String(value || '').trim()
}

function normalizeNullableText(value) {
  const text = normalizeText(value)
  return text || null
}

function normalizeNullableNumber(value) {
  if (value === '' || value === null || value === undefined) return null
  const number = Number(value)
  return Number.isFinite(number) ? number : null
}

function normalizeStatus(value) {
  return ACTIVITY_STATUSES.includes(value) ? value : 'planning'
}

function buildAssetUrl(file) {
  return file ? `/uploads/${file.filename}` : ''
}

function normalizeJsonArray(value) {
  if (!value) return []
  if (Array.isArray(value)) return value.map((item) => normalizeText(item)).filter(Boolean)

  try {
    const parsed = JSON.parse(value)
    return Array.isArray(parsed) ? parsed.map((item) => normalizeText(item)).filter(Boolean) : []
  } catch {
    return String(value)
      .split(/\r?\n/)
      .map((item) => normalizeText(item))
      .filter(Boolean)
  }
}

async function findById(tableName, id) {
  const [rows] = await pool.query(`SELECT * FROM ${tableName} WHERE id = ? LIMIT 1`, [id])
  return rows[0] || null
}

async function listActivities(req, res) {
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
        created_at,
        updated_at
      FROM public_welfare_activities
      ORDER BY created_at DESC
    `)

    res.json({ success: true, data: rows })
  } catch (error) {
    console.error('public welfare activities error:', error)
    res.status(500).json({ success: false, message: 'Failed to load public welfare activities' })
  }
}

router.get('/activities', listActivities)
router.get('/admin/activities', requireAdmin, listActivities)

async function createActivity(req, res) {
  const title = normalizeText(req.body.title)
  const description = normalizeText(req.body.description)

  if (!title || !description) {
    return res.status(400).json({ success: false, message: 'Title and description are required' })
  }

  try {
    const imageUrl = buildAssetUrl(req.file) || normalizeText(req.body.image_url)
    const galleryImages = normalizeJsonArray(req.body.gallery_images)

    await pool.query(
      `
        INSERT INTO public_welfare_activities
          (
            title,
            description,
            detailed_content,
            start_date,
            end_date,
            location,
            organizer,
            contact_info,
            target_participants,
            cover_image,
            gallery_images,
            status,
            created_by
          )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `,
      [
        title,
        description,
        normalizeNullableText(req.body.detailed_content),
        normalizeNullableText(req.body.start_date),
        normalizeNullableText(req.body.end_date),
        normalizeNullableText(req.body.location),
        normalizeNullableText(req.body.organizer),
        normalizeNullableText(req.body.contact_info),
        normalizeNullableNumber(req.body.target_participants),
        imageUrl || null,
        galleryImages.length ? JSON.stringify(galleryImages) : null,
        normalizeStatus(req.body.status),
        Number(req.user?.id || 0) || null,
      ],
    )

    res.json({ success: true, message: 'Activity created successfully' })
  } catch (error) {
    console.error('create welfare activity error:', error)
    res.status(500).json({ success: false, message: 'Failed to create activity' })
  }
}

async function updateActivity(req, res) {
  const title = normalizeText(req.body.title)
  const description = normalizeText(req.body.description)

  if (!title || !description) {
    return res.status(400).json({ success: false, message: 'Title and description are required' })
  }

  try {
    const existing = await findById('public_welfare_activities', req.params.id)

    if (!existing) {
      return res.status(404).json({ success: false, message: 'Activity not found' })
    }

    const imageUrl =
      buildAssetUrl(req.file) ||
      (req.body.image_url !== undefined ? normalizeText(req.body.image_url) : existing.cover_image)
    const galleryImages =
      req.body.gallery_images !== undefined
        ? normalizeJsonArray(req.body.gallery_images)
        : normalizeJsonArray(existing.gallery_images)

    await pool.query(
      `
        UPDATE public_welfare_activities
        SET title = ?, description = ?, detailed_content = ?, start_date = ?, end_date = ?, location = ?, organizer = ?, contact_info = ?,
            target_participants = ?, cover_image = ?, gallery_images = ?, status = ?
        WHERE id = ?
      `,
      [
        title,
        description,
        normalizeNullableText(req.body.detailed_content),
        normalizeNullableText(req.body.start_date),
        normalizeNullableText(req.body.end_date),
        normalizeNullableText(req.body.location),
        normalizeNullableText(req.body.organizer),
        normalizeNullableText(req.body.contact_info),
        normalizeNullableNumber(req.body.target_participants),
        imageUrl || null,
        galleryImages.length ? JSON.stringify(galleryImages) : null,
        normalizeStatus(req.body.status || existing.status),
        req.params.id,
      ],
    )

    res.json({ success: true, message: 'Activity updated successfully' })
  } catch (error) {
    console.error('update welfare activity error:', error)
    res.status(500).json({ success: false, message: 'Failed to update activity' })
  }
}

router.post(['/activities', '/admin/activities'], requireAdmin, upload.single('image'), createActivity)
router.put(['/activities/:id', '/admin/activities/:id'], requireAdmin, upload.single('image'), updateActivity)

router.delete(['/activities/:id', '/admin/activities/:id'], requireAdmin, async (req, res) => {
  try {
    await pool.query('DELETE FROM public_welfare_activities WHERE id = ?', [req.params.id])
    res.json({ success: true, message: 'Activity deleted successfully' })
  } catch (error) {
    console.error('delete welfare activity error:', error)
    res.status(500).json({ success: false, message: 'Failed to delete activity' })
  }
})

async function listVolunteers(req, res) {
  try {
    const [rows] = await pool.query(`
      SELECT *
      FROM public_welfare_volunteers
      ORDER BY sort_order ASC, created_at DESC
    `)

    res.json({ success: true, data: rows })
  } catch (error) {
    console.error('public welfare volunteers error:', error)
    res.status(500).json({ success: false, message: 'Failed to load volunteers' })
  }
}

router.get('/volunteers', listVolunteers)
router.get('/admin/volunteers', requireAdmin, listVolunteers)

async function createVolunteer(req, res) {
  const name = normalizeText(req.body.name)

  if (!name) {
    return res.status(400).json({ success: false, message: 'Volunteer name is required' })
  }

  try {
    const avatarUrl = buildAssetUrl(req.file) || normalizeText(req.body.avatar_url)

    await pool.query(
      `
        INSERT INTO public_welfare_volunteers
          (name, role, quote, introduction, stat_years, stat_projects, stat_people, avatar_url, sort_order)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `,
      [
        name,
        normalizeNullableText(req.body.role),
        normalizeNullableText(req.body.quote),
        normalizeNullableText(req.body.introduction),
        normalizeNullableNumber(req.body.stat_years) || 0,
        normalizeNullableNumber(req.body.stat_projects) || 0,
        normalizeNullableNumber(req.body.stat_people) || 0,
        avatarUrl || null,
        normalizeNullableNumber(req.body.sort_order) || 0,
      ],
    )

    res.json({ success: true, message: 'Volunteer story created successfully' })
  } catch (error) {
    console.error('create welfare volunteer error:', error)
    res.status(500).json({ success: false, message: 'Failed to create volunteer story' })
  }
}

async function updateVolunteer(req, res) {
  const name = normalizeText(req.body.name)

  if (!name) {
    return res.status(400).json({ success: false, message: 'Volunteer name is required' })
  }

  try {
    const existing = await findById('public_welfare_volunteers', req.params.id)

    if (!existing) {
      return res.status(404).json({ success: false, message: 'Volunteer not found' })
    }

    const avatarUrl =
      buildAssetUrl(req.file) ||
      (req.body.avatar_url !== undefined ? normalizeText(req.body.avatar_url) : existing.avatar_url)

    await pool.query(
      `
        UPDATE public_welfare_volunteers
        SET name = ?, role = ?, quote = ?, introduction = ?, stat_years = ?, stat_projects = ?, stat_people = ?, avatar_url = ?, sort_order = ?
        WHERE id = ?
      `,
      [
        name,
        normalizeNullableText(req.body.role),
        normalizeNullableText(req.body.quote),
        normalizeNullableText(req.body.introduction),
        normalizeNullableNumber(req.body.stat_years) || 0,
        normalizeNullableNumber(req.body.stat_projects) || 0,
        normalizeNullableNumber(req.body.stat_people) || 0,
        avatarUrl || null,
        normalizeNullableNumber(req.body.sort_order) || 0,
        req.params.id,
      ],
    )

    res.json({ success: true, message: 'Volunteer story updated successfully' })
  } catch (error) {
    console.error('update welfare volunteer error:', error)
    res.status(500).json({ success: false, message: 'Failed to update volunteer story' })
  }
}

router.post(['/volunteers', '/admin/volunteers'], requireAdmin, upload.single('avatar'), createVolunteer)
router.put(['/volunteers/:id', '/admin/volunteers/:id'], requireAdmin, upload.single('avatar'), updateVolunteer)

router.delete(['/volunteers/:id', '/admin/volunteers/:id'], requireAdmin, async (req, res) => {
  try {
    await pool.query('DELETE FROM public_welfare_volunteers WHERE id = ?', [req.params.id])
    res.json({ success: true, message: 'Volunteer story deleted successfully' })
  } catch (error) {
    console.error('delete welfare volunteer error:', error)
    res.status(500).json({ success: false, message: 'Failed to delete volunteer story' })
  }
})

async function listTimelines(req, res) {
  try {
    const [rows] = await pool.query(`
      SELECT *
      FROM public_welfare_timelines
      ORDER BY year ASC, sort_order ASC, created_at ASC
    `)

    res.json({ success: true, data: rows })
  } catch (error) {
    console.error('public welfare timelines error:', error)
    res.status(500).json({ success: false, message: 'Failed to load timelines' })
  }
}

router.get('/timelines', listTimelines)
router.get('/admin/timelines', requireAdmin, listTimelines)

async function createTimeline(req, res) {
  const title = normalizeText(req.body.title)

  if (!title) {
    return res.status(400).json({ success: false, message: 'Timeline title is required' })
  }

  try {
    const uploadedImages = req.files?.length ? req.files.map((file) => buildAssetUrl(file)) : []
    const bodyImages = normalizeJsonArray(req.body.image_urls)
    const imageUrls = uploadedImages.length ? uploadedImages : bodyImages

    await pool.query(
      `
        INSERT INTO public_welfare_timelines
          (year, event_name, title, description, image_urls, sort_order)
        VALUES (?, ?, ?, ?, ?, ?)
      `,
      [
        normalizeNullableNumber(req.body.year),
        normalizeNullableText(req.body.event_name),
        title,
        normalizeNullableText(req.body.description),
        imageUrls.length ? JSON.stringify(imageUrls) : null,
        normalizeNullableNumber(req.body.sort_order) || 0,
      ],
    )

    res.json({ success: true, message: 'Timeline item created successfully' })
  } catch (error) {
    console.error('create welfare timeline error:', error)
    res.status(500).json({ success: false, message: 'Failed to create timeline item' })
  }
}

async function updateTimeline(req, res) {
  const title = normalizeText(req.body.title)

  if (!title) {
    return res.status(400).json({ success: false, message: 'Timeline title is required' })
  }

  try {
    const existing = await findById('public_welfare_timelines', req.params.id)

    if (!existing) {
      return res.status(404).json({ success: false, message: 'Timeline item not found' })
    }

    const uploadedImages = req.files?.length ? req.files.map((file) => buildAssetUrl(file)) : []
    const imageUrls =
      uploadedImages.length
        ? uploadedImages
        : req.body.image_urls !== undefined
          ? normalizeJsonArray(req.body.image_urls)
          : normalizeJsonArray(existing.image_urls)

    await pool.query(
      `
        UPDATE public_welfare_timelines
        SET year = ?, event_name = ?, title = ?, description = ?, image_urls = ?, sort_order = ?
        WHERE id = ?
      `,
      [
        normalizeNullableNumber(req.body.year),
        normalizeNullableText(req.body.event_name),
        title,
        normalizeNullableText(req.body.description),
        imageUrls.length ? JSON.stringify(imageUrls) : null,
        normalizeNullableNumber(req.body.sort_order) || 0,
        req.params.id,
      ],
    )

    res.json({ success: true, message: 'Timeline item updated successfully' })
  } catch (error) {
    console.error('update welfare timeline error:', error)
    res.status(500).json({ success: false, message: 'Failed to update timeline item' })
  }
}

router.post(['/timelines', '/admin/timelines'], requireAdmin, uploadMulti, createTimeline)
router.put(['/timelines/:id', '/admin/timelines/:id'], requireAdmin, uploadMulti, updateTimeline)

router.delete(['/timelines/:id', '/admin/timelines/:id'], requireAdmin, async (req, res) => {
  try {
    await pool.query('DELETE FROM public_welfare_timelines WHERE id = ?', [req.params.id])
    res.json({ success: true, message: 'Timeline item deleted successfully' })
  } catch (error) {
    console.error('delete welfare timeline error:', error)
    res.status(500).json({ success: false, message: 'Failed to delete timeline item' })
  }
})

export default router
