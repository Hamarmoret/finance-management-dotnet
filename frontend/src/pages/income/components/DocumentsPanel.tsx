import { useRef, useState } from 'react';
import { Paperclip, Upload, Trash2, ExternalLink, ArrowRight, Loader2, FileText } from 'lucide-react';
import type { ContractAttachment, DocumentType } from '@finance/shared';
import { api, getErrorMessage } from '../../../services/api';

const DOC_TYPES: { value: DocumentType; label: string }[] = [
  { value: 'contract', label: 'Contract' },
  { value: 'proposal', label: 'Proposal / Quote' },
  { value: 'proforma_invoice', label: 'Proforma Invoice' },
  { value: 'tax_invoice', label: 'Tax Invoice' },
  { value: 'payment_receipt', label: 'Payment Receipt' },
  { value: 'other', label: 'Other' },
];

const DOC_TYPE_COLORS: Record<DocumentType, string> = {
  contract: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
  proposal: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300',
  proforma_invoice: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300',
  tax_invoice: 'bg-success-100 text-success-700 dark:bg-success-900/20 dark:text-success-400',
  payment_receipt: 'bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-300',
  other: 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300',
};

interface DocumentsPanelProps {
  attachments: ContractAttachment[];
  entityType: 'contract' | 'milestone';
  entityId: string;
  onAttachmentsChanged: (updated: ContractAttachment[]) => void;
  /** Restrict which document types are shown in the type selector */
  allowedTypes?: DocumentType[];
}

export default function DocumentsPanel({
  attachments,
  entityType,
  entityId,
  onAttachmentsChanged,
  allowedTypes,
}: DocumentsPanelProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [pendingType, setPendingType] = useState<DocumentType>(
    allowedTypes?.[0] ?? 'other'
  );
  const [error, setError] = useState<string | null>(null);
  const [openingFile, setOpeningFile] = useState<number | null>(null);

  const handleOpenFile = async (url: string, index: number) => {
    setOpeningFile(index);
    try {
      const res = await api.post('/uploads/get-signed-url', { url });
      const signedUrl = res.data?.data?.url;
      if (signedUrl) {
        window.open(signedUrl, '_blank', 'noopener,noreferrer');
      } else {
        // Fallback: try the proxy endpoint
        window.open(url, '_blank', 'noopener,noreferrer');
      }
    } catch {
      // Fallback: open the raw URL (will work if bucket is public)
      window.open(url, '_blank', 'noopener,noreferrer');
    } finally {
      setOpeningFile(null);
    }
  };

  const patchEndpoint = entityType === 'contract'
    ? `/income-contracts/${entityId}/attachments`
    : `/income-contracts/milestones/${entityId}/attachments`;

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = '';
    setUploading(true);
    setError(null);
    try {
      const formData = new FormData();
      formData.append('file', file);
      const uploadRes = await api.post('/uploads', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      const { url, name, size, mimeType } = uploadRes.data.data ?? uploadRes.data;

      const newAttachment: ContractAttachment = {
        url,
        name: name ?? file.name,
        size: size ?? file.size,
        mimeType: mimeType ?? file.type,
        documentType: pendingType,
        uploadedAt: new Date().toISOString(),
      };

      const updated = [...attachments, newAttachment];
      await api.patch(patchEndpoint, { attachments: updated });
      onAttachmentsChanged(updated);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (index: number) => {
    const updated = attachments.filter((_, i) => i !== index);
    try {
      await api.patch(patchEndpoint, { attachments: updated });
      onAttachmentsChanged(updated);
    } catch (err) {
      setError(getErrorMessage(err));
    }
  };

  const types = allowedTypes ?? DOC_TYPES.map(d => d.value);
  const filteredDocTypes = DOC_TYPES.filter(d => types.includes(d.value));

  // Show proforma→tax_invoice connection arrow
  const hasProforma = attachments.some(a => a.documentType === 'proforma_invoice');
  const hasTaxInvoice = attachments.some(a => a.documentType === 'tax_invoice');
  const showInvoiceLink = entityType === 'milestone' && hasProforma && hasTaxInvoice;

  return (
    <div className="space-y-3">
      {error && (
        <p className="text-xs text-danger-600 dark:text-danger-400">{error}</p>
      )}

      {/* Invoice connection indicator */}
      {showInvoiceLink && (
        <div className="flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-gray-700/50 rounded px-2 py-1">
          <span className="text-amber-600 dark:text-amber-400 font-medium">Proforma</span>
          <ArrowRight className="w-3 h-3" />
          <span className="text-success-600 dark:text-success-400 font-medium">Tax Invoice</span>
          <span className="ml-1">linked</span>
        </div>
      )}

      {/* Document list */}
      {attachments.length > 0 && (
        <div className="space-y-1">
          {attachments.map((att, i) => (
            <div key={i} className="flex items-center gap-2 p-2 rounded-lg bg-gray-50 dark:bg-gray-700/40 group">
              <FileText className="w-3.5 h-3.5 text-gray-400 shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium text-gray-800 dark:text-gray-200 truncate">{att.name}</p>
                <p className="text-xs text-gray-400">{(att.size / 1024).toFixed(0)} KB</p>
              </div>
              <span className={`text-xs px-1.5 py-0.5 rounded font-medium shrink-0 ${DOC_TYPE_COLORS[att.documentType]}`}>
                {DOC_TYPES.find(d => d.value === att.documentType)?.label ?? att.documentType}
              </span>
              <button
                onClick={() => handleOpenFile(att.url, i)}
                disabled={openingFile === i}
                className="p-1 text-gray-400 hover:text-primary-600 dark:hover:text-primary-400 disabled:opacity-50"
              >
                {openingFile === i
                  ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  : <ExternalLink className="w-3.5 h-3.5" />}
              </button>
              <button onClick={() => handleDelete(i)} className="p-1 text-gray-400 hover:text-danger-600 dark:hover:text-danger-400 opacity-0 group-hover:opacity-100 transition-opacity">
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Upload controls */}
      <div className="flex items-center gap-2">
        <select
          value={pendingType}
          onChange={e => setPendingType(e.target.value as DocumentType)}
          className="text-xs border border-gray-300 dark:border-gray-600 rounded px-2 py-1 bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300"
        >
          {filteredDocTypes.map(dt => (
            <option key={dt.value} value={dt.value}>{dt.label}</option>
          ))}
        </select>
        <button
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading}
          className="flex items-center gap-1.5 text-xs px-2.5 py-1.5 border border-dashed border-gray-300 dark:border-gray-600 rounded-lg text-gray-500 dark:text-gray-400 hover:border-primary-400 hover:text-primary-600 dark:hover:text-primary-400 transition-colors disabled:opacity-50"
        >
          {uploading
            ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
            : <Upload className="w-3.5 h-3.5" />}
          {uploading ? 'Uploading...' : 'Upload file'}
        </button>
        <input ref={fileInputRef} type="file" onChange={handleFileChange} className="hidden"
          accept=".pdf,.doc,.docx,.xls,.xlsx,.csv,.jpg,.jpeg,.png" />
      </div>

      {attachments.length === 0 && (
        <p className="text-xs text-gray-400 dark:text-gray-500 flex items-center gap-1.5">
          <Paperclip className="w-3.5 h-3.5" />
          No documents attached yet
        </p>
      )}
    </div>
  );
}
