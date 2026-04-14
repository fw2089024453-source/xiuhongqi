import request from './request'

export function getEmbContestOverviewApi() {
  return request.get('/emb-contest/overview')
}

export function getEmbContestWorksApi(params) {
  return request.get('/emb-contest/works', { params })
}

export function getEmbContestTopWorksApi() {
  return request.get('/emb-contest/top-works')
}

export function getEmbContestWorkDetailApi(workId) {
  return request.get(`/emb-contest/works/${workId}/detail`)
}

export function createEmbContestWorkApi(payload) {
  return request.post('/emb-contest/works', payload, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  })
}

export function voteEmbContestWorkApi(workId) {
  return request.post(`/emb-contest/works/${workId}/vote`)
}

export function getEmbContestCommentsApi(workId) {
  return request.get(`/emb-contest/works/${workId}/comments`)
}

export function createEmbContestCommentApi(workId, payload) {
  return request.post(`/emb-contest/works/${workId}/comments`, payload)
}

export function likeEmbContestCommentApi(commentId) {
  return request.post(`/emb-contest/works/comments/${commentId}/like`)
}
