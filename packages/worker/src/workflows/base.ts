import { WorkflowEntrypoint, WorkflowStep, WorkflowEvent } from 'cloudflare:workers';
import type { WorkflowParams, Record, ProcessResult, FileSchema, WorkflowResult, WorkflowEnv } from './types';
import { RETRY_CONFIG, parseCSV } from './utils';

/**
 * Abstract base class for file processing workflows.
 * Uses Template Method pattern - subclasses override specific steps.
 */
export abstract class BaseFileWorkflow extends WorkflowEntrypoint<WorkflowEnv, WorkflowParams> {
  /**
   * Main workflow execution - defines the skeleton of the algorithm.
   * Calls overridable hooks for each step.
   */
  async run(event: WorkflowEvent<WorkflowParams>, step: WorkflowStep): Promise<WorkflowResult> {
    const params = event.payload;

    // Step 1: Validate - read and validate file content
    const content = await this.validateStep(step, params);

    // Step 2: Stage - move from incoming to staging
    await this.stageStep(step, params, content);

    // Step 3: Transform - parse CSV and apply transformations
    const records = await this.transformStep(step, content);

    // Step 4: Process - send records to API
    const result = await this.processStep(step, records, params);

    // Step 5: Finalize - move to processed, write errors
    await this.finalizeStep(step, params, records, result);

    return this.buildResult(params, records, result);
  }

  // ========================================
  // ABSTRACT METHODS - must be implemented
  // ========================================

  /**
   * Return the schema for this file type.
   * Defines required and optional fields.
   */
  protected abstract getSchema(): FileSchema;

  /**
   * Return the API endpoint for this file type.
   * Path relative to STUB_API_URL (e.g., '/api/time-attendance')
   */
  protected abstract getApiEndpoint(): string;

  // ========================================
  // VIRTUAL METHODS - can be overridden
  // ========================================

  /**
   * Validate step - read file and validate content exists.
   * Override to add custom validation logic.
   */
  protected async validateStep(step: WorkflowStep, params: WorkflowParams): Promise<string> {
    return step.do('validate', RETRY_CONFIG, async () => {
      const object = await this.env.BUCKET.get(`incoming/${params.path}`);
      if (!object) throw new Error(`File not found: incoming/${params.path}`);

      const content = await object.text();
      const lines = content.trim().split('\n').filter(l => l.trim());

      if (lines.length < 2) throw new Error('File has no data rows');

      // Validate headers match schema
      const headers = lines[0].split(',').map(h => h.trim().toLowerCase());
      const schema = this.getSchema();
      const missingHeaders = schema.requiredFields.filter(
        field => !headers.includes(field.toLowerCase())
      );

      if (missingHeaders.length > 0) {
        throw new Error(`Missing required headers: ${missingHeaders.join(', ')}`);
      }

      return content;
    });
  }

  /**
   * Stage step - move file from incoming to staging.
   * Override for custom staging logic.
   */
  protected async stageStep(
    step: WorkflowStep,
    params: WorkflowParams,
    content: string
  ): Promise<void> {
    await step.do('stage', RETRY_CONFIG, async () => {
      await this.env.BUCKET.put(`staging/${params.path}`, content);
      await this.env.BUCKET.delete(`incoming/${params.path}`);
    });
  }

  /**
   * Transform step - parse CSV to records.
   * Override to apply custom transformations (e.g., calculate hours).
   */
  protected async transformStep(step: WorkflowStep, content: string): Promise<Record[]> {
    return step.do('transform', async () => parseCSV(content));
  }

  /**
   * Process step - process records (override to call actual API).
   * Default implementation simulates API call with logging.
   */
  protected async processStep(
    step: WorkflowStep,
    records: Record[],
    params: WorkflowParams
  ): Promise<ProcessResult> {
    return step.do('process', { timeout: '25 minutes' }, async () => {
      const processed: Record[] = [];
      const failed: { record: Record; error: string }[] = [];

      for (const record of records) {
        // Simulate API call - log and mark as processed
        // TODO: Override in subclass to call actual partner API
        console.log(`[${params.fileType}] Processing record:`, {
          fileId: params.fileId,
          partner: params.partner,
          endpoint: this.getApiEndpoint(),
          record,
        });
        processed.push(record);
      }

      return { processed, failed };
    });
  }

  /**
   * Finalize step - move to processed, write errors.
   * Override for custom finalization logic.
   */
  protected async finalizeStep(
    step: WorkflowStep,
    params: WorkflowParams,
    records: Record[],
    result: ProcessResult
  ): Promise<void> {
    await step.do('finalize', RETRY_CONFIG, async () => {
      const stagingObj = await this.env.BUCKET.get(`staging/${params.path}`);

      if (stagingObj) {
        const metadata = {
          fileId: params.fileId,
          partner: params.partner,
          fileType: params.fileType,
          totalRecords: records.length,
          processedRecords: result.processed.length,
          failedRecords: result.failed.length,
          completedAt: new Date().toISOString(),
        };

        await this.env.BUCKET.put(`processed/${params.path}`, await stagingObj.arrayBuffer(), {
          customMetadata: { metadata: JSON.stringify(metadata) },
        });
        await this.env.BUCKET.delete(`staging/${params.path}`);
      }

      if (result.failed.length > 0) {
        const errorPath = params.path.replace('.csv', '_errors.json');
        await this.env.BUCKET.put(
          `errors/${errorPath}`,
          JSON.stringify(result.failed, null, 2),
          { httpMetadata: { contentType: 'application/json' } }
        );
      }
    });
  }

  /**
   * Build the final workflow result.
   */
  protected buildResult(
    params: WorkflowParams,
    records: Record[],
    result: ProcessResult
  ): WorkflowResult {
    return {
      fileId: params.fileId,
      path: params.path,
      partner: params.partner,
      fileType: params.fileType,
      total: records.length,
      processed: result.processed.length,
      failed: result.failed.length,
    };
  }
}
