<script setup>
import { computed, onMounted, reactive, ref } from 'vue'
import { ElMessage } from 'element-plus'
import { UploadFilled } from '@element-plus/icons-vue'
import { useAuthStore } from '@/stores/auth'
import {
  createSkillTeachingWorkApi,
  getSkillTeachingCategoriesApi,
  getSkillTeachingCoursesApi,
  getSkillTeachingFeaturedCourseApi,
  getSkillTeachingOverviewApi,
  getSkillTeachingResourcesApi,
  getSkillTeachingWorksApi,
} from '@/api/skillTeaching'

const authStore = useAuthStore()

const activeTab = ref('courses')
const loading = ref(false)
const submitting = ref(false)
const selectedCategoryId = ref('all')
const summary = ref({
  categories: 0,
  courses: 0,
  resources: 0,
  works: 0,
})
const featuredCourse = ref(null)
const categories = ref([])
const courses = ref([])
const resources = ref([])
const works = ref([])

const uploadForm = reactive({
  title: '',
  description: '',
  image: null,
})

const summaryCards = computed(() => [
  { label: '课程分类', value: summary.value.categories, hint: '用于组织教学方向和内容结构。' },
  { label: '公开课程', value: summary.value.courses, hint: '当前已发布并可展示的课程数量。' },
  { label: '学习资料', value: summary.value.resources, hint: '适合直接下载使用的教学素材。' },
  { label: '学员作品', value: summary.value.works, hint: '审核通过后公开展示的学习成果。' },
])

const filteredCourses = computed(() => {
  if (selectedCategoryId.value === 'all') return courses.value
  return courses.value.filter((item) => item.category_id === Number(selectedCategoryId.value))
})

const isLoggedIn = computed(() => authStore.isLoggedIn)

function parseMaterials(value) {
  if (!value) return []
  if (Array.isArray(value)) return value

  try {
    const result = JSON.parse(value)
    return Array.isArray(result) ? result : []
  } catch {
    return []
  }
}

function formatDate(value) {
  if (!value) return '待补充'

  return new Date(value).toLocaleDateString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  })
}

function formatDifficulty(value) {
  const map = {
    beginner: '初级',
    intermediate: '中级',
    advanced: '高级',
    初级: '初级',
    中级: '中级',
    高级: '高级',
  }

  return map[value] || value || '初级'
}

function getCategoryHint(item) {
  if (item.description) return item.description
  return item.course_count
    ? `当前已归档 ${item.course_count} 门课程，可继续补章节和资源。`
    : '等待后台补充课程内容。'
}

function onFileChange(file) {
  uploadForm.image = file.raw || null
}

function resetUploadForm() {
  uploadForm.title = ''
  uploadForm.description = ''
  uploadForm.image = null
}

async function loadData() {
  loading.value = true

  try {
    const [overviewResult, categoriesResult, coursesResult, resourcesResult, worksResult, featuredResult] =
      await Promise.all([
        getSkillTeachingOverviewApi(),
        getSkillTeachingCategoriesApi(),
        getSkillTeachingCoursesApi(),
        getSkillTeachingResourcesApi(),
        getSkillTeachingWorksApi(),
        getSkillTeachingFeaturedCourseApi(),
      ])

    summary.value = overviewResult.data?.summary || summary.value
    featuredCourse.value = featuredResult.data || overviewResult.data?.featuredCourse || null
    categories.value = categoriesResult.data || []
    courses.value = coursesResult.data || []
    resources.value = resourcesResult.data || []
    works.value = worksResult.data || []
  } catch (error) {
    ElMessage.error(error.message || '技艺教学数据加载失败')
  } finally {
    loading.value = false
  }
}

