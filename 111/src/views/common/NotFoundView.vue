<script setup>
import { useRouter } from 'vue-router'

const router = useRouter()
</script>

<template>
  <el-result icon="warning" title="页面不存在" sub-title="该页面暂未开放，请返回首页继续浏览平台内容。">
    <template #extra>
      <el-button type="primary" @click="router.push('/')">返回首页</el-button>
    </template>
  </el-result>
</template>
