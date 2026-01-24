import cron from 'node-cron';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

const CRON_SCHEDULE = '0 9,14,20 * * *'; // 9:00, 14:00, 20:00 по МСК

let isRunning = false;
let shouldExit = false;

console.log('Pain Analyzer Scheduler started');
console.log(`Schedule: ${CRON_SCHEDULE} (9:00, 14:00, 20:00 MSK)`);

cron.schedule(CRON_SCHEDULE, async () => {
  if (isRunning) {
    console.log(`[${new Date().toISOString()}] Worker already running, skipping...`);
    return;
  }

  if (shouldExit) {
    console.log(`[${new Date().toISOString()}] Shutdown requested, skipping worker start`);
    return;
  }

  console.log(`[${new Date().toISOString()}] Starting worker...`);
  isRunning = true;

  try {
    const { stdout, stderr } = await execAsync('npm run worker');

    if (stdout) console.log(stdout);
    if (stderr) console.error(stderr);

    console.log(`[${new Date().toISOString()}] Worker completed`);
  } catch (error) {
    console.error(`[${new Date().toISOString()}] Worker failed:`, error);
  } finally {
    isRunning = false;
  }
});

// Graceful shutdown
const handleShutdown = (signal: string) => {
  console.log(`\n[${new Date().toISOString()}] ${signal} received`);
  shouldExit = true;

  if (!isRunning) {
    console.log('No worker running, exiting immediately');
    process.exit(0);
  }

  console.log('Waiting for worker to finish...');
  const checkInterval = setInterval(() => {
    if (!isRunning) {
      clearInterval(checkInterval);
      console.log('Worker finished, exiting');
      process.exit(0);
    }
  }, 1000);

  // Force exit after 30 seconds
  setTimeout(() => {
    console.log('Force exit after 30s timeout');
    process.exit(1);
  }, 30000);
};

process.on('SIGINT', () => handleShutdown('SIGINT'));
process.on('SIGTERM', () => handleShutdown('SIGTERM'));

console.log('Scheduler is running. Press Ctrl+C to stop.');
