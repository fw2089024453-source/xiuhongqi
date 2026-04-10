import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import serverConfig from '../config/server.js';
import { testConnection } from '../config/db.js';
import apiRoutes from './routes/api.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const publicPath = path.join(__dirname, '../public');
const uploadsPath = path.join(publicPath, 'uploads');
const frontendDistPath = path.join(__dirname, '../frontend-vue/dist');
const isProduction = serverConfig.env === 'production';

const app = express();

app.use(cors(serverConfig.cors));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use('/api', apiRoutes);
app.use('/uploads', express.static(uploadsPath, serverConfig.static));

if (isProduction) {
  app.use(express.static(frontendDistPath, serverConfig.static));
}

app.get('/health', async (req, res) => {
  const dbHealthy = await testConnection();
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    database: dbHealthy ? 'connected' : 'disconnected',
    environment: serverConfig.env,
  });
});

if (isProduction) {
  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api')) {
      return next();
    }

    return res.sendFile(path.join(frontendDistPath, 'index.html'));
  });
}

app.use((req, res) => {
  res.status(404).json({
    error: 'Resource not found',
    path: req.path,
    method: req.method,
  });
});

app.use((err, req, res, next) => {
  console.error('Server error:', err.stack);
  res.status(500).json({
    error: isProduction ? 'Internal server error' : err.message,
    stack: isProduction ? undefined : err.stack,
  });
});

const startServer = () => {
  app.listen(serverConfig.port, () => {
    console.log(`
    ==========================================
    Server started
    Environment: ${serverConfig.env}
    Port: ${serverConfig.port}
    Time: ${new Date().toLocaleString('zh-CN')}
    ==========================================
    `);
  });
};

testConnection()
  .then((success) => {
    if (!success) {
      console.warn('Database connection failed. Server will continue to run.');
    }

    startServer();
  })
  .catch((error) => {
    console.error('Startup error:', error);
    process.exit(1);
  });

export default app;
