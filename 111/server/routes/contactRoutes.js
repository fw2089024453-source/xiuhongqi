import express from 'express'
import { pool } from '../../config/db.js'

const router = express.Router()

const contactInfo = {
  company: '湖北田静之科技有限公司',
  address: '湖北省武汉市武昌区东湖路169号',
  hotline: '13807172139',
  email: '3353562764@qq.com',
  serviceHours: '周一至周五 09:00 - 18:00',
}

router.get('/overview', async (req, res) => {
  try {
    const [[countRows], [latestRows]] = await Promise.all([
      pool.query('SELECT COUNT(*) AS total FROM contact_messages'),
      pool.query(`
        SELECT id, name, type, created_at
        FROM contact_messages
        ORDER BY created_at DESC
        LIMIT 5
      `),
    ])

    res.json({
      success: true,
      data: {
        info: contactInfo,
        summary: {
          messages: countRows[0]?.total || 0,
        },
        latest: latestRows,
      },
    })
  } catch (error) {
    console.error('contact overview error:', error)
    res.status(500).json({ success: false, message: '联系我们数据加载失败' })
  }
})

router.post('/submit', async (req, res) => {
  const { user_id, name, contact_way, type, message } = req.body

  if (!name || !contact_way || !message) {
    return res.status(400).json({ success: false, message: '请填写完整的联系信息和留言内容' })
  }

  try {
    await pool.query(
      `
        INSERT INTO contact_messages (user_id, name, contact_way, type, message, status)
        VALUES (?, ?, ?, ?, ?, 'new')
      `,
      [user_id || null, name, contact_way, type || 'other', message],
    )

    res.json({ success: true, message: '留言提交成功，我们会尽快与你联系' })
  } catch (error) {
    console.error('contact submit error:', error)
    res.status(500).json({ success: false, message: '留言提交失败' })
  }
})

router.get('/messages', async (req, res) => {
  try {
    const [rows] = await pool.query(`
      SELECT id, name, contact_way, type, message, status, created_at
      FROM contact_messages
      ORDER BY created_at DESC
    `)

    res.json({ success: true, data: rows })
  } catch (error) {
    console.error('contact messages error:', error)
    res.status(500).json({ success: false, message: '留言列表加载失败' })
  }
})

export default router
