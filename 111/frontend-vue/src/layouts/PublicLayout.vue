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
  { path: '/red-culture', label: '红旗文化', summary: '故事与精神' },
  { path: '/public-welfare', label: '公益纪实', summary: '活动与志愿' },
  { path: '/skill-teaching', label: '技艺教学', summary: '课程与资源' },
  { path: '/interaction', label: '互动交流', summary: '论坛与活动' },
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
      <span>当前先把页面做顺眼、做完整，再逐步补足回归测试和云端部署</span>
      <span>前台展示、后台录入、样例数据会并行完善，方便整体演示</span>
    </div>

    <header class="shell-header">
      <div class="shell-header__brand" @click="navigateTo('/')">
        <p class="brand-kicker">XIU HONG QI</p>
        <div class="brand-title">绣红旗数字平台</div>
        <p class="brand-subtitle">把非遗传承、赛事运营、内容传播和互动交流整合到同一套前后台中</p>
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
          <h3>先把页面做好看，再把链路测扎实</h3>
        </div>
        <p>
          当前版本的重点是让前台看起来像一个完整平台，而不是只有骨架的半成品。
          接下来会继续补真实内容、跑完整回归测试，并把云端部署所需的文档与配置收口。
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
  padding: 10px 18px;
  color: #fff5eb;
  font-size: 12px;
  background: linear-gradient(90deg, rgba(103, 18, 21, 0.96), rgba(152, 27, 30, 0.92));
  border-radius: 20px;
  box-shadow: var(--xhq-shadow-md);
}

.shell-header {
  display: grid;
  grid-template-columns: 250px minmax(0, 1fr) 240px;
  gap: 16px;
  align-items: start;
  margin-top: 14px;
  padding: 18px;
  border: 1px solid rgba(234, 217, 199, 0.9);
  border-radius: 30px;
  background: rgba(255, 251, 246, 0.88);
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
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 2px;
}

.brand-title {
  margin-top: 8px;
  font-family: "Source Han Serif SC", "STSong", "SimSun", serif;
  font-size: 28px;
  line-height: 1.1;
  color: var(--xhq-primary-deep);
}

.brand-subtitle {
  margin: 10px 0 0;
  color: var(--xhq-text-muted);
  line-height: 1.65;
  font-size: 13px;
}

.shell-nav {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 10px;
}

.shell-nav__item {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  justify-content: center;
  gap: 4px;
  min-height: 72px;
  padding: 12px 14px;
  text-align: left;
  border: 1px solid #eee0d2;
  border-radius: 18px;
  background: rgba(255, 255, 255, 0.76);
  color: var(--xhq-text);
  cursor: pointer;
  transition:
    transform 0.2s ease,
    border-color 0.2s ease,
    box-shadow 0.2s ease,
    background 0.2s ease;
}

.shell-nav__item strong {
  font-size: 14px;
  line-height: 1.25;
}

.shell-nav__item span {
  color: var(--xhq-text-soft);
  font-size: 11px;
  line-height: 1.4;
}

.shell-nav__item:hover,
.shell-nav__item--active {
  transform: translateY(-1px);
  border-color: #d7b190;
  background: linear-gradient(180deg, rgba(255, 250, 245, 0.98), rgba(251, 241, 229, 0.92));
  box-shadow: 0 12px 20px rgba(143, 86, 44, 0.08);
}

.shell-nav__item--active strong {
  color: var(--xhq-primary);
}

.shell-header__actions {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.user-chip {
  padding: 14px 16px;
  border: 1px solid #eadfce;
  border-radius: 18px;
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
  font-size: 17px;
}

.action-buttons {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  justify-content: flex-end;
}

.shell-main {
  width: min(1400px, calc(100vw - 36px));
  margin: 18px auto 0;
}

.shell-footer {
  padding: 16px 0 28px;
}

.footer-card {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 24px;
  padding: 20px 24px;
  border-radius: 26px;
  border: 1px solid rgba(234, 217, 199, 0.9);
  background: rgba(255, 250, 244, 0.9);
  box-shadow: var(--xhq-shadow-md);
}

.footer-card h3 {
  margin: 8px 0 0;
  font-size: 22px;
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
    padding: 16px;
    border-radius: 24px;
  }

  .shell-nav {
    grid-template-columns: 1fr;
  }

  .shell-header__actions {
    flex-direction: column;
  }

  .action-buttons {
    justify-content: flex-start;
  }
}
</style>
