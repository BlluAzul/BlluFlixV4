<?php

function superflix_api() {
    ?>
<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<style>
/* Reset e Base */
*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
/* ===== Elevation fix: make calendar popovers and cells sit above everything ===== */

/* Allow overflow so popovers are not clipped by wrappers/cards */
.sfx-card,
.sfx-calendar-wrapper,
#sfx-calendar,
#sfx-calendar .fc-scroller,
.fc-scroller-harness,
.fc-scroller {
  overflow: visible !important;
}

/* If browser supports :has(), only open the calendar card overflow */
.sfx-card:has(#sfx-calendar) {
  overflow: visible !important;
}

/* Popovers above all UI */
.fc-popover,
.fc-more-popover {
  z-index: 2147483647 !important; /* top of the stack */
  position: absolute !important;
  background: var(--bg-secondary) !important;
  border: 1px solid var(--border) !important;
  box-shadow: var(--shadow-lg, 0 10px 40px rgba(0,0,0,.5)) !important;
}

/* Popover internals (dark theme) */
.fc-popover-header {
  background: rgba(255,255,255,0.05) !important;
  color: var(--text-primary) !important;
  border-bottom: 1px solid var(--border) !important;
}
.fc-popover-body {
  color: var(--text-primary) !important;
}

/* Ensure day cells and "more" link stack above events */
.fc-daygrid-day,
.fc-day,
.fc-day-wed,
.fc-day-past,
.fc-day-today,
.fc-daygrid-more-link {
  position: relative;
  z-index: 10010 !important;
}

/* Events sit below popovers but above base grid */
.fc-event,
.fc-daygrid-event {
  z-index: 1000 !important;
}

/* ===== Presentation styles (dark) – prevents white backgrounds ===== */
.presentation,
[role="presentation"],
.fc table[role="presentation"] {
  background: var(--bg-secondary) !important;
  color: var(--text-primary) !important;
  border-color: var(--border) !important;
}

.presentation th,
.presentation td,
.fc table[role="presentation"] th,
.fc table[role="presentation"] td {
  background: transparent !important;
  color: var(--text-primary) !important;
  border-color: var(--border) !important;
}

.presentation a,
.fc table[role="presentation"] a {
  color: var(--accent) !important;
}

/* Prevenir FOUC */
#sfx-panel { opacity: 0; transition: opacity 0.3s ease; }
#sfx-panel.loaded { opacity: 1; }

/* Variáveis do tema escuro moderno */
#sfx-panel {
  --bg-primary: #0a0e1a;
  --bg-secondary: #111827;
  --bg-card: rgba(17, 24, 39, 0.6);
  --bg-hover: rgba(31, 41, 55, 0.8);
  --text-primary: #f3f4f6;
  --text-secondary: #9ca3af;
  --text-muted: #6b7280;
  
  --accent: #3b82f6;
  --accent-hover: #60a5fa;
  --success: #10b981;
  --warning: #f59e0b;
  --danger: #ef4444;
  --info: #8b5cf6;
  
  --border: rgba(255, 255, 255, 0.08);
  --border-light: rgba(255, 255, 255, 0.04);
  
  --shadow-sm: 0 2px 8px rgba(0, 0, 0, 0.3);
  --shadow-md: 0 4px 16px rgba(0, 0, 0, 0.4);
  --shadow-lg: 0 10px 40px rgba(0, 0, 0, 0.5);
  --shadow-glow: 0 0 40px rgba(59, 130, 246, 0.15);
  
  --gradient-bg: linear-gradient(135deg, #0a0e1a 0%, #111827 100%);
  --gradient-accent: linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%);
  --gradient-card: linear-gradient(135deg, rgba(17, 24, 39, 0.9) 0%, rgba(17, 24, 39, 0.6) 100%);
  
  min-height: 100vh;
  background: var(--gradient-bg);
  color: var(--text-primary);
  font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  font-size: 14px;
  line-height: 1.6;
  padding: 20px;
  position: relative;
  overflow-x: hidden;
}

/* Background decoration */
#sfx-panel::before {
  content: '';
  position: fixed;
  top: -50%;
  right: -50%;
  width: 200%;
  height: 200%;
  background: radial-gradient(circle at 20% 50%, rgba(59, 130, 246, 0.1) 0%, transparent 50%),
              radial-gradient(circle at 80% 80%, rgba(139, 92, 246, 0.08) 0%, transparent 50%),
              radial-gradient(circle at 40% 20%, rgba(16, 185, 129, 0.05) 0%, transparent 50%);
  pointer-events: none;
  z-index: 0;
}

#sfx-panel > * { position: relative; z-index: 1; }

/* Loader aprimorado */
.sfx-loader {
  position: fixed;
  inset: 0;
  background: var(--bg-primary);
  z-index: 9999;
  display: flex;
  align-items: center;
  justify-content: center;
  backdrop-filter: blur(20px);
}

.sfx-loader-inner {
  text-align: center;
  animation: fadeInUp 0.6s ease;
}

