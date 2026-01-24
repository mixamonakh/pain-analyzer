import cron from 'node-cron';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

const CRON_SCHEDULE = '0 9,14,20 * * *'; // 9:00, 14:00, 20:00 по МСК

console.log('Pain Analyzer Scheduler started');
console.log(`Schedule: ${CRON_SCHEDULE} (9:00, 14:00, 20:00 MSK)`);

cron.schedule(CRON_SCHEDULE, async () => {
  console.log(`[${new Date().toISOString()}] Starting worker...`);

  try {
    const { stdout, stderr } = await execAsync('npm run worker');

    if (stdout) console.log(stdout);
    if (stderr) console.error(stderr);

    console.log(`[${new Date().toISOString()}] Worker completed`);
  } catch (error) {
    console.error(`[${new Date().toISOString()}] Worker failed:`, error);
  }
});

console.log('Scheduler is running. Press Ctrl+C to stop.');
