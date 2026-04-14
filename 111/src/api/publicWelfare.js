import request from './request'

export function getPublicWelfareActivitiesApi() {
  return request.get('/public-welfare/activities')
}

export function getPublicWelfareVolunteersApi() {
  return request.get('/public-welfare/volunteers')
}

export function getPublicWelfareTimelinesApi() {
  return request.get('/public-welfare/timelines')
}
