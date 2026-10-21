# Games

## Parchís de peluches (`parchis/`)

Parchís en 3D (three.js) con el tablero dibujado a boli sobre una hoja de libreta y fichas de peluche:
los peluches de la casa: Pingu, Lulu, Pandochka, Moni, Tigri, Milka, Winnie the Poos, Early grey, Ozita, Gluglu, Foxy, Orqui, Bananito y Piratilla. Se juega de 2 a 4 jugadores, personas u ordenador.

Como usa módulos ES, hay que servirlo por HTTP (abrir `index.html` con doble clic no funciona):

```sh
cd parchis
python3 -m http.server 8000
# y abre http://localhost:8000
```

**En internet (GitHub Pages):** https://mmatutes-beep.github.io/Games/ abre el juego y
https://mmatutes-beep.github.io/Games/parchis/peluches.html el visor de peluches. Para activarlo:
Settings → Pages → *Deploy from a branch* → `main` / `(root)`.

- `js/rules.js`: reglas (no depende de three.js; se puede probar con node).
- `js/board.js`: geometría del tablero y dibujo a boli.
- `js/plush.js`: los seis peluches en versión caricatura.
- `js/dice.js`: el dado de papel.
- `js/main.js`: escena, turnos, animaciones, fiesta final e interfaz.
- `js/fx.js`: armas, rótulos de cómic, propulsores y partículas.
- `js/music.js`: música de la fiesta, sintetizada con WebAudio.
- `js/tunes.js`: las cinco melodías de la fiesta (dominio público), que rotan en cada victoria: Can-Can (Offenbach), Guillermo Tell (Rossini), Turkey in the Straw (popular), Entrada de los gladiadores (Fučík) y The Entertainer (Joplin).
- `manifest.webmanifest` e `icons/`: al añadirlo a la pantalla de inicio se abre a pantalla completa con el icono de Pingu.
- `peluches.html`: visor 3D para ver los peluches de cerca (http://localhost:8000/peluches.html).
