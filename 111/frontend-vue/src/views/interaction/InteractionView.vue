<script setup>
import { computed, onMounted, reactive, ref, watch } from 'vue'
import { ElMessage } from 'element-plus'
import { useAuthStore } from '@/stores/auth'
import {
  createForumCommentApi,
  createForumPostApi,
  createForumTopicApi,
  createInteractionMessageApi,
  getForumPostCommentsApi,
  getForumSectionsApi,
  getForumTopicDetailApi,
  getForumTopicsApi,
  getInteractionEventsApi,
  getInteractionMessagesApi,
  getInteractionOverviewApi,
  likeInteractionMessageApi,
  registerInteractionEventApi,
  toggleForumCommentLikeApi,
} from '@/api/interaction'

const authStore = useAuthStore()

const activeTab = ref('forum')
const loading = ref(false)
const submittingMessage = ref(false)
const submittingTopic = ref(false)
const submittingPost = ref(false)
const submittingComment = ref(false)
const submittingRegistration = ref(false)

const summary = ref({
  sections: 0,
  topics: 0,
  messages: 0,
  events: 0,
})
const latest = ref([])
const sections = ref([])
const topics = ref([])
const messages = ref([])
const events = ref([])

const selectedSectionId = ref('all')
const selectedTopic = ref(null)
const selectedPost = ref(null)
const comments = ref([])

const topicDialogVisible = ref(false)
const postDialogVisible = ref(false)
const eventDialogVisible = ref(false)

const topicForm = reactive({
  section_id: '',
  title: '',
  content: '',
})

const postForm = reactive({
  title: '',
  content: '',
  image: null,
})

const messageForm = reactive({
  content: '',
  image: null,
})

const commentForm = reactive({
  content: '',
})

const eventForm = reactive({
  eventId: '',
  phone: '',
  note: '',
})

const isLoggedIn = computed(() => authStore.isLoggedIn)

const summaryCards = computed(() => [
  { label: '论坛分区', value: summary.value.sections, hint: '按主题组织的交流入口数量。' },
  { label: '公开话题', value: summary.value.topics, hint: '当前前台可访问的话题总数。' },
  { label: '留言动态', value: summary.value.messages, hint: '留言墙中已经公开展示的内容数量。' },
  { label: '报名活动', value: summary.value.events, hint: '当前开放报名的互动活动数量。' },
])

const filteredTopics = computed(() => {
  if (selectedSectionId.value === 'all') return topics.value
  return topics.value.filter((item) => item.section_id === Number(selectedSectionId.value))
})

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

function shortText(value, max = 90) {
  if (!value) return '暂无内容简介'
  return value.length > max ? `${value.slice(0, max)}...` : value
}

function formatLatestCategory(value) {
  const map = {
    topic: '论坛话题',
    message: '留言动态',
    event: '活动报名',
  }
  return map[value] || '互动动态'
}

function resetTopicForm() {
  topicForm.section_id = sections.value[0]?.id || ''
  topicForm.title = ''
  topicForm.content = ''
}

function resetPostForm() {
  postForm.title = ''
  postForm.content = ''
  postForm.image = null
}

function resetMessageForm() {
  messageForm.content = ''
  messageForm.image = null
}

function onPostFileChange(file) {
  postForm.image = file.raw || null
}

function onMessageFileChange(file) {
  messageForm.image = file.raw || null
}

async function loadOverview() {
  const result = await getInteractionOverviewApi()
  summary.value = result.data?.summary || summary.value
  latest.value = result.data?.latest || []
}

async function loadForum() {
  const [sectionsResult, topicsResult] = await Promise.all([
    getForumSectionsApi(),
    getForumTopicsApi(),
  ])

  sections.value = sectionsResult.data || []
  topics.value = topicsResult.data || []

  if (!topicForm.section_id && sections.value.length) {
    topicForm.section_id = sections.value[0].id
  }
}

async function loadMessages() {
  const result = await getInteractionMessagesApi()
  messages.value = result.data || []
}

async function loadEvents() {
  const result = await getInteractionEventsApi()
  events.value = result.data || []
}

