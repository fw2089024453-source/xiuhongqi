<script setup>
import { computed, onMounted, reactive, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import {
  getAdminEmbWorksApi,
  getAdminVideoWorksApi,
  updateAdminEmbWorkStatusApi,
  updateAdminVideoWorkStatusApi,
} from '@/api/admin'

const route = useRoute()

const loading = ref(false)
const activeTab = ref(route.query.tab === 'emb' ? 'emb' : 'video')
const statusFilter = ref('pending')

const reviewState = reactive({
  video: {
    items: [],
    currentPage: 1,
    totalPages: 1,
    total: 0,
    statusSummary: {
      pending: 0,
      approved: 0,
      rejected: 0,
      archived: 0,
    },
  },
  emb: {
    items: [],
    currentPage: 1,
    totalPages: 1,
    total: 0,
    statusSummary: {
      pending: 0,
      approved: 0,
      rejected: 0,
      archived: 0,
    },
  },
})

const statusOptions = [
  { label: '待审核', value: 'pending' },
  { label: '已通过', value: 'approved' },
  { label: '已驳回', value: 'rejected' },
  { label: '已归档', value: 'archived' },
]

const currentState = computed(() => reviewState[activeTab.value])

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

function normalizeEmbImages(value) {
  if (!value) return []

  if (Array.isArray(value)) {
    return value
  }

  try {
    const parsed = JSON.parse(value)
    return Array.isArray(parsed) ? parsed : []
  } catch (error) {
    return []
  }
}

function buildPreview(work) {
  if (activeTab.value === 'video') {
    return {
      image: work.cover_url,
      media: work.video_url,
      label: '查看视频',
    }
  }

  const images = normalizeEmbImages(work.image_url)
  return {
    image: images[0] || '',
    media: images[0] || '',
    label: '查看图片',
  }
}

function openPreview(work) {
  const preview = buildPreview(work)

  if (preview.media) {
    window.open(preview.media, '_blank', 'noopener,noreferrer')
  }
}

async function loadWorks() {
  loading.value = true

  try {
    const params = {
      status: statusFilter.value,
      page: currentState.value.currentPage,
      limit: 8,
    }

    const result =
      activeTab.value === 'video'
        ? await getAdminVideoWorksApi(params)
        : await getAdminEmbWorksApi(params)

    reviewState[activeTab.value] = {
      ...reviewState[activeTab.value],
      items: result.data?.items || [],
      currentPage: result.data?.currentPage || 1,
      totalPages: result.data?.totalPages || 1,
      total: result.data?.total || 0,
      statusSummary: result.data?.statusSummary || reviewState[activeTab.value].statusSummary,
    }
  } catch (error) {
    ElMessage.error(error.message || '加载审核列表失败')
  } finally {
    loading.value = false
  }
}

async function updateStatus(work, nextStatus) {
  const actionTextMap = {
    approved: '通过',
    rejected: '驳回',
    archived: '归档',
  }

  try {
    await ElMessageBox.confirm(
      `确认将“${work.title}”标记为${actionTextMap[nextStatus]}吗？`,
      '审核确认',
      { type: nextStatus === 'approved' ? 'success' : 'warning' },
    )

    if (activeTab.value === 'video') {
      await updateAdminVideoWorkStatusApi(work.id, { status: nextStatus })
    } else {
      await updateAdminEmbWorkStatusApi(work.id, { status: nextStatus })
    }

    ElMessage.success('作品状态已更新')
    await loadWorks()
  } catch (error) {
    if (error !== 'cancel') {
      ElMessage.error(error.message || '更新作品状态失败')
    }
  }
}

function changePage(page) {
  reviewState[activeTab.value].currentPage = page
  loadWorks()
}

watch(
  () => route.query.tab,
  (value) => {
    activeTab.value = value === 'emb' ? 'emb' : 'video'
  },
)

watch(activeTab, () => {
  reviewState[activeTab.value].currentPage = 1
  loadWorks()
})

watch(statusFilter, () => {
  reviewState[activeTab.value].currentPage = 1
  loadWorks()
})

onMounted(() => {
  loadWorks()
})
</script>

<template>
  <div class="review-page">
    <section class="review-hero">
      <div>
        <p class="review-kicker">CONTENT REVIEW</p>
        <h1>作品审核台</h1>
        <p class="review-desc">
          先把视频大赛和绣红旗大赛的审核链路做通。审核通过后，作品会直接影响前台可见内容数量和整体呈现质量。
        </p>
      </div>
      <el-radio-group v-model="statusFilter" class="review-filter">
        <el-radio-button v-for="item in statusOptions" :key="item.value" :value="item.value">
          {{ item.label }}
        </el-radio-button>
      </el-radio-group>
    </section>

    <el-tabs v-model="activeTab" class="review-tabs">
      <el-tab-pane label="视频大赛" name="video" />
      <el-tab-pane label="绣红旗大赛" name="emb" />
    </el-tabs>

    <section class="summary-grid">
      <article class="summary-card">
        <span>待审核</span>
        <strong>{{ currentState.statusSummary.pending }}</strong>
      </article>
      <article class="summary-card">
        <span>已通过</span>
        <strong>{{ currentState.statusSummary.approved }}</strong>
      </article>
      <article class="summary-card">
        <span>已驳回</span>
        <strong>{{ currentState.statusSummary.rejected }}</strong>
      </article>
      <article class="summary-card">
        <span>已归档</span>
        <strong>{{ currentState.statusSummary.archived }}</strong>
      </article>
    </section>

    <el-empty
      v-if="!currentState.items.length && !loading"
      :description="statusFilter === 'pending' ? '当前没有待审核作品' : '当前筛选条件下没有作品'"
      class="review-empty"
    />

    <div v-else class="review-grid">
      <article v-for="item in currentState.items" :key="`${activeTab}-${item.id}`" class="review-card">
        <div class="review-card__media">
          <img v-if="buildPreview(item).image" :src="buildPreview(item).image" :alt="item.title" />
          <div v-else class="review-card__placeholder">无预览</div>
        </div>

        <div class="review-card__content">
          <div class="review-card__meta">
            <el-tag :type="item.status === 'approved' ? 'success' : item.status === 'rejected' ? 'danger' : item.status === 'archived' ? 'info' : 'warning'">
              {{ statusOptions.find((option) => option.value === item.status)?.label || item.status }}
            </el-tag>
            <span>{{ formatDate(item.created_at) }}</span>
          </div>

          <h3>{{ item.title }}</h3>

          <div class="review-card__info">
            <span>作者：{{ item.author_name }}</span>
            <span>分类：{{ item.category || '未分类' }}</span>
            <span v-if="item.phone">联系电话：{{ item.phone }}</span>
            <span>票数：{{ item.votes_count || 0 }}</span>
            <span>浏览：{{ item.views_count || 0 }}</span>
          </div>

          <p class="review-card__desc">{{ item.description || '作者未填写作品说明。' }}</p>

          <div class="review-card__actions">
            <el-button v-if="buildPreview(item).media" plain @click="openPreview(item)">
              {{ buildPreview(item).label }}
            </el-button>
            <el-button v-if="item.status !== 'approved'" type="success" plain @click="updateStatus(item, 'approved')">
              通过
            </el-button>
            <el-button v-if="item.status !== 'rejected'" type="danger" plain @click="updateStatus(item, 'rejected')">
              驳回
            </el-button>
            <el-button v-if="item.status !== 'archived'" plain @click="updateStatus(item, 'archived')">
              归档
            </el-button>
          </div>
        </div>
      </article>
    </div>

    <div class="pagination-shell" v-if="currentState.totalPages > 1">
      <el-pagination
        background
        layout="prev, pager, next"
        :current-page="currentState.currentPage"
        :page-size="8"
        :total="currentState.total"
        @current-change="changePage"
      />
    </div>
  </div>
</template>

<style scoped lang="scss">
.review-page {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.review-hero {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 18px;
  padding: 28px 32px;
  border-radius: 28px;
  background:
    radial-gradient(circle at top right, rgba(198, 138, 60, 0.22), transparent 28%),
    linear-gradient(135deg, #661317 0%, #8f1f22 55%, #3b2a26 100%);
  color: #fff7ed;
}

.review-kicker {
  margin: 0;
  color: rgba(255, 247, 237, 0.74);
  font-size: 12px;
  letter-spacing: 1.8px;
}

.review-hero h1 {
  margin: 10px 0 12px;
  font-size: clamp(30px, 5vw, 44px);
}

.review-desc {
  max-width: 760px;
  margin: 0;
  color: rgba(255, 247, 237, 0.92);
  line-height: 1.8;
}

.review-filter {
  flex-shrink: 0;
}

.review-tabs,
.summary-grid,
.review-grid {
  display: grid;
  gap: 16px;
}

.summary-grid {
  grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
}

.summary-card,
.review-card {
  border-radius: 24px;
  border: 1px solid #eadfce;
  background: rgba(255, 255, 255, 0.92);
  box-shadow: var(--xhq-shadow-md);
}

.summary-card {
  padding: 18px 20px;
}

.summary-card span {
  color: #9a3412;
  font-size: 13px;
}

.summary-card strong {
  display: block;
  margin-top: 8px;
  color: #111827;
  font-size: 32px;
}

.review-grid {
  grid-template-columns: repeat(auto-fit, minmax(340px, 1fr));
}

.review-card {
  overflow: hidden;
}

.review-card__media {
  height: 220px;
  background: linear-gradient(180deg, rgba(248, 236, 223, 0.98), rgba(255, 255, 255, 0.96));
}

.review-card__media img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.review-card__placeholder {
  display: grid;
  place-items: center;
  width: 100%;
  height: 100%;
  color: #9f8c7d;
}

.review-card__content {
  display: flex;
  flex-direction: column;
  gap: 14px;
  padding: 20px;
}

.review-card__meta,
.review-card__actions {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  flex-wrap: wrap;
}

.review-card__meta span {
  color: #8a8178;
  font-size: 12px;
}

.review-card h3 {
  margin: 0;
  color: #231815;
}

.review-card__info {
  display: flex;
  flex-wrap: wrap;
  gap: 8px 14px;
  color: #6f6258;
  font-size: 13px;
}

.review-card__desc {
  margin: 0;
  color: #5f544b;
  line-height: 1.75;
}

.pagination-shell {
  display: flex;
  justify-content: center;
  padding-top: 8px;
}

.review-empty {
  padding: 24px 0;
  border-radius: 24px;
  border: 1px solid #eadfce;
  background: rgba(255, 255, 255, 0.9);
}

@media (max-width: 960px) {
  .review-hero {
    flex-direction: column;
    align-items: flex-start;
  }
}

@media (max-width: 768px) {
  .review-hero {
    padding: 22px;
  }

  .review-grid {
    grid-template-columns: 1fr;
  }
}
</style>
