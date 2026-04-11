import dotenv from 'dotenv'
import jwt from 'jsonwebtoken'
import mysql from 'mysql2/promise'
import path from 'path'
import { openAsBlob } from 'node:fs'
import { promises as fs } from 'node:fs'
import { fileURLToPath } from 'node:url'

dotenv.config()

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const rootDir = path.resolve(__dirname, '..')
const port = Number(process.env.PORT || 3000)
const origin = process.env.SMOKE_TEST_ORIGIN || `http://127.0.0.1:${port}`
const apiBase = `${origin}/api`
const prefix = `SMOKE_${Date.now()}`
const likePrefix = `${prefix}%`
const cleanupFiles = new Set()
const results = []

const db = mysql.createPool({
  host: process.env.DB_HOST || '127.0.0.1',
  port: Number(process.env.DB_PORT || 3306),
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'xiuhongqi_digital',
  waitForConnections: true,
  connectionLimit: 5,
})

const smokeUser = {
  username: `${prefix.toLowerCase()}_user`,
  password: '123456',
  phone: `1${String(Date.now()).slice(-10)}`,
}

const state = {
  smokeUserId: null,
  smokeToken: '',
  adminToken: '',
  adminUser: null,
  sectionId: null,
  topicId: null,
  postId: null,
  commentId: null,
  eventId: null,
  videoId: null,
  videoCommentId: null,
  embId: null,
  embCommentId: null,
  skillWorkId: null,
}

function log(message) {
  console.log(message)
}

function assert(condition, message) {
  if (!condition) {
    throw new Error(message)
  }
}

async function apiRequest(endpoint, options = {}) {
  const {
    method = 'GET',
    token = '',
    json,
    form,
    expectedStatus = [200],
  } = options

  const headers = {}
  let body

  if (json) {
    headers['Content-Type'] = 'application/json'
    body = JSON.stringify(json)
  } else if (form) {
    body = form
  }

  if (token) {
    headers.Authorization = `Bearer ${token}`
  }

  const response = await fetch(`${apiBase}${endpoint}`, {
    method,
    headers,
    body,
  })

  let payload = null
  try {
    payload = await response.json()
  } catch {
    payload = null
  }

  const allowed = Array.isArray(expectedStatus) ? expectedStatus : [expectedStatus]
  if (!allowed.includes(response.status)) {
    throw new Error(
      `${method} ${endpoint} returned ${response.status}: ${payload?.message || payload?.error || 'Unknown error'}`,
    )
  }

  if (payload?.success === false) {
    throw new Error(`${method} ${endpoint} failed: ${payload.message || 'Unknown error'}`)
  }

  return payload
}

async function queryOne(sql, params = []) {
  const [rows] = await db.query(sql, params)
  return rows[0] || null
}

async function runStep(name, fn) {
  process.stdout.write(`- ${name} ... `)

  try {
    const value = await fn()
    results.push({ name, status: 'passed' })
    console.log('OK')
    return value
  } catch (error) {
    results.push({ name, status: 'failed', message: error.message })
    console.log('FAILED')
    throw error
  }
}

