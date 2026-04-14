<script setup>
import { computed, onMounted, ref } from 'vue'
import { getHomeAnnouncementsApi, getHomeOverviewApi } from '@/api/home'
import { getSystemHealthApi } from '@/api/system'
import { useAuthStore } from '@/stores/auth'

const authStore = useAuthStore()

const healthLoading = ref(false)
const backendHealthy = ref(false)
const backendTimestamp = ref('')
const overviewLoading = ref(false)
const overview = ref({
  users: 0,
  culture: 0,
  welfare: 0,
  courses: 0,
  topics: 0,
})
const latestUpdates = ref([])
const announcements = ref([])

const quickEntrances = [
  {
    title: '绣红旗大赛',
    desc: '汇聚刺绣作品征集、公开展示、互动评议与专题传播，呈现红色文化与非遗创作的融合表达。',
    path: '/emb-contest',
    button: '进入大赛',
    featured: true,
  },
  {
    title: '视频大赛',
    desc: '面向影像创作的征集与展示专区，兼具作品排行、互动传播与活动参与体验。',
    path: '/video-contest',
    button: '查看赛事',
  },
  {
    title: '红旗文化',
    desc: '通过故事、节点与精神语录，集中呈现红旗文化的历史脉络与时代价值。',
    path: '/red-culture',
    button: '阅读内容',
  },
  {
    title: '公益纪实',
    desc: '展示公益项目、志愿行动与发展成果，传递平台的责任担当与社会温度。',
    path: '/public-welfare',
    button: '查看纪实',
  },
  {
    title: '技艺教学',
    desc: '呈现课程体系、教学资料与学习成果，展示非遗技艺传承与实践路径。',
    path: '/skill-teaching',
    button: '进入教学',
  },
  {
    title: '互动交流',
    desc: '以话题、留言与活动参与连接用户，营造更具交流感与参与感的平台氛围。',
    path: '/interaction',
    button: '进入互动',
  },
]

const stageChecklist = [
  '聚合红色文化、非遗技艺、赛事活动与公益传播等核心内容。',
  '以前台展示与后台运营协同支撑内容发布、审核与管理。',
  '支持作品投稿、专题浏览、留言互动与活动报名等多元参与方式。',
  '通过统一视觉与专题化表达，塑造更完整的品牌形象。',
]

const deploymentHighlights = [
  {
    title: '文化展示',
    desc: '通过专题化内容编排与视觉设计，集中呈现红色文化与非遗技艺的独特魅力。',
  },
  {
    title: '活动运营',
    desc: '以赛事、投稿、榜单与互动评论为抓手，形成可传播、可参与的活动场景。',
  },
  {
    title: '公益连接',
    desc: '通过公益纪实、志愿故事与社会成果展示，强化平台的责任感与公共价值。',
  },
]

const projectFacts = computed(() => [
  {
    label: '登录状态',
    value: authStore.isLoggedIn ? '已登录' : '访客浏览',
    hint: authStore.isLoggedIn
      ? `欢迎回来：${authStore.user?.display_name || authStore.user?.username || '平台用户'}`
      : '登录后可参与投稿、留言、报名与个人中心管理。',
  },
  {
    label: '平台服务',
    value: backendHealthy.value ? '稳定可用' : '持续更新',
    hint: backendTimestamp.value ? `最近同步：${formatDate(backendTimestamp.value)}` : '平台内容将持续完善。',
  },
  {
    label: '品牌定位',
    value: '红色文化 × 非遗展示',
    hint: '以文化传播、技艺传承、公益实践与赛事活动为核心内容。',
  },
])

const statCards = computed(() => [
  { label: '注册用户', value: overview.value.users, hint: '数据库中的用户总量' },
  { label: '文化内容', value: overview.value.culture, hint: '红旗文化板块可展示内容' },
  { label: '公益项目', value: overview.value.welfare, hint: '公益活动与纪实条目数' },
  { label: '教学课程', value: overview.value.courses, hint: '当前课程与教学内容数量' },
  { label: '社区话题', value: overview.value.topics, hint: '互动交流中的有效话题数' },
])

function formatCategory(category) {
  const map = {
    culture: '红旗文化',
    welfare: '公益纪实',
    course: '技艺教学',
    topic: '互动交流',
  }

  return map[category] || '平台动态'
}

function formatDate(dateTime) {
  if (!dateTime) return '暂无时间'

  return new Date(dateTime).toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })
}

