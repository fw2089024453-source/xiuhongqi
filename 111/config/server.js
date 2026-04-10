// 服务器配置

import dotenv from 'dotenv';

dotenv.config();

const serverConfig = {
  // 服务器端口
  port: process.env.PORT || 3000,
  
  // 环境
  env: process.env.NODE_ENV || 'development',
  
  // CORS配置
  cors: {
    origin: process.env.NODE_ENV === 'production' 
      ? ['https://xiuhongqi.com'] 
      : ['http://localhost:5173', 'http://localhost:3000'],
    credentials: true
  },
  
  // 静态文件配置
  static: {
    maxAge: process.env.NODE_ENV === 'production' ? '1y' : '1h'
  },
  
  // 上传文件配置
  upload: {
    maxFileSize: 10 * 1024 * 1024, // 10MB
    allowedTypes: ['image/jpeg', 'image/png', 'image/svg+xml', 'image/gif']
  },
  
  // 会话配置
  session: {
    secret: process.env.SESSION_SECRET || 'xiuhongqi_secret_key',
    resave: false,
    saveUninitialized: false,
    cookie: { 
      maxAge: 24 * 60 * 60 * 1000, // 24小时
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production'
    }
  }
};

export default serverConfig;