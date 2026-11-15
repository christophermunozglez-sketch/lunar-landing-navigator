// vista-2d.js — Vista 2D del lugar de aterrizaje (aterrizaje.html, View → 2D)
//
// Es un "mapa desde arriba" del plano de la eclíptica (por donde se mueven la
// Tierra y la Luna), mirado desde el norte. El Sol se deja fijo a la izquierda,
// la Tierra al centro y la Luna en su órbita, en el ángulo REAL que tiene
// respecto al Sol en la fecha elegida (eso es la fase de la Luna).
//
// ─── QUÉ ES REAL Y QUÉ NO ──────────────────────────────────────────────────
//   Real   → ángulo Sol-Tierra-Luna (Astronomy.MoonPhase), distancia
//            Tierra-Luna (Astronomy.GeoMoon), día y noche sobre cada disco,
//            si desde el lugar se ve la Tierra y si le da el Sol.
//   No     → los tamaños (la Luna y la Tierra están agrandadas; el Sol está
//            mucho más lejos de lo que se dibuja).
//
// ─── LOS DISCOS (Tierra y Luna) ────────────────────────────────────────────
// Cada disco es un globo visto de frente (proyección ortográfica) usando el
// mapa plano de su textura (img/tierra-mapa.jpg, img/luna-mapa.jpg):
//   • La Luna queda centrada en el lugar de aterrizaje.
//   • La Tierra queda centrada en el centro de lanzamiento.
// Para cada pixel del disco (X, Y) calculamos el punto de la esfera:
//     p = √(1 − X² − Y²)·centro + e·este + n·norte
// y de ahí latitud = asin(p_z), longitud = atan2(p_y, p_x) para leer el mapa.
// El día y la noche salen de  p · ŝ  (ŝ = rumbo al Sol en el sistema del astro):
// positivo → de día. Giramos el disco sobre su centro para que su lado de día
// apunte hacia el Sol dibujado.
// ───────────────────────────────────────────────────────────────────────────

import * as Astronomy from "./lib/astronomy.js";
import { estadoCielo, ejesDelSitio } from "./calculos.js";
import { formatearCoordenadas } from "./coordenadas.js";
import { punto, unitario, limitar, RAD } from "./vectores.js";

const DISTANCIA_MEDIA_LUNA_KM = 384400;
// En img/sol.webp (1920×1080) el disco del Sol está centrado en (960, 525) y mide 345 px de radio
const SOL_IMAGEN = { x: 960, y: 525, radio: 345 };

const cargarImagen = (ruta) =>
  new Promise((listo, error) => {
    const imagen = new Image();
    imagen.onload = () => listo(imagen);
    imagen.onerror = error;
    imagen.src = ruta;
  });

// La imagen del Sol tiene fondo negro: lo volvemos transparente (lo negro
// deja ver las estrellas, lo brillante queda igual).
async function cargarSol(ruta) {
  const imagen = await cargarImagen(ruta);
  const lienzo = document.createElement("canvas");
  lienzo.width = imagen.naturalWidth;
  lienzo.height = imagen.naturalHeight;
  const contexto = lienzo.getContext("2d");
  contexto.drawImage(imagen, 0, 0);
  const datos = contexto.getImageData(0, 0, lienzo.width, lienzo.height);
  const p = datos.data;
  for (let i = 0; i < p.length; i += 4) {
    const alfa = Math.min(1, (Math.max(p[i], p[i + 1], p[i + 2]) / 255) * 1.6);
    for (let k = 0; k < 3; k++) p[i + k] = alfa ? Math.min(255, p[i + k] / alfa) : 0;
    p[i + 3] = alfa * 255;
  }
  contexto.putImageData(datos, 0, 0);
  return lienzo;
}

