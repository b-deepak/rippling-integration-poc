import { WorkflowStep } from 'cloudflare:workers';
import { BaseFileWorkflow } from './base';
import type { FileSchema, Record } from './types';
import { timeAttendanceSchema } from '../schemas/time-attendance';
import { parseCSV } from './utils';

/**
 * Time Attendance workflow - processes time entry records.
 * Overrides transformStep to calculate hours worked from start_time/end_time.
 */
export class TimeAttendanceWorkflow extends BaseFileWorkflow {
  protected getSchema(): FileSchema {
    return timeAttendanceSchema;
  }

  protected getApiEndpoint(): string {
    return '/api/time-entries';
  }

  /**
   * Override transform to calculate hours worked from start_time and end_time.
   * Expects ISO 8601 datetime format.
   */
  protected async transformStep(step: WorkflowStep, content: string): Promise<Record[]> {
    return step.do('transform', async () => {
      const records = parseCSV(content);

      return records.map(record => {
        let hoursWorked = 0;
        try {
          const start = new Date(record.start_time);
          const end = new Date(record.end_time);
          const diffMs = end.getTime() - start.getTime();
          hoursWorked = Math.round((diffMs / (1000 * 60 * 60)) * 100) / 100;
        } catch {
          // If parsing fails, leave as 0
        }
        return {
          ...record,
          hours_worked: String(hoursWorked),
        };
      });
    });
  }
}
