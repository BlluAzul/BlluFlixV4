/* ============================================
   🎬 BLLUFLIX - Main Application
   Lógica principal do site
   ============================================ */

// Estado global da aplicação
const AppState = {
  currentPage: 'home',
  isLoading: false,
  searchQuery: '',
  filters: {
    genre: '',
    year: '',
    type: 'all' // all, dubbed, subtitled
  },
  heroSlideIndex: 0,
  heroMovies: [],
  // Paginação de gêneros
  genreCurrentPage: 1,
  genreItems: [],
  genreId: null,
  genreItemsPerPage: 15,
  genreApiPage: 3, // Última página carregada da API
  genreIsLoading: false
};

// Mapeamento de gêneros de FILMES para SÉRIES (TMDB usa IDs diferentes)
// Alguns gêneros de filme não existem em TV, então mapeamos para equivalentes
const MOVIE_TO_TV_GENRE_MAP = {
  28: 10759,    // Ação -> Ação & Aventura
  12: 10759,    // Aventura -> Ação & Aventura
  16: 16,       // Animação -> Animação (mesmo ID)
  35: 35,       // Comédia -> Comédia (mesmo ID)
  80: 80,       // Crime -> Crime (mesmo ID)
  99: 99,       // Documentário -> Documentário (mesmo ID)
  18: 18,       // Drama -> Drama (mesmo ID)
  10751: 10751, // Família -> Família (mesmo ID)
  14: 10765,    // Fantasia -> Sci-Fi & Fantasia
  36: 18,       // História -> Drama (mais próximo)
  27: 9648,     // Terror -> Mistério (mais próximo em TV)
  10402: 18,    // Música -> Drama
  9648: 9648,   // Mistério -> Mistério (mesmo ID)
  10749: 18,    // Romance -> Drama
  878: 10765,   // Ficção Científica -> Sci-Fi & Fantasia
  10770: 18,    // Filme de TV -> Drama
  53: 9648,     // Thriller -> Mistério
  10752: 10768, // Guerra -> Guerra & Política
  37: 37,        // Faroeste -> Faroeste (mesmo ID)
  10101: 10759   // Lutas -> Ação & Aventura (mais próximo)
};

// ============================================
// WATCH TRACKER (Continuar Assistindo)
// ============================================

const WatchTracker = {
  STORAGE_KEY: 'blluflix_watch_history',
  MAX_ITEMS: Infinity,

  // Salva ou atualiza um item no histórico
  save(data) {
    const history = this.getAll();
    const key = `${data.type}_${data.id}`;

    // Procura se já existe
    const existingIndex = history.findIndex(item => `${item.type}_${item.id}` === key);

    const entry = {
      id: data.id,
      type: data.type, // 'movie' ou 'tv'
      title: data.title,
      poster_path: data.poster_path,
      backdrop_path: data.backdrop_path,
      vote_average: data.vote_average,
      release_date: data.release_date || data.first_air_date || '',
      progress: data.progress || 15,
      lastWatched: Date.now(),
      season: data.season || null,
      episode: data.episode || null
    };

    if (existingIndex !== -1) {
      // Atualiza existente - incrementa progresso
      const existing = history[existingIndex];
      entry.progress = Math.min(95, (existing.progress || 15) + Math.floor(Math.random() * 15) + 5);
      // Atualiza season/episode se fornecido
      if (data.season) entry.season = data.season;
      if (data.episode) entry.episode = data.episode;
      history.splice(existingIndex, 1);
    }

    // Adiciona no início (mais recente)
    history.unshift(entry);

    // Sem limite de itens

    try {
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(history));
    } catch (e) {
      console.error('Erro ao salvar histórico:', e);
    }
  },

  // Retorna todos os itens, ordenados por lastWatched
  getAll() {
    try {
      const data = localStorage.getItem(this.STORAGE_KEY);
      return data ? JSON.parse(data) : [];
    } catch (e) {
      return [];
    }
  },

  // Remove um item específico
  remove(id, type) {
    const history = this.getAll().filter(item => !(item.id == id && item.type === type));
    localStorage.setItem(this.STORAGE_KEY, JSON.stringify(history));
  },

  // Limpa todo o histórico
  clear() {
    localStorage.removeItem(this.STORAGE_KEY);
  }
};

// Exporta globalmente
window.WatchTracker = WatchTracker;

// ============================================
// SAVE TRACKER (Salvos)
// ============================================

const SaveTracker = {
  STORAGE_KEY: 'blluflix_saved_items',
  MAX_ITEMS: Infinity,

  save(data) {
    const items = this.getAll();
    const key = `${data.type}_${data.id}`;
    if (items.some(item => `${item.type}_${item.id}` === key)) return; // já salvo

    items.unshift({
      id: data.id,
      type: data.type,
      title: data.title,
      poster_path: data.poster_path,
      backdrop_path: data.backdrop_path,
      vote_average: data.vote_average,
      release_date: data.release_date || data.first_air_date || '',
      savedAt: Date.now()
    });

    // Sem limite de itens
    try { localStorage.setItem(this.STORAGE_KEY, JSON.stringify(items)); } catch (e) { }
  },

  getAll() {
    try {
      const d = localStorage.getItem(this.STORAGE_KEY);
      return d ? JSON.parse(d) : [];
    } catch (e) { return []; }
  },

  isSaved(id, type) {
    return this.getAll().some(item => item.id == id && item.type === type);
  },

  toggle(data) {
    if (this.isSaved(data.id, data.type)) {
      this.remove(data.id, data.type);
      return false;
    } else {
      this.save(data);
      return true;
    }
  },

  remove(id, type) {
    const items = this.getAll().filter(i => !(i.id == id && i.type === type));
    localStorage.setItem(this.STORAGE_KEY, JSON.stringify(items));
  },

  clear() { localStorage.removeItem(this.STORAGE_KEY); }
};

window.SaveTracker = SaveTracker;

// Função global para toggle de salvo nos cards
function toggleSaveItem(event, id, type, title, poster_path, vote_average, release_date) {
  event.stopPropagation();
  const saved = SaveTracker.toggle({ id, type, title, poster_path, vote_average, release_date });

  // Atualiza visual do botão
  const btn = event.currentTarget;
  btn.classList.toggle('saved', saved);
  btn.title = saved ? 'Remover dos Salvos' : 'Salvar';
}

window.toggleSaveItem = toggleSaveItem;

// Configurações do Hero (Slide Principal)
const HERO_SETTINGS = {
  // ID do filme para fixar na primeira posição (ex: 12345)
  // Deixe null para não fixar nenhum
  pinnedMovieId: null,

  // DATA DE VALIDADE DO PIN (Formato: 'AAAA-MM-DD')
  // O filme fixado sairá AUTOMATICAMENTE após essa data
  // Ex: '2026-02-01' -> Sai no dia 1 de Fevereiro
  pinnedUntil: '2026-02-01',

  // Fonte dos filmes: 'trending' (Em Alta) ou 'now_playing' (Lançamentos)
  source: 'trending',

  // FILTROS DE QUALIDADE ("Catálogo Foda")
  // Remove filmes desconhecidos ou ruins do slide
  filters: {
    minPopularity: 50,  // Mínimo de pontos de popularidade (hype)
    minVotes: 100,      // Mínimo de votos (evita filmes sem validação)
    minRating: 6.0      // Nota mínima (evita filmes muito ruins)
  }
};

// ============================================
// INICIALIZAÇÃO
// ============================================

document.addEventListener('DOMContentLoaded', async () => {
  console.log('🎬 BlluFlix iniciando...');

  // Inicializa componentes

  // Disable browser native scroll restoration to handle it manually
  if ('scrollRestoration' in history) {
    history.scrollRestoration = 'manual';
  }

  // SMART SCROLL RESTORATION
  const navEntry = performance.getEntriesByType("navigation")[0];
  const navType = navEntry ? navEntry.type : 'navigate';

  if (navType === 'reload') {
    // If F5/Reload: Force Top and CLEAR search
    window.scrollTo(0, 0);

    // Limpa a busca e redireciona para URL limpa
    sessionStorage.removeItem('blluflix_search_active');
    sessionStorage.removeItem('blluflix_search_query');

    // Se a URL tiver parâmetro de busca, redireciona para Home limpa
    const currentUrl = new URL(window.location.href);
    if (currentUrl.searchParams.has('search')) {
      window.location.replace('index.html');
      return; // Para execução
    }

    // reset do conteúdo ("Ver Mais") mas mantém os filtros
    try {
      const saved = sessionStorage.getItem('blluflix_filter_state');
      if (saved) {
        const state = JSON.parse(saved);
        state.items = []; // Limpa lista carregada
        state.currentPage = 1; // Reseta página visual
        state.apiPage = 1; // Reseta página da API
        // Salva de volta apenas com os filtros e sem itens
        sessionStorage.setItem('blluflix_filter_state', JSON.stringify(state));
      }
    } catch (e) {
      sessionStorage.removeItem('blluflix_filter_state');
    }

    sessionStorage.removeItem('blluflix_genre_state');
  } else if (navType === 'back_forward') {
    // If Back/Forward: Restore saved position
    const savedScroll = sessionStorage.getItem('app_scroll_pos');
    if (savedScroll) {
      // Small delay to allow content to render
      setTimeout(() => {
        window.scrollTo(0, parseInt(savedScroll));
      }, 100);
    }
  } else {
    // Standard navigation: Force Top
    window.scrollTo(0, 0);
  }

  // Save scroll position before leaving/unloading
  window.addEventListener('beforeunload', () => {
    sessionStorage.setItem('app_scroll_pos', window.scrollY);
  });

  initSidebar();
  initSearch();
  initMobileMenu();

  // Restaura estado da busca se estava ativa antes de navegar
  if (navType === 'back_forward') {
    const searchWasActive = sessionStorage.getItem('blluflix_search_active');
    const savedSearchQuery = sessionStorage.getItem('blluflix_search_query');

    if (searchWasActive === 'true') {
      const searchBox = document.querySelector('.search-box');
      const searchInput = document.getElementById('search-input');
      if (searchBox) {
        searchBox.classList.add('active');
        if (searchInput) {
          if (savedSearchQuery) {
            searchInput.value = savedSearchQuery;
          }
          setTimeout(() => searchInput.focus(), 100);
        }
      }
    }
  }

  // Check for URL parameters to restore state
  const urlParams = new URLSearchParams(window.location.search);
  const pageParam = urlParams.get('page');
  const genreParam = urlParams.get('genre');
  const searchParam = urlParams.get('search');

  if (searchParam && navType !== 'reload') {
    // Restore search results page (não restaura em F5)
    const searchInput = document.getElementById('search-input');
    if (searchInput) {
      searchInput.value = searchParam;
    }
    await openSearchResultsPage(searchParam);
  } else if (genreParam) {
    // Restore genre view
    await filterByGenre(genreParam, false); // false = don't push state again
  } else if (pageParam) {
    // Restore specific page (movies, series, etc)
    await navigateTo(pageParam, false);
  } else {
    // Default Home
    await loadHomePage();
  }

  // Inicia slideshow do hero
  startHeroSlideshow();

  // Handle Browser Back/Forward buttons
  window.addEventListener('popstate', async (event) => {
    const urlParams = new URLSearchParams(window.location.search);
    const page = urlParams.get('page');
    const genre = urlParams.get('genre');
    const search = urlParams.get('search');

    // Restaura a query na barra de busca
    const searchInput = document.getElementById('search-input');
    const savedQuery = sessionStorage.getItem('blluflix_search_query');
    if (searchInput && savedQuery) {
      searchInput.value = savedQuery;
    }

    if (search) {
      await openSearchResultsPage(search);
    } else if (genre) {
      await filterByGenre(genre, false);
    } else if (page) {
      await navigateTo(page, false);
    } else {
      await loadHomePage();
    }
  });

  console.log('✅ BlluFlix carregado!');
});

// ... (Rest of sidebar/search code remains unchanged, skipping to loadHomePage) ...

// ============================================
// PÁGINAS
// ============================================

