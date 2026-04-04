import { useState, useCallback, useRef } from 'react';
import { Upload, X, File, Image, FileText, Loader2, AlertCircle } from 'lucide-react';
import { api, getErrorMessage } from '../../services/api';

const API_URL = import.meta.env.VITE_API_URL || '/api';

/**
 * Resolve a file URL to a full accessible URL.
 * Handles both old GCS public URLs and new backend-proxied paths.
 * Old: https://storage.googleapis.com/bucket/uploads/userId/fileId.ext
 * New: /api/uploads/file/uploads/userId/fileId.ext
 */
export function resolveFileUrl(url: string): string {
  if (!url) return url;

  // Old GCS direct URLs — convert to backend proxy
  if (url.startsWith('https://storage.googleapis.com/')) {
    // Extract path after the bucket name: uploads/userId/fileId.ext
    const match = url.match(/storage\.googleapis\.com\/[^/]+\/(.+)$/);
    if (match) {
      const filePath = match[1];
      // Get auth token for the request
      const baseUrl = API_URL.replace(/\/api\/?$/, '');
      return `${baseUrl}/api/uploads/file/${filePath}`;
    }
  }

  // New relative proxy URLs — prepend the API base
  if (url.startsWith('/api/uploads/file/')) {
    const baseUrl = API_URL.replace(/\/api\/?$/, '');
    return `${baseUrl}${url}`;
  }

  return url;
}

interface UploadedFile {
  id: string;
  name: string;
  url: string;
  mimeType: string;
  size: number;
}

interface FileUploadProps {
  files: UploadedFile[];
  onChange: (files: UploadedFile[]) => void;
  maxFiles?: number;
  maxSizeMB?: number;
  accept?: string;
  label?: string;
}

const ALLOWED_TYPES = [
  'application/pdf',
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/msword',
  'application/vnd.ms-excel',
  'text/csv',
];

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function getFileIcon(mimeType: string) {
  if (mimeType.startsWith('image/')) {
    return Image;
  }
  if (mimeType === 'application/pdf') {
    return FileText;
  }
  return File;
}

export function FileUpload({
  files,
  onChange,
  maxFiles = 10,
  maxSizeMB = 10,
  accept = '.pdf,.jpg,.jpeg,.png,.gif,.webp,.doc,.docx,.xls,.xlsx,.csv',
  label = 'Attachments',
}: FileUploadProps) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFiles = useCallback(
    async (fileList: FileList) => {
      if (files.length >= maxFiles) {
        setError(`Maximum ${maxFiles} files allowed`);
        return;
      }

      const filesToUpload = Array.from(fileList).slice(0, maxFiles - files.length);

      // Validate files
      for (const file of filesToUpload) {
        if (!ALLOWED_TYPES.includes(file.type)) {
          setError(`File type ${file.type} is not allowed`);
          return;
        }
        if (file.size > maxSizeMB * 1024 * 1024) {
          setError(`File ${file.name} exceeds ${maxSizeMB}MB limit`);
          return;
        }
      }

      setUploading(true);
      setError(null);

      try {
        const uploadPromises = filesToUpload.map(async (file) => {
          const formData = new FormData();
          formData.append('file', file);

          // Don't set Content-Type header - axios will set it automatically with the correct boundary
          const response = await api.post('/uploads', formData);

          return response.data.data as UploadedFile;
        });

        const uploaded = await Promise.all(uploadPromises);
        onChange([...files, ...uploaded]);
      } catch (err) {
        setError(getErrorMessage(err));
      } finally {
        setUploading(false);
      }
    },
    [files, maxFiles, maxSizeMB, onChange]
  );

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      handleFiles(e.target.files);
    }
  };

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setDragActive(false);

      if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
        handleFiles(e.dataTransfer.files);
      }
    },
    [handleFiles]
  );

  const handleRemove = (fileId: string) => {
    onChange(files.filter((f) => f.id !== fileId));
  };

  const handleViewFile = async (file: UploadedFile) => {
    try {
      // Use the proxy endpoint to stream the file directly through the backend
      // This avoids GCS signed URL issues (signBlob permission) and works reliably
      const proxyUrl = resolveFileUrl(file.url);

      // Fetch the file as a blob with auth headers
      const response = await api.get(
        proxyUrl.replace(new RegExp(`^.*?/api/`), '/'),
        { responseType: 'blob' }
      );

      // Create a blob URL and open in new tab
      const blob = new Blob([response.data], {
        type: response.headers['content-type'] || file.mimeType || 'application/octet-stream',
      });
      const blobUrl = URL.createObjectURL(blob);
      window.open(blobUrl, '_blank');

      // Clean up blob URL after a delay (browser needs time to load it)
      setTimeout(() => URL.revokeObjectURL(blobUrl), 60000);
    } catch {
      setError('Failed to open file. Please try again.');
    }
  };

  return (
    <div className="space-y-3">
      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">{label}</label>

      {/* Drop Zone */}
      <div
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
        onClick={() => inputRef.current?.click()}
        className={`border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors ${
          dragActive
            ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20'
            : 'border-gray-300 dark:border-gray-600 hover:border-primary-400 hover:bg-gray-50 dark:hover:bg-gray-700/50'
        } ${uploading ? 'pointer-events-none opacity-60' : ''}`}
      >
        <input
          ref={inputRef}
          type="file"
          onChange={handleInputChange}
          accept={accept}
          multiple
          className="hidden"
          disabled={uploading}
        />

        {uploading ? (
          <div className="flex flex-col items-center gap-2">
            <Loader2 className="w-8 h-8 text-primary-500 animate-spin" />
            <p className="text-sm text-gray-600 dark:text-gray-400">Uploading...</p>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-2">
            <Upload className="w-8 h-8 text-gray-400" />
            <p className="text-sm text-gray-600 dark:text-gray-400">
              <span className="font-medium text-primary-600">Click to upload</span> or drag and drop
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              PDF, images, Word, Excel, CSV (max {maxSizeMB}MB each)
            </p>
          </div>
        )}
      </div>

      {/* Error Message */}
      {error && (
        <div className="flex items-center gap-2 text-sm text-danger-600">
          <AlertCircle className="w-4 h-4" />
          {error}
        </div>
      )}

      {/* Uploaded Files List */}
      {files.length > 0 && (
        <div className="space-y-2">
          {files.map((file) => {
            const FileIcon = getFileIcon(file.mimeType);
            return (
              <div
                key={file.id}
                className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors"
                onClick={() => handleViewFile(file)}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="flex-shrink-0 w-10 h-10 bg-gray-200 dark:bg-gray-600 rounded-lg flex items-center justify-center">
                    <FileIcon className="w-5 h-5 text-gray-500 dark:text-gray-300" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-gray-900 dark:text-white truncate">{file.name}</p>
                    {file.size > 0 && (
                      <p className="text-xs text-gray-500 dark:text-gray-400">{formatFileSize(file.size)}</p>
                    )}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleRemove(file.id);
                  }}
                  className="flex-shrink-0 p-1 text-gray-400 hover:text-danger-600 hover:bg-danger-50 rounded transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            );
          })}
        </div>
      )}

      {/* File count indicator */}
      <p className="text-xs text-gray-500 dark:text-gray-400">
        {files.length} of {maxFiles} files
      </p>
    </div>
  );
}
