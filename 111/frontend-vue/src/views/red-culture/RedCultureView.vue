<script setup>
import { computed, onMounted, ref } from 'vue'
import {
  getRedCultureGalleriesApi,
  getRedCultureQuotesApi,
  getRedCultureTimelinesApi,
} from '@/api/redCulture'

const activeTab = ref('gallery')
const loading = ref(false)
const galleries = ref([])
const timelines = ref([])
const quotes = ref([])

const summaryCards = computed(() => [
  {
    label: '文化展廊',
    value: galleries.value.length,
    hint: '用于承接红旗故事、图文专栏和人物内容。',
  },
  {
    label: '历史节点',
    value: timelines.value.length,
    hint: '按年份组织的重要时间线内容。',
  },
  {
    label: '精神语录',
    value: quotes.value.length,
    hint: '以短句卡片的形式展示平台精神内核。',
  },
])

function formatYear(year) {
  return year || '未标注年份'
}

async function loadData() {
  loading.value = true

  try {
    const [galleryResult, timelineResult, quoteResult] = await Promise.all([
      getRedCultureGalleriesApi(),
      getRedCultureTimelinesApi(),
      getRedCultureQuotesApi(),
    ])

    galleries.value = galleryResult.data || []
    timelines.value = timelineResult.data || []
    quotes.value = quoteResult.data || []
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  loadData()
})
</script>

<template>
  <div class="red-culture-page">
    <section class="rc-hero">
      <div class="rc-hero__inner">
        <span class="rc-kicker">RED CULTURE</span>
        <h1>红旗文化</h1>
        <p>
          这一页承接旧站“文化展示、发展历程、名家语录”的核心内容，
          现在已经改成更适合持续录入和运营维护的结构。
        </p>
      </div>
    </section>

    <section class="rc-summary">
      <div v-for="item in summaryCards" :key="item.label" class="rc-summary-card">
        <div class="rc-summary-card__label">{{ item.label }}</div>
        <div class="rc-summary-card__value">{{ item.value }}</div>
        <div class="rc-summary-card__hint">{{ item.hint }}</div>
      </div>
    </section>

    <section class="rc-content">
      <el-card shadow="never" class="rc-card">
        <template #header>
          <div class="rc-card__header">
            <div>
              <h2>内容总览</h2>
              <p>先用统一的 Vue 结构替代旧站零散切换，再逐步补齐正式内容。</p>
            </div>
            <el-button :loading="loading" @click="loadData">刷新数据</el-button>
          </div>
        </template>

        <el-tabs v-model="activeTab" class="rc-tabs">
          <el-tab-pane label="文化展廊" name="gallery">
            <el-empty v-if="!galleries.length && !loading" description="当前还没有文化展廊内容" />

            <div v-else class="gallery-grid">
              <article v-for="item in galleries" :key="item.id" class="gallery-card">
                <div class="gallery-card__image">
                  <img
                    v-if="item.image_url"
                    :src="item.image_url"
                    :alt="item.title"
                  />
                  <div v-else class="gallery-card__placeholder">暂无封面</div>
                </div>
                <div class="gallery-card__body">
                  <div class="gallery-card__meta">
                    <el-tag size="small" type="danger">{{ formatYear(item.year) }}</el-tag>
                    <span>{{ item.location || item.author || '文化内容' }}</span>
                  </div>
                  <h3>{{ item.title }}</h3>
                  <p>{{ item.description || '暂无简介' }}</p>
                </div>
              </article>
            </div>
          </el-tab-pane>

          <el-tab-pane label="发展历程" name="timeline">
            <el-empty v-if="!timelines.length && !loading" description="当前还没有发展历程内容" />

            <div v-else class="timeline-list">
              <article v-for="item in timelines" :key="item.id" class="timeline-item">
                <div class="timeline-item__year">{{ formatYear(item.year) }}</div>
                <div class="timeline-item__line"></div>
                <div class="timeline-item__content">
                  <h3>{{ item.title }}</h3>
                  <div class="timeline-item__event">{{ item.event_name || '历史节点' }}</div>
                  <p>{{ item.description || '暂无内容简介' }}</p>
                </div>
              </article>
            </div>
          </el-tab-pane>

          <el-tab-pane label="精神语录" name="quotes">
            <el-empty v-if="!quotes.length && !loading" description="当前还没有精神语录内容" />

            <div v-else class="quotes-grid">
              <article v-for="item in quotes" :key="item.id" class="quote-card">
                <div class="quote-card__mark">“</div>
                <p class="quote-card__text">{{ item.quote }}</p>
                <div class="quote-card__author">
                  <div class="quote-card__avatar">
                    <img v-if="item.avatar_url" :src="item.avatar_url" :alt="item.author_name" />
                    <span v-else>{{ item.author_name?.slice(0, 1) || '红' }}</span>
                  </div>
                  <div>
                    <div class="quote-card__name">{{ item.author_name }}</div>
                    <div class="quote-card__title">{{ item.author_title || '红旗精神' }}</div>
                  </div>
                </div>
              </article>
            </div>
          </el-tab-pane>
        </el-tabs>
      </el-card>
    </section>
  </div>
