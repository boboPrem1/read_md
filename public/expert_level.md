1. Multi-documents et gestion de session
Onglets : ouvrir plusieurs fichiers simultanément, barre d'onglets avec fermeture/réorganisation
Fichiers récents : historique des derniers fichiers ouverts (localStorage), réouverture rapide
Rechargement automatique : quand servi via HTTP, détecter les modifications (polling Last-Modified) et recharger
Deep linking : restaurer l'état complet depuis l'URL (hash vers section, position de scroll)
2. Mode présentation
Slides par sections : découper le document par titres ##, navigation gauche/droite/flèches
Mode plein écran dédié avec transitions entre slides
Indicateur de progression slide N/total
Notes du présentateur (contenu sous --- dans chaque section)
3. Vue source / Split view
Éditeur intégré : panneau source Markdown éditable (contenteditable ou textarea avec coloration)
Rendu en temps réel : live preview côte à côte
Synchronisation du scroll entre source et rendu
Export du Markdown modifié (téléchargement du fichier édité)
4. Annotations et surlignage
Sélection → surlignage : sélectionner du texte, choisir une couleur, persister en localStorage par hash du fichier
Notes marginales : ajouter une annotation liée à un paragraphe, affichée en marge
Panneau d'annotations : liste de toutes les annotations avec navigation
Export/import des annotations en JSON
5. Statistiques et analyse du document
Panneau de statistiques : mots, caractères, phrases, paragraphes, headings, liens, images, blocs de code
Indice de lisibilité (Flesch-Kincaid adapté au français, Gunning fog)
Fréquence des mots : nuage de mots ou top 20
Structure du document : arbre visuel des niveaux de titres, détection de sauts de niveau
6. Extensions Markdown avancées
Listes de définitions (terme\n: définition)
Abréviations (*[HTML]: HyperText Markup Language → tooltip)
Conteneurs personnalisés (::: warning\n...\n:::)
Notes de bas de page améliorées avec popup au survol (pas juste ancre)
Emoji shortcodes (:rocket: → 🚀) avec autocomplétion
Sous/exposant (H~2~O, x^2^)
7. Diagrammes et visualisation avancés
Édition in-place des diagrammes Mermaid : clic sur un diagramme → éditeur avec preview
Export SVG/PNG des diagrammes individuels
Support Chart.js : blocs ```chart pour des graphiques interactifs (barres, lignes, camembert)
Rendu ASCII art amélioré (monospace preservé, alignement)
8. Recherche avancée
Recherche par regex (toggle regex/littéral)
Recherche dans les titres uniquement (filtre rapide pour naviguer)
Recherche et remplacement (en mode édition/split view)
Historique des recherches récentes
Recherche structurelle : « tous les blocs de code Python », « tous les liens externes »
9. Navigation expert
Mini-map : barre verticale à droite montrant la structure du document en miniature, cliquable
Breadcrumb : fil d'Ariane indiquant la section courante (h1 > h2 > h3)
Signets : marquer des positions dans le document (Ctrl+B), panneau de signets
Navigation par type : sauter au prochain tableau/image/bloc de code/formule (raccourcis [t, ]t, [i, etc.)
Liens bidirectionnels dans les footnotes (aller/retour)
10. Accessibilité et internationalisation
Synthèse vocale : lire le document à voix haute (Web Speech API), contrôle play/pause/vitesse
Interface multilingue : FR/EN/ES/DE avec détection automatique
Navigation vocale (Web Speech Recognition) : « aller au chapitre 3 », « rechercher mot »
Mode daltonien : thème optimisé pour les différents types de daltonisme
Taille de police par zone : code, titres et corps ajustables indépendamment
11. Performance et gros documents
Virtualisation du scroll : ne rendre que les éléments visibles (pour fichiers >1 Mo)
Rendu incrémental : afficher progressivement pendant le parsing
Web Worker pour le parsing Markdown (ne bloque pas l'UI)
Cache de rendu : si le fichier n'a pas changé, réutiliser le HTML en cache (IndexedDB)
12. Export et intégration
Export PDF avancé : en-têtes/pieds de page personnalisables, numérotation, couverture
Copier le HTML rendu dans le presse-papiers (formaté ou code source)
Export DOCX (via une bibliothèque légère côté client)
Partage : encoder le document compressé dans l'URL (LZ-string) pour partage sans serveur
Impression par chapitre : sélectionner les sections à imprimer
13. Personnalisation avancée
Éditeur de thème : créer/modifier des thèmes via un color picker intégré
CSS utilisateur : textarea pour injecter des styles personnalisés
Profils de lecture : sauvegarder/charger des configurations complètes (thème + typo + layout)
Macros clavier : enregistrer des séquences d'actions
14. PWA et mode hors-ligne
Service Worker : installation comme application de bureau
File System Access API : ouvrir/sauvegarder directement sur le disque (sans upload/download)
Drag & drop de dossiers : naviguer dans une arborescence de fichiers .md
Bibliothèque locale : indexer et rechercher dans tous les fichiers déjà ouverts
Priorisation recommandée
Priorité	Fonctionnalités	Impact
P0	Mini-map, breadcrumb, signets, statistiques, fichiers récents	Navigation experte
P1	Split view / éditeur, annotations, recherche regex	Productivité
P2	Mode présentation, extensions MD (définitions, emoji, footnotes popup)	Polyvalence
P3	PWA, File System Access API, export avancé	Intégration système
P4	Virtualisation, Web Worker, éditeur de thème	Polish premium