async function loadHomePage() {
  const content = document.querySelector('.page-content');
  if (!content) return;

  try {
    // Carrega dados em paralelo
    const [trending, nowPlaying, popular, topRated, tvPopular] = await Promise.all([
      tmdbAPI.getTrendingMovies(),
      tmdbAPI.getNowPlaying(),
      tmdbAPI.getPopularMovies(),
      tmdbAPI.getTopRatedMovies(),
      tmdbAPI.getPopularTVShows()
    ]);

    // Lógica do Hero (Slide)
    let heroList = [];

    // 1. Obtém lista base
    const sourceList = HERO_SETTINGS.source === 'now_playing' ? nowPlaying.results : trending.results;

    // 2. APLICA FILTROS DE "CATÁLOGO FODA"
    // Mantém apenas filmes com base nas configurações de qualidade
    const filteredSource = sourceList.filter(movie => {
      // Se for o pinado, sempre aceita (será tratado depois)
      if (movie.id === HERO_SETTINGS.pinnedMovieId) return true;

      const isPopular = movie.popularity >= HERO_SETTINGS.filters.minPopularity;
      const hasVotes = movie.vote_count >= HERO_SETTINGS.filters.minVotes;
      const isGood = movie.vote_average >= HERO_SETTINGS.filters.minRating;

      // Para filmes muito novos (lançamentos), a nota pode não ser confiável, então focamos na popularidade
      if (HERO_SETTINGS.source === 'now_playing') {
        return isPopular;
      }

      return isPopular && isGood;
    });

    // 3. Pega os top 5 do que sobrou
    heroList = filteredSource.slice(0, 5);

    // Fallback: Se o filtro for muito rigoroso e sobrar pouco, completa com os mais populares sem filtro
    if (heroList.length < 3) {
      const fillers = popular.results
        .filter(m => !heroList.some(h => h.id === m.id))
        .slice(0, 5 - heroList.length);
      heroList = [...heroList, ...fillers];
    }

    // 4. LÓGICA DE FILME FIXADO COM VALIDADE (MÊS)
    if (HERO_SETTINGS.pinnedMovieId) {
      try {
        // Verifica validade (Se passou da data, ignora o pin)
        let isExpired = false;
        if (HERO_SETTINGS.pinnedUntil) {
          const expiryDate = new Date(HERO_SETTINGS.pinnedUntil);
          const today = new Date();
          // zera as horas para comparar apenas datas
          today.setHours(0, 0, 0, 0);
          expiryDate.setHours(0, 0, 0, 0);

          if (today >= expiryDate) {
            isExpired = true;
            console.log('📅 Pin expirado! Atualizando slide...');
          }
        }

        if (!isExpired) {
          const isAlreadyInList = heroList.some(m => m.id === HERO_SETTINGS.pinnedMovieId);

          if (!isAlreadyInList) {
            const pinnedMovie = await tmdbAPI.getMovieDetails(HERO_SETTINGS.pinnedMovieId);
            heroList.unshift(pinnedMovie);
            heroList = heroList.slice(0, 5);
          } else {
            heroList = heroList.filter(m => m.id !== HERO_SETTINGS.pinnedMovieId);
            const pinnedMovie = sourceList.find(m => m.id === HERO_SETTINGS.pinnedMovieId);
            heroList.unshift(pinnedMovie);
          }
        }
      } catch (err) {
        console.error('Erro ao carregar filme fixado:', err);
      }
    }

    // Salva para o slideshow
    AppState.heroMovies = heroList;

    // Seção Continuar Assistindo
    const watchingItems = WatchTracker.getAll();
    const watchingSection = watchingItems.length > 0 ? createWatchingCarouselHTML(watchingItems.slice(0, 10)) : '';

    content.innerHTML = `
      ${createHeroHTML(AppState.heroMovies)}
      ${createCinemaDiscoveryHTML()}
      
      ${watchingSection}
      
      ${createCarouselHTML('🍿 Em Cartaz', nowPlaying.results.slice(0, 15), 'movie', "navigateTo('movies')")}
      
      ${createCarouselHTML('🔥 Populares', popular.results.slice(0, 15), 'movie')}
      
      ${createCarouselHTML('⭐ Mais Bem Avaliados', topRated.results.slice(0, 15), 'movie')}
      
      ${createCarouselHTML('📺 Séries em Destaque', tvPopular.results.slice(0, 10), 'tv', "navigateTo('series')")}
    `;

  } catch (error) {
    console.error('Erro ao carregar home:', error);
    content.innerHTML = createErrorHTML();
  }
}

// ============================================
// SIDEBAR
// ============================================

function initSidebar() {
  const sidebarHTML = `
    <a href="#" class="logo" onclick="navigateTo('home'); return false;">
      <div class="logo-icon">
        <svg viewBox="0 0 24 24" fill="currentColor">
          <path d="M18 4l2 4h-3l-2-4h-2l2 4h-3l-2-4H8l2 4H7L5 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V4h-4z"/>
        </svg>
      </div>
      <span class="logo-text">BlluFlix</span>
    </a>
    
    <div class="sidebar-section">
      <h3 class="sidebar-title">Menu</h3>
      <nav class="sidebar-nav">
        <a href="#" class="nav-item active" data-page="home" onclick="navigateTo('home'); return false;">
          <svg viewBox="0 0 24 24" fill="currentColor"><path d="M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z"/></svg>
          <span>Início</span>
        </a>
        <a href="#" class="nav-item" data-page="movies" onclick="navigateTo('movies'); return false;">
          <svg viewBox="0 0 24 24" fill="currentColor"><path d="M18 4l2 4h-3l-2-4h-2l2 4h-3l-2-4H8l2 4H7L5 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V4h-4z"/></svg>
          <span>Filmes</span>
        </a>
        <a href="#" class="nav-item" data-page="series" onclick="navigateTo('series'); return false;">
          <svg viewBox="0 0 24 24" fill="currentColor"><path d="M21 3H3c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h5v2h8v-2h5c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 14H3V5h18v12z"/></svg>
          <span>Séries</span>
        </a>
        <a href="#" class="nav-item" data-page="trending" onclick="navigateTo('trending'); return false;">
          <svg viewBox="0 0 24 24" fill="currentColor"><path d="M16 6l2.29 2.29-4.88 4.88-4-4L2 16.59 3.41 18l6-6 4 4 6.3-6.29L22 12V6z"/></svg>
          <span>Em Alta</span>
        </a>
        <a href="help.html" class="nav-item" style="color: var(--accent-gold);">
          <svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4zm0 10.99h7c-.53 4.12-3.28 7.79-7 8.94V12H5V6.3l7-3.11v8.8z"/></svg>
          <span>O PLAYER NÃO CARREGA? RESOLVA AGORA</span>
        </a>
        <a href="#" class="nav-item" data-page="watching" onclick="navigateTo('watching'); return false;">
          <svg viewBox="0 0 24 24" fill="currentColor"><path d="M4 6H2v14c0 1.1.9 2 2 2h14v-2H4V6zm16-4H8c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm-8 12.5v-9l6 4.5-6 4.5z"/></svg>
          <span>Assistindo</span>
        </a>
        <a href="#" class="nav-item" data-page="saved" onclick="navigateTo('saved'); return false;">
          <svg viewBox="0 0 24 24" fill="currentColor"><path d="M17 3H7c-1.1 0-2 .9-2 2v16l7-3 7 3V5c0-1.1-.9-2-2-2z"/></svg>
          <span>Salvos</span>
        </a>
        <a href="calendar.html" class="nav-item">
          <svg viewBox="0 0 24 24" fill="currentColor"><path d="M19 4h-1V2h-2v2H8V2H6v2H5c-1.11 0-1.99.9-1.99 2L3 20c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 16H5V9h14v11zM9 11H7v2h2v-2zm4 0h-2v2h2v-2zm4 0h-2v2h2v-2z"/></svg>
          <span>Calendário</span>
        </a>
        <a href="information.html" class="nav-item">
          <svg viewBox="0 0 24 24" fill="currentColor"><path d="M11 7h2v2h-2zm0 4h2v6h-2zm1-9C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8z"/></svg>
          <span>Informação</span>
        </a>
      </nav>
    </div>
    
    <div class="sidebar-section">
      <h3 class="sidebar-title">Gêneros</h3>
      <nav class="sidebar-nav" id="genres-nav">
        <!-- Gêneros serão carregados dinamicamente -->
      </nav>
    </div>
  `;

  const sidebar = document.querySelector('.sidebar');
  if (sidebar) {
    sidebar.innerHTML = sidebarHTML;
    loadGenresNav();
  }
}

async function loadGenresNav() {
  const genres = tmdbAPI.getMovieGenres();
  const mainGenres = genres; // Mostra todos os gêneros

  const genresNav = document.getElementById('genres-nav');
  if (!genresNav) return;

  const icons = {
    'Ação': '💥',
    'Aventura': '🗺️',
    'Animação': '🎨',
    'Comédia': '😂',
    'Crime': '🔫',
    'Documentário': '📹',
    'Drama': '🎭',
    'Família': '👨‍👩‍👧‍👦',
    'Fantasia': '🧙',
    'Terror': '👻',
    'Lutas': '🥊'
  };

  genresNav.innerHTML = mainGenres.map(genre => `
    <a href="#" class="nav-item" data-genre-id="${genre.id}" onclick="filterByGenre(${genre.id}); return false;">
      <span>${icons[genre.name] || '🎬'}</span>
      <span>${genre.name}</span>
    </a>
  `).join('');

  // Adiciona item especial "Dorama" no final dos gêneros
  genresNav.innerHTML += `
    <a href="#" class="nav-item" data-page="dorama" onclick="navigateToDorama(); return false;">
      <span>🎭</span>
      <span>Dorama</span>
    </a>
  `;
}

// ============================================
// BUSCA
// ============================================

function initSearch() {
  const searchInput = document.getElementById('search-input');
  const searchResults = document.getElementById('search-results');

  if (!searchInput) return;

  let debounceTimer;

  searchInput.addEventListener('input', (e) => {
    const query = e.target.value.trim();

    clearTimeout(debounceTimer);

    if (query.length < 2) {
      searchResults?.classList.remove('active');
      return;
    }

    debounceTimer = setTimeout(() => performSearch(query), 300);
  });

  // Listener para Enter - abre página de resultados
  searchInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      const query = searchInput.value.trim();
      if (query.length >= 2) {
        openSearchResultsPage(query);
      }
    }
  });

  searchInput.addEventListener('focus', () => {
    if (searchInput.value.trim().length >= 2) {
      searchResults?.classList.add('active');
    }
  });

  // Fecha resultados ao clicar/tocar fora
  // Usamos touchend e mousedown em vez de click completo, pois no celular o evento de fechar
  // o teclado dispara um blur de input, e os navegadores as vezes simulam cliques vazios quando o teclado desce.
  const closeSearchResults = (e) => {
    if (!searchResults?.classList.contains('active')) return;
    
    // Se interagiu com a barra de busca ou resultados, não fecha
    if (e.target.closest('.search-box') || e.target.closest('#search-results')) {
      return;
    }
    
    // Usuário tocou fora
    searchResults.classList.remove('active');
  };

  document.addEventListener('mousedown', closeSearchResults);
  document.addEventListener('touchstart', closeSearchResults, { passive: true });
}

async function performSearch(query) {
  const searchResults = document.getElementById('search-results');
  if (!searchResults) return;

  try {
    const data = await tmdbAPI.searchMulti(query);
    const results = data.results.filter(r => r.media_type !== 'person').slice(0, 8);

    if (results.length === 0) {
      searchResults.innerHTML = '<div class="search-no-results">Nenhum resultado encontrado</div>';
    } else {
      searchResults.innerHTML = results.map(item => {
        const isMovie = item.media_type === 'movie';
        const title = isMovie ? item.title : item.name;
        const year = tmdbAPI.getYear(isMovie ? item.release_date : item.first_air_date);
        const type = isMovie ? 'Filme' : 'Série';
        const poster = tmdbAPI.getImageUrl(item.poster_path, 'poster', 'small');

        return `
          <div class="search-result-item" onclick="openDetail('${item.media_type}', ${item.id})">
            <img src="${poster}" alt="${title}" class="search-result-poster" loading="lazy">
            <div class="search-result-info">
              <h4>${title}</h4>
              <span>${type} • ${year}</span>
            </div>
          </div>
        `;
      }).join('');

      // Adiciona opção de "Ver todos os resultados"
      searchResults.innerHTML += `
        <div class="search-view-all" onclick="openSearchResultsPage('${query.replace(/'/g, "\\'")}')">
          <svg viewBox="0 0 24 24" fill="currentColor" width="16" height="16">
            <path d="M15.5 14h-.79l-.28-.27C15.41 12.59 16 11.11 16 9.5 16 5.91 13.09 3 9.5 3S3 5.91 3 9.5 5.91 16 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z"/>
          </svg>
          <span>Ver todos os resultados para "${query}"</span>
        </div>
      `;
    }

    searchResults.classList.add('active');
  } catch (error) {
    console.error('Erro na busca:', error);
  }
}

