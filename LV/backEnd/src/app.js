import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
// import mongoSanitize from 'express-mongo-sanitize'; // REMOVED MONGODB
import compression from 'compression';

// Middleware
import { requestLogger, limiter, sanitizeInput } from './middleware/utilityMiddleware.js';
import { notFound, errorHandler } from './middleware/errorMiddleware.js';

// Import Routes
import authRoutes from './routes/authRoutes.js';
import memoryRoutes from './routes/memoryRoutes.js';
import shareRoutes from './routes/shareRoutes.js';
import questRoutes from './routes/questRoutes.js';
import campaignRoutes from './routes/campaignRoutes.js';
import badgeRoutes from './routes/badgeRoutes.js';
import storyRoutes from './routes/storyRoutes.js';
import businessRoutes from './routes/businessRoutes.js';
import analyticsRoutes from './routes/analyticsRoutes.js';
import familyVaultRoutes from './routes/familyVaultRoutes.js';
import digitalWillRoutes from './routes/digitalWillRoutes.js';
import platformStatsRoutes from './routes/platformStatsRoutes.js';

// Cron Jobs
import { startDeadManSwitchCron } from './cron/deadManSwitchCron.js';

const app = express();

// ==========================================
// SECURITY MIDDLEWARE
// ==========================================

// Helmet - Set security headers
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", 'data:', 'https:'],
    },
  },
  crossOriginEmbedderPolicy: false,
}));

// CORS
const allowedOrigins = [
  'http://localhost:5173',
  'https://lifevault-peach.vercel.app',
  ...(process.env.CORS_ORIGIN ? process.env.CORS_ORIGIN.split(',') : [])
];

app.use(cors({
  origin: (origin, callback) => {
    // allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);
    if (allowedOrigins.indexOf(origin) !== -1 || allowedOrigins.includes('*')) {
      return callback(null, true);
    }
    return callback(new Error('The CORS policy for this site does not allow access from the specified Origin.'), false);
  },
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true,
  maxAge: 86400, // 24 hours
}));

// Prevent MongoDB Operator Injection (REMOVED)
// app.use(mongoSanitize()); 

// Compression
app.use(compression());

// ==========================================
// BODY PARSER & INPUT SANITIZATION
// ==========================================

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));
app.use(sanitizeInput);

// ==========================================
// REQUEST LOGGING
// ==========================================

if (process.env.NODE_ENV !== 'test') {
  app.use(requestLogger);
}

// ==========================================
// RATE LIMITING
// ==========================================

// Apply rate limiting to all routes
if (process.env.NODE_ENV === 'production') {
  app.use('/api/', limiter);
}

// ==========================================
// HEALTH CHECK & INFO ROUTES
// ==========================================

app.get('/', (req, res) => {
  res.json({
    success: true,
    message: '🔐 Life Vault API is running on Aptos & Pinecone DB!',
    version: '3.0.0',
    blockchains: ['Aptos'],
    database: 'Pinecone Vector DB',
    networks: {
      aptos: process.env.APTOS_NETWORK || 'testnet'
    },
    environment: process.env.NODE_ENV || 'development',
    endpoints: {
      auth: '/api/auth',
      memories: '/api/memories',
      share: '/api/share',
      quests: '/api/quests',
      campaigns: '/api/campaigns',
      badges: '/api/badges',
      stories: '/api/stories',
      analytics: '/api/analytics',
      vaults: '/api/vaults',
      wills: '/api/wills',
    },
    documentation: '/api/docs',
  });
});

app.get('/health', (req, res) => {
  res.status(200).json({
    success: true,
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    memory: process.memoryUsage(),
  });
});

// ==========================================
// API ROUTES
// ==========================================

// Debug logger for API requests
app.use('/api', (req, res, next) => {
  console.log(`📡 API Request: ${req.method} ${req.originalUrl}`);
  next();
});

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date(), env: process.env.NODE_ENV });
});

