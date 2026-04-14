<script setup>
import { computed, onMounted, reactive, ref, watch } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { getAdminUsersApi, updateAdminUserApi } from '@/api/admin'

const loading = ref(false)
const keyword = ref('')
const roleFilter = ref('all')
const statusFilter = ref('all')

const userState = reactive({
  items: [],
  currentPage: 1,
  totalPages: 1,
  total: 0,
  roleSummary: {
    user: 0,
    admin: 0,
    moderator: 0,
  },
  statusSummary: {
    active: 0,
    inactive: 0,
    banned: 0,
  },
})

const roleOptions = [
  { label: '全部角色', value: 'all' },
  { label: '普通用户', value: 'user' },
  { label: '管理员', value: 'admin' },
  { label: '协管员', value: 'moderator' },
]

const statusOptions = [
  { label: '全部状态', value: 'all' },
  { label: '正常', value: 'active' },
  { label: '停用', value: 'inactive' },
  { label: '封禁', value: 'banned' },
]

const overviewCards = computed(() => [
  {
    title: '活跃账号',
    value: userState.statusSummary.active,
    hint: '当前可正常登录并继续参与前台功能的用户数量',
  },
  {
    title: '后台账号',
    value: userState.roleSummary.admin + userState.roleSummary.moderator,
    hint: `管理员 ${userState.roleSummary.admin} 个，协管员 ${userState.roleSummary.moderator} 个`,
  },
  {
    title: '风险账号',
    value: userState.statusSummary.inactive + userState.statusSummary.banned,
    hint: `停用 ${userState.statusSummary.inactive} 个，封禁 ${userState.statusSummary.banned} 个`,
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

function getRoleLabel(role) {
  const map = {
    user: '普通用户',
    admin: '管理员',
    moderator: '协管员',
  }

  return map[role] || role || '未知角色'
}

function getRoleTagType(role) {
  const map = {
    user: 'info',
    admin: 'danger',
    moderator: 'warning',
  }

  return map[role] || 'info'
}

function getStatusLabel(status) {
  const map = {
    active: '正常',
    inactive: '停用',
    banned: '封禁',
  }

  return map[status] || status || '未知状态'
}

function getStatusTagType(status) {
  const map = {
    active: 'success',
    inactive: 'warning',
    banned: 'danger',
  }

  return map[status] || 'info'
}

async function loadUsers() {
  loading.value = true

  try {
    const result = await getAdminUsersApi({
      keyword: keyword.value.trim(),
      role: roleFilter.value,
      status: statusFilter.value,
      page: userState.currentPage,
      limit: 8,
    })

    userState.items = result.data?.items || []
    userState.currentPage = result.data?.currentPage || 1
    userState.totalPages = result.data?.totalPages || 1
    userState.total = result.data?.total || 0
    userState.roleSummary = result.data?.roleSummary || userState.roleSummary
    userState.statusSummary = result.data?.statusSummary || userState.statusSummary
  } catch (error) {
    ElMessage.error(error.message || '加载用户列表失败')
  } finally {
    loading.value = false
  }
}

function handleSearch() {
  userState.currentPage = 1
  loadUsers()
}

function changePage(page) {
  userState.currentPage = page
  loadUsers()
}

async function updateUser(item, payload, label) {
  try {
    await ElMessageBox.confirm(`确认将用户“${item.display_name || item.username}”更新为${label}吗？`, '更新确认', {
      type: payload.status === 'banned' ? 'warning' : 'info',
    })

    await updateAdminUserApi(item.id, payload)
    ElMessage.success('用户信息已更新')
    await loadUsers()
  } catch (error) {
    if (error !== 'cancel') {
      ElMessage.error(error.message || '更新用户失败')
    }
  }
}

watch([roleFilter, statusFilter], () => {
  userState.currentPage = 1
  loadUsers()
})

onMounted(() => {
  loadUsers()
})
</script>

<template>
  <div class="users-page">
    <section class="users-hero">
      <div>
        <p class="users-kicker">USER CONTROL</p>
        <h1>用户管理台</h1>
        <p class="users-desc">
          这里用于查看平台用户、调整后台权限，以及处理停用和封禁状态，保障平台账号秩序与使用安全。
        </p>
      </div>
      <el-button type="danger" plain :loading="loading" @click="loadUsers">刷新用户数据</el-button>
    </section>

    <section class="users-overview">
      <article v-for="item in overviewCards" :key="item.title" class="users-overview__card">
        <span>{{ item.title }}</span>
        <strong>{{ item.value }}</strong>
        <p>{{ item.hint }}</p>
      </article>
    </section>

    <section class="users-panel">
      <div class="users-panel__toolbar">
        <div>
          <h2>用户筛选</h2>
          <p>支持按关键词、角色和账号状态快速定位用户。</p>
        </div>
        <div class="users-panel__filters">
          <el-input
            v-model="keyword"
            placeholder="搜索用户名、昵称、邮箱或手机号"
            clearable
            style="width: 260px"
            @keyup.enter="handleSearch"
          />
          <el-select v-model="roleFilter" style="width: 150px">
            <el-option v-for="item in roleOptions" :key="item.value" :label="item.label" :value="item.value" />
          </el-select>
          <el-select v-model="statusFilter" style="width: 150px">
            <el-option v-for="item in statusOptions" :key="item.value" :label="item.label" :value="item.value" />
          </el-select>
          <el-button type="danger" @click="handleSearch">搜索</el-button>
        </div>
      </div>

      <div class="users-summary">
        <el-tag effect="plain">普通用户：{{ userState.roleSummary.user || 0 }}</el-tag>
        <el-tag type="danger" effect="plain">管理员：{{ userState.roleSummary.admin || 0 }}</el-tag>
        <el-tag type="warning" effect="plain">协管员：{{ userState.roleSummary.moderator || 0 }}</el-tag>
        <el-tag type="success" effect="plain">正常：{{ userState.statusSummary.active || 0 }}</el-tag>
        <el-tag type="warning" effect="plain">停用：{{ userState.statusSummary.inactive || 0 }}</el-tag>
        <el-tag type="danger" effect="plain">封禁：{{ userState.statusSummary.banned || 0 }}</el-tag>
      </div>

      <el-empty v-if="!userState.items.length && !loading" description="当前没有符合条件的用户" />

      <div v-else class="users-grid">
        <article v-for="item in userState.items" :key="item.id" class="user-card">
          <div class="user-card__top">
            <div>
              <h3>{{ item.display_name || item.username }}</h3>
              <p>@{{ item.username }}</p>
            </div>
            <div class="user-card__tags">
              <el-tag :type="getRoleTagType(item.role)">{{ getRoleLabel(item.role) }}</el-tag>
              <el-tag :type="getStatusTagType(item.status)">{{ getStatusLabel(item.status) }}</el-tag>
            </div>
          </div>

          <div class="user-card__meta">
            <span>邮箱：{{ item.email || '暂无' }}</span>
            <span>手机：{{ item.phone || '暂无' }}</span>
            <span>注册时间：{{ formatDate(item.created_at) }}</span>
            <span>最近登录：{{ formatDate(item.last_login_at) }}</span>
          </div>

          <p class="user-card__bio">{{ item.bio || '该用户暂未填写个人简介。' }}</p>

          <div class="user-card__actions">
            <el-button v-if="item.role !== 'user'" plain @click="updateUser(item, { role: 'user' }, '普通用户')">
              设为普通用户
            </el-button>
            <el-button v-if="item.role !== 'moderator'" type="warning" plain @click="updateUser(item, { role: 'moderator' }, '协管员')">
              设为协管员
            </el-button>
            <el-button v-if="item.role !== 'admin'" type="danger" plain @click="updateUser(item, { role: 'admin' }, '管理员')">
              设为管理员
            </el-button>
            <el-button v-if="item.status !== 'active'" type="success" plain @click="updateUser(item, { status: 'active' }, '正常状态')">
              恢复正常
            </el-button>
            <el-button v-if="item.status !== 'inactive'" plain @click="updateUser(item, { status: 'inactive' }, '停用状态')">
              停用账号
            </el-button>
            <el-button v-if="item.status !== 'banned'" type="danger" plain @click="updateUser(item, { status: 'banned' }, '封禁状态')">
              封禁账号
            </el-button>
          </div>
        </article>
      </div>
    </section>

    <div class="pagination-shell" v-if="userState.totalPages > 1">
      <el-pagination
        background
        layout="prev, pager, next"
        :current-page="userState.currentPage"
        :page-size="8"
        :total="userState.total"
        @current-change="changePage"
      />
    </div>
  </div>
</template>

<style scoped lang="scss">
.users-page {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.users-hero {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 18px;
  padding: 28px 32px;
  border-radius: 28px;
  background:
    radial-gradient(circle at top right, rgba(251, 191, 36, 0.18), transparent 28%),
    linear-gradient(135deg, #172554 0%, #7f1d1d 52%, #9a3412 100%);
  color: #fff7ed;
}

.users-kicker {
  margin: 0;
  font-size: 12px;
  letter-spacing: 1.8px;
  color: rgba(255, 247, 237, 0.74);
}

.users-hero h1 {
  margin: 10px 0 12px;
  font-size: clamp(30px, 5vw, 44px);
}

.users-desc {
  max-width: 760px;
  margin: 0;
  line-height: 1.8;
  color: rgba(255, 247, 237, 0.92);
}

.users-overview {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: 16px;
}

.users-overview__card,
.users-panel,
.user-card {
  border-radius: 24px;
  border: 1px solid #eadfce;
  background: rgba(255, 255, 255, 0.94);
  box-shadow: var(--xhq-shadow-md);
}

.users-overview__card {
  padding: 20px;
}

.users-overview__card span,
.user-card__meta,
.user-card__top p {
  color: #8a8178;
  font-size: 13px;
}

.users-overview__card strong {
  display: block;
  margin-top: 10px;
  font-size: 30px;
  color: #111827;
}

.users-overview__card p {
  margin: 10px 0 0;
  color: #6b7280;
  line-height: 1.7;
}

.users-panel {
  padding: 22px;
}

.users-panel__toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 18px;
  flex-wrap: wrap;
}

.users-panel__toolbar h2,
.user-card__top h3 {
  margin: 0;
  color: #111827;
}

.users-panel__toolbar p {
  margin: 8px 0 0;
  color: #6b7280;
  line-height: 1.7;
}

.users-panel__filters,
.users-summary,
.user-card__tags,
.user-card__actions {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
}

.users-summary {
  margin-top: 16px;
}

.users-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(340px, 1fr));
  gap: 16px;
  margin-top: 18px;
}

.user-card {
  display: flex;
  flex-direction: column;
  gap: 14px;
  padding: 20px;
}

.user-card__top {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 14px;
}

.user-card__top p,
.user-card__bio {
  margin: 0;
}

.user-card__meta {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.user-card__bio {
  color: #4b5563;
  line-height: 1.75;
}

.pagination-shell {
  display: flex;
  justify-content: center;
  padding-top: 6px;
}

@media (max-width: 960px) {
  .users-hero,
  .users-panel__toolbar {
    flex-direction: column;
    align-items: flex-start;
  }
}

@media (max-width: 768px) {
  .users-hero {
    padding: 24px;
  }

  .users-panel {
    padding: 18px;
  }

  .users-grid {
    grid-template-columns: 1fr;
  }
}
</style>