.sfx-loader-logo {
  width: 116px;
  height: 47px;
  margin-bottom: 24px;
  filter: drop-shadow(0 0 30px rgba(59, 130, 246, 0.5));
}

.sfx-pulse-ring {
  width: 60px;
  height: 60px;
  margin: 0 auto 16px;
  position: relative;
}

.sfx-pulse-ring::before,
.sfx-pulse-ring::after {
  content: '';
  position: absolute;
  inset: 0;
  border: 2px solid var(--accent);
  border-radius: 50%;
  animation: pulse 2s ease-out infinite;
}

.sfx-pulse-ring::after {
  animation-delay: 1s;
}

@keyframes pulse {
  0% { transform: scale(1); opacity: 1; }
  100% { transform: scale(1.5); opacity: 0; }
}

@keyframes fadeInUp {
  from { opacity: 0; transform: translateY(20px); }
  to { opacity: 1; transform: translateY(0); }
}

/* Container */
.sfx-container {
  max-width: 1400px;
  margin: 0 auto;
  animation: fadeIn 0.6s ease;
}

@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}

/* Header Hero aprimorado */
.sfx-hero {
  background: var(--gradient-card);
  border: 1px solid var(--border);
  border-radius: 20px;
  padding: 32px;
  margin-bottom: 32px;
  backdrop-filter: blur(10px);
  box-shadow: var(--shadow-lg), var(--shadow-glow);
  position: relative;
  overflow: hidden;
}

.sfx-hero::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 1px;
  background: linear-gradient(90deg, transparent, var(--accent), transparent);
  animation: shimmer 3s ease infinite;
}

@keyframes shimmer {
  0% { transform: translateX(-100%); }
  100% { transform: translateX(100%); }
}

.sfx-hero-content {
  display: grid;
  grid-template-columns: auto 1fr;
  gap: 24px;
  align-items: center;
  margin-bottom: 24px;
}

.sfx-logo-wrapper {
  padding: 12px;
  background: rgba(255, 255, 255, 0.05);
  border-radius: 16px;
  border: 1px solid var(--border);
  backdrop-filter: blur(10px);
}

.sfx-logo {
  display: block;
  width: 116px;
  height: 47px;
}

.sfx-hero-text h1 {
  font-size: 32px;
  font-weight: 700;
  background: var(--gradient-accent);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  margin-bottom: 8px;
}

.sfx-hero-text p {
  color: var(--text-secondary);
  font-size: 15px;
  line-height: 1.6;
  margin-bottom: 12px;
}

.sfx-status {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 6px 16px;
  background: rgba(16, 185, 129, 0.1);
  border: 1px solid rgba(16, 185, 129, 0.3);
  border-radius: 50px;
  font-size: 13px;
  color: var(--success);
  font-weight: 500;
}

.sfx-status-dot {
  width: 8px;
  height: 8px;
  background: var(--success);
  border-radius: 50%;
  animation: blink 2s ease infinite;
}

@keyframes blink {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.5; }
}

/* Quick Actions Grid */
.sfx-quick-actions {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
  gap: 16px;
}

.sfx-action-card {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 20px;
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid var(--border);
  border-radius: 12px;
  text-decoration: none;
  color: var(--text-primary);
  transition: all 0.3s ease;
  position: relative;
  overflow: hidden;
}

.sfx-action-card::before {
  content: '';
  position: absolute;
  inset: 0;
  background: var(--gradient-accent);
  opacity: 0;
  transition: opacity 0.3s ease;
}

.sfx-action-card:hover {
  transform: translateY(-4px);
  box-shadow: var(--shadow-lg);
  border-color: var(--accent);
}

.sfx-action-card:hover::before {
  opacity: 0.1;
}

.sfx-action-icon {
  position: relative;
  z-index: 1;
  width: 40px;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--gradient-accent);
  border-radius: 10px;
  flex-shrink: 0;
}

.sfx-action-icon svg {
  width: 20px;
  height: 20px;
  color: white;
}

.sfx-action-text {
  position: relative;
  z-index: 1;
}

.sfx-action-text strong {
  display: block;
  font-size: 15px;
  font-weight: 600;
  margin-bottom: 4px;
}

.sfx-action-text small {
  color: var(--text-secondary);
  font-size: 12px;
}

/* Main Grid */
.sfx-main-grid {
  display: grid;
  gap: 24px;
  margin-top: 32px;
}

/* Cards modernos */
.sfx-card {
  background: var(--bg-card);
  border: 1px solid var(--border);
  border-radius: 16px;
  backdrop-filter: blur(10px);
  box-shadow: var(--shadow-md);
  overflow: hidden;
}

.sfx-card-header {
  padding: 20px 24px;
  background: rgba(255, 255, 255, 0.02);
  border-bottom: 1px solid var(--border);
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 16px;
}

.sfx-card-title {
  display: flex;
  align-items: center;
  gap: 12px;
  font-size: 18px;
  font-weight: 600;
}

