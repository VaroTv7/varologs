import { useState, useEffect } from 'react';
import { api } from '../App';

export default function Settings() {
    const [config, setConfig] = useState(null);
    const [apiKey, setApiKey] = useState('');
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [status, setStatus] = useState('');

    useEffect(() => {
        loadConfig();
    }, []);

    async function loadConfig() {
        try {
            const data = await api('/config');
            setConfig(data);
        } catch (err) {
            setStatus('Error cargando configuración');
        } finally {
            setLoading(false);
        }
    }

    async function handleSave(e) {
        e.preventDefault();
        setSaving(true);
        setStatus('');

        try {
            await api('/config', {
                method: 'POST',
                body: { gemini_api_key: apiKey }
            });
            setStatus('¡Configuración guardada!');
            setApiKey('');
            loadConfig();
        } catch (err) {
            setStatus('Error guardando: ' + err.message);
        } finally {
            setSaving(false);
        }
    }

    return (
        <div className="container" style={{ maxWidth: 600, margin: '2rem auto' }}>
            <h1 className="text-xl mb-lg">⚙️ Configuración</h1>

            <div className="card">
                <div className="card-body">
                    <h2 className="card-title mb-md">Google Gemini AI</h2>
                    <p className="text-secondary mb-md">
                        Configura la API key para permitir el autocompletado de fichas y búsqueda de carátulas.
                    </p>

                    <div className="mb-md p-md" style={{
                        background: config?.gemini_configured ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)',
                        borderRadius: 'var(--border-radius)',
                        border: `1px solid ${config?.gemini_configured ? '#10b981' : '#ef4444'}`
                    }}>
                        Status: <strong>{config?.gemini_configured ? '✅ ACTIVO' : '❌ INACTIVO'}</strong>
                        {config?.gemini_key_masked && <div className="text-sm mt-sm">Key actual: {config.gemini_key_masked}</div>}
                    </div>

                    <form onSubmit={handleSave}>
                        <div className="form-group">
                            <label className="form-label">Nueva API Key</label>
                            <input
                                type="password"
                                className="form-input"
                                placeholder="sk-..."
                                value={apiKey}
                                onChange={e => setApiKey(e.target.value)}
                            />
                        </div>

                        <div className="flex gap-sm">
                            <button
                                type="submit"
                                className="btn btn-primary"
                                disabled={saving || !apiKey}
                            >
                                {saving ? 'Guardando...' : '💾 Guardar Key'}
                            </button>
                            <a
                                href="https://aistudio.google.com/app/apikey"
                                target="_blank"
                                rel="noreferrer"
                                className="btn btn-secondary"
                            >
                                Obtener Key ↗
                            </a>
                        </div>
                    </form>

                    {status && (
                        <p className="mt-md p-sm bg-tertiary rounded text-center">
                            {status}
                        </p>
                    )}
                </div>
            </div>
        </div>
    );
}
