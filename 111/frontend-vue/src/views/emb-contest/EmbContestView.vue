<script setup>
import { computed, onMounted, reactive, ref } from 'vue'
import { ElMessage } from 'element-plus'
import { useAuthStore } from '@/stores/auth'
import {
  createEmbContestCommentApi,
  createEmbContestWorkApi,
  getEmbContestCommentsApi,
  getEmbContestOverviewApi,
  getEmbContestTopWorksApi,
  getEmbContestWorkDetailApi,
  getEmbContestWorksApi,
  likeEmbContestCommentApi,
  voteEmbContestWorkApi,
} from '@/api/embContest'

const authStore = useAuthStore()

const activeTab = ref('vote')
const loading = ref(false)
const worksLoading = ref(false)
const detailLoading = ref(false)
const submittingWork = ref(false)
const submittingComment = ref(false)
const searchKeyword = ref('')
const currentSort = ref('hot')
const currentCategory = ref('all')
const currentPage = ref(1)
const pageSize = 8

const overview = ref({
  works: 0,
  votes: 0,
})
const categoriesStats = ref([])
const latestWorks = ref([])
const topWorks = ref([])
const works = ref([])
const totalPages = ref(1)
const detailVisible = ref(false)
const currentWork = ref(null)
const comments = ref([])
const currentSlide = ref(0)

const submitForm = reactive({
  title: '',
  phone: '',
  category: '传统刺绣',
  description: '',
  images: [],
})

const commentForm = reactive({
  content: '',
})

const categoryOptions = ['all', '传统刺绣', '创意剪纸', '数字绘画', '综合材料']

const summaryCards = computed(() => [
  { label: '已公开作品', value: overview.value.works, hint: '当前已通过审核并公开展示的绣红旗作品' },
  { label: '累计票数', value: overview.value.votes, hint: '所有作品累计获得的有效投票数' },
  { label: '榜单作品', value: topWorks.value.length, hint: '当前出现在排行榜中的优秀作品' },
])

const isLoggedIn = computed(() => authStore.isLoggedIn)
const currentImages = computed(() => parseImages(currentWork.value?.image_url))

