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
    desc: '承接图片作品征集、展示、投票和评论互动，是当前最适合优先打磨的核心场景之一。',
    path: '/emb-contest',
    button: '进入大赛',
    featured: true,
  },
  {
    title: '视频大赛',
    desc: '支持视频投稿、作品榜单、评论互动和主题传播，适合联调投稿与审核流程。',
    path: '/video-contest',
    button: '查看赛事',
  },
  {
    title: '红旗文化',
    desc: '展示红旗故事、历史节点与精神语录，承担平台内容气质与品牌感知的建立。',
    path: '/red-culture',
    button: '阅读内容',
  },
  {
    title: '公益纪实',
    desc: '覆盖公益活动、志愿者故事与发展历程，适合展示平台的社会价值与参与感。',
    path: '/public-welfare',
    button: '查看纪实',
  },
  {
    title: '技艺教学',
    desc: '组织课程、教学资源、精选课程和学员作品展示，方便后续做正式运营录入。',
    path: '/skill-teaching',
    button: '进入教学',
  },
  {
    title: '互动交流',
    desc: '承接论坛话题、留言广场和活动报名，支撑平台社区化和活跃度测试。',
    path: '/interaction',
    button: '进入互动',
  },
]

const stageChecklist = [
  '前端主体结构已经迁到 Vue，并接入真实接口。',
  '后台已补上红旗文化、公益纪实、技艺教学三块内容管理。',
  '当前优先目标是页面更顺眼、内容不空、核心链路可测。',
  '后续继续推进回归测试、上传方案和云端部署收口。',
]

const deploymentHighlights = [
  {
    title: '先把前台做顺眼',
    desc: '界面感受稳定以后，补数据和跑测试的效率会更高，也更容易发现真实问题。',
  },
  {
    title: '继续沿用现有后端',
    desc: '当前阶段不急着大改服务端，优先保证接口稳定、数据库一致和录入链路能跑通。',
  },
  {
    title: '从现在就按云端思路推进',
    desc: '环境变量、数据库脚本、上传目录和部署入口都逐步收口，避免后面返工。',
  },
]

const projectFacts = computed(() => [
  {
    label: '登录状态',
    value: authStore.isLoggedIn ? '已登录' : '未登录',
    hint: authStore.isLoggedIn
      ? `当前账号：${authStore.user?.display_name || authStore.user?.username || '平台用户'}`
      : '可以直接从登录页联调鉴权链路',
  },
  {
    label: '接口健康度',
    value: backendHealthy.value ? '在线' : '待确认',
    hint: backendTimestamp.value ? `最近检查：${formatDate(backendTimestamp.value)}` : '通过 /api/health 获取',
  },
  {
    label: '当前重点',
    value: '可视优化 + 演示内容',
    hint: '先让平台看起来完整可用，再继续细化功能和回归测试。',
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
        <p class="section-kicker">PLATFORM REBUILD</p>
        <h1>先把平台做成“看得舒服、点得清楚、内容不空”的可用版本</h1>
        <p class="hero-panel__desc">
          这一阶段不再只堆功能骨架，而是优先把首页、导航、内容呈现和后台录入能力统一起来。
          页面观感稳定后，后面的回归测试、内容补录和云端部署收口都会顺很多。
        </p>

        <div class="hero-panel__actions">
          <el-button type="danger" @click="$router.push('/emb-contest')">先看核心赛事</el-button>
          <el-button plain @click="$router.push('/admin')">进入后台录入内容</el-button>
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
                <p class="status-card__kicker">LIVE STATUS</p>
                <h2>当前基线</h2>
              </div>
              <el-tag :type="backendHealthy ? 'success' : 'warning'">
                {{ healthLoading ? '检查中' : backendHealthy ? '后端在线' : '待确认' }}
              </el-tag>
            </div>
          </template>

          <ul class="status-list">
            <li v-for="item in stageChecklist" :key="item">{{ item }}</li>
          </ul>
        </el-card>

        <el-card shadow="never" class="status-card status-card--accent">
          <p class="status-card__kicker">DEPLOYMENT</p>
          <h2>部署准备</h2>
          <p class="status-card__desc">
            当前先把页面和业务链路做稳，后续继续完善数据库脚本、生产构建、上传持久化和对象存储方案。
          </p>
        </el-card>
      </div>
    </section>

    <section class="section-block">
      <div class="section-heading">
        <p class="section-kicker">DATA SNAPSHOT</p>
        <h2>首页实时概览</h2>
        <p>这部分直接读取当前数据库，可以快速判断哪些板块已经不空、哪些板块还需要继续补内容。</p>
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
        <p class="section-kicker">QUICK ENTRANCES</p>
        <h2>核心模块入口</h2>
        <p>每个入口都对应一条真实业务链路，现在优先让它们看得清、点得顺、打开后有内容可看。</p>
      </div>

      <div class="entrance-grid">
        <article
          v-for="item in quickEntrances"
          :key="item.title"
          class="entrance-card"
          :class="{ 'entrance-card--featured': item.featured }"
        >
          <div class="entrance-card__top">
            <span v-if="item.featured" class="entrance-card__badge">优先完善</span>
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
          <p>公告已经和后台打通，适合做首页与运营侧联动的稳定入口。</p>
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
          <h2>最新内容变动</h2>
          <p>这些内容来自当前数据库，能帮助判断平台哪些模块已经具备展示基础。</p>
        </div>

        <el-empty v-if="!latestUpdates.length" description="当前数据库里还没有可展示的最新动态" />

        <div v-else class="updates-list">
          <article v-for="item in latestUpdates" :key="`${item.category}-${item.id}`" class="update-card">
            <div class="update-card__meta">
              <el-tag size="small" type="danger">{{ formatCategory(item.category) }}</el-tag>
              <span>{{ formatDate(item.created_at) }}</span>
            </div>
            <h3>{{ item.title }}</h3>
            <p>该模块已经有内容沉淀，后续可以继续完善列表页、详情页与后台运营流程。</p>
          </article>
        </div>
      </el-card>
    </section>

    <section class="section-block">
      <div class="section-heading">
        <p class="section-kicker">CLOUD READY</p>
        <h2>从现在开始按云端思路继续升级</h2>
        <p>观感不是终点，但它会显著影响后续测试效率和交付质量。现在这个版本，就是继续补功能和部署的基础线。</p>
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
  background: rgba(255, 251, 246, 0.88);
  box-shadow: var(--xhq-shadow-md);
  backdrop-filter: blur(16px);
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
  background: rgba(255, 251, 246, 0.9);
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