// Abre página dedicada de resultados de busca
async function openSearchResultsPage(query) {
  const searchInput = document.getElementById('search-input');
  const searchResults = document.getElementById('search-results');

  // Salva a query no sessionStorage para manter quando voltar
  sessionStorage.setItem('blluflix_search_query', query);
  sessionStorage.setItem('blluflix_search_active', 'true');

  // Fecha dropdown e mantém o texto da busca
  searchResults?.classList.remove('active');
  if (searchInput) {
    searchInput.value = query;
  }

  // Remove destaque de todos os itens do menu (busca não é uma página do menu)
  document.querySelectorAll('.nav-item').forEach(item => {
    item.classList.remove('active');
  });

  // Atualiza título do header para "Busca"
  const pageTitle = document.getElementById('page-title');
  if (pageTitle) {
    pageTitle.textContent = 'Busca';
  }

  // Fecha sidebar mobile
  document.querySelector('.sidebar')?.classList.remove('open');

  // Update URL
  history.pushState({ search: query }, '', `?search=${encodeURIComponent(query)}`);

  // Scroll para o topo
  window.scrollTo(0, 0);

  // Mostra loading
  const content = document.querySelector('.page-content');
  if (!content) return;
  content.innerHTML = createLoadingHTML();

  try {
    // Busca mais resultados (até 40 itens)
    const [page1, page2] = await Promise.all([
      tmdbAPI.searchMulti(query, 1),
      tmdbAPI.searchMulti(query, 2)
    ]);

    // Combina resultados e remove pessoas
    let allResults = [...page1.results, ...page2.results]
      .filter(r => r.media_type !== 'person');

    // Remove duplicatas
    const uniqueIds = new Set();
    allResults = allResults.filter(item => {
      const key = `${item.media_type}-${item.id}`;
      if (uniqueIds.has(key)) return false;
      uniqueIds.add(key);
      return true;
    });

    // Renderiza página de resultados
    content.innerHTML = createSearchResultsHTML(query, allResults);

  } catch (error) {
    console.error('Erro ao carregar resultados:', error);
    content.innerHTML = createErrorHTML();
  }
}

// Cria HTML da página de resultados de busca
function createSearchResultsHTML(query, results) {
  const moviesCount = results.filter(r => r.media_type === 'movie').length;
  const seriesCount = results.filter(r => r.media_type === 'tv').length;

  return `
    <section class="section search-results-page">
      <div class="search-results-header">
        <span class="search-label">Resultado da busca:</span>
        <h1 class="search-query-title">${query}</h1>
        <p class="search-stats">${results.length} resultados encontrados (${moviesCount} filmes, ${seriesCount} séries)</p>
      </div>
      
      ${results.length === 0 ? `
        <div class="search-no-results-page">
          <svg viewBox="0 0 24 24" fill="currentColor" width="64" height="64">
            <path d="M15.5 14h-.79l-.28-.27C15.41 12.59 16 11.11 16 9.5 16 5.91 13.09 3 9.5 3S3 5.91 3 9.5 5.91 16 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z"/>
          </svg>
          <h2>Nenhum resultado encontrado</h2>
          <p>Tente buscar por outro termo</p>
        </div>
      ` : `
        <div class="movies-grid">
          ${results.map(item => {
    const isMovie = item.media_type === 'movie';
    const title = isMovie ? item.title : item.name;
    const year = tmdbAPI.getYear(isMovie ? item.release_date : item.first_air_date);
    const poster = tmdbAPI.getImageUrl(item.poster_path, 'poster', 'medium');
    const rating = tmdbAPI.formatRating(item.vote_average);
    const typeLabel = isMovie ? 'HD' : 'SÉRIE';

    return `
              <div class="movie-card" onclick="openDetail('${item.media_type}', ${item.id})">
                <div class="movie-card-inner">
                  <img src="${poster}" alt="${title}" class="movie-poster" loading="lazy">
                  <span class="movie-quality">${typeLabel}</span>
                  <span class="movie-rating">⭐ ${rating}</span>
                  <div class="movie-card-overlay">
                    <div class="movie-play-btn">
                      <svg viewBox="0 0 24 24" fill="currentColor">
                        <path d="M8 5v14l11-7z"/>
                      </svg>
                    </div>
                  </div>
                </div>
                <div class="movie-info">
                  <h3 class="movie-title">${title}</h3>
                  <div class="movie-meta">
                    <span>${year}</span>
                  </div>
                </div>
              </div>
            `;
  }).join('')}
        </div>
      `}
    </section>
  `;
}

// Expõe função globalmente
window.openSearchResultsPage = openSearchResultsPage;

// ============================================
// MENU MOBILE
// ============================================

function initMobileMenu() {
  const menuToggle = document.querySelector('.menu-toggle');
  const sidebar = document.querySelector('.sidebar');
  const overlay = document.querySelector('.overlay');
  const searchToggle = document.getElementById('search-toggle');
  const searchBox = document.querySelector('.search-box');
  const searchInput = document.getElementById('search-input');

  if (menuToggle && sidebar) {
    menuToggle.addEventListener('click', () => {
      sidebar.classList.toggle('open');
    });
  }

  if (overlay) {
    overlay.addEventListener('click', () => {
      sidebar?.classList.remove('open');
      searchBox?.classList.remove('active');
    });
  }

  // Mobile search toggle
  if (searchToggle && searchBox) {
    searchToggle.addEventListener('click', () => {
      searchBox.classList.toggle('active');
      if (searchBox.classList.contains('active') && searchInput) {
        searchInput.focus();
      }
    });
  }
}

// ============================================
// NAVEGAÇÃO
// ============================================

async function navigateTo(page, pushState = true) {
  window.scrollTo(0, 0);

  // LIMPA a busca ao navegar para qualquer página do menu
  const searchInput = document.getElementById('search-input');
  if (searchInput) {
    searchInput.value = '';
  }
  sessionStorage.removeItem('blluflix_search_active');
  sessionStorage.removeItem('blluflix_search_query');

  // Atualiza nav items
  document.querySelectorAll('.nav-item').forEach(item => {
    item.classList.toggle('active', item.dataset.page === page);
  });

  // Update URL
  if (pushState) {
    const url = page === 'home' ? 'index.html' : `?page=${page}`;
    history.pushState({ page: page }, '', url);
    // [NEW] Se for navegação manual (clique no menu), limpa o estado salvo
    // para garantir que o usuário veja a página limpa ao clicar no menu.
    sessionStorage.removeItem('blluflix_filter_state');
  }

  // Fecha sidebar mobile
  document.querySelector('.sidebar')?.classList.remove('open');

  AppState.currentPage = page;

  // Atualiza título do header
  const pageTitle = document.getElementById('page-title');
  if (pageTitle) {
    const titles = {
      'home': 'Início',
      'movies': 'Filmes',
      'series': 'Séries',
      'trending': 'Em Alta',
      'watching': 'Assistindo',
      'saved': 'Salvos'
    };
    pageTitle.textContent = titles[page] || 'Início';
  }

  const content = document.querySelector('.page-content');
  if (!content) return;

  // Loading
  content.innerHTML = createLoadingHTML();

  switch (page) {
    case 'home':
      await loadHomePage();
      break;
    case 'movies':
      await loadMoviesPage();
      break;
    case 'series':
      await loadSeriesPage();
      break;
    case 'trending':
      await loadTrendingPage();
      break;
    case 'watching':
      await loadWatchingPage();
      break;
    case 'saved':
      await loadSavedPage();
      break;
    case 'dorama':
      await navigateToDorama();
      break;
    default:
      await loadHomePage();
  }
}

async function filterByGenre(genreId, pushState = true) {
  const content = document.querySelector('.page-content');
  if (!content) return;

  // Fecha sidebar mobile
  document.querySelector('.sidebar')?.classList.remove('open');

  // Atualiza highlight do menu
  document.querySelectorAll('.nav-item').forEach(item => item.classList.remove('active'));
  const activeGenreLink = document.querySelector(`.nav-item[data-genre-id="${genreId}"]`);
  if (activeGenreLink) {
    activeGenreLink.classList.add('active');
  }

  // Primeiro tenta restaurar estado de filtros (se o usuário aplicou filtros e voltou)
  if (restoreFilterState(genreId)) {
    const genreName = tmdbAPI.getGenreName(genreId);
    AppState.genreId = genreId;
    renderRestoredFilterPage(genreName);

    // Update URL sem adicionar ao histórico
    if (pushState) {
      history.replaceState({ genre: genreId }, '', `?genre=${genreId}`);
    }
    return;
  }

  // Tenta restaurar estado do sessionStorage (preserva progresso ao voltar de movie.html)
  if (restoreGenreState(genreId)) {
    // Restaura a página com os dados salvos
    const genreName = tmdbAPI.getGenreName(genreId);
    renderGenrePage(genreName);

    // Update URL sem adicionar ao histórico
    if (pushState) {
      history.replaceState({ genre: genreId }, '', `?genre=${genreId}`);
    }
    return;
  }

  // Verifica se já temos dados deste gênero carregados na memória
  if (AppState.genreId === genreId && AppState.genreItems.length > 0) {
    const genreName = tmdbAPI.getGenreName(genreId);
    renderGenrePage(genreName);
    return;
  }

  // Reset pagination state para novo gênero
  AppState.genreCurrentPage = 1;
  AppState.genreId = genreId;
  AppState.genreItems = [];
  AppState.genreApiPage = 3;

  // Update URL
  if (pushState) {
    history.pushState({ genre: genreId }, '', `?genre=${genreId}`);
  }

  // Setup UI com filtros pré-selecionados e invoca applyFilters para buscar conteúdo MISTO
  // Isso garante que "Todos" (Filmes + Séries + Animes) funcione desde o início
  // Tenta recuperar filtros salvos (mesmo que items tenham sido limpos no reload)
  let initialFilters = {
    initialGenre: genreId,
    initialSort: '',
    initialYear: '',
    initialType: 'all'
  };

  try {
    const saved = sessionStorage.getItem('blluflix_filter_state');
    if (saved) {
      const state = JSON.parse(saved);
      // Só usa se for o mesmo gênero (ou se o gênero for compatível, mas simplificamos para exato)
      // Nota: state.genreId pode ser string/number, compara solto
      if (state.genreId == genreId) {
        initialFilters.initialSort = state.sort;
        initialFilters.initialYear = state.year;
        initialFilters.initialType = state.type;
      }
    }
  } catch (e) { }

  // Setup UI com filtros pré-selecionados e invoca applyFilters para buscar conteúdo MISTO
  // Isso garante que "Todos" (Filmes + Séries + Animes) funcione desde o início
  content.innerHTML = `
    ${createFiltersHTML(initialFilters)}
    <section class="section">
       <div class="section-header">
        <h2 class="section-title">🔄 Carregando...</h2>
      </div>
      <div style="display: flex; justify-content: center; padding: 50px;">
        <div class="spinner"></div>
      </div>
    </section>
  `;

  // Pequeno delay para garantir que os elementos estejam no DOM
  setTimeout(() => {
    applyFilters();
  }, 50);
}

