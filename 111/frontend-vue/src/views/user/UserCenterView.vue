<script setup>
import { computed, onMounted, reactive, ref } from 'vue'
import { ElMessage } from 'element-plus'
import { UploadFilled } from '@element-plus/icons-vue'
import { useAuthStore } from '@/stores/auth'
import { getUserDashboardApi, updateUserProfileApi } from '@/api/user'

const authStore = useAuthStore()

const loading = ref(false)
const savingProfile = ref(false)
const activeTab = ref('profile')
const editDialogVisible = ref(false)

const dashboard = reactive({
  profile: null,
  summary: {
    videoWorks: 0,
    embWorks: 0,
    skillWorks: 0,
    forumTopics: 0,
    publicMessages: 0,
    contactMessages: 0,
    eventRegistrations: 0,
  },
  videoWorks: [],
  embWorks: [],
  skillWorks: [],
  forumTopics: [],
  interactionMessages: [],
  contactMessages: [],
  eventRegistrations: [],
})

const profileForm = reactive({
  display_name: '',
  phone: '',
  bio: '',
  avatar: null,
})

const displayName = computed(() => {
  return (
    dashboard.profile?.display_name ||
    dashboard.profile?.username ||
    authStore.user?.display_name ||
    authStore.user?.username ||
    '平台用户'
  )
})

const summaryCards = computed(() => [
  { label: '视频投稿', value: dashboard.summary.videoWorks, hint: '你提交到视频大赛模块的作品' },
  { label: '绣红旗投稿', value: dashboard.summary.embWorks, hint: '你提交到绣红旗大赛模块的作品' },
  { label: '技艺作品', value: dashboard.summary.skillWorks, hint: '你提交到技艺教学模块的作品' },
  { label: '论坛话题', value: dashboard.summary.forumTopics, hint: '你在互动交流里创建的话题' },
  { label: '公共留言', value: dashboard.summary.publicMessages, hint: '你在留言墙公开发布的内容' },
  { label: '联系留言', value: dashboard.summary.contactMessages, hint: '你通过联系我们提交的咨询记录' },
  { label: '活动报名', value: dashboard.summary.eventRegistrations, hint: '你提交过的活动报名记录' },
])

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

function firstEmbImage(value) {
  if (!value) return ''

  try {
    const parsed = JSON.parse(value)
    return Array.isArray(parsed) ? parsed[0] || '' : ''
  } catch {
    return value
  }
}

function formatContactType(type) {
  const map = {
    cooperation: '交流合作',
    feedback: '产品建议',
    learning: '技艺咨询',
    other: '其他事务',
  }

  return map[type] || type || '未分类'
}

function formatStatus(status) {
  const map = {
    pending: '待审核',
    approved: '已通过',
    rejected: '已退回',
    archived: '已归档',
    new: '新留言',
    processing: '处理中',
    resolved: '已解决',
  }

  return map[status] || status || '待处理'
}

function openEditDialog() {
  profileForm.display_name = dashboard.profile?.display_name || ''
  profileForm.phone = dashboard.profile?.phone || ''
  profileForm.bio = dashboard.profile?.bio || ''
  profileForm.avatar = null
  editDialogVisible.value = true
}

function onAvatarChange(file) {
  profileForm.avatar = file.raw || null
}

async function loadDashboard() {
  loading.value = true

  try {
    const result = await getUserDashboardApi()

    dashboard.profile = result.data?.profile || null
    dashboard.summary = result.data?.summary || dashboard.summary
    dashboard.videoWorks = result.data?.videoWorks || []
    dashboard.embWorks = result.data?.embWorks || []
    dashboard.skillWorks = result.data?.skillWorks || []
    dashboard.forumTopics = result.data?.forumTopics || []
    dashboard.interactionMessages = result.data?.interactionMessages || []
    dashboard.contactMessages = result.data?.contactMessages || []
    dashboard.eventRegistrations = result.data?.eventRegistrations || []
  } catch (error) {
    ElMessage.error(error.message || '用户中心数据加载失败')
  } finally {
    loading.value = false
  }
}

