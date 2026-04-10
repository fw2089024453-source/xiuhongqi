import { computed, ref } from 'vue'
import { defineStore } from 'pinia'

export const useAuthStore = defineStore('auth', () => {
  const token = ref(localStorage.getItem('xhq-token') || '')
  const user = ref(JSON.parse(localStorage.getItem('xhq-user') || 'null'))

  const isLoggedIn = computed(() => Boolean(token.value))

  function setAuth(payload) {
    token.value = payload.token || ''
    user.value = payload.user || null

    localStorage.setItem('xhq-token', token.value)
    localStorage.setItem('xhq-user', JSON.stringify(user.value))
  }

  function logout() {
    token.value = ''
    user.value = null
    localStorage.removeItem('xhq-token')
    localStorage.removeItem('xhq-user')
  }

  return {
    token,
    user,
    isLoggedIn,
    setAuth,
    logout,
  }
})
