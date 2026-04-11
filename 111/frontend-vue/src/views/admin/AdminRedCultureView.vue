<script setup>
import { computed, onMounted, reactive, ref } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import {
  createAdminRedCultureQuoteApi,
  createAdminRedCultureStoryApi,
  createAdminRedCultureTimelineApi,
  deleteAdminRedCultureQuoteApi,
  deleteAdminRedCultureStoryApi,
  deleteAdminRedCultureTimelineApi,
  getAdminRedCultureQuotesApi,
  getAdminRedCultureStoriesApi,
  getAdminRedCultureTimelinesApi,
  updateAdminRedCultureQuoteApi,
  updateAdminRedCultureStoryApi,
  updateAdminRedCultureTimelineApi,
} from '@/api/adminContent'

const loading = ref(false)
const saving = ref(false)
const activeTab = ref('stories')
const dialogVisible = ref(false)
const dialogType = ref('stories')
const editingId = ref(null)

const stories = ref([])
const timelines = ref([])
const quotes = ref([])

const storyForm = reactive({
  title: '',
  description: '',
  author: '',
  year: null,
  location: '',
  image_url: '',
  status: 'draft',
})

const timelineForm = reactive({
  year: null,
  event_name: '',
  title: '',
  description: '',
  image_url: '',
  importance: 'medium',
  status: 'draft',
})

const quoteForm = reactive({
  author_name: '',
  quote: '',
  avatar_url: '',
  importance: 'medium',
  status: 'draft',
})

const overviewCards = computed(() => [
  {
    title: '故事内容',
    value: stories.value.length,
    hint: `已发布 ${stories.value.filter((item) => item.status === 'published').length} 条`,
  },
  {
    title: '时间线节点',
    value: timelines.value.length,
    hint: `已发布 ${timelines.value.filter((item) => item.status === 'published').length} 条`,
  },
  {
    title: '精神语录',
    value: quotes.value.length,
    hint: `已发布 ${quotes.value.filter((item) => item.status === 'published').length} 条`,
  },
])

