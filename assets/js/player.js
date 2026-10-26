/* ============================================
   🎬 BLLUFLIX - Player Module
   Sistema de player com múltiplos servidores
   FOCO: Servidores brasileiros com DUBLADO PT-BR
   ============================================ */

// Servidores de streaming - PRIORIDADE PARA DUBLADO EM PORTUGUÊS
const STREAMING_SERVERS = {
  // Servidores para filmes
  movie: [
    // === DUBLADO EM PORTUGUÊS (BR) ===
    {
      id: 'myembed',
      name: '🎙️ PlayerFlix',
      type: 'dubbed',
      getUrl: (tmdbId) => `https://myembed.biz/filme/${tmdbId}`
    },
    {
      id: 'superflixapi',
      name: '🎙️ SuperFlix',
      type: 'dubbed',
      getUrl: (tmdbId) => `https://superflixapi.fun/filme/${tmdbId}`
    },
    {
      id: 'megaembed',
      name: '🎙️ MegaEmbed',
      type: 'dubbed',
      getUrl: (tmdbId) => `https://megaembed.com/embed/${tmdbId}`
    }
  ],

  // Servidores para séries
  tv: [
    // === DUBLADO EM PORTUGUÊS (BR) ===
    {
      id: 'myembed-tv',
      name: '🎙️ PlayerFlix',
      type: 'dubbed',
      // Abre na página de seleção de episódios da temporada (sem especificar episódio)
      getUrl: (tmdbId) => `https://myembed.biz/serie/${tmdbId}`
    },
    {
      id: 'superflixapi-tv',
      name: '🎙️ SuperFlix',
      type: 'dubbed',
      getUrl: (tmdbId, season, episode) => `https://superflixapi.fun/serie/${tmdbId}/${season}/${episode}`
    },
    {
      id: 'megaembed-tv',
      name: '🎙️ MegaEmbed',
      type: 'dubbed',
      getUrl: (tmdbId, season, episode) => `https://megaembed.com/embed/${tmdbId}/${season}/${episode}`
    }
  ]
};

// Classe do Player
class StreamPlayer {
  constructor(containerId) {
    this.container = document.getElementById(containerId);
    this.currentServer = null;
    this.mediaType = 'movie';
    this.mediaId = null;
    this.imdbId = null; // IMDB ID para servidores que exigem (ex: PlayerFlix)
    this.season = null;
    this.episode = null;
  }

  // Inicializa o player para um filme
  // imdbId é opcional, passado quando disponível (para servidores como PlayerFlix)
  initMovie(tmdbId, imdbId = null) {
    this.mediaType = 'movie';
    this.mediaId = tmdbId;
    this.imdbId = imdbId;
    this.season = null;
    this.episode = null;
    this.renderServerTabs();
    // Começa com o primeiro servidor DUBLADO
    this.loadServer(STREAMING_SERVERS.movie[0].id);
  }

  // Inicializa o player para uma série
  initTV(tmdbId, season = 1, episode = 1) {
    this.mediaType = 'tv';
    this.mediaId = tmdbId;
    this.season = season;
    this.episode = episode;
    this.renderServerTabs();
    // Começa com o primeiro servidor DUBLADO
    this.loadServer(STREAMING_SERVERS.tv[0].id);
  }

