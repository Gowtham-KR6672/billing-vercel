import { useEffect, useState } from 'react';
import axios from '../utils/axios';
import { FiEdit2, FiTrash2 } from 'react-icons/fi';

const emptyForm = {
    name: '',
    code: '',
    isActive: true,
};

export default function UomManagement() {
    const [uoms, setUoms] = useState([]);
    const [form, setForm] = useState(emptyForm);
    const [editingId, setEditingId] = useState(null);
    const [saving, setSaving] = useState(false);

    const fetchUoms = async () => {
        try {
            const { data } = await axios.get('/api/uoms/all');
            setUoms(data);
        } catch (err) {
            console.error(err);
            alert(err.response?.data?.message || 'Failed to load UOMs');
        }
    };

    useEffect(() => {
        fetchUoms();
    }, []);

    const handleSubmit = async (e) => {
        e.preventDefault();

        try {
            setSaving(true);

            if (editingId) {
                await axios.put(`/api/uoms/${editingId}`, form);
            } else {
                await axios.post('/api/uoms', form);
            }

            setForm(emptyForm);
            setEditingId(null);
            fetchUoms();
        } catch (err) {
            alert(err.response?.data?.message || 'Failed to save UOM');
        } finally {
            setSaving(false);
        }
    };

    const handleEdit = (uom) => {
        setEditingId(uom._id);
        setForm({
            name: uom.name || '',
            code: uom.code || '',
            isActive: uom.isActive ?? true,
        });
    };

    const handleDelete = async (id) => {
        if (!window.confirm('Delete this UOM?')) return;

        try {
            await axios.delete(`/api/uoms/${id}`);
            fetchUoms();
        } catch (err) {
            alert(err.response?.data?.message || 'Failed to delete UOM');
        }
    };

    return (
        <div style={{ padding: '2rem', display: 'grid', gridTemplateColumns: '360px 1fr', gap: '2rem' }}>
            <div className="glass-panel" style={{ padding: '1.5rem' }}>
                <h2>{editingId ? 'Edit UOM' : 'Add UOM'}</h2>

                <form onSubmit={handleSubmit} style={{ display: 'grid', gap: '1rem' }}>
                    <input
                        className="input-field"
                        placeholder="UOM Name"
                        value={form.name}
                        onChange={(e) => setForm({ ...form, name: e.target.value })}
                        required
                    />

                    <input
                        className="input-field"
                        placeholder="Code"
                        value={form.code}
                        onChange={(e) => setForm({ ...form, code: e.target.value })}
                    />

                    <label style={{ color: 'white', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <input
                            type="checkbox"
                            checked={form.isActive}
                            onChange={(e) => setForm({ ...form, isActive: e.target.checked })}
                        />
                        Active
                    </label>

                    <button type="submit" className="btn btn-primary" disabled={saving}>
                        {saving ? 'Saving...' : editingId ? 'Update UOM' : 'Add UOM'}
                    </button>
                </form>
            </div>

            <div className="glass-panel" style={{ padding: '1.5rem' }}>
                <h2>UOM List</h2>

                {uoms.length === 0 ? (
                    <p style={{ color: 'var(--text-muted)' }}>No UOM created yet.</p>
                ) : (
                    <div style={{ display: 'grid', gap: '1rem' }}>
                        {uoms.map((uom) => (
                            <div
                                key={uom._id}
                                style={{
                                    display: 'flex',
                                    justifyContent: 'space-between',
                                    alignItems: 'center',
                                    padding: '1rem',
                                    borderRadius: '10px',
                                    background: 'rgba(255,255,255,0.05)',
                                }}
                            >
                                <div>
                                    <div style={{ color: 'white', fontWeight: 700 }}>{uom.name}</div>
                                    <div style={{ color: '#94a3b8', fontSize: '0.9rem' }}>
                                        Code: {uom.code || '-'} | Active: {uom.isActive ? 'Yes' : 'No'}
                                    </div>
                                </div>

                                <div style={{ display: 'flex', gap: '0.5rem' }}>
                                    <button
                                        onClick={() => handleEdit(uom)}
                                        style={{ background: 'transparent', border: 'none', color: '#60a5fa', cursor: 'pointer' }}
                                    >
                                        <FiEdit2 />
                                    </button>
                                    <button
                                        onClick={() => handleDelete(uom._id)}
                                        style={{ background: 'transparent', border: 'none', color: '#ef4444', cursor: 'pointer' }}
                                    >
                                        <FiTrash2 />
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}