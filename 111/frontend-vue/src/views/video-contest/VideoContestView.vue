<script setup>
import { computed, onMounted, reactive, ref } from 'vue'
import { ElMessage } from 'element-plus'
import { useAuthStore } from '@/stores/auth'
import {
  createVideoContestCommentApi,
  createVideoContestWorkApi,
  getVideoContestCommentsApi,
  getVideoContestOverviewApi,
  getVideoContestTopWorksApi,
  getVideoContestWorkDetailApi,
  getVideoContestWorksApi,
  likeVideoContestCommentApi,
  voteVideoContestWorkApi,
} from '@/api/videoContest'

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

const submitForm = reactive({
  title: '',
  phone: '',
  category: '历史沿革',
  description: '',
  cover: null,
  video: null,
})

const commentForm = reactive({
  content: '',
})

const categoryOptions = ['all', '历史沿革', '非遗技艺', '红色精神', '时代创新']

const summaryCards = computed(() => [
  { label: '已公开作品', value: overview.value.works, hint: '当前已通过审核并公开展示的视频作品' },
  { label: '累计票数', value: overview.value.votes, hint: '所有作品累计获得的有效投票数' },
  { label: '榜单作品', value: topWorks.value.length, hint: '当前出现在排行榜中的公开作品' },
])

const isLoggedIn = computed(() => authStore.isLoggedIn)

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

function onCoverChange(file) {
  submitForm.cover = file.raw || null
}

function onVideoChange(file) {
  submitForm.video = file.raw || null
}

function resetSubmitForm() {
  submitForm.title = ''
  submitForm.phone = authStore.user?.phone || ''
  submitForm.category = '历史沿革'
  submitForm.description = ''
  submitForm.cover = null
  submitForm.video = null
}

async function loadOverview() {
  const [overviewResult, topWorksResult] = await Promise.all([
    getVideoContestOverviewApi(),
    getVideoContestTopWorksApi(),
  ])

  overview.value = overviewResult.data?.summary || overview.value
  categoriesStats.value = overviewResult.data?.categories || []
  latestWorks.value = overviewResult.data?.latest || []
  topWorks.value = topWorksResult.data || []
}