  // Renderiza as abas de servidor
  renderServerTabs() {
    const servers = STREAMING_SERVERS[this.mediaType];
    const tabsContainer = document.getElementById('server-tabs');

    if (!tabsContainer) return;

    // Separa servidores por tipo
    const dubbedServers = servers.filter(s => s.type === 'dubbed');
    const subtitledServers = servers.filter(s => s.type === 'subtitled');

    console.log(`[Player] Renderizando tabs. Dublado: ${dubbedServers.length}, Legendado: ${subtitledServers.length}`);

    let html = '';

    // Dublado Group
    if (dubbedServers.length > 0) {
      html += `
        <div class="server-group">
          <span class="server-group-label" style="color: #4ade80;">🎙️ Dublado:</span>
          <div class="server-buttons">
            ${dubbedServers.map(server => `
              <button class="server-tab" data-server="${server.id}" title="Servidor com áudio em português">
                ${server.name.replace('🎙️ ', '')}
              </button>
            `).join('')}
          </div>
        </div>
      `;
    }

    // Legendado Group
    if (subtitledServers.length > 0) {
      html += `
        <div class="server-group">
          <span class="server-group-label" style="color: #60a5fa;">📝 Legendado:</span>
          <div class="server-buttons">
            ${subtitledServers.map(server => `
              <button class="server-tab" data-server="${server.id}" title="Servidor com legenda">
                ${server.name.replace('📝 ', '')}
              </button>
            `).join('')}
          </div>
        </div>
      `;
    }

    // DNS Notice - destacado
    html += `
      <div class="dns-notice" style="background: linear-gradient(90deg, rgba(229, 9, 20, 0.2), rgba(255, 215, 0, 0.1)); border: 1px solid rgba(255, 215, 0, 0.5); border-radius: 8px; padding: 10px 15px; margin-bottom: 12px; text-align: center;">
        <a href="help.html" style="margin: 0; font-size: 0.9rem; color: #ffd700; font-weight: 600; text-decoration: none;">
          ⚠️ Ative o <strong style="text-decoration: underline;">dns.adguard.com</strong> para que o player carregue
        </a>
      </div>
    `;
    html += '<p class="server-tip">💡 Clique nas opções acima para trocar de player. <br> Se não tiver dublado, aperte em "< Escolha outro video" para por em Dublado.</p>';
    tabsContainer.innerHTML = html;

    // Adiciona event listeners
    tabsContainer.querySelectorAll('.server-tab').forEach(tab => {
      tab.addEventListener('click', () => {
        this.loadServer(tab.dataset.server);
      });
    });
  }

  // Carrega um servidor específico
  loadServer(serverId) {
    const servers = STREAMING_SERVERS[this.mediaType];
    const server = servers.find(s => s.id === serverId || (serverId === 'playerflixapi' && s.id === 'myembed') || (serverId === 'playerflixapi-tv' && s.id === 'myembed-tv'));

    if (!server) {
      console.error('Servidor não encontrado:', serverId);
      return;
    }

    this.currentServer = server;

    // Atualiza tabs ativas
    document.querySelectorAll('.server-tab').forEach(tab => {
      tab.classList.toggle('active', tab.dataset.server === server.id);
    });

    // Gera URL do embed
    let embedUrl;
    if (this.mediaType === 'movie') {
      // Se o servidor requer IMDB ID e temos disponível, usa ele
      if (server.requiresImdbId && this.imdbId) {
        embedUrl = server.getUrl(this.imdbId);
      } else if (server.requiresImdbId && !this.imdbId) {
        // Servidor requer IMDB ID mas não temos - mostra erro
        this.showServerError('Este servidor requer IMDB ID que não está disponível para este filme.');
        return;
      } else {
        embedUrl = server.getUrl(this.mediaId);
      }
    } else {
      embedUrl = server.getUrl(this.mediaId, this.season, this.episode);
    }

    // Carrega o iframe
    this.loadEmbed(embedUrl);
  }

  // Carrega o embed no container
  loadEmbed(url) {
    if (!this.container) return;

    // Mostra loading
    this.container.innerHTML = `
      <div class="player-loading">
        <div class="spinner"></div>
        <p>Carregando player...</p>
        <p style="font-size: 0.8rem; color: var(--text-muted);">Servidor: ${this.currentServer?.name || 'Desconhecido'}</p>
      </div>
    `;

    // Cria iframe após pequeno delay para suavizar
    setTimeout(() => {
      this.container.innerHTML = `
        <iframe
          src="${url}"
          frameborder="0"
          allowfullscreen
          allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
          referrerpolicy="no-referrer"
          scrolling="no"
        ></iframe>
      `;
    }, 500);
  }

  // Muda para próximo servidor (fallback)
  nextServer() {
    const servers = STREAMING_SERVERS[this.mediaType];
    const currentIndex = servers.findIndex(s => s.id === this.currentServer.id);
    const nextIndex = (currentIndex + 1) % servers.length;
    this.loadServer(servers[nextIndex].id);
  }

  // Muda episódio (para séries)
  changeEpisode(season, episode) {
    if (this.mediaType !== 'tv') return;
    this.season = season;
    this.episode = episode;
    // Se há um servidor ativo, recarrega com o novo episódio
    if (this.currentServer) {
      this.loadServer(this.currentServer.id);
    }
  }

