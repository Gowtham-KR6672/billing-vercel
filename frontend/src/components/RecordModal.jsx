import { useState, useEffect, useMemo } from 'react';
import axios from '../utils/axios';
import { getHeadersConfig } from './DataGrid';

export default function RecordModal({
  isOpen,
  onClose,
  sheet,
  recordToEdit,
  onSave,
  currentUser,
}) {
  const [formData, setFormData] = useState({});
  const [uoms, setUoms] = useState([]);
  const [saving, setSaving] = useState(false);
  const [loadingUoms, setLoadingUoms] = useState(false);

  const type = sheet?.processType;
  const isSuperAdmin = currentUser?.role === 'Super Admin';
  const isLocked = !!recordToEdit?.billedStatus && !isSuperAdmin;

  const baseHeaders = useMemo(() => {
    return getHeadersConfig(type);
  }, [type]);

  const hiddenHeaders = useMemo(() => {
    return Array.isArray(sheet?.hiddenHeaders) ? sheet.hiddenHeaders : [];
  }, [sheet]);

  const visibleBaseHeaders = useMemo(() => {
    return baseHeaders.filter((header) => !hiddenHeaders.includes(header.key));
  }, [baseHeaders, hiddenHeaders]);

  const extraHeaders = useMemo(() => {
    return Array.isArray(sheet?.extraHeaders)
      ? sheet.extraHeaders.filter((header) => String(header || '').trim())
      : [];
  }, [sheet]);

  useEffect(() => {
    if (!isOpen || !sheet) return;

    fetchUoms();

    if (recordToEdit) {
      setFormData({
        slNo: recordToEdit.slNo || '',
        potentialNo: recordToEdit.potentialNo || '',
        project: recordToEdit.project || '',
        invDesc: recordToEdit.invDesc || '',
        aoNumber: recordToEdit.aoNumber || '',
        month: recordToEdit.month || '',
        invoiceNo: recordToEdit.invoiceNo || '',
        date: recordToEdit.date || '',
        quantity: recordToEdit.quantity || '',
        uom: recordToEdit.uom || '',
        contactPerson: recordToEdit.contactPerson || '',
        item2Q: recordToEdit.item2Q || '',
        item2UOM: recordToEdit.item2UOM || '',
        item3Q: recordToEdit.item3Q || '',
        item3UOM: recordToEdit.item3UOM || '',
        item4Q: recordToEdit.item4Q || '',
        item4UOM: recordToEdit.item4UOM || '',
        item5Q: recordToEdit.item5Q || '',
        item5UOM: recordToEdit.item5UOM || '',
        item6Q: recordToEdit.item6Q || '',
        item6UOM: recordToEdit.item6UOM || '',
        billedStatus: !!recordToEdit.billedStatus,
        extraFields: recordToEdit.extraFields || {},
      });
    } else {
      setFormData({
        slNo: '',
        potentialNo: '',
        project: '',
        invDesc: '',
        aoNumber: '',
        month: '',
        invoiceNo: '',
        date: '',
        quantity: '',
        uom: '',
        contactPerson: '',
        item2Q: '',
        item2UOM: '',
        item3Q: '',
        item3UOM: '',
        item4Q: '',
        item4UOM: '',
        item5Q: '',
        item5UOM: '',
        item6Q: '',
        item6UOM: '',
        billedStatus: false,
        extraFields: {},
      });
    }
  }, [recordToEdit, isOpen, sheet]);

  const fetchUoms = async () => {
    try {
      setLoadingUoms(true);
      const { data } = await axios.get('/api/uoms');
      setUoms(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Failed to load UOMs', err);
      setUoms([]);
    } finally {
      setLoadingUoms(false);
    }
  };

  if (!isOpen || !sheet) return null;

  const handleChange = (e) => {
    if (isLocked) return;

    const { name, value, type: inputType, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: inputType === 'checkbox' ? checked : value,
    }));
  };

  const handleExtraFieldChange = (headerName, value) => {
    if (isLocked) return;

    setFormData((prev) => ({
      ...prev,
      extraFields: {
        ...(prev.extraFields || {}),
        [headerName]: value,
      },
    }));
  };

  const renderTextInput = (name, placeholder, required = false, inputType = 'text') => (
    <input
      className="input-field"
      name={name}
      type={inputType}
      placeholder={placeholder}
      value={formData[name] || ''}
      onChange={handleChange}
      required={required}
      disabled={isLocked}
    />
  );

  const renderUomSelect = (name, placeholder) => (
    <select
      className="input-field"
      name={name}
      value={formData[name] || ''}
      onChange={handleChange}
      disabled={isLocked}
    >
      <option value="">
        {loadingUoms ? 'Loading UOM...' : placeholder}
      </option>
      {uoms.map((uom) => (
        <option key={uom._id} value={uom.name}>
          {uom.name}
        </option>
      ))}
    </select>
  );

  const showField = (key) => visibleBaseHeaders.some((header) => header.key === key);

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (isLocked) {
      alert('This record is already billed. Only Super Admin can edit it.');
      return;
    }

    try {
      setSaving(true);

      const payload = {
        slNo: formData.slNo || '',
        potentialNo: formData.potentialNo || '',
        project: formData.project || '',
        invDesc: formData.invDesc || '',
        aoNumber: formData.aoNumber || '',
        month: formData.month || '',
        invoiceNo: formData.invoiceNo || '',
        date: formData.date || '',
        quantity: formData.quantity || '',
        uom: formData.uom || '',
        contactPerson: formData.contactPerson || '',
        item2Q: formData.item2Q || '',
        item2UOM: formData.item2UOM || '',
        item3Q: formData.item3Q || '',
        item3UOM: formData.item3UOM || '',
        item4Q: formData.item4Q || '',
        item4UOM: formData.item4UOM || '',
        item5Q: formData.item5Q || '',
        item5UOM: formData.item5UOM || '',
        item6Q: formData.item6Q || '',
        item6UOM: formData.item6UOM || '',
        billedStatus: !!formData.billedStatus,
        extraFields: formData.extraFields || {},
      };

      let data;

      if (recordToEdit?._id) {
        const response = await axios.put(`/api/records/${recordToEdit._id}`, payload);
        data = response.data;
        onSave?.(data, 'update');
      } else {
        const response = await axios.post(`/api/sheets/${sheet._id}/records`, payload);
        data = response.data;
        onSave?.(data, 'add');
      }

      onClose();
    } catch (error) {
      console.error(error);
      alert(error.response?.data?.message || 'Failed to save record.');
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
          maxWidth: '900px',
          maxHeight: '90vh',
          overflowY: 'auto',
          padding: '2rem',
        }}
      >
        <h2 style={{ marginBottom: '1.5rem' }}>
          {recordToEdit ? 'Edit Record' : 'Add Record'} - {type}
        </h2>

        {isLocked && (
          <div
            style={{
              marginBottom: '1rem',
              padding: '12px 14px',
              borderRadius: '8px',
              background: 'rgba(239, 68, 68, 0.12)',
              color: '#fca5a5',
              fontWeight: 600,
            }}
          >
            This record is already billed. Only Super Admin can edit it.
          </div>
        )}

        <form
          onSubmit={handleSubmit}
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
            gap: '1rem',
          }}
        >
          {showField('slNo') && (
            <input
              className="input-field"
              name="slNo"
              placeholder="Sl No will be auto-generated"
              value={formData.slNo || ''}
              readOnly
            />
          )}

          {showField('potentialNo') && renderTextInput('potentialNo', 'Potential No')}
          {showField('project') && renderTextInput('project', 'Project')}
          {showField('invDesc') && renderTextInput('invDesc', 'Inv Desc')}
          {showField('aoNumber') && renderTextInput('aoNumber', 'AO #')}
          {showField('month') && renderTextInput('month', 'Month')}

          {showField('invoiceNo') && (
            <input
              className="input-field"
              name="invoiceNo"
              placeholder="Invoice No will be auto-generated"
              value={formData.invoiceNo || ''}
              readOnly
            />
          )}

          {showField('date') && renderTextInput('date', '', false, 'date')}
          {showField('quantity') && renderTextInput('quantity', 'Quantity')}
          {showField('uom') && renderUomSelect('uom', 'Select UOM')}
          {showField('contactPerson') && renderTextInput('contactPerson', 'Contact Person')}

          {showField('item2Q') && renderTextInput('item2Q', 'Item 2 Quantity')}
          {showField('item2UOM') && renderUomSelect('item2UOM', 'Select Item 2 UOM')}

          {showField('item3Q') && renderTextInput('item3Q', 'Item 3 Quantity')}
          {showField('item3UOM') && renderUomSelect('item3UOM', 'Select Item 3 UOM')}

          {showField('item4Q') && renderTextInput('item4Q', 'Item 4 Quantity')}
          {showField('item4UOM') && renderUomSelect('item4UOM', 'Select Item 4 UOM')}

          {showField('item5Q') && renderTextInput('item5Q', 'Item 5 Quantity')}
          {showField('item5UOM') && renderUomSelect('item5UOM', 'Select Item 5 UOM')}

          {showField('item6Q') && renderTextInput('item6Q', 'Item 6 Quantity')}
          {showField('item6UOM') && renderUomSelect('item6UOM', 'Select Item 6 UOM')}

          {extraHeaders.map((headerName) => (
            <input
              key={headerName}
              className="input-field"
              placeholder={headerName}
              value={formData.extraFields?.[headerName] || ''}
              onChange={(e) => handleExtraFieldChange(headerName, e.target.value)}
              disabled={isLocked}
            />
          ))}

          <div
            style={{
              gridColumn: '1 / -1',
              display: 'flex',
              gap: '1rem',
              marginTop: '1rem',
              justifyContent: 'flex-end',
            }}
          >
            <button
              type="button"
              className="btn"
              onClick={onClose}
              disabled={saving}
              style={{
                background: 'transparent',
                color: 'var(--text-main)',
                border: '1px solid var(--border-color)',
              }}
            >
              Cancel
            </button>

            <button
              type="submit"
              className="btn btn-primary"
              disabled={saving || isLocked}
            >
              {saving ? 'Saving...' : 'Save Record'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}