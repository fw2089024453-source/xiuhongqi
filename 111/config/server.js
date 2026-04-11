import dotenv from 'dotenv';

dotenv.config();

function parseCorsOrigins() {
  const rawOrigins = process.env.CORS_ORIGIN;

  if (rawOrigins) {
    return rawOrigins
      .split(',')
      .map((item) => item.trim())
      .filter(Boolean);
  }

  if (process.env.NODE_ENV === 'production') {
    return ['https://xiuhongqi.com'];
  }

  return ['http://localhost:5173', 'http://localhost:4173', 'http://localhost:3000'];
}

const serverConfig = {
  port: Number(process.env.PORT || 3000),
  env: process.env.NODE_ENV || 'development',
  cors: {
    origin: parseCorsOrigins(),
    credentials: true,
  },
  static: {
    maxAge: process.env.NODE_ENV === 'production' ? '1y' : '1h',
  },
  upload: {
    maxFileSize: 10 * 1024 * 1024,
    allowedTypes: ['image/jpeg', 'image/png', 'image/svg+xml', 'image/gif'],
  },
  session: {
    secret: process.env.SESSION_SECRET || 'replace-this-session-secret',
    resave: false,
    saveUninitialized: false,
    cookie: {
      maxAge: 24 * 60 * 60 * 1000,
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
    },
  },
};

export default serverConfig;