.sfx-card-title svg {
  width: 20px;
  height: 20px;
  color: var(--accent);
}

.sfx-card-subtitle {
  color: var(--text-secondary);
  font-size: 13px;
  margin-top: 4px;
}

.sfx-card-body {
  padding: 24px;
}

/* Buttons modernos */
.sfx-btn {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 10px 20px;
  background: var(--gradient-accent);
  color: white;
  border: none;
  border-radius: 10px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.3s ease;
  text-decoration: none;
  white-space: nowrap;
}

.sfx-btn:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 20px rgba(59, 130, 246, 0.3);
  filter: brightness(1.1);
}

.sfx-btn svg {
  width: 16px;
  height: 16px;
}

.sfx-btn-secondary {
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid var(--border);
  color: var(--text-primary);
}

.sfx-btn-secondary:hover {
  background: rgba(255, 255, 255, 0.08);
  border-color: var(--accent);
  box-shadow: none;
}

.sfx-btn-icon {
  width: 36px;
  height: 36px;
  padding: 0;
  justify-content: center;
  border-radius: 50%;
}

/* Forms modernos */
.sfx-form-group {
  margin-bottom: 20px;
}

.sfx-form-group label {
  display: block;
  margin-bottom: 8px;
  font-weight: 500;
  color: var(--text-secondary);
  font-size: 13px;
}

.sfx-input,
.sfx-select {
  width: 100%;
  padding: 12px 16px;
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid var(--border);
  border-radius: 10px;
  color: var(--text-primary);
  font-size: 14px;
  transition: all 0.3s ease;
}

.sfx-input:focus,
.sfx-select:focus {
  outline: none;
  border-color: var(--accent);
  background: rgba(255, 255, 255, 0.05);
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
}

.sfx-input-group {
  display: flex;
  gap: 12px;
  align-items: center;
}

.sfx-input-group .sfx-input {
  flex: 1;
}

/* Checkboxes customizados */
.sfx-checkbox-group {
  display: flex;
  gap: 16px;
  flex-wrap: wrap;
}

.sfx-checkbox {
  display: flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
  user-select: none;
}

.sfx-checkbox input[type="checkbox"] {
  appearance: none;
  width: 18px;
  height: 18px;
  border: 2px solid var(--border);
  border-radius: 4px;
  background: rgba(255, 255, 255, 0.03);
  cursor: pointer;
  position: relative;
  transition: all 0.3s ease;
}

.sfx-checkbox input[type="checkbox"]:checked {
  background: var(--gradient-accent);
  border-color: var(--accent);
}

.sfx-checkbox input[type="checkbox"]:checked::after {
  content: '✓';
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  font-size: 12px;
  font-weight: bold;
}

/* Toolbar aprimorado */
.sfx-toolbar {
  display: flex;
  gap: 16px;
  padding: 16px 24px;
  background: rgba(255, 255, 255, 0.02);
  border-bottom: 1px solid var(--border);
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
}

.sfx-toolbar-group {
  display: flex;
  gap: 12px;
  align-items: center;
  flex-wrap: wrap;
}

/* Calendar customizado */
.sfx-calendar-wrapper {
  padding: 24px;
  min-height: 500px;
}

