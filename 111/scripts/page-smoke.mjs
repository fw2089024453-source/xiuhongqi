import dotenv from 'dotenv'
import { chromium } from 'playwright'
import mysql from 'mysql2/promise'
import jwt from 'jsonwebtoken'
import { spawn } from 'node:child_process'
import { existsSync, promises as fs } from 'node:fs'
import path from 'node:path'

dotenv.config()

const port = Number(process.env.PAGE_SMOKE_PORT || 3201)
const origin = `http://127.0.0.1:${port}`
const apiBase = `${origin}/api`
const npmCommand = process.platform === 'win32' ? 'npm.cmd' : 'npm'
const nodeCommand = process.execPath
const rootDir = process.cwd()
const prefix = `PAGE_${Date.now()}`
const likePrefix = `${prefix}%`
const cleanupFiles = new Set()

const pageUser = {
  username: `${prefix.toLowerCase()}_user`,
  password: '123456',
  phone: `1${String(Date.now()).slice(-10)}`,
}

const fixture = {
  contactName: `${prefix}_CONTACT`,
  contactMessage: `${prefix} contact message`,
  interactionMessage: `${prefix} interaction message`,
  topicTitle: `${prefix} forum topic`,
  topicContent: `${prefix} forum topic content`,
  postTitle: `${prefix} forum post`,
  postContent: `${prefix} forum post content`,
  commentContent: `${prefix} forum comment`,
  eventTitle: `${prefix} event`,
  eventDescription: `${prefix} event description`,
  eventLocation: 'Online Meeting Room',
  eventRequirements: `${prefix} event requirements`,
  eventNote: `${prefix} registration note`,
  videoTitle: `${prefix} video work`,
  videoDescription: `${prefix} video description`,
  videoComment: `${prefix} video comment`,
  embTitle: `${prefix} embroidery work`,
  embDescription: `${prefix} embroidery description`,
  embComment: `${prefix} embroidery comment`,
  skillWorkTitle: `${prefix} skill work`,
  skillWorkDescription: `${prefix} skill work description`,
}

const browserCandidates = [
  'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
  'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe',
  'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
  'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
]

const publicRoutes = [
  { path: '/', selector: '.home-page' },
  { path: '/video-contest', selector: '.vc-page' },
  { path: '/emb-contest', selector: '.ec-page' },
  { path: '/red-culture', selector: '.red-culture-page' },
  { path: '/public-welfare', selector: '.pw-page' },
  { path: '/skill-teaching', selector: '.st-page' },
  { path: '/interaction', selector: '.ia-page' },
  { path: '/contact', selector: '.ct-page' },
  { path: '/login', selector: '.login-card' },
]

const adminRoutes = [
  { path: '/admin', selector: '.admin-dashboard' },
  { path: '/admin/reviews', selector: '.review-page' },
  { path: '/admin/operations', selector: '.operations-page' },
  { path: '/admin/users', selector: '.users-page' },
  { path: '/admin/interaction', selector: '.interaction-admin' },
  { path: '/admin/red-culture', selector: '.content-hero--red' },
  { path: '/admin/public-welfare', selector: '.content-hero--green' },
  { path: '/admin/skill-teaching', selector: '.content-hero--amber' },
]

const results = []

const state = {
  adminUser: null,
  adminToken: '',
  eventId: null,
}

const db = mysql.createPool({
  host: process.env.DB_HOST || '127.0.0.1',
  port: Number(process.env.DB_PORT || 3306),
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'xiuhongqi_digital',
  waitForConnections: true,
  connectionLimit: 5,
})

function assert(condition, message) {
  if (!condition) {
    throw new Error(message)
  }
}

function log(message) {
  console.log(message)
}

function resolveBrowserPath() {
  const browserPath = browserCandidates.find((candidate) => existsSync(candidate))
  assert(browserPath, 'No local Edge or Chrome executable found for page smoke test')
  return browserPath
}

