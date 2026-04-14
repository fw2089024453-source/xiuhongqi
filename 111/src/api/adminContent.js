import request from './request'

export function getAdminRedCultureStoriesApi() {
  return request.get('/red-culture/admin/galleries')
}

export function createAdminRedCultureStoryApi(payload) {
  return request.post('/red-culture/admin/galleries', payload)
}

export function updateAdminRedCultureStoryApi(id, payload) {
  return request.put(`/red-culture/admin/galleries/${id}`, payload)
}

export function deleteAdminRedCultureStoryApi(id) {
  return request.delete(`/red-culture/admin/galleries/${id}`)
}

export function getAdminRedCultureTimelinesApi() {
  return request.get('/red-culture/admin/timelines')
}

export function createAdminRedCultureTimelineApi(payload) {
  return request.post('/red-culture/admin/timelines', payload)
}

export function updateAdminRedCultureTimelineApi(id, payload) {
  return request.put(`/red-culture/admin/timelines/${id}`, payload)
}

export function deleteAdminRedCultureTimelineApi(id) {
  return request.delete(`/red-culture/admin/timelines/${id}`)
}

export function getAdminRedCultureQuotesApi() {
  return request.get('/red-culture/admin/quotes')
}

export function createAdminRedCultureQuoteApi(payload) {
  return request.post('/red-culture/admin/quotes', payload)
}

export function updateAdminRedCultureQuoteApi(id, payload) {
  return request.put(`/red-culture/admin/quotes/${id}`, payload)
}

export function deleteAdminRedCultureQuoteApi(id) {
  return request.delete(`/red-culture/admin/quotes/${id}`)
}

export function getAdminPublicWelfareActivitiesApi() {
  return request.get('/public-welfare/admin/activities')
}

export function createAdminPublicWelfareActivityApi(payload) {
  return request.post('/public-welfare/admin/activities', payload)
}

export function updateAdminPublicWelfareActivityApi(id, payload) {
  return request.put(`/public-welfare/admin/activities/${id}`, payload)
}

export function deleteAdminPublicWelfareActivityApi(id) {
  return request.delete(`/public-welfare/admin/activities/${id}`)
}

export function getAdminPublicWelfareVolunteersApi() {
  return request.get('/public-welfare/admin/volunteers')
}

export function createAdminPublicWelfareVolunteerApi(payload) {
  return request.post('/public-welfare/admin/volunteers', payload)
}

export function updateAdminPublicWelfareVolunteerApi(id, payload) {
  return request.put(`/public-welfare/admin/volunteers/${id}`, payload)
}

export function deleteAdminPublicWelfareVolunteerApi(id) {
  return request.delete(`/public-welfare/admin/volunteers/${id}`)
}

export function getAdminPublicWelfareTimelinesApi() {
  return request.get('/public-welfare/admin/timelines')
}

export function createAdminPublicWelfareTimelineApi(payload) {
  return request.post('/public-welfare/admin/timelines', payload)
}

export function updateAdminPublicWelfareTimelineApi(id, payload) {
  return request.put(`/public-welfare/admin/timelines/${id}`, payload)
}

export function deleteAdminPublicWelfareTimelineApi(id) {
  return request.delete(`/public-welfare/admin/timelines/${id}`)
}

export function getAdminSkillTeachingCategoriesApi() {
  return request.get('/skill-teaching/admin/categories')
}

export function createAdminSkillTeachingCategoryApi(payload) {
  return request.post('/skill-teaching/admin/categories', payload)
}

export function updateAdminSkillTeachingCategoryApi(id, payload) {
  return request.put(`/skill-teaching/admin/categories/${id}`, payload)
}

export function deleteAdminSkillTeachingCategoryApi(id) {
  return request.delete(`/skill-teaching/admin/categories/${id}`)
}

export function getAdminSkillTeachingCoursesApi(params) {
  return request.get('/skill-teaching/admin/courses', { params })
}

export function getAdminSkillTeachingCourseDetailApi(id) {
  return request.get(`/skill-teaching/admin/courses/${id}`)
}

export function createAdminSkillTeachingCourseApi(payload) {
  return request.post('/skill-teaching/admin/courses', payload)
}

export function updateAdminSkillTeachingCourseApi(id, payload) {
  return request.put(`/skill-teaching/admin/courses/${id}`, payload)
}

export function deleteAdminSkillTeachingCourseApi(id) {
  return request.delete(`/skill-teaching/admin/courses/${id}`)
}

export function getAdminSkillTeachingResourcesApi() {
  return request.get('/skill-teaching/admin/resources')
}

export function createAdminSkillTeachingResourceApi(payload) {
  return request.post('/skill-teaching/admin/resources', payload)
}

export function updateAdminSkillTeachingResourceApi(id, payload) {
  return request.put(`/skill-teaching/admin/resources/${id}`, payload)
}

export function deleteAdminSkillTeachingResourceApi(id) {
  return request.delete(`/skill-teaching/admin/resources/${id}`)
}

export function getAdminSkillTeachingWorksApi(params) {
  return request.get('/skill-teaching/admin/works', { params })
}

export function updateAdminSkillTeachingWorkStatusApi(id, payload) {
  return request.patch(`/skill-teaching/admin/works/${id}/status`, payload)
}

export function deleteAdminSkillTeachingWorkApi(id) {
  return request.delete(`/skill-teaching/admin/works/${id}`)
}

export function getAdminSkillTeachingSelectableUsersApi() {
  return request.get('/skill-teaching/admin/users')
}