/* Status badges */
.sfx-badge {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 6px 12px;
  border-radius: 20px;
  font-size: 12px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.sfx-badge-hoje {
  background: rgba(245, 158, 11, 0.15);
  color: var(--warning);
  border: 1px solid rgba(245, 158, 11, 0.3);
}

.sfx-badge-futuro {
  background: rgba(59, 130, 246, 0.15);
  color: var(--accent);
  border: 1px solid rgba(59, 130, 246, 0.3);
}

.sfx-badge-atrasado {
  background: rgba(239, 68, 68, 0.15);
  color: var(--danger);
  border: 1px solid rgba(239, 68, 68, 0.3);
}

.sfx-badge-ok {
  background: rgba(16, 185, 129, 0.15);
  color: var(--success);
  border: 1px solid rgba(16, 185, 129, 0.3);
}

/* Calendar FullCalendar overrides */
.fc {
  background: transparent !important;
}

.fc-theme-standard td,
.fc-theme-standard th {
  border-color: var(--border) !important;
}

.fc-theme-standard .fc-scrollgrid {
  border-color: var(--border) !important;
}

.fc .fc-button {
  background: rgba(255, 255, 255, 0.05) !important;
  border: 1px solid var(--border) !important;
  color: var(--text-primary) !important;
  border-radius: 8px !important;
  padding: 8px 16px !important;
  font-weight: 500 !important;
  transition: all 0.3s ease !important;
}

.fc .fc-button:hover:not(:disabled) {
  background: rgba(255, 255, 255, 0.08) !important;
  border-color: var(--accent) !important;
}

.fc .fc-button-primary:not(:disabled).fc-button-active {
  background: var(--gradient-accent) !important;
  border-color: var(--accent) !important;
}

.fc .fc-toolbar-title {
  color: var(--text-primary) !important;
  font-size: 20px !important;
  font-weight: 600 !important;
}

.fc .fc-col-header-cell-cushion,
.fc .fc-daygrid-day-number {
  color: var(--text-primary) !important;
  text-decoration: none !important;
}

.fc .fc-day-today {
  background: rgba(59, 130, 246, 0.05) !important;
}

.fc-event {
  border-radius: 6px !important;
  padding: 4px 8px !important;
  margin: 2px !important;
  cursor: pointer !important;
  transition: transform 0.2s ease !important;
}

.fc-event:hover {
  transform: scale(1.05) !important;
  z-index: 10 !important;
}

.fc-daygrid-event {
  white-space: normal !important;
}

.fc-popover {
  background: var(--bg-secondary) !important;
  border-color: var(--border) !important;
}

.fc-popover-header {
  background: rgba(255, 255, 255, 0.05) !important;
  color: var(--text-primary) !important;
}

/* Event customization */
.sfx-event-wrapper {
  padding: 2px 6px;
  border-radius: 4px;
  font-size: 11px;
  display: flex;
  align-items: center;
  gap: 4px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.sfx-event-type {
  font-size: 10px;
  padding: 1px 4px;
  border-radius: 3px;
  background: rgba(0, 0, 0, 0.2);
  font-weight: 600;
}

/* Doc section */
.sfx-doc-section {
  margin-bottom: 24px;
}

.sfx-doc-section h3 {
  color: var(--text-primary);
  font-size: 16px;
  margin-bottom: 12px;
  padding-bottom: 8px;
  border-bottom: 1px solid var(--border);
}

.sfx-doc-section ul {
  list-style: none;
  padding: 0;
}

.sfx-doc-section li {
  color: var(--text-secondary);
  padding: 8px 0;
  padding-left: 20px;
  position: relative;
}

.sfx-doc-section li::before {
  content: '→';
  position: absolute;
  left: 0;
  color: var(--accent);
}

.sfx-doc-section code {
  background: rgba(59, 130, 246, 0.1);
  color: var(--accent);
  padding: 2px 6px;
  border-radius: 4px;
  font-family: 'Fira Code', monospace;
  font-size: 12px;
}

/* URL display */
.sfx-url-display {
  padding: 16px;
  background: rgba(0, 0, 0, 0.3);
  border: 1px solid var(--border);
  border-radius: 10px;
  font-family: 'Fira Code', monospace;
  font-size: 13px;
  color: var(--accent);
  word-break: break-all;
  margin: 16px 0;
}

/* Loading state */
.sfx-loading {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 40px;
  color: var(--text-secondary);
}

.sfx-spinner {
  width: 32px;
  height: 32px;
  border: 3px solid var(--border);
  border-top-color: var(--accent);
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
  margin-right: 12px;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

/* Responsive */
@media (max-width: 768px) {
  #sfx-panel {
    padding: 12px;
  }

  .sfx-hero {
    padding: 20px;
  }

  .sfx-hero-content {
    grid-template-columns: 1fr;
    text-align: center;
  }

  .sfx-logo-wrapper {
    margin: 0 auto;
  }

  .sfx-hero-text h1 {
    font-size: 24px;
  }

  .sfx-quick-actions {
    grid-template-columns: 1fr;
  }

  .sfx-toolbar {
    padding: 12px;
  }

  .sfx-toolbar-group {
    width: 100%;
  }
}

/* Custom scrollbar */
#sfx-panel ::-webkit-scrollbar {
  width: 8px;
  height: 8px;
}

#sfx-panel ::-webkit-scrollbar-track {
  background: rgba(255, 255, 255, 0.02);
}

#sfx-panel ::-webkit-scrollbar-thumb {
  background: rgba(255, 255, 255, 0.1);
  border-radius: 4px;
}

#sfx-panel ::-webkit-scrollbar-thumb:hover {
  background: rgba(255, 255, 255, 0.15);
}

/* Tooltips */
[title] {
  position: relative;
}

/* Notyf overrides */
.notyf__toast {
  border-radius: 10px !important;
  backdrop-filter: blur(10px);
  font-family: 'Inter', sans-serif !important;
}

.notyf__toast--success {
  background: rgba(16, 185, 129, 0.9) !important;
}

.notyf__toast--error {
  background: rgba(239, 68, 68, 0.9) !important;
}
</style>

<!-- Fonts -->
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Fira+Code:wght@400;500&display=swap" rel="stylesheet">

<!-- Dependencies -->
<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/notyf@3/notyf.min.css">
<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/fullcalendar@6.1.15/index.global.min.css">
</head>
<body>

