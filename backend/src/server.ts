import app from './app';
import { env } from './config/env';

const server = app.listen(env.PORT, () => {
  console.log(`=========================================`);
  console.log(`🚀 CRM CSV Importer Server started!`);
  console.log(`📶 Environment: ${env.NODE_ENV}`);
  console.log(`🔌 Listening on port: ${env.PORT}`);
  console.log(`=========================================`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('👋 SIGTERM received. Shutting down gracefully...');
  server.close(() => {
    console.log('💤 Server closed.');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  console.log('👋 SIGINT received. Shutting down gracefully...');
  server.close(() => {
    console.log('💤 Server closed.');
    process.exit(0);
  });
});
