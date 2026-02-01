import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { validateCSV } from './services/stream-validator';
import { FILE_TYPES, type FileType } from './workflows/types';
import { getSchema } from './schemas';

// Validate CSV headers match the expected schema for the file type
function validateHeaders(content: string, fileType: FileType): { valid: boolean; error?: string } {
  const firstLine = content.split('\n')[0];
  if (!firstLine) return { valid: false, error: 'Empty file' };

  const headers = firstLine.split(',').map(h => h.trim().toLowerCase());
  const schema = getSchema(fileType);
  const missingHeaders = schema.requiredFields.filter(
    field => !headers.includes(field.toLowerCase())
  );

  if (missingHeaders.length > 0) {
    return {
      valid: false,
      error: `File does not match "${fileType}" schema. Missing required headers: ${missingHeaders.join(', ')}`,
    };
  }

  return { valid: true };
}

// Export all workflow classes
export { TimeAttendanceWorkflow } from './workflows/time-attendance';
export { ExpensesWorkflow } from './workflows/expenses';
export { PayrollWorkflow } from './workflows/payroll';
export { EmployeesWorkflow } from './workflows/employees';

interface Env {
  BUCKET: R2Bucket;
  TIME_ATTENDANCE_WORKFLOW: Workflow;
  EXPENSES_WORKFLOW: Workflow;
  PAYROLL_WORKFLOW: Workflow;
  EMPLOYEES_WORKFLOW: Workflow;
}

interface WorkflowParams {
  fileId: string;
  path: string;
  partner: string;
  fileType: FileType;
}

// Map file types to workflow bindings
function getWorkflow(env: Env, fileType: FileType): Workflow {
  const workflowMap: Record<FileType, Workflow> = {
    'time-attendance': env.TIME_ATTENDANCE_WORKFLOW,
    'expenses': env.EXPENSES_WORKFLOW,
    'payroll': env.PAYROLL_WORKFLOW,
    'employees': env.EMPLOYEES_WORKFLOW,
  };
  return workflowMap[fileType];
}

const app = new Hono<{ Bindings: Env }>();

app.use('*', cors());

// POST /api/upload
app.post('/api/upload', async (c) => {
  try {
    const formData = await c.req.formData();
    const file = formData.get('file');
    const partner = formData.get('partner');
    const fileType = formData.get('fileType');

    if (!file || !(file instanceof File)) {
      return c.json({ error: 'File is required' }, 400);
    }
    if (!partner || typeof partner !== 'string' || !partner.trim()) {
      return c.json({ error: 'Partner is required' }, 400);
    }
    if (!fileType || typeof fileType !== 'string' || !FILE_TYPES.includes(fileType as FileType)) {
      return c.json({ error: `File type is required. Valid types: ${FILE_TYPES.join(', ')}` }, 400);
    }

    const validFileType = fileType as FileType;
    const content = await file.text();
    const validation = await validateCSV(file, content, { maxFileSize: 5 * 1024 * 1024 });

    if (!validation.valid) {
      return c.json({ error: validation.error }, 400);
    }

    // Validate headers match the selected file type schema
    const headerValidation = validateHeaders(content, validFileType);
    if (!headerValidation.valid) {
      return c.json({ error: headerValidation.error }, 400);
    }

    const fileId = crypto.randomUUID();
    const now = new Date();
    const dateStr = `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, '0')}-${String(now.getUTCDate()).padStart(2, '0')}`;

    // New path structure: {partner}/{prefix}/{fileType}/{yyyy-mm-dd}/{filename}_{timestamp}.csv
    const path = `${partner.trim()}/${validFileType}/${dateStr}/${file.name.slice(0, -4)}_${now.getTime()}.csv`;

    await c.env.BUCKET.put(`incoming/${path}`, content, {
      customMetadata: {
        fileId,
        partner: partner.trim(),
        fileType: validFileType,
        originalFilename: file.name,
      },
    });

    const workflow = getWorkflow(c.env, validFileType);
    await workflow.create({
      id: fileId,
      params: { fileId, path, partner: partner.trim(), fileType: validFileType } as WorkflowParams,
    });

    return c.json({ fileId, status: 'accepted', fileType: validFileType, rowCount: validation.details.rowCount });
  } catch (error) {
    console.error('Upload error:', error);
    return c.json({ error: 'Internal server error' }, 500);
  }
});