// Renderiza a página de gênero com paginação
function renderGenrePage(genreName) {
  const content = document.querySelector('.page-content');
  if (!content) return;

  const startIndex = 0;
  const endIndex = AppState.genreCurrentPage * AppState.genreItemsPerPage;
  const visibleItems = AppState.genreItems.slice(startIndex, endIndex);

  // Mostra contagem sem limite máximo
  const displayCount = visibleItems.length;

  content.innerHTML = `
    ${createFiltersHTML()}
    <section class="section">
      <div class="section-header">
        <h2 class="section-title">${genreName}</h2>
        <span class="items-count">${displayCount} filmes exibidos</span>
      </div>
      <div class="movies-grid" id="genre-grid">
        ${visibleItems.map(movie => createMovieCard(movie)).join('')}
      </div>
      <div class="load-more-container">
        <button class="btn btn-primary load-more-btn" onclick="loadMoreGenreItems()" id="load-more-btn">
          <svg viewBox="0 0 24 24" fill="currentColor" width="20" height="20">
            <path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z"/>
          </svg>
          <span id="load-more-text">Ver Mais</span>
        </button>
      </div>
    </section>
  `;
}

// Carrega mais itens do gênero (infinito)
async function loadMoreGenreItems() {
  if (AppState.genreIsLoading) return;

  const btn = document.getElementById('load-more-btn');
  const btnText = document.getElementById('load-more-text');

  // Verifica se precisa carregar mais da API
  const nextEndIndex = (AppState.genreCurrentPage + 1) * AppState.genreItemsPerPage;

  if (nextEndIndex > AppState.genreItems.length) {
    // Precisa carregar mais da API
    AppState.genreIsLoading = true;

    if (btn) btn.disabled = true;
    if (btnText) btnText.textContent = 'Carregando...';

    try {
      // Carrega próxima página da API
      AppState.genreApiPage++;
      const newData = await tmdbAPI.getMoviesByGenre(AppState.genreId, AppState.genreApiPage);

      // Remove duplicatas
      const existingIds = new Set(AppState.genreItems.map(m => m.id));
      const newItems = newData.results.filter(movie => !existingIds.has(movie.id));

      AppState.genreItems = [...AppState.genreItems, ...newItems];
    } catch (error) {
      console.error('Erro ao carregar mais filmes:', error);
    }

    AppState.genreIsLoading = false;
    if (btn) btn.disabled = false;
    if (btnText) btnText.textContent = 'Ver Mais';
  }

  // Incrementa página de exibição
  AppState.genreCurrentPage++;

  // Salva estado para persistir entre páginas
  saveGenreState();

  const genreName = tmdbAPI.getGenreName(AppState.genreId);
  renderGenrePage(genreName);

  // Scroll suave para os novos itens
  setTimeout(() => {
    const grid = document.getElementById('genre-grid');
    if (grid) {
      const cards = grid.querySelectorAll('.movie-card');
      const targetIndex = (AppState.genreCurrentPage - 1) * AppState.genreItemsPerPage;
      if (cards[targetIndex]) {
        cards[targetIndex].scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }
  }, 100);
}

// Salva estado do gênero no sessionStorage
function saveGenreState() {
  const stateToSave = {
    genreCurrentPage: AppState.genreCurrentPage,
    genreItems: AppState.genreItems,
    genreId: AppState.genreId,
    genreApiPage: AppState.genreApiPage
  };
  sessionStorage.setItem('blluflix_genre_state', JSON.stringify(stateToSave));
}

// Restaura estado do gênero do sessionStorage
function restoreGenreState(genreId) {
  try {
    const saved = sessionStorage.getItem('blluflix_genre_state');
    if (saved) {
      const state = JSON.parse(saved);
      // Só restaura se for o mesmo gênero
      if (state.genreId == genreId) {
        AppState.genreCurrentPage = state.genreCurrentPage;
        AppState.genreItems = state.genreItems;
        AppState.genreId = state.genreId;
        AppState.genreApiPage = state.genreApiPage;
        return true;
      }
    }
  } catch (e) {
    console.error('Erro ao restaurar estado:', e);
  }
  return false;
}

// Expõe função globalmente para onclick
window.loadMoreGenreItems = loadMoreGenreItems;

// ============================================
// DORAMA - Página especial
// ============================================

async function navigateToDorama() {
  const content = document.querySelector('.page-content');
  if (!content) return;

  // Fecha sidebar mobile
  document.querySelector('.sidebar')?.classList.remove('open');

  // Atualiza highlight do menu
  document.querySelectorAll('.nav-item').forEach(item => item.classList.remove('active'));
  const activeDoramaLink = document.querySelector('.nav-item[data-page="dorama"]');
  if (activeDoramaLink) {
    activeDoramaLink.classList.add('active');
  }

  // Atualiza título do header
  const pageTitle = document.getElementById('page-title');
  if (pageTitle) {
    pageTitle.textContent = 'Doramas';
  }

  // Update URL
  history.pushState({ page: 'dorama' }, '', '?page=dorama');

  // Scroll para o topo
  window.scrollTo(0, 0);

  // Setup UI com filtros pré-selecionados como "dorama"
  content.innerHTML = `
    ${createFiltersHTML({ initialType: 'dorama' })}
    <section class="section">
       <div class="section-header">
        <h2 class="section-title">🔄 Carregando...</h2>
      </div>
      <div style="display: flex; justify-content: center; padding: 50px;">
        <div class="spinner"></div>
      </div>
    </section>
  `;

  // Pequeno delay para garantir que os elementos estejam no DOM
  setTimeout(() => {
    applyFilters();
  }, 50);
}

// Expõe função globalmente
window.navigateToDorama = navigateToDorama;

// ============================================
// PÁGINAS
// ============================================

async function loadHomePageLegacy() {
  const content = document.querySelector('.page-content');
  if (!content) return;

  try {
    // Carrega dados em paralelo
    const [trending, nowPlaying, popular, topRated, tvPopular] = await Promise.all([
      tmdbAPI.getTrendingMovies(),
      tmdbAPI.getNowPlaying(),
      tmdbAPI.getPopularMovies(),
      tmdbAPI.getTopRatedMovies(),
      tmdbAPI.getPopularTVShows()
    ]);

    // Salva para o slideshow
    AppState.heroMovies = trending.results.slice(0, 5);

    content.innerHTML = `
      ${createHeroHTML(AppState.heroMovies)}
      ${createCinemaDiscoveryHTML()}
      
      ${createCarouselHTML('🍿 Em Cartaz', nowPlaying.results.slice(0, 20), 'movie', "navigateTo('movies')")}
      
      ${createCarouselHTML('🔥 Populares', popular.results.slice(0, 20), 'movie')}
      
      ${createCarouselHTML('⭐ Mais Bem Avaliados', topRated.results.slice(0, 20), 'movie')}
      
      ${createCarouselHTML('📺 Séries em Destaque', tvPopular.results.slice(0, 20), 'tv', "navigateTo('series')")}
    `;

  } catch (error) {
    console.error('Erro ao carregar home:', error);
    content.innerHTML = createErrorHTML();
  }
}

async function loadMoviesPage() {
  const content = document.querySelector('.page-content');
  if (!content) return;

  // Tenta restaurar filtros anteriores (se houver)
  if (restorePageFilterState('movie')) return;

  try {
    const [popular, topRated, upcoming] = await Promise.all([
      tmdbAPI.getPopularMovies(),
      tmdbAPI.getTopRatedMovies(),
      tmdbAPI.getUpcomingMovies()
    ]);

    content.innerHTML = `
      ${createFiltersHTML({ showType: false })}
      
      <section class="section">
        <div class="section-header">
          <h2 class="section-title">🔥 Filmes Populares</h2>
        </div>
        <div class="movies-grid">
          ${popular.results.map(movie => createMovieCard(movie)).join('')}
        </div>
      </section>

      <section class="section">
        <div class="section-header">
          <h2 class="section-title">⭐ Mais Bem Avaliados</h2>
        </div>
        <div class="movies-grid">
          ${topRated.results.map(movie => createMovieCard(movie)).join('')}
        </div>
      </section>

      <section class="section">
        <div class="section-header">
          <h2 class="section-title">📅 Em Breve</h2>
        </div>
        <div class="movies-grid">
          ${upcoming.results.map(movie => createMovieCard(movie)).join('')}
        </div>
      </section>
    `;

  } catch (error) {
    console.error('Erro ao carregar filmes:', error);
    content.innerHTML = createErrorHTML();
  }
}

async function loadSeriesPage() {
  const content = document.querySelector('.page-content');
  if (!content) return;

  // Tenta restaurar filtros anteriores (se houver)
  if (restorePageFilterState('tv')) return;

  try {
    const [popular, topRated, onTheAir] = await Promise.all([
      tmdbAPI.getPopularTVShows(),
      tmdbAPI.getTopRatedTVShows(),
      tmdbAPI.getOnTheAirTVShows()
    ]);

    content.innerHTML = `
      ${createFiltersHTML({ showType: false })}
      <section class="section">
        <div class="section-header">
          <h2 class="section-title">🔥 Séries Populares</h2>
        </div>
        <div class="movies-grid">
          ${popular.results.map(show => createTVCard(show)).join('')}
        </div>
      </section>

      <section class="section">
        <div class="section-header">
          <h2 class="section-title">⭐ Mais Bem Avaliadas</h2>
        </div>
        <div class="movies-grid">
          ${topRated.results.map(show => createTVCard(show)).join('')}
        </div>
      </section>

      <section class="section">
        <div class="section-header">
          <h2 class="section-title">📺 No Ar Agora</h2>
        </div>
        <div class="movies-grid">
          ${onTheAir.results.map(show => createTVCard(show)).join('')}
        </div>
      </section>
    `;

  } catch (error) {
    console.error('Erro ao carregar séries:', error);
    content.innerHTML = createErrorHTML();
  }
}

async function loadTrendingPage() {
  const content = document.querySelector('.page-content');
  if (!content) return;

  try {
    const [moviesWeek, tvWeek] = await Promise.all([
      tmdbAPI.getTrendingMovies('week'),
      tmdbAPI.getTrendingTVShows('week')
    ]);

    content.innerHTML = `
      <section class="section">
        <div class="section-header">
          <h2 class="section-title">🔥 Filmes em Alta Esta Semana</h2>
        </div>
        <div class="movies-grid">
          ${moviesWeek.results.map(movie => createMovieCard(movie)).join('')}
        </div>
      </section>

      <section class="section">
        <div class="section-header">
          <h2 class="section-title">📺 Séries em Alta Esta Semana</h2>
        </div>
        <div class="movies-grid">
          ${tvWeek.results.map(show => createTVCard(show)).join('')}
        </div>
      </section>
    `;

  } catch (error) {
    console.error('Erro ao carregar trending:', error);
    content.innerHTML = createErrorHTML();
  }
}

// ============================================
// CONTINUAR ASSISTINDO
// ============================================

async function loadWatchingPage() {
  const content = document.querySelector('.page-content');
  if (!content) return;

  const watchingItems = WatchTracker.getAll();

  if (watchingItems.length === 0) {
    content.innerHTML = `
      <section class="section watching-page">
        <div class="section-header">
          <h2 class="section-title">▶️ Continuar Assistindo</h2>
        </div>
        <div class="watching-empty">
          <svg viewBox="0 0 24 24" fill="currentColor" width="64" height="64" style="opacity: 0.3;">
            <path d="M4 6H2v14c0 1.1.9 2 2 2h14v-2H4V6zm16-4H8c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm-8 12.5v-9l6 4.5-6 4.5z"/>
          </svg>
          <h3>Nenhum conteúdo iniciado</h3>
          <p>Comece a assistir filmes ou séries e eles aparecerão aqui!</p>
          <button class="btn btn-primary" onclick="navigateTo('home')" style="margin-top: 16px;">
            <svg viewBox="0 0 24 24" fill="currentColor" width="20" height="20">
              <path d="M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z"/>
            </svg>
            Explorar Catálogo
          </button>
        </div>
      </section>
    `;
    return;
  }

  content.innerHTML = `
    <section class="section watching-page">
      <div class="section-header">
        <h2 class="section-title">▶️ Continuar Assistindo</h2>
        <span class="items-count">${watchingItems.length} itens</span>
      </div>
      <div class="movies-grid">
        ${watchingItems.map(item => createWatchingCard(item, true)).join('')}
      </div>
    </section>
  `;
}

function createWatchingCard(item, showRemove = false) {
  const poster = tmdbAPI.getImageUrl(item.poster_path, 'poster', 'medium');
  const rating = tmdbAPI.formatRating(item.vote_average);
  const year = tmdbAPI.getYear(item.release_date);
  const progress = item.progress || 15;
  const typeLabel = item.type === 'movie' ? 'HD' : 'SÉRIE';
  const title = item.title;

  // Info de episódio para séries
  let episodeInfo = '';
  if (item.type === 'tv' && item.season && item.episode) {
    episodeInfo = `<span class="watching-episode-info">T${item.season} E${item.episode}</span>`;
  }

  const removeBtn = showRemove ? `
    <button class="watching-card-remove" onclick="event.stopPropagation(); removeFromWatching(${item.id}, '${item.type}')" title="Remover">
      <svg viewBox="0 0 24 24" fill="currentColor" width="16" height="16">
        <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
      </svg>
    </button>
  ` : '';

  return `
    <div class="movie-card watching-card" onclick="openDetail('${item.type}', ${item.id}, true)">
      <div class="movie-card-inner">
        <img src="${poster}" alt="${title}" class="movie-poster" loading="lazy">
        <span class="movie-quality">${typeLabel}</span>
        <span class="movie-rating">⭐ ${rating}</span>
        ${removeBtn}
        <div class="watch-progress-bar">
          <div class="watch-progress-fill" style="width: ${progress}%"></div>
        </div>
        <div class="movie-card-overlay">
          <div class="movie-play-btn">
            <svg viewBox="0 0 24 24" fill="currentColor">
              <path d="M8 5v14l11-7z"/>
            </svg>
          </div>
        </div>
      </div>
      <div class="movie-info">
        <h3 class="movie-title">${title}</h3>
        <div class="movie-meta">
          <span>${year}</span>
          ${episodeInfo}
        </div>
      </div>
    </div>
  `;
}

function createWatchingCarouselHTML(items) {
  if (!items || items.length === 0) return '';

  const carouselId = `carousel-watching-${Math.random().toString(36).substr(2, 9)}`;

  return `
    <section class="section watching-section">
      <div class="section-header">
        <h2 class="section-title">▶️ Continuar Assistindo</h2>
        <a href="#" class="view-all" onclick="navigateTo('watching'); return false;">Ver todos →</a>
      </div>
      
      <div class="carousel-container">
        <button class="carousel-btn prev" onclick="scrollCarousel('${carouselId}', -1)" aria-label="Anterior">
          <svg viewBox="0 0 24 24" fill="currentColor" width="32" height="32">
            <path d="M15.41 7.41L14 6l-6 6 6 6 1.41-1.41L10.83 12z"/>
          </svg>
        </button>
        
        <div class="movies-row" id="${carouselId}">
          ${items.map(item => createWatchingCard(item, false)).join('')}
        </div>
        
        <button class="carousel-btn next" onclick="scrollCarousel('${carouselId}', 1)" aria-label="Próximo">
          <svg viewBox="0 0 24 24" fill="currentColor" width="32" height="32">
            <path d="M10 6L8.59 7.41 13.17 12l-4.58 4.59L10 18l6-6z"/>
          </svg>
        </button>
      </div>
    </section>
  `;
}

function removeFromWatching(id, type) {
  WatchTracker.remove(id, type);
  // Recarrega a página se estiver na página de watching
  if (AppState.currentPage === 'watching') {
    loadWatchingPage();
  }
}

// Expõe globalmente
window.removeFromWatching = removeFromWatching;

// ============================================
// SALVOS (Bookmarks)
// ============================================

async function loadSavedPage() {
  const content = document.querySelector('.page-content');
  if (!content) return;

  const savedItems = SaveTracker.getAll();

  if (savedItems.length === 0) {
    content.innerHTML = `
      <section class="section saved-page">
        <div class="section-header">
          <h2 class="section-title">🔖 Salvos</h2>
        </div>
        <div class="watching-empty">
          <svg viewBox="0 0 24 24" fill="currentColor" width="64" height="64" style="opacity: 0.3;">
            <path d="M17 3H7c-1.1 0-2 .9-2 2v16l7-3 7 3V5c0-1.1-.9-2-2-2z"/>
          </svg>
          <h3>Nenhum conteúdo salvo</h3>
          <p>Salve filmes ou séries clicando no ícone de marcador nos cards!</p>
          <button class="btn btn-primary" onclick="navigateTo('home')" style="margin-top: 16px;">
            <svg viewBox="0 0 24 24" fill="currentColor" width="20" height="20">
              <path d="M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z"/>
            </svg>
            Explorar Catálogo
          </button>
        </div>
      </section>
    `;
    return;
  }

  content.innerHTML = `
    <section class="section saved-page">
      <div class="section-header">
        <h2 class="section-title">🔖 Salvos</h2>
        <span class="items-count">${savedItems.length} itens</span>
      </div>
      <div class="movies-grid">
        ${savedItems.map(item => createSavedCard(item)).join('')}
      </div>
    </section>
  `;
}

function createSavedCard(item) {
  const poster = tmdbAPI.getImageUrl(item.poster_path, 'poster', 'medium');
  const rating = tmdbAPI.formatRating(item.vote_average);
  const year = tmdbAPI.getYear(item.release_date);
  const typeLabel = item.type === 'movie' ? 'HD' : 'SÉRIE';
  const title = item.title;

  return `
    <div class="movie-card watching-card" onclick="openDetail('${item.type}', ${item.id}, true)">
      <div class="movie-card-inner">
        <img src="${poster}" alt="${title}" class="movie-poster" loading="lazy">
        <span class="movie-quality">${typeLabel}</span>
        <span class="movie-rating">⭐ ${rating}</span>
        <button class="watching-card-remove" onclick="event.stopPropagation(); removeFromSaved(${item.id}, '${item.type}')" title="Remover dos Salvos">
          <svg viewBox="0 0 24 24" fill="currentColor" width="16" height="16">
            <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
          </svg>
        </button>
        <div class="movie-card-overlay">
          <div class="movie-play-btn">
            <svg viewBox="0 0 24 24" fill="currentColor">
              <path d="M8 5v14l11-7z"/>
            </svg>
          </div>
        </div>
      </div>
      <div class="movie-info">
        <h3 class="movie-title">${title}</h3>
        <div class="movie-meta">
          <span>${year}</span>
        </div>
      </div>
    </div>
  `;
}

function removeFromSaved(id, type) {
  SaveTracker.remove(id, type);
  if (AppState.currentPage === 'saved') {
    loadSavedPage();
  }
}

window.removeFromSaved = removeFromSaved;

// ============================================
// DETALHES
// ============================================

function openDetail(type, id, autoPlay = false) {
  // Salva estado da busca antes de navegar
  const searchInput = document.getElementById('search-input');

  if (searchInput && searchInput.value.trim() !== '') {
    sessionStorage.setItem('blluflix_search_active', 'true');
    sessionStorage.setItem('blluflix_search_query', searchInput.value);
  } else {
    sessionStorage.removeItem('blluflix_search_active');
    sessionStorage.removeItem('blluflix_search_query');
  }

  // Fecha resultados de busca
  document.getElementById('search-results')?.classList.remove('active');
  if (document.getElementById('search-input')) {
    document.getElementById('search-input').value = '';
  }

  // Navega para página de detalhes
  let url = type === 'movie' ? `movie.html?id=${id}` : `series.html?id=${id}`;
  if (autoPlay) {
    url += '&play=1';
  }
  window.location.href = url;
}

// ============================================
// HERO SLIDESHOW
// ============================================

// Variável global para armazenar o ID do intervalo do slideshow
let heroSlideshowInterval = null;
const HERO_SLIDESHOW_DELAY = 6000; // 6 segundos entre slides

function startHeroSlideshow() {
  // Limpa qualquer intervalo existente antes de criar um novo
  if (heroSlideshowInterval) {
    clearInterval(heroSlideshowInterval);
  }

  heroSlideshowInterval = setInterval(() => {
    if (AppState.heroMovies.length === 0) return;

    AppState.heroSlideIndex = (AppState.heroSlideIndex + 1) % AppState.heroMovies.length;

    document.querySelectorAll('.hero-slide').forEach((slide, index) => {
      slide.classList.toggle('active', index === AppState.heroSlideIndex);
    });

    document.querySelectorAll('.hero-dot').forEach((dot, index) => {
      dot.classList.toggle('active', index === AppState.heroSlideIndex);
    });
  }, HERO_SLIDESHOW_DELAY);
}

function goToSlide(index) {
  AppState.heroSlideIndex = index;

  document.querySelectorAll('.hero-slide').forEach((slide, i) => {
    slide.classList.toggle('active', i === index);
  });

  document.querySelectorAll('.hero-dot').forEach((dot, i) => {
    dot.classList.toggle('active', i === index);
  });

  // Reseta o timer do slideshow para dar tempo ao usuário de ler o catálogo
  startHeroSlideshow();
}

// ============================================
// HTML GENERATORS
// ============================================

// Faixa de exploração cinematográfica: atalhos para rotas já existentes.
function createCinemaDiscoveryHTML() {
  return `
    <section class="cinema-discover" aria-label="Explore o catálogo">
      <div class="cinema-discover-lead"><span class="cinema-discover-label">✦ SUA PRÓXIMA SESSÃO</span><strong>O que vamos assistir hoje?</strong></div>
      <div class="cinema-discover-actions">
        <button onclick="navigateTo('movies')" class="discover-pill"><span class="discover-icon">▣</span> Filmes <span class="discover-arrow">↗</span></button>
        <button onclick="navigateTo('series')" class="discover-pill"><span class="discover-icon">▤</span> Séries <span class="discover-arrow">↗</span></button>
        <button onclick="navigateTo('trending')" class="discover-pill"><span class="discover-icon">✦</span> Em alta <span class="discover-arrow">↗</span></button>
        <button onclick="cinemaSurpriseMe()" class="discover-pill discover-surprise"><span class="discover-icon">✳</span> Surpreenda-me <span class="discover-arrow">↗</span></button>
      </div>
    </section>`;
}

function createHeroHTML(movies) {
  if (!movies || movies.length === 0) return '';

  return `
    <section class="hero" aria-label="Destaques do BlluFlix">
      <div class="hero-topline"><span class="live-pulse"></span> BLLUFLIX <span class="hero-topline-dot">/</span> EM CARTAZ <span class="hero-topline-edition">EDIÇÃO 2026</span></div>
      ${movies.map((movie, index) => `
        <div class="hero-slide ${index === 0 ? 'active' : ''}" data-slide="${index}">
          <img 
            src="${tmdbAPI.getImageUrl(movie.backdrop_path, 'backdrop', 'large')}" 
            alt="${movie.title}" 
            class="hero-backdrop"
          >
          <div class="hero-overlay"></div>
          <div class="hero-ambient-orb" aria-hidden="true"></div>
          <div class="hero-content">
            <div class="hero-eyebrow"><span class="eyebrow-line"></span> ESCOLHAS PARA VOCÊ <span class="eyebrow-serial">NO. ${String(index + 1).padStart(2,'0')}</span></div>
            <span class="hero-badge"><span class="live-pulse"></span> Estreia em destaque</span>
            <h1 class="hero-title">${movie.title}</h1>
            <div class="hero-meta">
              <span class="hero-rating">⭐ ${tmdbAPI.formatRating(movie.vote_average)}</span>
              <span>${tmdbAPI.getYear(movie.release_date)}</span>
              <span>${movie.genre_ids?.slice(0, 2).map(id => tmdbAPI.getGenreName(id)).join(', ') || ''}</span>
            </div>
            <p class="hero-description">${movie.overview}</p>
            <div class="hero-buttons">
              <button class="btn btn-primary" onclick="openDetail('movie', ${movie.id})">
                <svg viewBox="0 0 24 24" fill="currentColor" width="20" height="20">
                  <path d="M8 5v14l11-7z"/>
                </svg>
                Assistir Agora
              </button>
              <button class="btn btn-secondary" onclick="openDetail('movie', ${movie.id})">
                <svg viewBox="0 0 24 24" fill="currentColor" width="20" height="20">
                  <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-6h2v6zm0-8h-2V7h2v2z"/>
                </svg>
                Mais Info
              </button>
            </div>
            <div class="hero-curator"><span class="hero-curator-icon">✦</span> CURADORIA BLLUFLIX <span class="hero-curator-line"></span> UMA NOVA HISTÓRIA TE ESPERA</div>
          </div>
          <div class="hero-art" aria-hidden="true">
            <div class="hero-art-glow"></div>
            <div class="cinema-orbit orbit-one"></div>
            <div class="cinema-orbit orbit-two"></div>
            <div class="hero-film-disc"><div class="film-disc-core"></div><span class="film-hole hole-1"></span><span class="film-hole hole-2"></span><span class="film-hole hole-3"></span><span class="film-hole hole-4"></span><span class="film-hole hole-5"></span><span class="film-hole hole-6"></span></div>
            <div class="hero-poster-shell"><img class="hero-floating-poster" src="${tmdbAPI.getImageUrl(movie.poster_path, 'poster', 'medium')}" alt="" loading="${index === 0 ? 'eager' : 'lazy'}"><div class="hero-poster-reflection"></div></div>
            <div class="hero-art-caption"><span class="art-caption-line"></span> THE NEXT SCENE <small>EXPERIENCE  /  ${String(index + 1).padStart(2,'0')}</small></div>
          </div>
        </div>
      `).join('')}
      
      <div class="hero-controls">
        <div class="hero-controls-caption">EM DESTAQUE <strong id="hero-current-number">01</strong><span class="hero-controls-divider">/</span>${String(movies.length).padStart(2,'0')}</div>
        <div class="hero-dots" role="tablist" aria-label="Selecionar destaque">
          ${movies.map((_, index) => `
            <button class="hero-dot ${index === 0 ? 'active' : ''}" onclick="goToSlide(${index})" aria-label="Destaque ${index + 1}" aria-selected="${index === 0 ? 'true' : 'false'}"><span></span></button>
          `).join('')}
        </div>
        <div class="hero-arrows"><button onclick="cinemaStepHero(-1)" aria-label="Destaque anterior">←</button><button onclick="cinemaStepHero(1)" aria-label="Próximo destaque">→</button></div>
      </div>
    </section>
  `;
}

function createMovieCard(movie) {
  const poster = tmdbAPI.getImageUrl(movie.poster_path, 'poster', 'medium');
  const rating = tmdbAPI.formatRating(movie.vote_average);
  const year = tmdbAPI.getYear(movie.release_date);
  const isSaved = SaveTracker.isSaved(movie.id, 'movie');
  const titleEsc = (movie.title || '').replace(/'/g, "\\'").replace(/"/g, '&quot;');

  return `
    <div class="movie-card" onclick="openDetail('movie', ${movie.id})">
      <div class="movie-card-inner">
        <img src="${poster}" alt="${movie.title}" class="movie-poster" loading="lazy">
        <span class="movie-quality">HD</span>
        <span class="movie-rating">⭐ ${rating}</span>
        <button class="save-btn ${isSaved ? 'saved' : ''}" onclick="toggleSaveItem(event, ${movie.id}, 'movie', '${titleEsc}', '${movie.poster_path}', ${movie.vote_average}, '${movie.release_date}')" title="${isSaved ? 'Remover dos Salvos' : 'Salvar'}">
          <svg viewBox="0 0 24 24" width="16" height="16"><path d="M17 3H7c-1.1 0-2 .9-2 2v16l7-3 7 3V5c0-1.1-.9-2-2-2z"/></svg>
        </button>
        <div class="movie-card-overlay">
          <div class="movie-play-btn">
            <svg viewBox="0 0 24 24" fill="currentColor">
              <path d="M8 5v14l11-7z"/>
            </svg>
          </div>
        </div>
      </div>
      <div class="movie-info">
        <h3 class="movie-title">${movie.title}</h3>
        <div class="movie-meta">
          <span>${year}</span>
        </div>
      </div>
    </div>
  `;
}

function createTVCard(show) {
  const poster = tmdbAPI.getImageUrl(show.poster_path, 'poster', 'medium');
  const rating = tmdbAPI.formatRating(show.vote_average);
  const year = tmdbAPI.getYear(show.first_air_date);
  const isSaved = SaveTracker.isSaved(show.id, 'tv');
  const titleEsc = (show.name || '').replace(/'/g, "\\'").replace(/"/g, '&quot;');

  return `
    <div class="movie-card" onclick="openDetail('tv', ${show.id})">
      <div class="movie-card-inner">
        <img src="${poster}" alt="${show.name}" class="movie-poster" loading="lazy">
        <span class="movie-quality">SÉRIE</span>
        <span class="movie-rating">⭐ ${rating}</span>
        <button class="save-btn ${isSaved ? 'saved' : ''}" onclick="toggleSaveItem(event, ${show.id}, 'tv', '${titleEsc}', '${show.poster_path}', ${show.vote_average}, '${show.first_air_date}')" title="${isSaved ? 'Remover dos Salvos' : 'Salvar'}">
          <svg viewBox="0 0 24 24" width="16" height="16"><path d="M17 3H7c-1.1 0-2 .9-2 2v16l7-3 7 3V5c0-1.1-.9-2-2-2z"/></svg>
        </button>
        <div class="movie-card-overlay">
          <div class="movie-play-btn">
            <svg viewBox="0 0 24 24" fill="currentColor">
              <path d="M8 5v14l11-7z"/>
            </svg>
          </div>
        </div>
      </div>
      <div class="movie-info">
        <h3 class="movie-title">${show.name}</h3>
        <div class="movie-meta">
          <span>${year}</span>
        </div>
      </div>
    </div>
  `;
}

function createCarouselHTML(title, items, type = 'movie', viewAllAction = null) {
  if (!items || items.length === 0) return '';

  const carouselId = `carousel-${Math.random().toString(36).substr(2, 9)}`;
  const viewAllLink = viewAllAction
    ? `<a href="#" class="view-all" onclick="${viewAllAction}; return false;">Ver todos →</a>`
    : '';

  return `
    <section class="section">
      <div class="section-header">
        <h2 class="section-title">${title}</h2>
        ${viewAllLink}
      </div>
      
      <div class="carousel-container">
        <button class="carousel-btn prev" onclick="scrollCarousel('${carouselId}', -1)" aria-label="Anterior">
          <svg viewBox="0 0 24 24" fill="currentColor" width="32" height="32">
            <path d="M15.41 7.41L14 6l-6 6 6 6 1.41-1.41L10.83 12z"/>
          </svg>
        </button>
        
        <div class="movies-row" id="${carouselId}">
          ${items.map(item => type === 'movie' ? createMovieCard(item) : createTVCard(item)).join('')}
        </div>
        
        <button class="carousel-btn next" onclick="scrollCarousel('${carouselId}', 1)" aria-label="Próximo">
          <svg viewBox="0 0 24 24" fill="currentColor" width="32" height="32">
            <path d="M10 6L8.59 7.41 13.17 12l-4.58 4.59L10 18l6-6z"/>
          </svg>
        </button>
      </div>
    </section>
  `;
}

// Global function to handle carousel scrolling
window.scrollCarousel = function (elementId, direction) {
  const container = document.getElementById(elementId);
  if (!container) return;

  // Calculate scroll amount based on visible width
  const cardWidth = 200; // Approximate card width including gap
  const visibleCards = Math.floor(container.clientWidth / cardWidth);
  const scrollAmount = Math.max(cardWidth * visibleCards * 0.75, 300);

  // Use requestAnimationFrame for smoother scrolling
  requestAnimationFrame(() => {
    container.scrollBy({
      left: direction * scrollAmount,
      behavior: 'smooth'
    });
  });
};

// ============================================
// DRAG TO SCROLL (Arrastar para rolar)
// ============================================

function initDragScroll() {
  // Aplica em todos os .movies-row existentes e futuros via MutationObserver
  document.addEventListener('mousedown', (e) => {
    const row = e.target.closest('.movies-row');
    if (!row) return;

    // Ignora se clicou em botão, link ou elemento interativo
    if (e.target.closest('button, a, .save-btn, .watching-card-remove')) return;

    let isDown = true;
    let hasDragged = false;
    let startX = e.pageX;
    let scrollLeft = row.scrollLeft;

    row.style.cursor = 'grabbing';
    row.style.userSelect = 'none';

    const onMouseMove = (e2) => {
      if (!isDown) return;
      e2.preventDefault();
      const x = e2.pageX;
      const walk = (startX - x) * 1.5; // Multiplicador de velocidade
      if (Math.abs(walk) > 5) hasDragged = true;
      row.scrollLeft = scrollLeft + walk;
    };

    const onMouseUp = () => {
      isDown = false;
      row.style.cursor = '';
      row.style.userSelect = '';
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseup', onMouseUp);

      // Previne clique em card se arrastou
      if (hasDragged) {
        const blocker = (e3) => {
          e3.stopPropagation();
          e3.preventDefault();
        };
        row.addEventListener('click', blocker, { capture: true, once: true });
      }
    };

    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);
  });
}

