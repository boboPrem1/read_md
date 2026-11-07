# PROJET : LECTEUR MARKDOWN PREMIUM — APPLICATION WEB AUTONOME

## 1. Rôle et expertise attendue

Agis comme une équipe senior réunissant les compétences d'un architecte logiciel front-end, d'un ingénieur spécialisé dans les formats documentaires, d'un expert en typographie éditoriale, d'un designer UX/UI haut de gamme et d'un spécialiste de l'accessibilité et de la sécurité web.

Ta mission est de concevoir et de développer une application web complète, élégante, robuste et immédiatement utilisable, dédiée à une seule chose : **transformer n'importe quel fichier Markdown compatible en une expérience de lecture exceptionnelle, confortable pendant plusieurs heures et fidèle au contenu original.**

Ne produis pas une simple démonstration visuelle, une maquette ou un prototype incomplet. Produis un véritable logiciel fonctionnel.

## 2. Objectif produit

Créer un lecteur Markdown autonome capable d'ouvrir un fichier `.md` et de le présenter comme un document éditorial soigneusement composé.

L'expérience recherchée doit combiner :

- Le confort typographique d'un excellent livre numérique.
- La lisibilité et la précision d'une publication scientifique.
- La fluidité d'un lecteur documentaire moderne.
- La qualité visuelle d'une application desktop haut de gamme.
- La simplicité d'un logiciel qui s'efface devant le contenu.

L'utilisateur doit pouvoir lire un document dense, long, technique ou richement structuré pendant plusieurs heures sans fatigue visuelle inutile, sans distraction et sans avoir à configurer constamment l'interface.

**Principe directeur : l'interface sert le document. Le document reste toujours au centre de l'expérience.**

## 3. Contraintes architecturales impératives

L'application doit respecter les contraintes suivantes :

1. Livrer un seul fichier physique `index.html`.
2. Intégrer le HTML, le CSS et le JavaScript dans ce fichier.
3. Ne nécessiter aucun framework, serveur, installation, compilation, gestionnaire de paquets ou étape de build pour être utilisé.
4. Fonctionner directement en ouvrant le fichier HTML dans un navigateur moderne, via `file://`.
5. Fonctionner hors ligne après livraison, sans CDN, requête réseau obligatoire, ressource distante indispensable ou police téléchargée.
6. Traiter les documents intégralement dans le navigateur, sans téléversement vers un serveur.
7. Embarquer dans le fichier les dépendances nécessaires au fonctionnement autonome, avec leurs mentions de licence respectives, plutôt que de charger des scripts externes.
8. Utiliser les API web natives lorsque cela est pertinent, sans réinventer inutilement des fonctionnalités déjà fiables.
9. Prévoir un comportement dégradé explicite lorsqu'une fonctionnalité avancée dépend d'une capacité indisponible dans le navigateur.

Ne simule aucune fonctionnalité. Ne présente jamais une syntaxe comme prise en charge si elle n'est pas réellement interprétée et correctement affichée.

La contrainte du fichier unique est absolue : aucune ressource auxiliaire ne doit être indispensable au fonctionnement du lecteur.

## 4. Prise en charge complète du Markdown

Le moteur de rendu doit reposer sur un véritable parseur Markdown fiable. N'essaie pas d'implémenter l'intégralité du langage avec une succession de simples expressions régulières.

### 4.1. Socle obligatoire

Prendre en charge CommonMark et GitHub Flavored Markdown (GFM), notamment :

- Titres de niveaux 1 à 6, avec les deux syntaxes usuelles.
- Paragraphes, retours à la ligne et séparateurs horizontaux.
- Texte en gras, italique, barré et code en ligne.
- Citations simples, imbriquées et longues.
- Listes numérotées, à puces et imbriquées.
- Cases à cocher des listes de tâches.
- Blocs de code clôturés ou indentés.
- Tableaux, alignements de colonnes et contenus complexes.
- Liens directs, liens de référence et URL automatiques.
- Images, textes alternatifs et légendes lorsqu'elles existent.
- Caractères échappés et règles de ponctuation Markdown.
- Notes de bas de page lorsque l'extension correspondante est disponible.
- HTML intégré au Markdown, dans un mode sécurisé.
- Ancres internes, références croisées et navigation entre les titres.

### 4.2. Fonctionnalités avancées

Prévoir également la prise en charge, lorsque la syntaxe est présente dans le document :

- Formules mathématiques LaTeX, en ligne et en bloc.
- Blocs de diagrammes Mermaid.
- Mise en évidence syntaxique des blocs de code pour les langages courants.
- Blocs d'avertissement et encadrés informatifs, lorsqu'ils correspondent à une extension reconnue.
- Métadonnées YAML en tête de document, sans les confondre avec le corps du texte.
- Liens et images relatifs au document, lorsque les ressources correspondantes peuvent être accessibles explicitement.
- Emojis, caractères Unicode et textes multilingues.
- Grandes tables et blocs de code contenant des lignes très longues.

