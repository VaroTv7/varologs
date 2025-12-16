import { readFileSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const CONFIG_PATH = join(__dirname, '..', 'data', 'config.json');

async function debug() {
    let key = process.env.GEMINI_API_KEY;
    if (!key && existsSync(CONFIG_PATH)) {
        try {
            const config = JSON.parse(readFileSync(CONFIG_PATH, 'utf-8'));
            key = config.geminiApiKey;
        } catch (e) {
            console.error('Config load error', e);
        }
    }

    if (!key) {
        console.log('No Key Found');
        return;
    }

    console.log('Fetching models via REST API...');
    try {
        const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${key}`);
        const data = await res.json();

        if (data.models) {
            console.log('--- MODELS FOUND ---');
            data.models.forEach(m => console.log(m.name));
        } else {
            console.log('ERROR RESPONSE:', JSON.stringify(data, null, 2));
        }
    } catch (e) {
        console.error('Fetch failed:', e);
    }
}

debug();
