<script setup>
import { computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { useAuthStore } from '@/stores/auth'

const route = useRoute()
const router = useRouter()
const authStore = useAuthStore()

const menuItems = [
  { path: '/', label: '首页', summary: '平台总览' },
  { path: '/video-contest', label: '视频大赛', summary: '投稿与投票' },
  { path: '/emb-contest', label: '绣红旗大赛', summary: '作品展示' },
  { path: '/red-culture', label: '红旗文化', summary: '内容传播' },
  { path: '/public-welfare', label: '公益纪实', summary: '活动与历程' },
  { path: '/skill-teaching', label: '技艺教学', summary: '课程与资源' },
  { path: '/interaction', label: '互动交流', summary: '社区与活动' },
  { path: '/contact', label: '联系我们', summary: '合作反馈' },
]

const activePath = computed(() => route.path)
const username = computed(() => authStore.user?.display_name || authStore.user?.username || '未登录')
const showAdminEntry = computed(() => ['admin', 'moderator'].includes(authStore.user?.role))

function isActive(path) {
  return path === '/' ? activePath.value === '/' : activePath.value.startsWith(path)
}

function navigateTo(path) {
  router.push(path)
}

function handleLogout() {
  authStore.logout()
  ElMessage.success('已退出登录')
  router.push('/')
}
</script>

<template>
  <div class="app-shell">
    <div class="shell-ribbon">
      <span>云端部署准备中</span>
      <span>现阶段优先统一界面、稳定功能、保留旧接口兼容</span>
    </div>

    <header class="shell-header">
      <div class="shell-header__brand" @click="navigateTo('/')">
        <p class="brand-kicker">XIU HONG QI</p>
        <div class="brand-title">绣红旗数字平台</div>
        <p class="brand-subtitle">非遗传承、赛事运营、内容传播的一体化前台</p>
      </div>

      <nav class="shell-nav" aria-label="主导航">
        <button
          v-for="item in menuItems"
          :key="item.path"
          type="button"
          class="shell-nav__item"
          :class="{ 'shell-nav__item--active': isActive(item.path) }"
          @click="navigateTo(item.path)"
        >
          <strong>{{ item.label }}</strong>
          <span>{{ item.summary }}</span>
        </button>
      </nav>

      <div class="shell-header__actions">
        <div class="user-chip">
          <span class="user-chip__label">当前用户</span>
          <strong>{{ username }}</strong>
        </div>

        <div class="action-buttons">
          <el-button v-if="showAdminEntry" plain @click="navigateTo('/admin')">进入后台</el-button>
          <el-button v-if="authStore.isLoggedIn" plain @click="navigateTo('/user')">用户中心</el-button>
          <el-button v-if="authStore.isLoggedIn" type="danger" @click="handleLogout">退出登录</el-button>
          <el-button v-else type="danger" @click="navigateTo('/login')">登录 / 注册</el-button>
        </div>
      </div>
    </header>

    <main class="shell-main">
      <router-view />
    </main>

    <footer class="shell-footer">
      <div class="footer-card">
        <div>
          <p class="footer-kicker">NEXT STEP</p>
          <h3>前端先成型，再做精简与云端收口</h3>
        </div>
        <p>
          当前版本以 Vue 前台为主，保留现有后端与数据库结构。后续会继续补齐后台审核、对象存储适配和生产部署配置。
        </p>
      </div>
    </footer>
  </div>
</template>

<style scoped lang="scss">
.app-shell {
  position: relative;
  padding: 18px;
}

.shell-ribbon,
.shell-header,
.footer-card {
  width: min(1400px, calc(100vw - 36px));
  margin: 0 auto;
}

.shell-ribbon {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  padding: 10px 22px;
  color: #fff5eb;
  font-size: 13px;
  background: linear-gradient(90deg, rgba(103, 18, 21, 0.96), rgba(152, 27, 30, 0.92));
  border-radius: 24px;
  box-shadow: var(--xhq-shadow-md);
}

.shell-header {
  display: grid;
  grid-template-columns: 280px minmax(0, 1fr) 280px;
  gap: 20px;
  align-items: start;
  margin-top: 16px;
  padding: 22px;
  border: 1px solid rgba(234, 217, 199, 0.9);
  border-radius: 34px;
  background: rgba(255, 251, 246, 0.86);
  box-shadow: var(--xhq-shadow-lg);
  backdrop-filter: blur(18px);
}

.shell-header__brand {
  cursor: pointer;
}

.brand-kicker,
.footer-kicker {
  margin: 0;
  color: var(--xhq-accent);
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 2px;
}

.brand-title {
  margin-top: 8px;
  font-family: "Source Han Serif SC", "STSong", "SimSun", serif;
  font-size: 30px;
  line-height: 1.1;
  color: var(--xhq-primary-deep);
}

.brand-subtitle {
  margin: 10px 0 0;
  color: var(--xhq-text-muted);
  line-height: 1.7;
}

.shell-nav {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 12px;
}

.shell-nav__item {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 6px;
  padding: 16px 18px;
  text-align: left;
  border: 1px solid #eee0d2;
  border-radius: 22px;
  background: rgba(255, 255, 255, 0.72);
  color: var(--xhq-text);
  cursor: pointer;
  transition:
    transform 0.2s ease,
    border-color 0.2s ease,
    box-shadow 0.2s ease,
    background 0.2s ease;
}

.shell-nav__item strong {
  font-size: 15px;
}

.shell-nav__item span {
  color: var(--xhq-text-soft);
  font-size: 12px;
}

.shell-nav__item:hover,
.shell-nav__item--active {
  transform: translateY(-2px);
  border-color: #d7b190;
  background: linear-gradient(180deg, rgba(255, 250, 245, 0.98), rgba(251, 241, 229, 0.92));
  box-shadow: 0 18px 26px rgba(143, 86, 44, 0.08);
}

.shell-nav__item--active strong {
  color: var(--xhq-primary);
}

.shell-header__actions {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.user-chip {
  padding: 16px 18px;
  border: 1px solid #eadfce;
  border-radius: 22px;
  background: linear-gradient(180deg, rgba(255, 253, 250, 0.96), rgba(252, 244, 234, 0.94));
}

.user-chip__label {
  display: block;
  color: var(--xhq-text-soft);
  font-size: 12px;
}

.user-chip strong {
  display: block;
  margin-top: 6px;
  color: var(--xhq-primary-deep);
  font-size: 18px;
}

.action-buttons {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
}

.shell-main {
  width: min(1400px, calc(100vw - 36px));
  margin: 22px auto 0;
}

.shell-footer {
  padding: 18px 0 28px;
}

.footer-card {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 28px;
  padding: 24px 28px;
  border-radius: 30px;
  border: 1px solid rgba(234, 217, 199, 0.9);
  background: rgba(255, 250, 244, 0.9);
  box-shadow: var(--xhq-shadow-md);
}

.footer-card h3 {
  margin: 8px 0 0;
  font-size: 24px;
  color: var(--xhq-primary-deep);
}

.footer-card p {
  margin: 0;
  color: var(--xhq-text-muted);
  line-height: 1.8;
}

@media (max-width: 1200px) {
  .shell-header {
    grid-template-columns: 1fr;
  }

  .shell-nav {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .shell-header__actions {
    flex-direction: row;
    justify-content: space-between;
    align-items: flex-start;
  }
}

@media (max-width: 768px) {
  .app-shell {
    padding: 12px;
  }

  .shell-ribbon,
  .shell-header,
  .shell-main,
  .footer-card {
    width: min(100vw - 24px, 100%);
  }

  .shell-ribbon,
  .footer-card {
    flex-direction: column;
    align-items: flex-start;
  }

  .shell-header {
    padding: 18px;
    border-radius: 26px;
  }

  .shell-nav,
  .shell-header__actions {
    grid-template-columns: 1fr;
  }

  .shell-nav {
    display: grid;
  }

  .shell-header__actions {
    flex-direction: column;
  }
}
</style>