// GET /api/files - List processed files from R2
app.get('/api/files', async (c) => {
  try {
    const partner = c.req.query('partner');
    const fileType = c.req.query('fileType') as FileType | undefined;

    let prefix = 'processed/';
    if (partner && fileType) {
      prefix = `processed/${partner}/${fileType}/`;
    } else if (partner) {
      prefix = `processed/${partner}/`;
    } else if (fileType) {
      // Need to list all and filter by fileType in path
    }

    const listed = await c.env.BUCKET.list({ prefix, limit: 100 });

    let files = await Promise.all(
      listed.objects.map(async (obj) => {
        const meta = obj.customMetadata?.metadata;
        const parsed = meta ? JSON.parse(meta) : {};
        return {
          key: obj.key,
          size: obj.size,
          uploaded: obj.uploaded,
          ...parsed,
        };
      })
    );

    // Filter by fileType if specified but no partner
    if (fileType && !partner) {
      files = files.filter((f) => f.fileType === fileType);
    }

    return c.json({ files, count: files.length });
  } catch (error) {
    console.error('List error:', error);
    return c.json({ error: 'Internal server error' }, 500);
  }
});

// GET /api/errors/:fileId/csv
app.get('/api/errors/:fileId/csv', async (c) => {
  try {
    const fileId = c.req.param('fileId');
    const listed = await c.env.BUCKET.list({ prefix: 'errors/' });
    const errorFile = listed.objects.find((o) => o.key.includes(fileId) || o.customMetadata?.fileId === fileId);

    if (!errorFile) {
      // Try to find by listing processed files and matching fileId
      const processedList = await c.env.BUCKET.list({ prefix: 'processed/' });
      const processedFile = processedList.objects.find((o) => {
        const meta = o.customMetadata?.metadata;
        if (meta) {
          const parsed = JSON.parse(meta);
          return parsed.fileId === fileId;
        }
        return false;
      });

      if (!processedFile) return c.json({ error: 'File not found' }, 404);

      const errorKey = `errors/${processedFile.key.replace('processed/', '').replace('.csv', '_errors.json')}`;
      const errorObj = await c.env.BUCKET.get(errorKey);
      if (!errorObj) return c.json({ error: 'No errors' }, 404);

      return await buildCSVResponse(c, errorObj, fileId);
    }

    const errorObj = await c.env.BUCKET.get(errorFile.key);
    if (!errorObj) return c.json({ error: 'No errors' }, 404);

    return await buildCSVResponse(c, errorObj, fileId);
  } catch (error) {
    console.error('Error CSV:', error);
    return c.json({ error: 'Internal server error' }, 500);
  }
});

async function buildCSVResponse(c: any, errorObj: R2ObjectBody, fileId: string) {
  const data = await errorObj.json() as Array<{ record: Record<string, string>; error: string }>;
  if (!data.length) return c.json({ error: 'No errors' }, 404);

  const keys = Object.keys(data[0].record || {});
  const headers = [...keys, 'error_message'];
  const lines = [headers.join(',')];

  for (const item of data) {
    const values = keys.map((k) => {
      const v = item.record?.[k] || '';
      return v.includes(',') || v.includes('"') ? `"${v.replace(/"/g, '""')}"` : v;
    });
    values.push(`"${(item.error || '').replace(/"/g, '""')}"`);
    lines.push(values.join(','));
  }

  return new Response(lines.join('\n'), {
    headers: { 'Content-Type': 'text/csv', 'Content-Disposition': `attachment; filename="${fileId}_errors.csv"` },
  });
}

export default app;
