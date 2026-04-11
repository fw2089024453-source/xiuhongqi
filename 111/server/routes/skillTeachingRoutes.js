import express from 'express'
import multer from 'multer'
import path from 'path'
import { fileURLToPath } from 'url'
import { pool } from '../../config/db.js'
import { requireAdmin, requireAuth } from '../middleware/auth.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const router = express.Router()

const CATEGORY_STATUSES = ['active', 'inactive']
const COURSE_STATUSES = ['draft', 'published', 'archived']
const RESOURCE_STATUSES = ['active', 'inactive']
const WORK_STATUSES = ['pending', 'approved', 'rejected', 'archived']
const DIFFICULTY_LEVELS = ['beginner', 'intermediate', 'advanced']
const enumOptionsCache = new Map()

const storage = multer.diskStorage({
  destination(req, file, cb) {
    cb(null, path.join(__dirname, '../../public/uploads'))
  },
  filename(req, file, cb) {
    cb(null, `skill_teaching_${Date.now()}${path.extname(file.originalname)}`)
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

function normalizeNullableNumber(value) {
  if (value === '' || value === null || value === undefined) return null
  const number = Number(value)
  return Number.isFinite(number) ? number : null
}

function normalizeBoolean(value) {
  if (typeof value === 'boolean') return value
  if (typeof value === 'number') return value === 1
  return ['1', 'true', 'yes', 'on'].includes(String(value || '').toLowerCase())
}

function normalizeList(value) {
  if (!value) return []
  if (Array.isArray(value)) return value

  try {
    const parsed = JSON.parse(value)
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return String(value)
      .split(/\r?\n/)
      .map((item) => item.trim())
      .filter(Boolean)
  }
}

function normalizeStatus(value, allowed, fallback) {
  return allowed.includes(value) ? value : fallback
}

function normalizeDifficultyKey(value) {
  return normalizeStatus(value, DIFFICULTY_LEVELS, 'beginner')
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

async function normalizeDifficulty(value) {
  const safeValue = normalizeDifficultyKey(value)
  const enumOptions = await getEnumOptions('skill_teaching_courses', 'difficulty')

  if (enumOptions.includes(safeValue)) {
    return safeValue
  }

  const levelIndex = DIFFICULTY_LEVELS.indexOf(safeValue)
  return enumOptions[levelIndex] || enumOptions[0] || safeValue
}

function mapCourse(row) {
  return {
    ...row,
    materials_list: normalizeList(row.materials_list),
  }
}

function normalizeMaterials(value) {
  return normalizeList(value).map((item) => normalizeText(item)).filter(Boolean)
}

function normalizeChapters(value) {
  const raw = Array.isArray(value) ? value : normalizeList(value)

  return raw
    .map((item, index) => {
      let chapter = item

      if (typeof item === 'string') {
        try {
          chapter = JSON.parse(item)
        } catch {
          chapter = { title: item }
        }
      }

      const title = normalizeText(chapter?.title)

      if (!title) {
        return null
      }

      return {
        chapter_number: normalizeNullableNumber(chapter.chapter_number) || index + 1,
        title,
        content: normalizeText(chapter.content),
        video_url: normalizeNullableText(chapter.video_url),
        duration_minutes: normalizeNullableNumber(chapter.duration_minutes),
        sort_order: normalizeNullableNumber(chapter.sort_order) || index + 1,
      }
    })
    .filter(Boolean)
}

async function replaceCourseChapters(connection, courseId, chapters) {
  await connection.query('DELETE FROM course_chapters WHERE course_id = ?', [courseId])

  if (!chapters.length) {
    return
  }

  const values = chapters.map((chapter) => [
    courseId,
    chapter.chapter_number,
    chapter.title,
    chapter.content,
    chapter.video_url,
    chapter.duration_minutes,
    chapter.sort_order,
  ])

  await connection.query(
    `
      INSERT INTO course_chapters
        (course_id, chapter_number, title, content, video_url, duration_minutes, sort_order)
      VALUES ?
    `,
    [values],
  )
}

async function findById(tableName, id) {
  const [rows] = await pool.query(`SELECT * FROM ${tableName} WHERE id = ? LIMIT 1`, [id])
  return rows[0] || null
}

router.get('/overview', async (req, res) => {
  try {
    const [[categoriesCount], [coursesCount], [resourcesCount], [worksCount], [featuredRows]] =
      await Promise.all([
        pool.query("SELECT COUNT(*) AS total FROM skill_teaching_categories WHERE status = 'active'"),
        pool.query("SELECT COUNT(*) AS total FROM skill_teaching_courses WHERE status = 'published'"),
        pool.query("SELECT COUNT(*) AS total FROM skill_teaching_resources WHERE status = 'active'"),
        pool.query("SELECT COUNT(*) AS total FROM skill_teaching_works WHERE status = 'approved'"),
        pool.query(`
          SELECT
            c.*,
            cat.name AS category_name,
            COALESCE(u.display_name, u.username) AS instructor_name,
            COUNT(ch.id) AS chapter_count
          FROM skill_teaching_courses c
          LEFT JOIN skill_teaching_categories cat ON c.category_id = cat.id
          LEFT JOIN users u ON c.instructor_id = u.id
          LEFT JOIN course_chapters ch ON ch.course_id = c.id
          WHERE c.status = 'published'
          GROUP BY c.id
          ORDER BY c.is_featured DESC, COALESCE(c.published_at, c.created_at) DESC
          LIMIT 1
        `),
      ])

    res.json({
      success: true,
      data: {
        summary: {
          categories: categoriesCount[0]?.total || 0,
          courses: coursesCount[0]?.total || 0,
          resources: resourcesCount[0]?.total || 0,
          works: worksCount[0]?.total || 0,
        },
        featuredCourse: featuredRows[0] ? mapCourse(featuredRows[0]) : null,
      },
    })
  } catch (error) {
    console.error('skill teaching overview error:', error)
    res.status(500).json({ success: false, message: 'Failed to load skill teaching overview' })
  }
})

router.get('/categories', async (req, res) => {
  try {
    const [rows] = await pool.query(`
      SELECT
        cat.*,
        COUNT(c.id) AS course_count
      FROM skill_teaching_categories cat
      LEFT JOIN skill_teaching_courses c
        ON c.category_id = cat.id
        AND c.status = 'published'
      WHERE cat.status = 'active'
      GROUP BY cat.id
      ORDER BY cat.sort_order ASC, cat.id ASC
    `)

    res.json({ success: true, data: rows })
  } catch (error) {
    console.error('skill teaching categories error:', error)
    res.status(500).json({ success: false, message: 'Failed to load categories' })
  }
})

router.get('/courses', async (req, res) => {
  const { categoryId } = req.query

  try {
    const filters = ["c.status = 'published'"]
    const params = []

    if (categoryId) {
      filters.push('c.category_id = ?')
      params.push(categoryId)
    }

    const [rows] = await pool.query(
      `
        SELECT
          c.*,
          cat.name AS category_name,
          COALESCE(u.display_name, u.username) AS instructor_name,
          COUNT(ch.id) AS chapter_count
        FROM skill_teaching_courses c
        LEFT JOIN skill_teaching_categories cat ON c.category_id = cat.id
        LEFT JOIN users u ON c.instructor_id = u.id
        LEFT JOIN course_chapters ch ON ch.course_id = c.id
        WHERE ${filters.join(' AND ')}
        GROUP BY c.id
        ORDER BY c.is_featured DESC, COALESCE(c.published_at, c.created_at) DESC
      `,
      params,
    )

    res.json({ success: true, data: rows.map(mapCourse) })
  } catch (error) {
    console.error('skill teaching courses error:', error)
    res.status(500).json({ success: false, message: 'Failed to load courses' })
  }
})

router.get('/courses/:id', async (req, res) => {
  try {
    const [[courseRows], [chapterRows]] = await Promise.all([
      pool.query(
        `
          SELECT
            c.*,
            cat.name AS category_name,
            COALESCE(u.display_name, u.username) AS instructor_name
          FROM skill_teaching_courses c
          LEFT JOIN skill_teaching_categories cat ON c.category_id = cat.id
          LEFT JOIN users u ON c.instructor_id = u.id
          WHERE c.id = ? AND c.status = 'published'
          LIMIT 1
        `,
        [req.params.id],
      ),
      pool.query(
        `
          SELECT *
          FROM course_chapters
          WHERE course_id = ?
          ORDER BY chapter_number ASC, sort_order ASC, id ASC
        `,
        [req.params.id],
      ),
    ])

    const course = courseRows[0]
    if (!course) {
      return res.status(404).json({ success: false, message: 'Course not found' })
    }

    res.json({
      success: true,
      data: {
        ...mapCourse(course),
        chapters: chapterRows,
      },
    })
  } catch (error) {
    console.error('skill teaching course detail error:', error)
    res.status(500).json({ success: false, message: 'Failed to load course detail' })
  }
})

router.get('/featured-course', async (req, res) => {
  try {
    const [[rows]] = await Promise.all([
      pool.query(`
        SELECT c.id
        FROM skill_teaching_courses c
        WHERE c.status = 'published'
        ORDER BY c.is_featured DESC, COALESCE(c.published_at, c.created_at) DESC
        LIMIT 1
      `),
    ])

    if (!rows[0]) {
      return res.json({ success: true, data: null })
    }

    const [[courseRows], [chapterRows]] = await Promise.all([
      pool.query(
        `
          SELECT
            c.*,
            cat.name AS category_name,
            COALESCE(u.display_name, u.username) AS instructor_name
          FROM skill_teaching_courses c
          LEFT JOIN skill_teaching_categories cat ON c.category_id = cat.id
          LEFT JOIN users u ON c.instructor_id = u.id
          WHERE c.id = ?
          LIMIT 1
        `,
        [rows[0].id],
      ),
      pool.query(
        `
          SELECT *
          FROM course_chapters
          WHERE course_id = ?
          ORDER BY chapter_number ASC, sort_order ASC, id ASC
        `,
        [rows[0].id],
      ),
    ])

    res.json({
      success: true,
      data: {
        ...mapCourse(courseRows[0]),
        chapters: chapterRows,
      },
    })
  } catch (error) {
    console.error('skill teaching featured course error:', error)
    res.status(500).json({ success: false, message: 'Failed to load featured course' })
  }
})

router.get('/resources', async (req, res) => {
  try {
    const [rows] = await pool.query(`
      SELECT *
      FROM skill_teaching_resources
      WHERE status = 'active'
      ORDER BY sort_order ASC, created_at DESC
    `)

    res.json({ success: true, data: rows })
  } catch (error) {
    console.error('skill teaching resources error:', error)
    res.status(500).json({ success: false, message: 'Failed to load resources' })
  }
})

router.get('/works', async (req, res) => {
  try {
    const [rows] = await pool.query(`
      SELECT *
      FROM skill_teaching_works
      WHERE status = 'approved'
      ORDER BY created_at DESC
    `)

    res.json({ success: true, data: rows })
  } catch (error) {
    console.error('skill teaching works error:', error)
    res.status(500).json({ success: false, message: 'Failed to load works' })
  }
})

router.post('/works', requireAuth, upload.single('image'), async (req, res) => {
  const { title, description } = req.body
  const userId = Number(req.user?.id || 0)
  const authorName = req.user?.display_name || req.user?.username || 'student'
  const imageUrl = req.file ? `/uploads/${req.file.filename}` : ''

  if (!title || !imageUrl) {
    return res.status(400).json({ success: false, message: 'Title and image are required' })
  }

  try {
    await pool.query(
      `
        INSERT INTO skill_teaching_works (user_id, author_name, title, description, image_url, status)
        VALUES (?, ?, ?, ?, ?, 'pending')
      `,
      [userId, authorName, title, description || '', imageUrl],
    )

    res.json({
      success: true,
      message: 'Work submitted successfully and is waiting for review',
    })
  } catch (error) {
    console.error('skill teaching work submit error:', error)
    res.status(500).json({ success: false, message: 'Failed to submit work' })
  }
})

router.get('/admin/categories', requireAdmin, async (req, res) => {
  try {
    const [rows] = await pool.query(`
      SELECT
        cat.*,
        COUNT(c.id) AS course_count,
        SUM(CASE WHEN c.status = 'published' THEN 1 ELSE 0 END) AS published_course_count
      FROM skill_teaching_categories cat
      LEFT JOIN skill_teaching_courses c ON c.category_id = cat.id
      GROUP BY cat.id
      ORDER BY cat.sort_order ASC, cat.id ASC
    `)

    res.json({ success: true, data: rows })
  } catch (error) {
    console.error('admin skill categories error:', error)
    res.status(500).json({ success: false, message: 'Failed to load admin categories' })
  }
})

router.post('/admin/categories', requireAdmin, async (req, res) => {
  const name = normalizeText(req.body.name)

  if (!name) {
    return res.status(400).json({ success: false, message: 'Category name is required' })
  }

  try {
    await pool.query(
      `
        INSERT INTO skill_teaching_categories (name, description, sort_order, status)
        VALUES (?, ?, ?, ?)
      `,
      [
        name,
        normalizeNullableText(req.body.description),
        normalizeNullableNumber(req.body.sort_order) || 0,
        normalizeStatus(req.body.status, CATEGORY_STATUSES, 'active'),
      ],
    )

    res.json({ success: true, message: 'Category created successfully' })
  } catch (error) {
    console.error('create admin skill category error:', error)
    res.status(500).json({ success: false, message: 'Failed to create category' })
  }
})

router.put('/admin/categories/:id', requireAdmin, async (req, res) => {
  const name = normalizeText(req.body.name)

  if (!name) {
    return res.status(400).json({ success: false, message: 'Category name is required' })
  }

  try {
    const [result] = await pool.query(
      `
        UPDATE skill_teaching_categories
        SET name = ?, description = ?, sort_order = ?, status = ?
        WHERE id = ?
      `,
      [
        name,
        normalizeNullableText(req.body.description),
        normalizeNullableNumber(req.body.sort_order) || 0,
        normalizeStatus(req.body.status, CATEGORY_STATUSES, 'active'),
        req.params.id,
      ],
    )

    if (!result.affectedRows) {
      return res.status(404).json({ success: false, message: 'Category not found' })
    }

    res.json({ success: true, message: 'Category updated successfully' })
  } catch (error) {
    console.error('update admin skill category error:', error)
    res.status(500).json({ success: false, message: 'Failed to update category' })
  }
})

router.delete('/admin/categories/:id', requireAdmin, async (req, res) => {
  try {
    const [result] = await pool.query('DELETE FROM skill_teaching_categories WHERE id = ?', [req.params.id])

    if (!result.affectedRows) {
      return res.status(404).json({ success: false, message: 'Category not found' })
    }

    res.json({ success: true, message: 'Category deleted successfully' })
  } catch (error) {
    console.error('delete admin skill category error:', error)
    res.status(500).json({ success: false, message: 'Failed to delete category' })
  }
})

router.get('/admin/courses', requireAdmin, async (req, res) => {
  const filters = []
  const params = []

  if (req.query.status && req.query.status !== 'all') {
    filters.push('c.status = ?')
    params.push(normalizeStatus(req.query.status, COURSE_STATUSES, 'draft'))
  }

  if (req.query.categoryId) {
    filters.push('c.category_id = ?')
    params.push(req.query.categoryId)
  }

  const whereSql = filters.length ? `WHERE ${filters.join(' AND ')}` : ''

  try {
    const [rows] = await pool.query(
      `
        SELECT
          c.*,
          cat.name AS category_name,
          COALESCE(u.display_name, u.username) AS instructor_name,
          COUNT(ch.id) AS chapter_count
        FROM skill_teaching_courses c
        LEFT JOIN skill_teaching_categories cat ON c.category_id = cat.id
        LEFT JOIN users u ON c.instructor_id = u.id
        LEFT JOIN course_chapters ch ON ch.course_id = c.id
        ${whereSql}
        GROUP BY c.id
        ORDER BY c.is_featured DESC, COALESCE(c.published_at, c.created_at) DESC, c.updated_at DESC
      `,
      params,
    )

    res.json({ success: true, data: rows.map(mapCourse) })
  } catch (error) {
    console.error('admin skill courses error:', error)
    res.status(500).json({ success: false, message: 'Failed to load admin courses' })
  }
})

router.get('/admin/courses/:id', requireAdmin, async (req, res) => {
  try {
    const [[courseRows], [chapterRows]] = await Promise.all([
      pool.query(
        `
          SELECT c.*, cat.name AS category_name, COALESCE(u.display_name, u.username) AS instructor_name
          FROM skill_teaching_courses c
          LEFT JOIN skill_teaching_categories cat ON c.category_id = cat.id
          LEFT JOIN users u ON c.instructor_id = u.id
          WHERE c.id = ?
          LIMIT 1
        `,
        [req.params.id],
      ),
      pool.query(
        `
          SELECT *
          FROM course_chapters
          WHERE course_id = ?
          ORDER BY chapter_number ASC, sort_order ASC, id ASC
        `,
        [req.params.id],
      ),
    ])

    if (!courseRows[0]) {
      return res.status(404).json({ success: false, message: 'Course not found' })
    }

    res.json({
      success: true,
      data: {
        ...mapCourse(courseRows[0]),
        chapters: chapterRows,
      },
    })
  } catch (error) {
    console.error('admin skill course detail error:', error)
    res.status(500).json({ success: false, message: 'Failed to load admin course detail' })
  }
})

async function saveCourse(req, res, isUpdate = false) {
  const title = normalizeText(req.body.title)
  const description = normalizeText(req.body.description)

  if (!title || !description) {
    return res.status(400).json({ success: false, message: 'Course title and description are required' })
  }

  const materials = normalizeMaterials(req.body.materials_list)
  const chapters = normalizeChapters(req.body.chapters)
  const status = normalizeStatus(req.body.status, COURSE_STATUSES, 'draft')
  const isFeatured = normalizeBoolean(req.body.is_featured)
  const courseId = req.params.id
  const connection = await pool.getConnection()

  try {
    await connection.beginTransaction()

    if (isUpdate) {
      const [existingRows] = await connection.query(
        'SELECT id FROM skill_teaching_courses WHERE id = ? LIMIT 1',
        [courseId],
      )

      if (!existingRows[0]) {
        await connection.rollback()
        return res.status(404).json({ success: false, message: 'Course not found' })
      }
    }

    const payload = [
      normalizeNullableNumber(req.body.category_id),
      title,
      description,
      normalizeNullableText(req.body.detailed_content),
      await normalizeDifficulty(req.body.difficulty),
      normalizeNullableNumber(req.body.estimated_hours),
      normalizeNullableText(req.body.cover_image),
      normalizeNullableText(req.body.video_url),
      materials.length ? JSON.stringify(materials) : null,
      normalizeNullableNumber(req.body.instructor_id),
      isFeatured ? 1 : 0,
      status,
      status === 'published' ? new Date() : null,
    ]

    let finalCourseId = courseId

    if (isUpdate) {
      await connection.query(
        `
          UPDATE skill_teaching_courses
          SET category_id = ?, title = ?, description = ?, detailed_content = ?, difficulty = ?, estimated_hours = ?,
              cover_image = ?, video_url = ?, materials_list = ?, instructor_id = ?, is_featured = ?, status = ?, published_at = ?
          WHERE id = ?
        `,
        [...payload, courseId],
      )
    } else {
      const [result] = await connection.query(
        `
          INSERT INTO skill_teaching_courses
            (
              category_id, title, description, detailed_content, difficulty, estimated_hours, cover_image,
              video_url, materials_list, instructor_id, is_featured, status, published_at
            )
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `,
        payload,
      )

      finalCourseId = result.insertId
    }

    if (isFeatured) {
      await connection.query('UPDATE skill_teaching_courses SET is_featured = 0 WHERE id <> ?', [finalCourseId])
      await connection.query('UPDATE skill_teaching_courses SET is_featured = 1 WHERE id = ?', [finalCourseId])
    }

    await replaceCourseChapters(connection, finalCourseId, chapters)

    await connection.commit()

    return res.json({
      success: true,
      message: isUpdate ? 'Course updated successfully' : 'Course created successfully',
      data: { id: finalCourseId },
    })
  } catch (error) {
    await connection.rollback()
    console.error('save admin skill course error:', error)
    return res.status(500).json({ success: false, message: 'Failed to save course' })
  } finally {
    connection.release()
  }
}

router.post('/admin/courses', requireAdmin, (req, res) => saveCourse(req, res, false))
router.put('/admin/courses/:id', requireAdmin, (req, res) => saveCourse(req, res, true))

router.delete('/admin/courses/:id', requireAdmin, async (req, res) => {
  try {
    const [result] = await pool.query('DELETE FROM skill_teaching_courses WHERE id = ?', [req.params.id])

    if (!result.affectedRows) {
      return res.status(404).json({ success: false, message: 'Course not found' })
    }

    res.json({ success: true, message: 'Course deleted successfully' })
  } catch (error) {
    console.error('delete admin skill course error:', error)
    res.status(500).json({ success: false, message: 'Failed to delete course' })
  }
})

router.get('/admin/resources', requireAdmin, async (req, res) => {
  try {
    const [rows] = await pool.query(`
      SELECT *
      FROM skill_teaching_resources
      ORDER BY sort_order ASC, created_at DESC
    `)

    res.json({ success: true, data: rows })
  } catch (error) {
    console.error('admin skill resources error:', error)
    res.status(500).json({ success: false, message: 'Failed to load admin resources' })
  }
})

router.post('/admin/resources', requireAdmin, async (req, res) => {
  const title = normalizeText(req.body.title)
  const fileUrl = normalizeText(req.body.file_url)

  if (!title || !fileUrl) {
    return res.status(400).json({ success: false, message: 'Resource title and file URL are required' })
  }

  try {
    await pool.query(
      `
        INSERT INTO skill_teaching_resources (title, description, file_url, file_type, sort_order, status)
        VALUES (?, ?, ?, ?, ?, ?)
      `,
      [
        title,
        normalizeNullableText(req.body.description),
        fileUrl,
        normalizeNullableText(req.body.file_type),
        normalizeNullableNumber(req.body.sort_order) || 0,
        normalizeStatus(req.body.status, RESOURCE_STATUSES, 'active'),
      ],
    )

    res.json({ success: true, message: 'Resource created successfully' })
  } catch (error) {
    console.error('create admin skill resource error:', error)
    res.status(500).json({ success: false, message: 'Failed to create resource' })
  }
})

router.put('/admin/resources/:id', requireAdmin, async (req, res) => {
  const title = normalizeText(req.body.title)
  const fileUrl = normalizeText(req.body.file_url)

  if (!title || !fileUrl) {
    return res.status(400).json({ success: false, message: 'Resource title and file URL are required' })
  }

  try {
    const [result] = await pool.query(
      `
        UPDATE skill_teaching_resources
        SET title = ?, description = ?, file_url = ?, file_type = ?, sort_order = ?, status = ?
        WHERE id = ?
      `,
      [
        title,
        normalizeNullableText(req.body.description),
        fileUrl,
        normalizeNullableText(req.body.file_type),
        normalizeNullableNumber(req.body.sort_order) || 0,
        normalizeStatus(req.body.status, RESOURCE_STATUSES, 'active'),
        req.params.id,
      ],
    )

    if (!result.affectedRows) {
      return res.status(404).json({ success: false, message: 'Resource not found' })
    }

    res.json({ success: true, message: 'Resource updated successfully' })
  } catch (error) {
    console.error('update admin skill resource error:', error)
    res.status(500).json({ success: false, message: 'Failed to update resource' })
  }
})

router.delete('/admin/resources/:id', requireAdmin, async (req, res) => {
  try {
    const [result] = await pool.query('DELETE FROM skill_teaching_resources WHERE id = ?', [req.params.id])

    if (!result.affectedRows) {
      return res.status(404).json({ success: false, message: 'Resource not found' })
    }

    res.json({ success: true, message: 'Resource deleted successfully' })
  } catch (error) {
    console.error('delete admin skill resource error:', error)
    res.status(500).json({ success: false, message: 'Failed to delete resource' })
  }
})

router.get('/admin/works', requireAdmin, async (req, res) => {
  const status = req.query.status && req.query.status !== 'all'
    ? normalizeStatus(req.query.status, WORK_STATUSES, 'pending')
    : null

  try {
    const [rows] = await pool.query(
      `
        SELECT
          w.*,
          COALESCE(u.display_name, u.username) AS user_name
        FROM skill_teaching_works w
        LEFT JOIN users u ON u.id = w.user_id
        ${status ? 'WHERE w.status = ?' : ''}
        ORDER BY w.created_at DESC
      `,
      status ? [status] : [],
    )

    res.json({ success: true, data: rows })
  } catch (error) {
    console.error('admin skill works error:', error)
    res.status(500).json({ success: false, message: 'Failed to load admin works' })
  }
})

router.patch('/admin/works/:id/status', requireAdmin, async (req, res) => {
  const status = normalizeStatus(req.body.status, WORK_STATUSES, 'pending')

  try {
    const [result] = await pool.query('UPDATE skill_teaching_works SET status = ? WHERE id = ?', [
      status,
      req.params.id,
    ])

    if (!result.affectedRows) {
      return res.status(404).json({ success: false, message: 'Work not found' })
    }

    res.json({ success: true, message: 'Work status updated successfully' })
  } catch (error) {
    console.error('update admin skill work status error:', error)
    res.status(500).json({ success: false, message: 'Failed to update work status' })
  }
})

router.delete('/admin/works/:id', requireAdmin, async (req, res) => {
  try {
    const [result] = await pool.query('DELETE FROM skill_teaching_works WHERE id = ?', [req.params.id])

    if (!result.affectedRows) {
      return res.status(404).json({ success: false, message: 'Work not found' })
    }

    res.json({ success: true, message: 'Work deleted successfully' })
  } catch (error) {
    console.error('delete admin skill work error:', error)
    res.status(500).json({ success: false, message: 'Failed to delete work' })
  }
})

router.get('/admin/users', requireAdmin, async (req, res) => {
  try {
    const [rows] = await pool.query(`
      SELECT id, username, display_name, role, status
      FROM users
      WHERE status = 'active'
      ORDER BY CASE WHEN role IN ('admin', 'moderator') THEN 0 ELSE 1 END, created_at DESC
    `)

    res.json({ success: true, data: rows })
  } catch (error) {
    console.error('admin skill users error:', error)
    res.status(500).json({ success: false, message: 'Failed to load selectable users' })
  }
})

export default router
