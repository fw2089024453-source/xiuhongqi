import request from './request'

export function getUserDashboardApi() {
  return request.get('/user/dashboard')
}

export function updateUserProfileApi(payload) {
  return request.put('/user/profile', payload, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  })
}
