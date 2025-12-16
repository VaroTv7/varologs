import { GoogleGenAI } from '@google/genai';

let geminiApiKey = process.env.GEMINI_API_KEY;
let aiClient = geminiApiKey ? new GoogleGenAI({ apiKey: geminiApiKey }) : null;

// Update the API key dynamically
export function setApiKey(key) {
    geminiApiKey = key;
    aiClient = new GoogleGenAI({ apiKey: key });
    console.log('Gemini API Key updated');
}

// Model cascade: Gemini 3 Pro first, then 2.5 Flash as fallback
const MODELS = [
    'gemini-2.5-pro',
    'gemini-2.5-flash'
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
  "synopsis": "sinopsis breve en español (máx 30 palabras)"
}
Si no encuentras el ítem exacto, devuelve null.`;

    let lastError = null;

    for (const model of MODELS) {
        try {
            console.log(`Trying AI model: ${model}`);

            // Note: @google/genai SDK usage may vary, sticking to standard generateContent
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

            // If quota exceeded, we definitely want to try the next model (often lower tier)
            if (error.message.includes('429') || error.message.includes('quota')) {
                continue;
            }
            lastError = error;
        }
    }

    throw new Error(`AI Autocomplete failed: ${lastError?.message || 'Unknown error'}`);
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
