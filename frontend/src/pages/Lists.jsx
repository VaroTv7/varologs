import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { api, useUser } from '../App';

export default function Lists() {
    const { user } = useUser();
    const [lists, setLists] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showCreate, setShowCreate] = useState(false);
    const [newList, setNewList] = useState({ name: '', description: '' });

    useEffect(() => {
        loadLists();
    }, []);

    async function loadLists() {
        try {
            const data = await api(`/lists?user_id=${user.id}`);
            setLists(data);
        } catch (err) {
            console.error('Error loading lists:', err);
        } finally {
            setLoading(false);
        }
    }

    async function handleCreateList(e) {
        e.preventDefault();
        if (!newList.name.trim()) return;

        try {
            await api('/lists', {
                method: 'POST',
                body: {
                    user_id: user.id,
                    name: newList.name.trim(),
                    description: newList.description.trim() || null
                }
            });
            setNewList({ name: '', description: '' });
            setShowCreate(false);
            loadLists();
        } catch (err) {
            console.error('Error creating list:', err);
        }
    }

    async function handleDeleteList(id) {
        if (!confirm('¿Eliminar esta lista?')) return;

        try {
            await api(`/lists/${id}`, { method: 'DELETE' });
            loadLists();
        } catch (err) {
            console.error('Error deleting list:', err);
        }
    }

    if (loading) {
        return (
            <div className="loading">
                <div className="spinner"></div>
            </div>
        );
    }

    return (
        <div>
            <div className="flex items-center justify-between mb-lg">
                <h1>Mis Listas</h1>
                <button
                    className="btn btn-primary"
                    onClick={() => setShowCreate(true)}
                >
                    + Nueva Lista
                </button>
            </div>

            {/* Create Form */}
            {showCreate && (
                <div className="card mb-lg">
                    <form onSubmit={handleCreateList} style={{ padding: 'var(--spacing-lg)' }}>
                        <div className="form-group">
                            <label className="form-label">Nombre de la lista</label>
                            <input
                                type="text"
                                className="form-input"
                                placeholder="Ej: Favoritos 2024"
                                value={newList.name}
                                onChange={(e) => setNewList({ ...newList, name: e.target.value })}
                                required
                            />
                        </div>
                        <div className="form-group">
                            <label className="form-label">Descripción (opcional)</label>
                            <input
                                type="text"
                                className="form-input"
                                placeholder="Descripción de la lista..."
                                value={newList.description}
                                onChange={(e) => setNewList({ ...newList, description: e.target.value })}
                            />
                        </div>
                        <div className="flex gap-sm">
                            <button type="submit" className="btn btn-primary">Crear</button>
                            <button
                                type="button"
                                className="btn btn-secondary"
                                onClick={() => setShowCreate(false)}
                            >
                                Cancelar
                            </button>
                        </div>
                    </form>
                </div>
            )}

            {/* Lists Grid */}
            {lists.length === 0 ? (
                <div className="empty-state">
                    <div className="empty-icon">📝</div>
                    <h3 className="empty-title">No tienes listas</h3>
                    <p>Crea una lista para organizar tu contenido</p>
                </div>
            ) : (
                <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))' }}>
                    {lists.map(list => (
                        <div key={list.id} className="card">
                            <div className="card-body">
                                <div className="flex items-center justify-between">
                                    <h3 className="card-title">{list.name}</h3>
                                    {list.user_id === user.id && (
                                        <button
                                            className="btn btn-icon"
                                            onClick={() => handleDeleteList(list.id)}
                                            style={{ color: 'var(--accent-danger)' }}
                                        >
                                            🗑️
                                        </button>
                                    )}
                                </div>
                                {list.description && (
                                    <p className="card-meta mb-md">{list.description}</p>
                                )}
                                <div className="flex items-center justify-between">
                                    <span className="text-secondary">
                                        {list.item_count || 0} items
                                    </span>
                                    <span className="text-secondary">
                                        por {list.user_name}
                                    </span>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