function formatDate(value) {
  if (!value) return '暂未发布'

  return new Date(value).toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function getStatusLabel(status) {
  return {
    draft: '草稿',
    pending_review: '待审核',
    published: '已发布',
    archived: '已归档',
  }[status] || status
}

function getStatusType(status) {
  return {
    draft: 'info',
    pending_review: 'warning',
    published: 'success',
    archived: '',
  }[status] || 'info'
}

function getImportanceLabel(value) {
  return {
    low: '低',
    medium: '中',
    high: '高',
  }[value] || value
}

function resetStoryForm() {
  storyForm.title = ''
  storyForm.description = ''
  storyForm.author = ''
  storyForm.year = null
  storyForm.location = ''
  storyForm.image_url = ''
  storyForm.status = 'draft'
}

function resetTimelineForm() {
  timelineForm.year = null
  timelineForm.event_name = ''
  timelineForm.title = ''
  timelineForm.description = ''
  timelineForm.image_url = ''
  timelineForm.importance = 'medium'
  timelineForm.status = 'draft'
}

function resetQuoteForm() {
  quoteForm.author_name = ''
  quoteForm.quote = ''
  quoteForm.avatar_url = ''
  quoteForm.importance = 'medium'
  quoteForm.status = 'draft'
}

function resetCurrentForm(type) {
  if (type === 'stories') resetStoryForm()
  if (type === 'timelines') resetTimelineForm()
  if (type === 'quotes') resetQuoteForm()
}

function openCreateDialog(type = activeTab.value) {
  dialogType.value = type
  editingId.value = null
  resetCurrentForm(type)
  dialogVisible.value = true
}

function openEditDialog(type, item) {
  dialogType.value = type
  editingId.value = item.id

  if (type === 'stories') {
    storyForm.title = item.title || ''
    storyForm.description = item.description || ''
    storyForm.author = item.author || ''
    storyForm.year = item.year || null
    storyForm.location = item.location || ''
    storyForm.image_url = item.image_url || ''
    storyForm.status = item.status || 'draft'
  }

  if (type === 'timelines') {
    timelineForm.year = item.year || null
    timelineForm.event_name = item.event_name || ''
    timelineForm.title = item.title || ''
    timelineForm.description = item.description || ''
    timelineForm.image_url = item.image_url || ''
    timelineForm.importance = item.importance || 'medium'
    timelineForm.status = item.status || 'draft'
  }

  if (type === 'quotes') {
    quoteForm.author_name = item.author_name || ''
    quoteForm.quote = item.quote || ''
    quoteForm.avatar_url = item.avatar_url || ''
    quoteForm.importance = item.importance || 'medium'
    quoteForm.status = item.status || 'draft'
  }

  dialogVisible.value = true
}

async function loadData() {
  loading.value = true

  try {
    const [storyResult, timelineResult, quoteResult] = await Promise.all([
      getAdminRedCultureStoriesApi(),
      getAdminRedCultureTimelinesApi(),
      getAdminRedCultureQuotesApi(),
    ])

    stories.value = storyResult.data || []
    timelines.value = timelineResult.data || []
    quotes.value = quoteResult.data || []
  } catch (error) {
    ElMessage.error(error.message || '加载红旗文化管理数据失败')
  } finally {
    loading.value = false
  }
}

async function submitDialog() {
  saving.value = true

  try {
    if (dialogType.value === 'stories') {
      const payload = { ...storyForm }

      if (editingId.value) {
        await updateAdminRedCultureStoryApi(editingId.value, payload)
      } else {
        await createAdminRedCultureStoryApi(payload)
      }
    }

    if (dialogType.value === 'timelines') {
      const payload = { ...timelineForm }

      if (editingId.value) {
        await updateAdminRedCultureTimelineApi(editingId.value, payload)
      } else {
        await createAdminRedCultureTimelineApi(payload)
      }
    }

    if (dialogType.value === 'quotes') {
      const payload = { ...quoteForm }

      if (editingId.value) {
        await updateAdminRedCultureQuoteApi(editingId.value, payload)
      } else {
        await createAdminRedCultureQuoteApi(payload)
      }
    }

    ElMessage.success(editingId.value ? '保存成功' : '创建成功')
    dialogVisible.value = false
    await loadData()
  } catch (error) {
    ElMessage.error(error.message || '保存内容失败')
  } finally {
    saving.value = false
  }
}

async function removeItem(type, item) {
  try {
    await ElMessageBox.confirm(`确认删除“${item.title || item.author_name}”吗？`, '删除确认', {
      type: 'warning',
    })

    if (type === 'stories') {
      await deleteAdminRedCultureStoryApi(item.id)
    }

    if (type === 'timelines') {
      await deleteAdminRedCultureTimelineApi(item.id)
    }

    if (type === 'quotes') {
      await deleteAdminRedCultureQuoteApi(item.id)
    }

    ElMessage.success('删除成功')
    await loadData()
  } catch (error) {
    if (error !== 'cancel') {
      ElMessage.error(error.message || '删除内容失败')
    }
  }
}

const dialogTitle = computed(() => {
  const prefix = editingId.value ? 'Edit' : 'Create'
  return {
    stories: `${prefix === 'Edit' ? '编辑' : '新建'}故事`,
    timelines: `${prefix === 'Edit' ? '编辑' : '新建'}时间线`,
    quotes: `${prefix === 'Edit' ? '编辑' : '新建'}语录`,
  }[dialogType.value]
})

onMounted(() => {
  loadData()
})
</script>

<template>
  <div class="content-page">
    <section class="content-hero content-hero--red">
      <div>
        <p class="content-kicker">RED CULTURE STUDIO</p>
        <h1>红旗文化管理</h1>
        <p class="content-desc">
          这里统一管理红旗文化的故事内容、发展时间线和精神语录。录入完成后，前台红旗文化页就可以从
          “有结构没内容”切到“有正式运营内容”的状态。
        </p>
      </div>
      <div class="content-hero__actions">
        <el-button plain :loading="loading" @click="loadData">刷新</el-button>
        <el-button type="danger" @click="openCreateDialog()">新建当前内容</el-button>
      </div>
    </section>

    <section class="content-overview">
      <article v-for="item in overviewCards" :key="item.title" class="overview-card">
        <span>{{ item.title }}</span>
        <strong>{{ item.value }}</strong>
        <p>{{ item.hint }}</p>
      </article>
    </section>

    <el-tabs v-model="activeTab">
      <el-tab-pane label="故事内容" name="stories">
        <section class="panel-card">
          <div class="panel-card__toolbar">
            <div>
              <h2>故事展陈</h2>
              <p>管理故事标题、作者、地点与发布状态。</p>
            </div>
            <el-button type="danger" @click="openCreateDialog('stories')">新建故事</el-button>
          </div>

          <el-empty v-if="!stories.length && !loading" description="当前还没有故事内容" />

          <div v-else class="content-grid">
            <article v-for="item in stories" :key="item.id" class="content-card">
              <div class="content-card__top">
                <div class="content-card__tags">
                  <el-tag :type="getStatusType(item.status)">{{ getStatusLabel(item.status) }}</el-tag>
                  <el-tag effect="plain">{{ item.year || '年份待补充' }}</el-tag>
                </div>
                <span>{{ formatDate(item.published_at || item.created_at) }}</span>
              </div>
              <h3>{{ item.title }}</h3>
              <p>{{ item.description }}</p>
              <div class="content-card__meta">
                <span>作者：{{ item.author || '未填写' }}</span>
                <span>地点：{{ item.location || '待补充' }}</span>
              </div>
              <div class="content-card__actions">
                <el-button plain @click="openEditDialog('stories', item)">编辑</el-button>
                <el-button type="danger" plain @click="removeItem('stories', item)">删除</el-button>
              </div>
            </article>
          </div>
        </section>
      </el-tab-pane>

      <el-tab-pane label="时间线" name="timelines">
        <section class="panel-card">
          <div class="panel-card__toolbar">
            <div>
              <h2>发展时间线</h2>
              <p>维护年份节点、事件名称和内容重要程度。</p>
            </div>
            <el-button type="danger" @click="openCreateDialog('timelines')">新建时间线节点</el-button>
          </div>

          <el-empty v-if="!timelines.length && !loading" description="当前还没有时间线节点" />

          <div v-else class="content-grid">
            <article v-for="item in timelines" :key="item.id" class="content-card">
              <div class="content-card__top">
                <div class="content-card__tags">
                  <el-tag :type="getStatusType(item.status)">{{ getStatusLabel(item.status) }}</el-tag>
                  <el-tag type="warning" effect="plain">{{ getImportanceLabel(item.importance) }}</el-tag>
                </div>
                <span>{{ item.year || '年份待补充' }}</span>
              </div>
              <h3>{{ item.title }}</h3>
              <p>{{ item.description }}</p>
              <div class="content-card__meta">
                <span>事件：{{ item.event_name || '历史节点' }}</span>
                <span>{{ formatDate(item.updated_at || item.created_at) }}</span>
              </div>
              <div class="content-card__actions">
                <el-button plain @click="openEditDialog('timelines', item)">编辑</el-button>
                <el-button type="danger" plain @click="removeItem('timelines', item)">删除</el-button>
              </div>
            </article>
          </div>
        </section>
      </el-tab-pane>

      <el-tab-pane label="精神语录" name="quotes">
        <section class="panel-card">
          <div class="panel-card__toolbar">
            <div>
              <h2>精神语录</h2>
              <p>管理语录卡片内容，并控制前台展示状态。</p>
            </div>
            <el-button type="danger" @click="openCreateDialog('quotes')">新建语录</el-button>
          </div>

          <el-empty v-if="!quotes.length && !loading" description="当前还没有精神语录" />

          <div v-else class="content-grid">
            <article v-for="item in quotes" :key="item.id" class="content-card">
              <div class="content-card__top">
                <div class="content-card__tags">
                  <el-tag :type="getStatusType(item.status)">{{ getStatusLabel(item.status) }}</el-tag>
                  <el-tag type="warning" effect="plain">{{ getImportanceLabel(item.importance) }}</el-tag>
                </div>
                <span>{{ formatDate(item.updated_at || item.created_at) }}</span>
              </div>
              <h3>{{ item.author_name }}</h3>
              <p>{{ item.quote }}</p>
              <div class="content-card__actions">
                <el-button plain @click="openEditDialog('quotes', item)">编辑</el-button>
                <el-button type="danger" plain @click="removeItem('quotes', item)">删除</el-button>
              </div>
            </article>
          </div>
        </section>
      </el-tab-pane>
    </el-tabs>

    <el-dialog v-model="dialogVisible" :title="dialogTitle" width="720px">
      <el-form v-if="dialogType === 'stories'" label-position="top">
        <el-form-item label="标题">
          <el-input v-model="storyForm.title" maxlength="120" show-word-limit />
        </el-form-item>
        <el-form-item label="内容简介">
          <el-input v-model="storyForm.description" type="textarea" :rows="5" />
        </el-form-item>
        <div class="form-grid">
          <el-form-item label="作者">
            <el-input v-model="storyForm.author" />
          </el-form-item>
          <el-form-item label="年份">
            <el-input-number v-model="storyForm.year" :min="1900" :max="2100" style="width: 100%" />
          </el-form-item>
        </div>
        <div class="form-grid">
          <el-form-item label="地点">
            <el-input v-model="storyForm.location" />
          </el-form-item>
          <el-form-item label="状态">
            <el-select v-model="storyForm.status" style="width: 100%">
              <el-option label="草稿" value="draft" />
              <el-option label="待审核" value="pending_review" />
              <el-option label="已发布" value="published" />
              <el-option label="已归档" value="archived" />
            </el-select>
          </el-form-item>
        </div>
        <el-form-item label="图片地址">
          <el-input v-model="storyForm.image_url" placeholder="/uploads/example.jpg 或外部图片地址" />
        </el-form-item>
      </el-form>

      <el-form v-else-if="dialogType === 'timelines'" label-position="top">
        <div class="form-grid">
          <el-form-item label="年份">
            <el-input-number v-model="timelineForm.year" :min="1900" :max="2100" style="width: 100%" />
          </el-form-item>
          <el-form-item label="事件名称">
            <el-input v-model="timelineForm.event_name" />
          </el-form-item>
        </div>
        <el-form-item label="标题">
          <el-input v-model="timelineForm.title" maxlength="120" show-word-limit />
        </el-form-item>
        <el-form-item label="内容说明">
          <el-input v-model="timelineForm.description" type="textarea" :rows="5" />
        </el-form-item>
        <div class="form-grid">
          <el-form-item label="重要程度">
            <el-select v-model="timelineForm.importance" style="width: 100%">
              <el-option label="低" value="low" />
              <el-option label="中" value="medium" />
              <el-option label="高" value="high" />
            </el-select>
          </el-form-item>
          <el-form-item label="状态">
            <el-select v-model="timelineForm.status" style="width: 100%">
              <el-option label="草稿" value="draft" />
              <el-option label="已发布" value="published" />
              <el-option label="已归档" value="archived" />
            </el-select>
          </el-form-item>
        </div>
        <el-form-item label="图片地址">
          <el-input v-model="timelineForm.image_url" placeholder="/uploads/example.jpg 或外部图片地址" />
        </el-form-item>
      </el-form>

      <el-form v-else label-position="top">
        <el-form-item label="作者名称">
          <el-input v-model="quoteForm.author_name" maxlength="80" show-word-limit />
        </el-form-item>
        <el-form-item label="语录内容">
          <el-input v-model="quoteForm.quote" type="textarea" :rows="5" />
        </el-form-item>
        <div class="form-grid">
          <el-form-item label="重要程度">
            <el-select v-model="quoteForm.importance" style="width: 100%">
              <el-option label="低" value="low" />
              <el-option label="中" value="medium" />
              <el-option label="高" value="high" />
            </el-select>
          </el-form-item>
          <el-form-item label="状态">
            <el-select v-model="quoteForm.status" style="width: 100%">
              <el-option label="草稿" value="draft" />
              <el-option label="已发布" value="published" />
              <el-option label="已归档" value="archived" />
            </el-select>
          </el-form-item>
        </div>
        <el-form-item label="头像地址">
          <el-input v-model="quoteForm.avatar_url" placeholder="/uploads/example.jpg 或外部图片地址" />
        </el-form-item>
      </el-form>

      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="danger" :loading="saving" @click="submitDialog">保存</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<style scoped lang="scss">
.content-page {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.content-hero {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 18px;
  padding: 28px 32px;
  border-radius: 28px;
  color: #fff7ed;
}

.content-hero--red {
  background:
    radial-gradient(circle at top right, rgba(250, 204, 21, 0.2), transparent 28%),
    linear-gradient(135deg, #450a0a 0%, #991b1b 52%, #7c2d12 100%);
}

.content-hero__actions {
  display: flex;
  gap: 12px;
  flex-wrap: wrap;
}

.content-kicker {
  margin: 0;
  font-size: 12px;
  letter-spacing: 1.8px;
  color: rgba(255, 247, 237, 0.76);
}

.content-hero h1 {
  margin: 10px 0 12px;
  font-size: clamp(30px, 5vw, 44px);
}

.content-desc {
  max-width: 760px;
  margin: 0;
  line-height: 1.8;
  color: rgba(255, 247, 237, 0.92);
}

.content-overview {
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

.content-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(320px, 1fr));
  gap: 16px;
  margin-top: 18px;
}

.content-card {
  display: flex;
  flex-direction: column;
  gap: 14px;
  padding: 20px;
}

.content-card__top,
.content-card__tags,
.content-card__meta,
.content-card__actions,
.form-grid {
  display: flex;
  gap: 12px;
  flex-wrap: wrap;
}

.content-card__top {
  align-items: center;
  justify-content: space-between;
}

.content-card__meta {
  color: #6b7280;
  font-size: 13px;
}

.content-card__actions {
  margin-top: auto;
}

.content-card p {
  margin: 0;
  color: #4b5563;
  line-height: 1.75;
}

.form-grid :deep(.el-form-item) {
  flex: 1;
  min-width: 220px;
}

@media (max-width: 960px) {
  .content-hero,
  .panel-card__toolbar {
    flex-direction: column;
    align-items: flex-start;
  }
}

@media (max-width: 768px) {
  .content-hero {
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
