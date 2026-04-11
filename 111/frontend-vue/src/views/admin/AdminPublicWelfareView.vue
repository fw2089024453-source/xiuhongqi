<script setup>
import { computed, onMounted, reactive, ref } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import {
  createAdminPublicWelfareActivityApi,
  createAdminPublicWelfareTimelineApi,
  createAdminPublicWelfareVolunteerApi,
  deleteAdminPublicWelfareActivityApi,
  deleteAdminPublicWelfareTimelineApi,
  deleteAdminPublicWelfareVolunteerApi,
  getAdminPublicWelfareActivitiesApi,
  getAdminPublicWelfareTimelinesApi,
  getAdminPublicWelfareVolunteersApi,
  updateAdminPublicWelfareActivityApi,
  updateAdminPublicWelfareTimelineApi,
  updateAdminPublicWelfareVolunteerApi,
} from '@/api/adminContent'

const loading = ref(false)
const saving = ref(false)
const activeTab = ref('activities')
const dialogVisible = ref(false)
const dialogType = ref('activities')
const editingId = ref(null)

const activities = ref([])
const volunteers = ref([])
const timelines = ref([])

const activityForm = reactive({
  title: '',
  description: '',
  detailed_content: '',
  start_date: '',
  end_date: '',
  location: '',
  organizer: '',
  contact_info: '',
  target_participants: null,
  image_url: '',
  gallery_images_text: '',
  status: 'planning',
})

const volunteerForm = reactive({
  name: '',
  role: '',
  quote: '',
  introduction: '',
  stat_years: 0,
  stat_projects: 0,
  stat_people: 0,
  avatar_url: '',
  sort_order: 0,
})

const timelineForm = reactive({
  year: null,
  event_name: '',
  title: '',
  description: '',
  image_urls_text: '',
  sort_order: 0,
})

const overviewCards = computed(() => [
  {
    title: '公益活动',
    value: activities.value.length,
    hint: `进行中 ${activities.value.filter((item) => item.status === 'ongoing').length} 条`,
  },
  {
    title: '志愿者故事',
    value: volunteers.value.length,
    hint: '人物故事与服务画像',
  },
  {
    title: '发展历程',
    value: timelines.value.length,
    hint: '节点内容与图片集',
  },
])

function splitLines(value) {
  return String(value || '')
    .split(/\r?\n/)
    .map((item) => item.trim())
    .filter(Boolean)
}

function parseImages(value) {
  if (!value) return []
  if (Array.isArray(value)) return value

  try {
    const parsed = JSON.parse(value)
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

function formatDate(value) {
  if (!value) return '待定'

  return new Date(value).toLocaleDateString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  })
}

function formatActivityStatus(status) {
  return {
    planning: '筹备中',
    ongoing: '进行中',
    completed: '已完成',
    cancelled: '已取消',
  }[status] || status
}

function getActivityTagType(status) {
  return {
    planning: 'info',
    ongoing: 'success',
    completed: '',
    cancelled: 'danger',
  }[status] || 'info'
}

function resetActivityForm() {
  activityForm.title = ''
  activityForm.description = ''
  activityForm.detailed_content = ''
  activityForm.start_date = ''
  activityForm.end_date = ''
  activityForm.location = ''
  activityForm.organizer = ''
  activityForm.contact_info = ''
  activityForm.target_participants = null
  activityForm.image_url = ''
  activityForm.gallery_images_text = ''
  activityForm.status = 'planning'
}

function resetVolunteerForm() {
  volunteerForm.name = ''
  volunteerForm.role = ''
  volunteerForm.quote = ''
  volunteerForm.introduction = ''
  volunteerForm.stat_years = 0
  volunteerForm.stat_projects = 0
  volunteerForm.stat_people = 0
  volunteerForm.avatar_url = ''
  volunteerForm.sort_order = 0
}

function resetTimelineForm() {
  timelineForm.year = null
  timelineForm.event_name = ''
  timelineForm.title = ''
  timelineForm.description = ''
  timelineForm.image_urls_text = ''
  timelineForm.sort_order = 0
}

