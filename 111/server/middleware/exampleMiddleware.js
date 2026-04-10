// 中间件示例
// 用于处理请求前/后的通用逻辑

import serverConfig from '../../config/server.js';

// 请求日志中间件
export const requestLogger = (req, res, next) => {
  const startTime = Date.now();
  
  // 请求完成后记录日志
  res.on('finish', () => {
    const duration = Date.now() - startTime;
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.originalUrl} - ${res.statusCode} - ${duration}ms`);
  });
  
  next();
};

// 验证中间件
export const validationMiddleware = {
  // 验证红旗文化故事
  validateStory(req, res, next) {
    const { title, content } = req.body;
    const errors = [];
    
    if (!title || title.trim().length === 0) {
      errors.push('标题不能为空');
    } else if (title.length > 255) {
      errors.push('标题长度不能超过255个字符');
    }
    
    if (!content || content.trim().length === 0) {
      errors.push('内容不能为空');
    } else if (content.length > 5000) {
      errors.push('内容长度不能超过5000个字符');
    }
    
    if (errors.length > 0) {
      return res.status(400).json({
        success: false,
        message: '验证失败',
        errors
      });
    }
    
    next();
  },
  
  // 验证分页参数
  validatePagination(req, res, next) {
    const { page = 1, limit = 10 } = req.query;
    
    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    
    if (isNaN(pageNum) || pageNum < 1) {
      return res.status(400).json({
        success: false,
        message: '页码必须为正整数'
      });
    }
    
    if (isNaN(limitNum) || limitNum < 1 || limitNum > 100) {
      return res.status(400).json({
        success: false,
        message: '每页条数必须在1-100之间'
      });
    }
    
    req.query.page = pageNum;
    req.query.limit = limitNum;
    
    next();
  }
};

// 认证中间件（示例）
export const authMiddleware = {
  // 检查API密钥
  checkApiKey(req, res, next) {
    const apiKey = req.headers['x-api-key'];
    
    // 开发环境允许跳过
    if (serverConfig.env === 'development' && !apiKey) {
      return next();
    }
    
    // 实际应验证密钥有效性
    if (!apiKey) {
      return res.status(401).json({
        success: false,
        message: 'API密钥缺失'
      });
    }
    
    // 这里应有实际的密钥验证逻辑
    next();
  },
  
  // 检查用户权限
  checkPermission(requiredPermission) {
    return (req, res, next) => {
      // 示例权限检查逻辑
      const userPermissions = req.user?.permissions || [];
      
      if (!userPermissions.includes(requiredPermission)) {
        return res.status(403).json({
          success: false,
          message: '权限不足'
        });
      }
      
      next();
    };
  }
};

// 错误处理中间件
export const errorHandler = (err, req, res, next) => {
  console.error('中间件捕获的错误:', err);
  
  if (err.name === 'ValidationError') {
    return res.status(400).json({
      success: false,
      message: '数据验证失败',
      errors: err.errors
    });
  }
  
  if (err.code === 'ER_DUP_ENTRY') {
    return res.status(409).json({
      success: false,
      message: '数据已存在'
    });
  }
  
  res.status(500).json({
    success: false,
    message: serverConfig.env === 'production' ? '内部服务器错误' : err.message
  });
};

// 文件上传中间件（示例）
export const uploadMiddleware = {
  // 检查文件类型
  checkFileType(req, res, next) {
    const allowedTypes = serverConfig.upload.allowedTypes;
    const file = req.file;
    
    if (file && !allowedTypes.includes(file.mimetype)) {
      return res.status(400).json({
        success: false,
        message: `不支持的文件类型。允许的类型: ${allowedTypes.join(', ')}`
      });
    }
    
    next();
  },
  
  // 检查文件大小
  checkFileSize(req, res, next) {
    const maxSize = serverConfig.upload.maxFileSize;
    const file = req.file;
    
    if (file && file.size > maxSize) {
      return res.status(400).json({
        success: false,
        message: `文件大小超过限制 (最大 ${maxSize / 1024 / 1024}MB)`
      });
    }
    
    next();
  }
};

export default {
  requestLogger,
  validationMiddleware,
  authMiddleware,
  errorHandler,
  uploadMiddleware
};