async function submitWork() {
  if (!isLoggedIn.value) {
    ElMessage.warning('请先登录后再上传作品')
    return
  }

  if (!uploadForm.title.trim()) {
    ElMessage.warning('请填写作品名称')
    return
  }

  if (!uploadForm.image) {
    ElMessage.warning('请上传作品图片')
    return
  }

  submitting.value = true

  try {
    const payload = new FormData()
    payload.append('title', uploadForm.title.trim())
    payload.append('description', uploadForm.description.trim())
    payload.append('image', uploadForm.image)

    const result = await createSkillTeachingWorkApi(payload)
    ElMessage.success(result.message || '作品已提交，等待审核')
    resetUploadForm()
    activeTab.value = 'works'
  } catch (error) {
    ElMessage.error(error.message || '作品提交失败')
  } finally {
    submitting.value = false
  }
}

onMounted(() => {
  loadData()
})
</script>

<template>
  <div class="st-page">
    <section class="st-hero">
      <div class="st-hero__inner">
        <span class="st-kicker">SKILL TEACHING</span>
        <h1>技艺教学</h1>
        <p>
          这一页承接课程分类、精选课程、资料下载、学员作品和投稿五个核心功能，
          现在已经切到新的 Vue 结构，更适合后续持续录入和运营。
        </p>
      </div>
    </section>

    <section class="st-summary">
      <div v-for="item in summaryCards" :key="item.label" class="st-summary-card">
        <div class="st-summary-card__label">{{ item.label }}</div>
        <div class="st-summary-card__value">{{ item.value }}</div>
        <div class="st-summary-card__hint">{{ item.hint }}</div>
      </div>
    </section>

    <el-card shadow="never" class="st-card">
      <template #header>
        <div class="st-card__header">
          <div>
            <h2>教学内容中心</h2>
            <p>这一版先把前台可见范围统一起来，后续后台补数据后就能直接展示。</p>
          </div>
          <el-button :loading="loading" @click="loadData">刷新数据</el-button>
        </div>
      </template>

      <el-tabs v-model="activeTab">
        <el-tab-pane label="课程总览" name="courses">
          <div class="st-categories">
            <button
              class="st-category"
              :class="{ 'is-active': selectedCategoryId === 'all' }"
              @click="selectedCategoryId = 'all'"
            >
              <strong>全部课程</strong>
              <span>{{ courses.length }} 门</span>
            </button>

            <button
              v-for="item in categories"
              :key="item.id"
              class="st-category"
              :class="{ 'is-active': selectedCategoryId === item.id }"
              @click="selectedCategoryId = item.id"
            >
              <strong>{{ item.name }}</strong>
              <span>{{ item.course_count || 0 }} 门</span>
            </button>
          </div>

          <div v-if="categories.length" class="st-category-hints">
            <article v-for="item in categories" :key="`hint-${item.id}`" class="st-category-hint">
              <h3>{{ item.name }}</h3>
              <p>{{ getCategoryHint(item) }}</p>
            </article>
          </div>

          <el-empty v-if="!filteredCourses.length && !loading" description="当前还没有可展示的课程内容" />

          <div v-else class="st-courses-grid">
            <article v-for="item in filteredCourses" :key="item.id" class="st-course-card">
              <div class="st-course-card__cover">
                <img v-if="item.cover_image" :src="item.cover_image" :alt="item.title" />
                <div v-else class="st-course-card__placeholder">等待上传封面</div>
              </div>
              <div class="st-course-card__body">
                <div class="st-course-card__meta">
                  <el-tag size="small" effect="plain" type="danger">{{ formatDifficulty(item.difficulty) }}</el-tag>
                  <el-tag v-if="item.is_featured" size="small" type="warning">精选</el-tag>
                </div>
                <h3>{{ item.title }}</h3>
                <p>{{ item.description || '暂无课程简介' }}</p>
                <div class="st-course-card__info">
                  <span>{{ item.category_name || '未分类' }}</span>
                  <span>{{ item.chapter_count || 0 }} 个章节</span>
                  <span>{{ item.estimated_hours || 0 }} 小时</span>
                </div>
              </div>
            </article>
          </div>
        </el-tab-pane>

        <el-tab-pane label="精选课程" name="featured">
          <el-empty v-if="!featuredCourse && !loading" description="当前还没有精选课程" />

          <div v-else-if="featuredCourse" class="st-featured">
            <section class="st-featured__player">
              <div class="st-featured__media">
                <video
                  v-if="featuredCourse.video_url"
                  :src="featuredCourse.video_url"
                  controls
                  preload="metadata"
                ></video>
                <img
                  v-else-if="featuredCourse.cover_image"
                  :src="featuredCourse.cover_image"
                  :alt="featuredCourse.title"
                />
                <div v-else class="st-featured__placeholder">等待上传课程视频或封面</div>
              </div>

              <div class="st-featured__content">
                <div class="st-featured__tags">
                  <el-tag size="small" type="warning">精选课程</el-tag>
                  <el-tag size="small" effect="plain">{{ featuredCourse.category_name || '未分类' }}</el-tag>
                </div>
                <h3>{{ featuredCourse.title }}</h3>
                <p>{{ featuredCourse.description || '暂无课程简介' }}</p>
                <div class="st-featured__info">
                  <span>讲师：{{ featuredCourse.instructor_name || '平台导师' }}</span>
                  <span>难度：{{ formatDifficulty(featuredCourse.difficulty) }}</span>
                  <span>发布时间：{{ formatDate(featuredCourse.published_at || featuredCourse.created_at) }}</span>
                </div>
                <ul v-if="parseMaterials(featuredCourse.materials_list).length" class="st-material-list">
                  <li v-for="item in parseMaterials(featuredCourse.materials_list)" :key="item">{{ item }}</li>
                </ul>
              </div>
            </section>

            <section class="st-chapters">
              <h4>课程章节</h4>
              <el-empty
                v-if="!featuredCourse.chapters?.length"
                description="当前精选课程还没有配置章节"
              />
              <div v-else class="st-chapters__list">
                <article
                  v-for="chapter in featuredCourse.chapters"
                  :key="chapter.id"
                  class="st-chapter-item"
                >
                  <div class="st-chapter-item__number">{{ chapter.chapter_number }}</div>
                  <div class="st-chapter-item__body">
                    <h5>{{ chapter.title }}</h5>
                    <p>{{ chapter.content || '暂无章节说明' }}</p>
                  </div>
                  <div class="st-chapter-item__meta">{{ chapter.duration_minutes || 0 }} 分钟</div>
                </article>
              </div>
            </section>
          </div>
        </el-tab-pane>

        <el-tab-pane label="素材下载" name="resources">
          <el-empty v-if="!resources.length && !loading" description="当前还没有学习资料" />

          <div v-else class="st-resources-grid">
            <article v-for="item in resources" :key="item.id" class="st-resource-card">
              <div class="st-resource-card__icon">资</div>
              <h3>{{ item.title }}</h3>
              <p>{{ item.description || '暂无资料说明' }}</p>
              <div class="st-resource-card__meta">
                <span>{{ item.file_type || '文件资源' }}</span>
                <span>{{ formatDate(item.created_at) }}</span>
              </div>
              <a :href="item.file_url" target="_blank" rel="noreferrer">立即下载</a>
            </article>
          </div>
        </el-tab-pane>

        <el-tab-pane label="学员作品" name="works">
          <el-empty v-if="!works.length && !loading" description="当前还没有公开展示的学员作品" />

          <div v-else class="st-works-grid">
            <article v-for="item in works" :key="item.id" class="st-work-card">
              <div class="st-work-card__image">
                <img :src="item.image_url" :alt="item.title" />
              </div>
              <div class="st-work-card__body">
                <h3>{{ item.title }}</h3>
                <div class="st-work-card__author">作者：{{ item.author_name }}</div>
                <p>{{ item.description || '暂无创作心得' }}</p>
                <div class="st-work-card__footer">
                  <span>{{ formatDate(item.created_at) }}</span>
                  <span>{{ item.likes_count || 0 }} 次点赞</span>
                </div>
              </div>
            </article>
          </div>
        </el-tab-pane>

        <el-tab-pane label="上传作品" name="upload">
          <div class="st-upload-shell">
            <div class="st-upload-intro">
              <h3>提交我的作品</h3>
              <p>登录后可以提交自己的学习作品，审核通过后会展示在学员作品区。</p>
              <el-alert
                v-if="!isLoggedIn"
                type="warning"
                :closable="false"
                title="当前未登录，请先登录后再提交作品"
              />
              <el-alert
                v-else
                type="success"
                :closable="false"
                :title="`当前投稿人：${authStore.user?.display_name || authStore.user?.username}`"
              />
            </div>

            <el-form class="st-upload-form" label-position="top">
              <el-form-item label="作品名称">
                <el-input v-model="uploadForm.title" maxlength="60" show-word-limit />
              </el-form-item>

              <el-form-item label="创作心得">
                <el-input
                  v-model="uploadForm.description"
                  type="textarea"
                  :rows="5"
                  maxlength="300"
                  show-word-limit
                />
              </el-form-item>

              <el-form-item label="作品图片">
                <el-upload
                  class="st-upload-picker"
                  drag
                  action="#"
                  :auto-upload="false"
                  :show-file-list="Boolean(uploadForm.image)"
                  :limit="1"
                  accept="image/*"
                  :on-change="onFileChange"
                >
                  <el-icon><UploadFilled /></el-icon>
                  <div class="el-upload__text">拖拽图片到这里，或点击选择文件</div>
                  <template #tip>
                    <div class="el-upload__tip">支持 JPG、PNG 等常见图片格式</div>
                  </template>
                </el-upload>
              </el-form-item>

              <el-button type="danger" :loading="submitting" @click="submitWork">提交作品</el-button>
            </el-form>
          </div>
        </el-tab-pane>
      </el-tabs>
    </el-card>
  </div>
