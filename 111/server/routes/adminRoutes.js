import express from 'express'
import { pool } from '../../config/db.js'
import { requireAdmin } from '../middleware/auth.js'

const router = express.Router()

const REVIEWABLE_STATUSES = ['pending', 'approved', 'rejected', 'archived']
const DEFAULT_PAGE_SIZE = 8

router.use(requireAdmin)

function normalizePage(value) {
  return Math.max(1, Number(value) || 1)
}

function normalizeLimit(value) {
  return Math.min(50, Math.max(1, Number(value) || DEFAULT_PAGE_SIZE))
}

function normalizeStatus(value) {
  return REVIEWABLE_STATUSES.includes(value) ? value : 'pending'
}

async function getStatusSummary(tableName) {
  const [rows] = await pool.query(
    `
      SELECT status, COUNT(*) AS total
      FROM ${tableName}
      GROUP BY status
    `,
  )

  return REVIEWABLE_STATUSES.reduce((summary, status) => {
    summary[status] = Number(rows.find((item) => item.status === status)?.total || 0)
    return summary
  }, {})
}

async function getPagedWorks({
  tableName,
  selectFields,
  status,
  page,
  limit,
}) {
  const offset = (page - 1) * limit

  const [countRows] = await pool.query(
    `SELECT COUNT(*) AS total FROM ${tableName} WHERE status = ?`,
    [status],
  )

  const [rows] = await pool.query(
    `
      SELECT ${selectFields}
      FROM ${tableName}
      WHERE status = ?
      ORDER BY created_at DESC
      LIMIT ? OFFSET ?
    `,
    [status, limit, offset],
  )

  const total = Number(countRows[0]?.total || 0)

  return {
    items: rows,
    total,
    currentPage: page,
    totalPages: Math.max(1, Math.ceil(total / limit)),
  }
}

router.get('/statistics', async (req, res) => {
  try {
    const [worksResult] = await pool.query("SELECT COUNT(*) AS total FROM videos WHERE status = 'approved'")
    const [votesResult] = await pool.query('SELECT COALESCE(SUM(votes_count), 0) AS total FROM videos')
    const [usersResult] = await pool.query('SELECT COUNT(*) AS total FROM users')
    const [categoryResult] = await pool.query(`
      SELECT category, COUNT(*) AS count
      FROM videos
      WHERE status = 'approved' AND category IS NOT NULL AND category != ''
      GROUP BY category
      ORDER BY count DESC
      LIMIT 5
    `)
    const [latestWorks] = await pool.query(`
      SELECT title, contributor_name AS author_name, created_at
      FROM videos
      WHERE status = 'approved'
      ORDER BY created_at DESC
      LIMIT 3
    `)
    const [latestAnns] = await pool.query(`
      SELECT title, created_at
      FROM announcements
      ORDER BY created_at DESC
      LIMIT 2
    `)

    return res.json({
      success: true,
      data: {
        overview: {
          works: Number(worksResult[0]?.total || 0),
          votes: Number(votesResult[0]?.total || 0),
          users: Number(usersResult[0]?.total || 0),
        },
        categories: categoryResult,
        latest: {
          works: latestWorks,
          announcements: latestAnns,
        },
      },
    })
  } catch (error) {
    console.error('admin statistics error:', error)
    return res.status(500).json({ success: false, message: '获取后台统计数据失败' })
  }
})

router.get('/announcements', async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM announcements ORDER BY created_at DESC')
    return res.json({ success: true, data: rows })
  } catch (error) {
    console.error('admin announcements error:', error)
    return res.status(500).json({ success: false, message: '加载公告列表失败' })
  }
})

router.post('/announcements', async (req, res) => {
  const { title, type = 'info', content } = req.body

  if (!title || !content) {
    return res.status(400).json({ success: false, message: '请填写完整的公告标题和内容' })
  }

  try {
    await pool.query('INSERT INTO announcements (title, type, content) VALUES (?, ?, ?)', [
      title.trim(),
      type,
      content.trim(),
    ])

    return res.json({ success: true, message: '公告发布成功' })
  } catch (error) {
    console.error('create admin announcement error:', error)
    return res.status(500).json({ success: false, message: '公告发布失败' })
  }
})

router.put('/announcements/:id', async (req, res) => {
  const { title, type = 'info', content } = req.body

  if (!title || !content) {
    return res.status(400).json({ success: false, message: '请填写完整的公告标题和内容' })
  }

  try {
    await pool.query('UPDATE announcements SET title = ?, type = ?, content = ? WHERE id = ?', [
      title.trim(),
      type,
      content.trim(),
      req.params.id,
    ])

    return res.json({ success: true, message: '公告更新成功' })
  } catch (error) {
    console.error('update admin announcement error:', error)
    return res.status(500).json({ success: false, message: '公告更新失败' })
  }
})