// Los pixeles de un mapa plano (equirectangular) para poder leerlos rápido
async function cargarMapa(ruta) {
  const imagen = await cargarImagen(ruta);
  const lienzo = document.createElement("canvas");
  lienzo.width = imagen.naturalWidth;
  lienzo.height = imagen.naturalHeight;
  const contexto = lienzo.getContext("2d", { willReadFrequently: true });
  contexto.drawImage(imagen, 0, 0);
  return { ancho: lienzo.width, alto: lienzo.height, pixeles: contexto.getImageData(0, 0, lienzo.width, lienzo.height).data };
}

// Dibuja un globo (ver explicación arriba) en un lienzo aparte de 2·radio pixeles.
//   centro     → { latitud, longitud } que queda en medio del disco
//   sol        → rumbo al Sol en el sistema del astro (x lon 0, y lon 90 E, z norte)
//   haciaSol   → [dx, dy] en la pantalla (y hacia abajo): hacia dónde queda el Sol dibujado
//   noche      → { brillo, tinte: [r, g, b] } cómo se ve el lado de noche
function dibujarGlobo(mapa, radio, centro, sol, haciaSol, noche) {
  const lado = Math.max(2, Math.ceil(radio * 2));
  const lienzo = document.createElement("canvas");
  lienzo.width = lienzo.height = lado;
  const contexto = lienzo.getContext("2d");
  const imagen = contexto.createImageData(lado, lado);
  const salida = imagen.data;

  const { arriba, este, norte } = ejesDelSitio(centro);
  // Giro del disco: el Sol (proyectado en el plano este-norte) debe quedar hacia "haciaSol"
  const anguloSol = Math.atan2(punto(sol, norte), punto(sol, este));
  const anguloPantalla = Math.atan2(-haciaSol[1], haciaSol[0]); // la pantalla tiene y hacia abajo
  const giro = anguloPantalla - anguloSol;
  const [c, s] = [Math.cos(giro), Math.sin(giro)];

  for (let fila = 0; fila < lado; fila++) {
    const Y = 1 - ((fila + 0.5) / lado) * 2; // +1 arriba
    for (let columna = 0; columna < lado; columna++) {
      const X = ((columna + 0.5) / lado) * 2 - 1;
      const r2 = X * X + Y * Y;
      if (r2 > 1) continue;
      const profundidad = Math.sqrt(1 - r2);
      const e = X * c + Y * s;
      const n = -X * s + Y * c;
      const p = [0, 1, 2].map((i) => profundidad * arriba[i] + e * este[i] + n * norte[i]);

      const latitud = Math.asin(limitar(p[2], -1, 1));
      const longitud = Math.atan2(p[1], p[0]);
      const u = Math.min(mapa.ancho - 1, Math.floor(((longitud / Math.PI + 1) / 2) * mapa.ancho));
      const v = Math.min(mapa.alto - 1, Math.floor((0.5 - latitud / Math.PI) * mapa.alto));
      const origen = (v * mapa.ancho + u) * 4;

      // Día (1) o noche (0), con un borde suave en la línea que los separa
      const dia = limitar((punto(p, sol) + 0.06) / 0.12, 0, 1);
      const borde = 0.75 + 0.25 * profundidad; // el borde del disco un poco más oscuro
      const destino = (fila * lado + columna) * 4;
      for (let k = 0; k < 3; k++) {
        const nocturno = mapa.pixeles[origen + k] * noche.brillo + noche.tinte[k];
        salida[destino + k] = (dia * mapa.pixeles[origen + k] + (1 - dia) * nocturno) * borde;
      }
      // Orilla suavizada
      salida[destino + 3] = 255 * limitar((1 - Math.sqrt(r2)) * radio, 0, 1);
    }
  }
  contexto.putImageData(imagen, 0, 0);
  return lienzo;
}

