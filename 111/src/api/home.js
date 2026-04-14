import request from './request'

export function getHomeOverviewApi() {
  return request.get('/home/overview')
}

export function getHomeAnnouncementsApi() {
  return request.get('/announcements')
}
