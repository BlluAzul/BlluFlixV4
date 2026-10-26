/* ============================================
   🎬 BLLUFLIX - Calendar API Integration
   Calendário de Lançamentos da SuperFlixAPI
   ============================================ */

const CALENDAR_API_URL = 'https://superflixapi.fun/calendario.php';

// Status badges configuration
const STATUS_CONFIG = {
    'Hoje': {
        icon: '🔥',
        class: 'status-today',
        label: 'Lançamento Hoje'
    },
    'Futuro': {
        icon: '📅',
        class: 'status-future',
        label: 'Em Breve'
    },
    'Atualizado': {
        icon: '✅',
        class: 'status-updated',
        label: 'Atualizado'
    },
    'Atrasado': {
        icon: '⏰',
        class: 'status-late',
        label: 'Atrasado'
    }
};

class CalendarAPI {
    constructor() {
        this.cache = null;
        this.cacheExpiry = 10 * 60 * 1000; // 10 minutes
        this.cacheTimestamp = null;
    }

    // Fetch calendar data from API
    async fetchCalendar() {
        // Check cache
        if (this.cache && this.cacheTimestamp && (Date.now() - this.cacheTimestamp < this.cacheExpiry)) {
            return this.cache;
        }

        try {
            const response = await fetch(CALENDAR_API_URL);
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            const data = await response.json();

            // Save to cache
            this.cache = data;
            this.cacheTimestamp = Date.now();

            return data;
        } catch (error) {
            console.error('Erro ao carregar calendário:', error);
            throw error;
        }
    }

    // Get releases grouped by status
    async getReleasesByStatus() {
        const data = await this.fetchCalendar();

        const grouped = {
            'Hoje': [],
            'Futuro': [],
            'Atualizado': [],
            'Atrasado': []
        };

        if (Array.isArray(data)) {
            data.forEach(item => {
                const status = item.status || 'Atualizado';
                if (grouped[status]) {
                    grouped[status].push(item);
                }
            });
        }

        return grouped;
    }

    // Format date for display
    formatDate(dateString) {
        if (!dateString) return 'Data desconhecida';
        const date = new Date(dateString);
        return date.toLocaleDateString('pt-BR', {
            day: '2-digit',
            month: 'short',
            year: 'numeric'
        });
    }

    // Get poster URL with fallback
    getPosterUrl(posterPath) {
        if (!posterPath) {
            return 'https://via.placeholder.com/200x300/1a1a25/6b6b7b?text=Sem+Poster';
        }
        // If it's already a full URL, return it
        if (posterPath.startsWith('http')) {
            return posterPath;
        }
        // Otherwise, assume it's a TMDB path
        return `https://image.tmdb.org/t/p/w342${posterPath}`;
    }
}

// Create global instance
const calendarAPI = new CalendarAPI();
window.calendarAPI = calendarAPI;

console.log('📅 Calendar API carregada com sucesso!');
