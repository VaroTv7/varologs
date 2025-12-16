import { GoogleGenAI } from '@google/genai';
import { existsSync, readFileSync, writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const CONFIG_PATH = join(__dirname, '..', '..', 'data', 'config.json');

function loadConfig() {
    try {
        if (existsSync(CONFIG_PATH)) {
            return JSON.parse(readFileSync(CONFIG_PATH, 'utf-8'));
        }
    } catch (e) {
        console.error('Failed to load config:', e);
    }
    return {};
}

let geminiApiKey = process.env.GEMINI_API_KEY || loadConfig().geminiApiKey;
let aiClient = geminiApiKey ? new GoogleGenAI({ apiKey: geminiApiKey }) : null;

// Update the API key dynamically and persist it
export function setApiKey(key) {
    geminiApiKey = key;
    aiClient = new GoogleGenAI({ apiKey: key });

    // Persist
    try {
        const config = loadConfig();
        config.geminiApiKey = key;
        writeFileSync(CONFIG_PATH, JSON.stringify(config, null, 2));
        console.log('Gemini API Key updated and saved');
    } catch (e) {
        console.error('Failed to save config:', e);
    }
}

// Model cascade: Waterfall from most powerful/newest to most stable/efficient
const MODELS = [
    'gemini-3-pro-preview',     // Experimental / Future
    'gemini-2.5-pro',           // High Intelligence
    'gemini-2.5-flash-lite',    // Efficient High Int
    'gemini-2.5-flash',         // Fast High Int
    'gemini-2.0-flash-lite',    // Efficient Mid
    'gemini-2.0-flash',         // Stable Mid
    'gemini-1.5-pro',           // Legacy Pro
    'gemini-1.5-flash'          // Ultimate Fallback (Stable)
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
 */
export async function autocompleteMedia(query, type) {
    if (!aiClient) {
        throw new Error('Gemini API key not configured');
    }

    const typeEs = TYPE_TRANSLATIONS[type] || type;
    const prompt = `Busca información precisa sobre "${query}" (tipo: ${typeEs}).
    
Responde SOLO con un JSON válido con esta estructura:
{
  "title": "título oficial completo",
  "year": 2024,
  "creator": "autor/director/desarrollador principal",
  "genre": "género principal",
  "synopsis": "sinopsis breve en español (máx 50 palabras)",
  "metadata": {
      // SOLO rellena los campos que correspondan al tipo:
      // Cine/TV: "duration" (minutos/temporadas), "cast" (array top 3), "production" (estudio), "rating" (0-10 IMDb)
      // Videojuegos: "developer", "publisher", "platforms" (array), "hltb_time" (horas historia principal)
      // Libros/Manga: "pages" (nº), "isbn", "publisher"
      // Música: "artist", "length" (mm:ss), "label"
  }
}
Si no encuentras el ítem exacto, devuelve null.`;

    let lastError = null;

    for (const model of MODELS) {
        try {
            console.log(`Trying AI model: ${model}`);

            const response = await aiClient.models.generateContent({
                model: model,
                contents: prompt,
                config: {
                    temperature: 0.1,
                }
            });

            const text = response.text ? response.text() : (response.response ? response.response.text() : '');

            if (!text) throw new Error('Empty response from AI');

            const jsonStr = text.replace(/```json/g, '').replace(/```/g, '').trim();
            const data = JSON.parse(jsonStr);

            console.log(`Success with ${model}`);
            return data;

        } catch (error) {
            console.warn(`Model ${model} failed: ${error.message}`);
            lastError = error;
            // Always continue to the next model in the list, unless it's a fatal config error
            // (But we assume config is correct and valid for at least one model)
            continue;
        }
    }

    throw new Error(`AI Autocomplete failed after trying all models. Last error: ${lastError?.message || 'Unknown code'}`);
}

export async function suggestCoverSearch(title, type, year) {
    if (!aiClient) return `${title} ${type} cover`;

    try {
        const response = await aiClient.models.generateContent({
            model: 'gemini-1.5-flash', // Use cheaper model for this
            contents: `Search query for cover image of: ${title} (${type}, ${year}). Return ONLY the query string (e.g. "Zelda Ocarina of Time cover").`,
        });
        return response.text().trim();
    } catch (e) {
        return `${title} ${type} cover`;
    }
}

export function isAIConfigured() {
    return !!aiClient;
}
