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

export function getAdminOperationsOverviewApi() {
  return request.get('/admin/operations/overview')
}

export function getAdminContactMessagesApi(params) {
  return request.get('/admin/contact-messages', { params })
}

export function updateAdminContactMessageStatusApi(id, payload) {
  return request.patch(`/admin/contact-messages/${id}/status`, payload)
}

export function getAdminInteractionMessagesApi(params) {
  return request.get('/admin/interaction-messages', { params })
}

export function updateAdminInteractionMessageStatusApi(id, payload) {
  return request.patch(`/admin/interaction-messages/${id}/status`, payload)
}

export function getAdminEventRegistrationsApi(params) {
  return request.get('/admin/event-registrations', { params })
}

export function getAdminUsersApi(params) {
  return request.get('/admin/users', { params })
}

export function updateAdminUserApi(id, payload) {
  return request.patch(`/admin/users/${id}`, payload)
}

export function getAdminForumTopicsApi(params) {
  return request.get('/admin/forum-topics', { params })
}

export function updateAdminForumTopicStatusApi(id, payload) {
  return request.patch(`/admin/forum-topics/${id}/status`, payload)
}

export function getAdminForumPostsApi(params) {
  return request.get('/admin/forum-posts', { params })
}

export function updateAdminForumPostVisibilityApi(id, payload) {
  return request.patch(`/admin/forum-posts/${id}/visibility`, payload)
}

export function getAdminInteractionEventsApi(params) {
  return request.get('/admin/interaction-events', { params })
}

export function createAdminInteractionEventApi(payload) {
  return request.post('/admin/interaction-events', payload)
}

export function updateAdminInteractionEventApi(id, payload) {
  return request.put(`/admin/interaction-events/${id}`, payload)
}

export function updateAdminInteractionEventStatusApi(id, payload) {
  return request.patch(`/admin/interaction-events/${id}/status`, payload)
}
