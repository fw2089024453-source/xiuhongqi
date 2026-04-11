<script setup>
import { computed, onMounted, ref } from 'vue'
import {
  getPublicWelfareActivitiesApi,
  getPublicWelfareTimelinesApi,
  getPublicWelfareVolunteersApi,
} from '@/api/publicWelfare'

const activeTab = ref('activities')
const loading = ref(false)
const activities = ref([])
const volunteers = ref([])
const timelines = ref([])

const summaryCards = computed(() => [
  { label: '公益活动', value: activities.value.length, hint: '当前可展示的活动与项目数量。' },
  { label: '志愿者故事', value: volunteers.value.length, hint: '适合对外展示的志愿者人物内容。' },
  { label: '发展历程', value: timelines.value.length, hint: '公益项目的重要时间节点。' },
])

function formatStatus(status) {
  const map = {
    planning: '筹备中',
    ongoing: '进行中',
    completed: '已完成',
    cancelled: '已取消',
  }

  return map[status] || status || '未设置'
}

function formatDateRange(start, end) {
  if (!start && !end) return '时间待定'

  const format = (value) =>
    value
      ? new Date(value).toLocaleDateString('zh-CN', {
          year: 'numeric',
          month: '2-digit',
          day: '2-digit',
        })
      : ''

  if (start && end) return `${format(start)} - ${format(end)}`
  return format(start || end)
}

function parseImages(value) {
  if (!value) return []
  if (Array.isArray(value)) return value

  try {
    const result = JSON.parse(value)
    return Array.isArray(result) ? result : []
  } catch {
    return []
  }
}

async function loadData() {
  loading.value = true

  try {
    const [activitiesResult, volunteersResult, timelinesResult] = await Promise.all([
      getPublicWelfareActivitiesApi(),
      getPublicWelfareVolunteersApi(),
      getPublicWelfareTimelinesApi(),
    ])

    activities.value = activitiesResult.data || []
    volunteers.value = volunteersResult.data || []
    timelines.value = timelinesResult.data || []
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  loadData()
})
</script>

