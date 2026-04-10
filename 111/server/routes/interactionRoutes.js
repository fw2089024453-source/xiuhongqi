import express from 'express'
import multer from 'multer'
import path from 'path'
import { pool } from '../../config/db.js'

const router = express.Router()

const storage = multer.diskStorage({
  destination(req, file, cb) {
    cb(null, 'public/uploads/')
  },
  filename(req, file, cb) {
    cb(null, `interaction_${Date.now()}${path.extname(file.originalname)}`)
  },
})

const upload = multer({ storage })

router.get('/overview', async (req, res) => {
  try {
    const [
      [sectionsCount],
      [topicsCount],
      [messagesCount],
      [eventsCount],
      [latestTopics],
      [latestMessages],
      [latestEvents],
    ] = await Promise.all([
      pool.query("SELECT COUNT(*) AS total FROM forum_sections WHERE status = 'active'"),
      pool.query("SELECT COUNT(*) AS total FROM forum_topics WHERE status = 'active'"),
      pool.query("SELECT COUNT(*) AS total FROM interaction_messages WHERE status = 'visible'"),
      pool.query("SELECT COUNT(*) AS total FROM interaction_events WHERE status = 'published'"),
      pool.query(`
        SELECT
          t.id,
          t.title,
          t.created_at,
          t.replies_count,
          s.name AS section_name,
          COALESCE(u.display_name, u.username) AS author_name,
          'topic' AS category
        FROM forum_topics t
        JOIN forum_sections s ON s.id = t.section_id
        JOIN users u ON u.id = t.author_id
        WHERE t.status = 'active'
        ORDER BY COALESCE(t.last_reply_at, t.created_at) DESC
        LIMIT 4
      `),
      pool.query(`
        SELECT
          id,
          author_name,
          content,
          created_at,
          likes_count,
          'message' AS category
        FROM interaction_messages
        WHERE status = 'visible'
        ORDER BY created_at DESC
        LIMIT 4
      `),
      pool.query(`
        SELECT
          id,
          title,
          event_time,
          created_at,
          location,
          'event' AS category
        FROM interaction_events
        WHERE status = 'published'
        ORDER BY created_at DESC
        LIMIT 4
      `),
    ])

    res.json({
      success: true,
      data: {
        summary: {
          sections: sectionsCount[0]?.total || 0,
          topics: topicsCount[0]?.total || 0,
          messages: messagesCount[0]?.total || 0,
          events: eventsCount[0]?.total || 0,
        },
        latest: [...latestTopics, ...latestMessages, ...latestEvents]
          .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
          .slice(0, 6),
      },
    })
  } catch (error) {
    console.error('interaction overview error:', error)
    res.status(500).json({ success: false, message: '互动交流概览加载失败' })
  }
})

router.get('/forum/sections', async (req, res) => {
  try {
    const [rows] = await pool.query(`
      SELECT
        s.*,
        COUNT(t.id) AS actual_topics_count
      FROM forum_sections s
      LEFT JOIN forum_topics t
        ON t.section_id = s.id
        AND t.status = 'active'
      WHERE s.status = 'active'
      GROUP BY s.id
      ORDER BY s.sort_order ASC, s.id ASC
    `)

    res.json({ success: true, data: rows })
  } catch (error) {
    console.error('interaction sections error:', error)
    res.status(500).json({ success: false, message: '论坛分区加载失败' })
  }
})

router.get('/forum/topics', async (req, res) => {
  const { sectionId } = req.query

  try {
    const filters = ["t.status = 'active'"]
    const params = []

    if (sectionId) {
      filters.push('t.section_id = ?')
      params.push(sectionId)
    }

    const [rows] = await pool.query(
      `
        SELECT
          t.*,
          s.name AS section_name,
          COALESCE(u.display_name, u.username) AS author_name
        FROM forum_topics t
        JOIN forum_sections s ON s.id = t.section_id
        JOIN users u ON u.id = t.author_id
        WHERE ${filters.join(' AND ')}
        ORDER BY t.is_pinned DESC, COALESCE(t.last_reply_at, t.created_at) DESC
      `,
      params,
    )

    res.json({ success: true, data: rows })
  } catch (error) {
    console.error('interaction topics error:', error)
    res.status(500).json({ success: false, message: '话题列表加载失败' })
  }
})

router.post('/forum/topics', async (req, res) => {
  const { section_id, title, content, author_id } = req.body

  if (!section_id || !title || !content || !author_id) {
    return res.status(400).json({ success: false, message: '请填写完整的话题信息' })
  }

  try {
    const [result] = await pool.query(
      `
        INSERT INTO forum_topics (section_id, title, content, author_id, status)
        VALUES (?, ?, ?, ?, 'active')
      `,
      [section_id, title, content, author_id],
    )

    await pool.query('UPDATE forum_sections SET topics_count = topics_count + 1 WHERE id = ?', [section_id])

    res.json({
      success: true,
      message: '话题创建成功',
      data: { id: result.insertId },
    })
  } catch (error) {
    console.error('interaction create topic error:', error)
    res.status(500).json({ success: false, message: '话题创建失败' })
  }
})

