import { useState, useEffect } from 'react';
import { FileUploader } from './components/FileUploader';
import { API_BASE_URL } from './config';

type FileType = 'time-attendance' | 'expenses' | 'payroll' | 'employees';

const FILE_TYPE_LABELS: Record<FileType, string> = {
  'time-attendance': 'Time & Attendance',
  'expenses': 'Expenses',
  'payroll': 'Payroll',
  'employees': 'Employees',
};

interface ProcessedFile {
  key: string;
  size: number;
  uploaded: string;           // R2 upload timestamp
  fileId?: string;
  partner?: string;
  fileType?: FileType;
  totalRecords?: number;
  processedRecords?: number;
  failedRecords?: number;
  completedAt?: string;       // Workflow completion timestamp
}

function App() {
  const [files, setFiles] = useState<ProcessedFile[]>([]);
  const [loading, setLoading] = useState(false);

  const loadFiles = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/files`);
      const data = await res.json();
      setFiles(data.files || []);
    } catch (e) {
      console.error('Failed to load files:', e);
    }
    setLoading(false);
  };

  useEffect(() => { loadFiles(); }, []);

  const downloadErrors = async (file: ProcessedFile) => {
    const res = await fetch(`${API_BASE_URL}/api/errors/${file.fileId}/csv`);
    if (!res.ok) { alert('No errors to download'); return; }
    const blob = await res.blob();
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `${file.fileId}_errors.csv`;
    a.click();
  };

  return (
    <div className="app-container">
      <h1 className="app-title">Rippling Integration POC</h1>
      <FileUploader />

      <div className="uploads-list-container">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h2 className="uploads-list-title">Processed Files</h2>
          <button onClick={loadFiles} disabled={loading} style={{ padding: '8px 16px', cursor: 'pointer' }}>
            {loading ? 'Loading...' : 'Refresh'}
          </button>
        </div>

        {files.length === 0 ? (
          <p className="no-uploads">No processed files yet.</p>
        ) : (
          <ul className="uploads-list">
            {files.map((f, i) => {
              const filename = f.key.split('/').pop() || f.key;
              const uploadDate = f.uploaded ? new Date(f.uploaded).toLocaleString() : '-';
              const processedDate = f.completedAt ? new Date(f.completedAt).toLocaleString() : uploadDate;
              const status = f.failedRecords && f.failedRecords > 0
                ? `${f.failedRecords} errors`
                : f.totalRecords !== undefined ? 'Success' : 'Completed';

              return (
                <li key={i} className="upload-item">
                  <div className="upload-item-info">
                    <div className="upload-item-header">
                      <span className="upload-item-name">{filename}</span>
                      {f.fileType && (
                        <span className={`file-type-badge file-type-${f.fileType}`}>
                          {FILE_TYPE_LABELS[f.fileType] || f.fileType}
                        </span>
                      )}
                    </div>
                    <div className="upload-item-meta">
                      <span>Uploaded: {uploadDate}</span>
                      <span>Processed: {processedDate}</span>
                      {f.totalRecords !== undefined && <span>{f.totalRecords} rows</span>}
                    </div>
                  </div>
                  <div className="upload-item-actions">
                    {f.failedRecords && f.failedRecords > 0 ? (
                      <>
                        <span className="upload-item-status completed-with-errors">{status}</span>
                        <button className="download-errors-btn" onClick={() => downloadErrors(f)}>↓ Errors</button>
                      </>
                    ) : (
                      <span className="upload-item-status completed">{status}</span>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}

export default App;