async function saveProfile() {
  if (!authStore.user?.id) {
    ElMessage.warning('当前登录信息异常，请重新登录后再试')
    return
  }

  savingProfile.value = true

  try {
    const payload = new FormData()
    payload.append('display_name', profileForm.display_name.trim())
    payload.append('phone', profileForm.phone.trim())
    payload.append('bio', profileForm.bio.trim())
    if (profileForm.avatar) payload.append('avatar', profileForm.avatar)

    const result = await updateUserProfileApi(payload)
    const updatedProfile = result.data

    authStore.setAuth({
      token: authStore.token,
      user: {
        ...authStore.user,
        display_name: updatedProfile?.display_name || authStore.user?.display_name,
        phone: updatedProfile?.phone || authStore.user?.phone,
        avatar_url: updatedProfile?.avatar_url || authStore.user?.avatar_url,
      },
    })

    ElMessage.success(result.message || '个人资料已更新')
    editDialogVisible.value = false
    await loadDashboard()
  } catch (error) {
    ElMessage.error(error.message || '资料更新失败')
  } finally {
    savingProfile.value = false
  }
}

onMounted(() => {
  loadDashboard()
})
</script>

<template>
  <div class="uc-page">
    <section class="uc-hero">
      <div class="uc-hero__inner">
        <span class="uc-kicker">USER CENTER</span>
        <h1>用户中心</h1>
        <p>
          这里集中展示你的个人资料、作品提交、互动记录和联系记录。
          当前已经接上我们新站里真实可用的业务数据，后续大赛模块迁过来后也会继续并入这里。
        </p>
      </div>
    </section>

    <section class="uc-summary">
      <div v-for="item in summaryCards" :key="item.label" class="uc-summary-card">
        <div class="uc-summary-card__label">{{ item.label }}</div>
        <div class="uc-summary-card__value">{{ item.value }}</div>
        <div class="uc-summary-card__hint">{{ item.hint }}</div>
      </div>
    </section>

    <div class="uc-layout">
      <el-card shadow="never" class="uc-profile-card">
        <div class="uc-profile">
          <div class="uc-avatar">
            <img
              v-if="dashboard.profile?.avatar_url"
              :src="dashboard.profile.avatar_url"
              :alt="displayName"
            />
            <span v-else>{{ displayName.slice(0, 1) }}</span>
          </div>
          <h2>{{ displayName }}</h2>
          <div class="uc-profile__meta">{{ dashboard.profile?.username || authStore.user?.username }}</div>
          <p>{{ dashboard.profile?.bio || '红旗文化数字平台用户，欢迎持续完善你的个人资料。' }}</p>
          <div class="uc-profile__tags">
            <el-tag size="small" effect="plain">{{ dashboard.profile?.role || 'user' }}</el-tag>
            <el-tag size="small" type="success">{{ dashboard.profile?.status || 'active' }}</el-tag>
          </div>
          <div class="uc-profile__info">
            <span>联系电话：{{ dashboard.profile?.phone || '未填写' }}</span>
            <span>加入时间：{{ formatDate(dashboard.profile?.created_at) }}</span>
          </div>
          <el-button type="danger" plain @click="openEditDialog">编辑资料</el-button>
        </div>
      </el-card>

      <el-card shadow="never" class="uc-main-card">
        <template #header>
          <div class="uc-card__header">
            <div>
              <h2>我的记录</h2>
              <p>优先接入当前已重做完成的模块数据，后续视频和刺绣大赛迁移后会继续补进来。</p>
            </div>
            <el-button :loading="loading" @click="loadDashboard">刷新数据</el-button>
          </div>
        </template>

        <el-tabs v-model="activeTab">
          <el-tab-pane label="个人资料" name="profile">
            <div class="uc-profile-detail">
              <article class="uc-detail-item">
                <div class="uc-detail-item__label">显示名称</div>
                <div class="uc-detail-item__value">{{ dashboard.profile?.display_name || '未设置' }}</div>
              </article>
              <article class="uc-detail-item">
                <div class="uc-detail-item__label">用户名</div>
                <div class="uc-detail-item__value">{{ dashboard.profile?.username || authStore.user?.username }}</div>
              </article>
              <article class="uc-detail-item">
                <div class="uc-detail-item__label">手机号</div>
                <div class="uc-detail-item__value">{{ dashboard.profile?.phone || '未设置' }}</div>
              </article>
              <article class="uc-detail-item">
                <div class="uc-detail-item__label">邮箱</div>
                <div class="uc-detail-item__value">{{ dashboard.profile?.email || '未设置' }}</div>
              </article>
              <article class="uc-detail-item uc-detail-item--full">
                <div class="uc-detail-item__label">个人简介</div>
                <div class="uc-detail-item__value">{{ dashboard.profile?.bio || '暂无个人简介' }}</div>
              </article>
            </div>
          </el-tab-pane>

          <el-tab-pane label="技艺作品" name="works">
            <el-empty
              v-if="!dashboard.videoWorks.length && !dashboard.embWorks.length && !dashboard.skillWorks.length && !loading"
              description="当前还没有视频、绣红旗或技艺作品记录"
            />

            <div v-if="dashboard.videoWorks.length" class="uc-section-block">
              <h3 class="uc-section-title">视频投稿</h3>
              <div class="uc-grid">
                <article v-for="item in dashboard.videoWorks" :key="`video-${item.id}`" class="uc-work-card">
                  <div class="uc-work-card__image">
                    <img v-if="item.cover_url" :src="item.cover_url" :alt="item.title" />
                    <div v-else class="uc-work-card__placeholder">封面待补图</div>
                  </div>
                  <div class="uc-work-card__body">
                    <div class="uc-work-card__meta">
                      <el-tag size="small" effect="plain">{{ formatStatus(item.status) }}</el-tag>
                      <span>{{ formatDate(item.created_at) }}</span>
                    </div>
                    <h3>{{ item.title }}</h3>
                    <p>{{ item.description || '暂无作品说明' }}</p>
                    <div class="uc-list-item__footer">{{ item.votes_count || 0 }} 票</div>
                  </div>
                </article>
              </div>
            </div>

            <div v-if="dashboard.embWorks.length" class="uc-section-block">
              <h3 class="uc-section-title">绣红旗投稿</h3>
              <div class="uc-grid">
                <article v-for="item in dashboard.embWorks" :key="`emb-${item.id}`" class="uc-work-card">
                  <div class="uc-work-card__image">
                    <img v-if="firstEmbImage(item.image_url)" :src="firstEmbImage(item.image_url)" :alt="item.title" />
                    <div v-else class="uc-work-card__placeholder">封面待补图</div>
                  </div>
                  <div class="uc-work-card__body">
                    <div class="uc-work-card__meta">
                      <el-tag size="small" effect="plain">{{ formatStatus(item.status) }}</el-tag>
                      <span>{{ formatDate(item.created_at) }}</span>
                    </div>
                    <h3>{{ item.title }}</h3>
                    <p>{{ item.description || '暂无作品说明' }}</p>
                    <div class="uc-list-item__footer">{{ item.votes_count || 0 }} 票</div>
                  </div>
                </article>
              </div>
            </div>

            <div v-if="dashboard.skillWorks.length" class="uc-section-block">
              <h3 class="uc-section-title">技艺作品</h3>
              <div class="uc-grid">
                <article v-for="item in dashboard.skillWorks" :key="`skill-${item.id}`" class="uc-work-card">
                  <div class="uc-work-card__image">
                    <img v-if="item.image_url" :src="item.image_url" :alt="item.title" />
                    <div v-else class="uc-work-card__placeholder">作品待补图</div>
                  </div>
                  <div class="uc-work-card__body">
                    <div class="uc-work-card__meta">
                      <el-tag size="small" effect="plain">{{ formatStatus(item.status) }}</el-tag>
                      <span>{{ formatDate(item.created_at) }}</span>
                    </div>
                    <h3>{{ item.title }}</h3>
                    <p>{{ item.description || '暂无作品说明' }}</p>
                  </div>
                </article>
              </div>
            </div>
          </el-tab-pane>

          <el-tab-pane label="论坛话题" name="forum">
            <el-empty v-if="!dashboard.forumTopics.length && !loading" description="当前还没有论坛话题记录" />

            <div v-else class="uc-list">
              <article v-for="item in dashboard.forumTopics" :key="item.id" class="uc-list-item">
                <div class="uc-list-item__meta">
                  <el-tag size="small" effect="plain">{{ item.section_name }}</el-tag>
                  <span>{{ formatDate(item.created_at) }}</span>
                </div>
                <h3>{{ item.title }}</h3>
                <p>{{ item.content }}</p>
                <div class="uc-list-item__footer">{{ item.replies_count || 0 }} 条回帖</div>
              </article>
            </div>
          </el-tab-pane>

          <el-tab-pane label="公共留言" name="interaction">
            <el-empty
              v-if="!dashboard.interactionMessages.length && !loading"
              description="当前还没有公共留言记录"
            />

            <div v-else class="uc-list">
              <article v-for="item in dashboard.interactionMessages" :key="item.id" class="uc-list-item">
                <div class="uc-list-item__meta">
                  <span>{{ formatDate(item.created_at) }}</span>
                  <span>{{ item.likes_count || 0 }} 次点赞</span>
                </div>
                <p>{{ item.content }}</p>
              </article>
            </div>
          </el-tab-pane>

          <el-tab-pane label="联系留言" name="contact">
            <el-empty
              v-if="!dashboard.contactMessages.length && !loading"
              description="当前还没有联系留言记录"
            />

            <div v-else class="uc-list">
              <article v-for="item in dashboard.contactMessages" :key="item.id" class="uc-list-item">
                <div class="uc-list-item__meta">
                  <el-tag size="small" effect="plain">{{ formatContactType(item.type) }}</el-tag>
                  <el-tag size="small" type="warning">{{ formatStatus(item.status) }}</el-tag>
                  <span>{{ formatDate(item.created_at) }}</span>
                </div>
                <p>{{ item.message }}</p>
                <div class="uc-list-item__footer">联系方式：{{ item.contact_way }}</div>
              </article>
            </div>
          </el-tab-pane>

          <el-tab-pane label="活动报名" name="events">
            <el-empty
              v-if="!dashboard.eventRegistrations.length && !loading"
              description="当前还没有活动报名记录"
            />

            <div v-else class="uc-list">
              <article v-for="item in dashboard.eventRegistrations" :key="item.id" class="uc-list-item">
                <div class="uc-list-item__meta">
                  <el-tag size="small" effect="plain">活动报名</el-tag>
                  <span>{{ formatDate(item.created_at) }}</span>
                </div>
                <h3>{{ item.event_title }}</h3>
                <p>{{ item.note || '暂无报名说明' }}</p>
                <div class="uc-list-item__footer">
                  <span>{{ item.event_time || '时间待定' }}</span>
                  <span>{{ item.location || '地点待定' }}</span>
                  <span>{{ item.phone }}</span>
                </div>
              </article>
            </div>
          </el-tab-pane>
        </el-tabs>
      </el-card>
    </div>

    <el-dialog v-model="editDialogVisible" title="编辑个人资料" width="560px">
      <el-form label-position="top">
        <el-form-item label="显示名称">
          <el-input v-model="profileForm.display_name" maxlength="60" show-word-limit />
        </el-form-item>
        <el-form-item label="联系电话">
          <el-input v-model="profileForm.phone" maxlength="30" show-word-limit />
        </el-form-item>
        <el-form-item label="个人简介">
          <el-input v-model="profileForm.bio" type="textarea" :rows="5" maxlength="300" show-word-limit />
        </el-form-item>
        <el-form-item label="头像">
          <el-upload
            drag
            action="#"
            :auto-upload="false"
            :show-file-list="Boolean(profileForm.avatar)"
            :limit="1"
            accept="image/*"
            :on-change="onAvatarChange"
          >
            <el-icon><UploadFilled /></el-icon>
            <div class="el-upload__text">拖拽图片到这里，或点击选择头像</div>
          </el-upload>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="editDialogVisible = false">取消</el-button>
        <el-button type="danger" :loading="savingProfile" @click="saveProfile">保存修改</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<style scoped lang="scss">
