<script setup>
import { computed, onMounted, reactive, ref, watch } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import {
  createAdminInteractionEventApi,
  getAdminForumPostsApi,
  getAdminForumTopicsApi,
  getAdminInteractionEventsApi,
  updateAdminForumPostVisibilityApi,
  updateAdminForumTopicStatusApi,
  updateAdminInteractionEventApi,
  updateAdminInteractionEventStatusApi,
} from '@/api/admin'
import { getForumSectionsApi } from '@/api/interaction'

const loading = ref(false)
const activeTab = ref('topics')
const sections = ref([])
const eventDialogVisible = ref(false)
const eventSaving = ref(false)
const editingEventId = ref(null)

const topicFilters = reactive({
  status: 'all',
  sectionId: 'all',
  keyword: '',
})

const postFilters = reactive({
  deleted: 'active',
  keyword: '',
})

const eventFilters = reactive({
  status: 'all',
  keyword: '',
})

const topicState = reactive({
  items: [],
  currentPage: 1,
  totalPages: 1,
  total: 0,
  statusSummary: {
    active: 0,
    closed: 0,
    archived: 0,
  },
})

const postState = reactive({
  items: [],
  currentPage: 1,
  totalPages: 1,
  total: 0,
  statusSummary: {
    active: 0,
    deleted: 0,
  },
})

const eventState = reactive({
  items: [],
  currentPage: 1,
  totalPages: 1,
  total: 0,
  statusSummary: {
    draft: 0,
    published: 0,
    closed: 0,
  },
})

const eventForm = reactive({
  title: '',
  description: '',
  event_time: '',
  location: '',
  cover_image: '',
  form_requirements: '',
  status: 'draft',
})

const topicStatusOptions = [
  { label: '全部', value: 'all' },
  { label: '启用中', value: 'active' },
  { label: '已关闭', value: 'closed' },
  { label: '已归档', value: 'archived' },
]

const postStatusOptions = [
  { label: '显示中', value: 'active' },
  { label: '已隐藏', value: 'deleted' },
  { label: '全部', value: 'all' },
]

const eventStatusOptions = [
  { label: '全部', value: 'all' },
  { label: '草稿', value: 'draft' },
  { label: '已发布', value: 'published' },
  { label: '已关闭', value: 'closed' },
]

const currentState = computed(() => {
  if (activeTab.value === 'topics') return topicState
  if (activeTab.value === 'posts') return postState
  return eventState
})

