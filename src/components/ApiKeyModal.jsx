import React, { useState } from 'react';
import { Key, X, CheckCircle } from 'lucide-react';

export default function ApiKeyModal({ onClose, onSaved, isSet }) {
  const [key, setKey] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const handleSave = async () => {
    if (!key.trim()) return;
    setSaving(true);
    setError('');
    try {
      const res = await fetch('/api/configure-api-key', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ apiKey: key.trim() }),
      });
      const data = await res.json();
      if (data.success) {
        onSaved();
      } else {
        setError(data.error || 'Failed to save API key');
      }
    } catch (err) {
      setError('Failed to connect to server');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30">
      <div className="bg-white border border-black rounded-lg w-full max-w-md p-6 relative">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 cursor-pointer hover:bg-gray-100 rounded p-1"
        >
          <X size={16} />
        </button>

        <div className="flex items-center gap-2 mb-4">
          <Key size={18} />
          <h3 className="text-base font-bold">Gemini API Key</h3>
        </div>

        {isSet ? (
          <div className="flex items-center gap-2 text-sm text-green-700 bg-green-50 border border-green-200 rounded p-3 mb-4">
            <CheckCircle size={16} />
            API key is configured and active.
          </div>
        ) : null}

        <p className="text-xs text-gray-600 mb-3">
          Enter your Google Gemini API key to enable AI-powered patient extraction and criteria parsing.
          Without a key, the app uses built-in demo data and deterministic matching.
        </p>

        <p className="text-xs text-gray-500 mb-3">
          Get a free key at{' '}
          <a
            href="https://aistudio.google.com/apikey"
            target="_blank"
            rel="noopener"
            className="underline font-semibold text-black"
          >
            aistudio.google.com/apikey
          </a>
        </p>

        <input
          type="password"
          value={key}
          onChange={(e) => setKey(e.target.value)}
          placeholder="AIzaSy..."
          className="w-full border border-black rounded px-3 py-2 text-sm font-mono mb-2 outline-none focus:border-gray-600"
        />

        {error && <p className="text-xs text-red-600 mb-2">{error}</p>}

        <div className="flex items-center gap-2 mt-3">
          <button
            onClick={onClose}
            className="flex-1 py-2 border border-black rounded text-sm font-semibold cursor-pointer hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={!key.trim() || saving}
            className="flex-1 py-2 bg-black text-white rounded text-sm font-bold cursor-pointer hover:bg-gray-800 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {saving ? 'Saving...' : 'Save Key'}
          </button>
        </div>
      </div>
    </div>
  );
}
