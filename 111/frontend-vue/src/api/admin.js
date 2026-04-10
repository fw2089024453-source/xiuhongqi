import request from './request'

export function getAdminStatisticsApi() {
  return request.get('/admin/statistics')
}

export function getAdminAnnouncementsApi() {
  return request.get('/admin/announcements')
}

export function createAnnouncementApi(payload) {
  return request.post('/admin/announcements', payload)
}

export function updateAnnouncementApi(id, payload) {
  return request.put(`/admin/announcements/${id}`, payload)
}

export function deleteAnnouncementApi(id) {
  return request.delete(`/admin/announcements/${id}`)
}

export function getAdminReviewOverviewApi() {
  return request.get('/admin/reviews/overview')
}

export function getAdminVideoWorksApi(params) {
  return request.get('/admin/video-works', { params })
}

export function updateAdminVideoWorkStatusApi(id, payload) {
  return request.patch(`/admin/video-works/${id}/status`, payload)
}

export function getAdminEmbWorksApi(params) {
  return request.get('/admin/emb-works', { params })
}

export function updateAdminEmbWorkStatusApi(id, payload) {
  return request.patch(`/admin/emb-works/${id}/status`, payload)
}