<div id="sfx-panel">
  <!-- Loader -->
  <div class="sfx-loader">
    <div class="sfx-loader-inner">
      <img class="sfx-loader-logo" src="https://superflixapi.fun/img/logo.png?v=1.0.0" alt="SuperFlix API">
      <div class="sfx-pulse-ring"></div>
      <p style="color: var(--text-secondary);">Inicializando sistema...</p>
    </div>
  </div>

  <div class="sfx-container">
    <!-- Header Hero -->
    <div class="sfx-hero">
      <div class="sfx-hero-content">
        <div class="sfx-logo-wrapper">
          <img class="sfx-logo" src="https://superflixapi.fun/img/logo.png?v=1.0.0" alt="SuperFlix API">
        </div>
        <div class="sfx-hero-text">
          <h1>SuperFlix API</h1>
          <p>Sistema de integração ativa. Este plugin adiciona players automaticamente aos posts, sem postagem automática.</p>
          <div class="sfx-status">
            <span class="sfx-status-dot"></span>
            <span>Sistema Online</span>
          </div>
        </div>
      </div>

      <!-- Quick Actions -->
      <div class="sfx-quick-actions">
        <a href="https://superflixapi.fun/filmes?sort=date" target="_blank" class="sfx-action-card">
          <div class="sfx-action-icon">
            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 4v16M17 4v16M3 8h4m10 0h4M3 16h4m10 0h4"></path>
            </svg>
          </div>
          <div class="sfx-action-text">
            <strong>Filmes</strong>
            <small>Lista completa e atualizações</small>
          </div>
        </a>

        <a href="https://superflixapi.fun/series?sort=date" target="_blank" class="sfx-action-card">
          <div class="sfx-action-icon">
            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"></path>
            </svg>
          </div>
          <div class="sfx-action-text">
            <strong>Séries</strong>
            <small>Episódios e temporadas</small>
          </div>
        </a>

        <a href="https://superflixapi.fun/animes?sort=date" target="_blank" class="sfx-action-card">
          <div class="sfx-action-icon">
            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M14.828 14.828a4 4 0 01-5.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
            </svg>
          </div>
          <div class="sfx-action-text">
            <strong>Animes</strong>
            <small>Catálogo completo</small>
          </div>
        </a>

        <a href="https://superflixapi.fun/doramas?sort=date" target="_blank" class="sfx-action-card">
          <div class="sfx-action-icon">
            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"></path>
            </svg>
          </div>
          <div class="sfx-action-text">
            <strong>Doramas</strong>
            <small>Produções asiáticas</small>
          </div>
        </a>
      </div>
    </div>

    <!-- Main Grid -->
    <div class="sfx-main-grid">
      
      <!-- Calendar Card -->
      <div class="sfx-card">
        <div class="sfx-card-header">
          <div>
            <div class="sfx-card-title">
              <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"></path>
              </svg>
              Calendário de Lançamentos
            </div>
            <div class="sfx-card-subtitle">Acompanhe episódios e estreias em tempo real</div>
          </div>
          <button id="sfx-cal-toggle" class="sfx-btn sfx-btn-secondary">
            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path>
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"></path>
            </svg>
            <span id="cal-toggle-text">Mostrar Calendário</span>
          </button>
        </div>

        <div id="sfx-cal-wrap" style="display: none;">
          <div class="sfx-toolbar">
            <div class="sfx-toolbar-group">
              <div class="sfx-input-group">
                <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" style="width: 20px; height: 20px; color: var(--text-secondary);">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path>
                </svg>
                <input id="cal-search" class="sfx-input" type="search" placeholder="Buscar título ou episódio...">
              </div>
              
              <select id="cal-type" class="sfx-select" style="width: 140px;">
                <option value="">Todos os tipos</option>
                <option value="2">Séries</option>
                <option value="3">Animes</option>
              </select>
              
              <select id="cal-status" class="sfx-select" style="width: 140px;">
                <option value="">Todos os status</option>
                <option value="Hoje">Hoje</option>
                <option value="Futuro">Futuro</option>
                <option value="Atrasado">Atrasado</option>
                <option value="Atualizado">Atualizado</option>
              </select>
              
              <select id="cal-view" class="sfx-select" style="width: 120px;">
                <option value="dayGridMonth">Mês</option>
                <option value="timeGridWeek">Semana</option>
                <option value="listWeek">Lista</option>
              </select>
            </div>

            <div class="sfx-toolbar-group">
              <div class="sfx-checkbox-group">
                <label class="sfx-checkbox">
                  <input type="checkbox" id="chk-name" checked>
                  <span>Nome</span>
                </label>
                <label class="sfx-checkbox">
                  <input type="checkbox" id="chk-imdb" checked>
                  <span>IMDb</span>
                </label>
                <label class="sfx-checkbox">
                  <input type="checkbox" id="chk-tmdb" checked>
                  <span>TMDB</span>
                </label>
              </div>
              
              <button id="cal-reload" class="sfx-btn sfx-btn-icon" title="Recarregar dados">
                <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path>
                </svg>
              </button>
            </div>
          </div>

          <div class="sfx-calendar-wrapper">
            <div id="sfx-calendar"></div>
          </div>

          <div style="padding: 16px 24px; border-top: 1px solid var(--border); display: flex; justify-content: space-between; align-items: center;">
            <div style="display: flex; gap: 12px;">
              <span class="sfx-badge sfx-badge-hoje">Hoje</span>
              <span class="sfx-badge sfx-badge-futuro">Futuro</span>
              <span class="sfx-badge sfx-badge-atrasado">Atrasado</span>
              <span class="sfx-badge sfx-badge-ok">Atualizado</span>
            </div>
            <span id="cal-count" style="color: var(--text-secondary); font-size: 13px;"></span>
          </div>
        </div>
      </div>

      <!-- Generator Card -->
      <div class="sfx-card">
        <div class="sfx-card-header">
          <div>
            <div class="sfx-card-title">
              <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1"></path>
              </svg>
              Gerador de Endpoint
            </div>
            <div class="sfx-card-subtitle">Configure e gere URLs personalizadas para a API</div>
          </div>
          <button id="sfx-gen-toggle" class="sfx-btn sfx-btn-secondary">
            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4"></path>
            </svg>
            <span id="gen-toggle-text">Abrir Gerador</span>
          </button>
        </div>

        <div id="sfx-gen-wrap" style="display: none;">
          <div class="sfx-card-body">
            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 16px; margin-bottom: 20px;">
              <div class="sfx-form-group">
                <label>Categoria</label>
                <select id="f-category" class="sfx-select">
                  <option value="movie">movie - Filmes</option>
                  <option value="serie">serie - Séries</option>
                  <option value="anime">anime - Animes</option>
                </select>
              </div>
              
              <div class="sfx-form-group">
                <label>Tipo de ID</label>
                <select id="f-type" class="sfx-select">
                  <option value="tmdb">TMDB (padrão)</option>
                  <option value="imdb">IMDb</option>
                </select>
              </div>
              
              <div class="sfx-form-group">
                <label>Formato</label>
                <select id="f-format" class="sfx-select">
                  <option value="">HTML (lista)</option>
                  <option value="json">JSON</option>
                </select>
              </div>
              
              <div class="sfx-form-group">
                <label>Ordenação</label>
                <select id="f-order" class="sfx-select">
                  <option value="asc">Crescente</option>
                  <option value="desc">Decrescente</option>
                </select>
              </div>
            </div>

            <div class="sfx-url-display" id="f-url"></div>

            <div style="display: flex; gap: 12px; justify-content: center;">
              <button id="f-copy-url" class="sfx-btn">
                <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"></path>
                </svg>
                Copiar URL
              </button>
              <button id="f-open" class="sfx-btn sfx-btn-secondary">
                <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"></path>
                </svg>
                Abrir em nova aba
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- Documentation Card -->
      <div class="sfx-card">
        <div class="sfx-card-header">
          <div class="sfx-card-title">
            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
            </svg>
            Documentação Rápida
          </div>
        </div>
        
        <div class="sfx-card-body">
          <div class="sfx-doc-section">
            <h3>📅 Calendário de Lançamentos</h3>
            <ul>
              <li>Dados carregados de <code>/calendario.php</code> em tempo real</li>
              <li>Filtros dinâmicos por tipo, status e busca textual</li>
              <li>Visualizações: Mensal, Semanal e Lista</li>
              <li>Clique para copiar informações selecionadas</li>
              <li>Agrupamento automático de múltiplos episódios</li>
              <li>Cores indicativas de status para fácil identificação</li>
            </ul>
          </div>

          <div class="sfx-doc-section">
            <h3>🔗 Gerador de Endpoints</h3>
            <ul>
              <li>Endpoint base: <code>/lista</code></li>
              <li>Parâmetros: category, type, format, order</li>
              <li>Exemplo: <code>?category=anime&type=tmdb&format=json</code></li>
              <li>URL gerada automaticamente com preview</li>
              <li>Salvamento automático das preferências</li>
            </ul>
          </div>

          <div class="sfx-doc-section">
            <h3>💡 Dicas de Uso</h3>
            <ul>
              <li>Use os checkboxes para escolher o que copiar do calendário</li>
              <li>O calendário agrupa episódios do mesmo dia automaticamente</li>
              <li>As URLs geradas são salvas para próxima sessão</li>
              <li>Todos os links abrem em nova aba para não perder o trabalho</li>
            </ul>
          </div>
        </div>
      </div>

    </div>
  </div>
