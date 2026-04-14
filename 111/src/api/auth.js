import request from './request'

export function loginApi(payload) {
  return request.post('/auth/login', payload)
}

export function registerApi(payload) {
  return request.post('/auth/register', payload)
}

export function getProfileApi() {
  return request.get('/user/profile')
}
