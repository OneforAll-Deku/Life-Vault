import dotenv from 'dotenv';

// Load environment variables first
dotenv.config();

import app from './app.js';
// import connectDB from './config/database.js';
import aptosService from './services/aptosService.js';
import { connectPinecone } from './config/pinecone.js';
// import { seedDemoBusinessUser } from './utils/seedDemoBusinessUser.js';

const PORT = process.env.PORT || 5000;
const NODE_ENV = process.env.NODE_ENV || 'development';

// Server instance
let server;

/**
 * Initialize all services
 */
const initializeServices = async () => {
  try {
    console.log('\n🚀 Starting Life Vault Backend...\n');

    // 1. Connect to MongoDB (DISABLED)
    // console.log('📊 Connecting to MongoDB...');
    // await connectDB();
    // console.log('✅ MongoDB connected\n');

    /* 
    // Seed demo business account (dev convenience)
    try {
      await seedDemoBusinessUser();
    } catch (err) {
      console.warn('ℹ️  Demo business seed skipped:', err.message);
    }
    */

    // 2. Initialize Aptos Service
    console.log('⛓️  Initializing Aptos service...');
    await aptosService.initialize();
    console.log('✅ Aptos service initialized\n');

    // 2b. Initialize Pinecone
    console.log('🌲 Initializing Pinecone...');
    await connectPinecone();

    // 3. Verify critical environment variables
    console.log('🔍 Verifying environment variables...');
    const requiredEnvVars = [
      'JWT_SECRET',
      // 'MONGODB_URI',
      'APTOS_NETWORK',
      'PINECONE_API_KEY'
    ];

    const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);

    if (missingVars.length > 0) {
      console.warn('⚠️  Warning: Missing environment variables:', missingVars.join(', '));
    }

    // Optional but recommended
    const optionalVars = [
      'PINATA_JWT',
      'GOOGLE_GEMINI_API_KEY',
      'APTOS_PRIVATE_KEY',
      'APTOS_MODULE_ADDRESS',
    ];

    const missingOptional = optionalVars.filter(varName => !process.env[varName]);
    if (missingOptional.length > 0) {
      console.warn('ℹ️  Optional variables not set:', missingOptional.join(', '));
    }

    console.log('✅ Environment check complete\n');

    return true;
  } catch (error) {
    console.error('❌ Service initialization failed:', error.message);
    throw error;
  }
};

/**
 * Start the Express server
 */
const startServer = () => {
  server = app.listen(PORT, () => {
    console.log('\n' + '='.repeat(60));
    console.log('🔐 Life Vault Backend Successfully Started!');
    console.log('='.repeat(60));
    console.log(`📡 Port:           ${PORT}`);
    console.log(`🌍 Environment:    ${NODE_ENV}`);
    console.log(`🗄️  Database:       Pinecone Vector DB`);
    console.log(`🌐 IPFS:           Pinata`);
    console.log(`⛓️  Blockchain:     Aptos ${process.env.APTOS_NETWORK || 'testnet'}`);
    console.log(`🔗 API URL:        http://localhost:${PORT}`);
    console.log(`📚 Docs:           http://localhost:${PORT}/api/docs`);
    console.log(`💚 Health:         http://localhost:${PORT}/health`);
    console.log('='.repeat(60) + '\n');

    // Display Aptos info
    if (aptosService.isInitialized()) {
      const masterAddress = aptosService.getMasterAddress();
      if (masterAddress) {
        console.log(`💼 Master Wallet:  ${masterAddress}`);
      }
      if (aptosService.moduleAddress) {
        console.log(`📦 Smart Contract: ${aptosService.moduleAddress}::${aptosService.moduleName}`);
      }
      console.log('\n');
    }

    console.log('✅ Server is ready to accept requests!\n');
  });

  // Handle server errors
  server.on('error', (error) => {
    if (error.code === 'EADDRINUSE') {
      console.error(`❌ Port ${PORT} is already in use`);
    } else {
      console.error('❌ Server error:', error);
    }
    process.exit(1);
  });
};

/**
 * Graceful shutdown handler
 */
const gracefulShutdown = async (signal) => {
  console.log(`\n\n⚠️  ${signal} received. Starting graceful shutdown...`);

  if (server) {
    server.close(async () => {
      console.log('🔌 HTTP server closed');

      try {
        // Close database connection (MONGODB DISABLED)
        /*
        const mongoose = await import('mongoose');
        await mongoose.default.connection.close();
        console.log('🗄️  Database connection closed');
        */

        console.log('✅ Graceful shutdown completed');
        process.exit(0);
      } catch (error) {
        console.error('❌ Error during shutdown:', error);
        process.exit(1);
      }
    });

    // Force shutdown after 30 seconds
    setTimeout(() => {
      console.error('⏰ Forced shutdown after timeout');
      process.exit(1);
    }, 30000);
  } else {
    process.exit(0);
  }
};

/**
 * Main startup function
 */
const main = async () => {
  try {
    // Initialize services
    await initializeServices();

    // Start server
    startServer();

    // Setup graceful shutdown handlers
    process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
    process.on('SIGINT', () => gracefulShutdown('SIGINT'));

  } catch (error) {
    console.error('\n❌ Failed to start server:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
};

// Start the application
main();

// Handle unhandled rejections
process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ Unhandled Rejection at:', promise);
  console.error('Reason:', reason);
  if (NODE_ENV === 'production') {
    gracefulShutdown('UNHANDLED_REJECTION');
  }
});

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  console.error('❌ Uncaught Exception:', error);
  console.error(error.stack);
  gracefulShutdown('UNCAUGHT_EXCEPTION');
});

export default server;