</div>

<!-- Scripts -->
<script src="https://cdn.jsdelivr.net/npm/notyf@3/notyf.min.js"></script>
<script src="https://cdn.jsdelivr.net/npm/fullcalendar@6.1.15/index.global.min.js"></script>
<script src="https://cdn.jsdelivr.net/npm/fullcalendar@6.1.15/locales/pt-br.global.min.js"></script>

<script>
(function() {
  'use strict';
  
  // Utilities
  const $ = (s, c = document) => c.querySelector(s);
  const $$ = (s, c = document) => Array.from(c.querySelectorAll(s));
  const base = 'https://superflixapi.fun';
  
  // Initialize Notyf
  const notyf = new Notyf({
    duration: 2000,
    position: { x: 'right', y: 'top' },
    ripple: false
  });
  
  // Remove loader and show content
  setTimeout(() => {
    const loader = $('.sfx-loader');
    const panel = $('#sfx-panel');
    if (loader) {
      loader.style.opacity = '0';
      setTimeout(() => {
        loader.remove();
        panel.classList.add('loaded');
      }, 300);
    }
  }, 500);

  // Copy to clipboard
  async function copyToClipboard(text) {
    try {
      await navigator.clipboard.writeText(text);
      notyf.success('Copiado com sucesso!');
    } catch (err) {
      notyf.error('Erro ao copiar');
    }
  }

  // === CALENDAR MODULE ===
  let calendar = null;
  let calendarData = [];
  let calendarAbort = null;
  let calendarLoaded = false;

  const calToggle = $('#sfx-cal-toggle');
  const calToggleText = $('#cal-toggle-text');
  const calWrap = $('#sfx-cal-wrap');
  const calContainer = $('#sfx-calendar');
  const calSearch = $('#cal-search');
  const calType = $('#cal-type');
  const calStatus = $('#cal-status');
  const calView = $('#cal-view');
  const calReload = $('#cal-reload');
  const calCount = $('#cal-count');

  const chkName = $('#chk-name');
  const chkImdb = $('#chk-imdb');
  const chkTmdb = $('#chk-tmdb');

  // Color mapping for status
  const STATUS_COLORS = {
    'Hoje': { bg: '#f59e0b', text: '#ffffff' },
    'Futuro': { bg: '#3b82f6', text: '#ffffff' },
    'Atrasado': { bg: '#ef4444', text: '#ffffff' },
    'Atualizado': { bg: '#10b981', text: '#ffffff' }
  };

  // Group events by date and title
  function groupEvents(events) {
    const grouped = {};
    
    events.forEach(event => {
      const key = `${event.air_date}_${event.title}_${event.type}`;
      if (!grouped[key]) {
        grouped[key] = {
          ...event,
          episodes: []
        };
      }
      grouped[key].episodes.push({
        season: event.season,
        number: event.number,
        episode: event.episode
      });
    });

    return Object.values(grouped);
  }

  // Convert data to calendar events
  function convertToCalendarEvents(data) {
    const grouped = groupEvents(data);
    
    return grouped.map(item => {
      const status = item.status || 'Atualizado';
      const color = STATUS_COLORS[status] || STATUS_COLORS.Atualizado;
      
      let title = item.title || '';
      
      // Single episode
      if (item.episodes.length === 1) {
        const ep = item.episodes[0];
        if (ep.season != null && ep.number != null) {
          title += ` - T${String(ep.season).padStart(2, '0')}E${String(ep.number).padStart(2, '0')}`;
        }
        if (ep.episode) {
          title += ` - ${ep.episode}`;
        }
      } else {
        // Multiple episodes on same day/title
        const nums = Array.from(new Set(item.episodes
          .map(ep => (ep.number != null ? `E${String(ep.number).padStart(2, '0')}` : ''))
          .filter(Boolean)));
        const preview = nums.slice(0, 4).join(', ');
        title += ` — ${item.episodes.length} episódios (${preview}${nums.length > 4 ? '…' : ''})`;
      }

      const typeLabel = String(item.type) === '3' ? 'Anime' : (String(item.type) === '2' ? 'Série' : 'Conteúdo');

      return {
        title,
        start: item.air_date,
        allDay: true,
        backgroundColor: color.bg,
        borderColor: 'rgba(255,255,255,0.12)',
        textColor: color.text,
        classNames: ['sfx-event'],
        extendedProps: {
          rawTitle: item.title || '',
          imdb: item.imdb_id || '',
          tmdb: item.tmdb_id || '',
          status,
          type: item.type,
          typeLabel
        }
      };
    });
  }

  function applyFilters() {
    if (!calendar) return;

    const q = (calSearch.value || '').trim().toLowerCase();
    const st = calStatus.value;
    const tp = calType.value;

    const filtered = calendarData.filter(it => {
      const okQ = !q || ((it.title || '').toLowerCase().includes(q) || (it.episode || '').toLowerCase().includes(q));
      const okS = !st || it.status === st;
      const okT = !tp || String(it.type) === String(tp);
      return okQ && okS && okT;
    });

    const events = convertToCalendarEvents(filtered);
    calendar.removeAllEvents();
    calendar.addEventSource(events);
    calCount.textContent = `${filtered.length} itens`;
  }

  async function fetchCalendar() {
    if (calendarAbort) calendarAbort.abort();
    calendarAbort = new AbortController();
    calContainer.innerHTML = '';

    try {
      const r = await fetch(`${base}/calendario.php`, { signal: calendarAbort.signal, cache: 'no-store', mode: 'cors' });
      if (!r.ok) throw new Error('HTTP ' + r.status);
      const data = await r.json();
      calendarData = Array.isArray(data) ? data : (data?.items || []);
      calendarLoaded = true;
      applyFilters();
    } catch (e) {
      calCount.textContent = '';
      calContainer.innerHTML = `<div class="sfx-loading"><div class="sfx-spinner"></div>Falha ao carregar. Abra <a href="${base}/calendario.php" target="_blank" rel="noopener" style="margin-left:8px;color:#60a5fa">/calendario.php</a></div>`;
    }
  }

  function initCalendar() {
    if (calendar) return;
    if (!window.FullCalendar) {
      calContainer.innerHTML = '<div class="sfx-loading">FullCalendar não carregou.</div>';
      return;
    }

    calendar = new FullCalendar.Calendar(calContainer, {
      locale: 'pt-br',
      initialView: 'dayGridMonth',
      headerToolbar: { left: 'prev,next today', center: 'title', right: 'dayGridMonth,timeGridWeek,listWeek' },
      height: 'auto',
      dayMaxEvents: 5,
      moreLinkText: 'mais',
      moreLinkHint: 'ver mais',
      eventContent(arg) {
        const p = arg.event.extendedProps;
        const wrap = document.createElement('div');
        wrap.className = 'sfx-event-wrapper';
        const t = document.createElement('span');
        t.textContent = arg.event.title;
        const chip = document.createElement('span');
        chip.className = 'sfx-event-type';
        chip.textContent = p.typeLabel;
        wrap.appendChild(t);
        wrap.appendChild(chip);
        return { domNodes: [wrap] };
      },
      eventDidMount(info) {
        const p = info.event.extendedProps;
        info.el.title = `${p.rawTitle}\nStatus: ${p.status}\nTMDB: ${p.tmdb || '-'} | IMDb: ${p.imdb || '-'}`;
      },
      eventClick(arg) {
        const p = arg.event.extendedProps;
        const out = [];
        if (chkName.checked) out.push(p.rawTitle || '-');
        if (chkImdb.checked) out.push(p.imdb ? `IMDb:${p.imdb}` : 'IMDb:-');
        if (chkTmdb.checked) out.push(p.tmdb ? `TMDB:${p.tmdb}` : 'TMDB:-');
        copyToClipboard(out.join(' | '));
      },
      datesSet() {
        // Mantém o select sincronizado com a view atual
        calView.value = calendar.view.type;
      }
    });

    calendar.render();
    calView.value = calendar.view.type;
  }

  // Toggle calendário
  calToggle.addEventListener('click', () => {
    const isHidden = calWrap.style.display === 'none';
    calWrap.style.display = isHidden ? 'block' : 'none';
    calToggleText.textContent = isHidden ? 'Ocultar Calendário' : 'Mostrar Calendário';
    if (isHidden) { initCalendar(); if (!calendarLoaded) fetchCalendar(); }
  });

  // Controles
  calReload.addEventListener('click', fetchCalendar);
  calSearch.addEventListener('input', applyFilters);
  [calStatus, calType].forEach(el => el.addEventListener('change', applyFilters));
  calView.addEventListener('change', () => { if (calendar) calendar.changeView(calView.value); });

  // === GENERATOR MODULE ===
  const genToggle = $('#sfx-gen-toggle');
  const genToggleText = $('#gen-toggle-text');
  const genWrap = $('#sfx-gen-wrap');

  const fCategory = $('#f-category');
  const fType = $('#f-type');
  const fFormat = $('#f-format');
  const fOrder = $('#f-order');
  const fUrl = $('#f-url');
  const fCopyUrl = $('#f-copy-url');
  const fOpen = $('#f-open');

  function buildUrl() {
    const u = new URL(base + '/lista');
    u.searchParams.set('category', fCategory.value);
    if (fType.value) u.searchParams.set('type', fType.value);
    if (fFormat.value) u.searchParams.set('format', fFormat.value);
    if (fOrder.value) u.searchParams.set('order', fOrder.value);
    fUrl.textContent = u.toString();
    try {
      localStorage.setItem('sfxGen', JSON.stringify({
        category: fCategory.value, type: fType.value, format: fFormat.value, order: fOrder.value
      }));
    } catch {}
  }

  function loadGenState() {
    try {
      const s = JSON.parse(localStorage.getItem('sfxGen') || '{}');
      if (s.category) fCategory.value = s.category;
      if (s.type) fType.value = s.type;
      if (s.format !== undefined) fFormat.value = s.format;
      if (s.order) fOrder.value = s.order;
    } catch {}
  }

  [fCategory, fType, fFormat, fOrder].forEach(el => el.addEventListener('change', buildUrl));
  loadGenState(); buildUrl();

  genToggle.addEventListener('click', () => {
    const isHidden = genWrap.style.display === 'none';
    genWrap.style.display = isHidden ? 'block' : 'none';
    genToggleText.textContent = isHidden ? 'Ocultar Gerador' : 'Abrir Gerador';
  });

  fCopyUrl.addEventListener('click', () => copyToClipboard(fUrl.textContent || ''));
  fOpen.addEventListener('click', () => {
    const url = fUrl.textContent || '';
    if (url) window.open(url, '_blank', 'noopener');
  });

})();
</script>
</body>
</html>
    <?php
}