</template>

<style scoped lang="scss">
.st-page {
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.st-hero {
  padding: 40px;
  border-radius: 28px;
  background:
    radial-gradient(circle at top left, rgba(245, 158, 11, 0.28), transparent 24%),
    linear-gradient(135deg, #7f1d1d 0%, #b91c1c 42%, #78350f 100%);
  color: #fff7ed;
}

.st-kicker {
  display: inline-flex;
  padding: 6px 12px;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.12);
  border: 1px solid rgba(255, 255, 255, 0.18);
  font-size: 12px;
  letter-spacing: 1.6px;
}

.st-hero h1 {
  margin: 18px 0 12px;
  font-size: clamp(32px, 4vw, 48px);
}

.st-hero p {
  max-width: 780px;
  margin: 0;
  line-height: 1.9;
  color: rgba(255, 247, 237, 0.92);
}

.st-summary {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
  gap: 16px;
}

.st-summary-card {
  padding: 20px;
  border-radius: 22px;
  background: rgba(255, 255, 255, 0.94);
  border: 1px solid #efe2d3;
}

.st-summary-card__label {
  color: #9a3412;
  font-size: 13px;
}

.st-summary-card__value {
  margin-top: 8px;
  color: #991b1b;
  font-size: 28px;
  font-weight: 700;
}

.st-summary-card__hint {
  margin-top: 8px;
  color: #6b7280;
  line-height: 1.6;
  font-size: 13px;
}

.st-card {
  border-radius: 28px;
}

.st-card__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
}

