# COMPTE-RENDU — Comparateur de Produits Shopify

---

## 1. Résumé de mon approche

### Partie A — Front-end thème

J'ai choisi une approche 100% Web Components pour isoler la logique de chaque fonctionnalité et également par habitude de travailler de cette façon. Trois composants autonomes (`<compare-button>`, `<compare-drawer>`, `<compare-page>`) qui communiquent via un singleton qui est `ComparatorStore` et des CustomEvents sur `window`.

L'état est persisté avec le localStorage (clé `comparator_products` : tableau de handles). Chaque mutation dispatch un event `comparator:change` que les composants écoutent pour se re-render.

Le CSS suit le plus possible celui du theme Dawn

### Partie B — App embarquée

L'app dispose de deux écrans admin :
- **Configuration** : toggles pour activer/désactiver les champs du tableau + flèches pour réordonner. La config est en JSON et stockée comme metafield sur le `currentAppInstallation` (namespace `cosmiweb`, key `comparator_config`).
- **Statistiques** : table des produits les plus comparés avec compteur, image, titre et lien admin. Données stockées en SQLite avec Prisma (modèle `ComparisonStat`).

L'UI utilise les Polaris Web Components tel que s-page et s-button.

### Partie C — Intégration

Trois endpoints App Proxy `/apps/comparator/*` :
- `GET /config` -> lit le metafield de config et le retourne au front
- `GET /products?handles=...` ->  query Admin GraphQL
- `POST /track` -> upsert les stats de comparaison en base

Le front fetch la config à chaque chargement de la page de comparaison. Si le marchand désactive un champ, le front ne l'affiche plus au prochain chargement de la page

---

## 2. Choix techniques et justifications

| Choix                             | Pourquoi |
|-----------------------------------|----------|
| Web Components natifs             | Encapsulation propre, 0 dépendance, et également possibilité de libéré de la RAM/soulager le CPU en removant les events grâce audisconnected CallBack |
| localStorage + CustomEvent        | Solution simple car pas besoin de serveur pour stocker la sélection temporaire du visiteur |
| App Proxy plutôt que fetch direct | Le storefront n'a pas accès à l'Admin API. L'App Proxy authentifie la requête côté Shopify et la redirige direct vers notre app |
| SQLite + Prisma pour les stats    | Pas de BDD externe supabase en postegresql ou autre à gérer.|
| Metafield sur appInstallation     | C'est le pattern recommandé par Shopify pour stocker de la config app-level |
| Fallback `/products/{handle}.js`  | Si l'App Proxy est down donc au lancement de Render (vous allez surement y tomber dessus), le front utilise l'endpoint natif Shopify comme fallback pour ne pas bloquer l'User Expérience |

---

## 3. Difficultés rencontrées

### App Proxy qui retourne 500

**Problème :** Les 3 endpoints App Proxy renvoyaient systématiquement 500 depuis le front

**Diagnostic :** Le Partners Dashboard montrait une URL proxy incorrecte (`/app/proxy` au lieu de `/apps/comparator`). L'URL dans `shopify.app.toml` n'était pas cohérente avec le routing React Router je l'ai donc changé

**Résolution :** J'ai corrigé l'URL dans le fichier .toml pour `https://cosmiweb-comparator-test.onrender.com/apps/comparator`, redéployé avec la commande`shopify app deploy`, et désinstallé/réinstallé manuellement sur Shopify pour que la nouvelle config proxy soit prise en compte

### Niveau CSS quelques petits détails sur le tableau (notamment la première colonne qui fallait avoir vide) et sur un `display: flex` qui override l'attribut `hidden`

**Problème :** Les éléments avec l'attribut HTML `hidden` restaient visibles parce que y'avait le `display: flex`

**Résolution :** J'ai simplement mis un !important

### Hors code, je n'avais plus de free tier sur Railway, j'ai donc passé pas mal de temps à apprendre comment marche Render

**Résolution :** J'ai suivi les étapes de configuration, j'ai essayé de faire un Blueprint au début qui n'a pas marché et j'ai donc fait un WebService qui lui a fonctionné à merveille

---

## 4. Améliorations avec plus de temps

