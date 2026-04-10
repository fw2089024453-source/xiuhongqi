import request from './request'

export function getRedCultureGalleriesApi() {
  return request.get('/red-culture/galleries')
}

export function getRedCultureTimelinesApi() {
  return request.get('/red-culture/timelines')
}

export function getRedCultureQuotesApi() {
  return request.get('/red-culture/quotes')
}