router.delete('/announcements/:id', async (req, res) => {
  try {
    await pool.query('DELETE FROM announcements WHERE id = ?', [req.params.id])
    return res.json({ success: true, message: '公告已删除' })
  } catch (error) {
    console.error('delete admin announcement error:', error)
    return res.status(500).json({ success: false, message: '删除公告失败' })
  }
})

router.get('/reviews/overview', async (req, res) => {
  try {
    const [videoSummary, embSummary] = await Promise.all([
      getStatusSummary('videos'),
      getStatusSummary('emb_works'),
    ])

    return res.json({
      success: true,
      data: {
        videos: videoSummary,
        embroideries: embSummary,
        pendingTotal: videoSummary.pending + embSummary.pending,
      },
    })
  } catch (error) {
    console.error('review overview error:', error)
    return res.status(500).json({ success: false, message: '加载审核概览失败' })
  }
})

router.get('/video-works', async (req, res) => {
  const status = normalizeStatus(req.query.status)
  const page = normalizePage(req.query.page)
  const limit = normalizeLimit(req.query.limit)

  try {
    const [listData, statusSummary] = await Promise.all([
      getPagedWorks({
        tableName: 'videos',
        selectFields: `
          id,
          title,
          description,
          video_url,
          cover_url,
          contributor_name AS author_name,
          category,
          phone,
          status,
          approved_at,
          votes_count,
          views_count,
          created_at
        `,
        status,
        page,
        limit,
      }),
      getStatusSummary('videos'),
    ])

    return res.json({
      success: true,
      data: {
        ...listData,
        statusSummary,
      },
    })
  } catch (error) {
    console.error('admin video works error:', error)
    return res.status(500).json({ success: false, message: '加载视频作品审核列表失败' })
  }
})

router.patch('/video-works/:id/status', async (req, res) => {
  const status = normalizeStatus(req.body.status)

  if (status === 'pending') {
    return res.status(400).json({ success: false, message: '后台不能将作品重新改回待审核状态' })
  }

  try {
    const [result] = await pool.query(
      `
        UPDATE videos
        SET status = ?, approved_at = CASE WHEN ? = 'approved' THEN NOW() ELSE NULL END
        WHERE id = ?
      `,
      [status, status, req.params.id],
    )

    if (!result.affectedRows) {
      return res.status(404).json({ success: false, message: '视频作品不存在' })
    }

    return res.json({ success: true, message: '视频作品状态更新成功' })
  } catch (error) {
    console.error('update video work status error:', error)
    return res.status(500).json({ success: false, message: '更新视频作品状态失败' })
  }
})

router.get('/emb-works', async (req, res) => {
  const status = normalizeStatus(req.query.status)
  const page = normalizePage(req.query.page)
  const limit = normalizeLimit(req.query.limit)

  try {
    const [listData, statusSummary] = await Promise.all([
      getPagedWorks({
        tableName: 'emb_works',
        selectFields: `
          id,
          title,
          description,
          image_url,
          author_name,
          category,
          phone,
          status,
          approved_at,
          votes_count,
          views_count,
          created_at
        `,
        status,
        page,
        limit,
      }),
      getStatusSummary('emb_works'),
    ])

    return res.json({
      success: true,
      data: {
        ...listData,
        statusSummary,
      },
    })
  } catch (error) {
    console.error('admin embroidery works error:', error)
    return res.status(500).json({ success: false, message: '加载绣红旗作品审核列表失败' })
  }
})

router.patch('/emb-works/:id/status', async (req, res) => {
  const status = normalizeStatus(req.body.status)

  if (status === 'pending') {
    return res.status(400).json({ success: false, message: '后台不能将作品重新改回待审核状态' })
  }

  try {
    const [result] = await pool.query(
      `
        UPDATE emb_works
        SET status = ?, approved_at = CASE WHEN ? = 'approved' THEN NOW() ELSE NULL END
        WHERE id = ?
      `,
      [status, status, req.params.id],
    )

    if (!result.affectedRows) {
      return res.status(404).json({ success: false, message: '绣红旗作品不存在' })
    }

    return res.json({ success: true, message: '绣红旗作品状态更新成功' })
  } catch (error) {
    console.error('update embroidery work status error:', error)
    return res.status(500).json({ success: false, message: '更新绣红旗作品状态失败' })
  }
})

export default router