.st-card__header h2 {
  margin: 0 0 8px;
  color: #991b1b;
}

.st-card__header p {
  margin: 0;
  color: #6b7280;
}

.st-categories {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  margin-bottom: 18px;
}

.st-category {
  display: flex;
  flex-direction: column;
  gap: 6px;
  min-width: 132px;
  padding: 16px 18px;
  border: 1px solid #eadccf;
  border-radius: 20px;
  background: #fffaf6;
  color: #7c2d12;
  text-align: left;
  cursor: pointer;
  transition:
    transform 0.2s ease,
    border-color 0.2s ease,
    box-shadow 0.2s ease;
}

.st-category:hover,
.st-category.is-active {
  border-color: #dc2626;
  transform: translateY(-2px);
  box-shadow: 0 12px 24px rgba(220, 38, 38, 0.08);
}

.st-category span {
  color: #9ca3af;
  font-size: 13px;
}

.st-category-hints,
.st-courses-grid,
.st-resources-grid,
.st-works-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
  gap: 18px;
}

.st-category-hint,
.st-course-card,
.st-resource-card,
.st-work-card,
.st-chapter-item {
  overflow: hidden;
  border-radius: 24px;
  border: 1px solid #efe2d3;
  background: #fffdfa;
}

.st-category-hint {
  padding: 18px;
}

