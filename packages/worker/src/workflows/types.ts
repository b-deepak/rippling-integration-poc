// File types supported by the system
export type FileType = 'time-attendance' | 'expenses' | 'payroll' | 'employees';

export const FILE_TYPES: FileType[] = ['time-attendance', 'expenses', 'payroll', 'employees'];

// Workflow parameters passed to each workflow instance
export interface WorkflowParams {
  fileId: string;
  path: string;
  partner: string;
  fileType: FileType;
}

// Generic record type for CSV data
export type Record = { [key: string]: string };

// Result of processing records through the API
export interface ProcessResult {
  processed: Record[];
  failed: { record: Record; error: string }[];
}

// Schema definition for file type validation
export interface FileSchema {
  fileType: FileType;
  requiredFields: string[];
  optionalFields?: string[];
}

// Workflow result returned after completion
export interface WorkflowResult {
  fileId: string;
  path: string;
  partner: string;
  fileType: FileType;
  total: number;
  processed: number;
  failed: number;
}

// Env bindings for workflows
export interface WorkflowEnv {
  BUCKET: R2Bucket;
}
