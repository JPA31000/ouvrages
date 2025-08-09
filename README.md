
# Jeu pédagogique 3D – OBJ (Phases + Score)

Jeu web (Three.js) basé sur un **fichier .OBJ** (avec **.MTL** optionnel). Il propose des **phases** de construction, un **score**, un **timer**, et un **objectif** d'identification d'objets par phase.

## Fonctions clés
- Chargement OBJ/MTL depuis **URL** (`?obj=&mtl=`) ou via **import manuel** (boutons).
- **Phases** détectées automatiquement par **regex** sur les noms d’objets (modifiable).
- **Assignation manuelle** : cliquez un mesh, choisissez la phase et **Assigner**.
- **Jeu** : objectifs par phase (N cibles aléatoires), score + timer, export **CSV** des résultats.
- **Isolation** de phase, recadrage, mode **fil de fer**, **coupes**.

## Déploiement GitHub Pages
1. Déposez tout le dossier sur un dépôt public (`main`).  
2. **Settings → Pages** → *Deploy from a branch* → `main` / `/ (root)`.
3. Ouvrez : `https://<user>.github.io/<repo>/?obj=mon.obj&mtl=mon.mtl`

> Placez les textures référencées par le `.mtl` à côté des fichiers (mêmes chemins relatifs).

## Personnalisation
- Paramètres du jeu (durée, points, nombre de cibles) : dans `js/game.js`, objet `GAME`.
- Mots-clés de détection des phases : tableau `PHASES` (regex).

## Astuces
- Donnez des noms explicites aux groupes/objets à l’export (ex. `wall_`, `slab_`, `door_`, etc.).
- Évitez les OBJ > 50 Mo pour de bonnes perfs.
