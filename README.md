# 🌙 Lunar Landing Site Navigator

NASA Space Apps Challenge 2026 · Reto CLPS.

Página web para comparar sitios y fechas de aterrizaje en el polo sur de la Luna: cuánta luz del Sol hay (energía) y
cuándo se ve la Tierra (comunicación).

- 🔗 Página publicada: https://christophermunozglez-sketch.github.io/lunar-landing-navigator/
- 📦 Repositorio: https://github.com/christophermunozglez-sketch/lunar-landing-navigator

---

# 📘 Guía del equipo

Esta guía está hecha para que **cualquiera** pueda trabajar en el proyecto, aunque nunca haya usado Git. Léela en
orden. No te saltes pasos.

## Índice

- [Parte A · La idea en 1 minuto](#parte-a--la-idea-en-1-minuto)
- [Parte B · Conocer VS Code](#parte-b--conocer-vs-code)
- [Parte C · Preparar tu computadora (solo una vez)](#parte-c--preparar-tu-computadora-solo-una-vez)
- [Parte D · Bajar el proyecto a tu computadora (solo una vez)](#parte-d--bajar-el-proyecto-a-tu-computadora-solo-una-vez)
- [Parte E · Ver la página](#parte-e--ver-la-página)
- [Parte F · Trabajar cada día: BAJAR → TRABAJAR → SUBIR](#parte-f--trabajar-cada-día-bajar--trabajar--subir)
- [Parte G · Reglas para no chocar](#parte-g--reglas-para-no-chocar)
- [Parte H · Si algo sale mal](#parte-h--si-algo-sale-mal)
- [Chuleta (para imprimir)](#-chuleta-para-imprimir)

---

## Parte A · La idea en 1 minuto

Piensa en el proyecto como una **carpeta compartida en la nube** (GitHub).

```
                 ☁️  GitHub (la carpeta en la nube)
                 /            \
        ⬇️ BAJAR                ⬆️ SUBIR
               /                \
   💻 Tu computadora        💻 Computadora de tu amigo
```

- Cada quien tiene **una copia** del proyecto en su computadora.
- Cuando terminas algo, lo **SUBES** a la nube.
- Cuando tu amigo sube algo, tú lo **BAJAS** a tu computadora.
- Los cambios **no aparecen solos**. Siempre hay que bajarlos.

Solo vas a usar **3 botones**:

| Palabra en VS Code | Qué significa                       | Cuándo                       |
| ------------------ | ----------------------------------- | ---------------------------- |
| **Pull**           | ⬇️ Bajar lo nuevo de la nube        | Siempre **antes** de empezar |
| **Commit**         | 📸 Guardar una "foto" de tu trabajo | Cuando terminas algo         |
| **Sync Changes**   | ⬆️ Subir tu trabajo a la nube       | Justo después del Commit     |

---

## Parte B · Conocer VS Code

```
┌────┬───────────────┬─────────────────────────────────┐
│ 📄 │               │                                 │
│ 🔍 │    PANEL      │          EDITOR                 │
│ 🌿 │               │   (aquí escribes el código)     │
│ ▶️ │               │                                 │
│ 🧩 │               │                                 │
├────┴───────────────┴─────────────────────────────────┤
│ 🌿 main  ↻                               Go Live     │ ← barra azul de abajo
└──────────────────────────────────────────────────────┘
```

**La barra lateral izquierda** (los íconos de la columna de la izquierda):

| Ícono               | Nombre             | Para qué lo usamos               |
| ------------------- | ------------------ | -------------------------------- |
| 📄 Dos hojitas (1º) | **Explorer**       | Ver y abrir los archivos         |
| 🔍 Lupa (2º)        | Search             | Buscar texto                     |
| 🌿 Ramitas (3º)     | **Source Control** | **Bajar, guardar y subir** (Git) |
| 🧩 Cuatro cuadritos | Extensions         | Instalar extensiones             |

**La barra azul de abajo:**

- A la **izquierda** dice `main`. Siempre debe decir `main`.
- A la **derecha** está el botón **Go Live**, que abre la página.

> 💡 Si no ves la barra lateral, ve al menú **View → Appearance → Activity Bar**.

---

## Parte C · Preparar tu computadora (solo una vez)

### C1. Crear tu cuenta de GitHub

1. Entra a https://github.com/signup y crea tu cuenta.
2. Pásale tu **nombre de usuario** a Chris para que te invite.
3. Te va a llegar un **correo de invitación**. Ábrelo y dale **Accept invitation**.
   - Si no te llega, entra a https://github.com/christophermunozglez-sketch/lunar-landing-navigator/invitations

### C2. Instalar programas

1. **VS Code**: https://code.visualstudio.com → descargar e instalar.
2. **Git**:
   - **Mac**: abre la app **Terminal**, escribe `git --version` y presiona Enter. Si te pide instalar "herramientas
     de desarrollador", dale **Instalar** y espera.
   - **Windows**: https://git-scm.com/download/win → instalar dejando todas las opciones como vienen (solo dale
     **Next** hasta el final).

### C3. Decirle a Git quién eres

1. Abre VS Code.
2. Menú de arriba: **Terminal → New Terminal**. Abajo se abre un cuadro negro.
3. Copia y pega esto, **cambiando el nombre y el correo por los tuyos**, y presiona Enter después de cada línea:

```bash
git config --global user.name "Tu Nombre"
git config --global user.email "tu-correo@ejemplo.com"
```

> 💡 Usa el **mismo correo** que en tu cuenta de GitHub.

### C4. Conectar VS Code con GitHub

1. En VS Code, abajo a la izquierda, haz clic en el **ícono de persona** 👤 (Accounts).
2. Elige **Sign in with GitHub** (o "Backup and Sync Settings… → GitHub").
3. Se abre el navegador. Dale **Authorize** / **Continue**.
4. Si te pregunta si quieres abrir VS Code, dale **Abrir**.

---

## Parte D · Bajar el proyecto a tu computadora (solo una vez)

Esto se llama **clonar**. Solo se hace **una vez** por computadora.

> ⚠️ **Si ya tenías una carpeta `lunar-landing-navigator` de antes**, bórrala primero (mándala a la papelera). El
> proyecto se creó de nuevo y la copia vieja ya no sirve.

1. Abre VS Code.
2. Presiona **Cmd + Shift + P** (Mac) o **Ctrl + Shift + P** (Windows). Arriba sale un cuadro de búsqueda.
3. Escribe **Git: Clone** y presiona Enter.
4. Pega esta dirección y presiona Enter:
   ```
   https://github.com/christophermunozglez-sketch/lunar-landing-navigator.git
   ```
5. Te pide **dónde guardarlo**. Elige tu carpeta **Documentos** y dale **Select as Repository Destination**.
6. Abajo a la derecha sale: _"Would you like to open the cloned repository?"_ → dale **Open**.
7. Si sale _"Do you trust the authors?"_ → dale **Yes, I trust the authors**.
8. Si sale _"Do you want to install the recommended extensions?"_ → dale **Install**.

✅ **Para comprobar:** en **📄 Explorer** debes ver `css`, `js`, `index.html` y `README.md`. Y abajo a la izquierda
debe decir **main**.

### Abrir el proyecto otro día

Ya no se clona otra vez. Solo: VS Code → menú **File → Open Recent → lunar-landing-navigator**.

---

## Parte E · Ver la página

1. En **📄 Explorer**, haz **clic derecho** sobre `index.html`.
2. Elige **Open with Live Server**.
3. Se abre tu navegador con la página.

Cada vez que guardas (**Cmd + S** / **Ctrl + S**), la página se actualiza sola.

> Si no aparece "Open with Live Server": ve a **🧩 Extensions**, busca **Live Server** (de Ritwick Dey) e instálala.

> ⚠️ No abras `index.html` con doble clic. Usa siempre Live Server.

---

## Parte F · Trabajar cada día: BAJAR → TRABAJAR → SUBIR

Haz esto **cada vez** que te sientes a trabajar. Siempre en este orden.

```
  1. ⬇️ BAJAR   →   2. ✏️ TRABAJAR   →   3. 📸 GUARDAR   →   4. ⬆️ SUBIR   →   5. 📣 AVISAR
     (Pull)                              (Commit)            (Sync)
```

### Paso 1 · ⬇️ BAJAR lo nuevo (Pull)

**Para qué:** traer a tu computadora lo que subieron los demás.

📍 **Dónde:** barra lateral izquierda → **🌿 Source Control** (3er ícono).

1. Haz clic en **🌿 Source Control**.
2. Arriba del panel, al lado de la palabra "SOURCE CONTROL", hay **tres puntitos `···`**. Haz clic.
3. Elige **Pull**.

**Forma rápida:** en la barra azul de abajo, junto a `main`, hay un ícono de **flechitas en círculo ↻**. Darle clic
hace lo mismo (baja y sube).

✅ **Listo cuando:** ya ves en **📄 Explorer** los archivos o cambios nuevos de tus compañeros.

### Paso 2 · ✏️ TRABAJAR

📍 **Dónde:** barra lateral → **📄 Explorer** (1er ícono).

1. Haz clic en **📄 Explorer**.
2. Abre tu archivo con un clic.
3. Escribe tu código en el **editor** (la parte grande del centro).
4. Guarda con **Cmd + S** (Mac) o **Ctrl + S** (Windows).
5. Revisa cómo se ve con **Live Server** (Parte E).

> 💡 Un archivo **sin guardar** tiene un **puntito blanco ●** en su pestaña. Si ves el puntito, guarda.

### Paso 3 · 📸 GUARDAR una foto de tu trabajo (Commit)

**Para qué:** decirle a Git "esto ya está listo, guárdalo".

📍 **Dónde:** barra lateral → **🌿 Source Control** (3er ícono). El ícono tiene un **número azul** con la cantidad de
archivos que cambiaste.

1. Haz clic en **🌿 Source Control**.
2. Verás una lista llamada **Changes** con tus archivos.
3. En el cuadro de texto de arriba (dice _"Message"_), escribe **qué hiciste**, por ejemplo:
   ```
   Agrego el botón de fechas
   ```
4. Dale clic al botón azul **✓ Commit**.
5. Si sale un aviso que dice _"There are no staged changes… Would you like to stage all your changes?"_ → dale
   **Always** (o **Yes**).

✅ **Listo cuando:** la lista **Changes** quedó vacía y el botón azul ahora dice **Sync Changes**.

### Paso 4 · ⬆️ SUBIR a la nube (Sync Changes)

**Para qué:** mandar tu trabajo a GitHub para que los demás lo vean.

📍 **Dónde:** el mismo panel **🌿 Source Control**.

1. Dale clic al botón azul **Sync Changes ↑**.
2. Si pregunta _"This action will pull and push commits…"_ → dale **OK, Don't Show Again**.

✅ **Listo cuando:** el botón azul desaparece. Puedes comprobarlo entrando al repositorio en GitHub: tus cambios ya
aparecen ahí.

### Paso 5 · 📣 AVISAR

Escribe en el grupo: **"Ya subí lo del botón de fechas, hagan Pull 👍"**.

Así tus compañeros saben que tienen que **BAJAR** (Paso 1).

---

## Parte G · Reglas para no chocar

Cuando dos personas cambian **el mismo archivo al mismo tiempo**, Git se confunde (esto se llama **conflicto**). Para
evitarlo:

1. **Siempre BAJAR (Pull) antes de empezar.** Siempre.
2. **Cada quien trabaja en sus propios archivos.** Antes de tocar un archivo de otro, pregunta en el grupo.
3. **Sube seguido.** Cuando algo funcione, Commit + Sync. No esperes hasta el final del día.
4. **Avisa** cuando subas algo.
5. **Archivos nuevos:** está bien crear archivos nuevos (por ejemplo `js/fechas.js`). Esos nunca chocan.

### ¿Quién tiene qué archivo?

| Persona | Archivos                                       |
| ------- | ---------------------------------------------- |
| Chris   | `index.html`, `css/inicio.css`, `js/inicio.js` |
|         |                                                |

_(Cada quien agregue aquí su nombre y sus archivos.)_

---

## Parte H · Si algo sale mal

| Lo que pasa                                                 | Qué hacer                                                                                |
| ----------------------------------------------------------- | ---------------------------------------------------------------------------------------- |
| **No me aparecen los cambios de mi amigo**                  | Haz **Pull** (Paso 1). Revisa que tu amigo sí haya hecho **Sync** (Paso 4).              |
| **Abajo a la izquierda no dice `main`**                     | Haz clic ahí y elige **main** de la lista.                                               |
| **No veo los archivos del proyecto**                        | Abriste otra carpeta. Ve a **File → Open Recent → lunar-landing-navigator**.             |
| **Sale error al hacer Sync / Push**                         | Primero haz **Pull**, y después vuelve a darle **Sync Changes**.                         |
| **Me pide usuario y contraseña**                            | Haz la Parte C4 (conectar VS Code con GitHub).                                           |
| **"Permission denied" o 403**                               | No has aceptado la invitación (Parte C1, punto 3).                                       |
| **"Merge conflict" / archivos en rojo con "C"**             | ¡No borres nada! Mándale captura a Chris o al grupo.                                     |
| **La página se ve vieja en el navegador**                   | Recarga con **Cmd + Shift + R** (Mac) o **Ctrl + Shift + R** (Windows).                  |
| **Me equivoqué y quiero deshacer cambios que NO he subido** | **🌿 Source Control** → pasa el mouse sobre el archivo → flechita **↶ Discard Changes**. |

> 🆘 **Si te atoras, no pasa nada.** Toma captura de pantalla de toda la ventana de VS Code y mándala al grupo.

---

## 📋 Chuleta (para imprimir)

```
╔══════════════════════════════════════════════════════════════╗
║  CADA VEZ QUE TRABAJO EN EL PROYECTO:                        ║
║                                                              ║
║  1. ⬇️ BAJAR    🌿 Source Control → ··· → Pull               ║
║  2. ✏️ TRABAJAR 📄 Explorer → abrir archivo → Cmd/Ctrl + S   ║
║  3. 📸 GUARDAR  🌿 Source Control → escribir mensaje → Commit ║
║  4. ⬆️ SUBIR    🌿 Source Control → Sync Changes             ║
║  5. 📣 AVISAR   "Ya subí ___, hagan Pull"                    ║
║                                                              ║
║  Abajo a la izquierda SIEMPRE debe decir: main               ║
╚══════════════════════════════════════════════════════════════╝
```

---

## 👩‍🚀 Equipo

- Chris
