import request from './request'

export function getInteractionOverviewApi() {
  return request.get('/interaction/overview')
}

export function getForumSectionsApi() {
  return request.get('/interaction/forum/sections')
}

export function getForumTopicsApi(params) {
  return request.get('/interaction/forum/topics', { params })
}

export function createForumTopicApi(payload) {
  return request.post('/interaction/forum/topics', payload)
}

export function getForumTopicDetailApi(topicId) {
  return request.get(`/interaction/forum/topics/${topicId}`)
}

export function createForumPostApi(topicId, payload) {
  return request.post(`/interaction/forum/topics/${topicId}/posts`, payload, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  })
}

export function getForumPostCommentsApi(postId, params) {
  return request.get(`/interaction/forum/posts/${postId}/comments`, { params })
}

export function createForumCommentApi(postId, payload) {
  return request.post(`/interaction/forum/posts/${postId}/comments`, payload)
}

export function toggleForumCommentLikeApi(commentId, payload) {
  return request.post(`/interaction/forum/comments/${commentId}/toggle-like`, payload)
}

export function getInteractionMessagesApi() {
  return request.get('/interaction/messages')
}

export function createInteractionMessageApi(payload) {
  return request.post('/interaction/messages', payload, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  })
}

export function likeInteractionMessageApi(messageId) {
  return request.post(`/interaction/messages/${messageId}/like`)
}

export function getInteractionEventsApi() {
  return request.get('/interaction/events')
}

export function registerInteractionEventApi(eventId, payload) {
  return request.post(`/interaction/events/${eventId}/register`, payload)
}