// Inicializa drag scroll
initDragScroll();

function createFiltersHTML(options = { showType: true, initialGenre: '' }) {
  const showType = options?.showType !== false;
  const initialGenre = options?.initialGenre || '';
  const initialSort = options?.initialSort || '';
  const initialYear = options?.initialYear || '';
  const initialType = options?.initialType || 'all';

  const genres = tmdbAPI.getMovieGenres();
  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 30 }, (_, i) => currentYear - i);

  return `
    <div class="filters">
      <div class="filter-group">
        <label class="filter-label">Gênero</label>
        <select class="filter-select" id="filter-genre" onchange="applyFilters()">
          <option value="">Todos</option>
          ${genres.map(g => `<option value="${g.id}" ${g.id == initialGenre ? 'selected' : ''}>${g.name}</option>`).join('')}
        </select>
      </div>
      <div class="filter-group">
        <label class="filter-label">Ordenar</label>
        <select class="filter-select" id="filter-sort" onchange="applyFilters()">
          <option value="popularity.desc" ${initialSort === 'popularity.desc' ? 'selected' : ''}>Mais Populares</option>
          <option value="vote_average.desc" ${initialSort === 'vote_average.desc' ? 'selected' : ''}>Mais Avaliados</option>
          <option value="release_date.desc" ${initialSort === 'release_date.desc' ? 'selected' : ''}>Mais Recentes</option>
          <option value="release_date.asc" ${initialSort === 'release_date.asc' ? 'selected' : ''}>Mais Antigos</option>
        </select>
      </div>
      <div class="filter-group">
        <label class="filter-label">Ano</label>
        <select class="filter-select" id="filter-year" onchange="applyFilters()">
          <option value="">Todos</option>
          ${years.map(y => `<option value="${y}" ${y == initialYear ? 'selected' : ''}>${y}</option>`).join('')}
        </select>
      </div>
      ${showType ? `
      <div class="filter-group">
        <label class="filter-label">Tipo</label>
        <select class="filter-select" id="filter-type" onchange="applyFilters()">
          <option value="all" ${initialType === 'all' ? 'selected' : ''}>Todos</option>
          <option value="movie" ${initialType === 'movie' ? 'selected' : ''}>Filmes</option>
          <option value="tv" ${initialType === 'tv' ? 'selected' : ''}>Séries</option>
          <option value="anime" ${initialType === 'anime' ? 'selected' : ''}>Animes</option>
          <option value="dorama" ${initialType === 'dorama' ? 'selected' : ''}>Doramas</option>
        </select>
      </div>
      ` : ''}
    </div>
  `;
}