const overviewCards = computed(() => [
  {
    title: '活跃话题',
    value: topicState.statusSummary.active,
    hint: `关闭 ${topicState.statusSummary.closed}，归档 ${topicState.statusSummary.archived}`,
  },
  {
    title: '可见帖子',
    value: postState.statusSummary.active,
    hint: `已隐藏 ${postState.statusSummary.deleted}，适合做内容巡检`,
  },
  {
    title: '公开活动',
    value: eventState.statusSummary.published,
    hint: `草稿 ${eventState.statusSummary.draft}，已关闭 ${eventState.statusSummary.closed}`,
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

function shortText(value, max = 120) {
  if (!value) return '暂无内容'
  return value.length > max ? `${value.slice(0, max)}...` : value
}

function openAsset(url) {
  if (!url) return
  window.open(url, '_blank', 'noopener,noreferrer')
}

function getTopicStatusLabel(status) {
  return {
    active: '启用中',
    closed: '已关闭',
    archived: '已归档',
  }[status] || status
}

function getTopicStatusType(status) {
  return {
    active: 'success',
    closed: 'warning',
    archived: 'info',
  }[status] || 'info'
}

function getEventStatusLabel(status) {
  return {
    draft: '草稿',
    published: '已发布',
    closed: '已关闭',
  }[status] || status
}

function getEventStatusType(status) {
  return {
    draft: 'info',
    published: 'success',
    closed: 'warning',
  }[status] || 'info'
}

function resetEventForm() {
  editingEventId.value = null
  eventForm.title = ''
  eventForm.description = ''
  eventForm.event_time = ''
  eventForm.location = ''
  eventForm.cover_image = ''
  eventForm.form_requirements = ''
  eventForm.status = 'draft'
}

function openCreateEventDialog() {
  resetEventForm()
  eventDialogVisible.value = true
}

function openEditEventDialog(item) {
  editingEventId.value = item.id
  eventForm.title = item.title || ''
  eventForm.description = item.description || ''
  eventForm.event_time = item.event_time || ''
  eventForm.location = item.location || ''
  eventForm.cover_image = item.cover_image || ''
  eventForm.form_requirements = item.form_requirements || ''
  eventForm.status = item.status || 'draft'
  eventDialogVisible.value = true
}

async function loadSections() {
  const result = await getForumSectionsApi()
  sections.value = result.data || []
}

async function loadTopics() {
  const result = await getAdminForumTopicsApi({
    status: topicFilters.status,
    sectionId: topicFilters.sectionId === 'all' ? '' : topicFilters.sectionId,
    keyword: topicFilters.keyword.trim(),
    page: topicState.currentPage,
    limit: 8,
  })

  topicState.items = result.data?.items || []
  topicState.currentPage = result.data?.currentPage || 1
  topicState.totalPages = result.data?.totalPages || 1
  topicState.total = result.data?.total || 0
  topicState.statusSummary = result.data?.statusSummary || topicState.statusSummary
}

async function loadPosts() {
  const result = await getAdminForumPostsApi({
    deleted: postFilters.deleted,
    keyword: postFilters.keyword.trim(),
    page: postState.currentPage,
    limit: 8,
  })

  postState.items = result.data?.items || []
  postState.currentPage = result.data?.currentPage || 1
  postState.totalPages = result.data?.totalPages || 1
  postState.total = result.data?.total || 0
  postState.statusSummary = result.data?.statusSummary || postState.statusSummary
}

async function loadEvents() {
  const result = await getAdminInteractionEventsApi({
    status: eventFilters.status,
    keyword: eventFilters.keyword.trim(),
    page: eventState.currentPage,
    limit: 8,
  })

  eventState.items = result.data?.items || []
  eventState.currentPage = result.data?.currentPage || 1
  eventState.totalPages = result.data?.totalPages || 1
  eventState.total = result.data?.total || 0
  eventState.statusSummary = result.data?.statusSummary || eventState.statusSummary
}

async function loadCurrentTab() {
  loading.value = true

  try {
    if (activeTab.value === 'topics') {
      await loadTopics()
    } else if (activeTab.value === 'posts') {
      await loadPosts()
    } else {
      await loadEvents()
    }
  } catch (error) {
    ElMessage.error(error.message || '加载互动管理数据失败')
  } finally {
    loading.value = false
  }
}

async function refreshAll() {
  try {
    await Promise.all([loadTopics(), loadPosts(), loadEvents()])
  } catch (error) {
    ElMessage.error(error.message || '刷新互动管理数据失败')
  }
}

async function updateTopicStatus(item, status) {
  try {
    await ElMessageBox.confirm(`确认将话题“${item.title}”更新为“${getTopicStatusLabel(status)}”吗？`, '状态确认', {
      type: status === 'active' ? 'success' : 'warning',
    })

    await updateAdminForumTopicStatusApi(item.id, { status })
    ElMessage.success('话题状态已更新')
    await refreshAll()
  } catch (error) {
    if (error !== 'cancel') {
      ElMessage.error(error.message || '更新话题状态失败')
    }
  }
}

async function updatePostVisibility(item, isDeleted) {
  try {
    await ElMessageBox.confirm(
      isDeleted ? `确认隐藏帖子“${item.title || item.topic_title}”吗？` : `确认恢复帖子“${item.title || item.topic_title}”吗？`,
      '状态确认',
      { type: isDeleted ? 'warning' : 'success' },
    )

    await updateAdminForumPostVisibilityApi(item.id, { is_deleted: isDeleted })
    ElMessage.success(isDeleted ? '帖子已隐藏' : '帖子已恢复')
    await refreshAll()
  } catch (error) {
    if (error !== 'cancel') {
      ElMessage.error(error.message || '更新帖子状态失败')
    }
  }
}

async function submitEvent() {
  if (!eventForm.title.trim()) {
    ElMessage.warning('请填写活动标题')
    return
  }

  eventSaving.value = true

  try {
    const payload = {
      title: eventForm.title.trim(),
      description: eventForm.description.trim(),
      event_time: eventForm.event_time.trim(),
      location: eventForm.location.trim(),
      cover_image: eventForm.cover_image.trim(),
      form_requirements: eventForm.form_requirements.trim(),
      status: eventForm.status,
    }

    if (editingEventId.value) {
      await updateAdminInteractionEventApi(editingEventId.value, payload)
      ElMessage.success('活动已更新')
    } else {
      await createAdminInteractionEventApi(payload)
      ElMessage.success('活动已创建')
    }

    eventDialogVisible.value = false
    resetEventForm()
    await refreshAll()
  } catch (error) {
    ElMessage.error(error.message || '保存活动失败')
  } finally {
    eventSaving.value = false
  }
}

async function updateEventStatus(item, status) {
  try {
    await ElMessageBox.confirm(`确认将活动“${item.title}”更新为“${getEventStatusLabel(status)}”吗？`, '状态确认', {
      type: status === 'published' ? 'success' : 'warning',
    })

    await updateAdminInteractionEventStatusApi(item.id, { status })
    ElMessage.success('活动状态已更新')
    await refreshAll()
  } catch (error) {
    if (error !== 'cancel') {
      ElMessage.error(error.message || '更新活动状态失败')
    }
  }
}

function changePage(page) {
  currentState.value.currentPage = page
  loadCurrentTab()
}

watch(activeTab, (value) => {
  currentState.value.currentPage = 1
  loadCurrentTab()
})

watch(
  () => [topicFilters.status, topicFilters.sectionId],
  () => {
    topicState.currentPage = 1
    if (activeTab.value === 'topics') loadCurrentTab()
  },
)

watch(
  () => postFilters.deleted,
  () => {
    postState.currentPage = 1
    if (activeTab.value === 'posts') loadCurrentTab()
  },
)

watch(
  () => eventFilters.status,
  () => {
    eventState.currentPage = 1
    if (activeTab.value === 'events') loadCurrentTab()
  },
)

onMounted(async () => {
  try {
    await loadSections()
    await refreshAll()
  } catch (error) {
    ElMessage.error(error.message || '初始化互动管理失败')
  }
})
</script>

<template>
  <div class="interaction-admin">
    <section class="interaction-admin__hero">
      <div>
        <p class="interaction-admin__kicker">INTERACTION CONTROL</p>
        <h1>互动管理台</h1>
        <p class="interaction-admin__desc">
          这里统一管理论坛话题、论坛帖子和活动发布。把互动区的内容治理做好之后，前台社区和活动模块才能稳定地进入云端运行。
        </p>
      </div>
      <div class="interaction-admin__hero-actions">
        <el-button plain :loading="loading" @click="refreshAll">刷新全部</el-button>
        <el-button type="danger" @click="openCreateEventDialog">新建活动</el-button>
      </div>
    </section>

    <section class="interaction-admin__overview">
      <article v-for="item in overviewCards" :key="item.title" class="overview-card">
        <span>{{ item.title }}</span>
        <strong>{{ item.value }}</strong>
        <p>{{ item.hint }}</p>
      </article>
    </section>

    <el-tabs v-model="activeTab">
      <el-tab-pane label="论坛话题" name="topics">
        <section class="panel-card">
          <div class="panel-card__toolbar">
            <div>
              <h2>论坛话题管理</h2>
              <p>管理员可以关闭、重新启用或归档话题，控制前台讨论范围。</p>
            </div>
            <div class="filters">
              <el-input
                v-model="topicFilters.keyword"
                placeholder="搜索话题标题或内容"
                clearable
                style="width: 240px"
                @keyup.enter="topicState.currentPage = 1; loadTopics()"
              />
              <el-select v-model="topicFilters.sectionId" style="width: 160px">
                <el-option label="全部分区" value="all" />
                <el-option v-for="item in sections" :key="item.id" :label="item.name" :value="item.id" />
              </el-select>
              <el-select v-model="topicFilters.status" style="width: 140px">
                <el-option v-for="item in topicStatusOptions" :key="item.value" :label="item.label" :value="item.value" />
              </el-select>
              <el-button type="danger" @click="topicState.currentPage = 1; loadTopics()">搜索</el-button>
            </div>
          </div>

          <div class="summary-tags">
            <el-tag effect="plain">启用中：{{ topicState.statusSummary.active || 0 }}</el-tag>
            <el-tag type="warning" effect="plain">已关闭：{{ topicState.statusSummary.closed || 0 }}</el-tag>
            <el-tag type="info" effect="plain">已归档：{{ topicState.statusSummary.archived || 0 }}</el-tag>
          </div>

          <el-empty v-if="!topicState.items.length && !loading" description="当前没有符合条件的话题" />

          <div v-else class="content-grid">
            <article v-for="item in topicState.items" :key="item.id" class="content-card">
              <div class="content-card__top">
                <div class="content-card__tags">
                  <el-tag effect="plain">{{ item.section_name }}</el-tag>
                  <el-tag :type="getTopicStatusType(item.status)">{{ getTopicStatusLabel(item.status) }}</el-tag>
                </div>
                <span>{{ formatDate(item.created_at) }}</span>
              </div>
              <h3>{{ item.title }}</h3>
              <p>{{ shortText(item.content) }}</p>
              <div class="content-card__meta">
                <span>作者：{{ item.author_name }}</span>
                <span>回复：{{ item.replies_count || 0 }}</span>
                <span>浏览：{{ item.views_count || 0 }}</span>
              </div>
              <div class="content-card__actions">
                <el-button v-if="item.status !== 'active'" type="success" plain @click="updateTopicStatus(item, 'active')">
                  重新启用
                </el-button>
                <el-button v-if="item.status !== 'closed'" type="warning" plain @click="updateTopicStatus(item, 'closed')">
                  关闭话题
                </el-button>
                <el-button v-if="item.status !== 'archived'" type="info" plain @click="updateTopicStatus(item, 'archived')">
                  归档
                </el-button>
              </div>
            </article>
          </div>
        </section>
      </el-tab-pane>

      <el-tab-pane label="论坛帖子" name="posts">
        <section class="panel-card">
          <div class="panel-card__toolbar">
            <div>
              <h2>论坛帖子巡检</h2>
              <p>用于隐藏不合适的回帖内容，也支持恢复误隐藏的帖子。</p>
            </div>
            <div class="filters">
              <el-input
                v-model="postFilters.keyword"
                placeholder="搜索帖子或所属话题"
                clearable
                style="width: 240px"
                @keyup.enter="postState.currentPage = 1; loadPosts()"
              />
              <el-select v-model="postFilters.deleted" style="width: 140px">
                <el-option v-for="item in postStatusOptions" :key="item.value" :label="item.label" :value="item.value" />
              </el-select>
              <el-button type="danger" @click="postState.currentPage = 1; loadPosts()">搜索</el-button>
            </div>
          </div>

          <div class="summary-tags">
            <el-tag effect="plain">显示中：{{ postState.statusSummary.active || 0 }}</el-tag>
            <el-tag type="info" effect="plain">已隐藏：{{ postState.statusSummary.deleted || 0 }}</el-tag>
          </div>

          <el-empty v-if="!postState.items.length && !loading" description="当前没有符合条件的帖子" />

          <div v-else class="content-grid">
            <article v-for="item in postState.items" :key="item.id" class="content-card">
              <div class="content-card__top">
                <div class="content-card__tags">
                  <el-tag effect="plain">{{ item.is_deleted ? '已隐藏' : '显示中' }}</el-tag>
                  <el-tag type="warning" effect="plain">{{ item.topic_title }}</el-tag>
                </div>
                <span>{{ formatDate(item.created_at) }}</span>
              </div>
              <h3>{{ item.title || '无标题帖子' }}</h3>
              <p>{{ shortText(item.content) }}</p>
              <div class="content-card__meta">
                <span>作者：{{ item.author_name }}</span>
                <span>评论：{{ item.comments_count || 0 }}</span>
                <span>点赞：{{ item.likes_count || 0 }}</span>
              </div>
              <div class="content-card__actions">
                <el-button v-if="item.image_url" plain @click="openAsset(item.image_url)">
                  查看配图
                </el-button>
                <el-button
                  v-if="item.is_deleted"
                  type="success"
                  plain
                  @click="updatePostVisibility(item, false)"
                >
                  恢复显示
                </el-button>
                <el-button
                  v-else
                  type="danger"
                  plain
                  @click="updatePostVisibility(item, true)"
                >
                  隐藏帖子
                </el-button>
              </div>
            </article>
          </div>
        </section>
      </el-tab-pane>

      <el-tab-pane label="互动活动" name="events">
        <section class="panel-card">
          <div class="panel-card__toolbar">
            <div>
              <h2>互动活动管理</h2>
              <p>管理员可以创建活动、编辑活动，并控制活动是草稿、发布还是关闭状态。</p>
            </div>
            <div class="filters">
              <el-input
                v-model="eventFilters.keyword"
                placeholder="搜索活动标题或地点"
                clearable
                style="width: 240px"
                @keyup.enter="eventState.currentPage = 1; loadEvents()"
              />
              <el-select v-model="eventFilters.status" style="width: 140px">
                <el-option v-for="item in eventStatusOptions" :key="item.value" :label="item.label" :value="item.value" />
              </el-select>
              <el-button type="danger" @click="eventState.currentPage = 1; loadEvents()">搜索</el-button>
            </div>
          </div>

          <div class="summary-tags">
            <el-tag effect="plain">草稿：{{ eventState.statusSummary.draft || 0 }}</el-tag>
            <el-tag type="success" effect="plain">已发布：{{ eventState.statusSummary.published || 0 }}</el-tag>
            <el-tag type="warning" effect="plain">已关闭：{{ eventState.statusSummary.closed || 0 }}</el-tag>
          </div>

          <el-empty v-if="!eventState.items.length && !loading" description="当前没有符合条件的活动" />

          <div v-else class="content-grid">
            <article v-for="item in eventState.items" :key="item.id" class="content-card">
              <div class="content-card__top">
                <div class="content-card__tags">
                  <el-tag :type="getEventStatusType(item.status)">{{ getEventStatusLabel(item.status) }}</el-tag>
                </div>
                <span>{{ formatDate(item.created_at) }}</span>
              </div>
              <h3>{{ item.title }}</h3>
              <p>{{ shortText(item.description || item.form_requirements) }}</p>
              <div class="content-card__meta">
                <span>时间：{{ item.event_time || '待定' }}</span>
                <span>地点：{{ item.location || '待定' }}</span>
                <span>报名：{{ item.registration_count || 0 }}</span>
              </div>
              <div class="content-card__actions">
                <el-button plain @click="openEditEventDialog(item)">编辑活动</el-button>
                <el-button v-if="item.status !== 'published'" type="success" plain @click="updateEventStatus(item, 'published')">
                  发布
                </el-button>
                <el-button v-if="item.status !== 'draft'" type="info" plain @click="updateEventStatus(item, 'draft')">
                  设为草稿
                </el-button>
                <el-button v-if="item.status !== 'closed'" type="warning" plain @click="updateEventStatus(item, 'closed')">
                  关闭活动
                </el-button>
              </div>
            </article>
          </div>
        </section>
      </el-tab-pane>
    </el-tabs>

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

    <el-dialog
      v-model="eventDialogVisible"
      :title="editingEventId ? '编辑互动活动' : '新建互动活动'"
      width="620px"
    >
      <el-form label-position="top">
        <el-form-item label="活动标题">
          <el-input v-model="eventForm.title" maxlength="100" show-word-limit />
        </el-form-item>
        <el-form-item label="活动简介">
          <el-input v-model="eventForm.description" type="textarea" :rows="4" maxlength="1000" show-word-limit />
        </el-form-item>
        <el-form-item label="活动时间">
          <el-input v-model="eventForm.event_time" placeholder="例如：2026-05-01 14:00" />
        </el-form-item>
        <el-form-item label="活动地点">
          <el-input v-model="eventForm.location" />
        </el-form-item>
        <el-form-item label="封面地址">
          <el-input v-model="eventForm.cover_image" placeholder="可填写图片 URL 或后续上传地址" />
        </el-form-item>
        <el-form-item label="报名要求">
          <el-input
            v-model="eventForm.form_requirements"
            type="textarea"
            :rows="4"
            maxlength="1000"
            show-word-limit
          />
        </el-form-item>
        <el-form-item label="活动状态">
          <el-select v-model="eventForm.status" style="width: 100%">
            <el-option label="草稿" value="draft" />
            <el-option label="已发布" value="published" />
            <el-option label="已关闭" value="closed" />
          </el-select>
        </el-form-item>
      </el-form>

      <template #footer>
        <el-button @click="eventDialogVisible = false">取消</el-button>
        <el-button type="danger" :loading="eventSaving" @click="submitEvent">保存活动</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<style scoped lang="scss">
.interaction-admin {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.interaction-admin__hero {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 18px;
  padding: 28px 32px;
  border-radius: 28px;
  background:
    radial-gradient(circle at top right, rgba(96, 165, 250, 0.2), transparent 28%),
    linear-gradient(135deg, #111827 0%, #1d4ed8 45%, #7c2d12 100%);
  color: #eff6ff;
}

.interaction-admin__hero-actions {
  display: flex;
  gap: 12px;
  flex-wrap: wrap;
}

.interaction-admin__kicker {
  margin: 0;
  font-size: 12px;
  letter-spacing: 1.8px;
  color: rgba(239, 246, 255, 0.78);
}

.interaction-admin__hero h1 {
  margin: 10px 0 12px;
  font-size: clamp(30px, 5vw, 44px);
}

.interaction-admin__desc {
  max-width: 760px;
  margin: 0;
  line-height: 1.8;
  color: rgba(239, 246, 255, 0.92);
}

.interaction-admin__overview {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: 16px;
}

.overview-card,
.panel-card,
.content-card {
  border-radius: 24px;
  border: 1px solid #eadfce;
  background: rgba(255, 255, 255, 0.94);
  box-shadow: var(--xhq-shadow-md);
}

.overview-card {
  padding: 20px;
}

.overview-card span,
.content-card__meta,
.content-card__top span {
  color: #8a8178;
  font-size: 13px;
}

.overview-card strong {
  display: block;
  margin-top: 10px;
  color: #111827;
  font-size: 30px;
}

.overview-card p {
  margin: 10px 0 0;
  color: #6b7280;
  line-height: 1.7;
}

.panel-card {
  padding: 22px;
}

.panel-card__toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 18px;
  flex-wrap: wrap;
}

.panel-card__toolbar h2,
.content-card h3 {
  margin: 0;
  color: #111827;
}

.panel-card__toolbar p {
  margin: 8px 0 0;
  color: #6b7280;
  line-height: 1.7;
}

.filters,
.summary-tags,
.content-card__tags,
.content-card__actions {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
}

.summary-tags {
  margin-top: 16px;
}

.content-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(340px, 1fr));
  gap: 16px;
  margin-top: 18px;
}

.content-card {
  display: flex;
  flex-direction: column;
  gap: 14px;
  padding: 20px;
}

.content-card__top {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
}

.content-card p {
  margin: 0;
  color: #4b5563;
  line-height: 1.75;
}

.content-card__meta {
  display: flex;
  gap: 8px 14px;
  flex-wrap: wrap;
}

.pagination-shell {
  display: flex;
  justify-content: center;
  padding-top: 6px;
}

@media (max-width: 960px) {
  .interaction-admin__hero,
  .panel-card__toolbar {
    flex-direction: column;
    align-items: flex-start;
  }
}

@media (max-width: 768px) {
  .interaction-admin__hero {
    padding: 24px;
  }

  .panel-card {
    padding: 18px;
  }

  .content-grid {
    grid-template-columns: 1fr;
  }
}
</style>
