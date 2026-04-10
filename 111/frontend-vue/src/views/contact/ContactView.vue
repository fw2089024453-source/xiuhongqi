<script setup>
import { computed, onMounted, reactive, ref } from 'vue'
import { ElMessage } from 'element-plus'
import { useAuthStore } from '@/stores/auth'
import { getContactOverviewApi, submitContactMessageApi } from '@/api/contact'

const authStore = useAuthStore()

const loading = ref(false)
const submitting = ref(false)
const info = ref({
  company: '',
  address: '',
  hotline: '',
  email: '',
  serviceHours: '',
})
const latest = ref([])
const summary = ref({ messages: 0 })

const form = reactive({
  name: '',
  contact_way: '',
  type: 'cooperation',
  message: '',
})

const isLoggedIn = computed(() => authStore.isLoggedIn)

const summaryCards = computed(() => [
  { label: '累计留言', value: summary.value.messages, hint: '已经通过新联系渠道进入系统的咨询与合作留言' },
  { label: '服务时段', value: info.value.serviceHours || '待补充', hint: '建议在这个时间范围内联系，处理会更及时' },
])

function formatDate(value) {
  if (!value) return '待补充'
  return new Date(value).toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })
}

async function loadData() {
  loading.value = true

  try {
    const result = await getContactOverviewApi()
    info.value = result.data?.info || info.value
    summary.value = result.data?.summary || summary.value
    latest.value = result.data?.latest || []
  } catch (error) {
    ElMessage.error(error.message || '联系我们数据加载失败')
  } finally {
    loading.value = false
  }
}

async function submitForm() {
  if (!form.name.trim() || !form.contact_way.trim() || !form.message.trim()) {
    ElMessage.warning('请填写完整的联系信息和留言内容')
    return
  }

  submitting.value = true

  try {
    const result = await submitContactMessageApi({
      user_id: authStore.user?.id || null,
      name: form.name.trim(),
      contact_way: form.contact_way.trim(),
      type: form.type,
      message: form.message.trim(),
    })

    ElMessage.success(result.message || '留言提交成功')
    form.message = ''
    await loadData()
  } catch (error) {
    ElMessage.error(error.message || '留言提交失败')
  } finally {
    submitting.value = false
  }
}

onMounted(async () => {
  if (isLoggedIn.value) {
    form.name = authStore.user?.display_name || authStore.user?.username || ''
    form.contact_way = authStore.user?.phone || ''
  }

  await loadData()
})
</script>

<template>
  <div class="ct-page">
    <section class="ct-hero">
      <div class="ct-hero__inner">
        <span class="ct-kicker">CONTACT</span>
        <h1>联系我们</h1>
        <p>
          这一页保留旧站的官方联系信息和在线留言能力，同时把留言记录接入新数据库结构，
          后续后台就能直接接着做咨询管理和处理状态流转。
        </p>
      </div>
    </section>

    <section class="ct-summary">
      <div v-for="item in summaryCards" :key="item.label" class="ct-summary-card">
        <div class="ct-summary-card__label">{{ item.label }}</div>
        <div class="ct-summary-card__value">{{ item.value }}</div>
        <div class="ct-summary-card__hint">{{ item.hint }}</div>
      </div>
    </section>

    <div class="ct-grid">
      <el-card shadow="never" class="ct-card">
        <template #header>
          <div class="ct-card__header">
            <div>
              <h2>官方联系方式</h2>
              <p>这里展示平台面向合作、咨询与问题反馈的官方联系入口。</p>
            </div>
            <el-button :loading="loading" @click="loadData">刷新数据</el-button>
          </div>
        </template>

        <div class="ct-info-list">
          <article class="ct-info-item">
            <div class="ct-info-item__label">机构名称</div>
            <div class="ct-info-item__value">{{ info.company || '待补充' }}</div>
          </article>
          <article class="ct-info-item">
            <div class="ct-info-item__label">办公地址</div>
            <div class="ct-info-item__value">{{ info.address || '待补充' }}</div>
          </article>
          <article class="ct-info-item">
            <div class="ct-info-item__label">咨询热线</div>
            <div class="ct-info-item__value">{{ info.hotline || '待补充' }}</div>
          </article>
          <article class="ct-info-item">
            <div class="ct-info-item__label">官方邮箱</div>
            <div class="ct-info-item__value">{{ info.email || '待补充' }}</div>
          </article>
          <article class="ct-info-item">
            <div class="ct-info-item__label">服务时间</div>
            <div class="ct-info-item__value">{{ info.serviceHours || '待补充' }}</div>
          </article>
        </div>
      </el-card>

      <el-card shadow="never" class="ct-card">
        <template #header>
          <div class="ct-card__header">
            <div>
              <h2>在线留言</h2>
              <p>合作意向、学习咨询、产品建议都可以从这里进入系统。</p>
            </div>
          </div>
        </template>

        <el-form label-position="top" class="ct-form">
          <el-form-item label="你的姓名">
            <el-input v-model="form.name" maxlength="60" show-word-limit />
          </el-form-item>

          <el-form-item label="联系方式">
            <el-input v-model="form.contact_way" maxlength="120" show-word-limit />
          </el-form-item>

          <el-form-item label="咨询类型">
            <el-select v-model="form.type" style="width: 100%">
              <el-option label="交流合作" value="cooperation" />
              <el-option label="产品建议" value="feedback" />
              <el-option label="技艺咨询" value="learning" />
              <el-option label="其他事务" value="other" />
            </el-select>
          </el-form-item>

          <el-form-item label="具体内容">
            <el-input v-model="form.message" type="textarea" :rows="6" maxlength="1000" show-word-limit />
          </el-form-item>

          <el-button type="danger" :loading="submitting" @click="submitForm">提交留言</el-button>
        </el-form>
      </el-card>
    </div>

    <el-card shadow="never" class="ct-card">
      <template #header>
        <div class="ct-card__header">
          <div>
            <h2>最近进入系统的留言</h2>
            <p>这一块方便我们后续接后台处理状态，也能检查表单链路是否正常。</p>
          </div>
        </div>
      </template>

      <el-empty v-if="!latest.length && !loading" description="当前还没有留言记录" />

      <div v-else class="ct-latest-list">
        <article v-for="item in latest" :key="item.id" class="ct-latest-item">
          <div class="ct-latest-item__meta">
            <el-tag size="small" effect="plain">{{ item.type }}</el-tag>
            <span>{{ formatDate(item.created_at) }}</span>
          </div>
          <h3>{{ item.name }}</h3>
          <p>新的联系留言已经进入系统，后续可以在后台做状态跟进。</p>
        </article>
      </div>
    </el-card>
  </div>
