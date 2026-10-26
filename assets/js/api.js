/* ============================================
   🎬 BLLUFLIX - API Integration
   Integração com TMDB para dados de filmes
   ============================================ */

const API_KEY = '029b25ca28d76a1e40d289cf8be00378';
const BASE_URL = 'https://api.themoviedb.org/3';
const IMAGE_BASE_URL = 'https://image.tmdb.org/t/p';

// Tamanhos de imagem disponíveis
const IMAGE_SIZES = {
    poster: {
        small: '/w185',
        medium: '/w342',
        large: '/w500',
        original: '/original'
    },
    backdrop: {
        small: '/w300',
        medium: '/w780',
        large: '/w1280',
        original: '/original'
    }
};

// Gêneros de filmes
const GENRES = {
    28: 'Ação',
    12: 'Aventura',
    16: 'Animação',
    35: 'Comédia',
    80: 'Crime',
    99: 'Documentário',
    18: 'Drama',
    10751: 'Família',
    14: 'Fantasia',
    36: 'História',
    27: 'Terror',
    10402: 'Música',
    9648: 'Mistério',
    10749: 'Romance',
    878: 'Ficção Científica',
    10770: 'Filme de TV',
    53: 'Thriller',
    10752: 'Guerra',
    37: 'Faroeste',
    10101: 'Lutas'
};

// Gêneros de séries
const TV_GENRES = {
    10759: 'Ação & Aventura',
    16: 'Animação',
    35: 'Comédia',
    80: 'Crime',
    99: 'Documentário',
    18: 'Drama',
    10751: 'Família',
    10762: 'Kids',
    9648: 'Mistério',
    10763: 'News',
    10764: 'Reality',
    10765: 'Sci-Fi & Fantasia',
    10766: 'Soap',
    10767: 'Talk',
    10768: 'Guerra & Política',
    37: 'Faroeste',
    10101: 'Lutas'
};

// ============================================
// CLASSE PRINCIPAL DA API
// ============================================

class TMDB_API {
    constructor() {
        this.cache = new Map();
        this.cacheExpiry = 5 * 60 * 1000; // 5 minutos
    }

    // Método genérico para fazer requisições
    async fetch(endpoint, params = {}) {
        const queryParams = new URLSearchParams({
            api_key: API_KEY,
            language: 'pt-BR',
            ...params
        });

        const url = `${BASE_URL}${endpoint}?${queryParams}`;

        // Verifica cache
        const cached = this.cache.get(url);
        if (cached && Date.now() - cached.timestamp < this.cacheExpiry) {
            return cached.data;
        }

        try {
            const response = await fetch(url);
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            const data = await response.json();

            // Salva no cache
            this.cache.set(url, { data, timestamp: Date.now() });

            return data;
        } catch (error) {
            console.error('Erro na API:', error);
            throw error;
        }
    }

    // Gera URL da imagem
    getImageUrl(path, type = 'poster', size = 'medium') {
        if (!path) return 'https://via.placeholder.com/500x750/1a1a25/6b6b7b?text=Sem+Imagem';
        return `${IMAGE_BASE_URL}${IMAGE_SIZES[type][size]}${path}`;
    }

    // === FILMES ===

    // Filmes em lançamento (nos cinemas agora)
    async getNowPlaying(page = 1) {
        return this.fetch('/movie/now_playing', { page, region: 'BR' });
    }

    // Filmes populares
    async getPopularMovies(page = 1) {
        return this.fetch('/movie/popular', { page });
    }

    // Filmes mais bem avaliados
    async getTopRatedMovies(page = 1) {
        return this.fetch('/movie/top_rated', { page });
    }

    // Filmes em breve
    async getUpcomingMovies(page = 1) {
        return this.fetch('/movie/upcoming', { page, region: 'BR' });
    }

    // Filmes em tendência
    async getTrendingMovies(timeWindow = 'week') {
        return this.fetch(`/trending/movie/${timeWindow}`);
    }

    // Detalhes do filme
    async getMovieDetails(movieId) {
        return this.fetch(`/movie/${movieId}`, {
            append_to_response: 'credits,videos,similar,recommendations,external_ids'
        });
    }

    // Buscar filmes por gênero
    async getMoviesByGenre(genreId, page = 1) {
        return this.fetch('/discover/movie', {
            with_genres: genreId,
            with_original_language: 'en|pt|es|fr|it|de|ko|ja',
            sort_by: 'popularity.desc',
            page
        });
    }

    // Buscar filmes por ano
    async getMoviesByYear(year, page = 1) {
        return this.fetch('/discover/movie', {
            primary_release_year: year,
            with_original_language: 'en|pt|es|fr|it|de|ko|ja',
            sort_by: 'popularity.desc',
            page
        });
    }

    // Buscar filmes
    async searchMovies(query, page = 1) {
        return this.fetch('/search/movie', { query, page });
    }

    // === SÉRIES ===

