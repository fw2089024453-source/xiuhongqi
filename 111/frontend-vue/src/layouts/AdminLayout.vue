<script setup>
import { computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { useAuthStore } from '@/stores/auth'

const route = useRoute()
const router = useRouter()
const authStore = useAuthStore()

const userName = computed(() => authStore.user?.display_name || authStore.user?.username || '管理员')

const menuItems = [
  {
    index: '/admin',
    label: '总览控制台',
    desc: '统计、公告和近期变化',
  },
  {
    index: '/admin/reviews',
    label: '作品审核',
    desc: '审核视频与绣红旗投稿',
  },
]

function goHome() {
  router.push('/')
}

function logout() {
  authStore.logout()
  ElMessage.success('已退出后台')
  router.push('/login')
}
</script>

<template>
  <div class="admin-layout">
    <aside class="admin-layout__aside">
      <div class="admin-brand">
        <p class="admin-brand__kicker">ADMIN STUDIO</p>
        <h1>平台运营后台</h1>
        <p>先把审核、公告和统计做扎实，再逐步扩展到内容发布、用户治理和活动管理。</p>
      </div>

      <div class="admin-profile">
        <span>当前账号</span>
        <strong>{{ userName }}</strong>
        <el-tag type="danger">管理模式</el-tag>
      </div>

      <el-menu :default-active="route.path" class="admin-menu" router>
        <el-menu-item v-for="item in menuItems" :key="item.index" :index="item.index">
          <div class="admin-menu__item">
            <strong>{{ item.label }}</strong>
            <span>{{ item.desc }}</span>
          </div>
        </el-menu-item>
      </el-menu>

      <div class="admin-roadmap">
        <p class="admin-roadmap__title">下一批功能</p>
        <ul>
          <li>内容发布面板</li>
          <li>用户与留言管理</li>
          <li>活动报名治理</li>
        </ul>
      </div>

      <div class="admin-layout__actions">
        <el-button plain @click="goHome">返回前台</el-button>
        <el-button type="danger" @click="logout">退出登录</el-button>
      </div>
    </aside>

    <main class="admin-layout__main">
      <router-view />
    </main>
  </div>
</template>

<style scoped lang="scss">
.admin-layout {
  display: grid;
  grid-template-columns: 320px minmax(0, 1fr);
  gap: 18px;
  padding: 18px;
}

.admin-layout__aside,
.admin-layout__main {
  min-height: calc(100vh - 36px);
  border-radius: 32px;
  border: 1px solid rgba(234, 217, 199, 0.92);
  box-shadow: var(--xhq-shadow-md);
}

.admin-layout__aside {
  display: flex;
  flex-direction: column;
  gap: 18px;
  padding: 24px;
  background:
    radial-gradient(circle at top right, rgba(198, 138, 60, 0.16), transparent 34%),
    linear-gradient(180deg, rgba(255, 250, 244, 0.95), rgba(252, 243, 231, 0.95));
}

.admin-brand__kicker {
  margin: 0;
  color: var(--xhq-accent);
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 2px;
}

.admin-brand h1 {
  margin: 10px 0 12px;
  font-family: "Source Han Serif SC", "STSong", "SimSun", serif;
  font-size: 34px;
  line-height: 1.15;
  color: var(--xhq-primary-deep);
}

.admin-brand p,
.admin-roadmap li {
  margin: 0;
  color: var(--xhq-text-muted);
  line-height: 1.8;
}

.admin-profile,
.admin-roadmap {
  padding: 18px;
  border-radius: 24px;
  border: 1px solid #eadfce;
  background: rgba(255, 255, 255, 0.78);
}

.admin-profile span,
.admin-roadmap__title {
  color: var(--xhq-text-soft);
  font-size: 12px;
}

.admin-profile strong {
  display: block;
  margin: 6px 0 12px;
  color: var(--xhq-primary-deep);
  font-size: 22px;
}

.admin-menu {
  border-right: 0;
  background: transparent;
}

.admin-menu :deep(.el-menu-item) {
  height: auto;
  margin-bottom: 10px;
  padding: 0;
  border-radius: 20px;
  background: rgba(255, 255, 255, 0.72);
}

.admin-menu :deep(.el-menu-item.is-active) {
  background: linear-gradient(180deg, rgba(255, 248, 240, 0.96), rgba(248, 232, 216, 0.96));
}

.admin-menu__item {
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding: 16px 18px;
}

.admin-menu__item strong {
  color: var(--xhq-text);
}

.admin-menu__item span {
  color: var(--xhq-text-soft);
  font-size: 12px;
}

.admin-roadmap ul {
  margin: 12px 0 0;
  padding-left: 18px;
}

.admin-layout__actions {
  display: flex;
  flex-direction: column;
  gap: 12px;
  margin-top: auto;
}

.admin-layout__main {
  padding: 24px;
  background:
    radial-gradient(circle at top left, rgba(152, 27, 30, 0.08), transparent 22%),
    linear-gradient(180deg, rgba(255, 250, 244, 0.84), rgba(255, 255, 255, 0.92));
}

@media (max-width: 1024px) {
  .admin-layout {
    grid-template-columns: 1fr;
  }

  .admin-layout__aside,
  .admin-layout__main {
    min-height: auto;
  }
}

@media (max-width: 768px) {
  .admin-layout {
    padding: 12px;
  }

  .admin-layout__aside,
  .admin-layout__main {
    border-radius: 24px;
  }

  .admin-layout__aside,
  .admin-layout__main {
    padding: 18px;
  }
}
</style>