function parseImages(value) {
  if (!value) return []
  if (Array.isArray(value)) return value

  try {
    const result = JSON.parse(value)
    return Array.isArray(result) ? result : []
  } catch {
    return [value]
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

function shortText(value, max = 88) {
  if (!value) return '暂无作品简介'
  return value.length > max ? `${value.slice(0, max)}...` : value
}

function firstImage(value) {
  return parseImages(value)[0] || ''
}

function onImagesChange(file, files) {
  submitForm.images = files.map((item) => item.raw).filter(Boolean)
}

function resetSubmitForm() {
  submitForm.title = ''
  submitForm.phone = authStore.user?.phone || ''
  submitForm.category = '传统刺绣'
  submitForm.description = ''
  submitForm.images = []
}

async function loadOverview() {
  const [overviewResult, topWorksResult] = await Promise.all([
    getEmbContestOverviewApi(),
    getEmbContestTopWorksApi(),
  ])

  overview.value = overviewResult.data?.summary || overview.value
  categoriesStats.value = overviewResult.data?.categories || []
  latestWorks.value = overviewResult.data?.latest || []
  topWorks.value = topWorksResult.data || []
}

async function loadWorks() {
  worksLoading.value = true

  try {
    const result = await getEmbContestWorksApi({
      userId: authStore.user?.id || 0,
      sort: currentSort.value,
      keyword: searchKeyword.value.trim(),
      category: currentCategory.value,
      page: currentPage.value,
      limit: pageSize,
    })

    works.value = result.data?.items || []
    totalPages.value = result.data?.totalPages || 1
  } catch (error) {
    ElMessage.error(error.message || '作品列表加载失败')
  } finally {
    worksLoading.value = false
  }
}

async function loadPageData() {
  loading.value = true

  try {
    await Promise.all([loadOverview(), loadWorks()])
  } catch (error) {
    ElMessage.error(error.message || '绣红旗大赛数据加载失败')
  } finally {
    loading.value = false
  }
}

async function openDetail(workId) {
  detailLoading.value = true
  detailVisible.value = true
  currentSlide.value = 0

  try {
    const [detailResult, commentsResult] = await Promise.all([
      getEmbContestWorkDetailApi(workId),
      getEmbContestCommentsApi(workId, { userId: authStore.user?.id || 0 }),
    ])

    currentWork.value = detailResult.data
    comments.value = commentsResult.data || []
  } catch (error) {
    ElMessage.error(error.message || '作品详情加载失败')
    detailVisible.value = false
  } finally {
    detailLoading.value = false
  }
}

async function handleVote(work) {
  if (!isLoggedIn.value) {
    ElMessage.warning('请先登录后再投票')
    return
  }

  try {
    const result = await voteEmbContestWorkApi(work.id, {
      userId: authStore.user?.id,
    })

    ElMessage.success(result.message || '投票成功')
    await Promise.all([loadOverview(), loadWorks()])
    if (detailVisible.value && currentWork.value?.id === work.id) {
      await openDetail(work.id)
    }
  } catch (error) {
    ElMessage.error(error.message || '投票失败')
  }
}

async function submitWork() {
  if (!isLoggedIn.value) {
    ElMessage.warning('请先登录后再提交作品')
    return
  }

  if (!submitForm.title.trim() || !submitForm.images.length) {
    ElMessage.warning('请填写标题并至少上传一张作品图片')
    return
  }

  if (submitForm.images.length > 5) {
    ElMessage.warning('最多只能上传 5 张图片')
    return
  }

  submittingWork.value = true

  try {
    const payload = new FormData()
    payload.append('title', submitForm.title.trim())
    payload.append('author_id', authStore.user?.id || '')
    payload.append('author_name', authStore.user?.display_name || authStore.user?.username || '平台用户')
    payload.append('phone', submitForm.phone.trim())
    payload.append('category', submitForm.category)
    payload.append('description', submitForm.description.trim())
    submitForm.images.forEach((file) => payload.append('images', file))

    const result = await createEmbContestWorkApi(payload)
    ElMessage.success(result.message || '作品提交成功')
    resetSubmitForm()
    activeTab.value = 'vote'
  } catch (error) {
    ElMessage.error(error.message || '作品提交失败')
  } finally {
    submittingWork.value = false
  }
}

async function submitComment() {
  if (!isLoggedIn.value) {
    ElMessage.warning('请先登录后再评论')
    return
  }

  if (!currentWork.value?.id || !commentForm.content.trim()) {
    ElMessage.warning('请填写评论内容')
    return
  }

  submittingComment.value = true

  try {
    const result = await createEmbContestCommentApi(currentWork.value.id, {
      userId: authStore.user?.id,
      username: authStore.user?.display_name || authStore.user?.username || '平台用户',
      content: commentForm.content.trim(),
    })

    ElMessage.success(result.message || '评论发布成功')
    commentForm.content = ''
    await openDetail(currentWork.value.id)
  } catch (error) {
    ElMessage.error(error.message || '评论发布失败')
  } finally {
    submittingComment.value = false
  }
}

async function toggleCommentLike(comment) {
  if (!isLoggedIn.value) {
    ElMessage.warning('请先登录后再点赞')
    return
  }

  try {
    const result = await likeEmbContestCommentApi(comment.id, {
      userId: authStore.user?.id,
    })

    if (result.action === 'liked') {
      comment.is_liked = 1
      comment.likes_count += 1
    } else {
      comment.is_liked = 0
      comment.likes_count = Math.max(0, comment.likes_count - 1)
    }
  } catch (error) {
    ElMessage.error(error.message || '评论点赞失败')
  }
}

function goPrev() {
  const images = currentImages.value
  if (!images.length) return
  currentSlide.value = (currentSlide.value - 1 + images.length) % images.length
}

function goNext() {
  const images = currentImages.value
  if (!images.length) return
  currentSlide.value = (currentSlide.value + 1) % images.length
}

onMounted(() => {
  submitForm.phone = authStore.user?.phone || ''
  loadPageData()
})
</script>

<template>
  <div class="ec-page">
    <section class="ec-hero">
      <div class="ec-hero__inner">
        <span class="ec-kicker">EMB CONTEST</span>
        <h1>绣红旗大赛</h1>
        <p>
          这一页承接旧站的图片作品征集、评选和展示流程。
          现在已经切到新的 Vue 页面和结构化接口，更适合后续云端部署和后台审核扩展。
        </p>
      </div>
    </section>

    <section class="ec-summary">
      <div v-for="item in summaryCards" :key="item.label" class="ec-summary-card">
        <div class="ec-summary-card__label">{{ item.label }}</div>
        <div class="ec-summary-card__value">{{ item.value }}</div>
        <div class="ec-summary-card__hint">{{ item.hint }}</div>
      </div>
    </section>

    <el-card shadow="never" class="ec-card">
      <template #header>
        <div class="ec-card__header">
          <div>
            <h2>赛事内容中心</h2>
            <p>先把前台核心链路打通，后面再接后台审核和更细的赛事管理流程。</p>
          </div>
          <el-button :loading="loading" @click="loadPageData">刷新数据</el-button>
        </div>
      </template>

      <el-tabs v-model="activeTab">
        <el-tab-pane label="在线评选" name="vote">
          <div class="ec-toolbar">
            <el-input v-model="searchKeyword" placeholder="搜索作品标题或作者" clearable />
            <el-select v-model="currentCategory" style="width: 180px">
              <el-option
                v-for="item in categoryOptions"
                :key="item"
                :label="item === 'all' ? '全部赛区' : item"
                :value="item"
              />
            </el-select>
            <el-radio-group v-model="currentSort">
              <el-radio-button label="hot">最高热度</el-radio-button>
              <el-radio-button label="new">最新发布</el-radio-button>
            </el-radio-group>
            <el-button type="danger" @click="currentPage = 1; loadWorks()">筛选</el-button>
          </div>

          <el-empty v-if="!works.length && !worksLoading" description="当前还没有公开展示的参赛作品" />

          <div v-else class="ec-grid">
            <article v-for="item in works" :key="item.id" class="ec-work-card">
              <div class="ec-work-card__cover" @click="openDetail(item.id)">
                <img v-if="firstImage(item.image_url)" :src="firstImage(item.image_url)" :alt="item.title" />
                <div v-else class="ec-work-card__placeholder">封面待补充</div>
              </div>
              <div class="ec-work-card__body">
                <div class="ec-work-card__meta">
                  <el-tag size="small" effect="plain">{{ item.category || '未分类' }}</el-tag>
                  <span>{{ item.votes_count || 0 }} 票</span>
                </div>
                <h3>{{ item.title }}</h3>
                <p>{{ shortText(item.description) }}</p>
                <div class="ec-work-card__footer">
                  <span>{{ item.author_name }}</span>
                  <span>{{ item.comment_count || 0 }} 条评论</span>
                </div>
                <div class="ec-work-card__actions">
                  <el-button plain @click="openDetail(item.id)">查看详情</el-button>
                  <el-button type="danger" :disabled="item.has_voted > 0" @click="handleVote(item)">
                    {{ item.has_voted > 0 ? '已投票' : '投一票' }}
                  </el-button>
                </div>
              </div>
            </article>
          </div>

          <div v-if="totalPages > 1" class="ec-pagination">
            <el-pagination
              layout="prev, pager, next"
              :page-size="pageSize"
              :current-page="currentPage"
              :page-count="totalPages"
              @current-change="(page) => { currentPage = page; loadWorks() }"
            />
          </div>
        </el-tab-pane>

        <el-tab-pane label="作品投稿" name="submit">
          <div class="ec-submit-shell">
            <section class="ec-submit-intro">
              <h3>提交我的作品</h3>
              <p>登录后可以提交多图作品，作品将进入后台审核，通过后会出现在在线评选区。</p>
              <el-alert
                type="warning"
                :closable="false"
                title="当前版本支持最多上传 5 张图片，正式上云前建议把图片存储切到对象存储。"
              />
            </section>

            <el-form label-position="top" class="ec-submit-form">
              <el-form-item label="作品标题">
                <el-input v-model="submitForm.title" maxlength="60" show-word-limit />
              </el-form-item>
              <el-form-item label="联系电话">
                <el-input v-model="submitForm.phone" maxlength="30" show-word-limit />
              </el-form-item>
              <el-form-item label="参赛组别">
                <el-select v-model="submitForm.category" style="width: 100%">
                  <el-option label="传统刺绣" value="传统刺绣" />
                  <el-option label="创意剪纸" value="创意剪纸" />
                  <el-option label="数字绘画" value="数字绘画" />
                  <el-option label="综合材料" value="综合材料" />
                </el-select>
              </el-form-item>
              <el-form-item label="创作理念">
                <el-input v-model="submitForm.description" type="textarea" :rows="5" maxlength="500" show-word-limit />
              </el-form-item>
              <el-form-item label="作品图片">
                <el-upload
                  drag
                  action="#"
                  :auto-upload="false"
                  :file-list="[]"
                  :limit="5"
                  accept="image/*"
                  multiple
                  :on-change="onImagesChange"
                >
                  <div class="el-upload__text">拖拽图片到这里，或点击选择最多 5 张图片</div>
                </el-upload>
              </el-form-item>
              <el-button type="danger" :loading="submittingWork" @click="submitWork">提交作品</el-button>
            </el-form>
          </div>
        </el-tab-pane>

        <el-tab-pane label="榜单展示" name="results">
          <el-empty v-if="!topWorks.length && !loading" description="当前还没有进入榜单的公开作品" />

          <div v-else class="ec-ranking">
            <article v-for="(item, index) in topWorks" :key="item.id" class="ec-rank-card">
              <div class="ec-rank-card__media">
                <img v-if="firstImage(item.image_url)" :src="firstImage(item.image_url)" :alt="item.title" />
                <div v-else class="ec-rank-card__placeholder">榜单封面待补充</div>
              </div>
              <div class="ec-rank-card__body">
                <div class="ec-rank-card__badge">TOP {{ index + 1 }}</div>
                <h3>{{ item.title }}</h3>
                <p>作者：{{ item.author_name }}</p>
                <strong>{{ item.votes_count || 0 }} 票</strong>
              </div>
            </article>
          </div>
        </el-tab-pane>

        <el-tab-pane label="赛事概览" name="stats">
          <div class="ec-stats-shell">
            <section class="ec-latest">
              <header class="ec-block-header">
                <div>
                  <h3>最新公开作品</h3>
                  <p>用于替代旧站的动态公告和赛况更新区。</p>
                </div>
              </header>
              <el-empty v-if="!latestWorks.length && !loading" description="当前还没有公开作品动态" />
              <div v-else class="ec-latest-list">
                <article v-for="item in latestWorks" :key="item.id" class="ec-latest-item">
                  <div class="ec-latest-item__meta">
                    <el-tag size="small" effect="plain">{{ item.category || '未分类' }}</el-tag>
                    <span>{{ formatDate(item.created_at) }}</span>
                  </div>
                  <h4>{{ item.title }}</h4>
                  <p>{{ item.author_name }} · {{ item.votes_count || 0 }} 票</p>
                </article>
              </div>
            </section>

            <section class="ec-category-stats">
              <header class="ec-block-header">
                <div>
                  <h3>赛区分布</h3>
                  <p>当前公开作品按赛区的分布情况。</p>
                </div>
              </header>
              <el-empty v-if="!categoriesStats.length && !loading" description="当前还没有赛区统计数据" />
              <div v-else class="ec-category-list">
                <article v-for="item in categoriesStats" :key="item.category" class="ec-category-item">
                  <strong>{{ item.category }}</strong>
                  <span>{{ item.count }} 件作品</span>
                </article>
              </div>
            </section>
          </div>
        </el-tab-pane>
      </el-tabs>
    </el-card>

    <el-drawer v-model="detailVisible" size="72%" :with-header="false">
      <el-skeleton :loading="detailLoading" animated>
        <template #template>
          <el-skeleton-item variant="rect" style="width: 100%; height: 320px" />
        </template>

        <div v-if="currentWork" class="ec-detail">
          <div class="ec-detail__gallery">
            <div class="ec-gallery__main">
              <img v-if="currentImages.length" :src="currentImages[currentSlide]" :alt="currentWork.title" />
              <div v-else class="ec-gallery__placeholder">作品图片待补充</div>
              <button v-if="currentImages.length > 1" class="ec-gallery__nav is-prev" @click="goPrev">‹</button>
              <button v-if="currentImages.length > 1" class="ec-gallery__nav is-next" @click="goNext">›</button>
            </div>
            <div v-if="currentImages.length > 1" class="ec-gallery__thumbs">
              <button
                v-for="(image, index) in currentImages"
                :key="`${currentWork.id}-${index}`"
                class="ec-gallery__thumb"
                :class="{ 'is-active': currentSlide === index }"
                @click="currentSlide = index"
              >
                <img :src="image" :alt="currentWork.title" />
              </button>
            </div>
          </div>

          <div class="ec-detail__info">
            <div class="ec-detail__meta">
              <el-tag size="small" effect="plain">{{ currentWork.category || '未分类' }}</el-tag>
              <span>{{ currentWork.votes_count || 0 }} 票</span>
              <span>{{ formatDate(currentWork.created_at) }}</span>
            </div>
            <h2>{{ currentWork.title }}</h2>
            <p>{{ currentWork.description || '暂无作品简介' }}</p>
            <div class="ec-detail__author">作者：{{ currentWork.author_name }}</div>
            <el-button type="danger" @click="handleVote(currentWork)">为这件作品投票</el-button>
          </div>

          <section class="ec-comments">
            <header class="ec-block-header">
              <div>
                <h3>评论区</h3>
                <p>欢迎留下你对作品的看法和建议。</p>
              </div>
            </header>

            <div class="ec-comment-form">
              <el-input
                v-model="commentForm.content"
                type="textarea"
                :rows="4"
                maxlength="300"
                show-word-limit
                placeholder="写下你的评论"
              />
              <el-button type="danger" :loading="submittingComment" @click="submitComment">发布评论</el-button>
            </div>

            <el-empty v-if="!comments.length" description="当前还没有评论" />

            <div v-else class="ec-comment-list">
              <article v-for="item in comments" :key="item.id" class="ec-comment-item">
                <div class="ec-comment-item__header">
                  <strong>{{ item.username }}</strong>
                  <span>{{ formatDate(item.created_at) }}</span>
                </div>
                <p>{{ item.content }}</p>
                <button
                  class="ec-like-btn"
                  :class="{ 'is-active': item.is_liked }"
                  @click="toggleCommentLike(item)"
                >
                  赞 {{ item.likes_count || 0 }}
                </button>
              </article>
            </div>
          </section>
        </div>
      </el-skeleton>
    </el-drawer>
  </div>
</template>

<style scoped lang="scss">
.ec-page {
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.ec-hero {
  padding: 40px;
  border-radius: 28px;
  background:
    radial-gradient(circle at top left, rgba(217, 119, 6, 0.24), transparent 24%),
    linear-gradient(135deg, #6b21a8 0%, #9f1239 44%, #7c2d12 100%);
  color: #fff7ed;
}

.ec-kicker {
  display: inline-flex;
  padding: 6px 12px;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.12);
  border: 1px solid rgba(255, 255, 255, 0.16);
  font-size: 12px;
  letter-spacing: 1.6px;
}

.ec-hero h1 {
  margin: 18px 0 12px;
  font-size: clamp(32px, 4vw, 48px);
}

.ec-hero p {
  max-width: 780px;
  margin: 0;
  line-height: 1.9;
  color: rgba(255, 247, 237, 0.92);
}

.ec-summary {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
  gap: 16px;
}

.ec-summary-card,
.ec-work-card,
.ec-rank-card,
.ec-latest-item,
.ec-category-item,
.ec-comment-item {
  border-radius: 24px;
  border: 1px solid #f0dce1;
  background: rgba(255, 255, 255, 0.95);
}

.ec-summary-card {
  padding: 20px;
}

.ec-summary-card__label {
  color: #9f1239;
  font-size: 13px;
}

.ec-summary-card__value {
  margin-top: 8px;
  color: #7c2d12;
  font-size: 28px;
  font-weight: 700;
}

.ec-summary-card__hint {
  margin-top: 8px;
  color: #6b7280;
  font-size: 13px;
  line-height: 1.6;
}

.ec-card {
  border-radius: 28px;
}

.ec-card__header,
.ec-toolbar,
.ec-work-card__meta,
.ec-work-card__footer,
.ec-work-card__actions,
.ec-detail__meta,
.ec-comment-item__header {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
}

.ec-card__header {
  align-items: center;
  justify-content: space-between;
}

.ec-card__header h2,
.ec-block-header h3,
.ec-work-card h3,
.ec-rank-card h3,
.ec-latest-item h4,
.ec-detail__info h2 {
  margin: 0;
  color: #1f2937;
}

.ec-card__header p,
.ec-block-header p,
.ec-work-card p,
.ec-latest-item p,
.ec-detail__info p,
.ec-comment-item p {
  color: #6b7280;
  line-height: 1.75;
}

.ec-toolbar {
  align-items: center;
  margin-bottom: 18px;
}

.ec-grid,
.ec-ranking,
.ec-stats-shell {
  display: grid;
  gap: 18px;
}

.ec-grid {
  grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
}

.ec-ranking {
  grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
}

.ec-work-card,
.ec-rank-card {
  overflow: hidden;
}

.ec-work-card__cover,
.ec-rank-card__media {
  height: 220px;
  background: linear-gradient(135deg, #fce7f3, #fde68a);
  cursor: pointer;
}

.ec-work-card__cover img,
.ec-rank-card__media img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.ec-work-card__placeholder,
.ec-rank-card__placeholder,
.ec-gallery__placeholder {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100%;
  color: #9ca3af;
}

.ec-work-card__body,
.ec-rank-card__body,
.ec-latest-item,
.ec-category-item,
.ec-comment-item {
  padding: 18px;
}

.ec-work-card__footer,
.ec-detail__meta,
.ec-comment-item__header {
  color: #8a8f98;
  font-size: 13px;
}

.ec-rank-card__badge {
  display: inline-flex;
  padding: 6px 10px;
  border-radius: 999px;
  background: #9f1239;
  color: #fff;
  font-size: 12px;
  font-weight: 700;
}

.ec-submit-shell,
.ec-stats-shell,
.ec-detail {
  display: grid;
  grid-template-columns: minmax(260px, 0.8fr) minmax(0, 1.2fr);
  gap: 20px;
}

.ec-submit-intro,
.ec-submit-form,
.ec-latest,
.ec-category-stats,
.ec-detail__info,
.ec-comments {
  padding: 24px;
  border-radius: 24px;
  border: 1px solid #f0dce1;
  background: #fffdfa;
}

.ec-submit-intro h3,
.ec-detail__author {
  color: #9f1239;
}

.ec-detail__gallery {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.ec-gallery__main {
  position: relative;
  height: 420px;
  overflow: hidden;
  border-radius: 24px;
  background: linear-gradient(135deg, #fdf2f8, #fff7ed);
}

.ec-gallery__main img {
  width: 100%;
  height: 100%;
  object-fit: contain;
}

.ec-gallery__nav {
  position: absolute;
  top: 50%;
  transform: translateY(-50%);
  width: 42px;
  height: 42px;
  border: none;
  border-radius: 50%;
  background: rgba(0, 0, 0, 0.45);
  color: #fff;
  cursor: pointer;
}

.ec-gallery__nav.is-prev {
  left: 16px;
}

.ec-gallery__nav.is-next {
  right: 16px;
}

.ec-gallery__thumbs {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(84px, 1fr));
  gap: 10px;
}

.ec-gallery__thumb {
  padding: 0;
  overflow: hidden;
  border: 2px solid transparent;
  border-radius: 16px;
  background: #fff;
  cursor: pointer;
}

.ec-gallery__thumb.is-active {
  border-color: #9f1239;
}

.ec-gallery__thumb img {
  width: 100%;
  height: 72px;
  object-fit: cover;
}

.ec-comments {
  grid-column: 1 / -1;
}

.ec-comment-form {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.ec-comment-list {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.ec-like-btn {
  width: fit-content;
  padding: 8px 14px;
  border: 1px solid #f3d3c0;
  border-radius: 999px;
  background: #fff7ed;
  color: #b45309;
  cursor: pointer;
}

.ec-like-btn.is-active {
  border-color: #9f1239;
  background: #9f1239;
  color: #fff;
}

.ec-pagination {
  display: flex;
  justify-content: center;
  margin-top: 24px;
}

@media (max-width: 768px) {
  .ec-hero,
  .ec-card :deep(.el-card__body) {
    padding: 24px;
  }

  .ec-card__header,
  .ec-submit-shell,
  .ec-stats-shell,
  .ec-detail {
    grid-template-columns: 1fr;
  }

  .ec-gallery__main {
    height: 280px;
  }
}
</style>
