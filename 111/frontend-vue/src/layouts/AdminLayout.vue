<script setup>
import { computed, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { useAuthStore } from '@/stores/auth'

const route = useRoute()
const router = useRouter()
const authStore = useAuthStore()
const mobileMenuVisible = ref(false)

const userName = computed(() => authStore.user?.display_name || authStore.user?.username || '平台管理员')

const menuItems = [
  {
    index: '/admin',
    label: '总览',
    desc: '查看平台概览、公告与内容动态',
  },
  {
    index: '/admin/reviews',
    label: '审核',
    desc: '审核赛事投稿与公开展示内容',
  },
  {
    index: '/admin/red-culture',
    label: '红旗文化',
    desc: '管理故事专题、时间线节点与精神语录',
  },
  {
    index: '/admin/public-welfare',
    label: '公益纪实',
    desc: '管理公益活动、志愿故事与发展历程',
  },
  {
    index: '/admin/skill-teaching',
    label: '技艺教学',
    desc: '管理课程、资料与学员作品审核',
  },
  {
    index: '/admin/operations',
    label: '运营处理',
    desc: '处理留言咨询、报名记录与服务反馈',
  },
  {
    index: '/admin/users',
    label: '用户管理',
    desc: '查看账号角色、状态与权限信息',
  },
  {
    index: '/admin/interaction',
    label: '互动管理',
    desc: '管理论坛话题、帖子与互动活动',
  },
]

function isActive(path) {
  return path === '/admin' ? route.path === '/admin' : route.path.startsWith(path)
}

function closeMobileMenu() {
  mobileMenuVisible.value = false
}

function navigateAdmin(path) {
  closeMobileMenu()
  router.push(path)
}

function goHome() {
  closeMobileMenu()
  router.push('/')
}

function logout() {
  authStore.logout()
  closeMobileMenu()
  ElMessage.success('已退出登录')
  router.push('/login')
}
</script>

<template>
  <div class="admin-layout">
    <aside class="admin-layout__aside">
      <div class="admin-brand">
        <p class="admin-brand__kicker">OPERATIONS CENTER</p>
        <h1>平台内容运营后台</h1>
        <p>
          这里集中承载审核、内容运营、用户治理与互动管理工作，帮助平台在统一的后台环境中完成录入、
          编辑、发布与内容维护。
        </p>
      </div>

      <div class="admin-profile">
        <span>当前账号</span>
        <strong>{{ userName }}</strong>
        <el-tag type="danger">管理后台</el-tag>
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
        <p class="admin-roadmap__title">后台功能</p>
        <ul>
          <li>赛事审核与公告发布</li>
          <li>红旗文化、公益纪实与技艺教学内容运营</li>
          <li>用户治理、留言处理与互动模块管理</li>
        </ul>
      </div>

      <div class="admin-layout__actions">
        <el-button plain @click="goHome">返回平台首页</el-button>
        <el-button type="danger" @click="logout">退出登录</el-button>
      </div>
    </aside>

    <section class="admin-layout__mobile-bar">
      <div class="admin-layout__mobile-brand">
        <p class="admin-brand__kicker">OPERATIONS CENTER</p>
        <strong>平台内容运营后台</strong>
      </div>
      <div class="admin-layout__mobile-actions">
        <el-button plain @click="goHome">返回首页</el-button>
        <el-button type="danger" plain @click="mobileMenuVisible = true">后台菜单</el-button>
      </div>
    </section>

    <main class="admin-layout__main">
      <router-view />
    </main>

    <el-drawer v-model="mobileMenuVisible" direction="ltr" :with-header="false" class="admin-mobile-drawer">
      <div class="admin-mobile-drawer__inner">
        <div class="admin-brand">
          <p class="admin-brand__kicker">OPERATIONS CENTER</p>
          <h2>后台导航</h2>
          <p>手机端可在这里切换运营后台模块，保证审核、运营和内容维护都能正常操作。</p>
        </div>

        <div class="admin-profile">
          <span>当前账号</span>
          <strong>{{ userName }}</strong>
          <el-tag type="danger">管理后台</el-tag>
        </div>

        <div class="admin-mobile-drawer__nav">
          <button
            v-for="item in menuItems"
            :key="item.index"
            type="button"
            class="admin-mobile-menu__item"
            :class="{ 'admin-mobile-menu__item--active': isActive(item.index) }"
            @click="navigateAdmin(item.index)"
          >
            <strong>{{ item.label }}</strong>
            <span>{{ item.desc }}</span>
          </button>
        </div>

        <div class="admin-roadmap">
          <p class="admin-roadmap__title">后台功能</p>
          <ul>
            <li>赛事审核与公告发布</li>
            <li>红旗文化、公益纪实与技艺教学内容运营</li>
            <li>用户治理、留言处理与互动模块管理</li>
          </ul>
        </div>

        <div class="admin-layout__actions admin-layout__actions--drawer">
          <el-button plain @click="goHome">返回平台首页</el-button>
          <el-button type="danger" @click="logout">退出登录</el-button>
        </div>
      </div>
    </el-drawer>
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
.admin-layout__main,
.admin-layout__mobile-bar {
  min-width: 0;
  border-radius: 32px;
  border: 1px solid rgba(234, 217, 199, 0.92);
  box-shadow: var(--xhq-shadow-md);
}

.admin-layout__aside,
.admin-layout__main {
  min-height: calc(100vh - 36px);
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

.admin-layout__mobile-bar {
  display: none;
  align-items: center;
  justify-content: space-between;
  gap: 14px;
  padding: 16px 18px;
  background:
    radial-gradient(circle at top right, rgba(198, 138, 60, 0.14), transparent 34%),
    linear-gradient(180deg, rgba(255, 250, 244, 0.95), rgba(252, 243, 231, 0.95));
}

.admin-layout__mobile-brand strong {
  display: block;
  margin-top: 6px;
  color: var(--xhq-primary-deep);
  font-size: 18px;
  line-height: 1.4;
}

.admin-layout__mobile-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.admin-brand__kicker {
  margin: 0;
  color: var(--xhq-accent);
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 2px;
}

.admin-brand h1,
.admin-brand h2 {
  margin: 10px 0 12px;
  font-family: "Source Han Serif SC", "STSong", "SimSun", serif;
  color: var(--xhq-primary-deep);
  line-height: 1.15;
}

.admin-brand h1 {
  font-size: 34px;
}

.admin-brand h2 {
  font-size: 28px;
}

.admin-brand p,
.admin-roadmap li {
  margin: 0;
  color: var(--xhq-text-muted);
  line-height: 1.8;
}

.admin-profile,
.admin-roadmap,
.admin-mobile-menu__item {
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
  line-height: 1.4;
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

.admin-menu__item strong,
.admin-mobile-menu__item strong {
  color: var(--xhq-text);
}

.admin-menu__item span,
.admin-mobile-menu__item span {
  color: var(--xhq-text-soft);
  font-size: 12px;
  line-height: 1.6;
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

.admin-mobile-drawer__inner {
  display: flex;
  flex-direction: column;
  gap: 16px;
  min-height: 100%;
}

.admin-mobile-drawer__nav {
  display: grid;
  gap: 10px;
}

.admin-mobile-menu__item {
  display: flex;
  flex-direction: column;
  gap: 4px;
  width: 100%;
  text-align: left;
  cursor: pointer;
  transition:
    transform 0.2s ease,
    border-color 0.2s ease,
    box-shadow 0.2s ease,
    background 0.2s ease;
}

.admin-mobile-menu__item:hover,
.admin-mobile-menu__item--active {
  transform: translateY(-1px);
  border-color: #d7b190;
  background: linear-gradient(180deg, rgba(255, 248, 240, 0.96), rgba(248, 232, 216, 0.96));
  box-shadow: 0 12px 20px rgba(143, 86, 44, 0.08);
}

.admin-layout__actions--drawer :deep(.el-button) {
  width: 100%;
}

@media (max-width: 1023px) {
  .admin-layout {
    grid-template-columns: 1fr;
    padding: 12px;
  }

  .admin-layout__aside {
    display: none;
  }

  .admin-layout__mobile-bar {
    display: flex;
  }

  .admin-layout__main {
    min-height: auto;
    padding: 18px;
    border-radius: 24px;
  }
}

@media (max-width: 767px) {
  .admin-layout__mobile-bar {
    flex-direction: column;
    align-items: stretch;
    padding: 16px;
    border-radius: 24px;
  }

  .admin-layout__mobile-actions :deep(.el-button) {
    width: 100%;
  }

  .admin-layout__main {
    padding: 16px;
  }

  .admin-brand h2 {
    font-size: 24px;
  }
}
</style>