function runCommand(command, args, options = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      cwd: options.cwd,
      env: options.env || process.env,
      shell: options.shell ?? process.platform === 'win32',
      stdio: options.stdio || 'pipe',
    })

    let stdout = ''
    let stderr = ''

    child.stdout?.on('data', (chunk) => {
      stdout += chunk.toString()
      process.stdout.write(chunk)
    })

    child.stderr?.on('data', (chunk) => {
      stderr += chunk.toString()
      process.stderr.write(chunk)
    })

    child.on('error', reject)
    child.on('close', (code) => {
      if (code === 0) {
        resolve({ stdout, stderr })
      } else {
        reject(new Error(`${command} ${args.join(' ')} exited with code ${code}`))
      }
    })
  })
}

async function waitForHealth(timeoutMs = 30000) {
  const startedAt = Date.now()

  while (Date.now() - startedAt < timeoutMs) {
    try {
      const response = await fetch(`${origin}/health`)
      if (response.ok) {
        const payload = await response.json()
        if (payload.status === 'ok') {
          return
        }
      }
    } catch {
      // retry
    }

    await new Promise((resolve) => setTimeout(resolve, 1000))
  }

  throw new Error(`Server did not become healthy within ${timeoutMs}ms`)
}

function startServer() {
  const child = spawn(nodeCommand, ['server/index.js'], {
    cwd: process.cwd(),
    env: {
      ...process.env,
      NODE_ENV: 'production',
      PORT: String(port),
    },
    shell: false,
    stdio: ['ignore', 'pipe', 'pipe'],
  })

  child.stdout?.on('data', (chunk) => process.stdout.write(chunk))
  child.stderr?.on('data', (chunk) => process.stderr.write(chunk))

  return child
}

function attachMonitors(page) {
  const state = {
    consoleErrors: [],
    pageErrors: [],
    requestFailures: [],
    responseFailures: [],
  }

  page.on('console', (message) => {
    if (message.type() === 'error') {
      state.consoleErrors.push(message.text())
    }
  })

  page.on('pageerror', (error) => {
    state.pageErrors.push(error.message)
  })

  page.on('requestfailed', (request) => {
    const resourceType = request.resourceType()
    if (['document', 'script', 'xhr', 'fetch', 'stylesheet'].includes(resourceType)) {
      state.requestFailures.push(`${resourceType} ${request.url()} ${request.failure()?.errorText || ''}`.trim())
    }
  })

  page.on('response', (response) => {
    const request = response.request()
    const resourceType = request.resourceType()
    const url = response.url()

    if (response.status() >= 500 && ['document', 'script', 'xhr', 'fetch'].includes(resourceType)) {
      state.responseFailures.push(`${response.status()} ${resourceType} ${url}`)
    }
  })

  return {
    state,
    reset() {
      state.consoleErrors.length = 0
      state.pageErrors.length = 0
      state.requestFailures.length = 0
      state.responseFailures.length = 0
    },
    assertClean(label) {
      const errors = [
        ...state.consoleErrors.map((item) => `console: ${item}`),
        ...state.pageErrors.map((item) => `pageerror: ${item}`),
        ...state.requestFailures.map((item) => `requestfailed: ${item}`),
        ...state.responseFailures.map((item) => `response: ${item}`),
      ]

      assert(errors.length === 0, `${label} has client errors:\n${errors.join('\n')}`)
    },
  }
}

async function queryOne(sql, params = []) {
  const [rows] = await db.query(sql, params)
  return rows[0] || null
}