</template>

<style scoped lang="scss">
.red-culture-page {
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.rc-hero {
  padding: 40px;
  border-radius: 28px;
  background:
    radial-gradient(circle at top right, rgba(250, 204, 21, 0.22), transparent 24%),
    linear-gradient(135deg, #1f2937 0%, #7f1d1d 52%, #b91c1c 100%);
  color: #fff7ed;
}

.rc-kicker {
  display: inline-flex;
  padding: 6px 12px;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.12);
  border: 1px solid rgba(255, 255, 255, 0.16);
  font-size: 12px;
  letter-spacing: 1.6px;
}

.rc-hero h1 {
  margin: 18px 0 12px;
  font-size: clamp(32px, 4vw, 48px);
}

.rc-hero p {
  max-width: 760px;
  margin: 0;
  line-height: 1.9;
  color: rgba(255, 247, 237, 0.9);
}

.rc-summary {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
  gap: 16px;
}

.rc-summary-card {
  padding: 20px;
  border-radius: 22px;
  background: rgba(255, 255, 255, 0.9);
  border: 1px solid #eee3da;
}

.rc-summary-card__label {
  color: #8a5347;
  font-size: 13px;
}

.rc-summary-card__value {
  margin-top: 8px;
  font-size: 28px;
  font-weight: 700;
  color: #7f1d1d;
}

.rc-summary-card__hint {
  margin-top: 8px;
  color: #6b7280;
  line-height: 1.6;
  font-size: 13px;
}

.rc-card {
  border-radius: 28px;
}

.rc-card__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
}

.rc-card__header h2 {
  margin: 0 0 8px;
  color: #7f1d1d;
}

.rc-card__header p {
  margin: 0;
  color: #6b7280;
}

.gallery-grid,
.quotes-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
  gap: 18px;
}

.gallery-card,
.quote-card {
  overflow: hidden;
  border-radius: 24px;
  background: #fffdfb;
  border: 1px solid #efe4db;
}

.gallery-card__image {
  height: 190px;
  background: linear-gradient(135deg, #fde8e8, #fff6ed);
}

.gallery-card__image img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.gallery-card__placeholder {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100%;
  color: #9ca3af;
  font-size: 14px;
}

.gallery-card__body {
  padding: 18px;
}

.gallery-card__meta {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 10px;
  color: #8a8f98;
  font-size: 12px;
}

.gallery-card h3,
.timeline-item__content h3,
.quote-card__name {
  margin: 0;
  color: #7f1d1d;
}

.gallery-card h3 {
  margin-bottom: 10px;
}

.gallery-card p,
.timeline-item__content p,
.quote-card__text {
  color: #5f6368;
  line-height: 1.75;
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
  color: #7f1d1d;
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
  background: #e8c7bb;
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
  background: #b91c1c;
  transform: translateX(-50%);
  box-shadow: 0 0 0 6px rgba(185, 28, 28, 0.12);
}

.timeline-item__content {
  padding: 18px 20px;
  border-radius: 22px;
  background: #fffdfb;
  border: 1px solid #efe4db;
}

.timeline-item__event {
  margin: 8px 0 10px;
  color: #b45309;
  font-size: 13px;
  font-weight: 600;
}

.quote-card {
  position: relative;
  padding: 22px;
}

.quote-card__mark {
  position: absolute;
  top: 12px;
  right: 16px;
  color: #f3d2c5;
  font-size: 72px;
  line-height: 1;
}

.quote-card__text {
  position: relative;
  min-height: 120px;
  margin: 0 0 24px;
  font-size: 16px;
}

.quote-card__author {
  display: flex;
  align-items: center;
  gap: 14px;
}

.quote-card__avatar {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 52px;
  height: 52px;
  border-radius: 50%;
  overflow: hidden;
  background: #7f1d1d;
  color: #fff;
  font-weight: 700;
}

.quote-card__avatar img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.quote-card__title {
  color: #8a8f98;
  font-size: 13px;
}

@media (max-width: 768px) {
  .rc-hero,
  .rc-card :deep(.el-card__body) {
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