function resetCurrentForm(type) {
  if (type === 'activities') resetActivityForm()
  if (type === 'volunteers') resetVolunteerForm()
  if (type === 'timelines') resetTimelineForm()
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

  if (type === 'activities') {
    activityForm.title = item.title || ''
    activityForm.description = item.description || ''
    activityForm.detailed_content = item.detailed_content || ''
    activityForm.start_date = item.start_date ? String(item.start_date).slice(0, 10) : ''
    activityForm.end_date = item.end_date ? String(item.end_date).slice(0, 10) : ''
    activityForm.location = item.location || ''
    activityForm.organizer = item.organizer || ''
    activityForm.contact_info = item.contact_info || ''
    activityForm.target_participants = item.target_participants || null
    activityForm.image_url = item.image_url || ''
    activityForm.gallery_images_text = parseImages(item.gallery_images).join('\n')
    activityForm.status = item.status || 'planning'
  }

  if (type === 'volunteers') {
    volunteerForm.name = item.name || ''
    volunteerForm.role = item.role || ''
    volunteerForm.quote = item.quote || ''
    volunteerForm.introduction = item.introduction || ''
    volunteerForm.stat_years = item.stat_years || 0
    volunteerForm.stat_projects = item.stat_projects || 0
    volunteerForm.stat_people = item.stat_people || 0
    volunteerForm.avatar_url = item.avatar_url || ''
    volunteerForm.sort_order = item.sort_order || 0
  }

  if (type === 'timelines') {
    timelineForm.year = item.year || null
    timelineForm.event_name = item.event_name || ''
    timelineForm.title = item.title || ''
    timelineForm.description = item.description || ''
    timelineForm.image_urls_text = parseImages(item.image_urls).join('\n')
    timelineForm.sort_order = item.sort_order || 0
  }

  dialogVisible.value = true
}

async function loadData() {
  loading.value = true

  try {
    const [activityResult, volunteerResult, timelineResult] = await Promise.all([
      getAdminPublicWelfareActivitiesApi(),
      getAdminPublicWelfareVolunteersApi(),
      getAdminPublicWelfareTimelinesApi(),
    ])

    activities.value = activityResult.data || []
    volunteers.value = volunteerResult.data || []
    timelines.value = timelineResult.data || []
  } catch (error) {
    ElMessage.error(error.message || '加载公益纪实管理数据失败')
  } finally {
    loading.value = false
  }
}

