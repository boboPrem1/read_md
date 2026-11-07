"use client";

import { useEffect } from "react";
import { initApp } from "@/lib/reader-app";

function Icon({ children }: { children: React.ReactNode }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {children}
    </svg>
  );
}

export default function MarkdownReader() {
  useEffect(() => {
    initApp();
  }, []);

  return (
    <div id="app">
      <input type="file" id="fileInput" className="hidden-input" tabIndex={-1} aria-hidden="true" accept=".md,.markdown,.mdown,.mkd,.mkdn,.mdwn,.mdtxt,.mdtext,.text,.txt" />

      {/* Welcome Screen */}
      <div id="welcome" className="welcome">
        <main className="welcome-inner">
          <div className="welcome-title-page">
            <div className="welcome-hero">
              <h1>Lecteur <em>Markdown</em></h1>
              <p>Ouvrez un fichier Markdown pour commencer la lecture</p>
            </div>
            <div id="resumeSlot"></div>
          </div>
          <div className="welcome-contents">
            <section className="welcome-card" id="localCard">
              <h2>Fichier local</h2>
              <div className="drop-zone" id="dropZone">
                <div className="drop-zone-icon" aria-hidden="true">#</div>
                <div className="drop-zone-body">
                  <p>Glissez-déposez un fichier .md ici</p>
                  <button id="fileBtn" type="button" className="primary-btn">Choisir un fichier</button>
                </div>
              </div>
              <div className="recent-files" id="recentFiles"></div>
            </section>

            <section className="welcome-card" id="githubCard">
              <h2>Depuis GitHub</h2>
              <div className="github-browser" id="ghBrowser">
                <p className="gh-description">Entrez une URL GitHub ou un chemin owner/repo pour scanner les fichiers Markdown.</p>
                <div className="gh-input-row">
                  <input type="text" id="ghUrl" placeholder="owner/repo ou https://github.com/..." className="gh-input" />
                  <button type="button" id="ghScanBtn" className="primary-btn">Scanner</button>
                  <button type="button" id="ghSaveBtn" className="secondary-btn" disabled>Sauvegarder ce répertoire</button>
                </div>
                <div className="gh-status-row">
                  <div className="gh-status" id="ghStatus"></div>
                </div>
                <div className="gh-results" id="ghResults"></div>
              </div>
            </section>

            <section className="welcome-card" id="savedDirsCard">
              <h2>Répertoires sauvegardés</h2>
              <div id="ghSavedDirs" className="gh-saved-list"></div>
            </section>
          </div>
        </main>
      </div>

      {/* Reader */}
      <div id="reader" className="reader hidden">
        <input type="file" id="newFileInput" className="hidden-input" tabIndex={-1} aria-hidden="true" accept=".md,.markdown,.mdown,.mkd,.mkdn,.mdwn,.mdtxt,.mdtext,.text,.txt" />

        <header className="toolbar" aria-label="Barre de lecture">
          <div className="toolbar-place">
            <button id="homeBtn" type="button" className="tool-btn tool-btn-labelled" title="Retour à l'accueil">
              <Icon><path d="M19 12H5" /><path d="m12 19-7-7 7-7" /></Icon>
              <span className="tool-label">Accueil</span>
            </button>
            <span id="docName" className="doc-name"></span>
          </div>

          <div className="toolbar-status">
            <button id="sectionBtn" type="button" className="section-btn" title="Ouvrir le sommaire">
              <span id="breadcrumb" className="breadcrumb"></span>
            </button>
            <span id="readingRemaining" className="reading-status" aria-live="off"></span>
          </div>

          <div className="mode-switch" role="group" aria-label="Mode">
            <button id="modeRead" type="button" data-mode="read" aria-pressed="true">Lire</button>
            <button id="editorToggle" type="button" data-mode="edit" aria-pressed="false" title="Éditeur (E)">Éditer</button>
            <button id="presentToggle" type="button" data-mode="present" aria-pressed="false" title="Présentation (P)">Présenter</button>
          </div>

          <button id="bookmarkToggle" type="button" className="tool-btn tool-bookmark" aria-pressed="false" aria-label="Marquer cette position" title="Marquer cette position (Ctrl+B)">
            <Icon><path d="m19 21-7-4-7 4V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" /></Icon>
          </button>

          <div className="toolbar-actions">
            <button id="tocToggle" type="button" className="tool-btn tool-btn-labelled" aria-expanded="true" aria-controls="sidebar" title="Sommaire (T)">
              <Icon><path d="M8 6h13" /><path d="M8 12h13" /><path d="M8 18h13" /><path d="M3 6h.01" /><path d="M3 12h.01" /><path d="M3 18h.01" /></Icon>
              <span className="tool-label">Sommaire</span>
            </button>
            <button id="searchToggle" type="button" className="tool-btn tool-btn-labelled" aria-expanded="false" aria-controls="searchBar" title="Rechercher (Ctrl+F)">
              <Icon><circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" /></Icon>
              <span className="tool-label">Rechercher</span>
            </button>
            <button id="settingsToggle" type="button" className="tool-btn tool-btn-labelled" aria-expanded="false" aria-controls="settingsPanel" title="Confort de lecture (S)">
              <span className="tool-glyph" aria-hidden="true">Aa</span>
              <span className="tool-label">Lecture</span>
            </button>
            <div className="menu-anchor">
              <button id="moreBtn" type="button" className="tool-btn tool-btn-labelled" aria-haspopup="menu" aria-expanded="false" aria-controls="moreMenu" title="Plus d'actions">
                <Icon><circle cx="5" cy="12" r="1" /><circle cx="12" cy="12" r="1" /><circle cx="19" cy="12" r="1" /></Icon>
                <span className="tool-label">Plus</span>
              </button>
              <div id="moreMenu" className="menu" role="menu" aria-label="Plus d'actions" hidden>
                <button id="newFileBtn" type="button" role="menuitem">Ouvrir un fichier<span className="menu-key">Ctrl O</span></button>
                <button id="menuEdit" type="button" role="menuitem" className="only-narrow">Éditer<span className="menu-key">E</span></button>
                <button id="menuPresent" type="button" role="menuitem" className="only-narrow">Présenter<span className="menu-key">P</span></button>
                <button id="menuImmersive" type="button" role="menuitem">Immersion<span className="menu-key">M</span></button>
                <button id="menuFocus" type="button" role="menuitem">Concentration<span className="menu-key">F</span></button>
                <hr />
                <button id="statsToggle" type="button" role="menuitem">Statistiques<span className="menu-key">I</span></button>
                <button id="printBtn" type="button" role="menuitem">Imprimer<span className="menu-key">Ctrl P</span></button>
                <button id="fullscreenToggle" type="button" role="menuitem">Plein écran</button>
                <hr />
                <button id="shortcutsToggle" type="button" role="menuitem">Raccourcis clavier<span className="menu-key">?</span></button>
              </div>
            </div>
          </div>
        </header>

        <div className="reading-line" role="progressbar" aria-label="Progression de lecture" aria-valuemin={0} aria-valuemax={100} aria-valuenow={0}>
          <div id="progressFill" className="reading-line-fill"></div>
        </div>

        {/* Search */}
        <div id="searchBar" className="search-bar hidden" role="search" aria-label="Recherche dans le document">
          <input type="text" id="searchInput" placeholder="Rechercher dans le document" aria-label="Terme de recherche" aria-describedby="searchCount" />
          <span id="searchCount" className="search-count" role="status"></span>
          <button id="regexToggle" type="button" className="search-text-btn" aria-pressed="false" title="Interpréter comme une expression régulière">Regex</button>
          <button id="searchPrev" type="button" className="search-icon-btn" aria-label="Résultat précédent" title="Précédent (Maj+Entrée)" disabled>
            <Icon><path d="m18 15-6-6-6 6" /></Icon>
          </button>
          <button id="searchNext" type="button" className="search-icon-btn" aria-label="Résultat suivant" title="Suivant (Entrée)" disabled>
            <Icon><path d="m6 9 6 6 6-6" /></Icon>
          </button>
          <button id="searchClose" type="button" className="search-icon-btn" aria-label="Fermer la recherche" title="Fermer (Échap)">
            <Icon><path d="M18 6 6 18" /><path d="m6 6 12 12" /></Icon>
          </button>
        </div>

        {/* Sidebar: where am I, and what did I keep? */}
        <nav id="sidebar" className="sidebar" aria-label="Navigation du document">
          <div className="sidebar-header">
            <div className="sidebar-tabs" role="tablist" aria-label="Contenu du panneau">
              <button id="tabToc" type="button" role="tab" aria-selected="true" aria-controls="tocContent" data-panel="tocContent">Sommaire</button>
              <button id="tabBookmarks" type="button" role="tab" aria-selected="false" aria-controls="bookmarksPanel" data-panel="bookmarksPanel" tabIndex={-1}>Signets <span id="bookmarksCount" className="tab-count"></span></button>
              <button id="tabNotes" type="button" role="tab" aria-selected="false" aria-controls="annotationsPanel" data-panel="annotationsPanel" tabIndex={-1}>Notes <span id="annotationsCount" className="tab-count"></span></button>
            </div>
            <button id="sidebarClose" type="button" className="tool-btn sidebar-close" aria-label="Fermer le panneau">
              <Icon><path d="M18 6 6 18" /><path d="m6 6 12 12" /></Icon>
            </button>
          </div>
          <div className="sidebar-content" id="tocContent" role="tabpanel" aria-labelledby="tabToc"></div>
          <div className="sidebar-content" id="bookmarksPanel" role="tabpanel" aria-labelledby="tabBookmarks" hidden></div>
          <div className="sidebar-content" id="annotationsPanel" role="tabpanel" aria-labelledby="tabNotes" hidden></div>
        </nav>
        <div id="sidebarOverlay" className="sidebar-overlay hidden"></div>

        <div className="reader-stage">
          {/* Editor */}
          <div className="editor-pane" id="editorPane">
            <div className="editor-toolbar">
              <label htmlFor="editorTextarea">Source Markdown</label>
              <button id="editorDownload" type="button">Télécharger</button>
            </div>
            <textarea id="editorTextarea" spellCheck={false}></textarea>
          </div>

          {/* Document */}
          <main id="content" className="content" tabIndex={-1}>
            <article id="article" className="article markdown-body"></article>
          </main>

          <div className="float-actions">
            <button id="navBack" type="button" className="float-btn float-btn-labelled" hidden title="Revenir à la position précédente (B)">
              <Icon><path d="M19 12H5" /><path d="m12 19-7-7 7-7" /></Icon>
              Revenir
            </button>
            <button id="backToTop" type="button" className="float-btn back-to-top" aria-label="Retour en haut du document" title="Retour en haut (Début)">
              <Icon><path d="m18 15-6-6-6 6" /></Icon>
            </button>
          </div>
        </div>

        {/* Comfort settings: every change is visible immediately behind the panel */}
        <aside id="settingsPanel" className="settings-panel" aria-label="Confort de lecture">
          <div className="settings-header">
            <h2>Confort de lecture</h2>
            <button id="settingsClose" type="button" className="tool-btn" aria-label="Fermer les réglages">
              <Icon><path d="M18 6 6 18" /><path d="m6 6 12 12" /></Icon>
            </button>
          </div>
          <div className="settings-body">
            <div className="setting-group">
              <span className="setting-label" id="labelTheme">Ambiance</span>
              <div className="theme-buttons" role="group" aria-labelledby="labelTheme">
                <button type="button" className="theme-btn" data-theme-choice="auto">Auto</button>
                <button type="button" className="theme-btn" data-theme="light" data-theme-choice="light">Clair</button>
                <button type="button" className="theme-btn" data-theme="sepia" data-theme-choice="sepia">Sépia</button>
                <button type="button" className="theme-btn" data-theme="dark" data-theme-choice="dark">Sombre</button>
                <button type="button" className="theme-btn" data-theme="contrast" data-theme-choice="contrast">Contraste</button>
              </div>
            </div>
            <div className="setting-group">
              <span className="setting-label" id="labelSize">Taille du texte</span>
              <div className="stepper" role="group" aria-labelledby="labelSize">
                <button id="fontSizeDec" type="button" aria-label="Réduire le texte"><span className="stepper-small" aria-hidden="true">A</span></button>
                <output id="fontSizeVal" aria-live="polite">18 px</output>
                <button id="fontSizeInc" type="button" aria-label="Agrandir le texte"><span className="stepper-large" aria-hidden="true">A</span></button>
              </div>
            </div>
            <div className="setting-group">
              <span className="setting-label" id="labelWidth">Largeur des lignes</span>
              <div className="segmented" role="group" aria-labelledby="labelWidth">
                <button type="button" data-setting="contentWidth" data-value="58">Étroite</button>
                <button type="button" data-setting="contentWidth" data-value="66">Confort</button>
                <button type="button" data-setting="contentWidth" data-value="78">Large</button>
              </div>
            </div>
            <div className="setting-group">
              <span className="setting-label" id="labelLeading">Interligne</span>
              <div className="segmented" role="group" aria-labelledby="labelLeading">
                <button type="button" data-setting="lineHeight" data-value="1.45">Serré</button>
                <button type="button" data-setting="lineHeight" data-value="1.6">Normal</button>
                <button type="button" data-setting="lineHeight" data-value="1.8">Aéré</button>
              </div>
            </div>
            <div className="setting-group">
              <span className="setting-label" id="labelFont">Police</span>
              <div className="segmented" role="group" aria-labelledby="labelFont">
                <button type="button" className="font-choice-serif" data-setting="fontFamily" data-value="serif">Serif</button>
                <button type="button" className="font-choice-sans" data-setting="fontFamily" data-value="sans-serif">Sans</button>
                <button type="button" className="font-choice-mono" data-setting="fontFamily" data-value="mono">Mono</button>
              </div>
            </div>
            <label className="toggle-row">
              <input type="checkbox" id="minimalMode" />
              <span><strong>Immersion</strong><small>Masque le sommaire et la barre pendant la lecture.</small></span>
            </label>
            <label className="toggle-row">
              <input type="checkbox" id="focusMode" />
              <span><strong>Concentration</strong><small>Estompe tout sauf le passage en cours.</small></span>
            </label>
            <button id="settingsReset" type="button" className="settings-reset">Rétablir les réglages par défaut</button>
          </div>
        </aside>
      </div>

      {/* Lightbox */}
      <div id="lightbox" className="lightbox hidden" role="dialog" aria-label="Image agrandie" aria-modal="true">
        <button className="lightbox-close" aria-label="Fermer">&times;</button>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img id="lightboxImg" alt="" />
      </div>

      {/* Statistics */}
      <div id="statsPanel" className="stats-panel" role="dialog" aria-label="Statistiques" aria-modal="true">
        <div className="stats-inner"></div>
      </div>

      {/* Presentation Mode */}
      <div id="presentationMode" className="presentation" role="dialog" aria-label="Mode présentation">
        <div className="presentation-toolbar">
          <button id="presentExit" type="button">Quitter (Échap)</button>
          <span className="slide-counter"></span>
          <div>
            <button id="presentPrev" type="button">&larr; Précédent</button>
            <button id="presentNext" type="button">Suivant &rarr;</button>
          </div>
        </div>
        <div className="presentation-progress"><div className="presentation-progress-fill"></div></div>
        <div className="presentation-content"></div>
      </div>

      {/* Keyboard Shortcuts */}
      <div id="shortcutsHelp" className="shortcuts-help hidden" role="dialog" aria-label="Raccourcis clavier" aria-modal="true">
        <div className="shortcuts-inner">
          <h2>Raccourcis clavier</h2>
          <button className="shortcuts-close" aria-label="Fermer">&times;</button>
          <dl>
            <dt>T</dt><dd>Ouvrir ou fermer le sommaire</dd>
            <dt>Ctrl + F</dt><dd>Rechercher dans le document</dd>
            <dt>Ctrl + B</dt><dd>Marquer cette position</dd>
            <dt>B</dt><dd>Revenir à la position précédente</dd>
            <dt>S</dt><dd>Confort de lecture</dd>
            <dt>+ / -</dt><dd>Taille du texte</dd>
            <dt>M</dt><dd>Immersion</dd>
            <dt>F</dt><dd>Concentration</dd>
            <dt>E</dt><dd>Éditer le document</dd>
            <dt>P</dt><dd>Présenter le document</dd>
            <dt>I</dt><dd>Statistiques</dd>
            <dt>Début</dt><dd>Retour en haut</dd>
            <dt>Ctrl + O</dt><dd>Ouvrir un fichier</dd>
            <dt>Échap</dt><dd>Fermer ou quitter</dd>
            <dt>?</dt><dd>Cette aide</dd>
          </dl>
        </div>
      </div>
    </div>
  );
}
