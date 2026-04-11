import express from 'express'
import { pool } from '../../config/db.js'
import { requireAdmin } from '../middleware/auth.js'

const router = express.Router()

const REVIEWABLE_STATUSES = ['pending', 'approved', 'rejected', 'archived']
const CONTACT_MESSAGE_STATUSES = ['new', 'processing', 'resolved', 'archived']
const INTERACTION_MESSAGE_STATUSES = ['visible', 'hidden']
const USER_ROLES = ['user', 'admin', 'moderator']
const USER_STATUSES = ['active', 'inactive', 'banned']
const FORUM_TOPIC_STATUSES = ['active', 'closed', 'archived']
const EVENT_STATUSES = ['draft', 'published', 'closed']
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

function normalizeListStatus(value, allowedStatuses) {
  return allowedStatuses.includes(value) ? value : 'all'
}

function normalizeUpdateStatus(value, allowedStatuses, fallback) {
  return allowedStatuses.includes(value) ? value : fallback
}

function normalizeKeyword(value) {
  return String(value || '').trim()
}

function normalizeUserRole(value) {
  return USER_ROLES.includes(value) ? value : 'all'
}

function normalizeUserStatus(value) {
  return USER_STATUSES.includes(value) ? value : 'all'
}

function normalizeForumTopicStatus(value) {
  return FORUM_TOPIC_STATUSES.includes(value) ? value : 'all'
}

function normalizeEventStatus(value) {
  return EVENT_STATUSES.includes(value) ? value : 'all'
}

function normalizeDeletedFilter(value) {
  return ['all', 'active', 'deleted'].includes(value) ? value : 'active'
}

