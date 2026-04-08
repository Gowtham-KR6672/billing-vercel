import axios from '../utils/axios';
import { FiEdit2, FiTrash2 } from 'react-icons/fi';

export const getHeadersConfig = (type) => {
  let headers = [
    { key: 'slNo', defaultLabel: 'Sl No' },
    { key: 'potentialNo', defaultLabel: 'Potential No' },
    { key: 'project', defaultLabel: 'Project' },
    { key: 'invDesc', defaultLabel: 'Inv Desc' },
    { key: 'aoNumber', defaultLabel: 'AO #' },
    { key: 'month', defaultLabel: 'Month' },
    { key: 'invoiceNo', defaultLabel: 'Invoice No' },
    { key: 'date', defaultLabel: 'Date' },
    { key: 'quantity', defaultLabel: 'Quantity' },
    { key: 'uom', defaultLabel: 'UOM' },
    { key: 'contactPerson', defaultLabel: 'Contact Person' },
  ];

  if (type === 'OG Inv') {
    headers = [
      ...headers,
      { key: 'item2Q', defaultLabel: 'Item 2 Q' },
      { key: 'item2UOM', defaultLabel: 'Item 2 UOM' },
      { key: 'item3Q', defaultLabel: 'Item 3 Q' },
      { key: 'item3UOM', defaultLabel: 'Item 3 UOM' },
      { key: 'item4Q', defaultLabel: 'Item 4 Q' },
      { key: 'item4UOM', defaultLabel: 'Item 4 UOM' },
      { key: 'item5Q', defaultLabel: 'Item 5 Q' },
      { key: 'item5UOM', defaultLabel: 'Item 5 UOM' },
      { key: 'item6Q', defaultLabel: 'Item 6 Q' },
      { key: 'item6UOM', defaultLabel: 'Item 6 UOM' },
    ];
  } else if (type === 'OnT Inv') {
    headers = [
      ...headers,
      { key: 'item2Q', defaultLabel: 'Item 2 Q' },
      { key: 'item2UOM', defaultLabel: 'Item 2 UOM' },
      { key: 'item3Q', defaultLabel: 'Item 3 Q' },
      { key: 'item3UOM', defaultLabel: 'Item 3 UOM' },
      { key: 'item4Q', defaultLabel: 'Item 4 Q' },
      { key: 'item4UOM', defaultLabel: 'Item 4 UOM' },
    ];
  } else if (type === 'Post Bill') {
    headers = [
      ...headers,
      { key: 'item2Q', defaultLabel: 'Item 2 Q' },
      { key: 'item2UOM', defaultLabel: 'Item 2 UOM' },
      { key: 'item3Q', defaultLabel: 'Item 3 Q' },
      { key: 'item3UOM', defaultLabel: 'Item 3 UOM' },
    ];
  }

  return headers;
};

export default function DataGrid({
  sheet,
  records = [],
  setRecords,
  onEdit,
  onDelete,
  currentUser,
}) {
  const type = sheet?.processType;
  const baseHeaders = getHeadersConfig(type);
  const hiddenHeaders = Array.isArray(sheet?.hiddenHeaders) ? sheet.hiddenHeaders : [];
  const isSuperAdmin = currentUser?.role === 'Super Admin';

  const getLabel = (key, defaultLabel) => {
    const customValue = sheet?.customHeaders?.[key];
    return customValue && String(customValue).trim()
      ? String(customValue).trim()
      : defaultLabel;
  };

  const visibleBaseHeaders = baseHeaders
    .filter((header) => !hiddenHeaders.includes(header.key))
    .map((header) => ({
      ...header,
      label: getLabel(header.key, header.defaultLabel),
      isExtra: false,
    }));

  const visibleExtraHeaders = (sheet?.extraHeaders || [])
    .map((header, index) => ({
      key: `extra_${index}`,
      defaultLabel: header,
      label: header,
      isExtra: true,
    }))
    .filter((header) => header.label && String(header.label).trim());

  const finalHeaders = [...visibleBaseHeaders, ...visibleExtraHeaders];

  const getCellValue = (record, header) => {
    if (header.isExtra) {
      if (record?.extraFields && typeof record.extraFields === 'object') {
        return record.extraFields[header.label] ?? '';
      }
      return '';
    }

    return record?.[header.key] ?? '';
  };

  const handleStatusChange = async (recordId, value) => {
    if (!isSuperAdmin) return;

    const isBilled = value === 'true';

    try {
      await axios.put(`/api/records/${recordId}/billed-status`, {
        billedStatus: isBilled,
      });

      setRecords((prev) =>
        prev.map((record) =>
          record._id === recordId
            ? { ...record, billedStatus: isBilled }
            : record
        )
      );
    } catch (err) {
      console.error('Failed to update status', err);
      alert(err.response?.data?.message || 'Failed to update billed status');
    }
  };

  const renderBilledStatus = (record) => {
    if (isSuperAdmin) {
      return (
        <select
          className={`status-dropdown ${
            record.billedStatus ? 'status-billed' : 'status-notbilled'
          }`}
          value={String(!!record.billedStatus)}
          onChange={(e) => handleStatusChange(record._id, e.target.value)}
        >
          <option value="true">Billed</option>
          <option value="false">Not Billed</option>
        </select>
      );
    }

    return (
      <span
        className={record.billedStatus ? 'status-billed' : 'status-notbilled'}
        style={{
          display: 'inline-block',
          padding: '8px 12px',
          borderRadius: '8px',
          fontSize: '0.9rem',
          fontWeight: 600,
        }}
      >
        {record.billedStatus ? 'Billed' : 'Not Billed'}
      </span>
    );
  };

  return (
    <div style={{ width: '100%', overflowX: 'auto' }}>
      <div style={{ minWidth: '1300px' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr>
              {finalHeaders.map((header) => (
                <th key={header.key}>{header.label}</th>
              ))}
              <th>Billed Status</th>
              <th>Actions</th>
            </tr>
          </thead>

          <tbody>
            {records.length === 0 ? (
              <tr>
                <td
                  colSpan={finalHeaders.length + 2}
                  style={{
                    textAlign: 'center',
                    color: 'var(--text-muted)',
                    padding: '1rem',
                  }}
                >
                  No records found.
                </td>
              </tr>
            ) : (
              records.map((record) => {
                const canDelete = isSuperAdmin;
                const canEdit = isSuperAdmin || !record.billedStatus;

                return (
                  <tr key={record._id}>
                    {finalHeaders.map((header) => (
                      <td key={header.key}>{getCellValue(record, header)}</td>
                    ))}

                    <td>{renderBilledStatus(record)}</td>

                    <td>
                      <div style={{ display: 'flex', gap: '0.5rem' }}>
                        <button
                          onClick={() => canEdit && onEdit(record)}
                          disabled={!canEdit}
                          style={{
                            background: 'transparent',
                            border: 'none',
                            color: canEdit ? '#60a5fa' : '#6b7280',
                            cursor: canEdit ? 'pointer' : 'not-allowed',
                            opacity: canEdit ? 1 : 0.5,
                          }}
                          title={
                            canEdit
                              ? 'Edit'
                              : 'Billed record cannot be edited by other users'
                          }
                        >
                          <FiEdit2 />
                        </button>

                        {canDelete && (
                          <button
                            onClick={() => onDelete(record._id)}
                            style={{
                              background: 'transparent',
                              border: 'none',
                              color: 'var(--danger)',
                              cursor: 'pointer',
                            }}
                            title="Delete"
                          >
                            <FiTrash2 />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}