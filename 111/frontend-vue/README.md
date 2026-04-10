# frontend-vue

新前端项目，技术栈为 `Vue 3 + Vite + Pinia + Axios + Element Plus`。

## 本地启动

```powershell
npm install
npm run dev
```

默认开发地址：

```text
http://localhost:5174
```

## 本地联调要求

- 旧后端运行在 `http://localhost:3000`
- 前端通过 Vite 代理把 `/api` 转发到后端
- 数据库连接正常后，再做登录、列表、上传等联调

## 云端部署建议

- 生产环境优先保持 `VITE_API_BASE_URL=/api`
- 让 Nginx 或网关把 `/api` 反向代理到 Node 后端
- 这样前后端同域部署，后续 CORS、Cookie、文件路径会更省心

## 当前阶段

- 新前端骨架已完成
- 登录注册链路已打通
- 首页已切换为新的 Vue 版本骨架