Pour les extensions non normalisées, détecter ou déclarer clairement les syntaxes supportées. Ne jamais modifier silencieusement le sens du document.

Si plusieurs dialectes sont utiles, permettre de choisir le profil de rendu sans surcharger l'interface.

### 4.3. Fidélité du contenu

Le rendu doit préserver l'ordre, la hiérarchie et la sémantique du fichier source.

Ne résume pas, ne réécris pas, ne corrige pas et ne supprime pas le contenu du document.

Les fonctionnalités de confort visuel ne doivent jamais altérer les formules, le code, les tableaux, les liens ou les références du document original.

## 5. Direction artistique : excellence typographique

La qualité typographique est une priorité de premier ordre.

Construire une véritable mise en page éditoriale plutôt qu'une succession de composants génériques.

### 5.1. Typographie

- Choisir des familles de polices adaptées à la lecture prolongée, avec des solutions de remplacement système.
- Définir une échelle typographique cohérente et harmonieuse.
- Utiliser une hauteur de ligne confortable, notamment pour les paragraphes longs.
- Contrôler la longueur des lignes pour éviter les lignes excessivement larges.
- Optimiser l'espacement entre paragraphes, titres, listes, tableaux et illustrations.
- Soigner les césures, les retours à la ligne et les ruptures de page.
- Distinguer très clairement les différents niveaux de titres.
- Employer une police monospace adaptée aux blocs de code.
- Éviter les contrastes visuels agressifs, les caractères trop petits et les textes trop pâles.
- Prévoir une gestion correcte des textes français, des accents, des symboles scientifiques et des langues utilisant d'autres alphabets.

Utiliser comme point de départ une largeur de texte d'environ 65 à 80 caractères par ligne et une hauteur de ligne de 1,65 à 1,85, puis adapter les réglages à la taille d'écran et au type de contenu.

### 5.2. Composition de la page

Créer une composition visuelle calme et équilibrée, avec :

- Une colonne de lecture centrale parfaitement maîtrisée.
- Des marges généreuses.
- Une hiérarchie visuelle discrète mais évidente.
- Une séparation nette entre le contenu et les commandes.
- Des tableaux et blocs de code lisibles sans casser la mise en page.
- Des images adaptées à la largeur disponible.
- Une interface qui ne donne pas l'impression que chaque paragraphe est une carte indépendante.

Éviter les effets décoratifs gratuits, le verre dépoli omniprésent, les dégradés agressifs, les animations incessantes, les ombres excessives et l'accumulation de boutons.

La finition doit provenir de la typographie, des proportions, de l'espacement, des détails et de la cohérence d'ensemble.

## 6. Confort de lecture prolongée

Le lecteur doit pouvoir s'adapter aux préférences de chaque utilisateur.

Implémenter les fonctions suivantes :

- Réglage instantané de la taille du texte.
- Réglage de la largeur de lecture.
- Contrôle de l'interligne et de l'espacement du texte.
- Thème clair.
- Thème sombre.
- Thème sépia destiné à la lecture prolongée.
- Mode à contraste renforcé.
- Choix de police parmi des familles embarquées ou système adaptées.
- Mode de lecture minimaliste réduisant les éléments périphériques.
- Barre de progression de lecture.
- Temps de lecture estimé, présenté comme une approximation.
- Mémorisation de la position de lecture.
- Restauration de la position au retour sur un document reconnu.
- Mémorisation locale des préférences de lecture.
- Prise en compte de la préférence système pour le thème et de la réduction des animations.

Tous les réglages doivent être immédiatement visibles, réversibles et utilisables sans recharger le document.

Ne persiste pas le contenu privé des documents par défaut. La mémorisation des préférences doit rester distincte du stockage des fichiers.

## 7. Navigation dans les documents longs

L'application doit rester agréable à utiliser lorsque le document contient des dizaines ou des centaines de pages.

Créer une navigation intelligente comprenant :

- Une table des matières automatiquement générée à partir des titres.
- Une hiérarchie visuelle respectant les niveaux de titres.
- Des liens directs vers les sections.
- Une indication discrète de la section actuellement lue.
- Une navigation latérale sur grand écran.
- Une navigation repliable et facilement accessible sur petit écran.
- Une recherche dans le document entier.
- Des résultats de recherche cliquables conduisant à la bonne position.
- La mise en évidence temporaire du résultat sélectionné.
- Un bouton permettant de revenir facilement à la position précédente.
- Une commande permettant de retourner en haut du document.
- Un défilement fluide, sans animation imposée à l'utilisateur.