function toLocalPath(url) {
  if (typeof url !== 'string' || !url.startsWith('/uploads/')) {
    return ''
  }

  return path.join(rootDir, 'public', url.replace(/^\/uploads\//, `uploads${path.sep}`))
}

function trackFile(url) {
  if (Array.isArray(url)) {
    url.forEach(trackFile)
    return
  }

  const localPath = toLocalPath(url)
  if (localPath) {
    cleanupFiles.add(localPath)
  }
}

async function blobFromPath(filePath, type) {
  return openAsBlob(filePath, type ? { type } : undefined)
}

async function findFirstFile(directory) {
  const entries = await fs.readdir(directory)
  const firstFile = entries[0]
  if (!firstFile) {
    throw new Error(`No file found in ${directory}`)
  }

  return path.join(directory, firstFile)
}

async function collectUploadedFiles() {
  const [videoRows] = await db.query(
    `
      SELECT cover_url, video_url
      FROM videos
      WHERE title LIKE ?
    `,
    [likePrefix],
  )

  for (const row of videoRows) {
    trackFile(row.cover_url)
    trackFile(row.video_url)
  }

  const [embRows] = await db.query(
    `
      SELECT image_url
      FROM emb_works
      WHERE title LIKE ?
    `,
    [likePrefix],
  )

  for (const row of embRows) {
    try {
      const parsed = JSON.parse(row.image_url || '[]')
      if (Array.isArray(parsed)) {
        parsed.forEach(trackFile)
        continue
      }
    } catch {
      // ignore parse failures
    }

    trackFile(row.image_url)
  }

  const [skillRows] = await db.query(
    `
      SELECT image_url
      FROM skill_teaching_works
      WHERE title LIKE ?
    `,
    [likePrefix],
  )

  for (const row of skillRows) {
    trackFile(row.image_url)
  }
}

async function cleanupSmokeData() {
  await collectUploadedFiles()

  const connection = await db.getConnection()

  try {
    await connection.beginTransaction()

    const [videoRows] = await connection.query('SELECT id FROM videos WHERE title LIKE ?', [likePrefix])
    const videoIds = videoRows.map((row) => row.id)

    if (videoIds.length) {
      await connection.query(
        'DELETE FROM video_comment_likes WHERE comment_id IN (SELECT id FROM comments WHERE video_id IN (?))',
        [videoIds],
      )
      await connection.query('DELETE FROM comments WHERE video_id IN (?)', [videoIds])
      await connection.query('DELETE FROM votes_record WHERE video_id IN (?)', [videoIds])
      await connection.query('DELETE FROM videos WHERE id IN (?)', [videoIds])
    }

    const [embRows] = await connection.query('SELECT id FROM emb_works WHERE title LIKE ?', [likePrefix])
    const embIds = embRows.map((row) => row.id)

    if (embIds.length) {
      await connection.query(
        'DELETE FROM emb_comment_likes WHERE comment_id IN (SELECT id FROM emb_comments WHERE work_id IN (?))',
        [embIds],
      )
      await connection.query('DELETE FROM emb_comments WHERE work_id IN (?)', [embIds])
      await connection.query('DELETE FROM emb_votes_record WHERE work_id IN (?)', [embIds])
      await connection.query('DELETE FROM emb_works WHERE id IN (?)', [embIds])
    }

    const [topicRows] = await connection.query('SELECT id FROM forum_topics WHERE title LIKE ?', [likePrefix])
    const topicIds = topicRows.map((row) => row.id)

    if (topicIds.length) {
      const [postRows] = await connection.query('SELECT id FROM forum_posts WHERE topic_id IN (?)', [topicIds])
      const postIds = postRows.map((row) => row.id)

      if (postIds.length) {
        await connection.query(
          'DELETE FROM forum_comment_likes WHERE comment_id IN (SELECT id FROM forum_comments WHERE post_id IN (?))',
          [postIds],
        )
        await connection.query('DELETE FROM forum_comments WHERE post_id IN (?)', [postIds])
        await connection.query('DELETE FROM forum_posts WHERE id IN (?)', [postIds])
      }

      await connection.query('DELETE FROM forum_topics WHERE id IN (?)', [topicIds])
      await connection.query(
        `
          UPDATE forum_sections s
          SET topics_count = (
            SELECT COUNT(*)
            FROM forum_topics t
            WHERE t.section_id = s.id AND t.status = 'active'
          )
        `,
      )
    }

    await connection.query(
      `
        UPDATE forum_topics t
        SET replies_count = (
          SELECT COUNT(*)
          FROM forum_posts p
          WHERE p.topic_id = t.id AND p.is_deleted = FALSE
        ),
        last_reply_at = (
          SELECT MAX(p.created_at)
          FROM forum_posts p
          WHERE p.topic_id = t.id AND p.is_deleted = FALSE
        )
      `,
    )

    await connection.query('DELETE FROM contact_messages WHERE name LIKE ? OR message LIKE ?', [likePrefix, likePrefix])
    await connection.query('DELETE FROM interaction_messages WHERE author_name LIKE ? OR content LIKE ?', [likePrefix, likePrefix])
    await connection.query('DELETE FROM event_registrations WHERE user_name LIKE ? OR note LIKE ?', [likePrefix, likePrefix])
    await connection.query('DELETE FROM interaction_events WHERE title LIKE ?', [likePrefix])

    await connection.query('DELETE FROM skill_teaching_works WHERE title LIKE ? OR author_name LIKE ?', [likePrefix, likePrefix])
    await connection.query('DELETE FROM public_welfare_timelines WHERE title LIKE ? OR event_name LIKE ?', [likePrefix, likePrefix])
    await connection.query('DELETE FROM public_welfare_volunteers WHERE name LIKE ?', [likePrefix])
    await connection.query('DELETE FROM public_welfare_activities WHERE title LIKE ?', [likePrefix])
    await connection.query('DELETE FROM red_culture_spirit WHERE title LIKE ?', [likePrefix])
    await connection.query('DELETE FROM red_culture_history WHERE title LIKE ?', [likePrefix])
    await connection.query('DELETE FROM red_culture_stories WHERE title LIKE ?', [likePrefix])

    const [courseRows] = await connection.query('SELECT id FROM skill_teaching_courses WHERE title LIKE ?', [likePrefix])
    const courseIds = courseRows.map((row) => row.id)
    if (courseIds.length) {
      await connection.query('DELETE FROM course_chapters WHERE course_id IN (?)', [courseIds])
      await connection.query('DELETE FROM skill_teaching_courses WHERE id IN (?)', [courseIds])
    }

    await connection.query('DELETE FROM skill_teaching_resources WHERE title LIKE ?', [likePrefix])
    await connection.query('DELETE FROM skill_teaching_categories WHERE name LIKE ?', [likePrefix])
    await connection.query('DELETE FROM users WHERE username LIKE ?', [`${prefix.toLowerCase()}%`])

    await connection.commit()
  } catch (error) {
    await connection.rollback()
    throw error
  } finally {
    connection.release()
  }

  for (const filePath of cleanupFiles) {
    try {
      await fs.unlink(filePath)
    } catch {
      // ignore missing files
    }
  }
}

async function main() {
  await cleanupSmokeData()

  const adminUser = await queryOne(
    `
      SELECT id, username, display_name, role
      FROM users
      WHERE role IN ('admin', 'moderator') AND status = 'active'
      ORDER BY id ASC
      LIMIT 1
    `,
  )

  assert(adminUser, 'No active admin user found for smoke test')
  state.adminUser = adminUser
  state.adminToken = jwt.sign(
    {
      id: adminUser.id,
      username: adminUser.username,
      display_name: adminUser.display_name,
      role: adminUser.role,
    },
    process.env.JWT_SECRET || process.env.SESSION_SECRET || 'xiuhongqi_super_secret_key_2026',
    { expiresIn: '24h' },
  )

  const sampleVideoPath = await findFirstFile(path.join(rootDir, 'public', 'uploads', 'videos'))
  const sampleCoverPath = path.join(rootDir, 'public', 'uploads', 'demo-video-cover.svg')
  const sampleEmbImagePath = path.join(rootDir, 'public', 'uploads', 'demo-embroidery-a.svg')
  const sampleSkillImagePath = path.join(rootDir, 'public', 'uploads', 'demo-skill-course.svg')

  await runStep('健康检查', async () => {
    const response = await fetch(`${origin}/health`)
    const payload = await response.json()
    assert(response.ok, 'Health endpoint is unreachable')
    assert(payload.database === 'connected', 'Database is not connected')
  })

  await runStep('注册普通用户', async () => {
    const payload = await apiRequest('/auth/register', {
      method: 'POST',
      json: smokeUser,
    })

    assert(payload.success, 'Register did not return success')
  })

  await runStep('登录普通用户', async () => {
    const payload = await apiRequest('/auth/login', {
      method: 'POST',
      json: {
        username: smokeUser.username,
        password: smokeUser.password,
      },
    })

    state.smokeToken = payload.data?.token || ''
    state.smokeUserId = payload.data?.user?.id || null

    assert(state.smokeToken, 'Login token is empty')
    assert(state.smokeUserId, 'Smoke user id is empty')
  })

  await runStep('读取用户资料与用户中心', async () => {
    const [profile, dashboard] = await Promise.all([
      apiRequest('/user/profile', { token: state.smokeToken }),
      apiRequest('/user/dashboard', { token: state.smokeToken }),
    ])

    assert(profile.data?.username === smokeUser.username, 'Profile username mismatch')
    assert(dashboard.data?.profile?.id === state.smokeUserId, 'Dashboard profile mismatch')
  })

  await runStep('读取互动基础数据', async () => {
    const [sections, events] = await Promise.all([
      apiRequest('/interaction/forum/sections'),
      apiRequest('/interaction/events'),
    ])

    assert((sections.data || []).length > 0, 'No forum sections available')
    state.sectionId = sections.data[0].id

    if ((events.data || []).length > 0) {
      state.eventId = events.data[0].id
    }
  })

  await runStep('提交联系留言', async () => {
    const message = `${prefix} 联系留言测试`
    await apiRequest('/contact/submit', {
      method: 'POST',
      token: state.smokeToken,
      json: {
        name: prefix,
        contact_way: smokeUser.phone,
        type: 'feedback',
        message,
      },
      expectedStatus: [200, 201],
    })

    const row = await queryOne('SELECT id FROM contact_messages WHERE message = ? ORDER BY id DESC LIMIT 1', [message])
    assert(row, 'Contact message was not inserted')
  })

  await runStep('发布互动留言', async () => {
    await apiRequest('/interaction/messages', {
      method: 'POST',
      token: state.smokeToken,
      form: (() => {
        const form = new FormData()
        form.append('content', `${prefix} 互动留言测试`)
        return form
      })(),
    })

    const row = await queryOne(
      'SELECT id FROM interaction_messages WHERE content = ? ORDER BY id DESC LIMIT 1',
      [`${prefix} 互动留言测试`],
    )
    assert(row, 'Interaction message was not inserted')
  })

  await runStep('创建话题、帖子、评论与点赞', async () => {
    const topicTitle = `${prefix} 论坛话题`
    await apiRequest('/interaction/forum/topics', {
      method: 'POST',
      token: state.smokeToken,
      json: {
        section_id: state.sectionId,
        title: topicTitle,
        content: `${prefix} 论坛话题内容`,
      },
    })

    const topic = await queryOne('SELECT id FROM forum_topics WHERE title = ? ORDER BY id DESC LIMIT 1', [topicTitle])
    assert(topic, 'Forum topic was not inserted')
    state.topicId = topic.id

    const postPayload = new FormData()
    postPayload.append('title', `${prefix} 回帖标题`)
    postPayload.append('content', `${prefix} 回帖内容`)

    const postResult = await apiRequest(`/interaction/forum/topics/${state.topicId}/posts`, {
      method: 'POST',
      token: state.smokeToken,
      form: postPayload,
    })

    state.postId = postResult.data?.id || null
    assert(state.postId, 'Forum post id missing')

    await apiRequest(`/interaction/forum/posts/${state.postId}/comments`, {
      method: 'POST',
      token: state.smokeToken,
      json: {
        content: `${prefix} 评论内容`,
      },
    })

    const comment = await queryOne(
      'SELECT id FROM forum_comments WHERE post_id = ? AND content = ? ORDER BY id DESC LIMIT 1',
      [state.postId, `${prefix} 评论内容`],
    )
    assert(comment, 'Forum comment was not inserted')
    state.commentId = comment.id

    const likeResult = await apiRequest(`/interaction/forum/comments/${state.commentId}/toggle-like`, {
      method: 'POST',
      token: state.smokeToken,
    })
    assert(likeResult.action === 'liked', 'Forum comment like did not toggle to liked')
  })

  await runStep('后台处理联系留言与互动留言', async () => {
    const [contactList, messageList] = await Promise.all([
      apiRequest('/admin/contact-messages', {
        token: state.adminToken,
      }),
      apiRequest('/admin/interaction-messages', {
        token: state.adminToken,
      }),
    ])

    const contactItem = (contactList.data?.items || []).find((item) => item.name === prefix)
    const messageItem = (messageList.data?.items || []).find((item) => item.content === `${prefix} 互动留言测试`)

    assert(contactItem, 'Admin contact list missing smoke message')
    assert(messageItem, 'Admin interaction list missing smoke message')

    await apiRequest(`/admin/contact-messages/${contactItem.id}/status`, {
      method: 'PATCH',
      token: state.adminToken,
      json: { status: 'resolved' },
    })

    await apiRequest(`/admin/interaction-messages/${messageItem.id}/status`, {
      method: 'PATCH',
      token: state.adminToken,
      json: { status: 'hidden' },
    })

    await apiRequest(`/admin/interaction-messages/${messageItem.id}/status`, {
      method: 'PATCH',
      token: state.adminToken,
      json: { status: 'visible' },
    })
  })

  await runStep('后台创建活动并完成报名链路', async () => {
    const createResult = await apiRequest('/admin/interaction-events', {
      method: 'POST',
      token: state.adminToken,
      json: {
        title: `${prefix} 活动`,
        description: `${prefix} 活动描述`,
        event_time: '2026-05-01 14:00',
        location: '线上会议室',
        cover_image: '/uploads/demo-event.svg',
        form_requirements: `${prefix} 报名说明`,
        status: 'draft',
      },
    })

    state.eventId = createResult.data?.id || null
    assert(state.eventId, 'Created event id missing')

    await apiRequest(`/admin/interaction-events/${state.eventId}`, {
      method: 'PUT',
      token: state.adminToken,
      json: {
        title: `${prefix} 活动已更新`,
        description: `${prefix} 活动描述已更新`,
        event_time: '2026-05-02 15:00',
        location: '线下工作坊',
        cover_image: '/uploads/demo-event.svg',
        form_requirements: `${prefix} 报名要求`,
        status: 'published',
      },
    })

    await apiRequest(`/interaction/events/${state.eventId}/register`, {
      method: 'POST',
      token: state.smokeToken,
      json: {
        phone: smokeUser.phone,
        note: `${prefix} 报名备注`,
      },
    })

    const registrations = await apiRequest('/admin/event-registrations', {
      token: state.adminToken,
    })
    const target = (registrations.data?.items || []).find((item) => item.event_id === state.eventId)
    assert(target, 'Admin registrations list missing smoke registration')
  })

  await runStep('后台管理论坛话题和帖子', async () => {
    const topics = await apiRequest('/admin/forum-topics', {
      token: state.adminToken,
    })
    const targetTopic = (topics.data?.items || []).find((item) => item.id === state.topicId)
    assert(targetTopic, 'Admin topic list missing smoke topic')

    await apiRequest(`/admin/forum-topics/${state.topicId}/status`, {
      method: 'PATCH',
      token: state.adminToken,
      json: { status: 'closed' },
    })

    await apiRequest(`/admin/forum-topics/${state.topicId}/status`, {
      method: 'PATCH',
      token: state.adminToken,
      json: { status: 'active' },
    })

    const posts = await apiRequest('/admin/forum-posts', {
      token: state.adminToken,
    })
    const targetPost = (posts.data?.items || []).find((item) => item.id === state.postId)
    assert(targetPost, 'Admin post list missing smoke post')

    await apiRequest(`/admin/forum-posts/${state.postId}/visibility`, {
      method: 'PATCH',
      token: state.adminToken,
      json: { is_deleted: true },
    })

    await apiRequest(`/admin/forum-posts/${state.postId}/visibility`, {
      method: 'PATCH',
      token: state.adminToken,
      json: { is_deleted: false },
    })
  })

  await runStep('视频大赛投稿、审核、投票、评论链路', async () => {
    const title = `${prefix} 视频作品`
    const form = new FormData()
    form.append('title', title)
    form.append('description', `${prefix} 视频作品描述`)
    form.append('category', '创作记录')
    form.append('phone', smokeUser.phone)
    form.append('cover', await blobFromPath(sampleCoverPath, 'image/svg+xml'), 'smoke-cover.svg')
    form.append('video', await blobFromPath(sampleVideoPath, 'video/mp4'), path.basename(sampleVideoPath))

    await apiRequest('/video-contest/works', {
      method: 'POST',
      token: state.smokeToken,
      form,
      expectedStatus: [200, 201],
    })

    const pendingList = await apiRequest('/admin/video-works', {
      token: state.adminToken,
    })
    const createdWork = (pendingList.data?.items || []).find((item) => item.title === title)
    assert(createdWork, 'Admin pending video list missing smoke work')
    state.videoId = createdWork.id
    trackFile(createdWork.cover_url)
    trackFile(createdWork.video_url)

    await apiRequest(`/admin/video-works/${state.videoId}/status`, {
      method: 'PATCH',
      token: state.adminToken,
      json: { status: 'approved' },
    })

    await apiRequest(`/video-contest/works/${state.videoId}/vote`, {
      method: 'POST',
      token: state.smokeToken,
    })

    await apiRequest(`/video-contest/works/${state.videoId}/comments`, {
      method: 'POST',
      token: state.smokeToken,
      json: {
        content: `${prefix} 视频评论`,
      },
    })

    const comment = await queryOne(
      'SELECT id FROM comments WHERE video_id = ? AND content = ? ORDER BY id DESC LIMIT 1',
      [state.videoId, `${prefix} 视频评论`],
    )
    assert(comment, 'Video comment was not inserted')
    state.videoCommentId = comment.id

    const likeResult = await apiRequest(`/video-contest/works/comments/${state.videoCommentId}/like`, {
      method: 'POST',
      token: state.smokeToken,
    })
    assert(likeResult.action === 'liked', 'Video comment like did not toggle to liked')
  })

  await runStep('绣红旗大赛投稿、审核、投票、评论链路', async () => {
    const title = `${prefix} 绣作作品`
    const form = new FormData()
    form.append('title', title)
    form.append('description', `${prefix} 绣作作品描述`)
    form.append('category', '主题创作')
    form.append('phone', smokeUser.phone)
    form.append('images', await blobFromPath(sampleEmbImagePath, 'image/svg+xml'), 'smoke-embroidery.svg')

    await apiRequest('/emb-contest/works', {
      method: 'POST',
      token: state.smokeToken,
      form,
      expectedStatus: [200, 201],
    })

    const pendingList = await apiRequest('/admin/emb-works', {
      token: state.adminToken,
    })
    const createdWork = (pendingList.data?.items || []).find((item) => item.title === title)
    assert(createdWork, 'Admin embroidery list missing smoke work')
    state.embId = createdWork.id

    try {
      const parsed = JSON.parse(createdWork.image_url || '[]')
      if (Array.isArray(parsed)) {
        parsed.forEach(trackFile)
      }
    } catch {
      trackFile(createdWork.image_url)
    }

    await apiRequest(`/admin/emb-works/${state.embId}/status`, {
      method: 'PATCH',
      token: state.adminToken,
      json: { status: 'approved' },
    })

    await apiRequest(`/emb-contest/works/${state.embId}/vote`, {
      method: 'POST',
      token: state.smokeToken,
    })

    await apiRequest(`/emb-contest/works/${state.embId}/comments`, {
      method: 'POST',
      token: state.smokeToken,
      json: {
        content: `${prefix} 绣作评论`,
      },
    })

    const comment = await queryOne(
      'SELECT id FROM emb_comments WHERE work_id = ? AND content = ? ORDER BY id DESC LIMIT 1',
      [state.embId, `${prefix} 绣作评论`],
    )
    assert(comment, 'Embroidery comment was not inserted')
    state.embCommentId = comment.id

    const likeResult = await apiRequest(`/emb-contest/works/comments/${state.embCommentId}/like`, {
      method: 'POST',
      token: state.smokeToken,
    })
    assert(likeResult.action === 'liked', 'Embroidery comment like did not toggle to liked')
  })

  await runStep('技艺教学投稿与审核链路', async () => {
    const title = `${prefix} 教学作业`
    const form = new FormData()
    form.append('title', title)
    form.append('description', `${prefix} 教学作业描述`)
    form.append('image', await blobFromPath(sampleSkillImagePath, 'image/svg+xml'), 'smoke-skill.svg')

    await apiRequest('/skill-teaching/works', {
      method: 'POST',
      token: state.smokeToken,
      form,
    })

    const works = await apiRequest('/skill-teaching/admin/works', {
      token: state.adminToken,
    })
    const createdWork = (works.data || []).find((item) => item.title === title)
    assert(createdWork, 'Admin skill works list missing smoke work')
    state.skillWorkId = createdWork.id
    trackFile(createdWork.image_url)

    await apiRequest(`/skill-teaching/admin/works/${state.skillWorkId}/status`, {
      method: 'PATCH',
      token: state.adminToken,
      json: { status: 'approved' },
    })

    const publicWorks = await apiRequest('/skill-teaching/works')
    assert((publicWorks.data || []).some((item) => item.id === state.skillWorkId), 'Approved skill work is not visible')
  })

  await runStep('红旗文化后台 CRUD', async () => {
    await apiRequest('/red-culture/admin/galleries', {
      method: 'POST',
      token: state.adminToken,
      json: {
        title: `${prefix} 红旗故事`,
        description: `${prefix} 红旗故事描述`,
        author: prefix,
        year: 2026,
        location: '武汉',
        image_url: '/uploads/demo-red-culture.svg',
        status: 'published',
      },
    })

    const story = await queryOne('SELECT id FROM red_culture_stories WHERE title = ? ORDER BY id DESC LIMIT 1', [`${prefix} 红旗故事`])
    assert(story, 'Red culture story was not inserted')

    await apiRequest(`/red-culture/admin/galleries/${story.id}`, {
      method: 'PUT',
      token: state.adminToken,
      json: {
        title: `${prefix} 红旗故事已更新`,
        description: `${prefix} 红旗故事描述已更新`,
        author: prefix,
        year: 2026,
        location: '黄石',
        image_url: '/uploads/demo-red-culture.svg',
        status: 'published',
      },
    })

    await apiRequest('/red-culture/admin/timelines', {
      method: 'POST',
      token: state.adminToken,
      json: {
        title: `${prefix} 红旗时间线`,
        description: `${prefix} 时间线描述`,
        year: 2026,
        event_name: `${prefix} 关键事件`,
        importance: 'high',
        image_url: '/uploads/demo-red-culture.svg',
        status: 'published',
      },
    })

    const timeline = await queryOne('SELECT id FROM red_culture_history WHERE title = ? ORDER BY id DESC LIMIT 1', [`${prefix} 红旗时间线`])
    assert(timeline, 'Red culture timeline was not inserted')

    await apiRequest(`/red-culture/admin/timelines/${timeline.id}`, {
      method: 'PUT',
      token: state.adminToken,
      json: {
        title: `${prefix} 红旗时间线已更新`,
        description: `${prefix} 时间线描述已更新`,
        year: 2026,
        event_name: `${prefix} 关键事件已更新`,
        importance: 'medium',
        image_url: '/uploads/demo-red-culture.svg',
        status: 'published',
      },
    })

    await apiRequest('/red-culture/admin/quotes', {
      method: 'POST',
      token: state.adminToken,
      json: {
        author_name: `${prefix} 精神人物`,
        quote: `${prefix} 精神语录`,
        avatar_url: '/uploads/demo-portrait-a.svg',
        importance: 'medium',
        status: 'published',
      },
    })

    const quote = await queryOne('SELECT id FROM red_culture_spirit WHERE title = ? ORDER BY id DESC LIMIT 1', [`${prefix} 精神人物`])
    assert(quote, 'Red culture quote was not inserted')

    await apiRequest(`/red-culture/admin/quotes/${quote.id}`, {
      method: 'PUT',
      token: state.adminToken,
      json: {
        author_name: `${prefix} 精神人物已更新`,
        quote: `${prefix} 精神语录已更新`,
        avatar_url: '/uploads/demo-portrait-b.svg',
        importance: 'low',
        status: 'published',
      },
    })
  })

  await runStep('公益纪实后台 CRUD', async () => {
    await apiRequest('/public-welfare/admin/activities', {
      method: 'POST',
      token: state.adminToken,
      json: {
        title: `${prefix} 公益活动`,
        description: `${prefix} 公益活动描述`,
        detailed_content: `${prefix} 公益活动详情`,
        start_date: '2026-05-01',
        end_date: '2026-05-03',
        location: '黄石',
        organizer: prefix,
        contact_info: smokeUser.phone,
        target_participants: 20,
        image_url: '/uploads/demo-welfare.svg',
        gallery_images: ['/uploads/demo-welfare.svg'],
        status: 'ongoing',
      },
    })

    const activity = await queryOne('SELECT id FROM public_welfare_activities WHERE title = ? ORDER BY id DESC LIMIT 1', [`${prefix} 公益活动`])
    assert(activity, 'Public welfare activity was not inserted')

    await apiRequest(`/public-welfare/admin/activities/${activity.id}`, {
      method: 'PUT',
      token: state.adminToken,
      json: {
        title: `${prefix} 公益活动已更新`,
        description: `${prefix} 公益活动描述已更新`,
        detailed_content: `${prefix} 公益活动详情已更新`,
        start_date: '2026-05-04',
        end_date: '2026-05-05',
        location: '武汉',
        organizer: `${prefix} 组织者`,
        contact_info: smokeUser.phone,
        target_participants: 30,
        image_url: '/uploads/demo-welfare.svg',
        gallery_images: ['/uploads/demo-welfare.svg'],
        status: 'completed',
      },
    })

    await apiRequest('/public-welfare/admin/volunteers', {
      method: 'POST',
      token: state.adminToken,
      json: {
        name: `${prefix} 志愿者`,
        role: '讲解员',
        quote: `${prefix} 志愿者寄语`,
        introduction: `${prefix} 志愿者介绍`,
        stat_years: 2,
        stat_projects: 6,
        stat_people: 120,
        avatar_url: '/uploads/demo-portrait-a.svg',
        sort_order: 1,
      },
    })

    const volunteer = await queryOne('SELECT id FROM public_welfare_volunteers WHERE name = ? ORDER BY id DESC LIMIT 1', [`${prefix} 志愿者`])
    assert(volunteer, 'Public welfare volunteer was not inserted')

    await apiRequest(`/public-welfare/admin/volunteers/${volunteer.id}`, {
      method: 'PUT',
      token: state.adminToken,
      json: {
        name: `${prefix} 志愿者已更新`,
        role: '组织者',
        quote: `${prefix} 志愿者寄语已更新`,
        introduction: `${prefix} 志愿者介绍已更新`,
        stat_years: 3,
        stat_projects: 8,
        stat_people: 160,
        avatar_url: '/uploads/demo-portrait-b.svg',
        sort_order: 2,
      },
    })

    await apiRequest('/public-welfare/admin/timelines', {
      method: 'POST',
      token: state.adminToken,
      json: {
        year: 2026,
        event_name: `${prefix} 公益节点`,
        title: `${prefix} 公益时间线`,
        description: `${prefix} 公益时间线描述`,
        image_urls: ['/uploads/demo-welfare.svg'],
        sort_order: 1,
      },
    })

    const timeline = await queryOne('SELECT id FROM public_welfare_timelines WHERE title = ? ORDER BY id DESC LIMIT 1', [`${prefix} 公益时间线`])
    assert(timeline, 'Public welfare timeline was not inserted')

    await apiRequest(`/public-welfare/admin/timelines/${timeline.id}`, {
      method: 'PUT',
      token: state.adminToken,
      json: {
        year: 2027,
        event_name: `${prefix} 公益节点已更新`,
        title: `${prefix} 公益时间线已更新`,
        description: `${prefix} 公益时间线描述已更新`,
        image_urls: ['/uploads/demo-welfare.svg'],
        sort_order: 2,
      },
    })
  })

  await runStep('技艺教学后台课程 CRUD', async () => {
    await apiRequest('/skill-teaching/admin/categories', {
      method: 'POST',
      token: state.adminToken,
      json: {
        name: `${prefix} 课程分类`,
        description: `${prefix} 分类描述`,
        sort_order: 1,
        status: 'active',
      },
    })

    const category = await queryOne('SELECT id FROM skill_teaching_categories WHERE name = ? ORDER BY id DESC LIMIT 1', [`${prefix} 课程分类`])
    assert(category, 'Skill category was not inserted')

    await apiRequest(`/skill-teaching/admin/categories/${category.id}`, {
      method: 'PUT',
      token: state.adminToken,
      json: {
        name: `${prefix} 课程分类已更新`,
        description: `${prefix} 分类描述已更新`,
        sort_order: 2,
        status: 'active',
      },
    })

    await apiRequest('/skill-teaching/admin/resources', {
      method: 'POST',
      token: state.adminToken,
      json: {
        title: `${prefix} 学习资源`,
        description: `${prefix} 学习资源描述`,
        file_url: '/uploads/demo-resource-guide.txt',
        file_type: 'TXT',
        sort_order: 1,
        status: 'active',
      },
    })

    const resource = await queryOne('SELECT id FROM skill_teaching_resources WHERE title = ? ORDER BY id DESC LIMIT 1', [`${prefix} 学习资源`])
    assert(resource, 'Skill resource was not inserted')

    await apiRequest(`/skill-teaching/admin/resources/${resource.id}`, {
      method: 'PUT',
      token: state.adminToken,
      json: {
        title: `${prefix} 学习资源已更新`,
        description: `${prefix} 学习资源描述已更新`,
        file_url: '/uploads/demo-resource-pattern.txt',
        file_type: 'TXT',
        sort_order: 2,
        status: 'active',
      },
    })

    await apiRequest('/skill-teaching/admin/courses', {
      method: 'POST',
      token: state.adminToken,
      json: {
        category_id: category.id,
        title: `${prefix} 教学课程`,
        description: `${prefix} 教学课程描述`,
        detailed_content: `${prefix} 教学课程详情`,
        difficulty: 'beginner',
        estimated_hours: 4,
        cover_image: '/uploads/demo-skill-course.svg',
        video_url: 'https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4',
        materials_list: ['针线', '布料'],
        instructor_id: state.adminUser.id,
        is_featured: true,
        status: 'published',
        chapters: [
          {
            chapter_number: 1,
            title: `${prefix} 第一章`,
            content: `${prefix} 第一章内容`,
            video_url: 'https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4',
            duration_minutes: 18,
            sort_order: 1,
          },
        ],
      },
    })

    const course = await queryOne('SELECT id FROM skill_teaching_courses WHERE title = ? ORDER BY id DESC LIMIT 1', [`${prefix} 教学课程`])
    assert(course, 'Skill course was not inserted')

    const detail = await apiRequest(`/skill-teaching/admin/courses/${course.id}`, {
      token: state.adminToken,
    })
    assert((detail.data?.chapters || []).length === 1, 'Skill course detail missing chapter')

    await apiRequest(`/skill-teaching/admin/courses/${course.id}`, {
      method: 'PUT',
      token: state.adminToken,
      json: {
        category_id: category.id,
        title: `${prefix} 教学课程已更新`,
        description: `${prefix} 教学课程描述已更新`,
        detailed_content: `${prefix} 教学课程详情已更新`,
        difficulty: 'intermediate',
        estimated_hours: 6,
        cover_image: '/uploads/demo-skill-course.svg',
        video_url: 'https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4',
        materials_list: ['针线', '布料', '图纸'],
        instructor_id: state.adminUser.id,
        is_featured: false,
        status: 'published',
        chapters: [
          {
            chapter_number: 1,
            title: `${prefix} 第一章已更新`,
            content: `${prefix} 第一章内容已更新`,
            video_url: '',
            duration_minutes: 24,
            sort_order: 1,
          },
          {
            chapter_number: 2,
            title: `${prefix} 第二章`,
            content: `${prefix} 第二章内容`,
            video_url: '',
            duration_minutes: 20,
            sort_order: 2,
          },
        ],
      },
    })
  })

  await runStep('后台用户列表与用户中心复核', async () => {
    const [users, dashboard] = await Promise.all([
      apiRequest('/admin/users', { token: state.adminToken }),
      apiRequest('/user/dashboard', { token: state.smokeToken }),
    ])

    assert((users.data?.items || []).some((item) => item.username === smokeUser.username), 'Admin users list missing smoke user')
    assert((dashboard.data?.videoWorks || []).length > 0, 'Dashboard missing submitted video work')
    assert((dashboard.data?.embWorks || []).length > 0, 'Dashboard missing submitted embroidery work')
    assert((dashboard.data?.skillWorks || []).length > 0, 'Dashboard missing submitted skill work')
    assert((dashboard.data?.forumTopics || []).length > 0, 'Dashboard missing forum topic')
    assert((dashboard.data?.interactionMessages || []).length > 0, 'Dashboard missing interaction message')
    assert((dashboard.data?.contactMessages || []).length > 0, 'Dashboard missing contact message')
    assert((dashboard.data?.eventRegistrations || []).length > 0, 'Dashboard missing event registration')
  })
}

try {
  await main()
  log('')
  log('Smoke test completed successfully.')
  log(`Origin: ${origin}`)
  log(`User: ${smokeUser.username}`)
  process.exitCode = 0
} catch (error) {
  log('')
  log(`Smoke test failed: ${error.message}`)
  process.exitCode = 1
} finally {
  try {
    await cleanupSmokeData()
  } catch (cleanupError) {
    log(`Cleanup warning: ${cleanupError.message}`)
    process.exitCode = 1
  }

  await db.end()

  if (results.length) {
    log('')
    log('Step summary:')
    for (const item of results) {
      const suffix = item.message ? ` - ${item.message}` : ''
      log(`  [${item.status === 'passed' ? 'PASS' : 'FAIL'}] ${item.name}${suffix}`)
    }
  }
}
