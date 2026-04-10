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
    cb(null, `avatar_${Date.now()}${path.extname(file.originalname)}`)
  },
})

const upload = multer({ storage })

router.get('/profile', async (req, res) => {
  const { userId, username } = req.query

  if (!userId && !username) {
    return res.status(400).json({ success: false, message: '缺少用户标识' })
  }

  try {
    const [rows] = await pool.query(
      `
        SELECT
          id,
          username,
          display_name,
          phone,
          email,
          avatar_url,
          bio,
          role,
          status,
          created_at,
          last_login_at
        FROM users
        WHERE id = COALESCE(?, id) AND username = COALESCE(?, username)
        LIMIT 1
      `,
      [userId || null, username || null],
    )

    if (!rows.length) {
      return res.status(404).json({ success: false, message: '用户不存在' })
    }

    res.json({ success: true, data: rows[0] })
  } catch (error) {
    console.error('user profile error:', error)
    res.status(500).json({ success: false, message: '用户资料加载失败' })
  }
})

router.put('/profile', upload.single('avatar'), async (req, res) => {
  const { user_id, display_name, bio, phone } = req.body
  const avatarUrl = req.file ? `/uploads/${req.file.filename}` : null

  if (!user_id) {
    return res.status(400).json({ success: false, message: '缺少用户标识' })
  }

  try {
    if (avatarUrl) {
      await pool.query(
        `
          UPDATE users
          SET display_name = ?, bio = ?, phone = ?, avatar_url = ?
          WHERE id = ?
        `,
        [display_name || null, bio || '', phone || null, avatarUrl, user_id],
      )
    } else {
      await pool.query(
        `
          UPDATE users
          SET display_name = ?, bio = ?, phone = ?
          WHERE id = ?
        `,
        [display_name || null, bio || '', phone || null, user_id],
      )
    }

    const [rows] = await pool.query(
      `
        SELECT id, username, display_name, phone, avatar_url, bio, role, status
        FROM users
        WHERE id = ?
        LIMIT 1
      `,
      [user_id],
    )

    res.json({
      success: true,
      message: '个人资料已更新',
      data: rows[0],
    })
  } catch (error) {
    console.error('user update profile error:', error)
    res.status(500).json({ success: false, message: '资料更新失败' })
  }
})

router.get('/dashboard', async (req, res) => {
  const userId = Number(req.query.userId || 0)
  const username = req.query.username || null

  if (!userId && !username) {
    return res.status(400).json({ success: false, message: '缺少用户标识' })
  }

  try {
    const userFilter = userId
      ? { clause: 'u.id = ?', value: userId }
      : { clause: 'u.username = ?', value: username }

    const [[profileRows], [videoWorks], [embWorks], [skillWorks], [forumTopics], [interactionMessages], [contactMessages], [eventRegistrations]] =
      await Promise.all([
        pool.query(
          `
            SELECT
              u.id,
              u.username,
              u.display_name,
              u.phone,
              u.email,
              u.avatar_url,
              u.bio,
              u.role,
              u.status,
              u.created_at,
              u.last_login_at
            FROM users u
            WHERE ${userFilter.clause}
            LIMIT 1
          `,
          [userFilter.value],
        ),
        pool.query(
          `
            SELECT id, title, description, cover_url, status, votes_count, created_at
            FROM videos
            WHERE ${userId ? 'author_id = ?' : 'contributor_name = ?'}
            ORDER BY created_at DESC
          `,
          [userId || username],
        ),
        pool.query(
          `
            SELECT id, title, description, image_url, status, votes_count, created_at
            FROM emb_works
            WHERE ${userId ? 'author_id = ?' : 'author_name = ?'}
            ORDER BY created_at DESC
          `,
          [userId || username],
        ),
        pool.query(
          `
            SELECT id, title, description, image_url, status, created_at
            FROM skill_teaching_works
            WHERE ${userId ? 'user_id = ?' : 'author_name = ?'}
            ORDER BY created_at DESC
          `,
          [userId || username],
        ),
        pool.query(
          `
            SELECT
              t.id,
              t.title,
              t.content,
              t.created_at,
              t.replies_count,
              s.name AS section_name
            FROM forum_topics t
            JOIN forum_sections s ON s.id = t.section_id
            JOIN users u ON u.id = t.author_id
            WHERE ${userFilter.clause}
            ORDER BY t.created_at DESC
          `,
          [userFilter.value],
        ),
        pool.query(
          `
            SELECT id, content, likes_count, created_at
            FROM interaction_messages
            WHERE ${userId ? 'user_id = ?' : 'author_name = ?'}
            ORDER BY created_at DESC
          `,
          [userId || username],
        ),
        pool.query(
          `
            SELECT id, contact_way, type, message, status, created_at
            FROM contact_messages
            WHERE ${userId ? 'user_id = ?' : 'name = ?'}
            ORDER BY created_at DESC
          `,
          [userId || username],
        ),
        pool.query(
          `
            SELECT
              r.id,
              r.phone,
              r.note,
              r.created_at,
              e.title AS event_title,
              e.event_time,
              e.location
            FROM event_registrations r
            JOIN interaction_events e ON e.id = r.event_id
            WHERE ${userId ? 'r.user_id = ?' : 'r.user_name = ?'}
            ORDER BY r.created_at DESC
          `,
          [userId || username],
        ),
      ])

    const profile = profileRows[0]
    if (!profile) {
      return res.status(404).json({ success: false, message: '用户不存在' })
    }

    res.json({
      success: true,
      data: {
        profile,
        summary: {
          videoWorks: videoWorks.length,
          embWorks: embWorks.length,
          skillWorks: skillWorks.length,
          forumTopics: forumTopics.length,
          publicMessages: interactionMessages.length,
          contactMessages: contactMessages.length,
          eventRegistrations: eventRegistrations.length,
        },
        videoWorks,
        embWorks,
        skillWorks,
        forumTopics,
        interactionMessages,
        contactMessages,
        eventRegistrations,
      },
    })
  } catch (error) {
    console.error('user dashboard error:', error)
    res.status(500).json({ success: false, message: '用户中心数据加载失败' })
  }
})

export default router
