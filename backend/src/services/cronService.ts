import * as cron from 'node-cron';
import { returnCalculationService } from './returnCalculationService';

export class CronService {
  private jobs: Map<string, cron.ScheduledTask> = new Map();

  /**
   * Start all scheduled jobs
   */
  startAll(): void {
    console.log('🕐 Starting cron jobs...');
    
    // Update recommendation returns every hour during market hours (9 AM - 4 PM WAT)
    const marketHoursJob = cron.schedule('0 9-16 * * 1-5', async () => {
      console.log('⏰ Running hourly return calculations...');
      try {
        await returnCalculationService.updateAllRecommendationReturns();
      } catch (error) {
        console.error('❌ Hourly return calculation failed:', error);
      }
    }, {
      timezone: 'Africa/Lagos'
    });

    this.jobs.set('market_hours_updates', marketHoursJob);

    // Create daily portfolio snapshots at 6 PM WAT (after market close)
    const dailySnapshotJob = cron.schedule('0 18 * * 1-5', async () => {
      console.log('⏰ Creating daily portfolio snapshots...');
      try {
        await returnCalculationService.createDailyPortfolioSnapshots();
      } catch (error) {
        console.error('❌ Daily snapshot creation failed:', error);
      }
    }, {
      timezone: 'Africa/Lagos'
    });

    this.jobs.set('daily_snapshots', dailySnapshotJob);

    // Update all returns daily at 7 PM WAT (comprehensive end-of-day update)
    const endOfDayJob = cron.schedule('0 19 * * 1-5', async () => {
      console.log('⏰ Running end-of-day return calculations...');
      try {
        await returnCalculationService.updateAllRecommendationReturns();
      } catch (error) {
        console.error('❌ End-of-day calculation failed:', error);
      }
    }, {
      timezone: 'Africa/Lagos'
    });

    this.jobs.set('end_of_day_updates', endOfDayJob);

    // Weekend summary updates (Saturday at 10 AM)
    const weekendJob = cron.schedule('0 10 * * 6', async () => {
      console.log('⏰ Running weekend return calculations...');
      try {
        await returnCalculationService.updateAllRecommendationReturns();
      } catch (error) {
        console.error('❌ Weekend calculation failed:', error);
      }
    }, {
      timezone: 'Africa/Lagos'
    });

    this.jobs.set('weekend_updates', weekendJob);

    console.log(`✅ Started ${this.jobs.size} cron jobs`);
    this.logSchedule();
  }

  /**
   * Stop all scheduled jobs
   */
  stopAll(): void {
    console.log('🛑 Stopping all cron jobs...');
    
    this.jobs.forEach((job, name) => {
      job.stop();
      console.log(`  ✅ Stopped ${name}`);
    });
    
    this.jobs.clear();
    console.log('✅ All cron jobs stopped');
  }

  /**
   * Stop a specific job
   */
  stop(jobName: string): boolean {
    const job = this.jobs.get(jobName);
    if (job) {
      job.stop();
      this.jobs.delete(jobName);
      console.log(`✅ Stopped cron job: ${jobName}`);
      return true;
    }
    console.warn(`⚠️ Cron job not found: ${jobName}`);
    return false;
  }

  /**
   * Start a specific job
   */
  start(jobName: string): boolean {
    const job = this.jobs.get(jobName);
    if (job) {
      job.start();
      console.log(`✅ Started cron job: ${jobName}`);
      return true;
    }
    console.warn(`⚠️ Cron job not found: ${jobName}`);
    return false;
  }

  /**
   * Get status of all jobs
   */
  getStatus(): { name: string; running: boolean }[] {
    const status: { name: string; running: boolean }[] = [];
    
    this.jobs.forEach((job, name) => {
      status.push({
        name,
        running: true, // node-cron doesn't have a running property
      });
    });
    
    return status;
  }

  /**
   * Run a job manually for testing
   */
  async runManually(jobName: string): Promise<void> {
    console.log(`🔧 Running job manually: ${jobName}`);
    
    try {
      switch (jobName) {
        case 'market_hours_updates':
        case 'end_of_day_updates':
        case 'weekend_updates':
          await returnCalculationService.updateAllRecommendationReturns();
          break;
          
        case 'daily_snapshots':
          await returnCalculationService.createDailyPortfolioSnapshots();
          break;
          
        default:
          throw new Error(`Unknown job: ${jobName}`);
      }
      
      console.log(`✅ Manual job completed: ${jobName}`);
    } catch (error) {
      console.error(`❌ Manual job failed: ${jobName}`, error);
      throw error;
    }
  }

  /**
   * Log the current schedule
   */
  private logSchedule(): void {
    console.log('\n📅 Cron Job Schedule (Nigeria/Lagos time):');
    console.log('  • Market Hours Updates: Every hour 9 AM - 4 PM (Mon-Fri)');
    console.log('  • Daily Snapshots: 6:00 PM daily (Mon-Fri)');
    console.log('  • End of Day Updates: 7:00 PM daily (Mon-Fri)');
    console.log('  • Weekend Updates: 10:00 AM Saturday');
    console.log('');
  }

  /**
   * Health check for cron service
   */
  healthCheck(): {
    status: 'healthy' | 'unhealthy';
    jobCount: number;
    runningJobs: number;
    jobs: { name: string; running: boolean }[];
  } {
    const jobs = this.getStatus();
    const runningJobs = jobs.filter(job => job.running).length;
    
    return {
      status: runningJobs > 0 ? 'healthy' : 'unhealthy',
      jobCount: jobs.length,
      runningJobs,
      jobs,
    };
  }
}

export const cronService = new CronService();