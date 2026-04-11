import express from 'express'
import multer from 'multer'
import path from 'path'
import { fileURLToPath } from 'url'
import { pool } from '../../config/db.js'
import { requireAdmin } from '../middleware/auth.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const router = express.Router()

const STORY_STATUSES = ['draft', 'published', 'archived', 'pending_review']
const CONTENT_STATUSES = ['draft', 'published', 'archived']
const IMPORTANCE_LEVELS = ['high', 'medium', 'low']
const enumOptionsCache = new Map()

const storage = multer.diskStorage({
  destination(req, file, cb) {
    cb(null, path.join(__dirname, '../../public/uploads'))
  },
  filename(req, file, cb) {
    cb(null, `${file.fieldname}_${Date.now()}${path.extname(file.originalname)}`)
  },
})

const upload = multer({ storage })

function normalizeText(value) {
  return String(value || '').trim()
}

function normalizeNullableText(value) {
  const text = normalizeText(value)
  return text || null
}

function normalizeYear(value) {
  if (value === '' || value === null || value === undefined) return null
  const year = Number(value)
  return Number.isFinite(year) ? year : null
}

function normalizeStatus(value, allowed, fallback) {
  return allowed.includes(value) ? value : fallback
}

function parseEnumValues(type) {
  return Array.from(String(type || '').matchAll(/'((?:[^'\\]|\\.)*)'/g), (match) =>
    match[1].replace(/\\'/g, "'"),
  )
}

async function getEnumOptions(tableName, columnName) {
  const cacheKey = `${tableName}.${columnName}`

  if (enumOptionsCache.has(cacheKey)) {
    return enumOptionsCache.get(cacheKey)
  }

  const [rows] = await pool.query(`SHOW COLUMNS FROM ${tableName} LIKE ?`, [columnName])
  const options = parseEnumValues(rows[0]?.Type)
  enumOptionsCache.set(cacheKey, options)
  return options
}

async function normalizeImportance(value, tableName) {
  const safeValue = normalizeStatus(value, IMPORTANCE_LEVELS, 'medium')
  const enumOptions = await getEnumOptions(tableName, 'importance')

  if (enumOptions.includes(safeValue)) {
    return safeValue
  }

  const levelIndex = IMPORTANCE_LEVELS.indexOf(safeValue)
  return enumOptions[levelIndex] || enumOptions[1] || safeValue
}

function buildAssetUrl(file) {
  return file ? `/uploads/${file.filename}` : ''
}

async function findById(tableName, id) {
  const [rows] = await pool.query(`SELECT * FROM ${tableName} WHERE id = ? LIMIT 1`, [id])
  return rows[0] || null
}

function buildPublishedAt(status) {
  return status === 'published' ? new Date() : null
}

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
    res.status(500).json({ success: false, message: 'Failed to load red culture stories' })
  }
})