</template>

<style scoped lang="scss">
.ct-page {
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.ct-hero {
  padding: 40px;
  border-radius: 28px;
  background:
    radial-gradient(circle at top left, rgba(34, 197, 94, 0.22), transparent 24%),
    linear-gradient(135deg, #1f2937 0%, #0f766e 44%, #92400e 100%);
  color: #ecfeff;
}

.ct-kicker {
  display: inline-flex;
  padding: 6px 12px;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.12);
  border: 1px solid rgba(255, 255, 255, 0.18);
  font-size: 12px;
  letter-spacing: 1.6px;
}

.ct-hero h1 {
  margin: 18px 0 12px;
  font-size: clamp(32px, 4vw, 48px);
}

.ct-hero p {
  max-width: 780px;
  margin: 0;
  line-height: 1.9;
  color: rgba(236, 254, 255, 0.92);
}

.ct-summary {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: 16px;
}

.ct-summary-card,
.ct-info-item,
.ct-latest-item {
  border-radius: 22px;
  border: 1px solid #d9ece7;
  background: rgba(255, 255, 255, 0.94);
}

.ct-summary-card {
  padding: 20px;
}

.ct-summary-card__label {
  color: #0f766e;
  font-size: 13px;
}

.ct-summary-card__value {
  margin-top: 8px;
  font-size: 28px;
  font-weight: 700;
  color: #115e59;
}

.ct-summary-card__hint {
  margin-top: 8px;
  color: #6b7280;
  font-size: 13px;
  line-height: 1.6;
}

.ct-grid {
  display: grid;
  grid-template-columns: minmax(280px, 0.8fr) minmax(0, 1.2fr);
  gap: 20px;
}

.ct-card {
  border-radius: 28px;
}

.ct-card__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
}

.ct-card__header h2,
.ct-latest-item h3 {
  margin: 0;
  color: #115e59;
}

.ct-card__header p,
.ct-latest-item p {
  margin: 8px 0 0;
  color: #6b7280;
  line-height: 1.75;
}

.ct-info-list,
.ct-latest-list {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.ct-info-item,
.ct-latest-item {
  padding: 18px;
}

.ct-info-item__label {
  color: #0f766e;
  font-size: 13px;
}

.ct-info-item__value {
  margin-top: 8px;
  color: #1f2937;
  font-size: 16px;
  line-height: 1.75;
}

.ct-form {
  display: flex;
  flex-direction: column;
}

.ct-latest-item__meta {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  margin-bottom: 12px;
  color: #8a8f98;
  font-size: 13px;
}

@media (max-width: 768px) {
  .ct-hero,
  .ct-card :deep(.el-card__body) {
    padding: 24px;
  }

  .ct-grid {
    grid-template-columns: 1fr;
  }

  .ct-card__header {
    flex-direction: column;
    align-items: flex-start;
  }
}
</style>
