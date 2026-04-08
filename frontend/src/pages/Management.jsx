import { useEffect, useState, useContext } from 'react';
import { Link } from 'react-router-dom';
import axios from '../utils/axios';
import { AuthContext } from '../context/AuthContext';
import { FiEdit2, FiTrash2, FiPlus } from 'react-icons/fi';

const emptyUserForm = {
  name: '',
  email: '',
  password: '',
  role: 'SME',
};

const emptySheetForm = {
  title: '',
  processType: 'OG Inv',
};

const emptyUomForm = {
  name: '',
  code: '',
  isActive: true,
};

export default function Management() {
  const { user } = useContext(AuthContext);

  const [users, setUsers] = useState([]);
  const [sheets, setSheets] = useState([]);
  const [uoms, setUoms] = useState([]);

  const [userForm, setUserForm] = useState(emptyUserForm);
  const [sheetForm, setSheetForm] = useState(emptySheetForm);
  const [uomForm, setUomForm] = useState(emptyUomForm);

  const [editingUserId, setEditingUserId] = useState(null);
  const [editingUomId, setEditingUomId] = useState(null);

  const [loading, setLoading] = useState(false);

  const isSuperAdmin = user?.role === 'Super Admin';

  const fetchUsers = async () => {
    try {
      const { data } = await axios.get('/api/users');
      setUsers(data || []);
    } catch (err) {
      console.error('Failed to load users', err);
    }
  };

  const fetchSheets = async () => {
    try {
      const { data } = await axios.get('/api/sheets');
      setSheets(data || []);
    } catch (err) {
      console.error('Failed to load sheets', err);
    }
  };

  const fetchUoms = async () => {
    try {
      const url = isSuperAdmin ? '/api/uoms/all' : '/api/uoms';
      const { data } = await axios.get(url);
      setUoms(data || []);
    } catch (err) {
      console.error('Failed to load UOMs', err);
    }
  };

  useEffect(() => {
    if (!user) return;
    fetchUsers();
    fetchSheets();
    fetchUoms();
  }, [user]);

  const handleCreateUser = async (e) => {
    e.preventDefault();

    try {
      setLoading(true);

      if (editingUserId) {
        await axios.put(`/api/users/${editingUserId}`, userForm);
      } else {
        await axios.post('/api/users', userForm);
      }

      setUserForm(emptyUserForm);
      setEditingUserId(null);
      fetchUsers();
    } catch (err) {
      console.error(err);
      alert(err.response?.data?.message || 'Failed to save user');
    } finally {
      setLoading(false);
    }
  };

  const handleEditUser = (selectedUser) => {
    setEditingUserId(selectedUser._id);
    setUserForm({
      name: selectedUser.name || '',
      email: selectedUser.email || '',
      password: '',
      role: selectedUser.role || 'SME',
    });
  };

  const handleDeleteUser = async (id) => {
    if (!window.confirm('Delete this user?')) return;

    try {
      await axios.delete(`/api/users/${id}`);
      fetchUsers();
    } catch (err) {
      console.error(err);
      alert(err.response?.data?.message || 'Failed to delete user');
    }
  };

  const handleCreateSheet = async (e) => {
    e.preventDefault();

    try {
      setLoading(true);
      await axios.post('/api/sheets', sheetForm);
      setSheetForm(emptySheetForm);
      fetchSheets();
    } catch (err) {
      console.error(err);
      alert(err.response?.data?.message || 'Failed to create sheet');
    } finally {
      setLoading(false);
    }
  };

  const handleToggleAssignment = async (sheetId, assignedUserIds) => {
    try {
      await axios.put(`/api/sheets/${sheetId}`, { assignedTo: assignedUserIds });
      fetchSheets();
    } catch (err) {
      console.error(err);
      alert(err.response?.data?.message || 'Failed to update sheet assignment');
    }
  };

  const handleDeleteSheet = async (id) => {
    if (!window.confirm('Delete this sheet?')) return;

    try {
      await axios.delete(`/api/sheets/${id}`);
      fetchSheets();
    } catch (err) {
      console.error(err);
      alert(err.response?.data?.message || 'Failed to delete sheet');
    }
  };

  const handleSubmitUom = async (e) => {
    e.preventDefault();

    try {
      setLoading(true);

      if (editingUomId) {
        await axios.put(`/api/uoms/${editingUomId}`, uomForm);
      } else {
        await axios.post('/api/uoms', uomForm);
      }

      setUomForm(emptyUomForm);
      setEditingUomId(null);
      fetchUoms();
    } catch (err) {
      console.error(err);
      alert(err.response?.data?.message || 'Failed to save UOM');
    } finally {
      setLoading(false);
    }
  };

  const handleEditUom = (uom) => {
    setEditingUomId(uom._id);
    setUomForm({
      name: uom.name || '',
      code: uom.code || '',
      isActive: uom.isActive ?? true,
    });
  };

  const handleDeleteUom = async (id) => {
    if (!window.confirm('Delete this UOM?')) return;

    try {
      await axios.delete(`/api/uoms/${id}`);
      fetchUoms();
    } catch (err) {
      console.error(err);
      alert(err.response?.data?.message || 'Failed to delete UOM');
    }
  };

  const manageableUsers =  user?.role === 'Super Admin'
    ? users.filter((item) => item.role !== 'Super Admin')
    : users.filter((item) => item.role === 'SME');


  return (
    <div style={{ padding: '1.5rem' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1.5rem' }}>
        <Link to="/" className="btn" style={{ textDecoration: 'none' }}>
          ← Back to Dashboard
        </Link>
        <h1 style={{ margin: 0 }}>System Management</h1>
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '560px 1fr',
          gap: '1.5rem',
          alignItems: 'start',
        }}
      >
        {/* LEFT COLUMN */}
        <div style={{ display: 'grid', gap: '1.5rem' }}>
          {/* CREATE USER */}
          <div className="glass-panel" style={{ padding: '1.5rem' }}>
            <h2 style={{ marginBottom: '1rem' }}>Create User</h2>

            <form onSubmit={handleCreateUser} style={{ display: 'grid', gap: '0.85rem' }}>
              <input
                className="input-field"
                placeholder="Name"
                value={userForm.name}
                onChange={(e) => setUserForm({ ...userForm, name: e.target.value })}
                required
              />

              <input
                className="input-field"
                placeholder="Email"
                type="email"
                value={userForm.email}
                onChange={(e) => setUserForm({ ...userForm, email: e.target.value })}
                required
              />

              <input
                className="input-field"
                placeholder="Password"
                type="password"
                value={userForm.password}
                onChange={(e) => setUserForm({ ...userForm, password: e.target.value })}
                required={!editingUserId}
              />

              <select
                className="input-field"
                value={userForm.role}
                onChange={(e) => setUserForm({ ...userForm, role: e.target.value })}
              >
                <option value="SME">SME</option>
                {isSuperAdmin && <option value="Admin">Admin</option>}
                {isSuperAdmin && <option value="Super Admin">Super Admin</option>}
              </select>

              <button type="submit" className="btn btn-primary" disabled={loading}>
                {editingUserId ? 'Update User' : 'Create User'}
              </button>
            </form>

            <h3 style={{ marginTop: '2rem', marginBottom: '1rem' }}>Existing Users</h3>

            <div style={{ display: 'grid', gap: '0.75rem' }}>
              {users.map((item) => (
                <div
                  key={item._id}
                  style={{
                    background: 'rgba(255,255,255,0.05)',
                    borderRadius: '10px',
                    padding: '0.9rem 1rem',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                  }}
                >
                  <div>
                    <div style={{ fontWeight: 700, color: 'white' }}>{item.name}</div>
                    <div style={{ color: '#94a3b8', fontSize: '0.9rem' }}>
                      {item.email} ({item.role})
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    {isSuperAdmin && (
                      <button
                        onClick={() => handleEditUser(item)}
                        style={{ background: 'transparent', border: 'none', color: '#60a5fa', cursor: 'pointer' }}
                      >
                        <FiEdit2 />
                      </button>
                    )}

                    {isSuperAdmin && item.role !== 'Super Admin' && (
                      <button
                        onClick={() => handleDeleteUser(item._id)}
                        style={{ background: 'transparent', border: 'none', color: '#ef4444', cursor: 'pointer' }}
                      >
                        <FiTrash2 />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* UOM MANAGEMENT - RED BOX AREA */}
          <div className="glass-panel" style={{ padding: '1.5rem' }}>
            <h2 style={{ marginBottom: '1rem' }}>UOM Management</h2>

            {!isSuperAdmin ? (
              <p style={{ color: 'var(--text-muted)' }}>
                Only Super Admin can create, update, and delete UOM values.
              </p>
            ) : (
              <>
                <form onSubmit={handleSubmitUom} style={{ display: 'grid', gap: '0.85rem', marginBottom: '1.5rem' }}>
                  <input
                    className="input-field"
                    placeholder="UOM Name"
                    value={uomForm.name}
                    onChange={(e) => setUomForm({ ...uomForm, name: e.target.value })}
                    required
                  />

                  <input
                    className="input-field"
                    placeholder="Code"
                    value={uomForm.code}
                    onChange={(e) => setUomForm({ ...uomForm, code: e.target.value })}
                  />

                  <label style={{ color: 'white', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <input
                      type="checkbox"
                      checked={uomForm.isActive}
                      onChange={(e) => setUomForm({ ...uomForm, isActive: e.target.checked })}
                    />
                    Active
                  </label>

                  <button type="submit" className="btn btn-primary" disabled={loading}>
                    {editingUomId ? 'Update UOM' : 'Create UOM'}
                  </button>
                </form>
              </>
            )}

            <h3 style={{ marginBottom: '1rem' }}>UOM List</h3>

            {uoms.length === 0 ? (
              <p style={{ color: 'var(--text-muted)' }}>No UOM created yet.</p>
            ) : (
              <div style={{ display: 'grid', gap: '0.75rem', maxHeight: '320px', overflowY: 'auto' }}>
                {uoms.map((uom) => (
                  <div
                    key={uom._id}
                    style={{
                      background: 'rgba(255,255,255,0.05)',
                      borderRadius: '10px',
                      padding: '0.9rem 1rem',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                    }}
                  >
                    <div>
                      <div style={{ fontWeight: 700, color: 'white' }}>{uom.name}</div>
                      <div style={{ color: '#94a3b8', fontSize: '0.9rem' }}>
                        Code: {uom.code || '-'} | Active: {uom.isActive ? 'Yes' : 'No'}
                      </div>
                    </div>

                    {isSuperAdmin && (
                      <div style={{ display: 'flex', gap: '0.5rem' }}>
                        <button
                          onClick={() => handleEditUom(uom)}
                          style={{ background: 'transparent', border: 'none', color: '#60a5fa', cursor: 'pointer' }}
                        >
                          <FiEdit2 />
                        </button>

                        <button
                          onClick={() => handleDeleteUom(uom._id)}
                          style={{ background: 'transparent', border: 'none', color: '#ef4444', cursor: 'pointer' }}
                        >
                          <FiTrash2 />
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* RIGHT COLUMN */}
        <div className="glass-panel" style={{ padding: '1.5rem' }}>
          <h2 style={{ marginBottom: '1rem' }}>Create Sheet</h2>

          <form
            onSubmit={handleCreateSheet}
            style={{
              display: 'grid',
              gridTemplateColumns: '1fr 220px auto',
              gap: '0.75rem',
              marginBottom: '2rem',
            }}
          >
            <input
              className="input-field"
              placeholder="Sheet Title"
              value={sheetForm.title}
              onChange={(e) => setSheetForm({ ...sheetForm, title: e.target.value })}
              required
            />

            <select
              className="input-field"
              value={sheetForm.processType}
              onChange={(e) => setSheetForm({ ...sheetForm, processType: e.target.value })}
            >
              <option value="OG Inv">OG Inv</option>
              <option value="FTE Inv">FTE Inv</option>
              <option value="OnT Inv">OnT Inv</option>
              <option value="Creative Services">Creative Services</option>
              <option value="Post Bill">Post Bill</option>
            </select>

            <button type="submit" className="btn btn-primary" disabled={loading}>
              <FiPlus />
            </button>
          </form>

          <h2 style={{ marginBottom: '1rem' }}>Manage Sheets & Assignments</h2>

          <div style={{ display: 'grid', gap: '1rem' }}>
            {sheets.map((sheet) => {
              const assignedIds = (sheet.assignedTo || []).map((u) => String(u._id || u));

              return (
                <div
                  key={sheet._id}
                  style={{
                    background: 'rgba(255,255,255,0.05)',
                    borderRadius: '12px',
                    padding: '1rem',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: '1rem' }}>
                    <div>
                      <div style={{ fontWeight: 700, color: 'white', fontSize: '1.1rem' }}>
                        {sheet.title}
                      </div>
                      <div style={{ color: '#94a3b8', marginTop: '0.25rem' }}>
                        {sheet.processType} | Created by {sheet.createdBy?.name || '-'}
                      </div>
                    </div>

                    <button
                      onClick={() => handleDeleteSheet(sheet._id)}
                      style={{ background: 'transparent', border: 'none', color: '#ef4444', cursor: 'pointer' }}
                    >
                      <FiTrash2 />
                    </button>
                  </div>

                  <div style={{ marginTop: '1rem' }}>
                    <div style={{ color: 'white', fontWeight: 600, marginBottom: '0.5rem' }}>
                      Assign Users:
                    </div>

                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem' }}>
                      {manageableUsers.map((u) => {
                        const checked = assignedIds.includes(String(u._id));

                        return (
                          <label
                            key={u._id}
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: '0.4rem',
                              background: 'rgba(0,0,0,0.2)',
                              padding: '0.2rem 0.45rem',
                              borderRadius: '6px',
                              color: 'white',
                              fontSize: '0.9rem',
                            }}
                          >
                            <input
                              type="checkbox"
                              checked={checked}
                              onChange={(e) => {
                                let updatedAssigned = [...assignedIds];

                                if (e.target.checked) {
                                  updatedAssigned.push(String(u._id));
                                } else {
                                  updatedAssigned = updatedAssigned.filter((id) => id !== String(u._id));
                                }

                                handleToggleAssignment(sheet._id, updatedAssigned);
                              }}
                            />
                            {u.name} ({u.role})
                          </label>
                        );
                      })}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}