import { BaseFileWorkflow } from './base';
import type { FileSchema } from './types';
import { payrollSchema } from '../schemas/payroll';

/**
 * Payroll workflow - processes employee payroll records.
 * Uses default base class behavior.
 */
export class PayrollWorkflow extends BaseFileWorkflow {
  protected getSchema(): FileSchema {
    return payrollSchema;
  }

  protected getApiEndpoint(): string {
    return '/api/payroll';
  }
}
