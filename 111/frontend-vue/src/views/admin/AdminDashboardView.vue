<script setup>
import { computed, onMounted, reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import {
  createAnnouncementApi,
  deleteAnnouncementApi,
  getAdminAnnouncementsApi,
  getAdminReviewOverviewApi,
  getAdminStatisticsApi,
  updateAnnouncementApi,
} from '@/api/admin'

const router = useRouter()

const loading = ref(false)
const saving = ref(false)
const dialogVisible = ref(false)
const editingId = ref(null)

const stats = reactive({
  overview: {
    works: 0,
    votes: 0,
    users: 0,
  },
  categories: [],
  latest: {
    works: [],
    announcements: [],
  },
})

const reviewOverview = reactive({
  videos: {
    pending: 0,
    approved: 0,
    rejected: 0,
    archived: 0,
  },
  embroideries: {
    pending: 0,
    approved: 0,
    rejected: 0,
    archived: 0,
  },
  pendingTotal: 0,
})

const announcements = ref([])

const form = reactive({
  title: '',
  type: 'info',
  content: '',
})

const overviewCards = computed(() => [
  { label: '已公开作品', value: stats.overview.works, hint: '当前前台可以看到的作品数量' },
  { label: '累计投票', value: stats.overview.votes, hint: '赛事模块已经产生的投票总量' },
  { label: '注册用户', value: stats.overview.users, hint: '当前数据库中的用户数量' },
])

const reviewCards = computed(() => [
  {
    title: '视频大赛待审',
    value: reviewOverview.videos.pending,
    hint: `已通过 ${reviewOverview.videos.approved}，已驳回 ${reviewOverview.videos.rejected}`,
    action: () => router.push('/admin/reviews?tab=video'),
  },
  {
    title: '绣红旗待审',
    value: reviewOverview.embroideries.pending,
    hint: `已通过 ${reviewOverview.embroideries.approved}，已驳回 ${reviewOverview.embroideries.rejected}`,
    action: () => router.push('/admin/reviews?tab=emb'),
  },
  {
    title: '待处理总量',
    value: reviewOverview.pendingTotal,
    hint: '后台优先处理待审核作品，前台展示质量会立刻提升',
    action: () => router.push('/admin/reviews'),
  },
])

function formatDate(value) {
  if (!value) return '暂无'

  return new Date(value).toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function formatType(value) {
  const map = {
    info: '通知',
    urgent: '紧急',
    update: '更新',
  }

  return map[value] || value || '通知'
}

function resetForm() {
  editingId.value = null
  form.title = ''
  form.type = 'info'
  form.content = ''
}

function openCreateDialog() {
  resetForm()
  dialogVisible.value = true
}

function openEditDialog(item) {
  editingId.value = item.id
  form.title = item.title
  form.type = item.type || 'info'
  form.content = item.content || ''
  dialogVisible.value = true
}

async function loadDashboard() {
  loading.value = true

  try {
    const [statisticsResult, announcementsResult, reviewResult] = await Promise.all([
      getAdminStatisticsApi(),
      getAdminAnnouncementsApi(),
      getAdminReviewOverviewApi(),
    ])

    stats.overview = statisticsResult.data?.overview || stats.overview
    stats.categories = statisticsResult.data?.categories || []
    stats.latest = statisticsResult.data?.latest || stats.latest
    announcements.value = announcementsResult.data || []

    reviewOverview.videos = reviewResult.data?.videos || reviewOverview.videos
    reviewOverview.embroideries = reviewResult.data?.embroideries || reviewOverview.embroideries
    reviewOverview.pendingTotal = reviewResult.data?.pendingTotal || 0
  } catch (error) {
    ElMessage.error(error.message || '加载后台首页失败')
  } finally {
    loading.value = false
  }
}

async function submitAnnouncement() {
  if (!form.title.trim() || !form.content.trim()) {
    ElMessage.warning('请输入公告标题和内容')
    return
  }

  saving.value = true

  try {
    const payload = {
      title: form.title.trim(),
      type: form.type,
      content: form.content.trim(),
    }

    if (editingId.value) {
      await updateAnnouncementApi(editingId.value, payload)
      ElMessage.success('公告已更新')
    } else {
      await createAnnouncementApi(payload)
      ElMessage.success('公告已创建')
    }

    dialogVisible.value = false
    resetForm()
    await loadDashboard()
  } catch (error) {
    ElMessage.error(error.message || '保存公告失败')
  } finally {
    saving.value = false
  }
}

async function removeAnnouncement(item) {
  try {
    await ElMessageBox.confirm(`确认删除公告“${item.title}”吗？`, '删除确认', {
      type: 'warning',
    })

    await deleteAnnouncementApi(item.id)
    ElMessage.success('公告已删除')
    await loadDashboard()
  } catch (error) {
    if (error !== 'cancel') {
      ElMessage.error(error.message || '删除公告失败')
    }
  }
}

onMounted(() => {
  loadDashboard()
})
</script>

<template>
  <div class="admin-dashboard">
    <section class="admin-hero">
      <div>
        <p class="admin-kicker">ADMIN CONSOLE</p>
        <h1>运营总览台</h1>
        <p class="admin-desc">
          这里先聚合当前可用的统计、公告和审核入口。等审核流稳定后，我们再继续扩展内容发布、用户管理和互动治理。
        </p>
      </div>
      <div class="admin-hero__actions">
        <el-button plain @click="router.push('/admin/reviews')">进入审核台</el-button>
        <el-button type="danger" size="large" :loading="loading" @click="loadDashboard">
          刷新数据
        </el-button>
      </div>
    </section>

    <section class="admin-overview">
      <article v-for="item in overviewCards" :key="item.label" class="overview-card">
        <div class="overview-card__label">{{ item.label }}</div>
        <div class="overview-card__value">{{ item.value }}</div>
        <div class="overview-card__hint">{{ item.hint }}</div>
      </article>
    </section>

    <section class="review-overview">
      <article v-for="item in reviewCards" :key="item.title" class="review-card" @click="item.action">
        <span class="review-card__label">{{ item.title }}</span>
        <strong>{{ item.value }}</strong>
        <p>{{ item.hint }}</p>
      </article>
    </section>

    <section class="admin-grid">
      <el-card shadow="never" class="panel-card">
        <template #header>
          <div class="panel-card__header">
            <div>
              <h2>分类分布</h2>
              <p>快速观察当前公开作品的分类构成，便于继续优化首页和专题页布局。</p>
            </div>
          </div>
        </template>

        <el-empty v-if="!stats.categories.length && !loading" description="当前还没有分类统计数据" />

        <div v-else class="category-list">
          <article v-for="item in stats.categories" :key="item.category" class="category-item">
            <strong>{{ item.category || '未分类' }}</strong>
            <span>{{ item.count }}</span>
          </article>
        </div>
      </el-card>

      <el-card shadow="never" class="panel-card">
        <template #header>
          <div class="panel-card__header">
            <div>
              <h2>最新公开作品</h2>
              <p>这里展示最近对外可见的作品，方便判断审核后的前台呈现情况。</p>
            </div>
          </div>
        </template>

        <el-empty v-if="!stats.latest.works?.length && !loading" description="当前还没有最新作品" />

        <div v-else class="list-shell">
          <article
            v-for="item in stats.latest.works"
            :key="`${item.title}-${item.created_at}`"
            class="list-item"
          >
            <strong>{{ item.title }}</strong>
            <span>{{ item.author_name }}</span>
            <time>{{ formatDate(item.created_at) }}</time>
          </article>
        </div>
      </el-card>
    </section>

    <el-card shadow="never" class="panel-card panel-card--full">
      <template #header>
        <div class="panel-card__header">
          <div>
            <h2>公告管理</h2>
            <p>公告已经与首页打通，可以作为后台第一块真正投入使用的运营能力。</p>
          </div>
          <el-button type="danger" @click="openCreateDialog">新建公告</el-button>
        </div>
      </template>

      <el-empty v-if="!announcements.length && !loading" description="当前还没有公告" />

      <div v-else class="announcement-list">
        <article v-for="item in announcements" :key="item.id" class="announcement-card">
          <div class="announcement-card__top">
            <el-tag :type="item.type === 'urgent' ? 'danger' : item.type === 'update' ? 'warning' : 'info'">
              {{ formatType(item.type) }}
            </el-tag>
            <span>{{ formatDate(item.created_at) }}</span>
          </div>
          <h3>{{ item.title }}</h3>
          <p>{{ item.content }}</p>
          <div class="announcement-card__actions">
            <el-button plain @click="openEditDialog(item)">编辑</el-button>
            <el-button type="danger" plain @click="removeAnnouncement(item)">删除</el-button>
          </div>
        </article>
      </div>
    </el-card>

    <el-dialog
      v-model="dialogVisible"
      :title="editingId ? '编辑公告' : '新建公告'"
      width="560px"
    >
      <el-form label-position="top">
        <el-form-item label="标题">
          <el-input v-model="form.title" maxlength="100" show-word-limit />
        </el-form-item>
        <el-form-item label="类型">
          <el-select v-model="form.type" style="width: 100%">
            <el-option label="通知" value="info" />
            <el-option label="紧急" value="urgent" />
            <el-option label="更新" value="update" />
          </el-select>
        </el-form-item>
        <el-form-item label="内容">
          <el-input v-model="form.content" type="textarea" :rows="6" maxlength="1000" show-word-limit />
        </el-form-item>
      </el-form>

      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="danger" :loading="saving" @click="submitAnnouncement">保存</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<style scoped lang="scss">
.admin-dashboard {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.admin-hero {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 20px;
  padding: 28px 32px;
  border-radius: 28px;
  background:
    radial-gradient(circle at top right, rgba(251, 191, 36, 0.24), transparent 28%),
    linear-gradient(135deg, #111827 0%, #7f1d1d 54%, #b45309 100%);
  color: #fff7ed;
}

.admin-hero__actions {
  display: flex;
  gap: 12px;
  flex-wrap: wrap;
}

.admin-kicker {
  margin: 0;
  font-size: 12px;
  letter-spacing: 1.6px;
  color: rgba(255, 247, 237, 0.76);
}

.admin-hero h1 {
  margin: 10px 0 12px;
  font-size: clamp(30px, 5vw, 44px);
}

.admin-desc {
  max-width: 760px;
  margin: 0;
  line-height: 1.8;
  color: rgba(255, 247, 237, 0.9);
}

.admin-overview,
.review-overview {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: 16px;
}

.overview-card,
.announcement-card,
.review-card {
  padding: 20px;
  border-radius: 24px;
  border: 1px solid #ebe4db;
  background: rgba(255, 255, 255, 0.95);
}

.overview-card__label,
.review-card__label {
  color: #9a3412;
  font-size: 13px;
}

.overview-card__value,
.review-card strong {
  margin-top: 10px;
  color: #111827;
  font-size: 30px;
  font-weight: 700;
}

.overview-card__hint,
.review-card p {
  margin-top: 8px;
  color: #6b7280;
  line-height: 1.6;
  font-size: 13px;
}

.review-card {
  cursor: pointer;
  transition: transform 0.2s ease, box-shadow 0.2s ease;
}

.review-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 18px 26px rgba(111, 62, 35, 0.08);
}

.admin-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 20px;
}

.panel-card {
  border-radius: 28px;
  border: 1px solid #ece7df;
}

.panel-card--full {
  width: 100%;
}

.panel-card__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
}

.panel-card__header h2 {
  margin: 0;
  color: #111827;
}

.panel-card__header p {
  margin: 6px 0 0;
  color: #6b7280;
  line-height: 1.6;
}

.category-list,
.list-shell,
.announcement-list {
  display: grid;
  gap: 14px;
}

.category-item,
.list-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  padding: 14px 16px;
  border-radius: 18px;
  background: #fffaf5;
  border: 1px solid #efe4d6;
}

.list-item {
  align-items: flex-start;
  flex-direction: column;
}

.list-item strong {
  color: #111827;
}

.list-item span,
.list-item time,
.announcement-card__top span {
  color: #6b7280;
  font-size: 13px;
}

.announcement-list {
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
}

.announcement-card__top,
.announcement-card__actions {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.announcement-card h3 {
  margin: 16px 0 10px;
  color: #111827;
}

.announcement-card p {
  margin: 0;
  color: #4b5563;
  line-height: 1.75;
}

.announcement-card__actions {
  justify-content: flex-end;
  margin-top: 18px;
}

@media (max-width: 960px) {
  .admin-grid {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 768px) {
  .admin-hero {
    flex-direction: column;
    align-items: flex-start;
    padding: 24px;
  }
}
</style>
