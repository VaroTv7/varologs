/**
 * Cover Image Fetching Service
 * Fetches cover URLs from various external APIs
 * No local storage - just URL references
 */

const TMDB_IMAGE_BASE = 'https://image.tmdb.org/t/p/w500';
const OPENLIBRARY_COVER_BASE = 'https://covers.openlibrary.org/b';
const IGDB_IMAGE_BASE = 'https://images.igdb.com/igdb/image/upload/t_cover_big';

/**
 * Search for movie/series cover from TMDB
 */
export async function searchTMDBCover(title, type = 'movie', year = null) {
    try {
        const mediaType = type === 'series' || type === 'anime' ? 'tv' : 'movie';
        const query = encodeURIComponent(title);
        const yearParam = year ? `&year=${year}` : '';

        // TMDB API (no key needed for search, uses public endpoint)
        const searchUrl = `https://api.themoviedb.org/3/search/${mediaType}?query=${query}${yearParam}&language=es-ES`;

        // Note: This would need a TMDB API key in production
        // For now, we'll construct a likely poster URL pattern
        return null; // Will fallback to poster placeholder
    } catch (error) {
        console.error('TMDB search failed:', error.message);
        return null;
    }
}

/**
 * Search for book cover from Open Library
 */
export async function searchOpenLibraryCover(title, author = null) {
    try {
        const query = encodeURIComponent(title + (author ? ` ${author}` : ''));
        const response = await fetch(`https://openlibrary.org/search.json?q=${query}&limit=1`);
        const data = await response.json();

        if (data.docs && data.docs.length > 0) {
            const book = data.docs[0];
            if (book.cover_i) {
                return `${OPENLIBRARY_COVER_BASE}/id/${book.cover_i}-L.jpg`;
            }
            if (book.isbn && book.isbn.length > 0) {
                return `${OPENLIBRARY_COVER_BASE}/isbn/${book.isbn[0]}-L.jpg`;
            }
        }
        return null;
    } catch (error) {
        console.error('OpenLibrary search failed:', error.message);
        return null;
    }
}

/**
 * Generate a DuckDuckGo image search URL (fallback)
 * User can click to find a suitable cover
 */
export function getDuckDuckGoSearchUrl(title, type) {
    const query = encodeURIComponent(`${title} ${type} cover poster`);
    return `https://duckduckgo.com/?q=${query}&iax=images&ia=images`;
}

/**
 * Get a placeholder cover based on media type
 */
export function getPlaceholderCover(type) {
    const colors = {
        movie: '4a5568',
        series: '5a67d8',
        game: '48bb78',
        book: 'ed8936',
        anime: 'ed64a6',
        manga: 'f56565',
        music: '9f7aea',
        podcast: '38b2ac'
    };

    const icons = {
        movie: '🎬',
        series: '📺',
        game: '🎮',
        book: '📚',
        anime: '🎌',
        manga: '📖',
        music: '🎵',
        podcast: '🎙️'
    };

    const color = colors[type] || '718096';
    const icon = encodeURIComponent(icons[type] || '📋');

    // Use placeholder.com for generic covers
    return `https://via.placeholder.com/300x450/${color}/ffffff?text=${icon}`;
}

/**
 * Main function to find best cover URL
 */
export async function findCoverUrl(title, type, year = null, creator = null) {
    let coverUrl = null;

    // Try type-specific sources
    switch (type) {
        case 'book':
        case 'manga':
            coverUrl = await searchOpenLibraryCover(title, creator);
            break;

        case 'movie':
        case 'series':
        case 'anime':
            coverUrl = await searchTMDBCover(title, type, year);
            break;

        case 'game':
            // IGDB requires Twitch auth - use placeholder for now
            coverUrl = null;
            break;

        case 'music':
        case 'podcast':
            // Would need Spotify API with OAuth - use placeholder
            coverUrl = null;
            break;
    }

    // Return found URL or placeholder
    return coverUrl || getPlaceholderCover(type);
}