router.get('/admin/galleries', requireAdmin, async (req, res) => {
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
        comments_count,
        status,
        published_at,
        created_at,
        updated_at
      FROM red_culture_stories
      ORDER BY COALESCE(published_at, created_at) DESC, updated_at DESC
    `)

    res.json({ success: true, data: rows })
  } catch (error) {
    console.error('admin red culture galleries error:', error)
    res.status(500).json({ success: false, message: 'Failed to load admin stories' })
  }
})

async function createGallery(req, res) {
  const title = normalizeText(req.body.title)
  const description = normalizeText(req.body.description)
  const status = normalizeStatus(req.body.status, STORY_STATUSES, 'published')

  if (!title || !description) {
    return res.status(400).json({ success: false, message: 'Title and description are required' })
  }

  try {
    const imageUrl = buildAssetUrl(req.files?.image?.[0]) || normalizeText(req.body.image_url)

    await pool.query(
      `
        INSERT INTO red_culture_stories
          (title, content, author, year, location, image_url, status, published_at, created_by)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `,
      [
        title,
        description,
        normalizeNullableText(req.body.author),
        normalizeYear(req.body.year),
        normalizeNullableText(req.body.location),
        imageUrl || null,
        status,
        buildPublishedAt(status),
        Number(req.user?.id || 0) || null,
      ],
    )

    return res.json({ success: true, message: 'Story created successfully' })
  } catch (error) {
    console.error('create red culture gallery error:', error)
    return res.status(500).json({ success: false, message: 'Failed to create story' })
  }
}

async function updateGallery(req, res) {
  const title = normalizeText(req.body.title)
  const description = normalizeText(req.body.description)

  if (!title || !description) {
    return res.status(400).json({ success: false, message: 'Title and description are required' })
  }

  try {
    const existing = await findById('red_culture_stories', req.params.id)

    if (!existing) {
      return res.status(404).json({ success: false, message: 'Story not found' })
    }

    const status = normalizeStatus(req.body.status, STORY_STATUSES, existing.status)
    const imageUrl = buildAssetUrl(req.files?.image?.[0]) || (
      req.body.image_url !== undefined ? normalizeText(req.body.image_url) : existing.image_url
    )

    await pool.query(
      `
        UPDATE red_culture_stories
        SET title = ?, content = ?, author = ?, year = ?, location = ?, image_url = ?, status = ?, published_at = ?
        WHERE id = ?
      `,
      [
        title,
        description,
        normalizeNullableText(req.body.author),
        normalizeYear(req.body.year),
        normalizeNullableText(req.body.location),
        imageUrl || null,
        status,
        buildPublishedAt(status),
        req.params.id,
      ],
    )

    return res.json({ success: true, message: 'Story updated successfully' })
  } catch (error) {
    console.error('update red culture gallery error:', error)
    return res.status(500).json({ success: false, message: 'Failed to update story' })
  }
}

router.post(
  ['/galleries', '/admin/galleries'],
  requireAdmin,
  upload.fields([{ name: 'image', maxCount: 1 }, { name: 'qr_code', maxCount: 1 }]),
  createGallery,
)

router.put(
  '/admin/galleries/:id',
  requireAdmin,
  upload.fields([{ name: 'image', maxCount: 1 }, { name: 'qr_code', maxCount: 1 }]),
  updateGallery,
)

router.delete(['/galleries/:id', '/admin/galleries/:id'], requireAdmin, async (req, res) => {
  try {
    await pool.query('DELETE FROM red_culture_stories WHERE id = ?', [req.params.id])
    res.json({ success: true, message: 'Story deleted successfully' })
  } catch (error) {
    console.error('delete red culture gallery error:', error)
    res.status(500).json({ success: false, message: 'Failed to delete story' })
  }
})

router.get('/timelines', async (req, res) => {
  try {
    const [rows] = await pool.query(`
      SELECT
        id,
        year,
        COALESCE(location, 'History milestone') AS event_name,
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
    res.status(500).json({ success: false, message: 'Failed to load timelines' })
  }
})

router.get('/admin/timelines', requireAdmin, async (req, res) => {
  try {
    const [rows] = await pool.query(`
      SELECT
        id,
        year,
        location AS event_name,
        title,
        content AS description,
        image_url,
        importance,
        status,
        published_at,
        created_at,
        updated_at
      FROM red_culture_history
      ORDER BY year ASC, updated_at DESC
    `)

    res.json({ success: true, data: rows })
  } catch (error) {
    console.error('admin red culture timelines error:', error)
    res.status(500).json({ success: false, message: 'Failed to load admin timelines' })
  }
})

async function createTimeline(req, res) {
  const title = normalizeText(req.body.title)
  const description = normalizeText(req.body.description)
  const status = normalizeStatus(req.body.status, CONTENT_STATUSES, 'published')

  if (!title || !description) {
    return res.status(400).json({ success: false, message: 'Title and description are required' })
  }

  try {
    const imageUrl = buildAssetUrl(req.file) || normalizeText(req.body.image_url)

    await pool.query(
      `
        INSERT INTO red_culture_history
          (title, content, year, location, importance, image_url, status, published_at, created_by)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `,
      [
        title,
        description,
        normalizeYear(req.body.year),
        normalizeNullableText(req.body.event_name),
        await normalizeImportance(req.body.importance, 'red_culture_history'),
        imageUrl || null,
        status,
        buildPublishedAt(status),
        Number(req.user?.id || 0) || null,
      ],
    )

    return res.json({ success: true, message: 'Timeline item created successfully' })
  } catch (error) {
    console.error('create red culture timeline error:', error)
    return res.status(500).json({ success: false, message: 'Failed to create timeline item' })
  }
}

async function updateTimeline(req, res) {
  const title = normalizeText(req.body.title)
  const description = normalizeText(req.body.description)

  if (!title || !description) {
    return res.status(400).json({ success: false, message: 'Title and description are required' })
  }

  try {
    const existing = await findById('red_culture_history', req.params.id)

    if (!existing) {
      return res.status(404).json({ success: false, message: 'Timeline item not found' })
    }

    const status = normalizeStatus(req.body.status, CONTENT_STATUSES, existing.status)
    const imageUrl =
      buildAssetUrl(req.file) ||
      (req.body.image_url !== undefined ? normalizeText(req.body.image_url) : existing.image_url)

    await pool.query(
      `
        UPDATE red_culture_history
        SET title = ?, content = ?, year = ?, location = ?, importance = ?, image_url = ?, status = ?, published_at = ?
        WHERE id = ?
      `,
      [
        title,
        description,
        normalizeYear(req.body.year),
        normalizeNullableText(req.body.event_name),
        await normalizeImportance(req.body.importance, 'red_culture_history'),
        imageUrl || null,
        status,
        buildPublishedAt(status),
        req.params.id,
      ],
    )

    return res.json({ success: true, message: 'Timeline item updated successfully' })
  } catch (error) {
    console.error('update red culture timeline error:', error)
    return res.status(500).json({ success: false, message: 'Failed to update timeline item' })
  }
}