async function loadData() {
  loading.value = true

  try {
    await Promise.all([loadOverview(), loadForum(), loadMessages(), loadEvents()])
  } catch (error) {
    ElMessage.error(error.message || '互动交流数据加载失败')
  } finally {
    loading.value = false
  }
}

async function openTopic(topic) {
  try {
    const result = await getForumTopicDetailApi(topic.id)
    selectedTopic.value = result.data
    selectedPost.value = null
    comments.value = []
  } catch (error) {
    ElMessage.error(error.message || '话题详情加载失败')
  }
}

async function openPost(post) {
  selectedPost.value = post

  try {
    const result = await getForumPostCommentsApi(post.id)
    comments.value = result.data || []
  } catch (error) {
    ElMessage.error(error.message || '评论加载失败')
  }
}

async function submitTopic() {
  if (!isLoggedIn.value) {
    ElMessage.warning('请先登录后再创建话题')
    return
  }

  if (!topicForm.section_id || !topicForm.title.trim() || !topicForm.content.trim()) {
    ElMessage.warning('请填写完整的话题信息')
    return
  }

  submittingTopic.value = true

  try {
    await createForumTopicApi({
      section_id: topicForm.section_id,
      title: topicForm.title.trim(),
      content: topicForm.content.trim(),
    })

    ElMessage.success('话题创建成功')
    topicDialogVisible.value = false
    resetTopicForm()
    await loadOverview()
    await loadForum()
  } catch (error) {
    ElMessage.error(error.message || '话题创建失败')
  } finally {
    submittingTopic.value = false
  }
}

async function submitPost() {
  if (!isLoggedIn.value) {
    ElMessage.warning('请先登录后再发布回帖')
    return
  }

  if (!selectedTopic.value) {
    ElMessage.warning('请先选择一个话题')
    return
  }

  if (!postForm.content.trim()) {
    ElMessage.warning('请填写回帖内容')
    return
  }

  submittingPost.value = true

  try {
    const payload = new FormData()
    payload.append('title', postForm.title.trim())
    payload.append('content', postForm.content.trim())
    if (postForm.image) payload.append('image', postForm.image)

    await createForumPostApi(selectedTopic.value.id, payload)
    ElMessage.success('回帖发布成功')
    postDialogVisible.value = false
    resetPostForm()
    await openTopic(selectedTopic.value)
    await loadOverview()
    await loadForum()
  } catch (error) {
    ElMessage.error(error.message || '回帖发布失败')
  } finally {
    submittingPost.value = false
  }
}

