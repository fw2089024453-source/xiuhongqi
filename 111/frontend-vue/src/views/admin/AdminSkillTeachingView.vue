<script setup>
import { computed, onMounted, reactive, ref, watch } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import {
  createAdminSkillTeachingCategoryApi,
  createAdminSkillTeachingCourseApi,
  createAdminSkillTeachingResourceApi,
  deleteAdminSkillTeachingCategoryApi,
  deleteAdminSkillTeachingCourseApi,
  deleteAdminSkillTeachingResourceApi,
  deleteAdminSkillTeachingWorkApi,
  getAdminSkillTeachingCategoriesApi,
  getAdminSkillTeachingCourseDetailApi,
  getAdminSkillTeachingCoursesApi,
  getAdminSkillTeachingResourcesApi,
  getAdminSkillTeachingSelectableUsersApi,
  getAdminSkillTeachingWorksApi,
  updateAdminSkillTeachingCategoryApi,
  updateAdminSkillTeachingCourseApi,
  updateAdminSkillTeachingResourceApi,
  updateAdminSkillTeachingWorkStatusApi,
} from '@/api/adminContent'

const loading = ref(false)
const saving = ref(false)
const courseDetailLoading = ref(false)
const activeTab = ref('courses')
const workStatusFilter = ref('all')
const dialogVisible = ref(false)
const dialogType = ref('course')
const editingId = ref(null)

const categories = ref([])
const courses = ref([])
const resources = ref([])
const works = ref([])
const users = ref([])

const categoryForm = reactive({
  name: '',
  description: '',
  sort_order: 0,
  status: 'active',
})

const resourceForm = reactive({
  title: '',
  description: '',
  file_url: '',
  file_type: '',
  sort_order: 0,
  status: 'active',
})

const courseForm = reactive({
  category_id: null,
  title: '',
  description: '',
  detailed_content: '',
  difficulty: 'beginner',
  estimated_hours: null,
  cover_image: '',
  video_url: '',
  materials_text: '',
  instructor_id: null,
  is_featured: false,
  status: 'draft',
  chapters: [],
})

const overviewCards = computed(() => [
  {
    title: '课程分类',
    value: categories.value.length,
    hint: `启用中 ${categories.value.filter((item) => item.status === 'active').length} 个`,
  },
  {
    title: '教学课程',
    value: courses.value.length,
    hint: `已发布 ${courses.value.filter((item) => item.status === 'published').length} 门`,
  },
  {
    title: '学习资源',
    value: resources.value.length,
    hint: `启用中 ${resources.value.filter((item) => item.status === 'active').length} 个`,
  },
  {
    title: '学员作品',
    value: works.value.length,
    hint: `待审核 ${works.value.filter((item) => item.status === 'pending').length} 个`,
  },
])

function splitLines(value) {
  return String(value || '')
    .split(/\r?\n/)
    .map((item) => item.trim())
    .filter(Boolean)
}

function createEmptyChapter(index = 1) {
  return {
    chapter_number: index,
    title: '',
    content: '',
    video_url: '',
    duration_minutes: null,
    sort_order: index,
  }
}

