<script setup>
import { reactive, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { loginApi, registerApi } from '@/api/auth'
import { useAuthStore } from '@/stores/auth'

const route = useRoute()
const router = useRouter()
const authStore = useAuthStore()
const loading = ref(false)
const mode = ref('login')

const form = reactive({
  username: '',
  password: '',
  phone: '',
})

async function submit() {
  loading.value = true

  try {
    if (mode.value === 'login') {
      const result = await loginApi({
        username: form.username,
        password: form.password,
      })

      authStore.setAuth(result.data)
      ElMessage.success('登录成功')
      router.push(route.query.redirect || '/')
      return
    }

    await registerApi({
      username: form.username,
      password: form.password,
      phone: form.phone,
    })

    ElMessage.success('注册成功，请登录')
    mode.value = 'login'
    form.password = ''
  } catch (error) {
    ElMessage.error(error.message)
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <el-card shadow="never" class="login-card">
    <h1 class="page-title">{{ mode === 'login' ? '登录' : '注册' }}</h1>
    <p class="page-desc">先把认证流程跑通，后续所有投稿、投票、用户中心和后台权限都依赖它。</p>

    <el-form label-position="top" @submit.prevent="submit">
      <el-form-item label="用户名">
        <el-input v-model="form.username" placeholder="请输入用户名" />
      </el-form-item>

      <el-form-item label="密码">
        <el-input v-model="form.password" type="password" show-password placeholder="请输入密码" />
      </el-form-item>

      <el-form-item v-if="mode === 'register'" label="手机号">
        <el-input v-model="form.phone" placeholder="请输入手机号" />
      </el-form-item>

      <el-space wrap>
        <el-button type="primary" :loading="loading" @click="submit">
          {{ mode === 'login' ? '立即登录' : '立即注册' }}
        </el-button>
        <el-button text @click="mode = mode === 'login' ? 'register' : 'login'">
          {{ mode === 'login' ? '没有账号，去注册' : '已有账号，去登录' }}
        </el-button>
      </el-space>
    </el-form>
  </el-card>
</template>
