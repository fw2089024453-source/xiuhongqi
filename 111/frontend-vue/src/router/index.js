import { createRouter, createWebHistory } from 'vue-router'
import PublicLayout from '@/layouts/PublicLayout.vue'
import AdminLayout from '@/layouts/AdminLayout.vue'

const appTitle = import.meta.env.VITE_APP_TITLE || '绣红旗数字平台'

const routes = [
  {
    path: '/',
    component: PublicLayout,
    children: [
      {
        path: '',
        name: 'home',
        component: () => import('@/views/home/HomeView.vue'),
        meta: { title: '首页' },
      },
      {
        path: 'video-contest',
        name: 'video-contest',
        component: () => import('@/views/video-contest/VideoContestView.vue'),
        meta: { title: '视频大赛' },
      },
      {
        path: 'emb-contest',
        name: 'emb-contest',
        component: () => import('@/views/emb-contest/EmbContestView.vue'),
        meta: { title: '绣红旗大赛' },
      },
      {
        path: 'red-culture',
        name: 'red-culture',
        component: () => import('@/views/red-culture/RedCultureView.vue'),
        meta: { title: '红旗文化' },
      },
      {
        path: 'public-welfare',
        name: 'public-welfare',
        component: () => import('@/views/public-welfare/PublicWelfareView.vue'),
        meta: { title: '公益纪实' },
      },
      {
        path: 'skill-teaching',
        name: 'skill-teaching',
        component: () => import('@/views/skill-teaching/SkillTeachingView.vue'),
        meta: { title: '技艺教学' },
      },
      {
        path: 'interaction',
        name: 'interaction',
        component: () => import('@/views/interaction/InteractionView.vue'),
        meta: { title: '互动交流' },
      },
      {
        path: 'contact',
        name: 'contact',
        component: () => import('@/views/contact/ContactView.vue'),
        meta: { title: '联系我们' },
      },
      {
        path: 'user',
        name: 'user-center',
        component: () => import('@/views/user/UserCenterView.vue'),
        meta: { title: '用户中心', requiresAuth: true },
      },
      {
        path: 'login',
        name: 'login',
        component: () => import('@/views/auth/LoginView.vue'),
        meta: { title: '登录' },
      },
    ],
  },
  {
    path: '/admin',
    component: AdminLayout,
    meta: { requiresAuth: true, requiresAdmin: true },
    children: [
      {
        path: '',
        name: 'admin-dashboard',
        component: () => import('@/views/admin/AdminDashboardView.vue'),
        meta: { title: '后台总览', requiresAuth: true, requiresAdmin: true },
      },
      {
        path: 'reviews',
        name: 'admin-reviews',
        component: () => import('@/views/admin/AdminReviewView.vue'),
        meta: { title: '作品审核', requiresAuth: true, requiresAdmin: true },
      },
    ],
  },
  {
    path: '/:pathMatch(.*)*',
    name: 'not-found',
    component: () => import('@/views/common/NotFoundView.vue'),
    meta: { title: '页面不存在' },
  },
]

const router = createRouter({
  history: createWebHistory(),
  routes,
  scrollBehavior() {
    return { top: 0 }
  },
})

router.beforeEach((to) => {
  document.title = `${to.meta.title || '新前端'} - ${appTitle}`

  const token = localStorage.getItem('xhq-token')
  const user = JSON.parse(localStorage.getItem('xhq-user') || 'null')
  const isAdmin = ['admin', 'moderator'].includes(user?.role)

  if (to.meta.requiresAuth && !token) {
    return { name: 'login', query: { redirect: to.fullPath } }
  }

  if (to.meta.requiresAdmin && !isAdmin) {
    return { name: 'home' }
  }

  return true
})

export default router