.st-category-hint h3,
.st-course-card h3,
.st-resource-card h3,
.st-work-card h3 {
  margin: 0;
  color: #991b1b;
}

.st-category-hint p,
.st-course-card p,
.st-resource-card p,
.st-work-card p {
  color: #5f6368;
  line-height: 1.75;
}

.st-course-card__cover,
.st-work-card__image {
  height: 190px;
  background: linear-gradient(135deg, #fee2e2, #fde68a);
}

.st-course-card__cover img,
.st-work-card__image img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.st-course-card__placeholder,
.st-featured__placeholder {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100%;
  color: #9ca3af;
  font-size: 14px;
}

.st-course-card__body,
.st-resource-card,
.st-work-card__body {
  padding: 18px;
}

.st-course-card__meta,
.st-work-card__footer,
.st-resource-card__meta,
.st-featured__info {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
}

.st-course-card__meta {
  margin-bottom: 10px;
}

.st-course-card__info,
.st-work-card__author {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  color: #8a8f98;
  font-size: 13px;
}

.st-featured {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.st-featured__player {
  display: grid;
  grid-template-columns: minmax(0, 1.2fr) minmax(280px, 0.8fr);
  gap: 20px;
}

.st-featured__media {
  overflow: hidden;
  min-height: 280px;
  border-radius: 24px;
  background: #0f172a;
}

.st-featured__media video,
.st-featured__media img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.st-featured__content,
.st-upload-shell {
  padding: 24px;
  border-radius: 24px;
  border: 1px solid #efe2d3;
  background: #fffdfa;
}

.st-featured__tags {
  display: flex;
  gap: 8px;
  margin-bottom: 12px;
}

.st-featured__content h3,
.st-chapters h4,
.st-upload-intro h3 {
  margin: 0 0 12px;
  color: #991b1b;
}

.st-featured__content p,
.st-upload-intro p {
  color: #5f6368;
  line-height: 1.8;
}

.st-material-list {
  margin: 18px 0 0;
  padding-left: 18px;
  color: #7c2d12;
  line-height: 1.8;
}

.st-chapters__list {
  display: grid;
  gap: 14px;
}

.st-chapter-item {
  display: grid;
  grid-template-columns: 56px 1fr auto;
  gap: 16px;
  padding: 18px;
  align-items: start;
}

.st-chapter-item__number {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 56px;
  height: 56px;
  border-radius: 18px;
  background: #991b1b;
  color: #fff;
  font-size: 22px;
  font-weight: 700;
}

.st-chapter-item__body h5 {
  margin: 0 0 8px;
  color: #7f1d1d;
  font-size: 16px;
}

.st-chapter-item__body p,
.st-chapter-item__meta {
  margin: 0;
  color: #6b7280;
}

.st-resource-card {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.st-resource-card__icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 52px;
  height: 52px;
  border-radius: 18px;
  background: #991b1b;
  color: #fff;
  font-size: 22px;
  font-weight: 700;
}

.st-resource-card a {
  display: inline-flex;
  width: fit-content;
  color: #b45309;
  text-decoration: none;
  font-weight: 600;
}

.st-upload-shell {
  display: grid;
  grid-template-columns: minmax(220px, 0.7fr) minmax(0, 1fr);
  gap: 24px;
}

.st-upload-intro {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.st-upload-form {
  padding: 24px;
  border-radius: 24px;
  background: #fff;
  border: 1px solid #f2e8dc;
}

@media (max-width: 768px) {
  .st-hero,
  .st-card :deep(.el-card__body) {
    padding: 24px;
  }

  .st-card__header,
  .st-featured__player,
  .st-upload-shell,
  .st-chapter-item {
    grid-template-columns: 1fr;
  }

  .st-card__header {
    display: grid;
  }

  .st-chapter-item__number {
    width: 48px;
    height: 48px;
  }
}
</style>
