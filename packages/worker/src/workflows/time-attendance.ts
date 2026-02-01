import { WorkflowStep } from 'cloudflare:workers';
import { BaseFileWorkflow } from './base';
import type { FileSchema, Record } from './types';
import { timeAttendanceSchema } from '../schemas/time-attendance';
import { parseCSV, calculateHours } from './utils';

/**
 * Time Attendance workflow - processes employee clock-in/out records.
 * Overrides transformStep to calculate hours worked.
 */
export class TimeAttendanceWorkflow extends BaseFileWorkflow {
  protected getSchema(): FileSchema {
    return timeAttendanceSchema;
  }

  protected getApiEndpoint(): string {
    return '/api/time-attendance';
  }

  /**
   * Override transform to calculate hours worked from clock_in and clock_out.
   */
  protected async transformStep(step: WorkflowStep, content: string): Promise<Record[]> {
    return step.do('transform', async () => {
      const records = parseCSV(content);

      return records.map(record => ({
        ...record,
        hours_worked: String(calculateHours(record.clock_in, record.clock_out)),
      }));
    });
  }
}
