import request from './request'

export function getVideoContestOverviewApi() {
  return request.get('/video-contest/overview')
}

export function getVideoContestWorksApi(params) {
  return request.get('/video-contest/works', { params })
}

export function getVideoContestTopWorksApi() {
  return request.get('/video-contest/top-works')
}

export function getVideoContestWorkDetailApi(workId) {
  return request.get(`/video-contest/works/${workId}/detail`)
}

export function createVideoContestWorkApi(payload) {
  return request.post('/video-contest/works', payload, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  })
}

export function voteVideoContestWorkApi(workId, payload) {
  return request.post(`/video-contest/works/${workId}/vote`, payload)
}

export function getVideoContestCommentsApi(workId, params) {
  return request.get(`/video-contest/works/${workId}/comments`, { params })
}

export function createVideoContestCommentApi(workId, payload) {
  return request.post(`/video-contest/works/${workId}/comments`, payload)
}

export function likeVideoContestCommentApi(commentId, payload) {
  return request.post(`/video-contest/works/comments/${commentId}/like`, payload)
}