async function submitComment() {
  if (!isLoggedIn.value) {
    ElMessage.warning('请先登录后再评论')
    return
  }

  if (!selectedPost.value) {
    ElMessage.warning('请先选择一条回帖')
    return
  }

  if (!commentForm.content.trim()) {
    ElMessage.warning('请填写评论内容')
    return
  }

  submittingComment.value = true

  try {
    const currentPostId = selectedPost.value.id

    await createForumCommentApi(selectedPost.value.id, {
      content: commentForm.content.trim(),
    })

    commentForm.content = ''
    ElMessage.success('评论发布成功')
    await openTopic(selectedTopic.value)
    const updatedPost = selectedTopic.value?.posts?.find((item) => item.id === currentPostId)
    if (updatedPost) await openPost(updatedPost)
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
    const result = await toggleForumCommentLikeApi(comment.id)

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

async function submitMessage() {
  if (!isLoggedIn.value) {
    ElMessage.warning('请先登录后再留言')
    return
  }

  if (!messageForm.content.trim()) {
    ElMessage.warning('请填写留言内容')
    return
  }

  submittingMessage.value = true

  try {
    const payload = new FormData()
    payload.append('content', messageForm.content.trim())
    if (messageForm.image) payload.append('image', messageForm.image)

    await createInteractionMessageApi(payload)
    ElMessage.success('留言发布成功')
    resetMessageForm()
    await loadMessages()
    await loadOverview()
  } catch (error) {
    ElMessage.error(error.message || '留言发布失败')
  } finally {
    submittingMessage.value = false
  }
}

async function likeMessage(message) {
  try {
    await likeInteractionMessageApi(message.id)
    message.likes_count += 1
  } catch (error) {
    ElMessage.error(error.message || '留言点赞失败')
  }
}

function openEventDialog(event) {
  if (!isLoggedIn.value) {
    ElMessage.warning('请先登录后再报名活动')
    return
  }

  eventForm.eventId = event.id
  eventForm.phone = authStore.user?.phone || ''
  eventForm.note = ''
  eventDialogVisible.value = true
}

async function submitEventRegistration() {
  if (!eventForm.eventId || !eventForm.phone.trim()) {
    ElMessage.warning('请填写完整的报名信息')
    return
  }

  submittingRegistration.value = true

  try {
    await registerInteractionEventApi(eventForm.eventId, {
      phone: eventForm.phone.trim(),
      note: eventForm.note.trim(),
    })

    ElMessage.success('活动报名成功')
    eventDialogVisible.value = false
    await loadEvents()
    await loadOverview()
  } catch (error) {
    ElMessage.error(error.message || '活动报名失败')
  } finally {
    submittingRegistration.value = false
  }
}

watch(selectedSectionId, () => {
  selectedTopic.value = null
  selectedPost.value = null
  comments.value = []
})

onMounted(() => {
  loadData()
})
</script>

<template>
  <div class="ia-page">
    <section class="ia-hero">
      <div class="ia-hero__inner">
        <span class="ia-kicker">INTERACTION</span>
        <h1>互动交流</h1>
        <p>
          这一页承接论坛、留言墙和活动报名三块核心互动能力。
          现在已经整理成统一的前台结构，方便继续补充审核、运营和回归测试。
        </p>
      </div>
    </section>

    <section class="ia-summary">
      <div v-for="item in summaryCards" :key="item.label" class="ia-summary-card">
        <div class="ia-summary-card__label">{{ item.label }}</div>
        <div class="ia-summary-card__value">{{ item.value }}</div>
        <div class="ia-summary-card__hint">{{ item.hint }}</div>
      </div>
    </section>

    <section class="ia-latest">
      <article v-for="item in latest" :key="`${item.category}-${item.id}`" class="ia-latest-card">
        <div class="ia-latest-card__tag">{{ formatLatestCategory(item.category) }}</div>
        <h3>{{ item.title || item.author_name }}</h3>
        <p>{{ shortText(item.content || item.location || item.section_name || item.event_time) }}</p>
        <span>{{ formatDate(item.created_at) }}</span>
      </article>
    </section>

    <el-card shadow="never" class="ia-card">
      <template #header>
        <div class="ia-card__header">
          <div>
            <h2>互动内容中心</h2>
            <p>先把社区入口、留言互动和活动报名做通，后面再补后台治理和审核能力。</p>
          </div>
          <div class="ia-card__actions">
            <el-button :loading="loading" @click="loadData">刷新数据</el-button>
            <el-button type="danger" @click="topicDialogVisible = true">创建话题</el-button>
          </div>
        </div>
      </template>

      <el-tabs v-model="activeTab">
        <el-tab-pane label="论坛区" name="forum">
          <div class="ia-sections">
            <button
              class="ia-section-chip"
              :class="{ 'is-active': selectedSectionId === 'all' }"
              @click="selectedSectionId = 'all'"
            >
              全部分区
            </button>
            <button
              v-for="item in sections"
              :key="item.id"
              class="ia-section-chip"
              :class="{ 'is-active': selectedSectionId === item.id }"
              @click="selectedSectionId = item.id"
            >
              {{ item.name }}
            </button>
          </div>

          <div class="ia-forum-grid">
            <section class="ia-topics">
              <header class="ia-block-header">
                <div>
                  <h3>话题列表</h3>
                  <p>点击左侧任意话题，可以查看主帖、回帖和评论详情。</p>
                </div>
              </header>

              <el-empty v-if="!filteredTopics.length && !loading" description="当前还没有可展示的话题" />

              <div v-else class="ia-topic-list">
                <article
                  v-for="item in filteredTopics"
                  :key="item.id"
                  class="ia-topic-card"
                  :class="{ 'is-active': selectedTopic?.id === item.id }"
                  @click="openTopic(item)"
                >
                  <div class="ia-topic-card__meta">
                    <el-tag size="small" effect="plain">{{ item.section_name }}</el-tag>
                    <el-tag v-if="item.is_pinned" size="small" type="warning">置顶</el-tag>
                  </div>
                  <h4>{{ item.title }}</h4>
                  <p>{{ shortText(item.content) }}</p>
                  <div class="ia-topic-card__footer">
                    <span>{{ item.author_name }}</span>
                    <span>{{ item.replies_count || 0 }} 条回帖</span>
                    <span>{{ formatDate(item.created_at) }}</span>
                  </div>
                </article>
              </div>
            </section>

            <section class="ia-topic-detail">
              <el-empty v-if="!selectedTopic" description="从左侧选择一个话题查看详情" />

              <div v-else class="ia-detail-shell">
                <article class="ia-topic-detail__hero">
                  <div class="ia-topic-detail__tags">
                    <el-tag effect="plain">{{ selectedTopic.section_name }}</el-tag>
                    <el-tag type="danger" size="small">{{ selectedTopic.replies_count || 0 }} 条回帖</el-tag>
                  </div>
                  <h3>{{ selectedTopic.title }}</h3>
                  <p>{{ selectedTopic.content }}</p>
                  <div class="ia-topic-detail__footer">
                    <span>作者：{{ selectedTopic.author_name }}</span>
                    <span>创建于：{{ formatDate(selectedTopic.created_at) }}</span>
                  </div>
                  <el-button type="danger" plain @click="postDialogVisible = true">在这个话题下回帖</el-button>
                </article>

                <section class="ia-posts">
                  <header class="ia-block-header">
                    <div>
                      <h3>话题回帖</h3>
                      <p>选择一条回帖后，可以继续查看评论和点赞互动。</p>
                    </div>
                  </header>

                  <el-empty v-if="!selectedTopic.posts?.length" description="当前话题下还没有回帖，欢迎你来发第一条" />

                  <div v-else class="ia-post-list">
                    <article
                      v-for="item in selectedTopic.posts"
                      :key="item.id"
                      class="ia-post-card"
                      :class="{ 'is-active': selectedPost?.id === item.id }"
                      @click="openPost(item)"
                    >
                      <div class="ia-post-card__header">
                        <h4>{{ item.title || '无标题回帖' }}</h4>
                        <span>{{ item.comments_count || 0 }} 条评论</span>
                      </div>
                      <p>{{ shortText(item.content, 120) }}</p>
                      <div class="ia-post-card__footer">
                        <span>{{ item.author_name }}</span>
                        <span>{{ formatDate(item.created_at) }}</span>
                      </div>
                    </article>
                  </div>
                </section>

                <section class="ia-comments">
                  <header class="ia-block-header">
                    <div>
                      <h3>评论区</h3>
                      <p>{{ selectedPost ? '当前展示所选回帖的评论列表。' : '先选择一条回帖，再查看评论。' }}</p>
                    </div>
                  </header>

                  <el-empty v-if="!selectedPost" description="先选择一条回帖" />

                  <template v-else>
                    <article class="ia-comment-focus">
                      <h4>{{ selectedPost.title || '无标题回帖' }}</h4>
                      <p>{{ selectedPost.content }}</p>
                    </article>

                    <el-empty v-if="!comments.length" description="当前还没有评论" />

                    <div v-else class="ia-comment-list">
                      <article v-for="item in comments" :key="item.id" class="ia-comment-card">
                        <div class="ia-comment-card__header">
                          <strong>{{ item.author_name }}</strong>
                          <span>{{ formatDate(item.created_at) }}</span>
                        </div>
                        <p>{{ item.content }}</p>
                        <button
                          class="ia-like-btn"
                          :class="{ 'is-active': item.is_liked }"
                          @click="toggleCommentLike(item)"
                        >
                          赞 {{ item.likes_count || 0 }}
                        </button>
                      </article>
                    </div>

                    <div class="ia-comment-form">
                      <el-input
                        v-model="commentForm.content"
                        type="textarea"
                        :rows="3"
                        maxlength="240"
                        show-word-limit
                        placeholder="写下你的评论"
                      />
                      <el-button type="danger" :loading="submittingComment" @click="submitComment">
                        发布评论
                      </el-button>
                    </div>
                  </template>
                </section>
              </div>
            </section>
          </div>
        </el-tab-pane>

        <el-tab-pane label="留言墙" name="messages">
          <div class="ia-message-shell">
            <section class="ia-message-form">
              <h3>发布留言</h3>
              <p>这里适合发布简短感想、活动反馈或平台建议，作为更轻量的社区互动入口。</p>
              <el-input
                v-model="messageForm.content"
                type="textarea"
                :rows="5"
                maxlength="200"
                show-word-limit
                placeholder="写下你的留言"
              />
              <el-upload
                drag
                action="#"
                :auto-upload="false"
                :show-file-list="Boolean(messageForm.image)"
                :limit="1"
                accept="image/*"
                :on-change="onMessageFileChange"
              >
                <div class="el-upload__text">可选上传一张配图</div>
              </el-upload>
              <el-button type="danger" :loading="submittingMessage" @click="submitMessage">提交留言</el-button>
            </section>

            <section class="ia-message-list">
              <header class="ia-block-header">
                <div>
                  <h3>最新留言</h3>
                  <p>留言按时间倒序展示，适合作为社区轻互动和测试入口。</p>
                </div>
              </header>

              <el-empty v-if="!messages.length && !loading" description="当前还没有留言内容" />

              <div v-else class="ia-message-grid">
                <article v-for="item in messages" :key="item.id" class="ia-message-card">
                  <div class="ia-message-card__header">
                    <strong>{{ item.display_name || item.author_name }}</strong>
                    <span>{{ formatDate(item.created_at) }}</span>
                  </div>
                  <p>{{ item.content }}</p>
                  <img v-if="item.image_url" :src="item.image_url" :alt="item.author_name" />
                  <button class="ia-like-btn" @click="likeMessage(item)">赞 {{ item.likes_count || 0 }}</button>
                </article>
              </div>
            </section>
          </div>
        </el-tab-pane>

        <el-tab-pane label="活动报名" name="events">
          <el-empty v-if="!events.length && !loading" description="当前还没有公开活动" />

          <div v-else class="ia-events-grid">
            <article v-for="item in events" :key="item.id" class="ia-event-card">
              <div class="ia-event-card__media">
                <img v-if="item.cover_image" :src="item.cover_image" :alt="item.title" />
                <div v-else class="ia-event-card__placeholder">活动封面待补充</div>
              </div>
              <div class="ia-event-card__body">
                <h3>{{ item.title }}</h3>
                <p>{{ item.description || '暂无活动说明' }}</p>
                <div class="ia-event-card__meta">
                  <span>{{ item.event_time || '时间待定' }}</span>
                  <span>{{ item.location || '地点待定' }}</span>
                  <span>{{ item.registration_count || 0 }} 人已报名</span>
                </div>
                <div class="ia-event-card__requirements">
                  {{ item.form_requirements || '报名时请填写真实联系方式和参与说明。' }}
                </div>
                <el-button type="danger" plain @click="openEventDialog(item)">立即报名</el-button>
              </div>
            </article>
          </div>
        </el-tab-pane>
      </el-tabs>
    </el-card>

    <el-dialog v-model="topicDialogVisible" title="创建新话题" width="560px">
      <el-form label-position="top">
        <el-form-item label="所属分区">
          <el-select v-model="topicForm.section_id" placeholder="请选择论坛分区" style="width: 100%">
            <el-option v-for="item in sections" :key="item.id" :label="item.name" :value="item.id" />
          </el-select>
        </el-form-item>
        <el-form-item label="话题标题">
          <el-input v-model="topicForm.title" maxlength="60" show-word-limit />
        </el-form-item>
        <el-form-item label="话题内容">
          <el-input v-model="topicForm.content" type="textarea" :rows="6" maxlength="1000" show-word-limit />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="topicDialogVisible = false">取消</el-button>
        <el-button type="danger" :loading="submittingTopic" @click="submitTopic">发布话题</el-button>
      </template>
    </el-dialog>

    <el-dialog v-model="postDialogVisible" title="发布新回帖" width="560px">
      <el-form label-position="top">
        <el-form-item label="回帖标题">
          <el-input v-model="postForm.title" maxlength="60" show-word-limit />
        </el-form-item>
        <el-form-item label="回帖内容">
          <el-input v-model="postForm.content" type="textarea" :rows="6" maxlength="1200" show-word-limit />
        </el-form-item>
        <el-form-item label="附加图片">
          <el-upload
            drag
            action="#"
            :auto-upload="false"
            :show-file-list="Boolean(postForm.image)"
            :limit="1"
            accept="image/*"
            :on-change="onPostFileChange"
          >
            <div class="el-upload__text">可选上传一张图片辅助说明</div>
          </el-upload>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="postDialogVisible = false">取消</el-button>
        <el-button type="danger" :loading="submittingPost" @click="submitPost">发布回帖</el-button>
      </template>
    </el-dialog>

    <el-dialog v-model="eventDialogVisible" title="活动报名" width="520px">
      <el-form label-position="top">
        <el-form-item label="联系电话">
          <el-input v-model="eventForm.phone" />
        </el-form-item>
        <el-form-item label="报名说明">
          <el-input v-model="eventForm.note" type="textarea" :rows="5" maxlength="300" show-word-limit />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="eventDialogVisible = false">取消</el-button>
        <el-button type="danger" :loading="submittingRegistration" @click="submitEventRegistration">
          提交报名
        </el-button>
      </template>
    </el-dialog>
  </div>
</template>

<style scoped lang="scss">
.ia-page {
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.ia-hero {
  padding: 40px;
  border-radius: 28px;
  background:
    radial-gradient(circle at top left, rgba(96, 165, 250, 0.22), transparent 22%),
    linear-gradient(135deg, #0f172a 0%, #1d4ed8 46%, #9a3412 100%);
  color: #eff6ff;
}

.ia-kicker {
  display: inline-flex;
  padding: 6px 12px;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.12);
  border: 1px solid rgba(255, 255, 255, 0.16);
  font-size: 12px;
  letter-spacing: 1.6px;
}

.ia-hero h1 {
  margin: 18px 0 12px;
  font-size: clamp(32px, 4vw, 48px);
}

.ia-hero p {
  max-width: 780px;
  margin: 0;
  line-height: 1.9;
  color: rgba(239, 246, 255, 0.92);
}

.ia-summary,
.ia-latest,
.ia-events-grid,
.ia-message-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: 16px;
}

.ia-summary-card,
.ia-latest-card,
.ia-topic-card,
.ia-topic-detail__hero,
.ia-post-card,
.ia-comment-focus,
.ia-comment-card,
.ia-message-form,
.ia-message-card,
.ia-event-card {
  border-radius: 24px;
  border: 1px solid #dce6f6;
  background: rgba(255, 255, 255, 0.94);
}

.ia-summary-card {
  padding: 20px;
}

.ia-summary-card__label {
  color: #1d4ed8;
  font-size: 13px;
}

.ia-summary-card__value {
  margin-top: 8px;
  color: #0f172a;
  font-size: 28px;
  font-weight: 700;
}

.ia-summary-card__hint {
  margin-top: 8px;
  color: #6b7280;
  line-height: 1.6;
  font-size: 13px;
}

.ia-latest-card {
  padding: 18px;
}

.ia-latest-card__tag {
  display: inline-flex;
  padding: 4px 10px;
  border-radius: 999px;
  background: #eff6ff;
  color: #1d4ed8;
  font-size: 12px;
}

.ia-latest-card h3,
.ia-card__header h2,
.ia-block-header h3,
.ia-topic-card h4,
.ia-topic-detail__hero h3,
.ia-post-card h4,
.ia-comment-focus h4,
.ia-message-form h3,
.ia-event-card h3 {
  margin: 0;
  color: #0f172a;
}

.ia-latest-card p,
.ia-topic-card p,
.ia-topic-detail__hero p,
.ia-post-card p,
.ia-comment-card p,
.ia-comment-focus p,
.ia-message-card p,
.ia-event-card p {
  color: #5f6368;
  line-height: 1.75;
}

.ia-latest-card span {
  color: #8a8f98;
  font-size: 13px;
}

.ia-card {
  border-radius: 28px;
}

.ia-card__header,
.ia-card__actions,
.ia-message-shell,
.ia-event-card__meta,
.ia-topic-card__footer,
.ia-post-card__footer,
.ia-topic-detail__footer,
.ia-comment-card__header,
.ia-message-card__header,
.ia-post-card__header {
  display: flex;
  gap: 12px;
}

.ia-card__header {
  align-items: center;
  justify-content: space-between;
}

.ia-card__header p,
.ia-block-header p {
  margin: 8px 0 0;
  color: #6b7280;
}

.ia-sections {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  margin-bottom: 18px;
}

.ia-section-chip {
  padding: 10px 16px;
  border-radius: 999px;
  border: 1px solid #dbeafe;
  background: #f8fbff;
  color: #1e3a8a;
  cursor: pointer;
}

.ia-section-chip.is-active {
  border-color: #2563eb;
  background: #2563eb;
  color: #fff;
}

.ia-forum-grid {
  display: grid;
  grid-template-columns: minmax(300px, 0.85fr) minmax(0, 1.15fr);
  gap: 20px;
}

.ia-topics,
.ia-topic-detail,
.ia-posts,
.ia-comments {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.ia-topic-list,
.ia-post-list,
.ia-comment-list {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.ia-topic-card,
.ia-post-card {
  cursor: pointer;
  transition:
    transform 0.2s ease,
    border-color 0.2s ease,
    box-shadow 0.2s ease;
}

.ia-topic-card,
.ia-post-card,
.ia-comment-focus,
.ia-comment-card,
.ia-message-form,
.ia-message-card,
.ia-event-card__body {
  padding: 18px;
}

.ia-topic-card:hover,
.ia-topic-card.is-active,
.ia-post-card:hover,
.ia-post-card.is-active {
  transform: translateY(-2px);
  border-color: #93c5fd;
  box-shadow: 0 14px 28px rgba(37, 99, 235, 0.08);
}

.ia-topic-card__meta,
.ia-topic-detail__tags {
  display: flex;
  gap: 8px;
}

.ia-topic-card__footer,
.ia-post-card__footer,
.ia-topic-detail__footer,
.ia-event-card__meta,
.ia-comment-card__header,
.ia-message-card__header,
.ia-post-card__header {
  flex-wrap: wrap;
  color: #8a8f98;
  font-size: 13px;
}

.ia-detail-shell {
  display: flex;
  flex-direction: column;
  gap: 18px;
}

.ia-comment-form {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.ia-like-btn {
  width: fit-content;
  padding: 8px 14px;
  border: 1px solid #dbeafe;
  border-radius: 999px;
  background: #f8fbff;
  color: #1e40af;
  cursor: pointer;
}

.ia-like-btn.is-active {
  border-color: #2563eb;
  background: #2563eb;
  color: #fff;
}

.ia-message-shell {
  align-items: start;
  grid-template-columns: minmax(280px, 0.7fr) minmax(0, 1.3fr);
}

.ia-message-form {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.ia-message-card img,
.ia-event-card__media img {
  width: 100%;
  border-radius: 18px;
  object-fit: cover;
}

.ia-event-card {
  overflow: hidden;
}

.ia-event-card__media {
  height: 200px;
  background: linear-gradient(135deg, #dbeafe, #fed7aa);
}

.ia-event-card__placeholder {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100%;
  color: #8a8f98;
  font-size: 14px;
}

.ia-event-card__body {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.ia-event-card__requirements {
  padding: 12px 14px;
  border-radius: 16px;
  background: #fff7ed;
  color: #9a3412;
  line-height: 1.7;
  font-size: 14px;
}

@media (max-width: 768px) {
  .ia-hero,
  .ia-card :deep(.el-card__body) {
    padding: 24px;
  }

  .ia-card__header,
  .ia-message-shell,
  .ia-forum-grid {
    grid-template-columns: 1fr;
  }
}
</style>