// La navecita (dibujo simple), con las patas tocando el punto (x, y)
function dibujarNave(contexto, x, y, tamano) {
  contexto.save();
  contexto.translate(x, y);
  contexto.scale(tamano / 20, tamano / 20);
  contexto.lineWidth = 2;
  contexto.strokeStyle = "#1b1d22";
  contexto.fillStyle = "#d9a441";
  contexto.beginPath(); // patas
  contexto.moveTo(-9, 0);
  contexto.lineTo(-5, -8);
  contexto.moveTo(9, 0);
  contexto.lineTo(5, -8);
  contexto.stroke();
  contexto.fillRect(-7, -13, 14, 6); // etapa de descenso
  contexto.strokeRect(-7, -13, 14, 6);
  contexto.fillStyle = "#c9ced6";
  contexto.beginPath(); // cabina
  contexto.moveTo(-5, -13);
  contexto.lineTo(-4, -20);
  contexto.lineTo(4, -20);
  contexto.lineTo(5, -13);
  contexto.closePath();
  contexto.fill();
  contexto.stroke();
  contexto.restore();
}

// Etiqueta con fondo oscuro: varias líneas, la primera en negritas
function dibujarEtiqueta(contexto, x, y, lineas, alineacion = "center") {
  contexto.save();
  contexto.font = "600 12px Montserrat, sans-serif";
  const ancho = Math.max(...lineas.map(({ texto }) => contexto.measureText(texto).width)) + 18;
  const alto = lineas.length * 16 + 10;
  const izquierda = alineacion === "center" ? x - ancho / 2 : alineacion === "right" ? x - ancho : x;
  contexto.fillStyle = "rgba(6, 18, 43, 0.82)";
  contexto.beginPath();
  contexto.roundRect(izquierda, y, ancho, alto, 8);
  contexto.fill();
  contexto.textBaseline = "top";
  lineas.forEach(({ texto, color = "#fff", negritas = false }, i) => {
    contexto.font = `${negritas ? 800 : 600} 12px Montserrat, sans-serif`;
    contexto.fillStyle = color;
    contexto.textAlign = "left";
    contexto.fillText(texto, izquierda + 9, y + 6 + i * 16);
  });
  contexto.restore();
  return { izquierda, ancho, alto };
}

const NOMBRES_FASE = [
  "New Moon",
  "Waxing crescent",
  "First quarter",
  "Waxing gibbous",
  "Full Moon",
  "Waning gibbous",
  "Last quarter",
  "Waning crescent",
];
const nombreFase = (angulo) => NOMBRES_FASE[Math.floor(((angulo + 22.5) % 360) / 45)];

