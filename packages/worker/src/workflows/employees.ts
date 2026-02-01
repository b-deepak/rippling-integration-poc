import { BaseFileWorkflow } from './base';
import type { FileSchema } from './types';
import { employeesSchema } from '../schemas/employees';

/**
 * Employees workflow - processes employee master data records.
 * Uses default base class behavior.
 */
export class EmployeesWorkflow extends BaseFileWorkflow {
  protected getSchema(): FileSchema {
    return employeesSchema;
  }

  protected getApiEndpoint(): string {
    return '/api/employees';
  }
}