- **Metafield personnalisé dynamique** : Permettre au marchand de spécifier un namespace/key de metafield à afficher dans le tableau. Nécessite un champ de saisie en plus dans la config admin + ajout dynamique dans la query GraphQL products
- **Drag & drop** pour réordonner les champs au lieu des flèches haut et bas
- **Animations** plus poussées avec des transitions entre les états mais SURTOUT un skeleton loading sur le tableau qui est excellent pour l'UX

---

## 5. Journal d'usage de l'IA

### Usage 1 — Architecture globale et plan de développement

**Outil :** Claude Code
**Tâche :** "Fais moi un plan détaillé pour implémenter le comparateur. Je veux couvrir les 3 parties du test : front thème avec Web Components, app admin embarquée, et l'intégration via App Proxy"  
**Output :** Plan structuré en 9 commits avec architecture technique, fichiers à créer/modifier, schéma Prisma, patterns d'authentification App Proxy.  
**Delta :** J'ai réorganisé l'ordre d'implémentation (front d'abord, back ensuite) et simplifié certains patterns proposés qui étaient over engineered comme des systemes de caches ou bien des sur optimisations d'images
**Valeur :** ~1h économisée sur la phase de conception et m'a fluidifié la vision du projet en globalité

### Usage 2 — Génération du ComparatorStore

**Outil :** Claude Code
**Tâche :** "Crée le state management avec localStorage et CustomEvent pour gérer une liste de handles produits au maximum 4"  
**Output :** Classe statique fonctionnelle avec getProducts, addProduct, removeProduct, hasProduct, isFull, clear, et dispatch d'events
**Delta :** Le code généré était bon en soit. J'ai juste ajouté le `if (!window.ComparatorStore)` après avoir rencontré un bug de double-chargement
**Valeur :** ~30 minutes économisées

### Usage 3 — Web Components 

**Outil :** Claude Code  
**Tâche :** "Implémente le Web Component compare-button avec 3 états (default, active, disabled), qui écoute les events du store"  
**Output :** Composant fonctionnel avec connectedCallback, disconnectedCallback et gestion des listeners
**Delta :** J'ai simplifié le CSS, Claude proposait des border-radius, transitions, et focus-visible complétement inutile ainsi que d'autres détails comme des icones 'Apple' etc 
**Valeur :** ~45 min économisées par composant

### Usage 4 — Endpoints App Proxy

**Outil :** Claude Code  
**Tâche :** "Crée les routes React Router pour l'App Proxy : GET config (lit le metafield), GET products (query Admin GraphQL par handles), POST track (upsert Prisma)"  
**Output :** Trois fichiers de routes avec authenticate.public.appProxy, queries GraphQL et logique Prisma  
**Delta :** La query GraphQL products initiale utilisait l'API Storefront, j'ai corrigé pour utiliser l'Admin API (puisqu'on est côté serveur avec un token admin via le proxy). L'URL du proxy dans le TOML était incorrecte, j'ai dû debugger avec des console.log pour trouver le bug entre le routing React Router et ce que Shopify envoie.  
**Valeur :** ~1h économisée mais je pense que les patterns d'authentification App Proxy sont mal documentés car l'IA a eu un pas de mal au début

### Usage 5 — Pages admin (Config + Stats)

**Outil :** Claude Opus via Claude Code  
**Tâche :** "Crée la page de configuration avec des toggles pour chaque champ et des boutons haut et bas pour réordonner chacun et fais une sauvegarde en metafield avec l'admin graphql"  
**Output :** Composant React avec useState, useSubmit, et mutation metafieldsSet
**Delta :** L'IA a d'abord généré du React Polaris classique (`<Page>`, `<Card>`, `<Layout>`). J'ai dû juste changer et remettre `s-page` sur l'index par exemple. J'ai aussi simplifié le styling des boutons et c'est tout
**Valeur :** ~30 min économisées malgré les corrections il a fait tout le reste du premier coup

---

### Synthèse usage IA

| Métrique | Valeur |
|----------|--------|
| Temps total estimé économisé | environ 4-5h |
| Parties entièrement écrites à la main | CSS final, intégration Liquid dans le thème |
| Principal apport de l'IA | Queries GraphQL et rapidité au niveua de l'écriture de webcomponents |

Mon approche : j'utilise l'IA comme un collègue de travail avec qui je pair program. Dès que ça touche à de l'intégration spécifique de Shopify  je prends la main car l'IA fait souvent des erreurs sur ces sujets même en liant les mcp de Shopify. J'essaye de gagner un maximum de temps sur l'écriture de syntaxe classique
