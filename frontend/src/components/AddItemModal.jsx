import { useState } from 'react';
import { api, useUser } from '../App';

const MEDIA_TYPES = [
    { value: 'movie', label: 'Película', icon: '🎬' },
    { value: 'series', label: 'Serie', icon: '📺' },
    { value: 'game', label: 'Juego', icon: '🎮' },
    { value: 'book', label: 'Libro', icon: '📚' },
    { value: 'anime', label: 'Anime', icon: '🎌' },
    { value: 'manga', label: 'Manga', icon: '📖' },
    { value: 'music', label: 'Música', icon: '🎵' },
    { value: 'podcast', label: 'Podcast', icon: '🎙️' }
];

export default function AddItemModal({ onClose, onSuccess }) {
    const { user } = useUser();

    const [step, setStep] = useState(1); // 1: type+query, 2: confirm/edit
    const [type, setType] = useState('movie');
    const [searchQuery, setSearchQuery] = useState('');
    const [loading, setLoading] = useState(false);
    const [aiError, setAiError] = useState('');

    const [formData, setFormData] = useState({
        title: '',
        year: '',
        creator: '',
        genre: '',
        synopsis: '',
        cover_url: '',
        platform: '',
        developer: '',
        publisher: '',
        duration_min: '',
        pages: '',
        episodes: '',
        seasons: '',
        isbn: '',
        status: 'pending'
    });

    async function handleAIAutocomplete(e) {
        e.preventDefault();
        if (!searchQuery.trim()) return;

        setLoading(true);
        setAiError('');

        try {
            // Try AI autocomplete
            const aiData = await api('/ai/autocomplete', {
                method: 'POST',
                body: { query: searchQuery, type }
            });

            setFormData({
                title: aiData.title || searchQuery,
                year: aiData.year || '',
                creator: aiData.creator || '',
                genre: aiData.genre || '',
                synopsis: aiData.synopsis || '',
                cover_url: '',
                platform: aiData.platform || '',
                developer: aiData.developer || '',
                publisher: aiData.publisher || '',
                duration_min: aiData.duration_min || '',
                pages: aiData.pages || '',
                episodes: aiData.episodes || '',
                seasons: aiData.seasons || '',
                isbn: aiData.isbn || '',
                status: 'pending'
            });

            // Try to get cover
            try {
                const coverData = await api(`/ai/cover?title=${encodeURIComponent(aiData.title || searchQuery)}&type=${type}&year=${aiData.year || ''}`);
                if (coverData.cover_url) {
                    setFormData(prev => ({ ...prev, cover_url: coverData.cover_url }));
                }
            } catch {
                // Cover fetch failed, continue without it
            }

            setStep(2);
        } catch (err) {
            // AI failed, allow manual entry
            setAiError('La IA no está disponible. Puedes rellenar los datos manualmente.');
            setFormData(prev => ({ ...prev, title: searchQuery }));
            setStep(2);
        } finally {
            setLoading(false);
        }
    }

    async function handleSubmit(e) {
        e.preventDefault();
        if (!formData.title.trim()) return;

        setLoading(true);

        try {
            const item = await api('/items', {
                method: 'POST',
                body: {
                    type,
                    title: formData.title.trim(),
                    year: formData.year ? parseInt(formData.year) : null,
                    creator: formData.creator.trim() || null,
                    genre: formData.genre.trim() || null,
                    synopsis: formData.synopsis.trim() || null,
                    cover_url: formData.cover_url.trim() || null,
                    created_by: user.id,
                    platform: formData.platform.trim() || null,
                    developer: formData.developer.trim() || null,
                    publisher: formData.publisher.trim() || null,
                    duration_min: formData.duration_min ? parseInt(formData.duration_min) : null,
                    pages: formData.pages ? parseInt(formData.pages) : null,
                    episodes: formData.episodes ? parseInt(formData.episodes) : null,
                    seasons: formData.seasons ? parseInt(formData.seasons) : null,
                    isbn: formData.isbn.trim() || null,
                    status: formData.status || 'pending'
                }
            });

            onSuccess(item);
        } catch (err) {
            console.error('Error creating item:', err);
        } finally {
            setLoading(false);
        }
    }

    function handleSkipAI() {
        setFormData(prev => ({ ...prev, title: searchQuery }));
        setStep(2);
    }

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal" onClick={e => e.stopPropagation()}>
                <div className="modal-header">
                    <h2 className="modal-title">
                        {step === 1 ? 'Añadir nuevo item' : 'Confirmar datos'}
                    </h2>
                    <button className="modal-close" onClick={onClose}>×</button>
                </div>

                <div className="modal-body">
                    {step === 1 ? (
                        <form onSubmit={handleAIAutocomplete}>
                            <div className="form-group">
                                <label className="form-label">Tipo de contenido</label>
                                <div className="filters" style={{ marginBottom: 0 }}>
                                    {MEDIA_TYPES.map(t => (
                                        <button
                                            key={t.value}
                                            type="button"
                                            className={`filter-btn ${type === t.value ? 'active' : ''}`}
                                            onClick={() => setType(t.value)}
                                        >
                                            {t.icon} {t.label}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div className="form-group">
                                <label className="form-label">¿Qué quieres añadir?</label>
                                <input
                                    type="text"
                                    className="form-input"
                                    placeholder="Ej: The Last of Us, El Señor de los Anillos..."
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    autoFocus
                                    required
                                />
                            </div>

                            {aiError && (
                                <p style={{ color: 'var(--accent-warning)', marginBottom: 'var(--spacing-md)' }}>
                                    ⚠️ {aiError}
                                </p>
                            )}

                            <div className="flex gap-sm">
                                <button
                                    type="submit"
                                    className="btn btn-primary btn-lg"
                                    disabled={loading || !searchQuery.trim()}
                                    style={{ flex: 1 }}
                                >
                                    {loading ? '🔍 Buscando con IA...' : '🤖 Autocompletar con IA'}
                                </button>
                                <button
                                    type="button"
                                    className="btn btn-secondary btn-lg"
                                    onClick={handleSkipAI}
                                    disabled={loading || !searchQuery.trim()}
                                >
                                    Manual
                                </button>
                            </div>
                        </form>
                    ) : (
                        <form onSubmit={handleSubmit}>
                            <div className="flex gap-md mb-lg">
                                {/* Cover Preview */}
                                <div style={{
                                    width: 120,
                                    flexShrink: 0,
                                    aspectRatio: '2/3',
                                    background: 'var(--bg-tertiary)',
                                    borderRadius: 'var(--border-radius)',
                                    overflow: 'hidden'
                                }}>
                                    {formData.cover_url ? (
                                        <img
                                            src={formData.cover_url}
                                            alt="Cover"
                                            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                                        />
                                    ) : (
                                        <div style={{
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            height: '100%',
                                            fontSize: '2rem',
                                            opacity: 0.3
                                        }}>
                                            {MEDIA_TYPES.find(t => t.value === type)?.icon}
                                        </div>
                                    )}
                                </div>

                                <div style={{ flex: 1 }}>
                                    <div className="form-group">
                                        <label className="form-label">Título *</label>
                                        <input
                                            type="text"
                                            className="form-input"
                                            value={formData.title}
                                            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                                            required
                                        />
                                    </div>

                                    <div className="grid grid-cols-2 gap-sm">
                                        <div className="form-group">
                                            <label className="form-label">Año</label>
                                            <input
                                                type="number"
                                                className="form-input"
                                                placeholder="2024"
                                                min="1900"
                                                max="2030"
                                                value={formData.year}
                                                onChange={(e) => setFormData({ ...formData, year: e.target.value })}
                                            />
                                        </div>
                                        <div className="form-group">
                                            <label className="form-label">Género</label>
                                            <input
                                                type="text"
                                                className="form-input"
                                                placeholder="Acción"
                                                value={formData.genre}
                                                onChange={(e) => setFormData({ ...formData, genre: e.target.value })}
                                            />
                                        </div>
                                        {['game'].includes(type) && (
                                            <div className="form-group">
                                                <label className="form-label">Plataforma</label>
                                                <input
                                                    type="text"
                                                    className="form-input"
                                                    placeholder="Switch, PC..."
                                                    value={formData.platform}
                                                    onChange={(e) => setFormData({ ...formData, platform: e.target.value })}
                                                />
                                            </div>
                                        )}
                                        {['movie', 'anime'].includes(type) && (
                                            <div className="form-group">
                                                <label className="form-label">Duración (min)</label>
                                                <input
                                                    type="number"
                                                    className="form-input"
                                                    placeholder="120"
                                                    value={formData.duration_min}
                                                    onChange={(e) => setFormData({ ...formData, duration_min: e.target.value })}
                                                />
                                            </div>
                                        )}
                                        {['book', 'manga'].includes(type) && (
                                            <div className="form-group">
                                                <label className="form-label">Páginas</label>
                                                <input
                                                    type="number"
                                                    className="form-input"
                                                    placeholder="350"
                                                    value={formData.pages}
                                                    onChange={(e) => setFormData({ ...formData, pages: e.target.value })}
                                                />
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-sm">
                                <div className="form-group">
                                    <label className="form-label">Creador (Director/Autor)</label>
                                    <input
                                        type="text"
                                        className="form-input"
                                        placeholder="Nombre..."
                                        value={formData.creator}
                                        onChange={(e) => setFormData({ ...formData, creator: e.target.value })}
                                    />
                                </div>
                                {['game'].includes(type) && (
                                    <div className="form-group">
                                        <label className="form-label">Desarrollador</label>
                                        <input
                                            type="text"
                                            className="form-input"
                                            value={formData.developer}
                                            onChange={(e) => setFormData({ ...formData, developer: e.target.value })}
                                        />
                                    </div>
                                )}
                                {['series', 'anime'].includes(type) && (
                                    <div className="form-group">
                                        <label className="form-label">Episodios</label>
                                        <input
                                            type="number"
                                            className="form-input"
                                            value={formData.episodes}
                                            onChange={(e) => setFormData({ ...formData, episodes: e.target.value })}
                                        />
                                    </div>
                                )}
                            </div>

                            <div className="form-group">
                                <label className="form-label">Sinopsis</label>
                                <textarea
                                    className="form-textarea"
                                    placeholder="Descripción del contenido..."
                                    value={formData.synopsis}
                                    onChange={(e) => setFormData({ ...formData, synopsis: e.target.value })}
                                />
                            </div>

                            <div className="form-group">
                                <label className="form-label">URL de portada (opcional)</label>
                                <input
                                    type="url"
                                    className="form-input"
                                    placeholder="https://..."
                                    value={formData.cover_url}
                                    onChange={(e) => setFormData({ ...formData, cover_url: e.target.value })}
                                />
                            </div>

                            <div className="flex gap-sm">
                                <button
                                    type="button"
                                    className="btn btn-secondary btn-lg"
                                    onClick={() => setStep(1)}
                                >
                                    ← Atrás
                                </button>
                                <button
                                    type="submit"
                                    className="btn btn-primary btn-lg"
                                    disabled={loading || !formData.title.trim()}
                                    style={{ flex: 1 }}
                                >
                                    {loading ? 'Guardando...' : '💾 Guardar'}
                                </button>
                            </div>
                        </form>
                    )}
                </div>
            </div>
        </div>
    );
}