<template>
  <div class="pw-page">
    <section class="pw-hero">
      <div class="pw-hero__inner">
        <span class="pw-kicker">PUBLIC WELFARE</span>
        <h1>公益纪实</h1>
        <p>
          这一页用于承接近期活动、志愿者人物和公益发展历程，
          现在已经整理成更适合持续录入、持续展示的内容结构。
        </p>
      </div>
    </section>

    <section class="pw-summary">
      <div v-for="item in summaryCards" :key="item.label" class="pw-summary-card">
        <div class="pw-summary-card__label">{{ item.label }}</div>
        <div class="pw-summary-card__value">{{ item.value }}</div>
        <div class="pw-summary-card__hint">{{ item.hint }}</div>
      </div>
    </section>

    <el-card shadow="never" class="pw-card">
      <template #header>
        <div class="pw-card__header">
          <div>
            <h2>公益内容中心</h2>
            <p>先让活动、人物、历程三块内容都能稳定展示，后面就可以直接接后台录入。</p>
          </div>
          <el-button :loading="loading" @click="loadData">刷新数据</el-button>
        </div>
      </template>

      <el-tabs v-model="activeTab">
        <el-tab-pane label="近期活动" name="activities">
          <el-empty v-if="!activities.length && !loading" description="当前还没有公益活动内容" />

          <div v-else class="activities-grid">
            <article v-for="item in activities" :key="item.id" class="activity-card">
              <div class="activity-card__cover">
                <img v-if="item.image_url" :src="item.image_url" :alt="item.title" />
                <div v-else class="activity-card__placeholder">暂无封面</div>
              </div>
              <div class="activity-card__body">
                <div class="activity-card__meta">
                  <el-tag size="small" type="danger">{{ formatStatus(item.status) }}</el-tag>
                  <span>{{ formatDateRange(item.start_date, item.end_date) }}</span>
                </div>
                <h3>{{ item.title }}</h3>
                <p>{{ item.description || '暂无活动简介' }}</p>
                <div class="activity-card__info">
                  <span>{{ item.location || '地点待定' }}</span>
                  <span>{{ item.organizer || '主办方待补充' }}</span>
                </div>
              </div>
            </article>
          </div>
        </el-tab-pane>

        <el-tab-pane label="志愿者故事" name="volunteers">
          <el-empty v-if="!volunteers.length && !loading" description="当前还没有志愿者故事内容" />

          <div v-else class="volunteers-grid">
            <article v-for="item in volunteers" :key="item.id" class="volunteer-card">
              <div class="volunteer-card__header">
                <div class="volunteer-card__avatar">
                  <img v-if="item.avatar_url" :src="item.avatar_url" :alt="item.name" />
                  <span v-else>{{ item.name?.slice(0, 1) || '益' }}</span>
                </div>
                <div>
                  <h3>{{ item.name }}</h3>
                  <div class="volunteer-card__role">{{ item.role || '公益参与者' }}</div>
                </div>
              </div>
              <p class="volunteer-card__intro">{{ item.introduction || '暂无志愿者介绍内容。' }}</p>
              <blockquote class="volunteer-card__quote">{{ item.quote || '公益让善意被更多人看见。' }}</blockquote>
              <div class="volunteer-card__stats">
                <div>
                  <strong>{{ item.stat_years || 0 }}</strong>
                  <span>服务年限</span>
                </div>
                <div>
                  <strong>{{ item.stat_projects || 0 }}</strong>
                  <span>参与项目</span>
                </div>
                <div>
                  <strong>{{ item.stat_people || 0 }}</strong>
                  <span>服务对象</span>
                </div>
              </div>
            </article>
          </div>
        </el-tab-pane>

        <el-tab-pane label="发展历程" name="timeline">
          <el-empty v-if="!timelines.length && !loading" description="当前还没有公益历程内容" />

          <div v-else class="timeline-list">
            <article v-for="item in timelines" :key="item.id" class="timeline-item">
              <div class="timeline-item__year">{{ item.year || '待补充' }}</div>
              <div class="timeline-item__line"></div>
              <div class="timeline-item__content">
                <h3>{{ item.title }}</h3>
                <div class="timeline-item__event">{{ item.event_name || '公益节点' }}</div>
                <p>{{ item.description || '暂无节点说明。' }}</p>
                <div v-if="parseImages(item.image_urls).length" class="timeline-item__gallery">
                  <img
                    v-for="(image, index) in parseImages(item.image_urls)"
                    :key="`${item.id}-${index}`"
                    :src="image"
                    :alt="item.title"
                  />
                </div>
              </div>
            </article>
          </div>
        </el-tab-pane>
      </el-tabs>
    </el-card>
  </div>
</template>

<style scoped lang="scss">
.pw-page {
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.pw-hero {
  padding: 40px;
  border-radius: 28px;
  background:
    radial-gradient(circle at top left, rgba(250, 204, 21, 0.22), transparent 24%),
    linear-gradient(135deg, #14532d 0%, #15803d 45%, #7c2d12 100%);
  color: #f7fee7;
}

.pw-kicker {
  display: inline-flex;
  padding: 6px 12px;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.14);
  border: 1px solid rgba(255, 255, 255, 0.16);
  font-size: 12px;
  letter-spacing: 1.6px;
}

.pw-hero h1 {
  margin: 18px 0 12px;
  font-size: clamp(32px, 4vw, 48px);
}

.pw-hero p {
  max-width: 760px;
  margin: 0;
  line-height: 1.9;
  color: rgba(247, 254, 231, 0.92);
}

.pw-summary {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
  gap: 16px;
}

.pw-summary-card {
  padding: 20px;
  border-radius: 22px;
  background: rgba(255, 255, 255, 0.92);
  border: 1px solid #e5ece2;
}

.pw-summary-card__label {
  color: #4d7c0f;
  font-size: 13px;
}

.pw-summary-card__value {
  margin-top: 8px;
  font-size: 28px;
  font-weight: 700;
  color: #166534;
}

.pw-summary-card__hint {
  margin-top: 8px;
  color: #6b7280;
  line-height: 1.6;
  font-size: 13px;
}

.pw-card {
  border-radius: 28px;
}

.pw-card__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
}