async function loadWorks() {
  worksLoading.value = true

  try {
    const result = await getVideoContestWorksApi({
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
    ElMessage.error(error.message || '视频大赛数据加载失败')
  } finally {
    loading.value = false
  }
}

async function openDetail(workId) {
  detailLoading.value = true
  detailVisible.value = true

  try {
    const [detailResult, commentsResult] = await Promise.all([
      getVideoContestWorkDetailApi(workId),
      getVideoContestCommentsApi(workId, { userId: authStore.user?.id || 0 }),
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
    const result = await voteVideoContestWorkApi(work.id, {
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

  if (!submitForm.title.trim() || !submitForm.video || !submitForm.cover) {
    ElMessage.warning('请填写标题并上传封面和视频')
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
    payload.append('cover', submitForm.cover)
    payload.append('video', submitForm.video)

    const result = await createVideoContestWorkApi(payload)
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
    const result = await createVideoContestCommentApi(currentWork.value.id, {
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
    const result = await likeVideoContestCommentApi(comment.id, {
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

onMounted(() => {
  submitForm.phone = authStore.user?.phone || ''
  loadPageData()
})
</script>

<template>
  <div class="vc-page">
    <section class="vc-hero">
      <div class="vc-hero__inner">
        <span class="vc-kicker">VIDEO CONTEST</span>
        <h1>视频大赛</h1>
        <p>
          这一页承接旧站的核心赛事流程：在线评选、作品投稿、榜单展示和作品评论。
          现在已经切到新的 Vue 页面和结构化接口，后续再接后台审核就会更稳。
        </p>
      </div>
    </section>

    <section class="vc-summary">
      <div v-for="item in summaryCards" :key="item.label" class="vc-summary-card">
        <div class="vc-summary-card__label">{{ item.label }}</div>
        <div class="vc-summary-card__value">{{ item.value }}</div>
        <div class="vc-summary-card__hint">{{ item.hint }}</div>
      </div>
    </section>

    <el-card shadow="never" class="vc-card">
      <template #header>
        <div class="vc-card__header">
          <div>
            <h2>赛事内容中心</h2>
            <p>先把前台核心链路打通，后面再把后台审核、公告和更多治理能力补进来。</p>
          </div>
          <el-button :loading="loading" @click="loadPageData">刷新数据</el-button>
        </div>
      </template>

      <el-tabs v-model="activeTab">
        <el-tab-pane label="在线评选" name="vote">
          <div class="vc-toolbar">
            <el-input v-model="searchKeyword" placeholder="搜索作品标题或作者" clearable />
            <el-select v-model="currentCategory" style="width: 180px">
              <el-option v-for="item in categoryOptions" :key="item" :label="item === 'all' ? '全部赛区' : item" :value="item" />
            </el-select>
            <el-radio-group v-model="currentSort">
              <el-radio-button label="hot">最高热度</el-radio-button>
              <el-radio-button label="new">最新发布</el-radio-button>
            </el-radio-group>
            <el-button type="danger" @click="currentPage = 1; loadWorks()">筛选</el-button>
          </div>

          <el-empty v-if="!works.length && !worksLoading" description="当前还没有公开展示的参赛作品" />

          <div v-else class="vc-grid">
            <article v-for="item in works" :key="item.id" class="vc-work-card">
              <div class="vc-work-card__cover" @click="openDetail(item.id)">
                <img v-if="item.cover_url" :src="item.cover_url" :alt="item.title" />
                <div v-else class="vc-work-card__placeholder">封面待补充</div>
              </div>
              <div class="vc-work-card__body">
                <div class="vc-work-card__meta">
                  <el-tag size="small" effect="plain">{{ item.category || '未分类' }}</el-tag>
                  <span>{{ item.votes_count || 0 }} 票</span>
                </div>
                <h3>{{ item.title }}</h3>
                <p>{{ shortText(item.description) }}</p>
                <div class="vc-work-card__footer">
                  <span>{{ item.author_name }}</span>
                  <span>{{ item.comment_count || 0 }} 条评论</span>
                </div>
                <div class="vc-work-card__actions">
                  <el-button plain @click="openDetail(item.id)">查看详情</el-button>
                  <el-button type="danger" :disabled="item.has_voted > 0" @click="handleVote(item)">
                    {{ item.has_voted > 0 ? '已投票' : '投一票' }}
                  </el-button>
                </div>
              </div>
            </article>
          </div>

          <div v-if="totalPages > 1" class="vc-pagination">
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
          <div class="vc-submit-shell">
            <section class="vc-submit-intro">
              <h3>提交我的参赛作品</h3>
              <p>登录后可以提交视频作品和封面，作品将进入后台审核，通过后会出现在在线评选区。</p>
              <el-alert
                type="warning"
                :closable="false"
                title="当前版本已支持真实文件上传，正式上云前建议把视频存储切到对象存储。"
              />
            </section>

            <el-form label-position="top" class="vc-submit-form">
              <el-form-item label="作品标题">
                <el-input v-model="submitForm.title" maxlength="60" show-word-limit />
              </el-form-item>
              <el-form-item label="联系电话">
                <el-input v-model="submitForm.phone" maxlength="30" show-word-limit />
              </el-form-item>
              <el-form-item label="参赛组别">
                <el-select v-model="submitForm.category" style="width: 100%">
                  <el-option label="历史沿革" value="历史沿革" />
                  <el-option label="非遗技艺" value="非遗技艺" />
                  <el-option label="红色精神" value="红色精神" />
                  <el-option label="时代创新" value="时代创新" />
                </el-select>
              </el-form-item>
              <el-form-item label="创作理念">
                <el-input v-model="submitForm.description" type="textarea" :rows="5" maxlength="500" show-word-limit />
              </el-form-item>
              <el-form-item label="作品封面">
                <el-upload
                  drag
                  action="#"
                  :auto-upload="false"
                  :show-file-list="Boolean(submitForm.cover)"
                  :limit="1"
                  accept="image/*"
                  :on-change="onCoverChange"
                >
                  <div class="el-upload__text">拖拽封面到这里，或点击选择图片</div>
                </el-upload>
              </el-form-item>
              <el-form-item label="视频文件">
                <el-upload
                  drag
                  action="#"
                  :auto-upload="false"
                  :show-file-list="Boolean(submitForm.video)"
                  :limit="1"
                  accept="video/*"
                  :on-change="onVideoChange"
                >
                  <div class="el-upload__text">拖拽视频到这里，或点击选择文件</div>
                </el-upload>
              </el-form-item>
              <el-button type="danger" :loading="submittingWork" @click="submitWork">提交作品</el-button>
            </el-form>
          </div>
        </el-tab-pane>

        <el-tab-pane label="榜单展示" name="results">
          <el-empty v-if="!topWorks.length && !loading" description="当前还没有进入榜单的公开作品" />

          <div v-else class="vc-ranking">
            <article v-for="(item, index) in topWorks" :key="item.id" class="vc-rank-card">
              <div class="vc-rank-card__media">
                <img v-if="item.cover_url" :src="item.cover_url" :alt="item.title" />
                <div v-else class="vc-rank-card__placeholder">榜单封面待补充</div>
              </div>
              <div class="vc-rank-card__body">
                <div class="vc-rank-card__badge">TOP {{ index + 1 }}</div>
                <h3>{{ item.title }}</h3>
                <p>作者：{{ item.author_name }}</p>
                <strong>{{ item.votes_count || 0 }} 票</strong>
              </div>
            </article>
          </div>
        </el-tab-pane>

        <el-tab-pane label="赛事概览" name="stats">
          <div class="vc-stats-shell">
            <section class="vc-latest">
              <header class="vc-block-header">
                <div>
                  <h3>最新公开作品</h3>
                  <p>用于替代旧站的动态公告和赛况更新区。</p>
                </div>
              </header>
              <el-empty v-if="!latestWorks.length && !loading" description="当前还没有公开作品动态" />
              <div v-else class="vc-latest-list">
                <article v-for="item in latestWorks" :key="item.id" class="vc-latest-item">
                  <div class="vc-latest-item__meta">
                    <el-tag size="small" effect="plain">{{ item.category || '未分类' }}</el-tag>
                    <span>{{ formatDate(item.created_at) }}</span>
                  </div>
                  <h4>{{ item.title }}</h4>
                  <p>{{ item.author_name }} · {{ item.votes_count || 0 }} 票</p>
                </article>
              </div>
            </section>

            <section class="vc-category-stats">
              <header class="vc-block-header">
                <div>
                  <h3>赛区分布</h3>
                  <p>当前公开作品按赛区的分布情况。</p>
                </div>
              </header>
              <el-empty v-if="!categoriesStats.length && !loading" description="当前还没有赛区统计数据" />
              <div v-else class="vc-category-list">
                <article v-for="item in categoriesStats" :key="item.category" class="vc-category-item">
                  <strong>{{ item.category }}</strong>
                  <span>{{ item.count }} 部作品</span>
                </article>
              </div>
            </section>
          </div>
        </el-tab-pane>
      </el-tabs>
    </el-card>

    <el-drawer v-model="detailVisible" size="68%" :with-header="false">
      <el-skeleton :loading="detailLoading" animated>
        <template #template>
          <el-skeleton-item variant="rect" style="width: 100%; height: 320px" />
        </template>

        <div v-if="currentWork" class="vc-detail">
          <div class="vc-detail__media">
            <video :src="currentWork.video_url" controls preload="metadata"></video>
          </div>
          <div class="vc-detail__info">
            <div class="vc-detail__meta">
              <el-tag size="small" effect="plain">{{ currentWork.category || '未分类' }}</el-tag>
              <span>{{ currentWork.votes_count || 0 }} 票</span>
              <span>{{ formatDate(currentWork.created_at) }}</span>
            </div>
            <h2>{{ currentWork.title }}</h2>
            <p>{{ currentWork.description || '暂无作品简介' }}</p>
            <div class="vc-detail__author">作者：{{ currentWork.author_name }}</div>
            <el-button type="danger" @click="handleVote(currentWork)">为这部作品投票</el-button>
          </div>

          <section class="vc-comments">
            <header class="vc-block-header">
              <div>
                <h3>评论区</h3>
                <p>欢迎留下你对作品的看法和建议。</p>
              </div>
            </header>

            <div class="vc-comment-form">
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

            <div v-else class="vc-comment-list">
              <article v-for="item in comments" :key="item.id" class="vc-comment-item">
                <div class="vc-comment-item__header">
                  <strong>{{ item.username }}</strong>
                  <span>{{ formatDate(item.created_at) }}</span>
                </div>
                <p>{{ item.content }}</p>
                <button
                  class="vc-like-btn"
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
.vc-page {
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.vc-hero {
  padding: 40px;
  border-radius: 28px;
  background:
    radial-gradient(circle at top left, rgba(253, 224, 71, 0.24), transparent 24%),
    linear-gradient(135deg, #7f1d1d 0%, #991b1b 44%, #1f2937 100%);
  color: #fff7ed;
}

.vc-kicker {
  display: inline-flex;
  padding: 6px 12px;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.12);
  border: 1px solid rgba(255, 255, 255, 0.16);
  font-size: 12px;
  letter-spacing: 1.6px;
}

.vc-hero h1 {
  margin: 18px 0 12px;
  font-size: clamp(32px, 4vw, 48px);
}

.vc-hero p {
  max-width: 780px;
  margin: 0;
  line-height: 1.9;
  color: rgba(255, 247, 237, 0.92);
}

.vc-summary {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
  gap: 16px;
}

.vc-summary-card,
.vc-work-card,
.vc-rank-card,
.vc-latest-item,
.vc-category-item,
.vc-comment-item {
  border-radius: 24px;
  border: 1px solid #efe2da;
  background: rgba(255, 255, 255, 0.95);
}

.vc-summary-card {
  padding: 20px;
}

.vc-summary-card__label {
  color: #b45309;
  font-size: 13px;
}

.vc-summary-card__value {
  margin-top: 8px;
  color: #7f1d1d;
  font-size: 28px;
  font-weight: 700;
}

.vc-summary-card__hint {
  margin-top: 8px;
  color: #6b7280;
  font-size: 13px;
  line-height: 1.6;
}

.vc-card {
  border-radius: 28px;
}

.vc-card__header,
.vc-toolbar,
.vc-work-card__meta,
.vc-work-card__footer,
.vc-work-card__actions,
.vc-detail__meta,
.vc-comment-item__header {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
}

.vc-card__header {
  align-items: center;
  justify-content: space-between;
}

.vc-card__header h2,
.vc-block-header h3,
.vc-work-card h3,
.vc-rank-card h3,
.vc-latest-item h4,
.vc-detail__info h2 {
  margin: 0;
  color: #1f2937;
}

.vc-card__header p,
.vc-block-header p,
.vc-work-card p,
.vc-latest-item p,
.vc-detail__info p,
.vc-comment-item p {
  color: #6b7280;
  line-height: 1.75;
}

.vc-toolbar {
  align-items: center;
  margin-bottom: 18px;
}

.vc-grid,
.vc-ranking,
.vc-stats-shell {
  display: grid;
  gap: 18px;
}

.vc-grid {
  grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
}

.vc-ranking {
  grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
}

.vc-work-card,
.vc-rank-card {
  overflow: hidden;
}

.vc-work-card__cover,
.vc-rank-card__media {
  height: 200px;
  background: linear-gradient(135deg, #fee2e2, #fde68a);
  cursor: pointer;
}

.vc-work-card__cover img,
.vc-rank-card__media img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.vc-work-card__placeholder,
.vc-rank-card__placeholder {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100%;
  color: #9ca3af;
}

.vc-work-card__body,
.vc-rank-card__body,
.vc-latest-item,
.vc-category-item,
.vc-comment-item {
  padding: 18px;
}

.vc-work-card__footer,
.vc-detail__meta,
.vc-comment-item__header {
  color: #8a8f98;
  font-size: 13px;
}

.vc-rank-card__badge {
  display: inline-flex;
  padding: 6px 10px;
  border-radius: 999px;
  background: #7f1d1d;
  color: #fff;
  font-size: 12px;
  font-weight: 700;
}

.vc-submit-shell,
.vc-stats-shell,
.vc-detail {
  display: grid;
  grid-template-columns: minmax(260px, 0.8fr) minmax(0, 1.2fr);
  gap: 20px;
}

.vc-submit-intro,
.vc-submit-form,
.vc-latest,
.vc-category-stats,
.vc-detail__info,
.vc-comments {
  padding: 24px;
  border-radius: 24px;
  border: 1px solid #efe2da;
  background: #fffdfa;
}

.vc-submit-intro h3,
.vc-detail__author {
  color: #7f1d1d;
}

.vc-detail__media video {
  width: 100%;
  border-radius: 24px;
  background: #111827;
}

.vc-comments {
  grid-column: 1 / -1;
}

.vc-comment-form {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.vc-comment-list {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.vc-like-btn {
  width: fit-content;
  padding: 8px 14px;
  border: 1px solid #f3d3c0;
  border-radius: 999px;
  background: #fff7ed;
  color: #b45309;
  cursor: pointer;
}

.vc-like-btn.is-active {
  border-color: #b91c1c;
  background: #b91c1c;
  color: #fff;
}

.vc-pagination {
  display: flex;
  justify-content: center;
  margin-top: 24px;
}

@media (max-width: 768px) {
  .vc-hero,
  .vc-card :deep(.el-card__body) {
    padding: 24px;
  }

  .vc-card__header,
  .vc-submit-shell,
  .vc-stats-shell,
  .vc-detail {
    grid-template-columns: 1fr;
  }
}
</style>
