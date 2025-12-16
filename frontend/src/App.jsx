import { useState, useEffect, createContext, useContext } from 'react';
import { BrowserRouter, Routes, Route, Navigate, Link, useLocation, useNavigate } from 'react-router-dom';
import LoginScreen from './pages/LoginScreen';
import Dashboard from './pages/Dashboard';
import ItemDetail from './pages/ItemDetail';
import Lists from './pages/Lists';
import AddItemModal from './components/AddItemModal';

// User Context
const UserContext = createContext(null);
export const useUser = () => useContext(UserContext);

// API helper
const API_BASE = '/api';

export async function api(endpoint, options = {}) {
    const url = `${API_BASE}${endpoint}`;
    const config = {
        headers: { 'Content-Type': 'application/json' },
        ...options,
    };

    if (config.body && typeof config.body === 'object') {
        config.body = JSON.stringify(config.body);
    }

    const response = await fetch(url, config);

    if (!response.ok) {
        const error = await response.json().catch(() => ({ error: 'Request failed' }));
        throw new Error(error.error || 'Request failed');
    }

    if (response.status === 204) return null;
    return response.json();
}

// Header Component
function Header({ onAddItem }) {
    const { user, logout } = useUser();
    const location = useLocation();

    const isActive = (path) => location.pathname === path ? 'nav-link active' : 'nav-link';

    return (
        <header className="header">
            <div className="header-content">
                <Link to="/" className="logo">
                    <span className="logo-icon">📚</span>
                    <span>VaroLogs</span>
                </Link>

                <nav className="nav">
                    <Link to="/" className={isActive('/')}>Inicio</Link>
                    <Link to="/lists" className={isActive('/lists')}>Listas</Link>
                </nav>

                <div className="flex items-center gap-md">
                    <button className="btn btn-primary" onClick={onAddItem}>
                        + Añadir
                    </button>

                    <button className="user-badge" onClick={logout}>
                        <div
                            className="user-avatar"
                            style={{ backgroundColor: user?.avatar_color || '#6366f1' }}
                        >
                            {user?.name?.charAt(0).toUpperCase() || '?'}
                        </div>
                        <span>{user?.name}</span>
                    </button>
                </div>
            </div>
        </header>
    );
}

// App Component
function AppContent() {
    const { user } = useUser();
    const [showAddModal, setShowAddModal] = useState(false);
    const navigate = useNavigate();

    const handleItemAdded = (item) => {
        setShowAddModal(false);
        navigate(`/item/${item.id}`);
    };

    return (
        <div className="app">
            <Header onAddItem={() => setShowAddModal(true)} />

            <main className="main-content">
                <Routes>
                    <Route path="/" element={<Dashboard />} />
                    <Route path="/item/:id" element={<ItemDetail />} />
                    <Route path="/lists" element={<Lists />} />
                </Routes>
            </main>

            {showAddModal && (
                <AddItemModal
                    onClose={() => setShowAddModal(false)}
                    onSuccess={handleItemAdded}
                />
            )}
        </div>
    );
}

// Main App with Auth
export default function App() {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        // Check for saved user in localStorage
        const savedUser = localStorage.getItem('varologs_user');
        if (savedUser) {
            try {
                setUser(JSON.parse(savedUser));
            } catch {
                localStorage.removeItem('varologs_user');
            }
        }
        setLoading(false);
    }, []);

    const login = (userData) => {
        setUser(userData);
        localStorage.setItem('varologs_user', JSON.stringify(userData));
    };

    const logout = () => {
        setUser(null);
        localStorage.removeItem('varologs_user');
    };

    if (loading) {
        return (
            <div className="loading">
                <div className="spinner"></div>
            </div>
        );
    }

    if (!user) {
        return <LoginScreen onLogin={login} />;
    }

    return (
        <UserContext.Provider value={{ user, login, logout }}>
            <BrowserRouter>
                <AppContent />
            </BrowserRouter>
        </UserContext.Provider>
    );
}
