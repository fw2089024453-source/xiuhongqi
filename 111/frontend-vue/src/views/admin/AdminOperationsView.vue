<script setup>
import { computed, onMounted, reactive, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import {
  getAdminContactMessagesApi,
  getAdminEventRegistrationsApi,
  getAdminInteractionMessagesApi,
  getAdminOperationsOverviewApi,
  updateAdminContactMessageStatusApi,
  updateAdminInteractionMessageStatusApi,
} from '@/api/admin'

const route = useRoute()
const router = useRouter()

const loading = ref(false)
const activeTab = ref(['contact', 'messages', 'events'].includes(route.query.tab) ? route.query.tab : 'contact')
const contactStatusFilter = ref('all')
const messageStatusFilter = ref('all')

const overview = reactive({
  contactMessages: {
    new: 0,
    processing: 0,
    resolved: 0,
    archived: 0,
  },
  interactionMessages: {
    visible: 0,
    hidden: 0,
  },
  eventRegistrations: {
    total: 0,
  },
})

const operationsState = reactive({
  contact: {
    items: [],
    currentPage: 1,
    totalPages: 1,
    total: 0,
    statusSummary: {
      new: 0,
      processing: 0,
      resolved: 0,
      archived: 0,
    },
  },
  messages: {
    items: [],
    currentPage: 1,
    totalPages: 1,
    total: 0,
    statusSummary: {
      visible: 0,
      hidden: 0,
    },
  },
  events: {
    items: [],
    currentPage: 1,
    totalPages: 1,
    total: 0,
  },
})

const contactStatusOptions = [
  { label: '全部', value: 'all' },
  { label: '新留言', value: 'new' },
  { label: '处理中', value: 'processing' },
  { label: '已解决', value: 'resolved' },
  { label: '已归档', value: 'archived' },
]

const messageStatusOptions = [
  { label: '全部', value: 'all' },
  { label: '前台可见', value: 'visible' },
  { label: '已隐藏', value: 'hidden' },
]

const overviewCards = computed(() => [
  {
    title: '待处理联系留言',
    value: overview.contactMessages.new + overview.contactMessages.processing,
    hint: `新留言 ${overview.contactMessages.new} 条，处理中 ${overview.contactMessages.processing} 条`,
  },
  {
    title: '前台公开留言',
    value: overview.interactionMessages.visible,
    hint: `已隐藏 ${overview.interactionMessages.hidden} 条，适合做内容巡检`,
  },
  {
    title: '活动报名记录',
    value: overview.eventRegistrations.total,
    hint: '这里能看到用户从前台提交的全部活动报名信息',
  },
])

const currentState = computed(() => operationsState[activeTab.value])

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

function formatContactType(type) {
  const typeMap = {
    cooperation: '合作',
    feedback: '反馈',
    learning: '学习',
    other: '其他',
  }

  return typeMap[type] || type || '其他'
}

function getContactTagType(status) {
  const tagMap = {
    new: 'danger',
    processing: 'warning',
    resolved: 'success',
    archived: 'info',
  }

  return tagMap[status] || 'info'
}

function getContactStatusLabel(status) {
  const labelMap = {
    new: '新留言',
    processing: '处理中',
    resolved: '已解决',
    archived: '已归档',
  }

  return labelMap[status] || status || '未知状态'
}

function getMessageTagType(status) {
  return status === 'visible' ? 'success' : 'info'
}

function getMessageStatusLabel(status) {
  return status === 'visible' ? '前台可见' : '已隐藏'
}

function syncQueryTab(value) {
  if (route.query.tab === value) return

  router.replace({
    query: {
      ...route.query,
      tab: value,
    },
  })
}

async function loadOverview() {
  const result = await getAdminOperationsOverviewApi()
  overview.contactMessages = result.data?.contactMessages || overview.contactMessages
  overview.interactionMessages = result.data?.interactionMessages || overview.interactionMessages
  overview.eventRegistrations = result.data?.eventRegistrations || overview.eventRegistrations
}

async function loadContactMessages() {
  const result = await getAdminContactMessagesApi({
    status: contactStatusFilter.value,
    page: operationsState.contact.currentPage,
    limit: 8,
  })

  operationsState.contact = {
    ...operationsState.contact,
    items: result.data?.items || [],
    currentPage: result.data?.currentPage || 1,
    totalPages: result.data?.totalPages || 1,
    total: result.data?.total || 0,
    statusSummary: result.data?.statusSummary || operationsState.contact.statusSummary,
  }
}

async function loadInteractionMessages() {
  const result = await getAdminInteractionMessagesApi({
    status: messageStatusFilter.value,
    page: operationsState.messages.currentPage,
    limit: 8,
  })

  operationsState.messages = {
    ...operationsState.messages,
    items: result.data?.items || [],
    currentPage: result.data?.currentPage || 1,
    totalPages: result.data?.totalPages || 1,
    total: result.data?.total || 0,
    statusSummary: result.data?.statusSummary || operationsState.messages.statusSummary,
  }
}

async function loadEventRegistrations() {
  const result = await getAdminEventRegistrationsApi({
    page: operationsState.events.currentPage,
    limit: 8,
  })

  operationsState.events = {
    ...operationsState.events,
    items: result.data?.items || [],
    currentPage: result.data?.currentPage || 1,
    totalPages: result.data?.totalPages || 1,
    total: result.data?.total || 0,
  }
}

async function loadCurrentTab() {
  loading.value = true

  try {
    if (activeTab.value === 'contact') {
      await loadContactMessages()
    } else if (activeTab.value === 'messages') {
      await loadInteractionMessages()
    } else {
      await loadEventRegistrations()
    }
  } catch (error) {
    ElMessage.error(error.message || '加载运营处理数据失败')
  } finally {
    loading.value = false
  }
}

async function updateContactStatus(item, status) {
  try {
    await ElMessageBox.confirm(`确认将“${item.name}”的联系留言更新为“${getContactStatusLabel(status)}”吗？`, '状态确认', {
      type: status === 'resolved' ? 'success' : 'warning',
    })

    await updateAdminContactMessageStatusApi(item.id, { status })
    ElMessage.success('联系留言状态已更新')
    await Promise.all([loadOverview(), loadContactMessages()])
  } catch (error) {
    if (error !== 'cancel') {
      ElMessage.error(error.message || '更新联系留言状态失败')
    }
  }
}

async function updateMessageStatus(item, status) {
  try {
    await ElMessageBox.confirm(`确认将该留言更新为“${getMessageStatusLabel(status)}”吗？`, '状态确认', {
      type: status === 'visible' ? 'success' : 'warning',
    })

    await updateAdminInteractionMessageStatusApi(item.id, { status })
    ElMessage.success('留言显示状态已更新')
    await Promise.all([loadOverview(), loadInteractionMessages()])
  } catch (error) {
    if (error !== 'cancel') {
      ElMessage.error(error.message || '更新留言状态失败')
    }
  }
}

function openImage(url) {
  if (!url) return
  window.open(url, '_blank', 'noopener,noreferrer')
}

function changePage(page) {
  operationsState[activeTab.value].currentPage = page
  loadCurrentTab()
}

watch(
  () => route.query.tab,
  (value) => {
    if (['contact', 'messages', 'events'].includes(value)) {
      activeTab.value = value
    }
  },
)

watch(activeTab, (value) => {
  operationsState[value].currentPage = 1
  syncQueryTab(value)
  loadCurrentTab()
})

watch(contactStatusFilter, () => {
  operationsState.contact.currentPage = 1
  if (activeTab.value === 'contact') {
    loadCurrentTab()
  }
})

watch(messageStatusFilter, () => {
  operationsState.messages.currentPage = 1
  if (activeTab.value === 'messages') {
    loadCurrentTab()
  }
})

onMounted(async () => {
  try {
    await loadOverview()
    await loadCurrentTab()
  } catch (error) {
    ElMessage.error(error.message || '后台运营页面初始化失败')
  }
})
</script>

<template>
  <div class="operations-page">
    <section class="operations-hero">
      <div>
        <p class="operations-kicker">OPERATIONS DESK</p>
        <h1>运营处理台</h1>
        <p class="operations-desc">
          这里集中处理前台真实产生的联系留言、互动留言和活动报名记录。把这条链路做通之后，用户提交的内容就不再只是“能发出去”，而是真正进入后台工作流。
        </p>
      </div>
      <el-button type="danger" plain :loading="loading" @click="Promise.all([loadOverview(), loadCurrentTab()])">
        刷新当前数据
      </el-button>
    </section>

    <section class="operations-overview">
      <article v-for="item in overviewCards" :key="item.title" class="operations-overview__card">
        <span>{{ item.title }}</span>
        <strong>{{ item.value }}</strong>
        <p>{{ item.hint }}</p>
      </article>
    </section>

    <el-tabs v-model="activeTab" class="operations-tabs">
      <el-tab-pane label="联系留言" name="contact" />
      <el-tab-pane label="留言墙巡检" name="messages" />
      <el-tab-pane label="活动报名" name="events" />
    </el-tabs>

    <section v-if="activeTab === 'contact'" class="operations-panel">
      <div class="operations-panel__toolbar">
        <div>
          <h2>联系留言处理</h2>
          <p>适合用来跟进合作、反馈、学习咨询等来自前台的联系消息。</p>
        </div>
        <el-radio-group v-model="contactStatusFilter">
          <el-radio-button v-for="item in contactStatusOptions" :key="item.value" :value="item.value">
            {{ item.label }}
          </el-radio-button>
        </el-radio-group>
      </div>

      <div class="status-inline">
        <el-tag v-for="item in contactStatusOptions.slice(1)" :key="item.value" effect="plain">
          {{ item.label }}：{{ operationsState.contact.statusSummary[item.value] || 0 }}
        </el-tag>
      </div>

      <el-empty v-if="!operationsState.contact.items.length && !loading" description="当前没有符合条件的联系留言" />

      <div v-else class="operations-grid">
        <article v-for="item in operationsState.contact.items" :key="item.id" class="operations-card">
          <div class="operations-card__top">
            <el-tag :type="getContactTagType(item.status)">{{ getContactStatusLabel(item.status) }}</el-tag>
            <span>{{ formatDate(item.created_at) }}</span>
          </div>
          <h3>{{ item.name }}</h3>
          <div class="operations-card__meta">
            <span>类型：{{ formatContactType(item.type) }}</span>
            <span>联系方式：{{ item.contact_way }}</span>
          </div>
          <p>{{ item.message }}</p>
          <div class="operations-card__actions">
            <el-button v-if="item.status !== 'processing'" plain @click="updateContactStatus(item, 'processing')">
              标记处理中
            </el-button>
            <el-button v-if="item.status !== 'resolved'" type="success" plain @click="updateContactStatus(item, 'resolved')">
              标记已解决
            </el-button>
            <el-button v-if="item.status !== 'archived'" type="info" plain @click="updateContactStatus(item, 'archived')">
              归档
            </el-button>
          </div>
        </article>
      </div>
    </section>

    <section v-if="activeTab === 'messages'" class="operations-panel">
      <div class="operations-panel__toolbar">
        <div>
          <h2>留言墙巡检</h2>
          <p>用于审核互动区的公开留言，及时隐藏不合适的内容，保证前台展示稳定。</p>
        </div>
        <el-radio-group v-model="messageStatusFilter">
          <el-radio-button v-for="item in messageStatusOptions" :key="item.value" :value="item.value">
            {{ item.label }}
          </el-radio-button>
        </el-radio-group>
      </div>

      <div class="status-inline">
        <el-tag effect="plain">前台可见：{{ operationsState.messages.statusSummary.visible || 0 }}</el-tag>
        <el-tag type="info" effect="plain">已隐藏：{{ operationsState.messages.statusSummary.hidden || 0 }}</el-tag>
      </div>

      <el-empty v-if="!operationsState.messages.items.length && !loading" description="当前没有符合条件的留言墙内容" />

      <div v-else class="operations-grid">
        <article v-for="item in operationsState.messages.items" :key="item.id" class="operations-card">
          <div class="operations-card__top">
            <el-tag :type="getMessageTagType(item.status)">{{ getMessageStatusLabel(item.status) }}</el-tag>
            <span>{{ formatDate(item.created_at) }}</span>
          </div>
          <h3>{{ item.display_name || item.author_name || '平台用户' }}</h3>
          <div class="operations-card__meta">
            <span>点赞：{{ item.likes_count || 0 }}</span>
            <span>{{ item.user_id ? `用户ID：${item.user_id}` : '游客或匿名记录' }}</span>
          </div>
          <p>{{ item.content }}</p>
          <div class="operations-card__actions">
            <el-button v-if="item.image_url" plain @click="openImage(item.image_url)">查看配图</el-button>
            <el-button v-if="item.status !== 'visible'" type="success" plain @click="updateMessageStatus(item, 'visible')">
              设为可见
            </el-button>
            <el-button v-if="item.status !== 'hidden'" type="danger" plain @click="updateMessageStatus(item, 'hidden')">
              隐藏
            </el-button>
          </div>
        </article>
      </div>
    </section>

    <section v-if="activeTab === 'events'" class="operations-panel">
      <div class="operations-panel__toolbar">
        <div>
          <h2>活动报名记录</h2>
          <p>当前先提供完整报名记录查看，后续如果需要，可以继续加导出、跟进状态和活动筛选。</p>
        </div>
      </div>

      <el-empty v-if="!operationsState.events.items.length && !loading" description="当前还没有活动报名记录" />

      <div v-else class="operations-grid">
        <article v-for="item in operationsState.events.items" :key="item.id" class="operations-card">
          <div class="operations-card__top">
            <el-tag :type="item.event_status === 'published' ? 'success' : item.event_status === 'closed' ? 'info' : 'warning'">
              {{ item.event_status || 'unknown' }}
            </el-tag>
            <span>{{ formatDate(item.created_at) }}</span>
          </div>
          <h3>{{ item.event_title }}</h3>
          <div class="operations-card__meta">
            <span>报名人：{{ item.user_name }}</span>
            <span>联系电话：{{ item.phone }}</span>
          </div>
          <p>{{ item.note || '报名人没有填写补充说明。' }}</p>
          <div class="operations-card__footer">
            <span>活动时间：{{ item.event_time || '待定' }}</span>
            <span>活动地点：{{ item.location || '待定' }}</span>
          </div>
        </article>
      </div>
    </section>

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
.operations-page {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.operations-hero {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 18px;
  padding: 28px 32px;
  border-radius: 28px;
  background:
    radial-gradient(circle at top right, rgba(245, 158, 11, 0.2), transparent 28%),
    linear-gradient(135deg, #1f2937 0%, #7c2d12 50%, #9a3412 100%);
  color: #fff7ed;
}

.operations-kicker {
  margin: 0;
  font-size: 12px;
  letter-spacing: 1.8px;
  color: rgba(255, 247, 237, 0.74);
}

.operations-hero h1 {
  margin: 10px 0 12px;
  font-size: clamp(30px, 5vw, 44px);
}

.operations-desc {
  max-width: 760px;
  margin: 0;
  line-height: 1.8;
  color: rgba(255, 247, 237, 0.92);
}

.operations-overview {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: 16px;
}

.operations-overview__card,
.operations-card,
.operations-panel {
  border-radius: 24px;
  border: 1px solid #eadfce;
  background: rgba(255, 255, 255, 0.94);
  box-shadow: var(--xhq-shadow-md);
}

.operations-overview__card {
  padding: 20px;
}

.operations-overview__card span,
.operations-card__meta,
.operations-card__top span,
.operations-card__footer {
  color: #8a8178;
  font-size: 13px;
}

.operations-overview__card strong {
  display: block;
  margin-top: 10px;
  color: #111827;
  font-size: 30px;
}

.operations-overview__card p {
  margin: 10px 0 0;
  color: #6b7280;
  line-height: 1.7;
}

.operations-panel {
  padding: 22px;
}

.operations-panel__toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 18px;
  flex-wrap: wrap;
}

.operations-panel__toolbar h2 {
  margin: 0;
  color: #111827;
}

.operations-panel__toolbar p {
  margin: 8px 0 0;
  color: #6b7280;
  line-height: 1.7;
}

.status-inline {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
  margin-top: 16px;
}

.operations-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(320px, 1fr));
  gap: 16px;
  margin-top: 18px;
}

.operations-card {
  display: flex;
  flex-direction: column;
  gap: 14px;
  padding: 20px;
}

.operations-card__top,
.operations-card__actions,
.operations-card__footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  flex-wrap: wrap;
}

.operations-card h3 {
  margin: 0;
  color: #1f2937;
}

.operations-card__meta {
  display: flex;
  gap: 8px 14px;
  flex-wrap: wrap;
}

.operations-card p {
  margin: 0;
  color: #4b5563;
  line-height: 1.75;
}

.pagination-shell {
  display: flex;
  justify-content: center;
  padding-top: 6px;
}

@media (max-width: 960px) {
  .operations-hero,
  .operations-panel__toolbar {
    flex-direction: column;
    align-items: flex-start;
  }
}

@media (max-width: 768px) {
  .operations-hero {
    padding: 24px;
  }

  .operations-panel {
    padding: 18px;
  }

  .operations-grid {
    grid-template-columns: 1fr;
  }
}
</style>
