import { useState, useEffect } from 'react';
import { useUser, api } from '../App';

export default function Settings() {
    const { user, login } = useUser();
    const [apiKey, setApiKey] = useState('');
    const [status, setStatus] = useState(null);
    const [loading, setLoading] = useState(false);
    const [aiStatus, setAiStatus] = useState(false);

    useEffect(() => {
        checkAiStatus();
    }, []);

    const checkAiStatus = async () => {
        try {
            const data = await api('/ai/status');
            setAiStatus(data.configured);
        } catch (error) {
            console.error('Failed to check AI status:', error);
        }
    };

    const handleSaveKey = async (e) => {
        e.preventDefault();
        setLoading(true);
        setStatus(null);

        try {
            await api('/config/apikey', {
                method: 'POST',
                body: { apiKey }
            });
            setStatus({ type: 'success', message: 'API Key guardada correctamente' });
            setApiKey('');
            checkAiStatus();
        } catch (error) {
            setStatus({ type: 'error', message: error.message });
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="container fade-in">
            <div className="card">
                <h2>⚙️ Configuración</h2>

                <div className="section">
                    <h3>🤖 Inteligencia Artificial (Gemini)</h3>
                    <div className={`status-badge ${aiStatus ? 'success' : 'warning'}`}>
                        {aiStatus ? '✅ IA Activada y Lista' : '⚠️ IA No Configurada'}
                    </div>

                    <p className="text-secondary">
                        Introduce tu API Key de Google Gemini para habilitar el auto-completado mágico.
                        La clave se guarda de forma segura en tu servidor.
                    </p>

                    <form onSubmit={handleSaveKey} className="settings-form">
                        <div className="form-group">
                            <label>Gemini API Key</label>
                            <input
                                type="password"
                                value={apiKey}
                                onChange={(e) => setApiKey(e.target.value)}
                                placeholder="AIzaSy..."
                                className="input"
                            />
                        </div>
                        <button type="submit" className="btn btn-primary" disabled={loading || !apiKey}>
                            {loading ? 'Guardando...' : 'Guardar Key'}
                        </button>
                    </form>

                    {status && (
                        <div className={`alert ${status.type}`}>
                            {status.message}
                        </div>
                    )}
                </div>

                <div className="section">
                    <h3>👤 Usuario</h3>
                    <p>Sesión actual: <strong>{user?.name}</strong></p>
                    <div
                        className="user-avatar-large"
                        style={{ backgroundColor: user?.avatar_color }}
                    >
                        {user?.name?.charAt(0).toUpperCase()}
                    </div>
                </div>
            </div>

            <style>{`
                .section {
                    margin-bottom: 2rem;
                    padding-bottom: 2rem;
                    border-bottom: 1px solid var(--border);
                }
                .section:last-child {
                    border-bottom: none;
                }
                .status-badge {
                    display: inline-block;
                    padding: 0.5rem 1rem;
                    border-radius: 99px;
                    font-weight: bold;
                    margin-bottom: 1rem;
                    background: rgba(255,255,255,0.05);
                }
                .status-badge.success { color: var(--success); background: rgba(34, 197, 94, 0.1); }
                .status-badge.warning { color: var(--warning); background: rgba(234, 179, 8, 0.1); }
                .user-avatar-large {
                    width: 64px;
                    height: 64px;
                    border-radius: 50%;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    font-size: 2rem;
                    font-weight: bold;
                    margin-top: 1rem;
                }
            `}</style>
        </div>
    );
}
