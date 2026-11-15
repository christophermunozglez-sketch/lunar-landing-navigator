// pagina-comparar.js — Pantalla dividida para comparar entradas (comparar.html)
//
// Cómo funciona, paso a paso:
// 1. La dirección trae todas las entradas (js/entradas.js):
//      comparar.html?e=<entrada 1>&e=<entrada 2>&vista=trayectoria
// 2. Por cada entrada ponemos un panel. Cada panel es un <iframe>: una ventanita
//    que abre la MISMA página de siempre (trayectoria.html o aterrizaje.html)
//    con los datos de esa entrada. Así no se repite ningún cálculo ni dibujo:
//    cada panel conserva su animación, su panel de información y su "View" 3D/2D.
// 3. COMPARE vuelve al inicio llevando todas las entradas, para agregar otra.
// 4. La ✕ de un panel quita esa entrada.

import { entradasPrevias, direccionCon, MAXIMO_ENTRADAS } from "./entradas.js";
import { buscarCentro } from "./tierra.js";

// Las páginas están diseñadas para una pantalla ancha. Si el panel es más
// angosto, la página se abre con este ancho y se encoge como una foto para que
// quepa (igual que en el diseño). Si quedaría demasiado chica para leerse, se
// deja a su tamaño real y la página usa su acomodo de pantalla angosta.
const ANCHO_PAGINA = 920;
const ESCALA_MINIMA = 0.66;

const entradas = entradasPrevias();
if (!entradas.length) window.location.replace("index.html");

const vista = new URLSearchParams(window.location.search).get("vista") === "aterrizaje" ? "aterrizaje" : "trayectoria";
const abrir = (lista, cualVista = vista) =>
  (window.location.href = lista.length ? direccionCon("comparar.html", lista, { vista: cualVista }) : "index.html");

// --- Barra de arriba ---
document.getElementById("titulo-comparar").innerHTML =
  `Comparing <strong>${entradas.length} ${entradas.length === 1 ? "entry" : "entries"}</strong>`;
for (const boton of document.querySelectorAll("[data-vista]")) {
  boton.classList.toggle("boton-return", boton.dataset.vista !== vista); // el de la vista actual va relleno
  boton.addEventListener("click", () => abrir(entradas, boton.dataset.vista)); // también sirve para repetir las animaciones a la vez
}
const botonComparar = document.getElementById("comparar");
botonComparar.disabled = entradas.length >= MAXIMO_ENTRADAS;
botonComparar.title = botonComparar.disabled ? `Up to ${MAXIMO_ENTRADAS} entries can be compared` : "Add another entry";
botonComparar.addEventListener("click", () => (window.location.href = direccionCon("index.html", entradas)));

// --- Un panel por entrada ---
const paneles = document.getElementById("paneles");
// Cuántas columnas: hasta 3 entradas van lado a lado; 4 en 2×2; 5 y 6 en 3 columnas
paneles.style.setProperty("--columnas", entradas.length <= 3 ? entradas.length : entradas.length === 4 ? 2 : 3);

entradas.forEach((entrada, numero) => {
  const datos = new URLSearchParams(entrada);
  const centro = buscarCentro(datos.get("origen"));

  const panel = document.createElement("section");
  panel.className = "panel-comparar";
  panel.innerHTML = `
    <header>
      <b>${numero + 1}</b>
      <span></span>
      <button type="button" title="Remove this entry" aria-label="Remove entry ${numero + 1}">✕</button>
    </header>
    <div class="marco"><iframe title="Entry ${numero + 1}"></iframe></div>`;
  // textContent (no innerHTML): el nombre viene de la dirección y no debe leerse como HTML
  panel.querySelector("span").textContent =
    `${datos.get("nombre") || "Custom coordinates"} · ${centro?.nombre ?? "?"} · ${datos.get("fecha")} ${datos.get("hora")} UTC`;
  panel.querySelector("button").addEventListener("click", () => abrir(entradas.filter((_, i) => i !== numero)));

  const marco = panel.querySelector(".marco");
  const ventana = panel.querySelector("iframe");
  ventana.src = `${vista}.html?${entrada}`;
  paneles.append(panel);

  // Encoger la página para que quepa en el panel (ver ANCHO_PAGINA arriba)
  const ajustar = () => {
    const escala = marco.clientWidth / ANCHO_PAGINA;
    const encoger = escala < 1 && escala >= ESCALA_MINIMA;
    ventana.style.width = encoger ? `${ANCHO_PAGINA}px` : "100%";
    ventana.style.height = encoger ? `${marco.clientHeight / escala}px` : "100%";
    ventana.style.transform = encoger ? `scale(${escala})` : "none";
  };
  new ResizeObserver(ajustar).observe(marco);
});
