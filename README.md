# DG444 — Habit & Level System ⚔️

App personal de seguimiento de hábitos **gamificada** (estilo RPG): niveles, XP, rangos, rachas, badges y recompensas canjeables. PWA instalable, 100% offline, sin backend.

- **Stack:** HTML + CSS + Vanilla JS (módulos ES6) · `localStorage`
- **Datos:** locales por dispositivo. Cada persona que abra el link tiene su propio progreso, privado, en su navegador.
- **Hosting:** Vercel (sitio estático)

---

## 🚀 Desplegar en Vercel

Tienes 3 formas. La **opción A (GitHub)** es la más cómoda para compartir con amigos porque cada cambio se publica solo.

### Opción A — Desde GitHub (recomendado)
1. Crea un repo en GitHub y sube esta carpeta:
   ```bash
   cd dg444
   git init
   git add .
   git commit -m "DG444 v1.0"
   git branch -M main
   git remote add origin https://github.com/TU_USUARIO/dg444.git
   git push -u origin main
   ```
2. Entra a [vercel.com](https://vercel.com) → **Add New → Project** → importa el repo `dg444`.
3. Framework Preset: **Other**. Build Command: *(vacío)*. Output Directory: *(vacío / raíz)*.
4. **Deploy.** En segundos tendrás una URL tipo `https://dg444.vercel.app`.

### Opción B — Vercel CLI (sin GitHub)
```bash
npm i -g vercel
cd dg444
vercel          # primera vez: responde las preguntas, deja todo por defecto
vercel --prod   # publica a producción
```

### Opción C — Drag & drop
En el dashboard de Vercel puedes arrastrar la carpeta `dg444` directamente (también sirve subirla por File Manager de cualquier hosting estático como Hostinger).

---

## 📲 Compartir con tus amigos

1. Despliega y copia la URL (ej. `https://dg444.vercel.app`).
2. Pásales el link por WhatsApp.
3. Cada quien abre el link → **Compartir → Agregar a pantalla de inicio** (iPhone) o el banner **Instalar app** (Android).
4. Queda como una app nativa, a pantalla completa, y funciona sin internet.

> ⚠️ El progreso de cada persona vive **solo en su dispositivo**. No hay cuentas ni servidor: es privado para cada uno. Si alguien cambia de teléfono puede usar **Ajustes → Exportar progreso** para hacer un respaldo y luego **Importar** en el nuevo.

---

## 🕹️ Cómo funciona el juego

- **+50 XP** por cada hábito completado.
- **+200 XP** bonus al completar el 100% de los hábitos del día (día perfecto 🎉 con confetti).
- **−50 XP** al desmarcar, y al cambiar de día por cada hábito no completado (si las penalizaciones están activas).
- **Nivel** = `floor(XP / 500) + 1`. **Rangos:** Novato → Guerrero → Élite → Leyenda → Imparable.
- **Racha** 🔥 sube si completas ≥1 hábito cada día sin saltarte ninguno.
- **Recompensas:** canjea XP por premios reales que tú definas (modo deuda opcional).

---

## 🛠️ Desarrollo local

Necesitas servir los archivos por HTTP (los módulos ES6 y el Service Worker **no funcionan** abriendo `index.html` con doble clic / `file://`).

```bash
cd dg444
# Cualquiera de estas:
npx serve .                # opción 1
python3 -m http.server 8080  # opción 2 → abre http://localhost:8080
```

---

## 📁 Estructura

```
dg444/
├── index.html          Shell de la PWA
├── manifest.json       Configuración instalable
├── sw.js               Service Worker (offline + notificaciones)
├── vercel.json         Headers para Vercel
├── css/styles.css      Tema Dark RPG completo
├── icons/              Iconos (SVG + PNG 192/512)
└── js/
    ├── app.js          Init, navegación, wiring de eventos
    ├── state.js        Estado + localStorage + migración de versiones
    ├── game.js         XP, niveles, rangos, rachas, badges, penalizaciones
    ├── render.js       Renderizado de las 5 páginas (puro: state → DOM)
    ├── habits.js       CRUD de hábitos + toggle de completado
    ├── rewards.js      Canje de recompensas, historial, modo deuda
    ├── categories.js   CRUD de categorías
    ├── settings.js     Toggles, nombre, reset, export/import
    ├── notify.js       Recordatorios + banner de racha en peligro
    └── ux.js           Toast, XP pop, confetti, haptics, modales, frases
```

---

Diego Gomez · [@diegogomez_444](https://instagram.com/diegogomez_444) · Bogotá, Colombia