// Primary Routes
app.use('/api/auth', authRoutes);
app.use('/api/memories', memoryRoutes);
app.use('/api/stories', storyRoutes);

// Secondary Routes
app.use('/api/share', shareRoutes);
app.use('/api/quests', questRoutes);
app.use('/api/campaigns', campaignRoutes);
app.use('/api/badges', badgeRoutes);
app.use('/api/business', businessRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/vaults', familyVaultRoutes);
app.use('/api/wills', digitalWillRoutes);
app.use('/api/stats/platform', platformStatsRoutes);

// ==========================================
// API DOCUMENTATION (if needed)
// ==========================================

app.get('/api/docs', (req, res) => {
  res.json({
    success: true,
    message: 'API Documentation',
    version: '2.0.0',
    routes: {
      auth: {
        register: 'POST /api/auth/register',
        login: 'POST /api/auth/login',
        wallet: 'POST /api/auth/wallet',
        linkWallet: 'POST /api/auth/link-wallet',
        me: 'GET /api/auth/me',
      },
      memories: {
        create: 'POST /api/memories',
        list: 'GET /api/memories',
        get: 'GET /api/memories/:id',
        delete: 'DELETE /api/memories/:id',
        verify: 'GET /api/memories/:id/verify',
        relay: 'POST /api/memories/relay',
        stats: 'GET /api/memories/stats',
      },
      share: {
        create: 'POST /api/share',
        access: 'GET /api/share/:shortCode',
        verify: 'GET /api/share/:shortCode/verify',
        myLinks: 'GET /api/share/user/my-links',
        memoryLinks: 'GET /api/share/memory/:memoryId',
        revoke: 'DELETE /api/share/:shortCode',
        update: 'PATCH /api/share/:shortCode',
      },
      quests: {
        list: 'GET /api/quests',
        nearby: 'GET /api/quests/nearby',
        get: 'GET /api/quests/:id',
        create: 'POST /api/quests',
        attempt: 'POST /api/quests/:id/attempt',
        myCompletions: 'GET /api/quests/user/my-completions',
        myQuests: 'GET /api/quests/user/my-quests',
      },
      campaigns: {
        list: 'GET /api/campaigns',
        get: 'GET /api/campaigns/:id',
        create: 'POST /api/campaigns',
        join: 'POST /api/campaigns/:id/join',
        leaderboard: 'GET /api/campaigns/:id/leaderboard',
        myCampaigns: 'GET /api/campaigns/user/my-campaigns',
      },
      badges: {
        list: 'GET /api/badges',
        get: 'GET /api/badges/:id',
        create: 'POST /api/badges',
        myBadges: 'GET /api/badges/user/my-badges',
        leaderboard: 'GET /api/badges/leaderboard',
      },
      stories: {
        list: 'GET /api/stories',
        get: 'GET /api/stories/:id',
        create: 'POST /api/stories',
        addChapter: 'POST /api/stories/:storyId/chapters',
        unlock: 'POST /api/stories/:storyId/chapters/:chapterNumber/unlock',
      },
    },
  });
});

// ==========================================
// ERROR HANDLING
// ==========================================

// 404 Handler
app.use(notFound);

// Global Error Handler
app.use(errorHandler);

// ==========================================
// GRACEFUL SHUTDOWN
// ==========================================

process.on('unhandledRejection', (err) => {
  console.error('❌ UNHANDLED REJECTION! Shutting down...');
  console.error(err.name, err.message);
  if (process.env.NODE_ENV === 'production') {
    process.exit(1);
  }
});

process.on('uncaughtException', (err) => {
  console.error('❌ UNCAUGHT EXCEPTION! Shutting down...');
  console.error(err.name, err.message);
  process.exit(1);
});

// ==========================================
// BACKGROUND JOBS (DISABLED - NEEDS MIGRATION)
// ==========================================

// startDeadManSwitchCron();

export default app;