function formatDate(value) {
  if (!value) return '待补充'

  return new Date(value).toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function formatDifficulty(value) {
  return {
    beginner: '初级',
    intermediate: '中级',
    advanced: '高级',
  }[value] || value
}

function getStatusLabel(status) {
  return {
    active: '启用',
    inactive: '停用',
    draft: '草稿',
    published: '已发布',
    archived: '已归档',
    pending: '待审核',
    approved: '已通过',
    rejected: '已驳回',
  }[status] || status
}

function getStatusType(status) {
  return {
    active: 'success',
    inactive: 'info',
    draft: 'info',
    published: 'success',
    archived: '',
    pending: 'warning',
    approved: 'success',
    rejected: 'danger',
  }[status] || 'info'
}

function resetCategoryForm() {
  categoryForm.name = ''
  categoryForm.description = ''
  categoryForm.sort_order = 0
  categoryForm.status = 'active'
}

function resetResourceForm() {
  resourceForm.title = ''
  resourceForm.description = ''
  resourceForm.file_url = ''
  resourceForm.file_type = ''
  resourceForm.sort_order = 0
  resourceForm.status = 'active'
}

function resetCourseForm() {
  courseForm.category_id = null
  courseForm.title = ''
  courseForm.description = ''
  courseForm.detailed_content = ''
  courseForm.difficulty = 'beginner'
  courseForm.estimated_hours = null
  courseForm.cover_image = ''
  courseForm.video_url = ''
  courseForm.materials_text = ''
  courseForm.instructor_id = null
  courseForm.is_featured = false
  courseForm.status = 'draft'
  courseForm.chapters = [createEmptyChapter()]
}

function resetCurrentForm(type) {
  if (type === 'category') resetCategoryForm()
  if (type === 'resource') resetResourceForm()
  if (type === 'course') resetCourseForm()
}

function openCreateDialog(type = activeTab.value === 'categories' ? 'category' : activeTab.value === 'resources' ? 'resource' : 'course') {
  dialogType.value = type
  editingId.value = null
  resetCurrentForm(type)
  dialogVisible.value = true
}

async function openEditDialog(type, item) {
  dialogType.value = type
  editingId.value = item.id

  if (type === 'category') {
    categoryForm.name = item.name || ''
    categoryForm.description = item.description || ''
    categoryForm.sort_order = item.sort_order || 0
    categoryForm.status = item.status || 'active'
    dialogVisible.value = true
    return
  }

  if (type === 'resource') {
    resourceForm.title = item.title || ''
    resourceForm.description = item.description || ''
    resourceForm.file_url = item.file_url || ''
    resourceForm.file_type = item.file_type || ''
    resourceForm.sort_order = item.sort_order || 0
    resourceForm.status = item.status || 'active'
    dialogVisible.value = true
    return
  }

  courseDetailLoading.value = true

  try {
    const result = await getAdminSkillTeachingCourseDetailApi(item.id)
    const course = result.data

    courseForm.category_id = course.category_id || null
    courseForm.title = course.title || ''
    courseForm.description = course.description || ''
    courseForm.detailed_content = course.detailed_content || ''
    courseForm.difficulty = course.difficulty || 'beginner'
    courseForm.estimated_hours = course.estimated_hours || null
    courseForm.cover_image = course.cover_image || ''
    courseForm.video_url = course.video_url || ''
    courseForm.materials_text = (course.materials_list || []).join('\n')
    courseForm.instructor_id = course.instructor_id || null
    courseForm.is_featured = Boolean(course.is_featured)
    courseForm.status = course.status || 'draft'
    courseForm.chapters =
      course.chapters?.length
        ? course.chapters.map((chapter, index) => ({
            chapter_number: chapter.chapter_number || index + 1,
            title: chapter.title || '',
            content: chapter.content || '',
            video_url: chapter.video_url || '',
            duration_minutes: chapter.duration_minutes || null,
            sort_order: chapter.sort_order || index + 1,
          }))
        : [createEmptyChapter()]

    dialogVisible.value = true
  } catch (error) {
    ElMessage.error(error.message || '加载课程详情失败')
  } finally {
    courseDetailLoading.value = false
  }
}

async function loadBaseData() {
  loading.value = true

  try {
    const [categoryResult, courseResult, resourceResult, userResult] = await Promise.all([
      getAdminSkillTeachingCategoriesApi(),
      getAdminSkillTeachingCoursesApi(),
      getAdminSkillTeachingResourcesApi(),
      getAdminSkillTeachingSelectableUsersApi(),
    ])

    categories.value = categoryResult.data || []
    courses.value = courseResult.data || []
    resources.value = resourceResult.data || []
    users.value = userResult.data || []
  } catch (error) {
    ElMessage.error(error.message || '加载技艺教学管理数据失败')
  } finally {
    loading.value = false
  }
}

async function loadWorks() {
  try {
    const result = await getAdminSkillTeachingWorksApi({
      status: workStatusFilter.value,
    })
    works.value = result.data || []
  } catch (error) {
    ElMessage.error(error.message || '加载学员作品失败')
  }
}

async function loadData() {
  await Promise.all([loadBaseData(), loadWorks()])
}

function addChapter() {
  courseForm.chapters.push(createEmptyChapter(courseForm.chapters.length + 1))
}

function removeChapter(index) {
  if (courseForm.chapters.length === 1) {
    courseForm.chapters = [createEmptyChapter()]
    return
  }

  courseForm.chapters.splice(index, 1)
  courseForm.chapters = courseForm.chapters.map((chapter, chapterIndex) => ({
    ...chapter,
    chapter_number: chapterIndex + 1,
    sort_order: chapter.sort_order || chapterIndex + 1,
  }))
}

async function submitDialog() {
  saving.value = true

  try {
    if (dialogType.value === 'category') {
      const payload = { ...categoryForm }

      if (editingId.value) {
        await updateAdminSkillTeachingCategoryApi(editingId.value, payload)
      } else {
        await createAdminSkillTeachingCategoryApi(payload)
      }
    }

    if (dialogType.value === 'resource') {
      const payload = { ...resourceForm }

      if (editingId.value) {
        await updateAdminSkillTeachingResourceApi(editingId.value, payload)
      } else {
        await createAdminSkillTeachingResourceApi(payload)
      }
    }

    if (dialogType.value === 'course') {
      const payload = {
        category_id: courseForm.category_id,
        title: courseForm.title,
        description: courseForm.description,
        detailed_content: courseForm.detailed_content,
        difficulty: courseForm.difficulty,
        estimated_hours: courseForm.estimated_hours,
        cover_image: courseForm.cover_image,
        video_url: courseForm.video_url,
        materials_list: splitLines(courseForm.materials_text),
        instructor_id: courseForm.instructor_id,
        is_featured: courseForm.is_featured,
        status: courseForm.status,
        chapters: courseForm.chapters.map((chapter, index) => ({
          chapter_number: chapter.chapter_number || index + 1,
          title: chapter.title,
          content: chapter.content,
          video_url: chapter.video_url,
          duration_minutes: chapter.duration_minutes,
          sort_order: chapter.sort_order || index + 1,
        })),
      }

      if (editingId.value) {
        await updateAdminSkillTeachingCourseApi(editingId.value, payload)
      } else {
        await createAdminSkillTeachingCourseApi(payload)
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
  const label = item.title || item.name

  try {
    await ElMessageBox.confirm(`确认删除“${label}”吗？`, '删除确认', { type: 'warning' })

    if (type === 'category') await deleteAdminSkillTeachingCategoryApi(item.id)
    if (type === 'course') await deleteAdminSkillTeachingCourseApi(item.id)
    if (type === 'resource') await deleteAdminSkillTeachingResourceApi(item.id)
    if (type === 'work') await deleteAdminSkillTeachingWorkApi(item.id)

    ElMessage.success('删除成功')
    await loadData()
  } catch (error) {
    if (error !== 'cancel') {
      ElMessage.error(error.message || '删除内容失败')
    }
  }
}

async function updateWorkStatus(item, status) {
  try {
    await updateAdminSkillTeachingWorkStatusApi(item.id, { status })
    ElMessage.success('作品状态已更新')
    await loadWorks()
  } catch (error) {
    ElMessage.error(error.message || '更新作品状态失败')
  }
}

const dialogTitle = computed(() => {
  const prefix = editingId.value ? 'Edit' : 'Create'
  return {
    category: `${prefix === 'Edit' ? '编辑' : '新建'}分类`,
    course: `${prefix === 'Edit' ? '编辑' : '新建'}课程`,
    resource: `${prefix === 'Edit' ? '编辑' : '新建'}资源`,
  }[dialogType.value]
})

watch(workStatusFilter, () => {
  loadWorks()
})

onMounted(() => {
  loadData()
})
</script>

<template>
  <div class="content-page">
    <section class="content-hero content-hero--amber">
      <div>
        <p class="content-kicker">SKILL TEACHING LAB</p>
        <h1>技艺教学管理</h1>
        <p class="content-desc">
          分类、课程、章节、资源和学员作品审核都集中在这里处理。这一页补上后，技艺教学模块的后台
          运营入口就基本完整了。
        </p>
      </div>
      <div class="content-hero__actions">
        <el-button plain :loading="loading" @click="loadData">刷新</el-button>
        <el-button type="warning" @click="openCreateDialog()">新建当前内容</el-button>
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
      <el-tab-pane label="课程分类" name="categories">
        <section class="panel-card">
          <div class="panel-card__toolbar">
            <div>
              <h2>课程分类</h2>
              <p>控制分类排序和启用状态，影响前台教学页的展示结构。</p>
            </div>
            <el-button type="warning" @click="openCreateDialog('category')">新建分类</el-button>
          </div>

          <el-empty v-if="!categories.length && !loading" description="当前还没有课程分类" />

          <div v-else class="content-grid">
            <article v-for="item in categories" :key="item.id" class="content-card">
              <div class="content-card__top">
                <div class="content-card__tags">
                  <el-tag :type="getStatusType(item.status)">{{ getStatusLabel(item.status) }}</el-tag>
                </div>
                <span>排序 {{ item.sort_order || 0 }}</span>
              </div>
              <h3>{{ item.name }}</h3>
              <p>{{ item.description || '暂无分类说明' }}</p>
              <div class="content-card__meta">
                <span>{{ item.course_count || 0 }} 门课程</span>
                <span>已发布 {{ item.published_course_count || 0 }} 门</span>
              </div>
              <div class="content-card__actions">
                <el-button plain @click="openEditDialog('category', item)">编辑</el-button>
                <el-button type="danger" plain @click="removeItem('category', item)">删除</el-button>
              </div>
            </article>
          </div>
        </section>
      </el-tab-pane>

      <el-tab-pane label="课程管理" name="courses">
        <section class="panel-card">
          <div class="panel-card__toolbar">
            <div>
              <h2>课程与章节</h2>
              <p>在同一个编辑器里维护课程信息、章节顺序和精选内容。</p>
            </div>
            <el-button type="warning" :loading="courseDetailLoading" @click="openCreateDialog('course')">新建课程</el-button>
          </div>

          <el-empty v-if="!courses.length && !loading" description="当前还没有教学课程" />

          <div v-else class="content-grid">
            <article v-for="item in courses" :key="item.id" class="content-card">
              <div class="content-card__top">
                <div class="content-card__tags">
                  <el-tag :type="getStatusType(item.status)">{{ getStatusLabel(item.status) }}</el-tag>
                  <el-tag type="warning" effect="plain">{{ formatDifficulty(item.difficulty) }}</el-tag>
                  <el-tag v-if="item.is_featured" type="warning">精选</el-tag>
                </div>
                <span>{{ item.chapter_count || 0 }} 个章节</span>
              </div>
              <h3>{{ item.title }}</h3>
              <p>{{ item.description || '暂无课程简介' }}</p>
              <div class="content-card__meta">
                <span>分类：{{ item.category_name || '未分配' }}</span>
                <span>讲师：{{ item.instructor_name || '待补充' }}</span>
                <span>{{ item.estimated_hours || 0 }} 小时</span>
              </div>
              <div class="content-card__actions">
                <el-button plain :loading="courseDetailLoading && editingId === item.id" @click="openEditDialog('course', item)">编辑</el-button>
                <el-button type="danger" plain @click="removeItem('course', item)">删除</el-button>
              </div>
            </article>
          </div>
        </section>
      </el-tab-pane>

      <el-tab-pane label="学习资源" name="resources">
        <section class="panel-card">
          <div class="panel-card__toolbar">
            <div>
              <h2>学习资源</h2>
              <p>管理资源链接、文件类型说明和展示顺序。</p>
            </div>
            <el-button type="warning" @click="openCreateDialog('resource')">新建资源</el-button>
          </div>

          <el-empty v-if="!resources.length && !loading" description="当前还没有学习资源" />

          <div v-else class="content-grid">
            <article v-for="item in resources" :key="item.id" class="content-card">
              <div class="content-card__top">
                <div class="content-card__tags">
                  <el-tag :type="getStatusType(item.status)">{{ getStatusLabel(item.status) }}</el-tag>
                </div>
                <span>排序 {{ item.sort_order || 0 }}</span>
              </div>
              <h3>{{ item.title }}</h3>
              <p>{{ item.description || '暂无资源说明' }}</p>
              <div class="content-card__meta">
                <span>{{ item.file_type || 'file' }}</span>
                <span>{{ formatDate(item.updated_at || item.created_at) }}</span>
              </div>
              <div class="content-card__actions">
                <el-button plain @click="openEditDialog('resource', item)">编辑</el-button>
                <el-button type="danger" plain @click="removeItem('resource', item)">删除</el-button>
              </div>
            </article>
          </div>
        </section>
      </el-tab-pane>

      <el-tab-pane label="学员作品" name="works">
        <section class="panel-card">
          <div class="panel-card__toolbar">
            <div>
              <h2>学员作品审核</h2>
              <p>审核学员上传内容，并控制是否在前台公开展示。</p>
            </div>
            <el-select v-model="workStatusFilter" style="width: 180px">
              <el-option label="全部状态" value="all" />
              <el-option label="待审核" value="pending" />
              <el-option label="已通过" value="approved" />
              <el-option label="已驳回" value="rejected" />
              <el-option label="已归档" value="archived" />
            </el-select>
          </div>

          <el-empty v-if="!works.length && !loading" description="当前筛选下没有学员作品" />

          <div v-else class="content-grid">
            <article v-for="item in works" :key="item.id" class="content-card">
              <div class="content-card__top">
                <div class="content-card__tags">
                  <el-tag :type="getStatusType(item.status)">{{ getStatusLabel(item.status) }}</el-tag>
                </div>
                <span>{{ formatDate(item.created_at) }}</span>
              </div>
              <h3>{{ item.title }}</h3>
              <p>{{ item.description || '暂无作品说明' }}</p>
              <div class="content-card__meta">
                <span>作者：{{ item.author_name }}</span>
                <span>用户：{{ item.user_name || '游客或历史数据' }}</span>
                <span>{{ item.likes_count || 0 }} 次点赞</span>
              </div>
              <div class="content-card__actions">
                <el-button v-if="item.status !== 'approved'" type="success" plain @click="updateWorkStatus(item, 'approved')">
                  通过
                </el-button>
                <el-button v-if="item.status !== 'rejected'" type="danger" plain @click="updateWorkStatus(item, 'rejected')">
                  驳回
                </el-button>
                <el-button v-if="item.status !== 'archived'" plain @click="updateWorkStatus(item, 'archived')">
                  归档
                </el-button>
                <el-button type="danger" plain @click="removeItem('work', item)">删除</el-button>
              </div>
            </article>
          </div>
        </section>
      </el-tab-pane>
    </el-tabs>

    <el-dialog v-model="dialogVisible" :title="dialogTitle" width="860px">
      <el-form v-if="dialogType === 'category'" label-position="top">
        <div class="form-grid">
          <el-form-item label="名称">
            <el-input v-model="categoryForm.name" />
          </el-form-item>
          <el-form-item label="排序值">
            <el-input-number v-model="categoryForm.sort_order" :min="0" style="width: 100%" />
          </el-form-item>
        </div>
        <el-form-item label="分类说明">
          <el-input v-model="categoryForm.description" type="textarea" :rows="4" />
        </el-form-item>
        <el-form-item label="状态">
          <el-select v-model="categoryForm.status" style="width: 100%">
            <el-option label="启用" value="active" />
            <el-option label="停用" value="inactive" />
          </el-select>
        </el-form-item>
      </el-form>

      <el-form v-else-if="dialogType === 'resource'" label-position="top">
        <el-form-item label="标题">
          <el-input v-model="resourceForm.title" />
        </el-form-item>
        <el-form-item label="资源说明">
          <el-input v-model="resourceForm.description" type="textarea" :rows="4" />
        </el-form-item>
        <div class="form-grid">
          <el-form-item label="文件地址">
            <el-input v-model="resourceForm.file_url" />
          </el-form-item>
          <el-form-item label="文件类型">
            <el-input v-model="resourceForm.file_type" placeholder="PDF / ZIP / DOCX" />
          </el-form-item>
        </div>
        <div class="form-grid">
          <el-form-item label="排序值">
            <el-input-number v-model="resourceForm.sort_order" :min="0" style="width: 100%" />
          </el-form-item>
          <el-form-item label="状态">
            <el-select v-model="resourceForm.status" style="width: 100%">
              <el-option label="启用" value="active" />
              <el-option label="停用" value="inactive" />
            </el-select>
          </el-form-item>
        </div>
      </el-form>

      <el-form v-else label-position="top">
        <div class="form-grid">
          <el-form-item label="分类">
            <el-select v-model="courseForm.category_id" clearable style="width: 100%">
              <el-option v-for="item in categories" :key="item.id" :label="item.name" :value="item.id" />
            </el-select>
          </el-form-item>
          <el-form-item label="讲师">
            <el-select v-model="courseForm.instructor_id" clearable style="width: 100%">
              <el-option
                v-for="item in users"
                :key="item.id"
                :label="item.display_name || item.username"
                :value="item.id"
              />
            </el-select>
          </el-form-item>
        </div>
        <el-form-item label="课程标题">
          <el-input v-model="courseForm.title" maxlength="120" show-word-limit />
        </el-form-item>
        <el-form-item label="课程简介">
          <el-input v-model="courseForm.description" type="textarea" :rows="4" />
        </el-form-item>
        <el-form-item label="详细内容">
          <el-input v-model="courseForm.detailed_content" type="textarea" :rows="5" />
        </el-form-item>
        <div class="form-grid">
          <el-form-item label="难度">
            <el-select v-model="courseForm.difficulty" style="width: 100%">
              <el-option label="初级" value="beginner" />
              <el-option label="中级" value="intermediate" />
              <el-option label="高级" value="advanced" />
            </el-select>
          </el-form-item>
          <el-form-item label="预计学时">
            <el-input-number v-model="courseForm.estimated_hours" :min="0" style="width: 100%" />
          </el-form-item>
        </div>
        <div class="form-grid">
          <el-form-item label="封面图地址">
            <el-input v-model="courseForm.cover_image" />
          </el-form-item>
          <el-form-item label="视频地址">
            <el-input v-model="courseForm.video_url" />
          </el-form-item>
        </div>
        <div class="form-grid">
          <el-form-item label="状态">
            <el-select v-model="courseForm.status" style="width: 100%">
              <el-option label="草稿" value="draft" />
              <el-option label="已发布" value="published" />
              <el-option label="已归档" value="archived" />
            </el-select>
          </el-form-item>
          <el-form-item label="精选课程">
            <el-switch v-model="courseForm.is_featured" />
          </el-form-item>
        </div>
        <el-form-item label="材料清单">
          <el-input
            v-model="courseForm.materials_text"
            type="textarea"
            :rows="4"
            placeholder="每行一个材料项"
          />
        </el-form-item>

        <div class="chapter-block">
          <div class="chapter-block__header">
            <h3>课程章节</h3>
            <el-button type="warning" plain @click="addChapter">新增章节</el-button>
          </div>

          <div class="chapter-list">
            <article v-for="(chapter, index) in courseForm.chapters" :key="index" class="chapter-card">
              <div class="form-grid">
                <el-form-item label="章节号">
                  <el-input-number v-model="chapter.chapter_number" :min="1" style="width: 100%" />
                </el-form-item>
                <el-form-item label="排序值">
                  <el-input-number v-model="chapter.sort_order" :min="1" style="width: 100%" />
                </el-form-item>
                <el-form-item label="时长（分钟）">
                  <el-input-number v-model="chapter.duration_minutes" :min="0" style="width: 100%" />
                </el-form-item>
              </div>
              <el-form-item label="章节标题">
                <el-input v-model="chapter.title" />
              </el-form-item>
              <el-form-item label="章节说明">
                <el-input v-model="chapter.content" type="textarea" :rows="3" />
              </el-form-item>
              <el-form-item label="视频地址">
                <el-input v-model="chapter.video_url" />
              </el-form-item>
              <div class="chapter-card__actions">
                <el-button type="danger" plain @click="removeChapter(index)">删除章节</el-button>
              </div>
            </article>
          </div>
        </div>
      </el-form>

      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="warning" :loading="saving" @click="submitDialog">保存</el-button>
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
  color: #fffbeb;
}

.content-hero--amber {
  background:
    radial-gradient(circle at top right, rgba(251, 191, 36, 0.26), transparent 30%),
    linear-gradient(135deg, #451a03 0%, #92400e 48%, #7c2d12 100%);
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
  color: rgba(255, 251, 235, 0.8);
}

.content-hero h1 {
  margin: 10px 0 12px;
  font-size: clamp(30px, 5vw, 44px);
}

.content-desc {
  max-width: 760px;
  margin: 0;
  line-height: 1.8;
  color: rgba(255, 251, 235, 0.94);
}

.content-overview {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 16px;
}

.overview-card,
.panel-card,
.content-card,
.chapter-card {
  border-radius: 24px;
  border: 1px solid #efe2d3;
  background: rgba(255, 255, 255, 0.96);
  box-shadow: var(--xhq-shadow-md);
}

.overview-card {
  padding: 20px;
}

.overview-card span,
.content-card__meta,
.content-card__top span {
  color: #85715f;
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

.panel-card__toolbar,
.content-card__top,
.content-card__actions,
.chapter-block__header,
.chapter-card__actions,
.content-card__tags,
.content-card__meta,
.form-grid {
  display: flex;
  gap: 12px;
  flex-wrap: wrap;
}

.panel-card__toolbar {
  align-items: center;
  justify-content: space-between;
}

.panel-card__toolbar h2,
.content-card h3,
.chapter-block__header h3 {
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

.chapter-block {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.chapter-list {
  display: grid;
  gap: 14px;
}

.chapter-card {
  padding: 18px;
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