// Helper para construir filtros da API
function getDiscoveryFilters(type, sort, genre, year, page) {
  const filters = {
    sort_by: sort || 'popularity.desc',
    page: page || 1,
    include_adult: false,
    include_video: false
  };

  // Ajuste de sortKey para datas dependendo do tipo
  // (Filme usa release_date, TV usa first_air_date)
  if (sort === 'release_date.desc' || sort === 'release_date.asc') {
    if (type === 'tv' || type === 'anime' || type === 'dorama') {
      filters.sort_by = sort.replace('release_date', 'first_air_date');
    }
  }

  // Filtros Especiais para "Mais Recentes"
  // Removemos a trava de data (.lte) para permitir 2026/Futuro
  // Mas filtramos o "lixo" (0-2 votos) exigindo um mínimo de engajamento
  if (sort === 'release_date.desc') {
    // Regras para LIMPAR O LIXO, exceto ANIMES e DORAMAS
    if (type !== 'anime' && type !== 'dorama') {
      // "pode colcar filmes com votos apartir de 9 pontos pra cima"
      filters['vote_count.gte'] = 9;

      // Também garantimos uma qualidade mínima para evitar coisas muito quebradas
      // (Nota 3.0 é bem baixa, mas filtra erros de cadastro)
      filters['vote_average.gte'] = 3.0;

      // Opcional: Filtro de popularidade leve para garantir que é um filme "de verdade"
      // (Filmes hype como Extermínio terão popularidade alta mesmo com poucos votos)
      // filters['popularity.gte'] = 10;
    }

    // Para Animes: NÃO aplicamos filtros (mostra tudo, inclusive desconhecidos)
  }

  // Filtro de Gênero
  if (genre) {
    if (type === 'movie') {
      // Mapeia ID custom de "Lutas" (10101) para Ação (28)
      const movieGenre = parseInt(genre) === 10101 ? 28 : genre;
      filters.with_genres = movieGenre;
    } else if (type === 'tv') {
      const tvGenre = MOVIE_TO_TV_GENRE_MAP[parseInt(genre)] || genre;
      filters.with_genres = tvGenre;
    } else if (type === 'anime') {
      const tvGenre = MOVIE_TO_TV_GENRE_MAP[parseInt(genre)] || genre;
      // Se for Animação (16), não duplica; senão combina
      if (parseInt(tvGenre) === 16) {
        filters.with_genres = '16';
      } else {
        filters.with_genres = `${tvGenre},16`;
      }
    } else if (type === 'dorama') {
      const tvGenre = MOVIE_TO_TV_GENRE_MAP[parseInt(genre)] || genre;
      // Se for Drama (18), não duplica; senão combina
      if (parseInt(tvGenre) === 18) {
        filters.with_genres = '18';
      } else {
        filters.with_genres = `${tvGenre},18`;
      }
    }
  } else if (type === 'anime') {
    filters.with_genres = '16'; // Default Anime
  } else if (type === 'dorama') {
    filters.with_genres = '18'; // Default Dorama (Drama)
  }

  // Filtro de Ano
  if (year) {
    if (type === 'movie') {
      filters.primary_release_year = year;
    } else {
      filters.first_air_date_year = year;
    }
  }

  // Filtros Específicos de Tipo e Idiomas Aceitáveis
  if (type === 'anime') {
    filters.with_original_language = 'ja';
  } else if (type === 'dorama') {
    filters.with_original_language = 'ko|ja';
  } else {
    // Para todos os outros filtros, restringe a linguagens mais consumíveis, removendo ruído (indianos, árabes, etc)
    filters.with_original_language = 'en|pt|es|fr|it|de|ko|ja';
  }

  return filters;
}

