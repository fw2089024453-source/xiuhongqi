import bcrypt from 'bcrypt'
import { pool } from '../config/db.js'

const now = new Date()
const DEMO_PASSWORD = 'Demo#2026'
const createdAccounts = []

const asset = {
  red: '/uploads/demo-red-culture.svg',
  welfare: '/uploads/demo-welfare.svg',
  skill: '/uploads/demo-skill-course.svg',
  portraitA: '/uploads/demo-portrait-a.svg',
  portraitB: '/uploads/demo-portrait-b.svg',
  event: '/uploads/demo-event.svg',
  video: '/uploads/demo-video-cover.svg',
  embA: '/uploads/demo-embroidery-a.svg',
  embB: '/uploads/demo-embroidery-b.svg',
  resourceA: '/uploads/demo-resource-pattern.txt',
  resourceB: '/uploads/demo-resource-guide.txt',
}

function parseEnumOptions(type) {
  return [...String(type || '').matchAll(/'([^']*)'/g)].map((item) => item[1])
}

async function findOne(query, params = []) {
  const [rows] = await pool.query(query, params)
  return rows[0] || null
}

async function enumValue(table, column, preferred, index = 0) {
  const [rows] = await pool.query(`SHOW COLUMNS FROM \`${table}\` LIKE ?`, [column])
  const options = parseEnumOptions(rows[0]?.Type)

  for (const value of preferred) {
    if (options.includes(value)) return value
  }

  return options[index] ?? options[0] ?? null
}