  // Limpa o player
  destroy() {
    if (this.container) {
      this.container.innerHTML = '';
    }
    this.currentServer = null;
    this.mediaId = null;
    this.imdbId = null;
  }

  // Mostra erro no container do player
  showServerError(message) {
    if (!this.container) return;

    this.container.innerHTML = `
      <div class="player-loading" style="text-align: center;">
        <svg viewBox="0 0 24 24" fill="var(--accent-primary)" width="48" height="48" style="margin-bottom: 12px;">
          <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"/>
        </svg>
        <p style="color: var(--text-secondary); margin-bottom: 8px;">${message}</p>
        <p style="font-size: 0.8rem; color: var(--text-muted);">Tente outro servidor acima.</p>
      </div>
    `;
  }
}

// Estilos adicionais para o player
const playerStyles = `
  .server-group {
    display: flex;
    align-items: center;
    gap: 12px;
    margin-bottom: 12px;
    flex-wrap: wrap;
  }

  .server-group-label {
    font-size: 0.9rem;
    color: var(--text-secondary);
    font-weight: 600;
    min-width: 150px;
  }

  .server-buttons {
    display: flex;
    gap: 8px;
    flex-wrap: wrap;
  }

  .server-tab {
    padding: 10px 18px;
    background: var(--bg-tertiary);
    border: 2px solid var(--border-color);
    border-radius: 8px;
    font-size: 0.9rem;
    color: var(--text-secondary);
    transition: all 0.2s ease;
    cursor: pointer;
    font-weight: 500;
  }

  .server-tab:hover {
    background: var(--bg-card);
    color: var(--text-primary);
    border-color: var(--accent-primary);
    transform: translateY(-2px);
  }

  .server-tab.active {
    background: var(--accent-primary);
    border-color: var(--accent-primary);
    color: white;
    box-shadow: 0 0 20px rgba(229, 9, 20, 0.4);
  }

  #server-tabs {
    margin-bottom: 20px;
    padding: 16px;
    background: var(--bg-tertiary);
    border-radius: 12px;
  }

  .server-tip {
    margin-top: 12px;
    font-size: 0.85rem;
    color: var(--text-muted);
    text-align: center;
  }

  /* === MOBILE RESPONSIVE - Afasta botões do X === */
  @media (max-width: 768px) {
    .server-group {
      padding-right: 40px; /* Espaço para o botão X */
    }

    .server-group-label {
      min-width: auto;
      font-size: 0.8rem;
    }

    .server-tab {
      padding: 8px 14px;
      font-size: 0.85rem;
    }

    #server-tabs {
      padding: 12px;
      padding-right: 50px; /* Espaço extra para o botão X */
    }

    .dns-notice {
      margin-top: 8px;
      margin-right: -38px; /* Compensa o padding-right do container para alinhar com o X */
      text-align: center;
    }

    .server-tip {
      font-size: 0.75rem;
      text-align: center;
      line-height: 1.5;
      margin-right: -38px; /* Alinha com o DNS notice */
    }
  }

  @media (max-width: 480px) {
    .server-group {
      padding-right: 35px;
    }

    .server-group-label {
      font-size: 0.75rem;
    }

    .server-tab {
      padding: 6px 12px;
      font-size: 0.8rem;
    }

    #server-tabs {
      padding: 10px;
      padding-right: 45px;
    }

    .dns-notice {
      margin-top: 10px;
      margin-right: -35px !important; /* Compensa o padding-right para alinhar com o X */
      padding: 8px 10px !important;
      font-size: 0.8rem !important;
    }

    .dns-notice a {
      font-size: 0.8rem !important;
      line-height: 1.4;
    }

    .server-tip {
      font-size: 0.7rem !important;
      line-height: 1.5;
      padding: 0 10px;
      text-align: center;
      margin-right: -35px; /* Alinha com o DNS notice */
    }
  }
`;

// Injeta estilos
const styleSheet = document.createElement('style');
styleSheet.textContent = playerStyles;
document.head.appendChild(styleSheet);

// Exporta para uso global
window.StreamPlayer = StreamPlayer;
window.STREAMING_SERVERS = STREAMING_SERVERS;

console.log('🎬 Player carregado - Servidores brasileiros com dublado PT-BR disponíveis!');
