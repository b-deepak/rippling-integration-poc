import { useState, useRef, useCallback } from 'react';
import { API_BASE_URL } from '../config';

const MAX_FILES = 10;
const MAX_FILE_SIZE = 5 * 1024 * 1024;
const MAX_TOTAL_SIZE = 50 * 1024 * 1024;

const FILE_TYPES = [
  { value: 'time-attendance', label: 'Time & Attendance' },
  { value: 'expenses', label: 'Expenses' },
  { value: 'payroll', label: 'Payroll' },
  { value: 'employees', label: 'Employees' },
] as const;

type FileType = typeof FILE_TYPES[number]['value'];

interface UploadResult {
  file: string;
  success: boolean;
  error?: string;
  fileId?: string;
  rowCount?: number;
  fileType?: FileType;
}

const PARTNER_NAME = 'rippling';

export function FileUploader() {
  const [files, setFiles] = useState<File[]>([]);
  const [fileType, setFileType] = useState<FileType | ''>('');
  const [isDragOver, setIsDragOver] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [results, setResults] = useState<UploadResult[]>([]);
  const [error, setError] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / 1024 / 1024).toFixed(2) + ' MB';
  };

  const validateFiles = (fileList: File[]) => {
    const valid: File[] = [];
    const errors: string[] = [];

    if (fileList.length > MAX_FILES) {
      return { valid: [], errors: [`Max ${MAX_FILES} files allowed`] };
    }

    let total = 0;
    for (const f of fileList) {
      if (!f.name.endsWith('.csv')) { errors.push(`${f.name}: not CSV`); continue; }
      if (f.size > MAX_FILE_SIZE) { errors.push(`${f.name}: > 5MB`); continue; }
      if (f.size === 0) { errors.push(`${f.name}: empty`); continue; }
      total += f.size;
      valid.push(f);
    }
    if (total > MAX_TOTAL_SIZE) return { valid: [], errors: ['Total > 50MB'] };
    return { valid, errors };
  };

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    setError('');
    setResults([]);
    const { valid, errors } = validateFiles(Array.from(e.dataTransfer.files));
    if (errors.length) setError(errors.join('\n'));
    setFiles(valid);
  }, []);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setError('');
    setResults([]);
    if (e.target.files) {
      const { valid, errors } = validateFiles(Array.from(e.target.files));
      if (errors.length) setError(errors.join('\n'));
      setFiles(valid);
    }
  };

  const handleUpload = async () => {
    if (!files.length || !fileType) return;

    setIsUploading(true);
    setError('');
    setResults([]);

    const uploadResults: UploadResult[] = [];

    await Promise.all(files.map(async (file) => {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('partner', PARTNER_NAME);
      formData.append('fileType', fileType);

      try {
        const res = await fetch(`${API_BASE_URL}/api/upload`, { method: 'POST', body: formData });
        const data = await res.json();
        if (res.ok) {
          uploadResults.push({ file: file.name, success: true, fileId: data.fileId, rowCount: data.rowCount, fileType: data.fileType });
        } else {
          uploadResults.push({ file: file.name, success: false, error: data.error });
        }
      } catch {
        uploadResults.push({ file: file.name, success: false, error: 'Network error' });
      }
    }));

    setResults(uploadResults);
    setIsUploading(false);

    if (uploadResults.every(r => r.success)) {
      setFiles([]);
      setFileType('');
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const accepted = results.filter(r => r.success);
  const rejected = results.filter(r => !r.success);

  return (
    <div className="uploader-container">
      <div className="form-group">
        <label>File Type *</label>
        <select
          className="file-type-select"
          value={fileType}
          onChange={e => setFileType(e.target.value as FileType)}
          disabled={isUploading}
        >
          <option value="">Select file type...</option>
          {FILE_TYPES.map(ft => (
            <option key={ft.value} value={ft.value}>{ft.label}</option>
          ))}
        </select>
      </div>

      <div className="form-group">
        <label>Files * (max 10, 5MB each)</label>
        <div
          className={`drop-zone ${isDragOver ? 'drag-over' : ''} ${files.length ? 'has-file' : ''}`}
          onDragOver={e => { e.preventDefault(); setIsDragOver(true); }}
          onDragLeave={e => { e.preventDefault(); setIsDragOver(false); }}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
        >
          <input ref={fileInputRef} type="file" className="file-input" onChange={handleFileChange} disabled={isUploading} multiple accept=".csv" />
          {files.length ? (
            <div className="selected-files-summary">{files.length} file(s) - {formatSize(files.reduce((s, f) => s + f.size, 0))}</div>
          ) : (
            <p className="drop-zone-text">Drop CSV files here or click to select</p>
          )}
        </div>
      </div>

      {files.length > 0 && (
        <div className="file-list">
          {files.map((f, i) => (
            <div key={i} className="file-list-item">
              <span className="file-list-name">{f.name}</span>
              <span className="file-list-size">{formatSize(f.size)}</span>
              {!isUploading && <button className="file-list-remove" onClick={() => setFiles(files.filter((_, j) => j !== i))}>×</button>}
            </div>
          ))}
        </div>
      )}

      <button className="upload-button" onClick={handleUpload} disabled={isUploading || !files.length || !fileType}>
        {isUploading ? 'Uploading...' : `Upload ${files.length} File(s)`}
      </button>

      {results.length > 0 && (
        <div className={`upload-results ${rejected.length ? 'has-errors' : 'all-success'}`}>
          {accepted.length > 0 && (
            <div className="success-msg">
              ✓ {accepted.length} file(s) accepted - processing in background
              <div className="accepted-list">
                {accepted.map((r, i) => <div key={i}>{r.file} ({r.rowCount} rows)</div>)}
              </div>
            </div>
          )}
          {rejected.length > 0 && (
            <div className="error-msg">
              ✗ {rejected.length} file(s) rejected
              {rejected.map((r, i) => <div key={i} className="upload-error-item"><strong>{r.file}:</strong> {r.error}</div>)}
            </div>
          )}
        </div>
      )}

      {error && <div className="error-message">{error.split('\n').map((l, i) => <div key={i}>{l}</div>)}</div>}
    </div>
  );
}
