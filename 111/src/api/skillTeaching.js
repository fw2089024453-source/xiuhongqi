import request from './request'

export function getSkillTeachingOverviewApi() {
  return request.get('/skill-teaching/overview')
}

export function getSkillTeachingCategoriesApi() {
  return request.get('/skill-teaching/categories')
}

export function getSkillTeachingCoursesApi(params) {
  return request.get('/skill-teaching/courses', { params })
}

export function getSkillTeachingFeaturedCourseApi() {
  return request.get('/skill-teaching/featured-course')
}

export function getSkillTeachingResourcesApi() {
  return request.get('/skill-teaching/resources')
}

export function getSkillTeachingWorksApi() {
  return request.get('/skill-teaching/works')
}

export function createSkillTeachingWorkApi(payload) {
  return request.post('/skill-teaching/works', payload, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  })
}
