import { useState, useEffect, useRef } from 'react';
import { PlusCircle } from 'lucide-react';
import { api } from '../services/api';
import type { Vendor } from '@finance/shared';

interface VendorAutocompleteProps {
  vendorId: string;
  vendorName: string;
  onSelect: (vendorId: string, vendorName: string) => void;
  onCreateNew?: (name: string) => void;
  placeholder?: string;
  className?: string;
  required?: boolean;
  error?: string;
}

export function VendorAutocomplete({
  vendorId: _vendorId,
  vendorName,
  onSelect,
  onCreateNew,
  placeholder = 'Search payee / vendor name',
  className = '',
  required: _required,
  error,
}: VendorAutocompleteProps) {
  const [inputValue, setInputValue] = useState(vendorName);
  const [suggestions, setSuggestions] = useState<Vendor[]>([]);
  const [open, setOpen] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setInputValue(vendorName);
  }, [vendorName]);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const fetchSuggestions = (value: string) => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      try {
        const params = value.trim()
          ? `/vendors?search=${encodeURIComponent(value)}&limit=20&status=active`
          : `/vendors?limit=20&status=active`;
        const res = await api.get(params);
        const vendors: Vendor[] = res.data.data ?? [];
        setSuggestions(vendors);
        setOpen(true);
      } catch {
        setSuggestions([]);
        setOpen(false);
      }
    }, value.trim() ? 300 : 0);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setInputValue(val);
    onSelect('', val);
    fetchSuggestions(val);
  };

  const handleSelect = (vendor: Vendor) => {
    setInputValue(vendor.name);
    setSuggestions([]);
    setOpen(false);
    onSelect(vendor.id, vendor.name);
  };

  const payeeTypeLabel = (type: string) => {
    if (type === 'employee') return 'Employee';
    if (type === 'other') return 'Other';
    return 'Vendor';
  };

  const showDropdown = open && (suggestions.length > 0 || (inputValue.trim() && onCreateNew));

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      <input
        className={`input w-full ${error ? 'border-red-500 dark:border-red-400' : ''}`}
        value={inputValue}
        onChange={handleChange}
        onFocus={() => fetchSuggestions(inputValue)}
        placeholder={placeholder}
        autoComplete="off"
      />
      {error && <p className="mt-1 text-xs text-red-500 dark:text-red-400">{error}</p>}
      {showDropdown && (
        <ul className="absolute z-50 left-0 right-0 mt-1 max-h-52 overflow-y-auto bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-md shadow-lg">
          {suggestions.map((v) => (
            <li
              key={v.id}
              onMouseDown={() => handleSelect(v)}
              className="px-3 py-2 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700"
            >
              <div className="text-sm font-medium text-gray-900 dark:text-white">{v.name}</div>
              <div className="text-xs text-gray-500 dark:text-gray-400">{payeeTypeLabel(v.payeeType)}</div>
            </li>
          ))}
          {onCreateNew && inputValue.trim() && (
            <li
              onMouseDown={() => { setOpen(false); onCreateNew(inputValue.trim()); }}
              className="px-3 py-2 cursor-pointer hover:bg-primary-50 dark:hover:bg-primary-900/20 border-t border-gray-100 dark:border-gray-700 flex items-center gap-2 text-primary-600 dark:text-primary-400"
            >
              <PlusCircle className="w-4 h-4 flex-shrink-0" />
              <span className="text-sm">Create "{inputValue.trim()}" as new payee</span>
            </li>
          )}
        </ul>
      )}
    </div>
  );
}
