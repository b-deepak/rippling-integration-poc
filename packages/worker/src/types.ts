import type { FileType } from './workflows/types';

export interface Env {
  BUCKET: R2Bucket;
  DB: D1Database;
  TIME_ATTENDANCE_WORKFLOW: Workflow;
  EXPENSES_WORKFLOW: Workflow;
  PAYROLL_WORKFLOW: Workflow;
  EMPLOYEES_WORKFLOW: Workflow;
}

export interface FileStatus {
  id: string;
  partner: string;
  filename: string;
  original_filename: string;
  file_type: FileType;
  status: 'accepted' | 'processing' | 'completed' | 'failed';
  total_records: number;
  processed_records: number;
  failed_records: number;
  error_summary: string | null;
  created_at: string;
  updated_at: string;
}

export interface WorkflowParams {
  fileId: string;
  path: string;
  partner: string;
  fileType: FileType;
}

// Re-export types from workflows for convenience
export type { FileType, FileSchema, ProcessResult, WorkflowResult } from './workflows/types';
