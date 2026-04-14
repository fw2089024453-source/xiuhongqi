import request from './request'

export function getSystemHealthApi() {
  return request.get('/health')
}
