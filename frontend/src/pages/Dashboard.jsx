import { useState, useEffect, useContext } from 'react';
import axios from '../utils/axios';
import { useNavigate } from 'react-router-dom';
import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';
import DataGrid, { getHeadersConfig } from '../components/DataGrid';
import RecordModal from '../components/RecordModal';
import HeaderSettingsModal from '../components/HeaderSettingsModal';
import LoadingScreen from '../components/LoadingScreen';
import { AuthContext } from '../context/AuthContext';
import {
  FiLogOut,
  FiSearch,
  FiSettings,
  FiPlus,
  FiEdit3,
  FiDownload,
} from 'react-icons/fi';

export default function Dashboard() {
  const { user, logout } = useContext(AuthContext);
  const navigate = useNavigate();

  const [sheets, setSheets] = useState([]);
  const [activeSheet, setActiveSheet] = useState(null);
  const [records, setRecords] = useState([]);
  const [isSheetsLoading, setIsSheetsLoading] = useState(true);
  const [isRecordsLoading, setIsRecordsLoading] = useState(false);

  // Filters
  const [projectFilter, setProjectFilter] = useState('');
  const [aoNoFilter, setAoNoFilter] = useState('');
  const [potNoFilter, setPotNoFilter] = useState('');
  const [dateFilter, setDateFilter] = useState('');
  const [uomFilter, setUomFilter] = useState('');

  // Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isHeaderModalOpen, setIsHeaderModalOpen] = useState(false);
  const [recordToEdit, setRecordToEdit] = useState(null);

  useEffect(() => {
    fetchSheets();
  }, []);

  useEffect(() => {
    if (activeSheet?._id) {
      fetchRecords();
    } else {
      setRecords([]);
    }
  }, [activeSheet, projectFilter, aoNoFilter, potNoFilter, dateFilter, uomFilter]);

  const fetchSheets = async () => {
    setIsSheetsLoading(true);

    try {
      const { data } = await axios.get('/api/sheets');
      setSheets(data || []);

      if (data?.length > 0) {
        setActiveSheet((prev) => {
          if (prev) {
            const matched = data.find((sheet) => sheet._id === prev._id);
            return matched || data[0];
          }
          return data[0];
        });
      } else {
        setActiveSheet(null);
      }
    } catch (err) {
      console.error('Failed to load sheets', err);
    } finally {
      setIsSheetsLoading(false);
    }
  };

  const fetchRecords = async () => {
    try {
      if (!activeSheet?._id) return;
      setIsRecordsLoading(true);

      const queryParams = new URLSearchParams();

      if (projectFilter) queryParams.append('project', projectFilter);
      if (aoNoFilter) queryParams.append('aoNumber', aoNoFilter);
      if (potNoFilter) queryParams.append('potentialNo', potNoFilter);
      if (dateFilter) queryParams.append('date', dateFilter);
      if (uomFilter) queryParams.append('uom', uomFilter);

      const url = `/api/sheets/${activeSheet._id}/records${
        queryParams.toString() ? `?${queryParams.toString()}` : ''
      }`;

      const { data } = await axios.get(url);
      setRecords(data || []);
    } catch (err) {
      console.error('Failed to load records', err);
    } finally {
      setIsRecordsLoading(false);
    }
  };

  const handleCreateRecord = () => {
    setRecordToEdit(null);
    setIsModalOpen(true);
  };

  const handleEditRecord = (record) => {
    if (record?.billedStatus && user?.role !== 'Super Admin') {
      alert('This record is billed and cannot be edited by other users');
      return;
    }

    setRecordToEdit(record);
    setIsModalOpen(true);
  };

  const handleDeleteRecord = async (id) => {
    if (user?.role !== 'Super Admin') {
      alert('Only Super Admin can delete records');
      return;
    }

    try {
      if (!window.confirm('Are you sure you want to delete this record?')) return;

      await axios.delete(`/api/records/${id}`);
      setRecords((prev) => prev.filter((record) => record._id !== id));
    } catch (err) {
      console.error('Failed to delete record', err);
      alert(err.response?.data?.message || 'Failed to delete record');
    }
  };

  const handleSaveRecord = (savedRecord, action) => {
    if (action === 'add') {
      setRecords((prev) => [...prev, savedRecord]);
    } else {
      setRecords((prev) =>
        prev.map((record) =>
          record._id === savedRecord._id ? savedRecord : record
        )
      );
    }
  };

  const handleSaveHeaders = (updatedSheet) => {
    setActiveSheet(updatedSheet);
    setSheets((prev) =>
      prev.map((sheet) =>
        sheet._id === updatedSheet._id ? updatedSheet : sheet
      )
    );
  };

  const handleDownloadExcel = async () => {
    try {
      if (!sheets.length) {
        alert('No sheets available to download');
        return;
      }

      const workbook = XLSX.utils.book_new();

      for (const sheet of sheets) {
        const { data: sheetRecords } = await axios.get(`/api/sheets/${sheet._id}/records`);

        const hiddenHeaders = Array.isArray(sheet.hiddenHeaders)
          ? sheet.hiddenHeaders
          : [];

        const baseHeaders = getHeadersConfig(sheet.processType)
          .filter((header) => !hiddenHeaders.includes(header.key))
          .map((header) => ({
            ...header,
            label:
              sheet.customHeaders?.[header.key] &&
              String(sheet.customHeaders[header.key]).trim()
                ? String(sheet.customHeaders[header.key]).trim()
                : header.defaultLabel,
            isExtra: false,
          }));

        const extraHeaders = (sheet.extraHeaders || [])
          .filter((header) => String(header || '').trim())
          .map((header, index) => ({
            key: `extra_${index}`,
            label: header,
            isExtra: true,
          }));

        const allHeaders = [...baseHeaders, ...extraHeaders];

        const exportRows = (sheetRecords || []).map((record) => {
          const row = {};

          allHeaders.forEach((header) => {
            if (header.isExtra) {
              row[header.label] = record?.extraFields?.[header.label] || '';
            } else {
              row[header.label] = record?.[header.key] ?? '';
            }
          });

          row['Billed Status'] = record?.billedStatus ? 'Billed' : 'Not Billed';

          return row;
        });

        const worksheet =
          exportRows.length > 0
            ? XLSX.utils.json_to_sheet(exportRows)
            : XLSX.utils.json_to_sheet([{ Message: 'No records found' }]);

        const safeSheetName = (sheet.title || 'Sheet')
          .replace(/[\\/*?:[\]]/g, '')
          .slice(0, 31);

        XLSX.utils.book_append_sheet(workbook, worksheet, safeSheetName || 'Sheet');
      }

      const excelBuffer = XLSX.write(workbook, {
        bookType: 'xlsx',
        type: 'array',
      });

      const fileData = new Blob([excelBuffer], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet;charset=UTF-8',
      });

      const fileName = `All_Accessible_Sheets_${new Date().toISOString().slice(0, 10)}.xlsx`;

      saveAs(fileData, fileName);
    } catch (err) {
      console.error('Download failed', err);
      alert(err.response?.data?.message || 'Failed to download Excel');
    }
  };

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100vh',
        overflow: 'hidden',
      }}
    >
      <header
        className="glass-panel"
        style={{
          margin: '1rem',
          padding: '1rem 2rem',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          borderRadius: '12px',
        }}
      >
        <h2 style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          Billing System

          {(user?.role === 'Super Admin' || user?.role === 'Admin') && (
            <button
              className="btn"
              onClick={() => navigate('/management')}
              style={{
                background: 'rgba(255,255,255,0.1)',
                border: '1px solid var(--border-color)',
                color: 'white',
                padding: '0.5rem 1rem',
                fontSize: '0.8rem',
              }}
            >
              <FiSettings /> System Management
            </button>
          )}
        </h2>

        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <span style={{ color: 'var(--text-muted)' }}>
            {user?.name} ({user?.role})
          </span>

          <button
            onClick={logout}
            className="btn"
            style={{
              background: 'transparent',
              color: 'var(--danger)',
              padding: '0.5rem',
            }}
          >
            <FiLogOut /> Logout
          </button>
        </div>
      </header>

      <main
        style={{
          display: 'flex',
          flex: 1,
          overflow: 'hidden',
          padding: '0 1rem 1rem 1rem',
          gap: '1rem',
        }}
      >
        <aside
          className="glass-panel"
          style={{
            width: '250px',
            padding: '1rem',
            display: 'flex',
            flexDirection: 'column',
            gap: '0.5rem',
            overflowY: 'auto',
          }}
        >
          <h3
            style={{
              marginBottom: '1rem',
              color: 'var(--text-muted)',
              fontSize: '0.875rem',
              textTransform: 'uppercase',
            }}
          >
            Assigned Sheets
          </h3>

          {isSheetsLoading
            ? Array.from({ length: 5 }).map((_, index) => (
                <div
                  key={index}
                  style={{
                    padding: '0.75rem',
                    borderRadius: '8px',
                    border: '1px solid rgba(255,255,255,0.06)',
                    background: 'rgba(255,255,255,0.03)',
                  }}
                >
                  <div className="skeleton-line" style={{ width: '62%', height: '12px' }} />
                  <div
                    className="skeleton-line"
                    style={{ width: '45%', height: '10px', marginTop: '0.7rem' }}
                  />
                </div>
              ))
            : sheets.map((sheet) => (
                <div
                  key={sheet._id}
                  onClick={() => setActiveSheet(sheet)}
                  style={{
                    padding: '0.75rem',
                    borderRadius: '8px',
                    cursor: 'pointer',
                    background:
                      activeSheet?._id === sheet._id
                        ? 'rgba(79, 70, 229, 0.2)'
                        : 'transparent',
                    border: `1px solid ${
                      activeSheet?._id === sheet._id
                        ? 'var(--primary-color)'
                        : 'transparent'
                    }`,
                    transition: 'all 0.2s',
                  }}
                >
                  <div style={{ fontWeight: '600' }}>{sheet.title}</div>
                  <div
                    style={{
                      fontSize: '0.8rem',
                      color: 'var(--text-muted)',
                    }}
                  >
                    {sheet.processType}
                  </div>
                </div>
              ))}
        </aside>

        <section
          className="glass-panel"
          style={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
          }}
        >
          <div
            style={{
              padding: '1rem',
              borderBottom: '1px solid var(--border-color)',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              background: 'rgba(0,0,0,0.2)',
            }}
          >
            <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <FiSearch style={{ color: 'var(--text-muted)' }} />
                <input
                  className="input-field"
                  style={{ padding: '0.5rem', width: '130px' }}
                  placeholder="Projects"
                  value={projectFilter}
                  onChange={(e) => setProjectFilter(e.target.value)}
                />
              </div>

              <input
                className="input-field"
                style={{ padding: '0.5rem', width: '100px' }}
                placeholder="AO #"
                value={aoNoFilter}
                onChange={(e) => setAoNoFilter(e.target.value)}
              />

              <input
                className="input-field"
                style={{ padding: '0.5rem', width: '110px' }}
                placeholder="Potential No"
                value={potNoFilter}
                onChange={(e) => setPotNoFilter(e.target.value)}
              />

              <input
                className="input-field"
                style={{ padding: '0.5rem', width: '150px' }}
                placeholder="Date"
                type="date"
                value={dateFilter}
                onChange={(e) => setDateFilter(e.target.value)}
              />

              <input
                className="input-field"
                style={{ padding: '0.5rem', width: '90px' }}
                placeholder="UOM"
                value={uomFilter}
                onChange={(e) => setUomFilter(e.target.value)}
              />
            </div>

            {activeSheet && (
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <button
                  className="btn"
                  onClick={handleDownloadExcel}
                  style={{
                    background: 'rgba(255,255,255,0.1)',
                    border: '1px solid var(--border-color)',
                    color: 'var(--text-main)',
                    padding: '0.6rem 1rem',
                  }}
                >
                  <FiDownload /> Download Excel
                </button>

                {user?.role === 'Super Admin' && (
                  <button
                    className="btn"
                    onClick={() => setIsHeaderModalOpen(true)}
                    style={{
                      background: 'rgba(255,255,255,0.1)',
                      border: '1px solid var(--border-color)',
                      color: 'var(--text-main)',
                      padding: '0.6rem 1rem',
                    }}
                  >
                    <FiEdit3 /> Customize Headers
                  </button>
                )}

                <button
                  className="btn btn-primary"
                  onClick={handleCreateRecord}
                  style={{ padding: '0.6rem 1rem' }}
                >
                  <FiPlus /> Add Record
                </button>
              </div>
            )}
          </div>

          <div
            style={{
              flex: 1,
              overflow: 'auto',
              position: 'relative',
            }}
          >
            {activeSheet ? (
              <>
                <DataGrid
                  sheet={activeSheet}
                  records={records}
                  setRecords={setRecords}
                  onEdit={handleEditRecord}
                  onDelete={handleDeleteRecord}
                  currentUser={user}
                />

                {isRecordsLoading && (
                  <div className="table-loading-overlay">
                    <LoadingScreen
                      compact
                      label={`Loading ${activeSheet.title}`}
                      message="Refreshing records from the backend..."
                    />
                  </div>
                )}
              </>
            ) : (
              <div
                style={{
                  display: 'flex',
                  height: '100%',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'var(--text-muted)',
                }}
              >
                Select a sheet to view data
              </div>
            )}
          </div>
        </section>
      </main>

      <RecordModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setRecordToEdit(null);
        }}
        sheet={activeSheet}
        recordToEdit={recordToEdit}
        onSave={handleSaveRecord}
        currentUser={user}
      />

      <HeaderSettingsModal
        isOpen={isHeaderModalOpen}
        onClose={() => setIsHeaderModalOpen(false)}
        sheet={activeSheet}
        onSaveSuccess={handleSaveHeaders}
      />
    </div>
  );
}