async function upsert(table, where, payload) {
  const whereKeys = Object.keys(where)
  const whereSql = whereKeys.map((key) => `\`${key}\` = ?`).join(' AND ')
  const [rows] = await pool.query(
    `SELECT id FROM \`${table}\` WHERE ${whereSql} LIMIT 1`,
    Object.values(where),
  )

  const finalPayload = { ...where, ...payload }
  const keys = Object.keys(finalPayload)
  const values = Object.values(finalPayload)

  if (rows[0]) {
    await pool.query(
      `UPDATE \`${table}\` SET ${keys.map((key) => `\`${key}\` = ?`).join(', ')} WHERE id = ?`,
      [...values, rows[0].id],
    )
    return rows[0].id
  }

  const placeholders = keys.map(() => '?').join(', ')
  const [result] = await pool.query(
    `INSERT INTO \`${table}\` (${keys.map((key) => `\`${key}\``).join(', ')}) VALUES (${placeholders})`,
    values,
  )
  return result.insertId
}

async function replaceChapters(courseId, chapters) {
  await pool.query('DELETE FROM course_chapters WHERE course_id = ?', [courseId])

  if (!chapters.length) {
    return
  }

  const values = chapters.map((item, index) => [
    courseId,
    index + 1,
    item.title,
    item.content,
    null,
    item.minutes,
    index + 1,
  ])

  await pool.query(
    `
      INSERT INTO course_chapters
        (course_id, chapter_number, title, content, video_url, duration_minutes, sort_order)
      VALUES ?
    `,
    [values],
  )
}

async function ensureUser({ username, displayName, role, phone, bio }) {
  const email = `${username}@xhq.local`
  const existing = await findOne(
    `
      SELECT id, username, display_name, role, phone, status
      FROM users
      WHERE username = ?
      LIMIT 1
    `,
    [username],
  )

  if (existing) {
    await pool.query(
      `
        UPDATE users
        SET email = ?, display_name = ?, phone = ?, bio = ?, role = ?, status = 'active'
        WHERE id = ?
      `,
      [email, displayName, phone, bio, role, existing.id],
    )

    return {
      ...existing,
      display_name: displayName,
      role,
      phone,
      status: 'active',
    }
  }

  const passwordHash = await bcrypt.hash(DEMO_PASSWORD, 10)
  const [result] = await pool.query(
    `
      INSERT INTO users
        (username, email, password_hash, phone, display_name, bio, role, status)
      VALUES (?, ?, ?, ?, ?, ?, ?, 'active')
    `,
    [username, email, passwordHash, phone, displayName, bio, role],
  )

  createdAccounts.push({
    username,
    password: DEMO_PASSWORD,
    role,
    phone,
  })

  return {
    id: result.insertId,
    username,
    display_name: displayName,
    role,
    phone,
    status: 'active',
  }
}

async function ensureSeedActors() {
  const [users] = await pool.query(
    `
      SELECT id, username, display_name, role, phone, status
      FROM users
      ORDER BY CASE WHEN role = ? THEN 0 ELSE 1 END, id ASC
    `,
    ['admin'],
  )

  let admin = users.find((item) => item.role === 'admin' && item.status === 'active')
  if (!admin) {
    admin = await ensureUser({
      username: 'demo_admin',
      displayName: '演示管理员',
      role: 'admin',
      phone: '13800000001',
      bio: '用于站点演示与后台验收的默认管理员账号。',
    })
  }

  let user = users.find((item) => item.role !== 'admin' && item.status === 'active')
  if (!user) {
    user = await ensureUser({
      username: 'demo_user',
      displayName: '演示用户',
      role: 'user',
      phone: '13900000002',
      bio: '用于互动留言、论坛和报名链路联调的默认演示账号。',
    })
  }

  return {
    admin,
    user,
  }
}

async function ensureForumSection({ name, aliases = [], description, sortOrder }) {
  for (const alias of [name, ...aliases]) {
    const existing = await findOne('SELECT id FROM forum_sections WHERE name = ? LIMIT 1', [alias])

    if (existing) {
      await pool.query(
        `
          UPDATE forum_sections
          SET name = ?, description = ?, sort_order = ?, status = 'active'
          WHERE id = ?
        `,
        [name, description, sortOrder, existing.id],
      )

      return existing.id
    }
  }

  const [result] = await pool.query(
    `
      INSERT INTO forum_sections (name, description, sort_order, status)
      VALUES (?, ?, ?, 'active')
    `,
    [name, description, sortOrder],
  )

  return result.insertId
}

async function syncForumTopic(topicId) {
  const stats = await findOne(
    `
      SELECT COUNT(*) AS reply_count, MAX(created_at) AS last_reply_at
      FROM forum_posts
      WHERE topic_id = ? AND is_deleted = FALSE
    `,
    [topicId],
  )

  const latestPost = await findOne(
    `
      SELECT author_id, created_at
      FROM forum_posts
      WHERE topic_id = ? AND is_deleted = FALSE
      ORDER BY created_at DESC, id DESC
      LIMIT 1
    `,
    [topicId],
  )

  await pool.query(
    `
      UPDATE forum_topics
      SET replies_count = ?, last_reply_at = ?, last_reply_by = ?
      WHERE id = ?
    `,
    [Number(stats?.reply_count || 0), latestPost?.created_at || null, latestPost?.author_id || null, topicId],
  )
}

async function syncForumAggregates() {
  await pool.query(
    `
      UPDATE forum_posts p
      SET comments_count = (
        SELECT COUNT(*)
        FROM forum_comments c
        WHERE c.post_id = p.id AND c.is_deleted = FALSE
      )
    `,
  )

  const [topics] = await pool.query('SELECT id FROM forum_topics')
  for (const topic of topics) {
    await syncForumTopic(topic.id)
  }

  await pool.query(`
    UPDATE forum_sections s
    SET topics_count = (
          SELECT COUNT(*)
          FROM forum_topics t
          WHERE t.section_id = s.id AND t.status = 'active'
        ),
        posts_count = (
          SELECT COUNT(*)
          FROM forum_posts p
          JOIN forum_topics t ON t.id = p.topic_id
          WHERE t.section_id = s.id AND p.is_deleted = FALSE
        ),
        last_post_at = (
          SELECT MAX(p.created_at)
          FROM forum_posts p
          JOIN forum_topics t ON t.id = p.topic_id
          WHERE t.section_id = s.id AND p.is_deleted = FALSE
        )
  `)
}

async function logCounts(tables) {
  for (const table of tables) {
    const row = await findOne(`SELECT COUNT(*) AS total FROM \`${table}\``)
    console.log(`${table}: ${row?.total || 0}`)
  }
}