.pw-card__header h2 {
  margin: 0 0 8px;
  color: #166534;
}

.pw-card__header p {
  margin: 0;
  color: #6b7280;
}

.activities-grid,
.volunteers-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
  gap: 18px;
}

.activity-card,
.volunteer-card {
  overflow: hidden;
  border-radius: 24px;
  background: #fffdfa;
  border: 1px solid #e8ece4;
}

.activity-card__cover {
  height: 190px;
  background: linear-gradient(135deg, #dcfce7, #fef3c7);
}

.activity-card__cover img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.activity-card__placeholder {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100%;
  color: #9ca3af;
  font-size: 14px;
}

.activity-card__body,
.volunteer-card {
  padding: 18px;
}

.activity-card__meta {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 10px;
  color: #8a8f98;
  font-size: 12px;
}

.activity-card__info {
  display: flex;
  flex-direction: column;
  gap: 6px;
  color: #8a8f98;
  font-size: 13px;
}

.activity-card h3,
.volunteer-card h3,
.timeline-item__content h3 {
  margin: 0;
  color: #166534;
}

.activity-card h3 {
  margin-bottom: 10px;
}

.activity-card p,
.volunteer-card p,
.timeline-item__content p {
  color: #5f6368;
  line-height: 1.75;
}

.volunteer-card__header {
  display: flex;
  align-items: center;
  gap: 14px;
}

.volunteer-card__avatar {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 58px;
  height: 58px;
  border-radius: 50%;
  overflow: hidden;
  background: #166534;
  color: #fff;
  font-weight: 700;
}

.volunteer-card__avatar img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.volunteer-card__role {
  color: #6b7280;
  font-size: 13px;
}

.volunteer-card__intro {
  margin: 16px 0 14px;
}

.volunteer-card__quote {
  margin: 0;
  padding: 14px 16px;
  border-left: 4px solid #84cc16;
  background: #f7fee7;
  color: #4b5563;
  border-radius: 0 14px 14px 0;
}

.volunteer-card__stats {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 10px;
  margin-top: 18px;
}

.volunteer-card__stats div {
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding: 12px;
  border-radius: 16px;
  background: #f8fafc;
  text-align: center;
}

.volunteer-card__stats strong {
  color: #166534;
  font-size: 22px;
}

.volunteer-card__stats span {
  color: #6b7280;
  font-size: 12px;
}

.timeline-list {
  display: flex;
  flex-direction: column;
  gap: 18px;
}

.timeline-item {
  display: grid;
  grid-template-columns: 110px 24px 1fr;
  gap: 16px;
  align-items: start;
}

.timeline-item__year {
  padding-top: 4px;
  color: #166534;
  font-size: 20px;
  font-weight: 700;
}

.timeline-item__line {
  position: relative;
  min-height: 100%;
}

.timeline-item__line::before {
  content: '';
  position: absolute;
  top: 10px;
  bottom: -18px;
  left: 50%;
  width: 2px;
  background: #d9e6d3;
  transform: translateX(-50%);
}

.timeline-item__line::after {
  content: '';
  position: absolute;
  top: 4px;
  left: 50%;
  width: 12px;
  height: 12px;
  border-radius: 50%;
  background: #16a34a;
  transform: translateX(-50%);
  box-shadow: 0 0 0 6px rgba(22, 163, 74, 0.12);
}

.timeline-item__content {
  padding: 18px 20px;
  border-radius: 22px;
  background: #fffdfa;
  border: 1px solid #e8ece4;
}

.timeline-item__event {
  margin: 8px 0 10px;
  color: #b45309;
  font-size: 13px;
  font-weight: 600;
}

.timeline-item__gallery {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
  gap: 10px;
  margin-top: 14px;
}

.timeline-item__gallery img {
  width: 100%;
  height: 110px;
  object-fit: cover;
  border-radius: 14px;
}

@media (max-width: 768px) {
  .pw-hero,
  .pw-card :deep(.el-card__body) {
    padding: 24px;
  }

  .timeline-item {
    grid-template-columns: 1fr;
  }

  .timeline-item__line {
    display: none;
  }
}
</style>