async function loadSystemHealth() {
  healthLoading.value = true

  try {
    const result = await getSystemHealthApi()
    backendHealthy.value = result.status === 'healthy'
    backendTimestamp.value = result.timestamp
  } catch (error) {
    backendHealthy.value = false
    backendTimestamp.value = error.message
  } finally {
    healthLoading.value = false
  }
}

async function loadOverview() {
  overviewLoading.value = true

  try {
    const [overviewResult, announcementsResult] = await Promise.all([
      getHomeOverviewApi(),
      getHomeAnnouncementsApi(),
    ])

    overview.value = overviewResult.data.overview
    latestUpdates.value = overviewResult.data.latest || []
    announcements.value = (announcementsResult.data || []).slice(0, 3)
  } catch {
    latestUpdates.value = []
    announcements.value = []
  } finally {
    overviewLoading.value = false
  }
}

onMounted(() => {
  loadSystemHealth()
  loadOverview()
})
</script>

<template>
  <div class="home-page">
    <section class="hero-panel">
      <div class="hero-panel__content">
        <p class="section-kicker">CULTURE · HERITAGE · DIGITAL</p>
        <h1>让红色文化与非遗技艺，在数字平台中被看见、被传播、被参与</h1>
        <p class="hero-panel__desc">
          平台以红色文化传播、非遗技艺展示、赛事活动承载与公益实践为核心，
          通过更完整的视觉表达与功能组织，呈现正式、可信且具有文化温度的品牌形象。
        </p>

        <div class="hero-panel__actions">
          <el-button type="danger" @click="$router.push('/emb-contest')">了解绣红旗大赛</el-button>
          <el-button plain @click="$router.push('/red-culture')">走进红旗文化</el-button>
        </div>

        <div class="hero-panel__metrics">
          <article v-for="item in projectFacts" :key="item.label" class="fact-card">
            <span class="fact-card__label">{{ item.label }}</span>
            <strong>{{ item.value }}</strong>
            <p>{{ item.hint }}</p>
          </article>
        </div>
      </div>

      <div class="hero-panel__aside">
        <el-card shadow="never" class="status-card">
          <template #header>
            <div class="status-card__header">
              <div>
                <p class="status-card__kicker">PLATFORM OVERVIEW</p>
                <h2>平台特色</h2>
              </div>
              <el-tag :type="backendHealthy ? 'success' : 'warning'">
                {{ healthLoading ? '更新中' : backendHealthy ? '内容在线' : '持续完善' }}
              </el-tag>
            </div>
          </template>

          <ul class="status-list">
            <li v-for="item in stageChecklist" :key="item">{{ item }}</li>
          </ul>
        </el-card>

        <el-card shadow="never" class="status-card status-card--accent">
          <p class="status-card__kicker">BRAND MISSION</p>
          <h2>平台愿景</h2>
          <p class="status-card__desc">
            以数字化方式连接文化内容、技艺学习、公益行动与用户参与，
            让红色精神与非遗价值在更广泛的传播场景中持续发声。
          </p>
        </el-card>
      </div>
    </section>

    <section class="section-block">
      <div class="section-heading">
        <p class="section-kicker">PLATFORM OVERVIEW</p>
        <h2>平台内容概览</h2>
        <p>汇总当前已呈现的文化内容、公益项目、教学课程与互动数据，展示平台的整体内容面貌。</p>
      </div>

      <el-skeleton :loading="overviewLoading" animated>
        <template #template>
          <div class="stats-grid">
            <div v-for="item in 5" :key="item" class="stat-card">
              <el-skeleton-item variant="text" style="width: 72px" />
              <el-skeleton-item variant="h3" style="width: 108px; margin-top: 12px" />
              <el-skeleton-item variant="text" style="width: 160px; margin-top: 12px" />
            </div>
          </div>
        </template>

        <div class="stats-grid">
          <article v-for="item in statCards" :key="item.label" class="stat-card">
            <span class="stat-card__label">{{ item.label }}</span>
            <strong>{{ item.value }}</strong>
            <p>{{ item.hint }}</p>
          </article>
        </div>
      </el-skeleton>
    </section>

    <section class="section-block section-block--warm">
      <div class="section-heading">
        <p class="section-kicker">FEATURE MODULES</p>
        <h2>核心功能板块</h2>
        <p>围绕展示、活动、教学与互动构建完整平台体验，让每个入口都清晰、正式且易于参与。</p>
      </div>

      <div class="entrance-grid">
        <article
          v-for="item in quickEntrances"
          :key="item.title"
          class="entrance-card"
          :class="{ 'entrance-card--featured': item.featured }"
        >
          <div class="entrance-card__top">
            <span v-if="item.featured" class="entrance-card__badge">特色专题</span>
            <h3>{{ item.title }}</h3>
          </div>
          <p>{{ item.desc }}</p>
          <el-button
            class="entrance-card__button"
            :type="item.featured ? 'danger' : 'default'"
            @click="$router.push(item.path)"
          >
            {{ item.button }}
          </el-button>
        </article>
      </div>
    </section>

    <section class="section-split">
      <el-card shadow="never" class="split-card">
        <div class="section-heading section-heading--compact">
          <p class="section-kicker">ANNOUNCEMENTS</p>
          <h2>平台公告</h2>
          <p>发布重要通知、活动信息与品牌动态，形成对外展示与运营联动的统一窗口。</p>
        </div>

        <el-empty v-if="!announcements.length" description="当前还没有公告内容" />

        <div v-else class="announcements-grid">
          <article v-for="item in announcements" :key="item.id" class="announcement-card">
            <div class="announcement-card__meta">
              <el-tag :type="item.type === 'urgent' ? 'danger' : item.type === 'update' ? 'warning' : 'info'">
                {{ item.type === 'urgent' ? '紧急' : item.type === 'update' ? '更新' : '通知' }}
              </el-tag>
              <span>{{ formatDate(item.created_at) }}</span>
            </div>
            <h3>{{ item.title }}</h3>
            <p>{{ item.content }}</p>
          </article>
        </div>
      </el-card>

      <el-card shadow="never" class="split-card">
        <div class="section-heading section-heading--compact">
          <p class="section-kicker">LATEST UPDATES</p>
          <h2>近期更新内容</h2>
          <p>展示近期公开内容的更新情况，保持平台的持续活力与内容新鲜度。</p>
        </div>

        <el-empty v-if="!latestUpdates.length" description="当前数据库里还没有可展示的最新动态" />

        <div v-else class="updates-list">
          <article v-for="item in latestUpdates" :key="`${item.category}-${item.id}`" class="update-card">
            <div class="update-card__meta">
              <el-tag size="small" type="danger">{{ formatCategory(item.category) }}</el-tag>
              <span>{{ formatDate(item.created_at) }}</span>
            </div>
            <h3>{{ item.title }}</h3>
            <p>该板块已形成内容沉淀，可继续深入浏览并参与相关专题内容。</p>
          </article>
        </div>
      </el-card>
    </section>

    <section class="section-block">
      <div class="section-heading">
        <p class="section-kicker">PLATFORM VALUES</p>
        <h2>平台价值与表达方向</h2>
        <p>以文化展示为核心，以用户参与为纽带，让品牌形象、活动传播与内容沉淀形成统一的数字表达。</p>
      </div>

      <div class="deployment-grid">
        <article v-for="item in deploymentHighlights" :key="item.title" class="deployment-card">
          <h3>{{ item.title }}</h3>
          <p>{{ item.desc }}</p>
        </article>
      </div>
    </section>
  </div>