router.get('/forum/topics/:id', async (req, res) => {
  try {
    const [[topicRows], [postsRows]] = await Promise.all([
      pool.query(
        `
          SELECT
            t.*,
            s.name AS section_name,
            COALESCE(u.display_name, u.username) AS author_name,
            u.avatar_url
          FROM forum_topics t
          JOIN forum_sections s ON s.id = t.section_id
          JOIN users u ON u.id = t.author_id
          WHERE t.id = ? AND t.status = 'active'
          LIMIT 1
        `,
        [req.params.id],
      ),
      pool.query(
        `
          SELECT
            p.*,
            COALESCE(u.display_name, u.username) AS author_name,
            u.avatar_url
          FROM forum_posts p
          JOIN users u ON u.id = p.author_id
          WHERE p.topic_id = ? AND p.is_deleted = FALSE
          ORDER BY p.created_at DESC
        `,
        [req.params.id],
      ),
    ])

    const topic = topicRows[0]
    if (!topic) {
      return res.status(404).json({ success: false, message: '话题不存在' })
    }

    await pool.query('UPDATE forum_topics SET views_count = views_count + 1 WHERE id = ?', [req.params.id])

    res.json({
      success: true,
      data: {
        ...topic,
        posts: postsRows,
      },
    })
  } catch (error) {
    console.error('interaction topic detail error:', error)
    res.status(500).json({ success: false, message: '话题详情加载失败' })
  }
})

router.get('/forum/topics/:id/posts', async (req, res) => {
  try {
    const [rows] = await pool.query(
      `
        SELECT
          p.*,
          COALESCE(u.display_name, u.username) AS author_name,
          u.avatar_url
        FROM forum_posts p
        JOIN users u ON u.id = p.author_id
        WHERE p.topic_id = ? AND p.is_deleted = FALSE
        ORDER BY p.created_at DESC
      `,
      [req.params.id],
    )

    res.json({ success: true, data: rows })
  } catch (error) {
    console.error('interaction posts error:', error)
    res.status(500).json({ success: false, message: '帖子列表加载失败' })
  }
})

router.post('/forum/topics/:id/posts', upload.single('image'), async (req, res) => {
  const { title, content, author_id } = req.body
  const imageUrl = req.file ? `/uploads/${req.file.filename}` : ''

  if (!content || !author_id) {
    return res.status(400).json({ success: false, message: '请填写帖子内容' })
  }

  try {
    const [result] = await pool.query(
      `
        INSERT INTO forum_posts (topic_id, title, content, author_id, image_url)
        VALUES (?, ?, ?, ?, ?)
      `,
      [req.params.id, title || null, content, author_id, imageUrl],
    )

    await pool.query(
      `
        UPDATE forum_topics
        SET replies_count = replies_count + 1, last_reply_at = NOW(), last_reply_by = ?
        WHERE id = ?
      `,
      [author_id, req.params.id],
    )

    res.json({
      success: true,
      message: '帖子发布成功',
      data: { id: result.insertId },
    })
  } catch (error) {
    console.error('interaction create post error:', error)
    res.status(500).json({ success: false, message: '帖子发布失败' })
  }
})

router.get('/forum/posts/:id/comments', async (req, res) => {
  const userId = Number(req.query.userId || 0)

  try {
    const [rows] = await pool.query(
      `
        SELECT
          c.*,
          COALESCE(u.display_name, u.username) AS author_name,
          u.avatar_url,
          CASE WHEN fcl.id IS NULL THEN 0 ELSE 1 END AS is_liked
        FROM forum_comments c
        JOIN users u ON u.id = c.author_id
        LEFT JOIN forum_comment_likes fcl
          ON fcl.comment_id = c.id
          AND fcl.user_id = ?
        WHERE c.post_id = ? AND c.is_deleted = FALSE
        ORDER BY c.likes_count DESC, c.created_at ASC
      `,
      [userId, req.params.id],
    )

    res.json({ success: true, data: rows })
  } catch (error) {
    console.error('interaction comments error:', error)
    res.status(500).json({ success: false, message: '评论列表加载失败' })
  }
})

