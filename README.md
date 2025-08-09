# Jeu pédagogique BTP - Prototype 3D (Three.js)

Ce dépôt contient un prototype de visualisation 3D par étapes (terrassement → bâtiment fini).
Vous pouvez charger jusqu'à 8 étapes (`models/etape1.glb` → `models/etape8.glb`).

## Utilisation rapide (GitHub Pages)
1. Placez vos fichiers `.glb` dans le dossier `models/` et nommez-les :
   - `etape1.glb`, `etape2.glb`, …, `etape8.glb` (seules les étapes présentes seront affichées).
2. Poussez ce dépôt sur GitHub.
3. Activez **GitHub Pages** dans *Settings → Pages* et choisissez la branche principale (root).
4. Ouvrez l’URL GitHub Pages fournie : le viewer chargera `models/etape1.glb` par défaut.

> GitHub Pages sert les fichiers via HTTP(s) : aucun serveur local n'est nécessaire en production.

## Lancement en local (développement)
Les navigateurs bloquent le chargement de fichiers via `file://`. Utilisez un **serveur local**.

### Avec Python
```bash
python -m http.server 8000
# ou sous Windows
py -m http.server 8000
```
Puis allez sur `http://localhost:8000`.

### Avec Node.js
```bash
npx http-server -p 8000
```

## Structure
```
.
├── index.html          # Viewer 3D avec cadrage automatique de la caméra
├── models/             # Placez ici vos .glb : etape1.glb ... etape8.glb
│   └── README.txt
└── assets/             # (optionnel) images, logos, etc.
```

## Export des modèles
- **Format** : `.glb` (binaire), textures intégrées.
- **Unités** : mètres.
- **Origine** : idéalement centrée (0,0,0). Sinon, le cadrage auto compensera.
- **Compression** : si vous utilisez la compression **DRACO**, le viewer la supporte.

## Licence
Libre d’usage pédagogique. Ajoutez votre licence si nécessaire.
