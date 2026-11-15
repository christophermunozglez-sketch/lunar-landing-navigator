// entradas.js — La lista de entradas que se están comparando
//
// Una "entrada" es un escenario completo (centro, fecha, hora y lugar de
// aterrizaje) escrito como texto, igual que viaja en la dirección de la página:
//   "origen=opcion-1&fecha=2026-11-20&hora=14:30&lat=0.6742&lon=23.4731&nombre=Apollo+11"
//
// Al presionar COMPARE el programa se vuelve a correr desde el inicio, pero la
// dirección lleva guardadas las entradas anteriores (una "e" por cada una):
//   index.html?e=<entrada 1>&e=<entrada 2>
// Cuando la entrada nueva queda completa, js/datos.js abre comparar.html con
// todas juntas y la pantalla se divide (js/pagina-comparar.js).
//
//   entradasPrevias()         → las entradas que ya trae la dirección
//   direccionCon(pagina, e)   → "pagina?e=...&e=..." (más lo que se pase en "extra")
//   EMBEBIDA                  → true si esta página es un panel de comparar.html

export const MAXIMO_ENTRADAS = 6; // más paneles ya no caben (y cada uno usa su propia escena 3D)

export const entradasPrevias = () => new URLSearchParams(window.location.search).getAll("e");

export function direccionCon(pagina, entradas, extra = {}) {
  const parametros = new URLSearchParams(extra);
  for (const entrada of entradas) parametros.append("e", entrada);
  const texto = parametros.toString();
  return texto ? `${pagina}?${texto}` : pagina;
}

// ¿Esta página está dentro de un panel de comparar.html? (vive en un <iframe>)
export const EMBEBIDA = window.self !== window.top;
// css/resultados.css esconde lo marcado con "solo-completa" (Return, COMPARE):
// en la comparación esos botones están una sola vez, en la barra de arriba.
if (EMBEBIDA) document.documentElement.classList.add("embebida");

// Mientras se captura una entrada nueva para comparar:
if (entradasPrevias().length) {
  // 1. Los enlaces a otras páginas (los 3 botones del inicio, "Return") conservan la lista
  for (const enlace of document.querySelectorAll("a[href$='.html']")) {
    enlace.href = direccionCon(enlace.getAttribute("href"), entradasPrevias());
  }
  // 2. Los textos marcados con data-al-comparar cambian ("Please enter new location")
  for (const texto of document.querySelectorAll("[data-al-comparar]")) texto.innerHTML = texto.dataset.alComparar;
}
