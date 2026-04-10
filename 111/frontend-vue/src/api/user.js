import request from './request'

export function getUserDashboardApi(params) {
  return request.get('/user/dashboard', { params })
}

export function updateUserProfileApi(payload) {
  return request.put('/user/profile', payload, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  })
}
