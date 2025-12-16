import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { api, useUser } from '../App';

const MEDIA_TYPES = [
    { value: '', label: 'Todos', icon: '📋' },
    { value: 'movie', label: 'Películas', icon: '🎬' },
    { value: 'series', label: 'Series', icon: '📺' },
    { value: 'game', label: 'Juegos', icon: '🎮' },
    { value: 'book', label: 'Libros', icon: '📚' },
    { value: 'anime', label: 'Anime', icon: '🎌' },
    { value: 'manga', label: 'Manga', icon: '📖' },
    { value: 'music', label: 'Música', icon: '🎵' },
    { value: 'podcast', label: 'Podcasts', icon: '🎙️' }
];

const STATUS_LABELS = {
    pending: '📋 Pendiente',
    in_progress: '▶️ En progreso',
    completed: '✅ Completado',
    abandoned: '❌ Abandonado'
};

function MediaCard({ item }) {
    return (
        <Link to={`/item/${item.id}`} className="card">
            <div className="card-cover">
                {item.cover_url ? (
                    <img src={item.cover_url} alt={item.title} loading="lazy" />
                ) : (
                    <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        height: '100%',
                        fontSize: '4rem',
                        opacity: 0.3
                    }}>
                        {MEDIA_TYPES.find(t => t.value === item.type)?.icon || '📋'}
                    </div>
                )}
            </div>
            <div className="card-body">
                <h3 className="card-title">{item.title}</h3>
                <div className="card-meta">
                    <span>{item.year || 'Sin año'}</span>
                    {item.avg_rating && (
                        <span className="rating">
                            <span className="rating-star">★</span>
                            <span>{Number(item.avg_rating).toFixed(1)}</span>
                        </span>
                    )}
                </div>
            </div>
        </Link>
    );
}

export default function Dashboard() {
    const { user } = useUser();
    const [items, setItems] = useState([]);
    const [stats, setStats] = useState(null);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState('');
    const [search, setSearch] = useState('');

    useEffect(() => {
        loadData();
    }, [filter, user]);

    async function loadData() {
        setLoading(true);
        try {
            const params = new URLSearchParams();
            if (filter) params.append('type', filter);
            if (search) params.append('search', search);

            const [itemsData, statsData] = await Promise.all([
                api(`/items?${params}`),
                api(`/stats?user_id=${user.id}`)
            ]);

            setItems(itemsData);
            setStats(statsData);
        } catch (err) {
            console.error('Error loading data:', err);
        } finally {
            setLoading(false);
        }
    }

    // Debounced search
    useEffect(() => {
        const timer = setTimeout(() => {
            if (search !== '') loadData();
        }, 300);
        return () => clearTimeout(timer);
    }, [search]);

    return (
        <div>
            {/* Stats */}
            {stats && (
                <div className="stats">
                    <div className="stat-card">
                        <div className="stat-value">{stats.totalItems}</div>
                        <div className="stat-label">Total Items</div>
                    </div>
                    <div className="stat-card">
                        <div className="stat-value">{stats.userStats?.reviewed || 0}</div>
                        <div className="stat-label">Reseñados</div>
                    </div>
                    <div className="stat-card">
                        <div className="stat-value">{stats.userStats?.completed || 0}</div>
                        <div className="stat-label">Completados</div>
                    </div>
                    <div className="stat-card">
                        <div className="stat-value">
                            {stats.userStats?.avgRating ? Number(stats.userStats.avgRating).toFixed(1) : '-'}
                        </div>
                        <div className="stat-label">Nota Media</div>
                    </div>
                </div>
            )}

            {/* Search */}
            <div className="flex items-center justify-between gap-md mb-lg">
                <div className="search-box" style={{ flex: 1 }}>
                    <span className="search-icon">🔍</span>
                    <input
                        type="text"
                        className="search-input"
                        placeholder="Buscar títulos..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                    />
                </div>
            </div>

            {/* Filters */}
            <div className="filters">
                {MEDIA_TYPES.map(type => (
                    <button
                        key={type.value}
                        className={`filter-btn ${filter === type.value ? 'active' : ''}`}
                        onClick={() => setFilter(type.value)}
                    >
                        {type.icon} {type.label}
                    </button>
                ))}
            </div>

            {/* Grid */}
            {loading ? (
                <div className="loading">
                    <div className="spinner"></div>
                </div>
            ) : items.length === 0 ? (
                <div className="empty-state">
                    <div className="empty-icon">📭</div>
                    <h3 className="empty-title">No hay items</h3>
                    <p>Añade tu primera película, serie, juego o libro</p>
                </div>
            ) : (
                <div className="grid grid-cards">
                    {items.map(item => (
                        <MediaCard key={item.id} item={item} />
                    ))}
                </div>
            )}
        </div>
    );
}
