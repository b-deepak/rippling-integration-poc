import { WorkflowStep } from 'cloudflare:workers';
import { BaseFileWorkflow, TransformResult } from './base';
import type { FileSchema } from './types';
import { timeAttendanceSchema } from '../schemas/time-attendance';
import { validateBatch } from '../validation/validators';
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
   * Override transform to:
   * 1. Validate field types
   * 2. Calculate hours worked from start_time and end_time for valid records
   */
  protected async transformStep(step: WorkflowStep, content: string): Promise<TransformResult> {
    return step.do('transform', async () => {
      const allRecords = parseCSV(content);
      const schema = this.getSchema();

      // Validate field types
      const validationResult = validateBatch(allRecords, schema.fieldTypes ?? {});

      // Transform valid records - calculate hours worked
      const transformedRecords = validationResult.validRecords.map(record => {
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

      return {
        records: transformedRecords,
        validationResult: {
          validRecords: transformedRecords,
          invalidRecords: validationResult.invalidRecords,
        },
      };
    });
  }
}