.uc-page {
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.uc-hero {
  padding: 40px;
  border-radius: 28px;
  background:
    radial-gradient(circle at top left, rgba(245, 158, 11, 0.24), transparent 22%),
    linear-gradient(135deg, #3f3cbb 0%, #0f766e 48%, #92400e 100%);
  color: #fefce8;
}

.uc-kicker {
  display: inline-flex;
  padding: 6px 12px;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.14);
  border: 1px solid rgba(255, 255, 255, 0.18);
  font-size: 12px;
  letter-spacing: 1.6px;
}

.uc-hero h1 {
  margin: 18px 0 12px;
  font-size: clamp(32px, 4vw, 48px);
}

.uc-hero p {
  max-width: 780px;
  margin: 0;
  line-height: 1.9;
  color: rgba(254, 252, 232, 0.92);
}

.uc-summary {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
  gap: 16px;
}

.uc-summary-card,
.uc-profile-card,
.uc-main-card,
.uc-detail-item,
.uc-work-card,
.uc-list-item {
  border-radius: 24px;
  border: 1px solid #e3e6f7;
  background: rgba(255, 255, 255, 0.94);
}

.uc-summary-card {
  padding: 20px;
}

.uc-summary-card__label {
  color: #4338ca;
  font-size: 13px;
}

.uc-summary-card__value {
  margin-top: 8px;
  color: #1f2937;
  font-size: 28px;
  font-weight: 700;
}

.uc-summary-card__hint {
  margin-top: 8px;
  color: #6b7280;
  font-size: 13px;
  line-height: 1.6;
}

.uc-layout {
  display: grid;
  grid-template-columns: 320px minmax(0, 1fr);
  gap: 20px;
}

.uc-profile {
  display: flex;
  flex-direction: column;
  gap: 14px;
  align-items: center;
  padding: 28px 24px;
  text-align: center;
}

.uc-avatar {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 110px;
  height: 110px;
  border-radius: 32px;
  overflow: hidden;
  background: linear-gradient(135deg, #4338ca, #0f766e);
  color: #fff;
  font-size: 42px;
  font-weight: 700;
}

.uc-avatar img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.uc-profile h2,
.uc-card__header h2,
.uc-list-item h3 {
  margin: 0;
  color: #1f2937;
}

.uc-profile__meta,
.uc-card__header p,
.uc-work-card p,
.uc-list-item p {
  color: #6b7280;
}

.uc-profile p,
.uc-list-item p {
  line-height: 1.75;
}

.uc-profile__tags,
.uc-profile__info,
.uc-card__header,
.uc-work-card__meta,
.uc-list-item__meta,
.uc-list-item__footer {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
}

.uc-profile__info,
.uc-list-item__meta,
.uc-list-item__footer {
  justify-content: center;
  color: #8a8f98;
  font-size: 13px;
}

.uc-main-card {
  border-radius: 28px;
}

.uc-card__header {
  align-items: center;
  justify-content: space-between;
}

.uc-profile-detail {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 16px;
}

.uc-detail-item {
  padding: 18px;
}

.uc-detail-item--full {
  grid-column: 1 / -1;
}

.uc-detail-item__label {
  color: #4338ca;
  font-size: 13px;
}

.uc-detail-item__value {
  margin-top: 8px;
  color: #1f2937;
  line-height: 1.75;
}

.uc-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
  gap: 18px;
}

.uc-section-block + .uc-section-block {
  margin-top: 24px;
}

.uc-section-title {
  margin: 0 0 14px;
  color: #4338ca;
}

.uc-work-card {
  overflow: hidden;
}

.uc-work-card__image {
  height: 190px;
  background: linear-gradient(135deg, #c7d2fe, #99f6e4);
}

.uc-work-card__image img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.uc-work-card__placeholder {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100%;
  color: #8a8f98;
}

.uc-work-card__body,
.uc-list-item {
  padding: 18px;
}

.uc-list {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

@media (max-width: 768px) {
  .uc-hero,
  .uc-main-card :deep(.el-card__body) {
    padding: 24px;
  }

  .uc-layout,
  .uc-profile-detail {
    grid-template-columns: 1fr;
  }

  .uc-card__header {
    flex-direction: column;
    align-items: flex-start;
  }
}
</style>