async function apiRequest(endpoint, options = {}) {
  const {
    method = 'GET',
    token = '',
    json,
    expectedStatus = [200],
  } = options

  const headers = {}
  let body

  if (json) {
    headers['Content-Type'] = 'application/json'
    body = JSON.stringify(json)
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

async function runStep(name, fn) {
  process.stdout.write(`- ${name} ... `)

  try {
    await fn()
    results.push({ name, status: 'passed' })
    console.log('OK')
  } catch (error) {
    results.push({ name, status: 'failed', message: error.message })
    console.log('FAILED')
    throw error
  }
}

async function gotoAndCheck(page, monitor, path, selector) {
  monitor.reset()
  await page.goto(`${origin}${path}`, { waitUntil: 'domcontentloaded' })
  await page.waitForSelector(selector, { timeout: 15000 })
  await page.waitForTimeout(800)
  monitor.assertClean(path)
}

async function waitForCardWithText(page, selector, text, timeout = 15000) {
  await page
    .locator(selector)
    .filter({ hasText: text })
    .first()
    .waitFor({ state: 'visible', timeout })
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

async function confirmPrimaryAction(page) {
  const dialog = page.locator('.el-message-box').last()
  await dialog.waitFor({ state: 'visible', timeout: 15000 })
  await dialog.locator('.el-message-box__btns .el-button--primary').click()
}

async function cleanupPageData() {
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

    const [eventRows] = await connection.query('SELECT id FROM interaction_events WHERE title LIKE ?', [likePrefix])
    const eventIds = eventRows.map((row) => row.id)

    if (eventIds.length) {
      await connection.query('DELETE FROM event_registrations WHERE event_id IN (?) OR note LIKE ?', [eventIds, likePrefix])
      await connection.query('DELETE FROM interaction_events WHERE id IN (?)', [eventIds])
    } else {
      await connection.query('DELETE FROM event_registrations WHERE note LIKE ?', [likePrefix])
    }

    await connection.query('DELETE FROM skill_teaching_works WHERE title LIKE ? OR description LIKE ?', [likePrefix, likePrefix])
    await connection.query('DELETE FROM contact_messages WHERE name LIKE ? OR message LIKE ?', [likePrefix, likePrefix])
    await connection.query('DELETE FROM interaction_messages WHERE content LIKE ? OR author_name LIKE ?', [likePrefix, likePrefix])
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

async function prepareFixtures() {
  await cleanupPageData()

  await apiRequest('/auth/register', {
    method: 'POST',
    json: pageUser,
    expectedStatus: [200, 201],
  })

  const eventResult = await apiRequest('/admin/interaction-events', {
    method: 'POST',
    token: state.adminToken,
    json: {
      title: fixture.eventTitle,
      description: fixture.eventDescription,
      event_time: '2026-05-20 14:00',
      location: fixture.eventLocation,
      cover_image: '/uploads/demo-event.svg',
      form_requirements: fixture.eventRequirements,
      status: 'published',
    },
    expectedStatus: [200, 201],
  })

  state.eventId = eventResult.data?.id || null
  assert(state.eventId, 'Failed to create page smoke event fixture')
}

async function main() {
  await cleanupPageData()

  const browserPath = resolveBrowserPath()
  const adminUser = await queryOne(
    `
      SELECT id, username, display_name, role
      FROM users
      WHERE role IN ('admin', 'moderator') AND status = 'active'
      ORDER BY id ASC
      LIMIT 1
    `,
  )

  assert(adminUser, 'No active admin user found for page smoke test')
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
  const sampleVideoCoverPath = path.join(rootDir, 'public', 'uploads', 'demo-video-cover.svg')
  const sampleEmbroideryPaths = [
    path.join(rootDir, 'public', 'uploads', 'demo-embroidery-a.svg'),
    path.join(rootDir, 'public', 'uploads', 'demo-embroidery-b.svg'),
  ]
  const sampleSkillImagePath = path.join(rootDir, 'public', 'uploads', 'demo-skill-course.svg')

  await runStep('Build production frontend', async () => {
    await runCommand(npmCommand, ['run', 'build'], {
      cwd: process.cwd(),
      shell: process.platform === 'win32',
    })
  })

  const serverProcess = startServer()

  try {
    await runStep('Start production server', async () => {
      await waitForHealth()
    })

    await runStep('Prepare page smoke fixtures', async () => {
      await prepareFixtures()
    })

    const browser = await chromium.launch({
      executablePath: browserPath,
      headless: true,
    })

    try {
      const publicContext = await browser.newContext({
        viewport: { width: 1440, height: 1000 },
      })
      const publicPage = await publicContext.newPage()
      const publicMonitor = attachMonitors(publicPage)

      await runStep('Public route reachability', async () => {
        for (const route of publicRoutes) {
          await gotoAndCheck(publicPage, publicMonitor, route.path, route.selector)
        }
      })

      await runStep('Login to user center', async () => {
        publicMonitor.reset()
        await publicPage.goto(`${origin}/login`, { waitUntil: 'domcontentloaded' })
        await publicPage.waitForSelector('.login-card', { timeout: 15000 })

        const inputs = publicPage.locator('.login-card input')
        await inputs.nth(0).fill(pageUser.username)
        await inputs.nth(1).fill(pageUser.password)

        await Promise.all([
          publicPage.waitForURL((url) => !url.pathname.startsWith('/login'), { timeout: 15000 }),
          publicPage.locator('.login-card .el-button--primary').click(),
        ])

        await publicPage.waitForSelector('.home-page', { timeout: 15000 })
        publicMonitor.assertClean('login')

        await gotoAndCheck(publicPage, publicMonitor, '/user', '.uc-page')
        assert(publicPage.url().includes('/user'), 'User center did not stay on /user')
      })

      await runStep('Submit contact message from page', async () => {
        publicMonitor.reset()
        await publicPage.goto(`${origin}/contact`, { waitUntil: 'domcontentloaded' })
        await publicPage.waitForSelector('.ct-page', { timeout: 15000 })

        const formItems = publicPage.locator('.ct-form .el-form-item')
        await formItems.nth(0).locator('input').fill(fixture.contactName)
        await formItems.nth(1).locator('input').fill(pageUser.phone)
        await formItems.nth(3).locator('textarea').fill(fixture.contactMessage)

        await Promise.all([
          publicPage.waitForResponse(
            (response) =>
              response.url().includes('/api/contact/submit') &&
              response.request().method() === 'POST' &&
              response.ok(),
            { timeout: 15000 },
          ),
          publicPage.locator('.ct-form .el-button').click(),
        ])

        await waitForCardWithText(publicPage, '.ct-latest-item', fixture.contactName)
        publicMonitor.assertClean('contact page submit')
      })

      await runStep('Complete interaction page flows', async () => {
        publicMonitor.reset()
        await publicPage.goto(`${origin}/interaction`, { waitUntil: 'domcontentloaded' })
        await publicPage.waitForSelector('.ia-page', { timeout: 15000 })
        await publicPage.locator('.ia-section-chip').first().waitFor({ timeout: 15000 })

        const tabs = publicPage.locator('.ia-card .el-tabs__item')

        await tabs.nth(1).click()
        await publicPage.waitForTimeout(400)
        await publicPage.locator('.ia-message-form textarea').fill(fixture.interactionMessage)
        await Promise.all([
          publicPage.waitForResponse(
            (response) =>
              response.url().includes('/api/interaction/messages') &&
              response.request().method() === 'POST' &&
              response.ok(),
            { timeout: 15000 },
          ),
          publicPage.locator('.ia-message-form .el-button').click(),
        ])
        await waitForCardWithText(publicPage, '.ia-message-card', fixture.interactionMessage)

        await tabs.nth(0).click()
        await publicPage.waitForTimeout(400)
        await publicPage.locator('.ia-card__actions .el-button').nth(1).click()

        const topicDialog = publicPage.locator('.el-overlay .el-dialog').last()
        await topicDialog.waitFor({ state: 'visible', timeout: 15000 })
        const topicItems = topicDialog.locator('.el-form-item')
        await topicItems.nth(1).locator('input').fill(fixture.topicTitle)
        await topicItems.nth(2).locator('textarea').fill(fixture.topicContent)

        await Promise.all([
          publicPage.waitForResponse(
            (response) =>
              response.url().includes('/api/interaction/forum/topics') &&
              response.request().method() === 'POST' &&
              response.ok(),
            { timeout: 15000 },
          ),
          topicDialog.locator('.el-dialog__footer .el-button').nth(1).click(),
        ])

        await waitForCardWithText(publicPage, '.ia-topic-card', fixture.topicTitle)

        const topicCard = publicPage.locator('.ia-topic-card').filter({ hasText: fixture.topicTitle }).first()
        await topicCard.click()
        await waitForCardWithText(publicPage, '.ia-topic-detail__hero', fixture.topicTitle)

        await publicPage.locator('.ia-topic-detail__hero .el-button').click()
        const postDialog = publicPage.locator('.el-overlay .el-dialog').last()
        await postDialog.waitFor({ state: 'visible', timeout: 15000 })
        const postItems = postDialog.locator('.el-form-item')
        await postItems.nth(0).locator('input').fill(fixture.postTitle)
        await postItems.nth(1).locator('textarea').fill(fixture.postContent)

        await Promise.all([
          publicPage.waitForResponse(
            (response) =>
              response.url().includes('/api/interaction/forum/topics/') &&
              response.url().includes('/posts') &&
              response.request().method() === 'POST' &&
              response.ok(),
            { timeout: 15000 },
          ),
          postDialog.locator('.el-dialog__footer .el-button').nth(1).click(),
        ])

        await waitForCardWithText(publicPage, '.ia-post-card', fixture.postTitle)

        const postCard = publicPage.locator('.ia-post-card').filter({ hasText: fixture.postTitle }).first()
        await postCard.click()
        await publicPage.locator('.ia-comment-form textarea').fill(fixture.commentContent)

        await Promise.all([
          publicPage.waitForResponse(
            (response) =>
              response.url().includes('/api/interaction/forum/posts/') &&
              response.url().includes('/comments') &&
              response.request().method() === 'POST' &&
              response.ok(),
            { timeout: 15000 },
          ),
          publicPage.locator('.ia-comment-form .el-button').click(),
        ])

        await waitForCardWithText(publicPage, '.ia-comment-card', fixture.commentContent)

        await tabs.nth(2).click()
        await publicPage.waitForTimeout(400)
        await waitForCardWithText(publicPage, '.ia-event-card', fixture.eventTitle)

        const eventCard = publicPage.locator('.ia-event-card').filter({ hasText: fixture.eventTitle }).first()
        await eventCard.locator('.el-button').click()

        const eventDialog = publicPage.locator('.el-overlay .el-dialog').last()
        await eventDialog.waitFor({ state: 'visible', timeout: 15000 })
        const eventItems = eventDialog.locator('.el-form-item')
        await eventItems.nth(0).locator('input').fill(pageUser.phone)
        await eventItems.nth(1).locator('textarea').fill(fixture.eventNote)

        await Promise.all([
          publicPage.waitForResponse(
            (response) =>
              response.url().includes(`/api/interaction/events/${state.eventId}/register`) &&
              response.request().method() === 'POST' &&
              response.ok(),
            { timeout: 15000 },
          ),
          eventDialog.locator('.el-dialog__footer .el-button').nth(1).click(),
        ])

        await publicPage.waitForTimeout(800)
        publicMonitor.assertClean('interaction page flows')
      })

      await runStep('Submit contest and skill works from public pages', async () => {
        publicMonitor.reset()

        await publicPage.goto(`${origin}/video-contest`, { waitUntil: 'domcontentloaded' })
        await publicPage.waitForSelector('.vc-page', { timeout: 15000 })
        const videoTabs = publicPage.locator('.vc-card .el-tabs__item')
        await videoTabs.nth(1).click()
        await publicPage.waitForSelector('.vc-submit-form', { timeout: 15000 })
        const videoFormItems = publicPage.locator('.vc-submit-form .el-form-item')
        await videoFormItems.nth(0).locator('input').fill(fixture.videoTitle)
        await videoFormItems.nth(1).locator('input').fill(pageUser.phone)
        await videoFormItems.nth(3).locator('textarea').fill(fixture.videoDescription)
        await videoFormItems.nth(4).locator('input[type=file]').setInputFiles(sampleVideoCoverPath)
        await videoFormItems.nth(5).locator('input[type=file]').setInputFiles(sampleVideoPath)

        await Promise.all([
          publicPage.waitForResponse(
            (response) =>
              response.url().includes('/api/video-contest/works') &&
              response.request().method() === 'POST' &&
              response.ok(),
            { timeout: 20000 },
          ),
          publicPage.locator('.vc-submit-form .el-button--danger').click(),
        ])

        await publicPage.waitForTimeout(800)

        await publicPage.goto(`${origin}/emb-contest`, { waitUntil: 'domcontentloaded' })
        await publicPage.waitForSelector('.ec-page', { timeout: 15000 })
        const embTabs = publicPage.locator('.ec-card .el-tabs__item')
        await embTabs.nth(1).click()
        await publicPage.waitForSelector('.ec-submit-form', { timeout: 15000 })
        const embFormItems = publicPage.locator('.ec-submit-form .el-form-item')
        await embFormItems.nth(0).locator('input').fill(fixture.embTitle)
        await embFormItems.nth(1).locator('input').fill(pageUser.phone)
        await embFormItems.nth(3).locator('textarea').fill(fixture.embDescription)
        await embFormItems.nth(4).locator('input[type=file]').setInputFiles(sampleEmbroideryPaths)

        await Promise.all([
          publicPage.waitForResponse(
            (response) =>
              response.url().includes('/api/emb-contest/works') &&
              response.request().method() === 'POST' &&
              response.ok(),
            { timeout: 20000 },
          ),
          publicPage.locator('.ec-submit-form .el-button--danger').click(),
        ])

        await publicPage.waitForTimeout(800)

        await publicPage.goto(`${origin}/skill-teaching`, { waitUntil: 'domcontentloaded' })
        await publicPage.waitForSelector('.st-page', { timeout: 15000 })
        const skillTabs = publicPage.locator('.st-card .el-tabs__item')
        await skillTabs.nth(4).click()
        await publicPage.waitForSelector('.st-upload-form', { timeout: 15000 })
        const skillFormItems = publicPage.locator('.st-upload-form .el-form-item')
        await skillFormItems.nth(0).locator('input').fill(fixture.skillWorkTitle)
        await skillFormItems.nth(1).locator('textarea').fill(fixture.skillWorkDescription)
        await skillFormItems.nth(2).locator('input[type=file]').setInputFiles(sampleSkillImagePath)

        await Promise.all([
          publicPage.waitForResponse(
            (response) =>
              response.url().includes('/api/skill-teaching/works') &&
              response.request().method() === 'POST' &&
              response.ok(),
            { timeout: 20000 },
          ),
          publicPage.locator('.st-upload-form .el-button--danger').click(),
        ])

        await publicPage.waitForTimeout(800)
        publicMonitor.assertClean('contest and skill submit flows')
      })

      const adminContext = await browser.newContext({
        viewport: { width: 1440, height: 1000 },
      })
      await adminContext.addInitScript(
        ({ token, user }) => {
          localStorage.setItem('xhq-token', token)
          localStorage.setItem('xhq-user', JSON.stringify(user))
        },
        {
          token: state.adminToken,
          user: {
            id: state.adminUser.id,
            username: state.adminUser.username,
            display_name: state.adminUser.display_name,
            role: state.adminUser.role,
          },
        },
      )

      const adminPage = await adminContext.newPage()
      const adminMonitor = attachMonitors(adminPage)

      await runStep('Admin route reachability', async () => {
        for (const route of adminRoutes) {
          await gotoAndCheck(adminPage, adminMonitor, route.path, route.selector)
        }
      })

      await runStep('Approve contest and skill submissions in admin pages', async () => {
        adminMonitor.reset()

        await adminPage.goto(`${origin}/admin/reviews?tab=video`, { waitUntil: 'domcontentloaded' })
        await adminPage.waitForSelector('.review-page', { timeout: 15000 })
        await waitForCardWithText(adminPage, '.review-card', fixture.videoTitle)

        const videoReviewCard = adminPage.locator('.review-card').filter({ hasText: fixture.videoTitle }).first()
        await videoReviewCard.locator('.el-button--success').click()
        await Promise.all([
          adminPage.waitForResponse(
            (response) =>
              response.url().includes('/api/admin/video-works/') &&
              response.url().includes('/status') &&
              response.request().method() === 'PATCH' &&
              response.ok(),
            { timeout: 15000 },
          ),
          confirmPrimaryAction(adminPage),
        ])

        await adminPage.waitForTimeout(800)

        await adminPage.goto(`${origin}/admin/reviews?tab=emb`, { waitUntil: 'domcontentloaded' })
        await adminPage.waitForSelector('.review-page', { timeout: 15000 })
        await waitForCardWithText(adminPage, '.review-card', fixture.embTitle)

        const embReviewCard = adminPage.locator('.review-card').filter({ hasText: fixture.embTitle }).first()
        await embReviewCard.locator('.el-button--success').click()
        await Promise.all([
          adminPage.waitForResponse(
            (response) =>
              response.url().includes('/api/admin/emb-works/') &&
              response.url().includes('/status') &&
              response.request().method() === 'PATCH' &&
              response.ok(),
            { timeout: 15000 },
          ),
          confirmPrimaryAction(adminPage),
        ])

        await adminPage.waitForTimeout(800)

        await adminPage.goto(`${origin}/admin/skill-teaching`, { waitUntil: 'domcontentloaded' })
        await adminPage.waitForSelector('.content-page', { timeout: 15000 })
        const skillAdminTabs = adminPage.locator('.content-page .el-tabs__item')
        await skillAdminTabs.nth(3).click()
        await adminPage.waitForTimeout(500)
        await waitForCardWithText(adminPage, '.content-card', fixture.skillWorkTitle)

        const skillWorkCard = adminPage.locator('.content-card').filter({ hasText: fixture.skillWorkTitle }).first()
        await Promise.all([
          adminPage.waitForResponse(
            (response) =>
              response.url().includes('/api/skill-teaching/admin/works/') &&
              response.url().includes('/status') &&
              response.request().method() === 'PATCH' &&
              response.ok(),
            { timeout: 15000 },
          ),
          skillWorkCard.locator('.el-button--success').click(),
        ])

        await adminPage.waitForTimeout(800)
        adminMonitor.assertClean('admin review approvals')
      })

      await runStep('Verify operations desk records', async () => {
        await gotoAndCheck(adminPage, adminMonitor, '/admin/operations?tab=contact', '.operations-page')
        await waitForCardWithText(adminPage, '.operations-card', fixture.contactName)
        adminMonitor.assertClean('admin operations contact')

        await gotoAndCheck(adminPage, adminMonitor, '/admin/operations?tab=messages', '.operations-page')
        await waitForCardWithText(adminPage, '.operations-card', fixture.interactionMessage)
        adminMonitor.assertClean('admin operations messages')

        await gotoAndCheck(adminPage, adminMonitor, '/admin/operations?tab=events', '.operations-page')
        await waitForCardWithText(adminPage, '.operations-card', fixture.eventNote)
        adminMonitor.assertClean('admin operations events')
      })

      await runStep('Verify interaction admin records', async () => {
        adminMonitor.reset()
        await adminPage.goto(`${origin}/admin/interaction`, { waitUntil: 'domcontentloaded' })
        await adminPage.waitForSelector('.interaction-admin', { timeout: 15000 })

        await waitForCardWithText(adminPage, '.content-card', fixture.topicTitle)

        const adminTabs = adminPage.locator('.interaction-admin .el-tabs__item')
        await adminTabs.nth(1).click()
        await adminPage.waitForTimeout(500)
        await waitForCardWithText(adminPage, '.content-card', fixture.postTitle)
        adminMonitor.assertClean('admin interaction records')
      })

      await runStep('Verify approved public contest and skill visibility', async () => {
        publicMonitor.reset()

        await publicPage.goto(`${origin}/video-contest`, { waitUntil: 'domcontentloaded' })
        await publicPage.waitForSelector('.vc-page', { timeout: 15000 })
        await publicPage.locator('.vc-toolbar .el-input__inner').fill(fixture.videoTitle)
        await Promise.all([
          publicPage.waitForResponse(
            (response) =>
              response.url().includes('/api/video-contest/works') &&
              response.request().method() === 'GET' &&
              response.ok(),
            { timeout: 15000 },
          ),
          publicPage.locator('.vc-toolbar .el-button--danger').click(),
        ])
        await waitForCardWithText(publicPage, '.vc-work-card', fixture.videoTitle)

        const videoCard = publicPage.locator('.vc-work-card').filter({ hasText: fixture.videoTitle }).first()
        await videoCard.locator('.el-button').first().click()
        await publicPage.waitForSelector('.vc-detail', { timeout: 15000 })

        await Promise.all([
          publicPage.waitForResponse(
            (response) =>
              response.url().includes('/api/video-contest/works/') &&
              response.url().includes('/vote') &&
              response.request().method() === 'POST' &&
              response.ok(),
            { timeout: 15000 },
          ),
          publicPage.locator('.vc-detail__info .el-button--danger').click(),
        ])

        await publicPage.waitForTimeout(300)
        await publicPage.waitForSelector('.vc-comment-form textarea', { timeout: 15000 })
        await publicPage.locator('.vc-comment-form textarea').fill(fixture.videoComment)
        await Promise.all([
          publicPage.waitForResponse(
            (response) =>
              response.url().includes('/api/video-contest/works/') &&
              response.url().includes('/comments') &&
              response.request().method() === 'POST' &&
              response.ok(),
            { timeout: 15000 },
          ),
          publicPage.locator('.vc-comment-form .el-button--danger').click(),
        ])
        await waitForCardWithText(publicPage, '.vc-comment-item', fixture.videoComment)

        await publicPage.goto(`${origin}/emb-contest`, { waitUntil: 'domcontentloaded' })
        await publicPage.waitForSelector('.ec-page', { timeout: 15000 })
        await publicPage.locator('.ec-toolbar .el-input__inner').fill(fixture.embTitle)
        await Promise.all([
          publicPage.waitForResponse(
            (response) =>
              response.url().includes('/api/emb-contest/works') &&
              response.request().method() === 'GET' &&
              response.ok(),
            { timeout: 15000 },
          ),
          publicPage.locator('.ec-toolbar .el-button--danger').click(),
        ])
        await waitForCardWithText(publicPage, '.ec-work-card', fixture.embTitle)

        const embCard = publicPage.locator('.ec-work-card').filter({ hasText: fixture.embTitle }).first()
        await embCard.locator('.el-button').first().click()
        await publicPage.waitForSelector('.ec-detail', { timeout: 15000 })

        await Promise.all([
          publicPage.waitForResponse(
            (response) =>
              response.url().includes('/api/emb-contest/works/') &&
              response.url().includes('/vote') &&
              response.request().method() === 'POST' &&
              response.ok(),
            { timeout: 15000 },
          ),
          publicPage.locator('.ec-detail__info .el-button--danger').click(),
        ])

        await publicPage.waitForTimeout(300)
        await publicPage.waitForSelector('.ec-comment-form textarea', { timeout: 15000 })
        await publicPage.locator('.ec-comment-form textarea').fill(fixture.embComment)
        await Promise.all([
          publicPage.waitForResponse(
            (response) =>
              response.url().includes('/api/emb-contest/works/') &&
              response.url().includes('/comments') &&
              response.request().method() === 'POST' &&
              response.ok(),
            { timeout: 15000 },
          ),
          publicPage.locator('.ec-comment-form .el-button--danger').click(),
        ])
        await waitForCardWithText(publicPage, '.ec-comment-item', fixture.embComment)

        await publicPage.goto(`${origin}/skill-teaching`, { waitUntil: 'domcontentloaded' })
        await publicPage.waitForSelector('.st-page', { timeout: 15000 })
        const skillTabs = publicPage.locator('.st-card .el-tabs__item')
        await skillTabs.nth(3).click()
        await publicPage.waitForTimeout(500)
        await waitForCardWithText(publicPage, '.st-work-card', fixture.skillWorkTitle)

        publicMonitor.assertClean('approved public contest and skill visibility')
      })

      await publicContext.close()
      await adminContext.close()
    } finally {
      await browser.close()
    }
  } finally {
    serverProcess.kill()
  }
}

try {
  await main()
  log('')
  log('Page smoke test completed successfully.')
  log(`Origin: ${origin}`)
  log(`User: ${pageUser.username}`)
  process.exitCode = 0
} catch (error) {
  log('')
  log(`Page smoke test failed: ${error.message}`)
  process.exitCode = 1
} finally {
  try {
    await cleanupPageData()
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
