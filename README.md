# Jeu pédagogique BTP - 3D + Quiz + HUD

Prototype prêt pour GitHub Pages : visualisation 3D par étapes (`models/etape1.glb` → `models/etape8.glb`), avec **HUD de progression** et **quiz** (2/3 bonnes réponses) pour débloquer l'étape suivante.

## Modifier les intitulés d'étapes
Dans `index.html`, tableau `STEPS` :
```js
const STEPS = ["Terrassement","Fondations","Superstructure","Planchers","Murs","Menuiseries ext.","Toiture","Finitions"];
```

## Modifier les questions du quiz
Toujours dans `index.html`, objet `QUIZ` : 3 questions par étape minimum.
```js
const QUIZ = {
  1: [{ q: "Question ...", choices: ["A","B","C"], correct: 0 }, ...],
  2: [...],
  ...
}
```
- `choices` = 3 propositions (vous pouvez en mettre plus, l’interface s’adapte).
- `correct` = index (0, 1, 2, ... ) de la bonne réponse dans `choices`.

## Déploiement sur GitHub Pages
1. Placez vos `.glb` dans `models/` (ex : `etape1.glb` … `etape8.glb`).
2. Poussez ce dossier dans un dépôt GitHub.
3. Activez **Settings → Pages** (branch principale, dossier root).

## Lancement local (développement)
Servez depuis un petit serveur local (sinon les `.glb` ne chargeront pas en `file://`).

### Python
```bash
python -m http.server 8000
# ou sous Windows
py -m http.server 8000
```
Puis allez sur `http://localhost:8000`.

### Node.js
```bash
npx http-server -p 8000
```

## Structure
```
.
├── index.html          # Viewer 3D + HUD + Quiz + cadrage auto
├── models/             # Placez etape1.glb ... etape8.glb ici
│   └── README.txt
└── assets/             # (Optionnel)
```