La table des matières ne doit pas prendre le dessus sur le contenu. Sur écran étroit, elle doit pouvoir être masquée complètement.

Éviter les recalculs permanents de toute la page, les déplacements intempestifs pendant le défilement et les problèmes de positionnement lors de l'affichage des images ou des formules.

## 8. Interface d'importation

L'application doit proposer une interface d'accueil simple, élégante et immédiatement compréhensible.

Permettre de charger un fichier par :

- Sélection classique depuis l'explorateur de fichiers.
- Glisser-déposer dans une zone clairement identifiée.
- Sélection d'un autre document sans recharger l'application.

Accepter les extensions Markdown courantes et afficher le nom du fichier ouvert.

Après l'importation, passer naturellement en mode lecture. Ne pas imposer un écran d'accueil persistant ni une succession d'étapes inutiles.

Prévoir :

- Un état initial soigné.
- Un état de chargement pour les documents volumineux.
- Un message d'erreur compréhensible si le fichier ne peut pas être lu.
- Une confirmation discrète du document actuellement ouvert.
- Un mécanisme simple pour remplacer le document courant.
- Une gestion raisonnable des fichiers volumineux.

Le texte doit être lu localement dans le navigateur. Aucun appel réseau ne doit transmettre le contenu du fichier.

## 9. Code, tableaux, images et formules

Ces éléments doivent bénéficier d'un traitement éditorial spécifique.

### Blocs de code

- Coloration syntaxique adaptée au langage détecté.
- Affichage du langage lorsqu'il est spécifié.
- Bouton de copie fonctionnel.
- Conservation exacte du contenu copié.
- Retour à la ligne maîtrisé ou défilement horizontal lorsque nécessaire.
- Distinction visuelle entre le code en ligne et les blocs de code.
- Lisibilité correcte des lignes longues.

### Tableaux

- Alignement des colonnes respecté.
- En-têtes facilement identifiables.
- Espacement suffisant sans gaspiller l'espace.
- Défilement horizontal maîtrisé sur mobile.
- Aucun écrasement ou masquage silencieux des données.

### Images

- Respect du ratio original.
- Limitation à la largeur de lecture disponible.
- Agrandissement dans une vue dédiée.
- Texte alternatif conservé.
- Gestion visuelle des images manquantes.
- Aucun débordement horizontal incontrôlé.

### Mathématiques et diagrammes

- Rendu propre des formules complexes.
- Gestion des expressions mal formées sans faire échouer tout le document.
- Dimensionnement adapté aux petits écrans.
- Affichage de remplacement explicite si un moteur avancé ne peut pas interpréter une expression ou un diagramme.

## 10. Accessibilité et ergonomie

Viser les exigences WCAG 2.2 niveau AA, dans la mesure applicable au lecteur.

- Navigation complète au clavier.
- Ordre de tabulation logique.
- Indicateurs de focus visibles.
- Boutons avec noms accessibles.
- Contrastes suffisants pour le texte et les commandes.
- Structure sémantique correcte des titres, listes, tableaux et citations.
- Prise en charge des lecteurs d'écran.
- Commandes utilisables à différentes tailles d'écran.
- Zones interactives suffisamment grandes.
- Respect des préférences de réduction des animations.
- Absence d'interactions dépendant exclusivement de la couleur.
- Aucun raccourci clavier qui interfère inutilement avec la saisie, la recherche ou les fonctions natives du navigateur.

Le confort visuel ne doit jamais être obtenu au détriment de l'accessibilité.

## 11. Sécurité et confidentialité

Le contenu Markdown est une donnée à afficher, pas du code à exécuter.

Mettre en place les protections nécessaires contre les injections HTML et les attaques XSS.

- Assainir le HTML généré par le moteur Markdown.
- Désactiver l'exécution de scripts contenus dans le document.
- Ne pas injecter de code utilisateur de manière non sécurisée.
- Restreindre les protocoles de liens dangereux.
- Ouvrir les liens externes de manière sécurisée.
- Protéger les mécanismes de rendu des diagrammes.
- Ne pas charger automatiquement des ressources exécutables provenant du document.
- Ne pas envoyer les fichiers, leur nom ou leur contenu vers un serveur.
- Encadrer les liens et les images distants conformément aux préférences de confidentialité.

Conserver une expérience fiable même lorsqu'un fichier provient d'une source inconnue.

## 12. Performance et robustesse

Le lecteur doit rester réactif durant la lecture de documents complexes.

- Éviter les mises à jour DOM inutiles.
- Éviter les écouteurs d'événements dupliqués.
- Gérer proprement le cycle de vie des ressources.
- Différer les opérations coûteuses lorsque cela améliore réellement la fluidité.
- Prendre en compte les documents comportant de nombreux titres, images, tableaux et blocs de code.
- Prévoir des erreurs localisées pour les extensions avancées au lieu de faire échouer toute l'application.
- Éviter les dépendances inutiles.
- Ne pas sacrifier la fiabilité pour multiplier les effets visuels.