router.post('/forum/posts/:id/comments', async (req, res) => {
  const { author_id, content } = req.body

  if (!author_id || !content) {
    return res.status(400).json({ success: false, message: '请填写评论内容' })
  }

  try {
    await pool.query(
      `
        INSERT INTO forum_comments (post_id, author_id, content)
        VALUES (?, ?, ?)
      `,
      [req.params.id, author_id, content],
    )

    await pool.query('UPDATE forum_posts SET comments_count = comments_count + 1 WHERE id = ?', [req.params.id])

    res.json({ success: true, message: '评论发布成功' })
  } catch (error) {
    console.error('interaction create comment error:', error)
    res.status(500).json({ success: false, message: '评论发布失败' })
  }
})

router.post('/forum/comments/:id/toggle-like', async (req, res) => {
  const userId = Number(req.body.userId || 0)

  if (!userId) {
    return res.status(400).json({ success: false, message: '请先登录' })
  }

  try {
    const [existing] = await pool.query(
      'SELECT id FROM forum_comment_likes WHERE comment_id = ? AND user_id = ?',
      [req.params.id, userId],
    )

    if (existing.length) {
      await pool.query('DELETE FROM forum_comment_likes WHERE comment_id = ? AND user_id = ?', [
        req.params.id,
        userId,
      ])
      await pool.query(
        'UPDATE forum_comments SET likes_count = GREATEST(0, likes_count - 1) WHERE id = ?',
        [req.params.id],
      )
      return res.json({ success: true, action: 'unliked' })
    }

    await pool.query('INSERT INTO forum_comment_likes (comment_id, user_id) VALUES (?, ?)', [
      req.params.id,
      userId,
    ])
    await pool.query('UPDATE forum_comments SET likes_count = likes_count + 1 WHERE id = ?', [
      req.params.id,
    ])
    res.json({ success: true, action: 'liked' })
  } catch (error) {
    console.error('interaction like comment error:', error)
    res.status(500).json({ success: false, message: '点赞失败' })
  }
})

router.get('/messages', async (req, res) => {
  try {
    const [rows] = await pool.query(`
      SELECT
        m.*,
        COALESCE(u.display_name, u.username, m.author_name) AS display_name,
        u.avatar_url AS user_avatar
      FROM interaction_messages m
      LEFT JOIN users u ON u.id = m.user_id
      WHERE m.status = 'visible'
      ORDER BY m.created_at DESC
    `)

    res.json({ success: true, data: rows })
  } catch (error) {
    console.error('interaction messages error:', error)
    res.status(500).json({ success: false, message: '留言列表加载失败' })
  }
})

router.post('/messages', upload.single('image'), async (req, res) => {
  const { user_id, author_name, content, avatar_url } = req.body
  const imageUrl = req.file ? `/uploads/${req.file.filename}` : ''

  if (!author_name || !content) {
    return res.status(400).json({ success: false, message: '请填写留言内容' })
  }

  try {
    await pool.query(
      `
        INSERT INTO interaction_messages (user_id, author_name, avatar_url, content, image_url, status)
        VALUES (?, ?, ?, ?, ?, 'visible')
      `,
      [user_id || null, author_name, avatar_url || '', content, imageUrl],
    )

    res.json({ success: true, message: '留言发布成功' })
  } catch (error) {
    console.error('interaction create message error:', error)
    res.status(500).json({ success: false, message: '留言发布失败' })
  }
})

router.post('/messages/:id/like', async (req, res) => {
  try {
    await pool.query('UPDATE interaction_messages SET likes_count = likes_count + 1 WHERE id = ?', [
      req.params.id,
    ])
    res.json({ success: true, message: '点赞成功' })
  } catch (error) {
    console.error('interaction like message error:', error)
    res.status(500).json({ success: false, message: '留言点赞失败' })
  }
})

router.get('/events', async (req, res) => {
  try {
    const [rows] = await pool.query(`
      SELECT
        e.*,
        COUNT(r.id) AS registration_count
      FROM interaction_events e
      LEFT JOIN event_registrations r ON r.event_id = e.id
      WHERE e.status = 'published'
      GROUP BY e.id
      ORDER BY e.created_at DESC
    `)

    res.json({ success: true, data: rows })
  } catch (error) {
    console.error('interaction events error:', error)
    res.status(500).json({ success: false, message: '活动列表加载失败' })
  }
})

router.post('/events/:id/register', async (req, res) => {
  const { user_id, user_name, phone, note } = req.body

  if (!user_name || !phone) {
    return res.status(400).json({ success: false, message: '请填写完整的报名信息' })
  }

  try {
    await pool.query(
      `
        INSERT INTO event_registrations (event_id, user_id, user_name, phone, note)
        VALUES (?, ?, ?, ?, ?)
      `,
      [req.params.id, user_id || null, user_name, phone, note || ''],
    )

    res.json({ success: true, message: '报名提交成功，请等待后续通知' })
  } catch (error) {
    console.error('interaction register event error:', error)
    res.status(500).json({ success: false, message: '活动报名失败' })
  }
})

export default router