async function countActiveManagers(connection) {
  const executor = connection || pool
  const [rows] = await executor.query(
    `
      SELECT COUNT(*) AS total
      FROM users
      WHERE status = 'active' AND role IN ('admin', 'moderator')
    `,
  )

  return Number(rows[0]?.total || 0)
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

async function getCustomStatusSummary(tableName, statuses) {
  const [rows] = await pool.query(
    `
      SELECT status, COUNT(*) AS total
      FROM ${tableName}
      GROUP BY status
    `,
  )

  return statuses.reduce((summary, status) => {
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

router.get('/operations/overview', async (req, res) => {
  try {
    const [[contactRows], [messageRows], [eventRows]] = await Promise.all([
      pool.query(
        `
          SELECT status, COUNT(*) AS total
          FROM contact_messages
          GROUP BY status
        `,
      ),
      pool.query(
        `
          SELECT status, COUNT(*) AS total
          FROM interaction_messages
          GROUP BY status
        `,
      ),
      pool.query('SELECT COUNT(*) AS total FROM event_registrations'),
    ])

    return res.json({
      success: true,
      data: {
        contactMessages: CONTACT_MESSAGE_STATUSES.reduce((summary, status) => {
          summary[status] = Number(contactRows.find((item) => item.status === status)?.total || 0)
          return summary
        }, {}),
        interactionMessages: INTERACTION_MESSAGE_STATUSES.reduce((summary, status) => {
          summary[status] = Number(messageRows.find((item) => item.status === status)?.total || 0)
          return summary
        }, {}),
        eventRegistrations: {
          total: Number(eventRows[0]?.total || 0),
        },
      },
    })
  } catch (error) {
    console.error('admin operations overview error:', error)
    return res.status(500).json({ success: false, message: '加载运营概览失败' })
  }
})

router.get('/forum-topics', async (req, res) => {
  const status = normalizeForumTopicStatus(req.query.status)
  const sectionId = Number(req.query.sectionId || 0)
  const keyword = normalizeKeyword(req.query.keyword)
  const page = normalizePage(req.query.page)
  const limit = normalizeLimit(req.query.limit)
  const offset = (page - 1) * limit

  const whereClauses = []
  const params = []

  if (status !== 'all') {
    whereClauses.push('t.status = ?')
    params.push(status)
  }

  if (sectionId) {
    whereClauses.push('t.section_id = ?')
    params.push(sectionId)
  }

  if (keyword) {
    const pattern = `%${keyword}%`
    whereClauses.push('(t.title LIKE ? OR t.content LIKE ? OR s.name LIKE ?)')
    params.push(pattern, pattern, pattern)
  }

  const whereSql = whereClauses.length ? `WHERE ${whereClauses.join(' AND ')}` : ''

  try {
    const [countRows, rows, statusRows] = await Promise.all([
      pool.query(
        `
          SELECT COUNT(*) AS total
          FROM forum_topics t
          JOIN forum_sections s ON s.id = t.section_id
          ${whereSql}
        `,
        params,
      ),
      pool.query(
        `
          SELECT
            t.id,
            t.section_id,
            t.title,
            t.content,
            t.status,
            t.is_pinned,
            t.is_locked,
            t.views_count,
            t.replies_count,
            t.created_at,
            t.updated_at,
            t.last_reply_at,
            s.name AS section_name,
            COALESCE(u.display_name, u.username) AS author_name
          FROM forum_topics t
          JOIN forum_sections s ON s.id = t.section_id
          JOIN users u ON u.id = t.author_id
          ${whereSql}
          ORDER BY t.is_pinned DESC, COALESCE(t.last_reply_at, t.created_at) DESC
          LIMIT ? OFFSET ?
        `,
        [...params, limit, offset],
      ),
      pool.query(
        `
          SELECT status, COUNT(*) AS total
          FROM forum_topics
          GROUP BY status
        `,
      ),
    ])

    const total = Number(countRows[0][0]?.total || 0)

    return res.json({
      success: true,
      data: {
        items: rows[0],
        total,
        currentPage: page,
        totalPages: Math.max(1, Math.ceil(total / limit)),
        statusSummary: FORUM_TOPIC_STATUSES.reduce((summary, item) => {
          summary[item] = Number(statusRows[0].find((row) => row.status === item)?.total || 0)
          return summary
        }, {}),
      },
    })
  } catch (error) {
    console.error('admin forum topics error:', error)
    return res.status(500).json({ success: false, message: '加载论坛话题失败' })
  }
})

router.patch('/forum-topics/:id/status', async (req, res) => {
  const status = FORUM_TOPIC_STATUSES.includes(req.body.status) ? req.body.status : 'active'

  try {
    const [result] = await pool.query('UPDATE forum_topics SET status = ? WHERE id = ?', [
      status,
      req.params.id,
    ])

    if (!result.affectedRows) {
      return res.status(404).json({ success: false, message: '论坛话题不存在' })
    }

    return res.json({ success: true, message: '论坛话题状态已更新' })
  } catch (error) {
    console.error('update forum topic status error:', error)
    return res.status(500).json({ success: false, message: '更新论坛话题状态失败' })
  }
})

router.get('/forum-posts', async (req, res) => {
  const topicId = Number(req.query.topicId || 0)
  const deleted = normalizeDeletedFilter(req.query.deleted)
  const keyword = normalizeKeyword(req.query.keyword)
  const page = normalizePage(req.query.page)
  const limit = normalizeLimit(req.query.limit)
  const offset = (page - 1) * limit

  const whereClauses = []
  const params = []

  if (topicId) {
    whereClauses.push('p.topic_id = ?')
    params.push(topicId)
  }

  if (deleted === 'active') {
    whereClauses.push('p.is_deleted = FALSE')
  } else if (deleted === 'deleted') {
    whereClauses.push('p.is_deleted = TRUE')
  }

  if (keyword) {
    const pattern = `%${keyword}%`
    whereClauses.push('(p.title LIKE ? OR p.content LIKE ? OR t.title LIKE ?)')
    params.push(pattern, pattern, pattern)
  }

  const whereSql = whereClauses.length ? `WHERE ${whereClauses.join(' AND ')}` : ''

  try {
    const [countRows, rows, summaryRows] = await Promise.all([
      pool.query(
        `
          SELECT COUNT(*) AS total
          FROM forum_posts p
          JOIN forum_topics t ON t.id = p.topic_id
          ${whereSql}
        `,
        params,
      ),
      pool.query(
        `
          SELECT
            p.id,
            p.topic_id,
            p.title,
            p.content,
            p.image_url,
            p.comments_count,
            p.likes_count,
            p.is_deleted,
            p.deleted_at,
            p.created_at,
            p.updated_at,
            t.title AS topic_title,
            COALESCE(u.display_name, u.username) AS author_name
          FROM forum_posts p
          JOIN forum_topics t ON t.id = p.topic_id
          JOIN users u ON u.id = p.author_id
          ${whereSql}
          ORDER BY p.created_at DESC
          LIMIT ? OFFSET ?
        `,
        [...params, limit, offset],
      ),
      pool.query(
        `
          SELECT
            CASE WHEN is_deleted = TRUE THEN 'deleted' ELSE 'active' END AS status_key,
            COUNT(*) AS total
          FROM forum_posts
          GROUP BY status_key
        `,
      ),
    ])

    const total = Number(countRows[0][0]?.total || 0)

    return res.json({
      success: true,
      data: {
        items: rows[0],
        total,
        currentPage: page,
        totalPages: Math.max(1, Math.ceil(total / limit)),
        statusSummary: {
          active: Number(summaryRows[0].find((row) => row.status_key === 'active')?.total || 0),
          deleted: Number(summaryRows[0].find((row) => row.status_key === 'deleted')?.total || 0),
        },
      },
    })
  } catch (error) {
    console.error('admin forum posts error:', error)
    return res.status(500).json({ success: false, message: '加载论坛帖子失败' })
  }
})

router.patch('/forum-posts/:id/visibility', async (req, res) => {
  const nextDeleted = Boolean(req.body.is_deleted)
  const operatorId = Number(req.user?.id || 0)
  const connection = await pool.getConnection()

  try {
    await connection.beginTransaction()

    const [rows] = await connection.query(
      `
        SELECT id, topic_id, is_deleted
        FROM forum_posts
        WHERE id = ?
        LIMIT 1
      `,
      [req.params.id],
    )

    const post = rows[0]

    if (!post) {
      await connection.rollback()
      return res.status(404).json({ success: false, message: '论坛帖子不存在' })
    }

    if (Boolean(post.is_deleted) === nextDeleted) {
      await connection.rollback()
      return res.json({ success: true, message: '帖子状态没有变化' })
    }

    await connection.query(
      `
        UPDATE forum_posts
        SET is_deleted = ?, deleted_at = ?, deleted_by = ?
        WHERE id = ?
      `,
      [nextDeleted, nextDeleted ? new Date() : null, nextDeleted ? operatorId : null, req.params.id],
    )

    await connection.query(
      `
        UPDATE forum_topics
        SET replies_count = GREATEST(0, replies_count + ?)
        WHERE id = ?
      `,
      [nextDeleted ? -1 : 1, post.topic_id],
    )

    await connection.commit()

    return res.json({
      success: true,
      message: nextDeleted ? '论坛帖子已隐藏' : '论坛帖子已恢复显示',
    })
  } catch (error) {
    await connection.rollback()
    console.error('update forum post visibility error:', error)
    return res.status(500).json({ success: false, message: '更新论坛帖子状态失败' })
  } finally {
    connection.release()
  }
})

router.get('/interaction-events', async (req, res) => {
  const status = normalizeEventStatus(req.query.status)
  const keyword = normalizeKeyword(req.query.keyword)
  const page = normalizePage(req.query.page)
  const limit = normalizeLimit(req.query.limit)
  const offset = (page - 1) * limit

  const whereClauses = []
  const params = []

  if (status !== 'all') {
    whereClauses.push('e.status = ?')
    params.push(status)
  }

  if (keyword) {
    const pattern = `%${keyword}%`
    whereClauses.push('(e.title LIKE ? OR e.description LIKE ? OR e.location LIKE ?)')
    params.push(pattern, pattern, pattern)
  }

  const whereSql = whereClauses.length ? `WHERE ${whereClauses.join(' AND ')}` : ''

  try {
    const [countRows, rows, statusRows] = await Promise.all([
      pool.query(
        `
          SELECT COUNT(*) AS total
          FROM interaction_events e
          ${whereSql}
        `,
        params,
      ),
      pool.query(
        `
          SELECT
            e.*,
            COUNT(r.id) AS registration_count
          FROM interaction_events e
          LEFT JOIN event_registrations r ON r.event_id = e.id
          ${whereSql}
          GROUP BY e.id
          ORDER BY e.created_at DESC
          LIMIT ? OFFSET ?
        `,
        [...params, limit, offset],
      ),
      pool.query(
        `
          SELECT status, COUNT(*) AS total
          FROM interaction_events
          GROUP BY status
        `,
      ),
    ])

    const total = Number(countRows[0][0]?.total || 0)

    return res.json({
      success: true,
      data: {
        items: rows[0],
        total,
        currentPage: page,
        totalPages: Math.max(1, Math.ceil(total / limit)),
        statusSummary: EVENT_STATUSES.reduce((summary, item) => {
          summary[item] = Number(statusRows[0].find((row) => row.status === item)?.total || 0)
          return summary
        }, {}),
      },
    })
  } catch (error) {
    console.error('admin interaction events error:', error)
    return res.status(500).json({ success: false, message: '加载互动活动失败' })
  }
})

router.post('/interaction-events', async (req, res) => {
  const {
    title,
    description = '',
    event_time = '',
    location = '',
    cover_image = '',
    form_requirements = '',
    status = 'draft',
  } = req.body

  if (!title || !String(title).trim()) {
    return res.status(400).json({ success: false, message: '请填写活动标题' })
  }

  const safeStatus = EVENT_STATUSES.includes(status) ? status : 'draft'

  try {
    const [result] = await pool.query(
      `
        INSERT INTO interaction_events (
          title, description, event_time, location, cover_image, form_requirements, status
        )
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `,
      [
        String(title).trim(),
        String(description || '').trim(),
        String(event_time || '').trim(),
        String(location || '').trim(),
        String(cover_image || '').trim(),
        String(form_requirements || '').trim(),
        safeStatus,
      ],
    )

    return res.json({
      success: true,
      message: '互动活动已创建',
      data: { id: result.insertId },
    })
  } catch (error) {
    console.error('create interaction event error:', error)
    return res.status(500).json({ success: false, message: '创建互动活动失败' })
  }
})

router.put('/interaction-events/:id', async (req, res) => {
  const {
    title,
    description = '',
    event_time = '',
    location = '',
    cover_image = '',
    form_requirements = '',
    status = 'draft',
  } = req.body

  if (!title || !String(title).trim()) {
    return res.status(400).json({ success: false, message: '请填写活动标题' })
  }

  const safeStatus = EVENT_STATUSES.includes(status) ? status : 'draft'

  try {
    const [result] = await pool.query(
      `
        UPDATE interaction_events
        SET title = ?, description = ?, event_time = ?, location = ?, cover_image = ?, form_requirements = ?, status = ?
        WHERE id = ?
      `,
      [
        String(title).trim(),
        String(description || '').trim(),
        String(event_time || '').trim(),
        String(location || '').trim(),
        String(cover_image || '').trim(),
        String(form_requirements || '').trim(),
        safeStatus,
        req.params.id,
      ],
    )

    if (!result.affectedRows) {
      return res.status(404).json({ success: false, message: '互动活动不存在' })
    }

    return res.json({ success: true, message: '互动活动已更新' })
  } catch (error) {
    console.error('update interaction event error:', error)
    return res.status(500).json({ success: false, message: '更新互动活动失败' })
  }
})

router.patch('/interaction-events/:id/status', async (req, res) => {
  const status = EVENT_STATUSES.includes(req.body.status) ? req.body.status : 'draft'

  try {
    const [result] = await pool.query('UPDATE interaction_events SET status = ? WHERE id = ?', [
      status,
      req.params.id,
    ])

    if (!result.affectedRows) {
      return res.status(404).json({ success: false, message: '互动活动不存在' })
    }

    return res.json({ success: true, message: '互动活动状态已更新' })
  } catch (error) {
    console.error('update interaction event status error:', error)
    return res.status(500).json({ success: false, message: '更新互动活动状态失败' })
  }
})

router.get('/users', async (req, res) => {
  const role = normalizeUserRole(req.query.role)
  const status = normalizeUserStatus(req.query.status)
  const keyword = normalizeKeyword(req.query.keyword)
  const page = normalizePage(req.query.page)
  const limit = normalizeLimit(req.query.limit)
  const offset = (page - 1) * limit

  const whereClauses = []
  const params = []

  if (role !== 'all') {
    whereClauses.push('role = ?')
    params.push(role)
  }

  if (status !== 'all') {
    whereClauses.push('status = ?')
    params.push(status)
  }

  if (keyword) {
    whereClauses.push('(username LIKE ? OR display_name LIKE ? OR email LIKE ? OR phone LIKE ?)')
    const pattern = `%${keyword}%`
    params.push(pattern, pattern, pattern, pattern)
  }

  const whereSql = whereClauses.length ? `WHERE ${whereClauses.join(' AND ')}` : ''

  try {
    const [countRows, rows, roleSummary, statusSummary] = await Promise.all([
      pool.query(`SELECT COUNT(*) AS total FROM users ${whereSql}`, params),
      pool.query(
        `
          SELECT
            id,
            username,
            email,
            phone,
            display_name,
            avatar_url,
            bio,
            role,
            status,
            last_login_at,
            created_at,
            updated_at
          FROM users
          ${whereSql}
          ORDER BY created_at DESC
          LIMIT ? OFFSET ?
        `,
        [...params, limit, offset],
      ),
      pool.query(
        `
          SELECT role, COUNT(*) AS total
          FROM users
          GROUP BY role
        `,
      ),
      pool.query(
        `
          SELECT status, COUNT(*) AS total
          FROM users
          GROUP BY status
        `,
      ),
    ])

    const total = Number(countRows[0][0]?.total || 0)

    return res.json({
      success: true,
      data: {
        items: rows[0],
        total,
        currentPage: page,
        totalPages: Math.max(1, Math.ceil(total / limit)),
        roleSummary: USER_ROLES.reduce((summary, item) => {
          summary[item] = Number(roleSummary[0].find((row) => row.role === item)?.total || 0)
          return summary
        }, {}),
        statusSummary: USER_STATUSES.reduce((summary, item) => {
          summary[item] = Number(statusSummary[0].find((row) => row.status === item)?.total || 0)
          return summary
        }, {}),
      },
    })
  } catch (error) {
    console.error('admin users error:', error)
    return res.status(500).json({ success: false, message: '加载用户列表失败' })
  }
})

router.patch('/users/:id', async (req, res) => {
  const targetUserId = Number(req.params.id || 0)
  const nextRole = req.body.role && USER_ROLES.includes(req.body.role) ? req.body.role : null
  const nextStatus = req.body.status && USER_STATUSES.includes(req.body.status) ? req.body.status : null

  if (!targetUserId) {
    return res.status(400).json({ success: false, message: '无效的用户编号' })
  }

  if (!nextRole && !nextStatus) {
    return res.status(400).json({ success: false, message: '请至少提交一个需要更新的字段' })
  }

  if (Number(req.user?.id || 0) === targetUserId) {
    return res.status(400).json({ success: false, message: '暂不支持在后台直接修改当前登录账号的角色或状态' })
  }

  const connection = await pool.getConnection()

  try {
    await connection.beginTransaction()

    const [userRows] = await connection.query(
      `
        SELECT id, username, role, status
        FROM users
        WHERE id = ?
        LIMIT 1
      `,
      [targetUserId],
    )

    const targetUser = userRows[0]

    if (!targetUser) {
      await connection.rollback()
      return res.status(404).json({ success: false, message: '用户不存在' })
    }

    const finalRole = nextRole || targetUser.role
    const finalStatus = nextStatus || targetUser.status
    const removesManagerAccess =
      ['admin', 'moderator'].includes(targetUser.role) &&
      (!['admin', 'moderator'].includes(finalRole) || finalStatus !== 'active')

    if (removesManagerAccess) {
      const activeManagers = await countActiveManagers(connection)

      if (activeManagers <= 1) {
        await connection.rollback()
        return res.status(400).json({ success: false, message: '当前系统至少需要保留一个可用的后台管理员账号' })
      }
    }

    await connection.query(
      `
        UPDATE users
        SET role = ?, status = ?
        WHERE id = ?
      `,
      [finalRole, finalStatus, targetUserId],
    )

    await connection.commit()

    return res.json({
      success: true,
      message: `用户 ${targetUser.username} 的权限信息已更新`,
    })
  } catch (error) {
    await connection.rollback()
    console.error('update admin user error:', error)
    return res.status(500).json({ success: false, message: '更新用户角色或状态失败' })
  } finally {
    connection.release()
  }
})

router.get('/contact-messages', async (req, res) => {
  const status = normalizeListStatus(req.query.status, CONTACT_MESSAGE_STATUSES)
  const page = normalizePage(req.query.page)
  const limit = normalizeLimit(req.query.limit)
  const offset = (page - 1) * limit
  const hasStatusFilter = status !== 'all'

  try {
    const [countRows, rows, statusSummary] = await Promise.all([
      pool.query(
        `SELECT COUNT(*) AS total FROM contact_messages ${hasStatusFilter ? 'WHERE status = ?' : ''}`,
        hasStatusFilter ? [status] : [],
      ),
      pool.query(
        `
          SELECT id, user_id, name, contact_way, type, message, status, created_at, updated_at
          FROM contact_messages
          ${hasStatusFilter ? 'WHERE status = ?' : ''}
          ORDER BY created_at DESC
          LIMIT ? OFFSET ?
        `,
        hasStatusFilter ? [status, limit, offset] : [limit, offset],
      ),
      getCustomStatusSummary('contact_messages', CONTACT_MESSAGE_STATUSES),
    ])

    const total = Number(countRows[0][0]?.total || 0)

    return res.json({
      success: true,
      data: {
        items: rows[0],
        total,
        currentPage: page,
        totalPages: Math.max(1, Math.ceil(total / limit)),
        statusSummary,
      },
    })
  } catch (error) {
    console.error('admin contact messages error:', error)
    return res.status(500).json({ success: false, message: '加载联系留言失败' })
  }
})

router.patch('/contact-messages/:id/status', async (req, res) => {
  const status = normalizeUpdateStatus(req.body.status, CONTACT_MESSAGE_STATUSES, 'processing')

  try {
    const [result] = await pool.query('UPDATE contact_messages SET status = ? WHERE id = ?', [
      status,
      req.params.id,
    ])

    if (!result.affectedRows) {
      return res.status(404).json({ success: false, message: '联系留言不存在' })
    }

    return res.json({ success: true, message: '联系留言状态已更新' })
  } catch (error) {
    console.error('update contact message status error:', error)
    return res.status(500).json({ success: false, message: '更新联系留言状态失败' })
  }
})

router.get('/interaction-messages', async (req, res) => {
  const status = normalizeListStatus(req.query.status, INTERACTION_MESSAGE_STATUSES)
  const page = normalizePage(req.query.page)
  const limit = normalizeLimit(req.query.limit)
  const offset = (page - 1) * limit
  const hasStatusFilter = status !== 'all'

  try {
    const [countRows, rows, statusSummary] = await Promise.all([
      pool.query(
        `SELECT COUNT(*) AS total FROM interaction_messages ${hasStatusFilter ? 'WHERE status = ?' : ''}`,
        hasStatusFilter ? [status] : [],
      ),
      pool.query(
        `
          SELECT
            m.id,
            m.user_id,
            m.author_name,
            m.avatar_url,
            m.content,
            m.image_url,
            m.likes_count,
            m.status,
            m.created_at,
            m.updated_at,
            COALESCE(u.display_name, u.username) AS display_name
          FROM interaction_messages m
          LEFT JOIN users u ON u.id = m.user_id
          ${hasStatusFilter ? 'WHERE m.status = ?' : ''}
          ORDER BY m.created_at DESC
          LIMIT ? OFFSET ?
        `,
        hasStatusFilter ? [status, limit, offset] : [limit, offset],
      ),
      getCustomStatusSummary('interaction_messages', INTERACTION_MESSAGE_STATUSES),
    ])

    const total = Number(countRows[0][0]?.total || 0)

    return res.json({
      success: true,
      data: {
        items: rows[0],
        total,
        currentPage: page,
        totalPages: Math.max(1, Math.ceil(total / limit)),
        statusSummary,
      },
    })
  } catch (error) {
    console.error('admin interaction messages error:', error)
    return res.status(500).json({ success: false, message: '加载留言墙内容失败' })
  }
})

router.patch('/interaction-messages/:id/status', async (req, res) => {
  const status = normalizeUpdateStatus(req.body.status, INTERACTION_MESSAGE_STATUSES, 'hidden')

  try {
    const [result] = await pool.query('UPDATE interaction_messages SET status = ? WHERE id = ?', [
      status,
      req.params.id,
    ])

    if (!result.affectedRows) {
      return res.status(404).json({ success: false, message: '留言内容不存在' })
    }

    return res.json({ success: true, message: '留言显示状态已更新' })
  } catch (error) {
    console.error('update interaction message status error:', error)
    return res.status(500).json({ success: false, message: '更新留言显示状态失败' })
  }
})

router.get('/event-registrations', async (req, res) => {
  const page = normalizePage(req.query.page)
  const limit = normalizeLimit(req.query.limit)
  const offset = (page - 1) * limit

  try {
    const [countRows, rows] = await Promise.all([
      pool.query('SELECT COUNT(*) AS total FROM event_registrations'),
      pool.query(
        `
          SELECT
            r.id,
            r.event_id,
            r.user_id,
            r.user_name,
            r.phone,
            r.note,
            r.created_at,
            r.updated_at,
            e.title AS event_title,
            e.event_time,
            e.location,
            e.status AS event_status
          FROM event_registrations r
          JOIN interaction_events e ON e.id = r.event_id
          ORDER BY r.created_at DESC
          LIMIT ? OFFSET ?
        `,
        [limit, offset],
      ),
    ])

    const total = Number(countRows[0][0]?.total || 0)

    return res.json({
      success: true,
      data: {
        items: rows[0],
        total,
        currentPage: page,
        totalPages: Math.max(1, Math.ceil(total / limit)),
      },
    })
  } catch (error) {
    console.error('admin event registrations error:', error)
    return res.status(500).json({ success: false, message: '加载活动报名记录失败' })
  }
})

export default router
