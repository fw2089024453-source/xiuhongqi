import express from 'express'
import multer from 'multer'
import path from 'path'
import { pool } from '../../config/db.js'
import { requireAuth } from '../middleware/auth.js'

const router = express.Router()

const storage = multer.diskStorage({
  destination(req, file, cb) {
    cb(null, 'public/uploads/')
  },
  filename(req, file, cb) {
    cb(null, `skill_teaching_${Date.now()}${path.extname(file.originalname)}`)
  },
})

const upload = multer({ storage })

function normalizeList(value) {
  if (!value) return []
  if (Array.isArray(value)) return value

  try {
    const parsed = JSON.parse(value)
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

function mapCourse(row) {
  return {
    ...row,
    materials_list: normalizeList(row.materials_list),
  }
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
    res.status(500).json({ success: false, message: '技艺教学概览加载失败' })
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
    res.status(500).json({ success: false, message: '课程分类加载失败' })
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
    res.status(500).json({ success: false, message: '课程列表加载失败' })
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
      return res.status(404).json({ success: false, message: '课程不存在' })
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
    res.status(500).json({ success: false, message: '课程详情加载失败' })
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
    res.status(500).json({ success: false, message: '精选课程加载失败' })
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
    res.status(500).json({ success: false, message: '学习素材加载失败' })
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
    res.status(500).json({ success: false, message: '学员作品加载失败' })
  }
})

router.post('/works', requireAuth, upload.single('image'), async (req, res) => {
  const { title, description } = req.body
  const userId = Number(req.user?.id || 0)
  const authorName = req.user?.display_name || req.user?.username || '平台学员'
  const imageUrl = req.file ? `/uploads/${req.file.filename}` : ''

  if (!title || !imageUrl) {
    return res.status(400).json({ success: false, message: '请填写完整的作品信息并上传图片' })
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
      message: '作品已提交成功，等待后台审核后展示',
    })
  } catch (error) {
    console.error('skill teaching work submit error:', error)
    res.status(500).json({ success: false, message: '作品提交失败' })
  }
})

export default router
