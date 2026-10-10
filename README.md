# Games

## Parchís de peluches (`parchis/`)

Parchís en 3D (three.js) con el tablero dibujado a boli sobre una hoja de libreta y fichas de peluche:
los peluches de la casa: Pingu, Lulu, Pandochka, Moni, Tigri, Milka y Winnie the puss. Se juega de 2 a 4 jugadores, personas u ordenador.

Como usa módulos ES, hay que servirlo por HTTP (abrir `index.html` con doble clic no funciona):

```sh
cd parchis
python3 -m http.server 8000
# y abre http://localhost:8000
```

- `js/rules.js`: reglas (no depende de three.js; se puede probar con node).
- `js/board.js`: geometría del tablero y dibujo a boli.
- `js/plush.js`: los seis peluches en versión caricatura.
- `js/dice.js`: el dado de papel.
- `js/main.js`: escena, turnos, animaciones e interfaz.
- `peluches.html`: visor 3D para ver los peluches de cerca (http://localhost:8000/peluches.html).
