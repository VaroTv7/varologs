import { GoogleGenAI } from '@google/genai';

import { GoogleGenAI } from '@google/genai';
import db from '../database.js'; // Import DB to read key

let ai = null;

// Initialize from DB or ENV
function initAI() {
    try {
        let key = process.env.GEMINI_API_KEY;
        // Try DB override
        try {
            const row = db.prepare("SELECT value FROM settings WHERE key = 'gemini_api_key'").get();
            if (row && row.value) key = row.value;
        } catch (e) {
            // DB might not be ready during tests/init
        }

        if (key) {
            ai = new GoogleGenAI({ apiKey: key });
            console.log('Gemini AI initialized with key');
        }
    } catch (err) {
        console.error('Failed to init AI:', err);
    }
}

// Runtime reconfiguration
export function configureAI(key) {
    if (key) {
        ai = new GoogleGenAI({ apiKey: key });
        console.log('Gemini AI re-configured');
    } else {
        ai = null;
    }
}

// Initial load
initAI();

// Model cascade: try newer models first, fallback to older ones
const MODELS = [
    'gemini-2.5-flash',
    'gemini-2.0-flash',
    'gemini-1.5-flash'
];

const TYPE_TRANSLATIONS = {
    movie: 'película',
    series: 'serie de televisión',
    game: 'videojuego',
    book: 'libro',
    anime: 'anime',
    manga: 'manga',
    music: 'álbum de música',
    podcast: 'podcast'
};

/**
 * Auto-complete media metadata using Gemini AI
 * Falls back through model cascade on failure
 */
export async function autocompleteMedia(query, type) {
    if (!ai) {
        throw new Error('Gemini API key not configured');
    }

    const typeEs = TYPE_TRANSLATIONS[type] || type;
    const prompt = `Busca información sobre "${query}" que es un/una ${typeEs}.

Responde ÚNICAMENTE con un objeto JSON válido (sin markdown, sin \`\`\`), con esta estructura exacta:
{
  "title": "título oficial exacto",
  "year": 2024,
  "creator": "director/desarrollador/autor/artista principal",
  "genre": "género principal",
  "synopsis": "sinopsis breve en español, máximo 3 frases",
  "platform": "plataformas principales (solo si es juego)",
  "developer": "estudio desarrollador (solo si es juego)",
  "publisher": "editora/distribuidora",
  "duration_min": 0, // minutos (pelis) o media por episodio
  "pages": 0, // solo libros
  "episodes": 0, // series/anime
  "seasons": 0, // series
  "isbn": "ISBN-13 (solo libros)"
}

Si no encuentras información exacta, usa null en los campos desconocidos.`;

    let lastError = null;

    for (const model of MODELS) {
        try {
            console.log(`Trying model: ${model}`);

            const response = await ai.models.generateContent({
                model,
                contents: prompt,
                config: {
                    temperature: 0.3,
                    maxOutputTokens: 500
                }
            });

            const text = response.text.trim();
            // Clean potential markdown code blocks
            const jsonStr = text.replace(/^```json?\n?/, '').replace(/\n?```$/, '').trim();

            const data = JSON.parse(jsonStr);
            console.log(`Success with ${model}`);
            return data;
        } catch (error) {
            console.log(`Model ${model} failed:`, error.message);
            lastError = error;
        }
    }

    throw new Error(`All AI models failed. Last error: ${lastError?.message}`);
}

/**
 * Generate a cover image search query
 */
export async function suggestCoverSearch(title, type, year) {
    if (!ai) {
        return `${title} ${year || ''} ${type} cover`;
    }

    try {
        const response = await ai.models.generateContent({
            model: MODELS[0],
            contents: `Para buscar la portada/carátula de "${title}" (${type}, ${year || 'año desconocido'}), 
      sugiere el mejor término de búsqueda en inglés. Responde SOLO con el término, sin explicaciones.`,
            config: { temperature: 0.1, maxOutputTokens: 50 }
        });

        return response.text.trim();
    } catch {
        return `${title} ${year || ''} ${type} cover`;
    }
}

export function isAIConfigured() {
    return !!ai;
}
