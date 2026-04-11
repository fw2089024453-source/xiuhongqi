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
    cb(null, `avatar_${Date.now()}${path.extname(file.originalname)}`)
  },
})

const upload = multer({ storage })

router.get('/profile', requireAuth, async (req, res) => {
  const userId = Number(req.user?.id || 0)

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
        WHERE id = ?
        LIMIT 1
      `,
      [userId],
    )

    if (!rows.length) {
      return res.status(404).json({ success: false, message: '用户不存在' })
    }

    return res.json({ success: true, data: rows[0] })
  } catch (error) {
    console.error('user profile error:', error)
    return res.status(500).json({ success: false, message: '用户资料加载失败' })
  }
})

router.put('/profile', requireAuth, upload.single('avatar'), async (req, res) => {
  const { display_name, bio, phone } = req.body
  const userId = Number(req.user?.id || 0)
  const avatarUrl = req.file ? `/uploads/${req.file.filename}` : null

  try {
    if (avatarUrl) {
      await pool.query(
        `
          UPDATE users
          SET display_name = ?, bio = ?, phone = ?, avatar_url = ?
          WHERE id = ?
        `,
        [display_name || null, bio || '', phone || null, avatarUrl, userId],
      )
    } else {
      await pool.query(
        `
          UPDATE users
          SET display_name = ?, bio = ?, phone = ?
          WHERE id = ?
        `,
        [display_name || null, bio || '', phone || null, userId],
      )
    }

    const [rows] = await pool.query(
      `
        SELECT id, username, display_name, phone, avatar_url, bio, role, status
        FROM users
        WHERE id = ?
        LIMIT 1
      `,
      [userId],
    )

    return res.json({
      success: true,
      message: '个人资料已更新',
      data: rows[0],
    })
  } catch (error) {
    console.error('user update profile error:', error)
    return res.status(500).json({ success: false, message: '资料更新失败' })
  }
})

router.get('/dashboard', requireAuth, async (req, res) => {
  const userId = Number(req.user?.id || 0)

  try {
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
            WHERE u.id = ?
            LIMIT 1
          `,
          [userId],
        ),
        pool.query(
          `
            SELECT id, title, description, cover_url, status, votes_count, created_at
            FROM videos
            WHERE author_id = ?
            ORDER BY created_at DESC
          `,
          [userId],
        ),
        pool.query(
          `
            SELECT id, title, description, image_url, status, votes_count, created_at
            FROM emb_works
            WHERE author_id = ?
            ORDER BY created_at DESC
          `,
          [userId],
        ),
        pool.query(
          `
            SELECT id, title, description, image_url, status, created_at
            FROM skill_teaching_works
            WHERE user_id = ?
            ORDER BY created_at DESC
          `,
          [userId],
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
            WHERE t.author_id = ?
            ORDER BY t.created_at DESC
          `,
          [userId],
        ),
        pool.query(
          `
            SELECT id, content, likes_count, created_at
            FROM interaction_messages
            WHERE user_id = ?
            ORDER BY created_at DESC
          `,
          [userId],
        ),
        pool.query(
          `
            SELECT id, contact_way, type, message, status, created_at
            FROM contact_messages
            WHERE user_id = ?
            ORDER BY created_at DESC
          `,
          [userId],
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
            WHERE r.user_id = ?
            ORDER BY r.created_at DESC
          `,
          [userId],
        ),
      ])

    const profile = profileRows[0]
    if (!profile) {
      return res.status(404).json({ success: false, message: '用户不存在' })
    }

    return res.json({
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
    return res.status(500).json({ success: false, message: '用户中心数据加载失败' })
  }
})

export default router