router.post(['/timelines', '/admin/timelines'], requireAdmin, upload.single('image'), createTimeline)
router.put('/admin/timelines/:id', requireAdmin, upload.single('image'), updateTimeline)

router.delete(['/timelines/:id', '/admin/timelines/:id'], requireAdmin, async (req, res) => {
  try {
    await pool.query('DELETE FROM red_culture_history WHERE id = ?', [req.params.id])
    res.json({ success: true, message: 'Timeline item deleted successfully' })
  } catch (error) {
    console.error('delete red culture timeline error:', error)
    res.status(500).json({ success: false, message: 'Failed to delete timeline item' })
  }
})

router.get('/quotes', async (req, res) => {
  try {
    const [rows] = await pool.query(`
      SELECT
        id,
        title AS author_name,
        'Red culture spirit' AS author_title,
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
    res.status(500).json({ success: false, message: 'Failed to load quotes' })
  }
})

router.get('/admin/quotes', requireAdmin, async (req, res) => {
  try {
    const [rows] = await pool.query(`
      SELECT
        id,
        title AS author_name,
        content AS quote,
        icon_url AS avatar_url,
        importance,
        status,
        published_at,
        created_at,
        updated_at
      FROM red_culture_spirit
      ORDER BY COALESCE(published_at, created_at) DESC, updated_at DESC
    `)

    res.json({ success: true, data: rows })
  } catch (error) {
    console.error('admin red culture quotes error:', error)
    res.status(500).json({ success: false, message: 'Failed to load admin quotes' })
  }
})

async function createQuote(req, res) {
  const authorName = normalizeText(req.body.author_name)
  const quote = normalizeText(req.body.quote)
  const status = normalizeStatus(req.body.status, CONTENT_STATUSES, 'published')

  if (!authorName || !quote) {
    return res.status(400).json({ success: false, message: 'Author and quote are required' })
  }

  try {
    const avatarUrl = buildAssetUrl(req.file) || normalizeText(req.body.avatar_url)

    await pool.query(
      `
        INSERT INTO red_culture_spirit
          (title, content, icon_url, importance, status, published_at, created_by)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `,
      [
        authorName,
        quote,
        avatarUrl || null,
        await normalizeImportance(req.body.importance, 'red_culture_spirit'),
        status,
        buildPublishedAt(status),
        Number(req.user?.id || 0) || null,
      ],
    )

    return res.json({ success: true, message: 'Quote created successfully' })
  } catch (error) {
    console.error('create red culture quote error:', error)
    return res.status(500).json({ success: false, message: 'Failed to create quote' })
  }
}

async function updateQuote(req, res) {
  const authorName = normalizeText(req.body.author_name)
  const quote = normalizeText(req.body.quote)

  if (!authorName || !quote) {
    return res.status(400).json({ success: false, message: 'Author and quote are required' })
  }

  try {
    const existing = await findById('red_culture_spirit', req.params.id)

    if (!existing) {
      return res.status(404).json({ success: false, message: 'Quote not found' })
    }

    const status = normalizeStatus(req.body.status, CONTENT_STATUSES, existing.status)
    const avatarUrl =
      buildAssetUrl(req.file) ||
      (req.body.avatar_url !== undefined ? normalizeText(req.body.avatar_url) : existing.icon_url)

    await pool.query(
      `
        UPDATE red_culture_spirit
        SET title = ?, content = ?, icon_url = ?, importance = ?, status = ?, published_at = ?
        WHERE id = ?
      `,
      [
        authorName,
        quote,
        avatarUrl || null,
        await normalizeImportance(req.body.importance, 'red_culture_spirit'),
        status,
        buildPublishedAt(status),
        req.params.id,
      ],
    )

    return res.json({ success: true, message: 'Quote updated successfully' })
  } catch (error) {
    console.error('update red culture quote error:', error)
    return res.status(500).json({ success: false, message: 'Failed to update quote' })
  }
}

router.post(['/quotes', '/admin/quotes'], requireAdmin, upload.single('avatar'), createQuote)
router.put('/admin/quotes/:id', requireAdmin, upload.single('avatar'), updateQuote)

router.delete(['/quotes/:id', '/admin/quotes/:id'], requireAdmin, async (req, res) => {
  try {
    await pool.query('DELETE FROM red_culture_spirit WHERE id = ?', [req.params.id])
    res.json({ success: true, message: 'Quote deleted successfully' })
  } catch (error) {
    console.error('delete red culture quote error:', error)
    res.status(500).json({ success: false, message: 'Failed to delete quote' })
  }
})

export default router