async function submitDialog() {
  saving.value = true

  try {
    if (dialogType.value === 'activities') {
      const payload = {
        ...activityForm,
        gallery_images: splitLines(activityForm.gallery_images_text),
      }

      if (editingId.value) {
        await updateAdminPublicWelfareActivityApi(editingId.value, payload)
      } else {
        await createAdminPublicWelfareActivityApi(payload)
      }
    }

    if (dialogType.value === 'volunteers') {
      const payload = { ...volunteerForm }

      if (editingId.value) {
        await updateAdminPublicWelfareVolunteerApi(editingId.value, payload)
      } else {
        await createAdminPublicWelfareVolunteerApi(payload)
      }
    }

    if (dialogType.value === 'timelines') {
      const payload = {
        ...timelineForm,
        image_urls: splitLines(timelineForm.image_urls_text),
      }

      if (editingId.value) {
        await updateAdminPublicWelfareTimelineApi(editingId.value, payload)
      } else {
        await createAdminPublicWelfareTimelineApi(payload)
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
    await ElMessageBox.confirm(`确认删除“${item.title || item.name}”吗？`, '删除确认', {
      type: 'warning',
    })

    if (type === 'activities') await deleteAdminPublicWelfareActivityApi(item.id)
    if (type === 'volunteers') await deleteAdminPublicWelfareVolunteerApi(item.id)
    if (type === 'timelines') await deleteAdminPublicWelfareTimelineApi(item.id)

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
    activities: `${prefix === 'Edit' ? '编辑' : '新建'}活动`,
    volunteers: `${prefix === 'Edit' ? '编辑' : '新建'}志愿者`,
    timelines: `${prefix === 'Edit' ? '编辑' : '新建'}时间线`,
  }[dialogType.value]
})

onMounted(() => {
  loadData()
})
</script>

<template>
  <div class="content-page">
    <section class="content-hero content-hero--green">
      <div>
        <p class="content-kicker">PUBLIC WELFARE DESK</p>
        <h1>公益纪实管理</h1>
        <p class="content-desc">
          这里统一管理公益活动、志愿者故事和发展历程节点。录入后可以直接填充前台页面，让公益纪实
          模块尽快从空白状态进入可展示状态。
        </p>
      </div>
      <div class="content-hero__actions">
        <el-button plain :loading="loading" @click="loadData">刷新</el-button>
        <el-button type="success" @click="openCreateDialog()">新建当前内容</el-button>
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
      <el-tab-pane label="公益活动" name="activities">
        <section class="panel-card">
          <div class="panel-card__toolbar">
            <div>
              <h2>活动管理</h2>
              <p>发布活动，维护时间区间、地点和联系方式。</p>
            </div>
            <el-button type="success" @click="openCreateDialog('activities')">新建活动</el-button>
          </div>

          <el-empty v-if="!activities.length && !loading" description="当前还没有公益活动" />

          <div v-else class="content-grid">
            <article v-for="item in activities" :key="item.id" class="content-card">
              <div class="content-card__top">
                <div class="content-card__tags">
                  <el-tag :type="getActivityTagType(item.status)">{{ formatActivityStatus(item.status) }}</el-tag>
                </div>
                <span>{{ formatDate(item.start_date) }} - {{ formatDate(item.end_date) }}</span>
              </div>
              <h3>{{ item.title }}</h3>
              <p>{{ item.description }}</p>
              <div class="content-card__meta">
                <span>主办方：{{ item.organizer || '待补充' }}</span>
                <span>地点：{{ item.location || '待补充' }}</span>
              </div>
              <div class="content-card__actions">
                <el-button plain @click="openEditDialog('activities', item)">编辑</el-button>
                <el-button type="danger" plain @click="removeItem('activities', item)">删除</el-button>
              </div>
            </article>
          </div>
        </section>
      </el-tab-pane>

      <el-tab-pane label="志愿者" name="volunteers">
        <section class="panel-card">
          <div class="panel-card__toolbar">
            <div>
              <h2>志愿者故事</h2>
              <p>维护角色、寄语和服务统计信息，便于前台展示。</p>
            </div>
            <el-button type="success" @click="openCreateDialog('volunteers')">新建志愿者</el-button>
          </div>

          <el-empty v-if="!volunteers.length && !loading" description="当前还没有志愿者内容" />

          <div v-else class="content-grid">
            <article v-for="item in volunteers" :key="item.id" class="content-card">
              <div class="content-card__top">
                <div class="content-card__tags">
                  <el-tag effect="plain">{{ item.role || '志愿者' }}</el-tag>
                </div>
                <span>排序 {{ item.sort_order || 0 }}</span>
              </div>
              <h3>{{ item.name }}</h3>
              <p>{{ item.introduction || item.quote || 'No introduction yet' }}</p>
              <div class="content-card__meta">
                <span>服务 {{ item.stat_years || 0 }} 年</span>
                <span>参与 {{ item.stat_projects || 0 }} 个项目</span>
                <span>服务 {{ item.stat_people || 0 }} 人</span>
              </div>
              <div class="content-card__actions">
                <el-button plain @click="openEditDialog('volunteers', item)">编辑</el-button>
                <el-button type="danger" plain @click="removeItem('volunteers', item)">删除</el-button>
              </div>
            </article>
          </div>
        </section>
      </el-tab-pane>

      <el-tab-pane label="发展历程" name="timelines">
        <section class="panel-card">
          <div class="panel-card__toolbar">
            <div>
              <h2>发展历程</h2>
              <p>按节点维护标题、说明和图片集。</p>
            </div>
            <el-button type="success" @click="openCreateDialog('timelines')">新建时间线节点</el-button>
          </div>

          <el-empty v-if="!timelines.length && !loading" description="当前还没有发展历程节点" />

          <div v-else class="content-grid">
            <article v-for="item in timelines" :key="item.id" class="content-card">
              <div class="content-card__top">
                <div class="content-card__tags">
                  <el-tag effect="plain">{{ item.year || '年份待补充' }}</el-tag>
                </div>
                <span>{{ parseImages(item.image_urls).length }} 张图片</span>
              </div>
              <h3>{{ item.title }}</h3>
              <p>{{ item.description || 'No description yet' }}</p>
              <div class="content-card__meta">
                <span>事件：{{ item.event_name || '发展节点' }}</span>
                <span>排序：{{ item.sort_order || 0 }}</span>
              </div>
              <div class="content-card__actions">
                <el-button plain @click="openEditDialog('timelines', item)">编辑</el-button>
                <el-button type="danger" plain @click="removeItem('timelines', item)">删除</el-button>
              </div>
            </article>
          </div>
        </section>
      </el-tab-pane>
    </el-tabs>

    <el-dialog v-model="dialogVisible" :title="dialogTitle" width="760px">
      <el-form v-if="dialogType === 'activities'" label-position="top">
        <el-form-item label="标题">
          <el-input v-model="activityForm.title" maxlength="120" show-word-limit />
        </el-form-item>
        <el-form-item label="活动简介">
          <el-input v-model="activityForm.description" type="textarea" :rows="4" />
        </el-form-item>
        <el-form-item label="详细内容">
          <el-input v-model="activityForm.detailed_content" type="textarea" :rows="5" />
        </el-form-item>
        <div class="form-grid">
          <el-form-item label="开始日期">
            <el-date-picker v-model="activityForm.start_date" type="date" value-format="YYYY-MM-DD" style="width: 100%" />
          </el-form-item>
          <el-form-item label="结束日期">
            <el-date-picker v-model="activityForm.end_date" type="date" value-format="YYYY-MM-DD" style="width: 100%" />
          </el-form-item>
        </div>
        <div class="form-grid">
          <el-form-item label="地点">
            <el-input v-model="activityForm.location" />
          </el-form-item>
          <el-form-item label="主办方">
            <el-input v-model="activityForm.organizer" />
          </el-form-item>
        </div>
        <div class="form-grid">
          <el-form-item label="联系方式">
            <el-input v-model="activityForm.contact_info" />
          </el-form-item>
          <el-form-item label="目标人数">
            <el-input-number v-model="activityForm.target_participants" :min="0" style="width: 100%" />
          </el-form-item>
        </div>
        <div class="form-grid">
          <el-form-item label="封面图地址">
            <el-input v-model="activityForm.image_url" />
          </el-form-item>
          <el-form-item label="状态">
            <el-select v-model="activityForm.status" style="width: 100%">
              <el-option label="筹备中" value="planning" />
              <el-option label="进行中" value="ongoing" />
              <el-option label="已完成" value="completed" />
              <el-option label="已取消" value="cancelled" />
            </el-select>
          </el-form-item>
        </div>
        <el-form-item label="活动相册">
          <el-input
            v-model="activityForm.gallery_images_text"
            type="textarea"
            :rows="4"
            placeholder="每行一个图片地址"
          />
        </el-form-item>
      </el-form>

      <el-form v-else-if="dialogType === 'volunteers'" label-position="top">
        <div class="form-grid">
          <el-form-item label="姓名">
            <el-input v-model="volunteerForm.name" />
          </el-form-item>
          <el-form-item label="角色">
            <el-input v-model="volunteerForm.role" />
          </el-form-item>
        </div>
        <el-form-item label="人物介绍">
          <el-input v-model="volunteerForm.introduction" type="textarea" :rows="4" />
        </el-form-item>
        <el-form-item label="寄语">
          <el-input v-model="volunteerForm.quote" type="textarea" :rows="3" />
        </el-form-item>
        <div class="form-grid">
          <el-form-item label="服务年限">
            <el-input-number v-model="volunteerForm.stat_years" :min="0" style="width: 100%" />
          </el-form-item>
          <el-form-item label="参与项目数">
            <el-input-number v-model="volunteerForm.stat_projects" :min="0" style="width: 100%" />
          </el-form-item>
          <el-form-item label="服务人数">
            <el-input-number v-model="volunteerForm.stat_people" :min="0" style="width: 100%" />
          </el-form-item>
        </div>
        <div class="form-grid">
          <el-form-item label="头像地址">
            <el-input v-model="volunteerForm.avatar_url" />
          </el-form-item>
          <el-form-item label="排序值">
            <el-input-number v-model="volunteerForm.sort_order" :min="0" style="width: 100%" />
          </el-form-item>
        </div>
      </el-form>

      <el-form v-else label-position="top">
        <div class="form-grid">
          <el-form-item label="年份">
            <el-input-number v-model="timelineForm.year" :min="1900" :max="2100" style="width: 100%" />
          </el-form-item>
          <el-form-item label="事件名称">
            <el-input v-model="timelineForm.event_name" />
          </el-form-item>
        </div>
        <el-form-item label="标题">
          <el-input v-model="timelineForm.title" />
        </el-form-item>
        <el-form-item label="内容说明">
          <el-input v-model="timelineForm.description" type="textarea" :rows="4" />
        </el-form-item>
        <div class="form-grid">
          <el-form-item label="图片地址">
            <el-input
              v-model="timelineForm.image_urls_text"
              type="textarea"
              :rows="4"
              placeholder="每行一个图片地址"
            />
          </el-form-item>
          <el-form-item label="排序值">
            <el-input-number v-model="timelineForm.sort_order" :min="0" style="width: 100%" />
          </el-form-item>
        </div>
      </el-form>

      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="success" :loading="saving" @click="submitDialog">保存</el-button>
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
  color: #f0fdf4;
}

.content-hero--green {
  background:
    radial-gradient(circle at top right, rgba(250, 204, 21, 0.22), transparent 30%),
    linear-gradient(135deg, #14532d 0%, #166534 52%, #365314 100%);
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
  color: rgba(240, 253, 244, 0.78);
}

.content-hero h1 {
  margin: 10px 0 12px;
  font-size: clamp(30px, 5vw, 44px);
}

.content-desc {
  max-width: 760px;
  margin: 0;
  line-height: 1.8;
  color: rgba(240, 253, 244, 0.94);
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
  border: 1px solid #dfe9da;
  background: rgba(255, 255, 255, 0.96);
  box-shadow: var(--xhq-shadow-md);
}

.overview-card {
  padding: 20px;
}

.overview-card span,
.content-card__meta,
.content-card__top span {
  color: #72806f;
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
