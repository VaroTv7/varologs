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
                                        <div key={user.id} className="user-option-wrapper applied-user-manager">
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
                                            <button
                                                className="delete-user-btn"
                                                type="button"
                                                onClick={(e) => {
                                                    e.preventDefault();
                                                    e.stopPropagation();
                                                    const isConfirmed = window.confirm(`¿⚠️ ESTÁS SEGURO?\n\nSe borrará el usuario "${user.name}" y TODAS sus reseñas/listas.\n\nEsta acción no se puede deshacer.`);
                                                    if (isConfirmed) {
                                                        api(`/users/${user.id}`, { method: 'DELETE' })
                                                            .then(() => loadUsers())
                                                            .catch(err => setError(err.message));
                                                    }
                                                }}
                                                title="Borrar usuario permanentemente"
                                                style={{ zIndex: 10 }}
                                            >
                                                🗑️
                                            </button>
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
        </div>
    );
}
