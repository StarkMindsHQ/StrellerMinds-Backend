export default () => ({
    nodeEnv: process.env.NODE_ENV,
    port: parseInt(process.env.PORT, 10) || 3000,
  
    database: {
      host: process.env.DATABASE_HOST,
      port: parseInt(process.env.DATABASE_PORT, 10) || 5432,
      user: process.env.DATABASE_USER,
      password: process.env.DATABASE_PASSWORD,
      name: process.env.DATABASE_NAME,
    },
  
    auth: {
      jwtSecret: process.env.JWT_SECRET,
    },
  
    cloudinary: {
      cloudName: process.env.CLOUDINARY_CLOUD_NAME,
      apiKey: process.env.CLOUDINARY_API_KEY,
      apiSecret: process.env.CLOUDINARY_API_SECRET,
    },
  
    stellar: {
      secretKey: process.env.STELLAR_SECRET_KEY,
    },
  
    email: {
      enabled: process.env.EMAIL_ENABLED === 'true',
      trackingEnabled: process.env.EMAIL_TRACKING_ENABLED === 'true',
      trackingSecret: process.env.EMAIL_TRACKING_SECRET,
      trackingBaseUrl: process.env.EMAIL_TRACKING_BASE_URL,
    },
  
    redis: {
      host: process.env.REDIS_HOST,
      port: parseInt(process.env.REDIS_PORT, 10) || 6379,
    },
  });
  