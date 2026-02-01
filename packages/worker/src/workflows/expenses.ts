import { BaseFileWorkflow } from './base';
import type { FileSchema } from './types';
import { expensesSchema } from '../schemas/expenses';

/**
 * Expenses workflow - processes employee expense reports.
 * Uses default base class behavior.
 */
export class ExpensesWorkflow extends BaseFileWorkflow {
  protected getSchema(): FileSchema {
    return expensesSchema;
  }

  protected getApiEndpoint(): string {
    return '/api/expenses';
  }
}
