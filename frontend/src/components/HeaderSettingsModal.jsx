import { useState, useEffect, useMemo } from 'react';
import axios from '../utils/axios';
import { getHeadersConfig } from './DataGrid';

export default function HeaderSettingsModal({
  isOpen,
  onClose,
  sheet,
  onSaveSuccess,
}) {
  const [headerMap, setHeaderMap] = useState({});
  const [extraHeaders, setExtraHeaders] = useState([]);
  const [saving, setSaving] = useState(false);

  const headersConfig = useMemo(() => {
    if (!sheet) return [];
    return getHeadersConfig(sheet.processType) || [];
  }, [sheet]);

  useEffect(() => {
    if (isOpen && sheet) {
      setHeaderMap(sheet.customHeaders || {});
      setExtraHeaders(sheet.extraHeaders || []);
    }
  }, [isOpen, sheet]);

  if (!isOpen || !sheet) return null;

  const handleChange = (key, value) => {
    setHeaderMap((prev) => ({
      ...prev,
      [key]: value,
    }));
  };

  const handleResetField = (key) => {
    setHeaderMap((prev) => {
      const updated = { ...prev };
      delete updated[key];
      return updated;
    });
  };

  const handleResetAll = () => {
    setHeaderMap({});
    setExtraHeaders([]);
  };

  const handleExtraHeaderChange = (index, value) => {
    setExtraHeaders((prev) => {
      const updated = [...prev];
      updated[index] = value;
      return updated;
    });
  };

  const handleAddExtraHeader = () => {
    setExtraHeaders((prev) => [...prev, '']);
  };

  const handleRemoveExtraHeader = (index) => {
    setExtraHeaders((prev) => prev.filter((_, i) => i !== index));
  };

  const buildCleanHeaderMap = () => {
    const cleaned = {};

    headersConfig.forEach((header) => {
      const rawValue = headerMap[header.key];

      if (rawValue === undefined || rawValue === null) return;

      const trimmedValue = String(rawValue).trim();
      const defaultLabel = String(header.defaultLabel || '').trim();

      if (!trimmedValue || trimmedValue === defaultLabel) return;

      cleaned[header.key] = trimmedValue;
    });

    return cleaned;
  };

  const buildCleanExtraHeaders = () => {
    return extraHeaders
      .map((item) => String(item || '').trim())
      .filter(Boolean);
  };

  const handleSave = async () => {
    try {
      setSaving(true);

      const cleanedHeaderMap = buildCleanHeaderMap();
      const cleanedExtraHeaders = buildCleanExtraHeaders();

      const { data } = await axios.put(`/api/sheets/${sheet._id}`, {
        customHeaders: cleanedHeaderMap,
        extraHeaders: cleanedExtraHeaders,
      });

      onSaveSuccess?.(data);
      onClose();
    } catch (err) {
      console.error('SAVE CUSTOM HEADERS ERROR:', err);
      alert(
        err.response?.data?.message ||
          `Failed to save custom headers${err.response?.status ? ` (${err.response.status})` : ''}`
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,0.6)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
        padding: '2rem',
      }}
    >
      <div
        className="glass-panel"
        style={{
          width: '100%',
          maxWidth: '760px',
          maxHeight: '85vh',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          borderRadius: '16px',
        }}
      >
        <div
          style={{
            padding: '2rem 2rem 1rem 2rem',
            borderBottom: '1px solid var(--border-color)',
          }}
        >
          <h3 style={{ margin: 0 }}>
            Customize Headers for "{sheet.title}"
          </h3>
          <p
            style={{
              fontSize: '0.9rem',
              color: 'var(--text-muted)',
              marginTop: '0.75rem',
              marginBottom: 0,
            }}
          >
            Change default labels and add extra headers if needed.
          </p>
        </div>

        <div style={{ flex: 1, overflowY: 'auto', padding: '1.25rem 2rem' }}>
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              marginBottom: '1rem',
              gap: '1rem',
            }}
          >
            <button
              type="button"
              className="btn"
              onClick={handleAddExtraHeader}
              disabled={saving}
              style={{
                background: 'transparent',
                border: '1px solid var(--border-color)',
                color: 'white',
              }}
            >
              + Add New Header
            </button>

            <button
              type="button"
              className="btn"
              onClick={handleResetAll}
              disabled={saving}
              style={{
                background: 'transparent',
                border: '1px solid var(--border-color)',
                color: 'white',
              }}
            >
              Reset All
            </button>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {headersConfig.map((h) => {
              const hasCustomValue = Object.prototype.hasOwnProperty.call(headerMap, h.key);
              const currentVal = hasCustomValue ? headerMap[h.key] : '';

              return (
                <div
                  key={h.key}
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '160px 1fr auto',
                    alignItems: 'center',
                    gap: '1rem',
                  }}
                >
                  <div>
                    <div style={{ color: 'white', fontSize: '0.95rem', fontWeight: 600 }}>
                      {h.key}
                    </div>
                    <div style={{ color: 'var(--text-muted)', fontSize: '0.8rem', marginTop: '0.25rem' }}>
                      Default: {h.defaultLabel}
                    </div>
                  </div>

                  <input
                    className="input-field"
                    value={currentVal}
                    onChange={(e) => handleChange(h.key, e.target.value)}
                    placeholder={h.defaultLabel}
                    disabled={saving}
                  />

                  <button
                    type="button"
                    className="btn"
                    onClick={() => handleResetField(h.key)}
                    disabled={saving}
                    style={{
                      background: 'transparent',
                      border: '1px solid var(--border-color)',
                      color: 'white',
                      minWidth: '80px',
                    }}
                  >
                    Reset
                  </button>
                </div>
              );
            })}

            {extraHeaders.length > 0 && (
              <div style={{ marginTop: '1.5rem' }}>
                <h4 style={{ color: 'white', marginBottom: '1rem' }}>New Extra Headers</h4>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  {extraHeaders.map((header, index) => (
                    <div
                      key={index}
                      style={{
                        display: 'grid',
                        gridTemplateColumns: '160px 1fr auto',
                        alignItems: 'center',
                        gap: '1rem',
                      }}
                    >
                      <div style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
                        New Header {index + 1}
                      </div>

                      <input
                        className="input-field"
                        value={header}
                        onChange={(e) => handleExtraHeaderChange(index, e.target.value)}
                        placeholder="Enter new header name"
                        disabled={saving}
                      />

                      <button
                        type="button"
                        className="btn"
                        onClick={() => handleRemoveExtraHeader(index)}
                        disabled={saving}
                        style={{
                          background: 'transparent',
                          border: '1px solid var(--border-color)',
                          color: '#ef4444',
                          minWidth: '80px',
                        }}
                      >
                        Remove
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        <div
          style={{
            padding: '1.5rem 2rem',
            borderTop: '1px solid var(--border-color)',
            display: 'flex',
            gap: '1rem',
            justifyContent: 'flex-end',
            background: 'rgba(0,0,0,0.2)',
          }}
        >
          <button
            className="btn"
            onClick={onClose}
            disabled={saving}
            style={{
              background: 'transparent',
              border: '1px solid var(--border-color)',
              color: 'white',
            }}
          >
            Cancel
          </button>

          <button
            className="btn btn-primary"
            onClick={handleSave}
            disabled={saving}
          >
            {saving ? 'Saving...' : 'Save Headers'}
          </button>
        </div>
      </div>
    </div>
  );
}