</template>

<style scoped lang="scss">
.home-page {
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.hero-panel {
  display: grid;
  grid-template-columns: minmax(0, 1.3fr) minmax(300px, 0.82fr);
  gap: 20px;
}

.hero-panel__content,
.section-block,
.split-card {
  border: 1px solid rgba(234, 217, 199, 0.92);
  border-radius: 30px;
  background: #fffaf5;
  box-shadow: var(--xhq-shadow-md);
}

.hero-panel__content {
  padding: 34px;
  background:
    radial-gradient(circle at top right, rgba(246, 228, 198, 0.26), transparent 26%),
    linear-gradient(135deg, #651417 0%, #8f1e20 52%, #b67831 100%);
  color: #fff9f1;
}

.hero-panel__content h1 {
  max-width: 920px;
  margin: 10px 0 14px;
  font-family: "Source Han Serif SC", "STSong", "SimSun", serif;
  font-size: clamp(32px, 5vw, 54px);
  line-height: 1.1;
}

.hero-panel__desc {
  max-width: 760px;
  margin: 0;
  color: rgba(255, 249, 241, 0.9);
  font-size: 15px;
  line-height: 1.85;
}

.hero-panel__actions {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  margin-top: 24px;
}

.hero-panel__metrics {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 12px;
  margin-top: 24px;
}

.hero-panel__aside {
  display: grid;
  gap: 20px;
}

.status-card {
  border-radius: 28px;
  background: #fffdf9;
}

.status-card--accent {
  background:
    radial-gradient(circle at top right, rgba(198, 138, 60, 0.18), transparent 32%),
    linear-gradient(180deg, rgba(255, 248, 240, 0.98), rgba(255, 255, 255, 0.98));
}

.status-card__header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
}

.status-card__kicker,
.section-kicker {
  margin: 0;
  color: var(--xhq-accent);
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 2px;
}

.status-card h2,
.section-heading h2 {
  margin: 8px 0 0;
  font-family: "Source Han Serif SC", "STSong", "SimSun", serif;
  font-size: clamp(24px, 4vw, 34px);
  line-height: 1.2;
  color: var(--xhq-primary-deep);
}

.status-card__desc,
.section-heading p,
.fact-card p,
.stat-card p,
.entrance-card p,
.announcement-card p,
.update-card p,
.deployment-card p {
  margin: 0;
  color: var(--xhq-text-muted);
  line-height: 1.8;
}

.status-list {
  display: grid;
  gap: 10px;
  margin: 0;
  padding-left: 18px;
  color: var(--xhq-text-muted);
  line-height: 1.8;
}

.section-block,
.split-card {
  padding: 28px;
}

.section-block--warm {
  background:
    radial-gradient(circle at top left, rgba(198, 138, 60, 0.12), transparent 30%),
    rgba(255, 248, 241, 0.92);
}

.section-heading {
  margin-bottom: 20px;
}

.section-heading--compact h2 {
  font-size: 28px;
}

.section-heading h2 {
  margin-bottom: 10px;
}

.stats-grid,
.entrance-grid,
.announcements-grid,
.deployment-grid {
  display: grid;
  gap: 16px;
}

.stats-grid {
  grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
}

.entrance-grid,
.deployment-grid {
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
}

.announcements-grid {
  grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
}

.fact-card,
.stat-card,
.entrance-card,
.announcement-card,
.update-card,
.deployment-card {
  border-radius: 22px;
  border: 1px solid #eadfce;
  background: rgba(255, 255, 255, 0.84);
}

.fact-card,
.stat-card,
.deployment-card {
  padding: 18px;
}

.fact-card {
  background: rgba(255, 255, 255, 0.14);
  border-color: rgba(255, 255, 255, 0.16);
}

.fact-card__label {
  color: rgba(255, 249, 241, 0.72);
  font-size: 12px;
}

.fact-card strong,
.stat-card strong {
  display: block;
  margin: 8px 0 6px;
  font-size: 26px;
}

.fact-card strong {
  color: #fff9f1;
}

.fact-card p {
  color: rgba(255, 249, 241, 0.84);
}

.stat-card strong {
  color: var(--xhq-primary-deep);
}

.stat-card__label {
  color: var(--xhq-text-soft);
  font-size: 12px;
}

.entrance-card {
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 20px;
  background: linear-gradient(180deg, rgba(255, 255, 255, 0.94), rgba(253, 247, 241, 0.88));
}

.entrance-card--featured {
  border-color: #dcb590;
  background:
    radial-gradient(circle at top right, rgba(198, 138, 60, 0.16), transparent 28%),
    linear-gradient(180deg, rgba(255, 247, 238, 0.98), rgba(255, 255, 255, 0.96));
}

.entrance-card__top {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.entrance-card__badge {
  width: fit-content;
  padding: 5px 10px;
  border-radius: 999px;
  background: var(--xhq-primary);
  color: #fff;
  font-size: 12px;
  font-weight: 700;
}

.entrance-card__button {
  width: fit-content;
  margin-top: auto;
}

.entrance-card h3,
.announcement-card h3,
.update-card h3,
.deployment-card h3 {
  margin: 0;
  color: var(--xhq-primary-deep);
}

.section-split {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 20px;
}

.updates-list {
  display: grid;
  gap: 14px;
}

.announcement-card,
.update-card {
  padding: 18px;
}

.announcement-card__meta,
.update-card__meta {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 12px;
  color: var(--xhq-text-soft);
  font-size: 12px;
}

@media (max-width: 1100px) {
  .hero-panel,
  .section-split {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 768px) {
  .hero-panel__content,
  .section-block,
  .split-card {
    padding: 22px;
    border-radius: 24px;
  }

  .hero-panel__metrics {
    grid-template-columns: 1fr;
  }

  .hero-panel__actions {
    flex-direction: column;
    align-items: stretch;
  }

  .entrance-card__button {
    width: 100%;
  }
}
</style>
