import { useState, useEffect } from 'react';
import { api } from '../App';

const AVATAR_COLORS = [
    '#6366f1', '#8b5cf6', '#ec4899', '#ef4444', '#f59e0b',
    '#10b981', '#14b8a6', '#06b6d4', '#3b82f6', '#6366f1'
];

export default function LoginScreen({ onLogin }) {
    const [users, setUsers] = useState([]);
    const [newName, setNewName] = useState('');
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [editingUser, setEditingUser] = useState(null);
    const [editName, setEditName] = useState('');
    const [confirmDelete, setConfirmDelete] = useState(null);

    useEffect(() => {
        loadUsers();
    }, []);

    async function loadUsers() {
        try {
            const data = await api('/users');
            setUsers(data);
        } catch (err) {
            setError('Error cargando usuarios');
        } finally {
            setLoading(false);
        }
    }

    async function handleCreateUser(e) {
        e.preventDefault();
        if (!newName.trim()) return;

        setError('');
        try {
            const randomColor = AVATAR_COLORS[Math.floor(Math.random() * AVATAR_COLORS.length)];
            const user = await api('/users', {
                method: 'POST',
                body: { name: newName.trim(), avatar_color: randomColor }
            });
            setNewName('');
            onLogin(user);
        } catch (err) {
            if (err.message.includes('already exists')) {
                setError('Ese nombre ya existe');
            } else {
                setError(err.message);
            }
        }
    }

    async function handleDeleteUser(userId) {
        try {
            await api(`/users/${userId}`, { method: 'DELETE' });
            setUsers(users.filter(u => u.id !== userId));
            setConfirmDelete(null);
        } catch (err) {
            setError('Error eliminando usuario');
        }
    }

    async function handleEditUser(e) {
        e.preventDefault();
        if (!editName.trim() || !editingUser) return;

        try {
            const updated = await api(`/users/${editingUser.id}`, {
                method: 'PUT',
                body: { name: editName.trim() }
            });
            setUsers(users.map(u => u.id === editingUser.id ? { ...u, name: editName.trim() } : u));
            setEditingUser(null);
            setEditName('');
        } catch (err) {
            setError(err.message);
        }
    }

    function startEdit(user, e) {
        e.stopPropagation();
        setEditingUser(user);
        setEditName(user.name);
    }

    function startDelete(user, e) {
        e.stopPropagation();
        setConfirmDelete(user);
    }

    return (
        <div className="login-screen">
            <div className="login-card">
                <div className="login-logo">📚</div>
                <h1 className="login-title">VaroLogs</h1>
                <p className="login-subtitle">Tu tracker personal de media</p>

                {loading ? (
                    <div className="loading">
                        <div className="spinner"></div>
                    </div>
                ) : (
                    <>
                        {users.length > 0 && (
                            <>
                                <p className="text-secondary mb-md">Selecciona tu usuario:</p>
                                <div className="user-list">
                                    {users.map(user => (
                                        <div key={user.id} className="user-option-wrapper">
                                            <button
                                                className="user-option"
                                                onClick={() => onLogin(user)}
                                            >
                                                <div
                                                    className="user-avatar"
                                                    style={{ backgroundColor: user.avatar_color }}
                                                >
                                                    {user.name.charAt(0).toUpperCase()}
                                                </div>
                                                <span className="user-option-name">{user.name}</span>
                                            </button>
                                            <div className="user-actions">
                                                <button
                                                    className="btn-icon"
                                                    onClick={(e) => startEdit(user, e)}
                                                    title="Editar nombre"
                                                >
                                                    ✏️
                                                </button>
                                                <button
                                                    className="btn-icon btn-danger"
                                                    onClick={(e) => startDelete(user, e)}
                                                    title="Eliminar usuario"
                                                >
                                                    🗑️
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                                <div className="text-secondary mb-md">— o —</div>
                            </>
                        )}

                        <form className="add-user-form" onSubmit={handleCreateUser}>
                            <input
                                type="text"
                                className="form-input"
                                placeholder="Nuevo usuario..."
                                value={newName}
                                onChange={(e) => setNewName(e.target.value)}
                                maxLength={20}
                            />
                            <button type="submit" className="btn btn-primary">
                                Entrar
                            </button>
                        </form>

                        {error && (
                            <p className="text-center mt-md" style={{ color: 'var(--accent-danger)' }}>
                                {error}
                            </p>
                        )}
                    </>
                )}
            </div>

            {/* Edit Modal */}
            {editingUser && (
                <div className="modal-overlay" onClick={() => setEditingUser(null)}>
                    <div className="modal" onClick={(e) => e.stopPropagation()}>
                        <h3>Editar Usuario</h3>
                        <form onSubmit={handleEditUser}>
                            <input
                                type="text"
                                className="form-input"
                                value={editName}
                                onChange={(e) => setEditName(e.target.value)}
                                maxLength={20}
                                autoFocus
                            />
                            <div className="modal-actions">
                                <button type="button" className="btn" onClick={() => setEditingUser(null)}>
                                    Cancelar
                                </button>
                                <button type="submit" className="btn btn-primary">
                                    Guardar
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Delete Confirmation Modal */}
            {confirmDelete && (
                <div className="modal-overlay" onClick={() => setConfirmDelete(null)}>
                    <div className="modal" onClick={(e) => e.stopPropagation()}>
                        <h3>¿Eliminar usuario?</h3>
                        <p>Se eliminarán todas las reseñas de <strong>{confirmDelete.name}</strong>.</p>
                        <div className="modal-actions">
                            <button className="btn" onClick={() => setConfirmDelete(null)}>
                                Cancelar
                            </button>
                            <button
                                className="btn btn-danger"
                                onClick={() => handleDeleteUser(confirmDelete.id)}
                            >
                                Eliminar
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <style>{`
                .user-option-wrapper {
                    display: flex;
                    align-items: center;
                    gap: 0.5rem;
                }
                .user-actions {
                    display: flex;
                    gap: 0.25rem;
                    opacity: 0;
                    transition: opacity 0.2s;
                }
                .user-option-wrapper:hover .user-actions {
                    opacity: 1;
                }
                .btn-icon {
                    background: rgba(255,255,255,0.1);
                    border: none;
                    border-radius: 6px;
                    padding: 0.4rem;
                    cursor: pointer;
                    font-size: 0.9rem;
                    transition: background 0.2s;
                }
                .btn-icon:hover {
                    background: rgba(255,255,255,0.2);
                }
                .btn-icon.btn-danger:hover {
                    background: rgba(239, 68, 68, 0.3);
                }
                .btn-danger {
                    background: var(--accent-danger) !important;
                }
                .modal-overlay {
                    position: fixed;
                    inset: 0;
                    background: rgba(0,0,0,0.7);
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    z-index: 1000;
                }
                .modal {
                    background: var(--bg-card);
                    padding: 1.5rem;
                    border-radius: 12px;
                    min-width: 300px;
                    max-width: 90%;
                }
                .modal h3 {
                    margin-bottom: 1rem;
                }
                .modal p {
                    margin-bottom: 1rem;
                    color: var(--text-secondary);
                }
                .modal-actions {
                    display: flex;
                    gap: 0.5rem;
                    justify-content: flex-end;
                    margin-top: 1rem;
                }
            `}</style>
        </div>
    );
}
