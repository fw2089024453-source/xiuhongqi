import request from './request'

export function getContactOverviewApi() {
  return request.get('/contact/overview')
}

export function submitContactMessageApi(payload) {
  return request.post('/contact/submit', payload)
}
