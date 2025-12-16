import { useState, useEffect } from 'react';
import { api } from '../App';

export default function Settings() {
    const [apiKey, setApiKey] = useState('');
    const [status, setStatus] = useState('loading');
    const [msg, setMsg] = useState('');

    useEffect(() => {
        checkStatus();
    }, []);

    const checkStatus = async () => {
        try {
            const data = await api('/ai/status');
            setStatus(data.configured ? 'configured' : 'missing');
        } catch (error) {
            console.error(error);
            setStatus('error');
        }
    };

    const handleSave = async (e) => {
        e.preventDefault();
        setMsg('');
        try {
            await api('/config/apikey', {
                method: 'POST',
                body: { apiKey }
            });
            setStatus('configured');
            setMsg('API Key guardada correctamente. La IA está lista.');
            setApiKey('');
        } catch (error) {
            setMsg('Error al guardar: ' + error.message);
        }
    };

    return (
        <div className="container" style={{ maxWidth: '600px', margin: '2rem auto' }}>
            <h1>Configuración</h1>

            <div className="card item-card">
                <h2>Inteligencia Artificial</h2>
                <div style={{ marginBottom: '1rem' }}>
                    Estado:
                    <span className={`badge ${status === 'configured' ? 'badge-completed' : 'badge-abandoned'}`} style={{ marginLeft: '0.5rem' }}>
                        {status === 'configured' ? 'ACTIVO' : 'NO CONFIGURADO'}
                    </span>
                </div>

                <p style={{ opacity: 0.8, marginBottom: '1rem' }}>
                    Introduce tu Google Gemini API Key para habilitar el auto-completado mágico de fichas.
                    Puedes conseguir una gratis en <a href="https://aistudio.google.com/" target="_blank" rel="noreferrer" style={{ color: '#818cf8' }}>Google AI Studio</a>.
                </p>

                <form onSubmit={handleSave} className="form-group">
                    <label>Gemini API Key</label>
                    <input
                        type="password"
                        className="input"
                        placeholder="AIzaSy..."
                        value={apiKey}
                        onChange={(e) => setApiKey(e.target.value)}
                        required
                    />
                    <button type="submit" className="btn btn-primary" style={{ marginTop: '1rem', width: '100%' }}>
                        Guardar Configuración
                    </button>
                </form>

                {msg && (
                    <div style={{
                        marginTop: '1rem',
                        padding: '1rem',
                        background: msg.includes('Error') ? 'rgba(239, 68, 68, 0.2)' : 'rgba(34, 197, 94, 0.2)',
                        borderRadius: '8px',
                        border: `1px solid ${msg.includes('Error') ? '#ef4444' : '#22c55e'}`
                    }}>
                        {msg}
                    </div>
                )}
            </div>
        </div>
    );
}