async function main() {
  const beginner = await enumValue('skill_teaching_courses', 'difficulty', ['beginner', '初级'], 0)
  const intermediate = await enumValue(
    'skill_teaching_courses',
    'difficulty',
    ['intermediate', '中级'],
    1,
  )
  const advanced = await enumValue('skill_teaching_courses', 'difficulty', ['advanced', '高级'], 2)
  const high = await enumValue('red_culture_history', 'importance', ['high', '高'], 0)
  const mid = await enumValue('red_culture_history', 'importance', ['medium', '中'], 1)
  const low = await enumValue('red_culture_history', 'importance', ['low', '低'], 2)

  const { admin, user } = await ensureSeedActors()
  const adminName = admin.display_name || admin.username
  const userName = user.display_name || user.username

  const sectionShowcaseId = await ensureForumSection({
    name: '作品交流',
    aliases: ['Red Culture Discussion', '作品交流'],
    description: '分享绣红旗作品、视频参赛作品和创作灵感。',
    sortOrder: 1,
  })
  const sectionLearningId = await ensureForumSection({
    name: '学习问答',
    aliases: ['Skill Teaching Q&A', '学习问答'],
    description: '围绕技艺教学、针法练习和课程内容提问交流。',
    sortOrder: 2,
  })
  const sectionActivityId = await ensureForumSection({
    name: '活动分享',
    aliases: ['Public Welfare Exchange', '活动分享'],
    description: '记录公益活动、线下实践和平台联动见闻。',
    sortOrder: 3,
  })
  const sectionFeedbackId = await ensureForumSection({
    name: '平台建议',
    aliases: ['Platform Feedback', '平台建议'],
    description: '收集平台体验反馈、功能建议和测试问题。',
    sortOrder: 4,
  })

  const announcementSeeds = [
    {
      title: '平台演示内容已补充',
      type: 'update',
      content: '已补入首页公告、文化、公益、教学、互动、联系留言和赛事样例内容，方便整站联调与展示。',
    },
    {
      title: '后台内容管理正在完善',
      type: 'info',
      content: '红旗文化、公益纪实、技艺教学三块内容已经具备后台录入基础，可继续补正式素材。',
    },
    {
      title: '云端部署方案待收口',
      type: 'urgent',
      content: '建议继续沿用 Express 托管前端产物，配合 Nginx 反代和上传目录持久化。',
    },
  ]

  for (const item of announcementSeeds) {
    await upsert('announcements', { title: item.title }, item)
  }

  const redStorySeeds = [
    {
      title: '一面红旗的诞生与传承',
      content: '围绕红旗意象的形成、传播和延续，整理成适合前台展示的图文故事。',
      author: '平台编辑部',
      year: 1964,
      location: '湖北',
      image_url: asset.red,
    },
    {
      title: '针线之间的家国记忆',
      content: '通过民间绣制技艺与红色叙事的结合，串联非遗传承和时代精神。',
      author: '非遗讲述人',
      year: 1978,
      location: '武汉',
      image_url: asset.red,
    },
    {
      title: '绣样里的时代回声',
      content: '从馆藏纹样、口述材料和当代创作三个角度，补出一条更完整的展示叙事。',
      author: '内容策展组',
      year: 2008,
      location: '襄阳',
      image_url: asset.event,
    },
  ]

  for (const item of redStorySeeds) {
    await upsert('red_culture_stories', { title: item.title }, {
      ...item,
      status: 'published',
      published_at: now,
      created_by: admin.id,
    })
  }

  const redHistorySeeds = [
    {
      title: '红旗主题展陈启动',
      content: '以图文和实物并行的方式整理平台可展示的历史节点。',
      year: 2019,
      location: '红旗文化馆',
      importance: high,
      image_url: asset.red,
    },
    {
      title: '社区讲述计划上线',
      content: '围绕社区故事征集、口述整理和线上展示，形成可持续更新的内容池。',
      year: 2022,
      location: '社区活动中心',
      importance: mid,
      image_url: asset.event,
    },
    {
      title: '青年共创单元开放',
      content: '把课程产出、活动纪实和群众留言联成一体，前台展示更完整。',
      year: 2025,
      location: '青年实践工坊',
      importance: low,
      image_url: asset.skill,
    },
  ]

  for (const item of redHistorySeeds) {
    await upsert('red_culture_history', { title: item.title }, {
      ...item,
      status: 'published',
      published_at: now,
      created_by: admin.id,
    })
  }

  const redSpiritSeeds = [
    {
      title: '守正创新',
      content: '在传承既有文化精神的基础上，用更适合今天传播和教学的方式去表达。',
      icon_url: asset.portraitA,
      importance: high,
    },
    {
      title: '共同参与',
      content: '让文化内容、公益实践和用户互动形成循环，平台才会真正有生命力。',
      icon_url: asset.portraitB,
      importance: mid,
    },
    {
      title: '长期积累',
      content: '演示内容不是临时填空，而是后续正式运营内容的雏形和样板。',
      icon_url: asset.event,
      importance: low,
    },
  ]

  for (const item of redSpiritSeeds) {
    await upsert('red_culture_spirit', { title: item.title }, {
      ...item,
      status: 'published',
      published_at: now,
      created_by: admin.id,
    })
  }

  const welfareActivitySeeds = [
    {
      title: '社区共绣行动',
      description: '组织社区居民共同完成主题绣作，兼顾文化展示、公益参与和报名测试。',
      start_date: '2026-04-15',
      end_date: '2026-04-20',
      location: '武汉市社区文化站',
      organizer: '绣红旗平台运营组',
      cover_image: asset.welfare,
      gallery_images: JSON.stringify([asset.welfare, asset.event]),
      status: 'ongoing',
      participant_count: 18,
      target_participants: 30,
    },
    {
      title: '非遗教室进校园',
      description: '把基础针法、红旗主题创作和作品展示带进校园。',
      start_date: '2026-05-08',
      end_date: '2026-05-08',
      location: '青年路中学',
      organizer: '公益合作组',
      cover_image: asset.event,
      gallery_images: JSON.stringify([asset.event, asset.skill]),
      status: 'planning',
      participant_count: 12,
      target_participants: 40,
    },
    {
      title: '绣样修复体验日',
      description: '面向亲子和青年观众的半日体验活动，用于补足活动纪实与报名展示内容。',
      start_date: '2026-03-22',
      end_date: '2026-03-22',
      location: '城市非遗体验馆',
      organizer: '公共教育组',
      cover_image: asset.red,
      gallery_images: JSON.stringify([asset.red, asset.welfare]),
      status: 'completed',
      participant_count: 26,
      target_participants: 26,
    },
  ]

  for (const item of welfareActivitySeeds) {
    await upsert('public_welfare_activities', { title: item.title }, {
      ...item,
      detailed_content: item.description,
      contact_info: '027-00000000',
      created_by: admin.id,
    })
  }

  const volunteerSeeds = [
    {
      name: '周敏',
      role: '社区志愿讲师',
      quote: '把会做的事教给更多人，就是最直接的公益。',
      introduction: '长期参与社区绣作教学与活动组织。',
      stat_years: 6,
      stat_projects: 12,
      stat_people: 320,
      avatar_url: asset.portraitA,
      sort_order: 1,
    },
    {
      name: '陈凯',
      role: '活动执行志愿者',
      quote: '把大家聚在一起做一件有意义的事，平台才会真正热起来。',
      introduction: '负责活动签到、流程安排和现场记录。',
      stat_years: 4,
      stat_projects: 9,
      stat_people: 210,
      avatar_url: asset.portraitB,
      sort_order: 2,
    },
    {
      name: '刘宁',
      role: '校园联络员',
      quote: '把学生真正带进现场，演示内容才会有温度。',
      introduction: '对接学校社团与公益课程，帮助活动形成持续报名入口。',
      stat_years: 3,
      stat_projects: 7,
      stat_people: 180,
      avatar_url: asset.event,
      sort_order: 3,
    },
  ]

  for (const item of volunteerSeeds) {
    await upsert('public_welfare_volunteers', { name: item.name }, item)
  }

  const welfareTimelineSeeds = [
    {
      title: '第一场社区实践完成',
      year: 2024,
      event_name: '社区实践',
      description: '完成首场线下实践后，平台沉淀了活动图片和参与者反馈。',
      image_urls: JSON.stringify([asset.event, asset.welfare]),
      sort_order: 1,
    },
    {
      title: '校地联动课程启动',
      year: 2025,
      event_name: '校地联动',
      description: '把公益活动与技艺教学结合起来，形成更稳定的课程节奏。',
      image_urls: JSON.stringify([asset.skill, asset.event]),
      sort_order: 2,
    },
    {
      title: '演示素材包整理完成',
      year: 2026,
      event_name: '内容收口',
      description: '公共页面、活动页和联系入口都已经具备对外展示所需的基础样例。',
      image_urls: JSON.stringify([asset.red, asset.skill]),
      sort_order: 3,
    },
  ]

  for (const item of welfareTimelineSeeds) {
    await upsert('public_welfare_timelines', { title: item.title }, item)
  }

  const basicCategoryId = await upsert(
    'skill_teaching_categories',
    { name: '基础针法' },
    { description: '适合零基础用户入门的课程和练习内容。', sort_order: 1, status: 'active' },
  )
  const themeCategoryId = await upsert(
    'skill_teaching_categories',
    { name: '主题创作' },
    { description: '围绕红旗主题进行构图和完整作品创作。', sort_order: 2, status: 'active' },
  )
  const materialCategoryId = await upsert(
    'skill_teaching_categories',
    { name: '素材与赏析' },
    { description: '收纳图案素材、临摹参考和优秀作品拆解。', sort_order: 3, status: 'active' },
  )

  const courseSeeds = [
    {
      title: '零基础针法入门',
      category_id: basicCategoryId,
      description: '从起针、收针和走线方式开始，适合新用户快速进入可练习状态。',
      detailed_content: '课程包含准备材料、基础示范和一份可直接练习的作业。',
      difficulty: beginner,
      estimated_hours: 6,
      cover_image: asset.skill,
      video_url: 'https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4',
      materials_list: JSON.stringify(['练习布一块', '基础配色线样', '手机拍摄记录说明']),
      instructor_id: admin.id,
      is_featured: 1,
      status: 'published',
      chapters: [
        { title: '准备材料与练习方式', content: '确认布料、线样和拍照记录方式。', minutes: 18 },
        { title: '基础针法拆解', content: '围绕起针、收针和走线节奏做动作拆解。', minutes: 26 },
        { title: '第一次完整练习', content: '使用简化图案完成第一次练习。', minutes: 22 },
      ],
    },
    {
      title: '红旗主题组合创作',
      category_id: themeCategoryId,
      description: '围绕红旗图案与底纹组合展开，适合做完整作品创作。',
      detailed_content: '课程重点在构图、配色和主题表达，可用于后续投稿准备。',
      difficulty: intermediate,
      estimated_hours: 10,
      cover_image: asset.red,
      video_url: 'https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4',
      materials_list: JSON.stringify(['构图草图模板', '配色参考卡', '主题创作练习表']),
      instructor_id: admin.id,
      is_featured: 0,
      status: 'published',
      chapters: [
        { title: '主题图案拆分', content: '先把整体图案拆成中心元素和辅助底纹。', minutes: 24 },
        { title: '构图与配色', content: '确定视觉重心、留白节奏和主色层次。', minutes: 28 },
        { title: '完成主题作品', content: '输出适合投稿和学员展示的成品照片。', minutes: 35 },
      ],
    },
    {
      title: '优秀作品拆解与赏析',
      category_id: materialCategoryId,
      description: '用现成样例带学员看懂构图、配色和细节表达。',
      detailed_content: '适合补齐课程页、资源页和学员作品页之间的联动展示。',
      difficulty: advanced,
      estimated_hours: 4,
      cover_image: asset.event,
      video_url: 'https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4',
      materials_list: JSON.stringify(['作品观察表', '结构标注模板', '赏析记录清单']),
      instructor_id: admin.id,
      is_featured: 0,
      status: 'published',
      chapters: [
        { title: '从成品反推结构', content: '先识别主体、边框和细节层次。', minutes: 16 },
        { title: '配色与留白分析', content: '把视觉重心和节奏拆出来，便于后续模仿。', minutes: 20 },
      ],
    },
  ]

  const courseIds = new Map()
  for (const item of courseSeeds) {
    const courseId = await upsert('skill_teaching_courses', { title: item.title }, {
      category_id: item.category_id,
      description: item.description,
      detailed_content: item.detailed_content,
      difficulty: item.difficulty,
      estimated_hours: item.estimated_hours,
      cover_image: item.cover_image,
      video_url: item.video_url,
      materials_list: item.materials_list,
      instructor_id: item.instructor_id,
      is_featured: item.is_featured,
      views_count: 0,
      enrollments_count: 0,
      status: item.status,
      published_at: now,
    })

    courseIds.set(item.title, courseId)
    await replaceChapters(courseId, item.chapters)
  }

  await pool.query('UPDATE skill_teaching_courses SET is_featured = CASE WHEN id = ? THEN 1 ELSE 0 END', [
    courseIds.get('零基础针法入门'),
  ])

  const resourceSeeds = [
    {
      title: '基础练习图样包',
      description: '配合零基础课程使用的练习图样和节奏说明。',
      file_url: asset.resourceA,
      file_type: 'txt',
      sort_order: 1,
      status: 'active',
    },
    {
      title: '主题创作步骤单',
      description: '适合课堂演示和学员自测的主题创作流程清单。',
      file_url: asset.resourceB,
      file_type: 'txt',
      sort_order: 2,
      status: 'active',
    },
    {
      title: '课堂展示提词卡',
      description: '方便演示时快速切换讲解节奏，也适合作为后台录入示例资源。',
      file_url: asset.resourceB,
      file_type: 'txt',
      sort_order: 3,
      status: 'active',
    },
  ]

  for (const item of resourceSeeds) {
    await upsert('skill_teaching_resources', { title: item.title }, item)
  }

  const skillWorkSeeds = [
    {
      title: '初学者红旗纹样练习',
      user_id: user.id,
      author_name: userName,
      description: '围绕基础针法做的小幅度练习。',
      image_url: asset.embA,
      likes_count: 6,
      status: 'approved',
    },
    {
      title: '主题构图进阶作品',
      user_id: admin.id,
      author_name: adminName,
      description: '配合主题创作课程展示的样例作品。',
      image_url: asset.embB,
      likes_count: 10,
      status: 'approved',
    },
    {
      title: '课堂临摹小样',
      user_id: user.id,
      author_name: userName,
      description: '用于展示课程练习成果和上传链路的轻量作品样例。',
      image_url: asset.red,
      likes_count: 4,
      status: 'approved',
    },
  ]

  for (const item of skillWorkSeeds) {
    await upsert('skill_teaching_works', { title: item.title }, item)
  }

  const topicA = await upsert('forum_topics', { title: '第一次参加活动需要准备什么？' }, {
    section_id: sectionActivityId,
    content: '想确认是否需要自备布料、针线和报名信息。',
    author_id: user.id,
    views_count: 24,
    replies_count: 0,
    is_pinned: 0,
    is_locked: 0,
    status: 'active',
  })
  const topicB = await upsert('forum_topics', { title: '这次课程更适合先练针法还是先做主题图？' }, {
    section_id: sectionLearningId,
    content: '想知道第一次练习应该从哪边入手更顺。',
    author_id: user.id,
    views_count: 19,
    replies_count: 0,
    is_pinned: 1,
    is_locked: 0,
    status: 'active',
  })
  const topicC = await upsert('forum_topics', { title: '首页还适合补哪些正式演示内容？' }, {
    section_id: sectionFeedbackId,
    content: '目前文化、公益、教学都补了一批，想听听大家对首页展示顺序的建议。',
    author_id: admin.id,
    views_count: 15,
    replies_count: 0,
    is_pinned: 0,
    is_locked: 0,
    status: 'active',
  })

  const topicAPost1 = await upsert(
    'forum_posts',
    { topic_id: topicA, content: '平台会提供基础材料，首次报名只需要填写联系人信息。' },
    { author_id: admin.id, title: '报名准备说明', is_deleted: 0, likes_count: 0, comments_count: 0 },
  )
  const topicAPost2 = await upsert(
    'forum_posts',
    { topic_id: topicA, content: '明白了，那我准备带家里人一起报名。' },
    { author_id: user.id, title: '收到', is_deleted: 0, likes_count: 0, comments_count: 0 },
  )
  const topicBPost1 = await upsert(
    'forum_posts',
    { topic_id: topicB, content: '建议先完成零基础针法入门，再去做主题构图。' },
    { author_id: admin.id, title: '练习顺序建议', is_deleted: 0, likes_count: 0, comments_count: 0 },
  )
  const topicBPost2 = await upsert(
    'forum_posts',
    { topic_id: topicB, content: '如果时间有限，可以先把第一章和第二章练完再尝试主题图。' },
    { author_id: user.id, title: '补充体验', is_deleted: 0, likes_count: 0, comments_count: 0 },
  )
  const topicCPost1 = await upsert(
    'forum_posts',
    { topic_id: topicC, content: '我建议首页先放赛事入口，再补文化、公益和教学的最近更新。' },
    { author_id: user.id, title: '首页排序建议', is_deleted: 0, likes_count: 0, comments_count: 0 },
  )

  const forumCommentA = await upsert(
    'forum_comments',
    { post_id: topicAPost1, content: '这样的话新人第一次来就不会有报名压力了。' },
    { author_id: user.id, likes_count: 2, is_deleted: 0 },
  )
  const forumCommentB = await upsert(
    'forum_comments',
    { post_id: topicBPost1, content: '按这个顺序练，课程页和作品页衔接确实更自然。' },
    { author_id: admin.id, likes_count: 3, is_deleted: 0 },
  )
  await upsert('forum_comment_likes', { comment_id: forumCommentA, user_id: admin.id }, {})
  await upsert('forum_comment_likes', { comment_id: forumCommentB, user_id: user.id }, {})

  const interactionMessageSeeds = [
    {
      content: '今天首页内容终于不空了，测试起来直观很多。',
      user_id: user.id,
      author_name: userName,
      avatar_url: asset.portraitA,
      image_url: null,
      likes_count: 5,
      status: 'visible',
    },
    {
      content: '课程、公益、文化三块现在都能拿来做演示了。',
      user_id: admin.id,
      author_name: adminName,
      avatar_url: asset.portraitB,
      image_url: asset.event,
      likes_count: 8,
      status: 'visible',
    },
    {
      content: '互动区补上论坛和活动报名之后，整站的“有人在用”感觉就起来了。',
      user_id: user.id,
      author_name: userName,
      avatar_url: asset.event,
      image_url: asset.skill,
      likes_count: 4,
      status: 'visible',
    },
  ]

  for (const item of interactionMessageSeeds) {
    await upsert('interaction_messages', { content: item.content }, item)
  }

  const eventA = await upsert('interaction_events', { title: '四月开放日体验报名' }, {
    description: '面向新用户的体验活动，包含参观、体验和简短教学展示。',
    event_time: '2026-04-28 14:00',
    location: '平台线下体验空间',
    cover_image: asset.event,
    form_requirements: '姓名、手机号、参与人数、是否需要现场材料',
    status: 'published',
  })
  const eventB = await upsert('interaction_events', { title: '五月主题创作分享会' }, {
    description: '围绕主题创作课程展开分享，适合测试活动展示与报名联动。',
    event_time: '2026-05-16 09:30',
    location: '线上直播间',
    cover_image: asset.skill,
    form_requirements: '姓名、手机号、希望交流的问题',
    status: 'published',
  })
  const eventC = await upsert('interaction_events', { title: '公益活动成果小展' }, {
    description: '用于补足活动展示卡片和前台报名页的第三个正式样例。',
    event_time: '2026-06-06 15:00',
    location: '社区联合展厅',
    cover_image: asset.welfare,
    form_requirements: '姓名、手机号、到场时间段',
    status: 'published',
  })

  await upsert(
    'event_registrations',
    { event_id: eventA, user_name: userName },
    { user_id: user.id, phone: user.phone || '13900000002', note: '希望带一位家属一起参加，用于报名链路测试。' },
  )
  await upsert(
    'event_registrations',
    { event_id: eventB, user_name: adminName },
    { user_id: admin.id, phone: admin.phone || '13800000001', note: '后台账号也补一条报名记录，方便验收列表态。' },
  )
  await upsert(
    'event_registrations',
    { event_id: eventC, user_name: '社区联络人' },
    { user_id: null, phone: '13700000003', note: '以访客身份补充一条登记样例。' },
  )

  const contactSeeds = [
    {
      name: '张老师',
      contact_way: 'zhanglaoshi@example.com',
      type: 'learning',
      message: '想了解技艺教学课程后续是否会继续补充正式章节内容。',
      status: 'new',
      user_id: user.id,
    },
    {
      name: '社区合作方',
      contact_way: '13888880001',
      type: 'cooperation',
      message: '希望沟通一次社区活动联办方案，方便后续补正式案例。',
      status: 'processing',
      user_id: null,
    },
    {
      name: '体验用户',
      contact_way: 'feedback@example.com',
      type: 'feedback',
      message: '现在首页层次已经清楚很多，建议后续把演示内容继续替换成正式素材。',
      status: 'resolved',
      user_id: user.id,
    },
  ]

  for (const item of contactSeeds) {
    await upsert(
      'contact_messages',
      { name: item.name, contact_way: item.contact_way, message: item.message },
      item,
    )
  }

  const videoA = await upsert('videos', { title: '绣作过程记录短片' }, {
    description: '记录从打样到完成作品的短视频，用于视频大赛页演示。',
    video_url: 'https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4',
    cover_url: asset.video,
    author_id: user.id,
    contributor_name: userName,
    category: '创作记录',
    phone: user.phone || '13900000002',
    votes_count: 12,
    views_count: 46,
    status: 'approved',
    approved_at: now,
  })
  const videoB = await upsert('videos', { title: '公益活动花絮剪影' }, {
    description: '用于展示公益活动现场节奏和用户参与氛围的短视频样例。',
    video_url: 'https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4',
    cover_url: asset.event,
    author_id: admin.id,
    contributor_name: adminName,
    category: '活动纪实',
    phone: admin.phone || '13800000001',
    votes_count: 8,
    views_count: 28,
    status: 'approved',
    approved_at: now,
  })

  const videoCommentA = await upsert(
    'comments',
    { video_id: videoA, user_id: admin.id, content: '这个短片很适合挂在演示页，节奏也清楚。' },
    { username: adminName, likes_count: 2 },
  )
  const videoCommentB = await upsert(
    'comments',
    { video_id: videoB, user_id: user.id, content: '活动现场感不错，评论区也终于不空了。' },
    { username: userName, likes_count: 1 },
  )
  await upsert('video_comment_likes', { comment_id: videoCommentA, user_id: user.id }, {})
  await upsert('video_comment_likes', { comment_id: videoCommentB, user_id: admin.id }, {})

  const embWorkA = await upsert('emb_works', { title: '红旗纹样练习作业' }, {
    description: '用基础针法完成的主题练习。',
    image_url: JSON.stringify([asset.embA]),
    author_id: user.id,
    author_name: userName,
    category: '基础练习',
    phone: user.phone || '13900000002',
    votes_count: 14,
    views_count: 52,
    status: 'approved',
    approved_at: now,
  })
  const embWorkB = await upsert('emb_works', { title: '主题构图展示成品' }, {
    description: '完成度更高的一幅主题构图作品。',
    image_url: JSON.stringify([asset.embB, asset.embA]),
    author_id: admin.id,
    author_name: adminName,
    category: '主题创作',
    phone: admin.phone || '13800000001',
    votes_count: 21,
    views_count: 67,
    status: 'approved',
    approved_at: now,
  })

  const embCommentA = await upsert(
    'emb_comments',
    { work_id: embWorkA, user_id: admin.id, content: '这张很适合放在教学成果区，完成度刚刚好。' },
    { username: adminName, likes_count: 2 },
  )
  const embCommentB = await upsert(
    'emb_comments',
    { work_id: embWorkB, user_id: user.id, content: '这幅构图可以直接当演示页封面了。' },
    { username: userName, likes_count: 3 },
  )
  await upsert('emb_comment_likes', { comment_id: embCommentA, user_id: user.id }, {})
  await upsert('emb_comment_likes', { comment_id: embCommentB, user_id: admin.id }, {})

  await syncForumAggregates()

  await logCounts([
    'users',
    'announcements',
    'red_culture_stories',
    'red_culture_history',
    'public_welfare_activities',
    'skill_teaching_courses',
    'forum_topics',
    'forum_comments',
    'interaction_messages',
    'interaction_events',
    'contact_messages',
    'videos',
    'comments',
    'emb_works',
    'emb_comments',
  ])

  if (createdAccounts.length) {
    console.log('Created demo accounts:')
    for (const account of createdAccounts) {
      console.log(`- ${account.role}: ${account.username} / ${account.password} / ${account.phone}`)
    }
  } else {
    console.log('Reused existing active accounts for demo content seeding.')
  }
}

main()
  .catch((error) => {
    console.error('Failed to seed demo content:', error)
    process.exitCode = 1
  })
  .finally(async () => {
    await pool.end()
  })