async function applyFilters() {
  const genre = document.getElementById('filter-genre')?.value;
  const year = document.getElementById('filter-year')?.value;
  const sort = document.getElementById('filter-sort')?.value;
  const typeSelect = document.getElementById('filter-type');

  let type = 'all'; // Default
  if (typeSelect) {
    type = typeSelect.value;
  } else if (AppState.currentPage === 'series') {
    type = 'tv';
  } else if (AppState.currentPage === 'movies') {
    type = 'movie';
  } else {
    // Fallback based on URL or other logic if needed
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('page') === 'series') type = 'tv';
  }

  const content = document.querySelector('.page-content');

  // Mostra loading
  const section = content.querySelector('.section');
  if (section) {
    section.innerHTML = `
      <div class="section-header">
        <h2 class="section-title">🔄 Carregando...</h2>
      </div>
      <div style="display: flex; justify-content: center; padding: 50px;">
        <div class="spinner"></div>
      </div>
    `;
  }

  try {
    let data;
    let cardCreator;
    let typeLabel;

    // Limpa estado anterior do sessionStorage (aplicar filtro = novo progresso)
    sessionStorage.removeItem('blluflix_filter_state');

    // Salva filtros atuais no AppState
    AppState.filterState = {
      genre: genre,
      year: year,
      sort: sort || 'popularity.desc',
      type: type,
      apiPage: 1,
      items: [],
      currentPage: 1,
      itemsPerPage: 15,
      isLoading: false
    };

    if (type === 'all') {
      // Todos (Filmes + Séries + Animes)
      // Buscamos os 3 arrays em paralelo usando o helper

      // 1. Filmes
      const movieFilters = getDiscoveryFilters('movie', sort, genre, year, 1);

      // 2. Séries
      const tvFilters = getDiscoveryFilters('tv', sort, genre, year, 1);

      // 3. Animes
      const animeFilters = getDiscoveryFilters('anime', sort, genre, year, 1);

      // Executa as 3 requisições
      const [moviesData, tvData, animeData] = await Promise.all([
        tmdbAPI.discoverMovies(movieFilters),
        tmdbAPI.discoverTVShows(tvFilters),
        tmdbAPI.discoverTVShows(animeFilters)
      ]);

      // Marca o tipo em cada item
      const movies = moviesData.results.map(m => ({ ...m, media_type: 'movie' }));
      const tvs = tvData.results.map(t => ({ ...t, media_type: 'tv' }));
      const animes = animeData.results.map(a => ({ ...a, media_type: 'tv', is_anime: true }));

      // Combina e remove duplicatas (priorizando Animes > Séries > Filmes)
      const allResults = [...tvs, ...animes, ...movies];
      const uniqueIds = new Map();

      allResults.forEach(item => {
        const key = `${item.id}_${item.media_type}`;
        if (!uniqueIds.has(key)) {
          uniqueIds.set(key, item);
        }
      });

      let combinedResults = Array.from(uniqueIds.values());

      // Ordenação manual dos resultados combinados
      combinedResults.sort((a, b) => {
        let sortKey = (sort || 'popularity.desc').split('.')[0];
        const isDesc = (sort || 'popularity.desc').split('.')[1] === 'desc';

        // Ajuste de chave para datas
        if (sortKey === 'release_date') {
          const getVal = (item) => item.release_date || item.first_air_date || '';
          const valA = getVal(a);
          const valB = getVal(b);
          // Tratamento para datas vazias (joga pro final se desc, inicio se asc)
          if (!valA) return isDesc ? 1 : -1;
          if (!valB) return isDesc ? -1 : 1;
          return isDesc ? (valB > valA ? 1 : -1) : (valA > valB ? 1 : -1);
        }

        const valA = a[sortKey] || 0;
        const valB = b[sortKey] || 0;

        return isDesc ? valB - valA : valA - valB;
      });

      data = { results: combinedResults };
      cardCreator = 'mixed';
      typeLabel = 'itens';

    } else if (type === 'movie') {
      // Filmes
      const filters = getDiscoveryFilters('movie', sort, genre, year, 1);
      data = await tmdbAPI.discoverMovies(filters);
      cardCreator = createMovieCard;
      typeLabel = 'filmes';

    } else if (type === 'tv') {
      // Séries
      const filters = getDiscoveryFilters('tv', sort, genre, year, 1);
      data = await tmdbAPI.discoverTVShows(filters);
      cardCreator = createTVCard;
      typeLabel = 'séries';

    } else if (type === 'anime') {
      // Animes
      const filters = getDiscoveryFilters('anime', sort, genre, year, 1);
      data = await tmdbAPI.discoverTVShows(filters);
      cardCreator = createTVCard;
      typeLabel = 'animes';

    } else if (type === 'dorama') {
      // Doramas
      const filters = getDiscoveryFilters('dorama', sort, genre, year, 1);
      data = await tmdbAPI.discoverTVShows(filters);
      cardCreator = createTVCard;
      typeLabel = 'doramas';
    }

    // Salva os itens no estado do filtro
    AppState.filterState.items = data.results;
    AppState.filterState.typeLabel = typeLabel;
    AppState.filterState.cardCreator = type === 'all' ? 'mixed' : (type === 'movie' ? 'movie' : 'tv');

    // Calcula itens visíveis com paginação
    const visibleItems = AppState.filterState.items.slice(0, AppState.filterState.currentPage * AppState.filterState.itemsPerPage);

    // Atualiza a seção com resultados
    if (section) {
      section.innerHTML = `
        <div class="section-header">
          <h2 class="section-title">🎬 Resultados</h2>
          <span class="items-count">${visibleItems.length} ${typeLabel} exibidos</span>
        </div>
        <div class="movies-grid" id="filter-grid">
          ${visibleItems.map(item => {
        if (cardCreator === 'mixed') {
          return item.media_type === 'movie' ? createMovieCard(item) : createTVCard(item);
        }
        return cardCreator(item);
      }).join('')}
        </div>
        <div class="load-more-container">
          <button class="btn btn-primary load-more-btn" onclick="loadMoreFilterItems()" id="load-more-filter-btn">
            <svg viewBox="0 0 24 24" fill="currentColor" width="20" height="20">
              <path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z"/>
            </svg>
            <span id="load-more-filter-text">Ver Mais</span>
          </button>
        </div>
      `;
    }

    // Remove outras seções
    const sections = content.querySelectorAll('.section');
    for (let i = 1; i < sections.length; i++) {
      sections[i].remove();
    }

    // Restaura valores dos filtros
    if (genre) document.getElementById('filter-genre').value = genre;
    if (year) document.getElementById('filter-year').value = year;
    if (sort) document.getElementById('filter-sort').value = sort;
    const filterTypeEl = document.getElementById('filter-type');
    if (filterTypeEl) filterTypeEl.value = type;

    // Salva estado inicial para persistir entre páginas
    saveFilterState();

  } catch (error) {
    console.error('Erro ao aplicar filtros:', error);
    if (section) {
      section.innerHTML = `
        <div class="error-container" style="display: flex; flex-direction: column; align-items: center; justify-content: center; min-height: 50vh; gap: 20px; text-align: center; padding: 20px;">
          <svg viewBox="0 0 24 24" fill="var(--accent-primary)" width="64" height="64">
            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"/>
          </svg>
          <h2 style="font-size: 1.5rem;">Ops! Algo deu errado</h2>
          <p style="color: var(--text-secondary);">Erro: ${error.message}</p>
          <button class="btn btn-primary" onclick="location.reload()">Recarregar</button>
        </div>
      `;
    }
  }
}