    // Séries populares
    async getPopularTVShows(page = 1) {
        return this.fetch('/tv/popular', { page });
    }

    // Séries mais bem avaliadas
    async getTopRatedTVShows(page = 1) {
        return this.fetch('/tv/top_rated', { page });
    }

    // Séries no ar
    async getOnTheAirTVShows(page = 1) {
        return this.fetch('/tv/on_the_air', { page });
    }

    // Séries em tendência
    async getTrendingTVShows(timeWindow = 'week') {
        return this.fetch(`/trending/tv/${timeWindow}`);
    }

    // Detalhes da série
    async getTVShowDetails(tvId) {
        return this.fetch(`/tv/${tvId}`, {
            append_to_response: 'credits,videos,similar,recommendations'
        });
    }

    // Detalhes da temporada
    async getTVSeasonDetails(tvId, seasonNumber) {
        return this.fetch(`/tv/${tvId}/season/${seasonNumber}`);
    }

    // Buscar séries
    async searchTVShows(query, page = 1) {
        return this.fetch('/search/tv', { query, page });
    }

    // === BUSCA UNIFICADA ===

    // Busca multi (filmes, séries e pessoas)
    async searchMulti(query, page = 1) {
        return this.fetch('/search/multi', { query, page });
    }

    // === DISCOVER ===

    // Descobrir filmes com filtros
    async discoverMovies(filters = {}) {
        const defaultFilters = {
            sort_by: 'popularity.desc',
            include_adult: false,
            include_video: false,
            page: 1
        };
        return this.fetch('/discover/movie', { ...defaultFilters, ...filters });
    }

    // Descobrir séries com filtros
    async discoverTVShows(filters = {}) {
        const defaultFilters = {
            sort_by: 'popularity.desc',
            include_adult: false,
            page: 1
        };
        return this.fetch('/discover/tv', { ...defaultFilters, ...filters });
    }

    // === UTILITÁRIOS ===

    // Retorna lista de gêneros de filmes (Aventura 1º, Animação 2º, Ação 3º, resto alfabético)
    getMovieGenres() {
        const genres = Object.entries(GENRES).map(([id, name]) => ({ id: parseInt(id), name }));
        const pinned = ['Aventura', 'Animação', 'Ação'];
        return genres.sort((a, b) => {
            const ai = pinned.indexOf(a.name);
            const bi = pinned.indexOf(b.name);
            if (ai !== -1 && bi !== -1) return ai - bi;
            if (ai !== -1) return -1;
            if (bi !== -1) return 1;
            return a.name.localeCompare(b.name, 'pt-BR');
        });
    }

    // Retorna lista de gêneros de séries (Ação & Aventura 1º, Animação 2º, resto alfabético)
    getTVGenres() {
        const genres = Object.entries(TV_GENRES).map(([id, name]) => ({ id: parseInt(id), name }));
        const pinned = ['Ação & Aventura', 'Animação'];
        return genres.sort((a, b) => {
            const ai = pinned.indexOf(a.name);
            const bi = pinned.indexOf(b.name);
            if (ai !== -1 && bi !== -1) return ai - bi;
            if (ai !== -1) return -1;
            if (bi !== -1) return 1;
            return a.name.localeCompare(b.name, 'pt-BR');
        });
    }

    // Retorna nome do gênero por ID
    getGenreName(id, type = 'movie') {
        const genres = type === 'movie' ? GENRES : TV_GENRES;
        return genres[id] || 'Desconhecido';
    }

    // Formata data
    formatDate(dateString) {
        if (!dateString) return 'Data desconhecida';
        const date = new Date(dateString);
        return date.toLocaleDateString('pt-BR', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
    }

    // Extrai ano da data
    getYear(dateString) {
        if (!dateString) return 'N/A';
        return new Date(dateString).getFullYear();
    }

    // Formata duração
    formatRuntime(minutes) {
        if (!minutes) return 'N/A';
        const hours = Math.floor(minutes / 60);
        const mins = minutes % 60;
        return hours > 0 ? `${hours}h ${mins}min` : `${mins}min`;
    }

    // Formata avaliação
    formatRating(rating) {
        if (!rating) return 'N/A';
        return rating.toFixed(1);
    }
}

// Instância global da API
const tmdbAPI = new TMDB_API();

// Exporta para uso global
window.tmdbAPI = tmdbAPI;
window.GENRES = GENRES;
window.TV_GENRES = TV_GENRES;

console.log('🎬 TMDB API carregada com sucesso!');

// Global Navigation Helper
window.goBack = function (e) {
    if (e) e.preventDefault();

    // Check if there's history to go back to
    // Note: history.length > 1 doesn't always guarantee previous page is strictly ours, 
    // but acts as a decent heuristic. 
    // A better check is verifying referrer, but history.back() is standard behavior.
    if (window.history.length > 1 && document.referrer.includes(window.location.hostname)) {
        window.history.back();
    } else {
        window.location.href = 'index.html';
    }
};
