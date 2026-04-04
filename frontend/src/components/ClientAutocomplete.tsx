import { useState, useEffect, useRef } from 'react';
import { api } from '../services/api';
import type { Client } from '@finance/shared';

interface ClientAutocompleteProps {
  clientId: string;
  clientName: string;
  onSelect: (clientId: string, clientName: string) => void;
  placeholder?: string;
  className?: string;
}

export function ClientAutocomplete({
  clientId: _clientId,
  clientName,
  onSelect,
  placeholder = 'Client name',
  className = '',
}: ClientAutocompleteProps) {
  const [inputValue, setInputValue] = useState(clientName);
  const [suggestions, setSuggestions] = useState<Client[]>([]);
  const [open, setOpen] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Keep input in sync with external clientName prop (e.g. when modal resets)
  useEffect(() => {
    setInputValue(clientName);
  }, [clientName]);

  // Close dropdown when clicking outside
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
    if (!value.trim()) {
      setSuggestions([]);
      setOpen(false);
      return;
    }
    debounceRef.current = setTimeout(async () => {
      try {
        const res = await api.get(`/clients?search=${encodeURIComponent(value)}&limit=10&status=active`);
        const clients: Client[] = res.data.data ?? [];
        setSuggestions(clients);
        setOpen(clients.length > 0);
      } catch {
        setSuggestions([]);
      }
    }, 300);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setInputValue(val);
    // If user types freely (no client selected), clear clientId, pass raw text
    onSelect('', val);
    fetchSuggestions(val);
  };

  const handleSelect = (client: Client) => {
    const displayName = client.companyName || client.name;
    setInputValue(displayName);
    setSuggestions([]);
    setOpen(false);
    onSelect(client.id, displayName);
  };

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      <input
        className="input w-full"
        value={inputValue}
        onChange={handleChange}
        onFocus={() => {
          if (suggestions.length > 0) setOpen(true);
          else if (inputValue.trim()) fetchSuggestions(inputValue);
        }}
        placeholder={placeholder}
        autoComplete="off"
      />
      {open && suggestions.length > 0 && (
        <ul className="absolute z-50 left-0 right-0 mt-1 max-h-52 overflow-y-auto bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-md shadow-lg">
          {suggestions.map((c) => (
            <li
              key={c.id}
              onMouseDown={() => handleSelect(c)}
              className="px-3 py-2 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700"
            >
              <div className="text-sm font-medium text-gray-900 dark:text-white">
                {c.companyName || c.name}
              </div>
              {c.companyName && (
                <div className="text-xs text-gray-500 dark:text-gray-400">{c.name}</div>
              )}
              {c.email && (
                <div className="text-xs text-gray-400 dark:text-gray-500">{c.email}</div>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