// Crea la vista 2D dentro de "lienzo". Devuelve dibujar(fecha, vista) para
// redibujar cuando se mueve el reloj; "vista" viene de observarSitio().
export async function crearVista2D(lienzo, { origen, sitio, info }) {
  const contexto = lienzo.getContext("2d");
  const [mapaTierra, mapaLuna, imagenSol] = await Promise.all([
    cargarMapa("img/tierra-mapa.jpg"),
    cargarMapa("img/luna-mapa.jpg"),
    cargarSol("img/sol.webp"),
  ]);
  let ultimo = null;
  let colorResultado = "#18c93a";

  function dibujar(fecha, vista) {
    ultimo = { fecha, vista };
    if (lienzo.hidden) return; // se dibuja al mostrarla
    const escalaPx = Math.min(window.devicePixelRatio || 1, 2);
    const ancho = lienzo.clientWidth;
    const alto = lienzo.clientHeight;
    if (!ancho || !alto) return;
    lienzo.width = Math.round(ancho * escalaPx);
    lienzo.height = Math.round(alto * escalaPx);
    contexto.setTransform(escalaPx, 0, 0, escalaPx, 0, 0);
    contexto.clearRect(0, 0, ancho, alto);

    // ── Acomodo: el panel de la derecha tapa ~420 px en pantallas anchas ──
    const derecha = ancho > 900 ? ancho - 420 : ancho;
    const bordeSol = derecha * 0.22;
    const radioSol = Math.min(alto * 0.45, derecha * 0.32);
    const sol = { x: bordeSol - radioSol, y: alto * 0.5 };
    const tierra = { x: bordeSol + (derecha - bordeSol) * 0.52, y: alto * 0.5 };
    const radioOrbita = Math.max(80, Math.min((derecha - bordeSol) / 2 - 40, alto * 0.34));
    const radioTierra = radioOrbita * 0.3;
    const radioLuna = Math.max(22, radioOrbita * 0.13);

    // ── Datos reales de la fecha ──
    const fase = Astronomy.MoonPhase(fecha); // 0 = luna nueva, 180 = llena (grados)
    const iluminada = Astronomy.Illumination(Astronomy.Body.Moon, fecha).phase_fraction;
    const distanciaKm = Astronomy.GeoMoon(fecha).Length() * Astronomy.KM_PER_AU;
    const cielo = estadoCielo(fecha);

    // La Luna: el Sol está en el ángulo 180° (izquierda); la Luna en 180° + fase,
    // contando contra las manecillas del reloj (así se ve desde el norte).
    const angulo = (180 + fase) * RAD;
    const radioReal = radioOrbita * (distanciaKm / DISTANCIA_MEDIA_LUNA_KM);
    const luna = { x: tierra.x + radioReal * Math.cos(angulo), y: tierra.y - radioReal * Math.sin(angulo) };

    // ── Sol ──
    const k = radioSol / SOL_IMAGEN.radio;
    contexto.drawImage(imagenSol, sol.x - SOL_IMAGEN.x * k, sol.y - SOL_IMAGEN.y * k, imagenSol.width * k, imagenSol.height * k);

    // ── Órbita media de la Luna (punteada) y flecha del sentido en que avanza ──
    contexto.save();
    contexto.strokeStyle = "rgba(255, 255, 255, 0.85)";
    contexto.lineWidth = 2;
    contexto.setLineDash([9, 7]);
    contexto.beginPath();
    contexto.arc(tierra.x, tierra.y, radioOrbita, 0, Math.PI * 2);
    contexto.stroke();
    contexto.setLineDash([]);
    const flecha = angulo + 0.32;
    const punta = { x: tierra.x + radioOrbita * Math.cos(flecha), y: tierra.y - radioOrbita * Math.sin(flecha) };
    contexto.translate(punta.x, punta.y);
    contexto.rotate(-flecha); // tangente, en el sentido del movimiento
    contexto.fillStyle = "#fff";
    contexto.beginPath();
    contexto.moveTo(0, -7);
    contexto.lineTo(6, 4);
    contexto.lineTo(-6, 4);
    contexto.closePath();
    contexto.fill();
    contexto.restore();

    // ── Línea Luna → Tierra: ¿hay comunicación desde el lugar? ──
    const tierraVisible = vista.tierra.visible;
    const dx = tierra.x - luna.x;
    const dy = tierra.y - luna.y;
    const d = Math.hypot(dx, dy);
    contexto.save();
    contexto.strokeStyle = tierraVisible ? "#3dff6a" : "#ff5a4f";
    contexto.lineWidth = 2;
    if (!tierraVisible) contexto.setLineDash([4, 6]);
    contexto.beginPath();
    contexto.moveTo(luna.x + (dx / d) * (radioLuna + 4), luna.y + (dy / d) * (radioLuna + 4));
    contexto.lineTo(tierra.x - (dx / d) * (radioTierra + 4), tierra.y - (dy / d) * (radioTierra + 4));
    contexto.stroke();
    contexto.restore();

    // ── Tierra (centrada en el centro de lanzamiento) ──
    // Rumbo al Sol en el sistema pegado a la Tierra, girando con el tiempo sideral
    const giro = Astronomy.SiderealTime(fecha) * 15 * RAD;
    const solEspacio = Astronomy.GeoVector(Astronomy.Body.Sun, fecha, false);
    const solTierra = unitario([
      solEspacio.x * Math.cos(giro) + solEspacio.y * Math.sin(giro),
      -solEspacio.x * Math.sin(giro) + solEspacio.y * Math.cos(giro),
      solEspacio.z,
    ]);
    const haciaSolDesde = (p) => unitario([sol.x - p.x, sol.y - p.y, 0]);
    const globoTierra = dibujarGlobo(mapaTierra, radioTierra * escalaPx, origen, solTierra, haciaSolDesde(tierra), {
      brillo: 0.12,
      tinte: [4, 10, 30],
    });
    contexto.drawImage(globoTierra, tierra.x - radioTierra, tierra.y - radioTierra, radioTierra * 2, radioTierra * 2);
    contexto.fillStyle = "#4da3ff";
    contexto.strokeStyle = "#fff";
    contexto.lineWidth = 1.5;
    contexto.beginPath();
    contexto.arc(tierra.x, tierra.y, 4, 0, Math.PI * 2);
    contexto.fill();
    contexto.stroke();

    // ── Luna (centrada en el lugar de aterrizaje) ──
    const globoLuna = dibujarGlobo(mapaLuna, radioLuna * escalaPx, sitio, unitario(cielo.sol), haciaSolDesde(luna), {
      brillo: 0.08,
      tinte: [3, 4, 8],
    });
    contexto.drawImage(globoLuna, luna.x - radioLuna, luna.y - radioLuna, radioLuna * 2, radioLuna * 2);
    contexto.strokeStyle = colorResultado;
    contexto.lineWidth = 2.5;
    contexto.beginPath();
    contexto.arc(luna.x, luna.y, radioLuna * 0.42, 0, Math.PI * 2);
    contexto.stroke();
    dibujarNave(contexto, luna.x, luna.y + radioLuna * 0.22, Math.max(14, radioLuna * 0.55));

    // ── Etiquetas ──
    const solVisible = vista.sol.visible;
    const debajoLuna = luna.y + radioLuna + 10 + 58 < alto - 90;
    dibujarEtiqueta(contexto, luna.x, debajoLuna ? luna.y + radioLuna + 10 : luna.y - radioLuna - 68, [
      { texto: `Moon · ${sitio.nombre}`, negritas: true },
      { texto: solVisible ? "☀ In sunlight" : "☾ In shadow", color: solVisible ? "#ffd34d" : "#9fb4d9" },
      {
        texto: tierraVisible ? "📡 Earth in view" : "📡 Earth below horizon",
        color: tierraVisible ? "#3dff6a" : "#ff8a80",
      },
    ]);
    dibujarEtiqueta(contexto, tierra.x, tierra.y + radioTierra + 10, [
      { texto: "Earth", negritas: true },
      { texto: `● ${origen.nombre}`, color: "#8cc4ff" },
    ]);
    dibujarEtiqueta(contexto, Math.max(16, bordeSol - radioSol * 0.6), sol.y + radioSol * 0.75, [
      { texto: "Sun", negritas: true },
      { texto: "light comes from here", color: "#ffd34d" },
    ], "left");

    // Texto de arriba (HTML): datos reales de este momento
    if (info) {
      info.innerHTML = `<strong>2D view</strong> · ecliptic plane seen from the north, Sun fixed to the left
        <span>${nombreFase(fase)} · ${(iluminada * 100).toFixed(0)} % lit · Sun–Earth–Moon angle ${fase.toFixed(0)}°</span>
        <span>Earth–Moon ${Math.round(distanciaKm).toLocaleString("en-US")} km · Site ${formatearCoordenadas(sitio.latitud, sitio.longitud)} (centre of the Moon disc)</span>
        <span class="nota">Positions and day/night are real; sizes are not to scale.</span>`;
    }
  }

  const redibujar = () => ultimo && dibujar(ultimo.fecha, ultimo.vista);
  new ResizeObserver(redibujar).observe(lienzo);

  return {
    dibujar,
    redibujar,
    ponerColor(color) {
      colorResultado = color;
      redibujar();
    },
  };
}
