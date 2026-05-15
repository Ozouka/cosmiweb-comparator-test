# Comparateur de Produits Shopify

Application Shopify complète permettant aux visiteurs de comparer jusqu'à 4 produits en simultané,  avec une interface d'administration pour le marchand.

## Structure du projet

```
.
├── theme/                          # Partie A — Intégration thème (Dawn 15.4.1)
│   ├── assets/
│   │   ├── comparator-store.js     # State management (localStorage + events)
│   │   ├── compare-button.js       # Web Component <compare-button>
│   │   ├── compare-drawer.js       # Web Component <compare-drawer>
│   │   ├── compare-page.js         # Web Component <compare-page>
│   │   ├── component-comparator-button.css
│   │   ├── component-comparator-drawer.css
│   │   └── section-compare-page.css
│   ├── snippets/
│   │   ├── compare-button.liquid
│   │   └── compare-drawer.liquid
│   ├── sections/
│   │   └── main-compare.liquid
│   └── templates/
│       └── page.compare.json
├── cosmiweb-comparator-test/       # Partie B — App embarquée (React Router + Polaris)
│   ├── app/
│   │   └── routes/
│   │       ├── app._index.tsx      # Configuration des champs
│   │       ├── app.stats.tsx       # Statistiques de comparaison
│   │       ├── apps.comparator.config.ts    # App Proxy — config
│   │       ├── apps.comparator.products.ts  # App Proxy — données produits
│   │       └── apps.comparator.track.ts     # App Proxy — tracking
│   ├── prisma/
│   │   └── schema.prisma
│   └── README.md                   # Instructions d'installation
├── render.yaml                     # Config déploiement Render
└── COMPTE-RENDU.md
```

## Stack technique

| Couche | Technologies |
|--------|-------------|
| Thème | Liquid, Vanilla JS (Web Components), CSS classique (pas de tailwind) |
| App admin | React Router 7, Shopify Polaris (Web Components), App Bridge 4.x |
| Backend | Node.js, Prisma ORM, SQLite |
| APIs | Admin GraphQL (backend), Storefront via App Proxy |
| Déploiement | Render (free tier donc si jamais vous trouvez une page au niveau de l'app avec marqué Render attendez juste le lancement il y a un système de mise en veille) |

## Comment ça marche

**Côté visiteur :**
1. Le visiteur clique "Comparer" sur une fiche produit
2. Le produit est ajouté au localStorage, le drawer apparaît en bas de page
3. Quand il clique "Comparer (N)", il arrive sur la page de comparaison
4. Le tableau affiche les champs configurés par le marchand, avec mise en évidence des différences

**Côté marchand :**
1. Dans l'admin Shopify > Apps > cosmiweb-comparator-test
2. Page "Configuration" : activer/désactiver les champs, réordonner
3. Page "Statistiques" : voir les produits les plus comparés sur 30 jours

**Communication Front ↔ Back :**
- L'App Proxy (`/apps/comparator/*`) sert de pont entre le storefront et l'app
- La config est stockée en metafield (`cosmiweb.comparator_config`) sur l'app installation
- Le tracking est persisté en SQLite grâce à Prisma

## Installation rapide

### Thème

```bash
cd theme
shopify theme dev 
```

### App

```bash
# N'oubliez pas d'aller sur la racine du projet
cd cosmiweb-comparator-test
npm install
npx prisma generate
npx prisma migrate deploy
shopify app dev
```

## Store de développement

- URL : https://cosmiweb-comparator-test.myshopify.com
- Page de comparaison : /pages/comparaison

Pour déployer les changements :
```bash
git push 
# Ici le gitpush permet à Render de refresh et de refaire un nouveau build pour notre app
cd cosmiweb-comparator-test
shopify app deploy  
```