Ne mets en œuvre une virtualisation du contenu que si elle est réellement nécessaire et si elle préserve la recherche, les ancres, l'accessibilité et une navigation correcte.

## 13. Fonctions complémentaires utiles

Ajouter, sans encombrer l'interface :

- Un bouton de passage en plein écran lorsque le navigateur l'autorise.
- Une feuille de style d'impression soignée, avec option d'impression ou de génération PDF via le navigateur.
- Des raccourcis clavier documentés, sans conflit avec les commandes natives.
- Une possibilité de fermer la table des matières ou les panneaux de réglage.
- Une mise en page responsive couvrant ordinateur, tablette et téléphone.
- Une gestion appropriée des préférences et des erreurs de rendu.

Ne pas intégrer d'éditeur Markdown, de collaboration en ligne, de comptes utilisateur, de système d'authentification ou de fonctionnalités hors sujet. L'application est exclusivement un lecteur.

## 14. Qualité du code et livraison

Produire du code clair, organisé, cohérent et maintenable, même dans un unique fichier HTML.

Séparer logiquement :

- Les styles.
- Les fonctions de lecture des fichiers.
- Le moteur de rendu.
- Les fonctions de navigation.
- Les réglages visuels.
- La gestion des préférences.
- Les mécanismes de sécurité.
- Les fonctions de recherche et de progression.

Utiliser une architecture interne modulaire, une gestion d'état prévisible et des noms explicites.

Ne livrer aucun pseudocode, aucune fonction vide, aucun bouton décoratif sans action, aucune dépendance absente et aucun bloc marqué « à implémenter plus tard ».

Conserver les licences nécessaires des bibliothèques intégrées.

## 15. Validation obligatoire avant livraison

Tester l'application sur un document de démonstration couvrant les principales syntaxes.

Ce document doit contenir :

- Tous les niveaux de titres.
- Des paragraphes longs.
- Des listes imbriquées.
- Des tâches cochées et non cochées.
- Des citations.
- Des liens et images.
- Des tableaux complexes.
- Plusieurs langages de programmation.
- Des blocs de code longs.
- Des notes de bas de page.
- Des formules mathématiques.
- Un diagramme Mermaid.
- Des caractères Unicode.
- Du HTML intégré.
- Des liens internes.
- Des syntaxes mal formées pour vérifier la résilience.

Vérifier les critères suivants :

1. Le fichier HTML s'ouvre et fonctionne sans serveur.
2. Le fonctionnement principal ne nécessite aucun accès réseau.
3. Le glisser-déposer et l'importation classique fonctionnent.
4. Le contenu Markdown est affiché avec une hiérarchie correcte.
5. Les préférences changent immédiatement l'apparence.
6. La navigation et la recherche fonctionnent dans un document long.
7. Les fonctionnalités principales sont accessibles au clavier.
8. Le document reste lisible sur mobile.
9. Les contenus mal formés n'entraînent pas de panne générale.
10. Le rendu d'un document non fiable ne permet pas l'exécution de scripts.
11. L'impression produit une mise en page lisible.
12. Aucune commande visible ne reste sans comportement fonctionnel.

Ne déclare pas les tests réussis s'ils n'ont pas réellement été exécutés.

## 16. Ordre de priorité

En cas de conflit entre plusieurs objectifs, respecter cet ordre :

1. Fidélité et intégrité du contenu.
2. Sécurité et confidentialité.
3. Confort de lecture prolongée.
4. Compatibilité Markdown.
5. Performance et stabilité.
6. Accessibilité.
7. Cohérence visuelle.
8. Fonctions secondaires et effets décoratifs.

Aucune fonctionnalité supplémentaire ne doit nuire à la qualité de lecture.

## 17. Livrable final

Fournis une application complète dans un unique fichier `index.html`, prête à être enregistrée et ouverte dans un navigateur moderne.

Si ton environnement permet de générer des fichiers, fournis directement le fichier téléchargeable plutôt que de disperser son code entre plusieurs réponses.

Si tu dois produire le code dans la réponse, livre le document HTML complet, sans sections manquantes ni dépendances externes obligatoires.

Avant de livrer, vérifie la cohérence entre les fonctionnalités annoncées, celles réellement implémentées et les contraintes du fichier unique.

**Résultat attendu : un lecteur Markdown autonome, élégant, techniquement rigoureux, accessible et si agréable à utiliser qu'on puisse lire un livre entier, une documentation scientifique ou un long rapport sans souhaiter retourner à un éditeur de texte classique.**