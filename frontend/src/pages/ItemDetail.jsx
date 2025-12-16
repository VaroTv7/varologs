import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api, useUser } from '../App';

const MEDIA_TYPES = {
    movie: { label: 'Película', icon: '🎬' },
    series: { label: 'Serie', icon: '📺' },
    game: { label: 'Juego', icon: '🎮' },
    book: { label: 'Libro', icon: '📚' },
    anime: { label: 'Anime', icon: '🎌' },
    manga: { label: 'Manga', icon: '📖' },
    music: { label: 'Música', icon: '🎵' },
    podcast: { label: 'Podcast', icon: '🎙️' }
};

const STATUS_OPTIONS = [
    { value: 'pending', label: '📋 Pendiente' },
    { value: 'in_progress', label: '▶️ En progreso' },
    { value: 'completed', label: '✅ Completado' },
    { value: 'abandoned', label: '❌ Abandonado' }
];

export default function ItemDetail() {
    const { id } = useParams();
    const navigate = useNavigate();
    const { user } = useUser();

    const [item, setItem] = useState(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    // My review state
    const [myReview, setMyReview] = useState({
        rating: 0,
        status: 'pending',
        review_text: ''
    });

    useEffect(() => {
        loadItem();
    }, [id]);

    async function loadItem() {
        try {
            const data = await api(`/items/${id}`);
            setItem(data);

            // Find my existing review
            const existing = data.reviews?.find(r => r.user_id === user.id);
            if (existing) {
                setMyReview({
                    rating: existing.rating || 0,
                    status: existing.status || 'pending',
                    review_text: existing.review_text || ''
                });
            }
        } catch (err) {
            console.error('Error loading item:', err);
        } finally {
            setLoading(false);
        }
    }

    async function handleSaveReview() {
        setSaving(true);
        try {
            await api(`/items/${id}/reviews`, {
                method: 'POST',
                body: {
                    user_id: user.id,
                    rating: myReview.rating || null,
                    status: myReview.status,
                    review_text: myReview.review_text || null
                }
            });
            await loadItem(); // Reload to get updated reviews
        } catch (err) {
            console.error('Error saving review:', err);
        } finally {
            setSaving(false);
        }
    }

    async function handleDelete() {
        if (!confirm('¿Eliminar este item y todas sus reseñas?')) return;

        try {
            await api(`/items/${id}`, { method: 'DELETE' });
            navigate('/');
        } catch (err) {
            console.error('Error deleting item:', err);
        }
    }

    if (loading) {
        return (
            <div className="loading">
                <div className="spinner"></div>
            </div>
        );
    }

    if (!item) {
        return (
            <div className="empty-state">
                <div className="empty-icon">❌</div>
                <h3 className="empty-title">Item no encontrado</h3>
            </div>
        );
    }

    const typeInfo = MEDIA_TYPES[item.type] || { label: item.type, icon: '📋' };
    const otherReviews = item.reviews?.filter(r => r.user_id !== user.id) || [];

    return (
        <div className="item-detail">
            {/* Cover */}
            <div>
                <div className="item-cover">
                    {item.cover_url ? (
                        <img src={item.cover_url} alt={item.title} />
                    ) : (
                        <div style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            height: '100%',
                            fontSize: '6rem',
                            opacity: 0.3
                        }}>
                            {typeInfo.icon}
                        </div>
                    )}
                </div>

                <button
                    className="btn btn-danger btn-lg mt-md"
                    style={{ width: '100%' }}
                    onClick={handleDelete}
                >
                    🗑️ Eliminar
                </button>
            </div>

            {/* Info */}
            <div className="item-info">
                <span className="type-badge">
                    {typeInfo.icon} {typeInfo.label}
                </span>

                <h1>{item.title}</h1>

                <div className="item-meta">
                    {item.year && <span>📅 {item.year}</span>}
                    {item.creator && <span>👤 {item.creator}</span>}
                    {item.genre && <span>🏷️ {item.genre}</span>}
                    {item.avg_rating && (
                        <span className="rating">
                            <span className="rating-star">★</span>
                            <span className="rating-value">{Number(item.avg_rating).toFixed(1)}</span>
                        </span>
                    )}
                </div>

                {item.synopsis && (
                    <p className="item-synopsis">{item.synopsis}</p>
                )}

                {/* My Review */}
                <div className="item-section">
                    <h2>Mi Reseña</h2>

                    <div className="form-group">
                        <label className="form-label">Estado</label>
                        <select
                            className="form-select"
                            value={myReview.status}
                            onChange={(e) => setMyReview({ ...myReview, status: e.target.value })}
                        >
                            {STATUS_OPTIONS.map(opt => (
                                <option key={opt.value} value={opt.value}>{opt.label}</option>
                            ))}
                        </select>
                    </div>

                    <div className="form-group">
                        <label className="form-label">
                            Puntuación: {myReview.rating > 0 ? myReview.rating.toFixed(1) : 'Sin puntuar'}
                        </label>
                        <div className="rating-input">
                            <span>0</span>
                            <input
                                type="range"
                                min="0"
                                max="10"
                                step="0.5"
                                value={myReview.rating}
                                onChange={(e) => setMyReview({ ...myReview, rating: parseFloat(e.target.value) })}
                            />
                            <span>10</span>
                        </div>
                    </div>

                    <div className="form-group">
                        <label className="form-label">Comentario (opcional)</label>
                        <textarea
                            className="form-textarea"
                            placeholder="¿Qué te ha parecido?"
                            value={myReview.review_text}
                            onChange={(e) => setMyReview({ ...myReview, review_text: e.target.value })}
                        />
                    </div>

                    <button
                        className="btn btn-primary btn-lg"
                        onClick={handleSaveReview}
                        disabled={saving}
                    >
                        {saving ? 'Guardando...' : '💾 Guardar Reseña'}
                    </button>
                </div>

                {/* Other Reviews */}
                {otherReviews.length > 0 && (
                    <div className="item-section">
                        <h2>Otras Reseñas ({otherReviews.length})</h2>

                        {otherReviews.map(review => (
                            <div key={review.id} className="review">
                                <div className="review-header">
                                    <div
                                        className="user-avatar"
                                        style={{ backgroundColor: review.avatar_color, width: 28, height: 28, fontSize: '0.75rem' }}
                                    >
                                        {review.user_name?.charAt(0).toUpperCase()}
                                    </div>
                                    <span className="review-user">{review.user_name}</span>
                                    <span className={`status-badge status-${review.status}`}>
                                        {STATUS_OPTIONS.find(s => s.value === review.status)?.label || review.status}
                                    </span>
                                    {review.rating && (
                                        <span className="review-rating rating">
                                            <span className="rating-star">★</span>
                                            <span>{review.rating.toFixed(1)}</span>
                                        </span>
                                    )}
                                </div>
                                {review.review_text && (
                                    <p className="review-text">{review.review_text}</p>
                                )}
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