// Carrega mais itens quando filtros estão aplicados
async function loadMoreFilterItems() {
  if (!AppState.filterState || AppState.filterState.isLoading) return;

  const btn = document.getElementById('load-more-filter-btn');
  const btnText = document.getElementById('load-more-filter-text');

  // Verifica se precisa carregar mais da API
  const nextEndIndex = (AppState.filterState.currentPage + 1) * AppState.filterState.itemsPerPage;

  if (nextEndIndex > AppState.filterState.items.length) {
    // Precisa carregar mais da API
    AppState.filterState.isLoading = true;

    if (btn) btn.disabled = true;
    if (btnText) btnText.textContent = 'Carregando...';

    try {
      // Carrega próxima página da API
      AppState.filterState.apiPage++;
      const { genre, year, sort, type } = AppState.filterState;
      const apiPage = AppState.filterState.apiPage; // Use a variável atualizada

      let newData;
      if (type === 'all') {
        const movieFilters = getDiscoveryFilters('movie', sort, genre, year, apiPage);
        const tvFilters = getDiscoveryFilters('tv', sort, genre, year, apiPage);
        const animeFilters = getDiscoveryFilters('anime', sort, genre, year, apiPage);

        const [moviesData, tvData, animeData] = await Promise.all([
          tmdbAPI.discoverMovies(movieFilters),
          tmdbAPI.discoverTVShows(tvFilters),
          tmdbAPI.discoverTVShows(animeFilters)
        ]);

        const movies = moviesData.results.map(m => ({ ...m, media_type: 'movie' }));
        const tvs = tvData.results.map(t => ({ ...t, media_type: 'tv' }));
        const animes = animeData.results.map(a => ({ ...a, media_type: 'tv', is_anime: true }));

        let combinedResults = [...tvs, ...animes, ...movies];

        // Sort
        combinedResults.sort((a, b) => {
          let sortKey = (sort || 'popularity.desc').split('.')[0];
          const isDesc = (sort || 'popularity.desc').split('.')[1] === 'desc';

          if (sortKey === 'release_date') {
            const getVal = (item) => item.release_date || item.first_air_date || '';
            const valA = getVal(a);
            const valB = getVal(b);
            if (!valA) return isDesc ? 1 : -1;
            if (!valB) return isDesc ? -1 : 1;
            return isDesc ? (valB > valA ? 1 : -1) : (valA > valB ? 1 : -1);
          }

          const valA = a[sortKey] || 0;
          const valB = b[sortKey] || 0;
          return isDesc ? valB - valA : valA - valB;
        });

        newData = { results: combinedResults };

      } else if (type === 'movie') {
        const filters = getDiscoveryFilters('movie', sort, genre, year, apiPage);
        newData = await tmdbAPI.discoverMovies(filters);

      } else if (type === 'tv') {
        const filters = getDiscoveryFilters('tv', sort, genre, year, apiPage);
        newData = await tmdbAPI.discoverTVShows(filters);

      } else if (type === 'anime') {
        const filters = getDiscoveryFilters('anime', sort, genre, year, apiPage);
        newData = await tmdbAPI.discoverTVShows(filters);

      } else if (type === 'dorama') {
        const filters = getDiscoveryFilters('dorama', sort, genre, year, apiPage);
        newData = await tmdbAPI.discoverTVShows(filters);
      }

      // Remove duplicatas
      const existingIds = new Set(AppState.filterState.items.map(m => m.id));
      const newItems = newData.results.filter(item => !existingIds.has(item.id));

      AppState.filterState.items = [...AppState.filterState.items, ...newItems];

    } catch (error) {
      console.error('Erro ao carregar mais itens filtrados:', error);
      AppState.filterState.isLoading = false;
      if (btn) btn.disabled = false;
      if (btnText) btnText.textContent = 'Tentar Novamente';
      return;
    }

    AppState.filterState.isLoading = false;
    if (btn) btn.disabled = false;
    if (btnText) btnText.textContent = 'Ver Mais';
  }

  // Incrementa página de exibição
  AppState.filterState.currentPage++;

  // Salva estado para persistir entre páginas
  saveFilterState();

  // Re-renderiza grid
  renderFilterResults();
}

// Renderiza resultados do filtro
function renderFilterResults() {
  const grid = document.getElementById('filter-grid');
  const countSpan = document.querySelector('.items-count');
  if (!grid || !AppState.filterState) return;

  const visibleItems = AppState.filterState.items.slice(0, AppState.filterState.currentPage * AppState.filterState.itemsPerPage);
  const cardCreatorType = AppState.filterState.cardCreator;

  grid.innerHTML = visibleItems.map(item => {
    if (cardCreatorType === 'mixed') {
      return item.media_type === 'movie' ? createMovieCard(item) : createTVCard(item);
    }
    return cardCreatorType === 'movie' ? createMovieCard(item) : createTVCard(item);
  }).join('');

  if (countSpan) {
    countSpan.textContent = `${visibleItems.length} ${AppState.filterState.typeLabel} exibidos`;
  }

  // Scroll suave para os novos itens
  setTimeout(() => {
    const cards = grid.querySelectorAll('.movie-card');
    const targetIndex = (AppState.filterState.currentPage - 1) * AppState.filterState.itemsPerPage;
    if (cards[targetIndex]) {
      cards[targetIndex].scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, 100);
}

// Salva estado do filtro no sessionStorage
function saveFilterState() {
  if (!AppState.filterState) return;

  const stateToSave = {
    genre: AppState.filterState.genre,
    year: AppState.filterState.year,
    sort: AppState.filterState.sort,
    type: AppState.filterState.type,
    apiPage: AppState.filterState.apiPage,
    items: AppState.filterState.items,
    currentPage: AppState.filterState.currentPage,
    itemsPerPage: AppState.filterState.itemsPerPage,
    typeLabel: AppState.filterState.typeLabel,
    cardCreator: AppState.filterState.cardCreator,
    genreId: AppState.genreId // Salva o gênero original para validação
  };

  try {
    sessionStorage.setItem('blluflix_filter_state', JSON.stringify(stateToSave));
  } catch (e) {
    console.warn('Não foi possível salvar estado do filtro (provavelmente limite de armazenamento):', e);
    // Tenta limpar estado antigo se falhar
    try {
      sessionStorage.removeItem('blluflix_filter_state');
    } catch (ignored) { }
  }
}

// Restaura estado do filtro do sessionStorage
function restoreFilterState(genreId) {
  try {
    const saved = sessionStorage.getItem('blluflix_filter_state');
    if (saved) {
      const state = JSON.parse(saved);
      // Só restaura se for o mesmo gênero
      if (state.genreId == genreId && state.items && state.items.length > 0) {
        AppState.filterState = {
          genre: state.genre,
          year: state.year,
          sort: state.sort,
          type: state.type,
          apiPage: state.apiPage,
          items: state.items,
          currentPage: state.currentPage,
          itemsPerPage: state.itemsPerPage,
          typeLabel: state.typeLabel,
          cardCreator: state.cardCreator,
          isLoading: false
        };
        return true;
      }
    }
  } catch (e) {
    console.error('Erro ao restaurar estado do filtro:', e);
  }
  return false;
}

// Tenta restaurar estado do filtro por TIPO (usado em páginas principais)
function restorePageFilterState(expectedType) {
  try {
    const saved = sessionStorage.getItem('blluflix_filter_state');
    if (saved) {
      const state = JSON.parse(saved);
      // Restaura se o tipo bater (ex: filtro de 'movie' na página de Filmes)
      if (state.type === expectedType && state.items && state.items.length > 0) {
        AppState.filterState = state;
        renderRestoredFilterPage();
        return true;
      }
    }
  } catch (e) {
    console.error('Erro ao restaurar estado da página:', e);
  }
  return false;
}


// Renderiza página com filtros restaurados
function renderRestoredFilterPage(genreName) {
  const content = document.querySelector('.page-content');
  if (!content || !AppState.filterState) return;

  const visibleItems = AppState.filterState.items.slice(0, AppState.filterState.currentPage * AppState.filterState.itemsPerPage);
  const cardCreatorType = AppState.filterState.cardCreator;

  // Restaura os valores dos filtros nos selects
  const genreSelect = AppState.filterState.genre;
  const yearSelect = AppState.filterState.year;
  const sortSelect = AppState.filterState.sort;
  const typeSelect = AppState.filterState.type;

  content.innerHTML = `
    ${createFiltersHTML()}
    <section class="section">
      <div class="section-header">
        <h2 class="section-title">🎬 Resultados</h2>
        <span class="items-count">${visibleItems.length} ${AppState.filterState.typeLabel} exibidos</span>
      </div>
      <div class="movies-grid" id="filter-grid">
        ${visibleItems.map(item => {
    if (cardCreatorType === 'mixed') {
      return item.media_type === 'movie' ? createMovieCard(item) : createTVCard(item);
    }
    return cardCreatorType === 'movie' ? createMovieCard(item) : createTVCard(item);
  }).join('')}
      </div>
      <div class="load-more-container">
        <button class="btn btn-primary load-more-btn" onclick="loadMoreFilterItems()" id="load-more-filter-btn">
          <svg viewBox="0 0 24 24" fill="currentColor" width="20" height="20">
            <path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z"/>
          </svg>
          <span id="load-more-filter-text">Ver Mais</span>
        </button>
      </div>
    </section>
  `;

  // Restaura valores dos selects após renderizar
  setTimeout(() => {
    if (genreSelect) {
      const genreEl = document.getElementById('filter-genre');
      if (genreEl) genreEl.value = genreSelect;
    }
    if (yearSelect) {
      const yearEl = document.getElementById('filter-year');
      if (yearEl) yearEl.value = yearSelect;
    }
    if (sortSelect) {
      const sortEl = document.getElementById('filter-sort');
      if (sortEl) sortEl.value = sortSelect;
    }
    if (typeSelect) {
      const typeEl = document.getElementById('filter-type');
      if (typeEl) typeEl.value = typeSelect;
    }
  }, 0);
}

// Expõe função globalmente para onclick
window.loadMoreFilterItems = loadMoreFilterItems;

function createLoadingHTML() {
  return `
    <div class="loading-container" style="display: flex; flex-direction: column; align-items: center; justify-content: center; min-height: 50vh; gap: 20px;">
      <div class="spinner"></div>
      <p style="color: var(--text-secondary);">Carregando...</p>
    </div>
  `;
}

function createErrorHTML() {
  return `
    <div class="error-container" style="display: flex; flex-direction: column; align-items: center; justify-content: center; min-height: 50vh; gap: 20px; text-align: center; padding: 20px;">
      <svg viewBox="0 0 24 24" fill="var(--accent-primary)" width="64" height="64">
        <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"/>
      </svg>
      <h2 style="font-size: 1.5rem;">Ops! Algo deu errado</h2>
      <p style="color: var(--text-secondary);">Não foi possível carregar o conteúdo. Tente novamente.</p>
      <button class="btn btn-primary" onclick="location.reload()">Recarregar</button>
    </div>
  `;
}

// Adiciona estilos extras pro Hero
const extraStyles = `
  .hero-dots {
    position: absolute;
    bottom: 30px;
    left: 50%;
    transform: translateX(-50%);
    display: flex;
    gap: 10px;
    z-index: 20;
  }

  @media (max-width: 768px) {
    .hero-dots {
      bottom: 15px;
    }
  }
  
  .hero-dot {
    width: 12px;
    height: 12px;
    border-radius: 50%;
    background: rgba(255, 255, 255, 0.3);
    border: none;
    cursor: pointer;
    transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
    will-change: transform, background;
  }
  
  .hero-dot:hover {
    background: rgba(255, 255, 255, 0.6);
    transform: scale(1.15);
  }
  
  .hero-dot.active {
    background: var(--accent-primary);
    transform: scale(1.3);
    box-shadow: 0 0 10px rgba(229, 9, 20, 0.5);
  }
  
  .search-no-results {
    padding: 20px;
    text-align: center;
    color: var(--text-muted);
  }

  /* Fix for Mobile Overflow */
  body, .app-container, .main-content {
    overflow-x: hidden;
    width: 100%;
  }

  /* Carousel Styles */
  .carousel-container {
    position: relative;
    width: 100%;
    margin-bottom: var(--spacing-md);
  }

  .movies-row {
    scroll-behavior: smooth;
    scroll-snap-type: x mandatory; /* Requested: Mandatory scroll snap */
    -webkit-overflow-scrolling: touch;
    padding-bottom: 20px; /* Space for scrollbar if needed, or visual breathing room */
  }
  
  /* Ensure cards snap correctly */
  .movie-card {
    scroll-snap-align: start;
  }

  .carousel-btn {
    position: absolute;
    top: 50%;
    transform: translateY(-50%);
    width: 50px;
    height: 100%;
    background: rgba(0, 0, 0, 0.5); /* Semi-transparent black */
    border: none;
    color: white;
    cursor: pointer;
    z-index: 100;
    opacity: 1; /* Requested: ALWAYS VISIBLE or easily seen */
    transition: all 0.3s ease;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: var(--border-radius-md);
  }
  
  .carousel-btn:hover {
    background: rgba(0, 0, 0, 0.8);
    color: var(--accent-primary);
  }

  .carousel-btn.prev {
    left: 0; /* Stick to edge */
    background: linear-gradient(90deg, rgba(0,0,0,0.9), transparent);
  }

  .carousel-btn.next {
    right: 0; /* Stick to edge */
    background: linear-gradient(270deg, rgba(0,0,0,0.9), transparent);
  }

  /* Mobile: Hide buttons, allow touch scroll */
  @media (max-width: 768px) {
    .carousel-btn {
      display: none;
    }
  }
`;

const styleEl = document.createElement('style');
styleEl.textContent = extraStyles;
document.head.appendChild(styleEl);
