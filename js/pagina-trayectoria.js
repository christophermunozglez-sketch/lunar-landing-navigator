// pagina-trayectoria.js — Animación del viaje Tierra → Luna (trayectoria.html)
//
// Cómo funciona, paso a paso:
// 1. Leemos los datos de la misión (js/datos.js) y calculamos el viaje
//    (js/trayectoria.js). El cálculo NO dibuja; aquí solo lo mostramos.
// 2. Armamos la escena: Tierra, Luna, Sol, la línea punteada y la nave.
// 3. En cada cuadro avanzamos el reloj de la misión y movemos todo:
//    la Luna por su órbita real, la Tierra girando y la nave por la línea.
// 4. "Continue" lleva a la información del aterrizaje (aterrizaje.html).

import * as THREE from "three";
import * as Astronomy from "./lib/astronomy.js";
import { leerDatos, irA, formatearDuracion, formatearFecha } from "./datos.js";
import { calcularTrayectoria, ALTITUD_ESTACIONAMIENTO_KM } from "./trayectoria.js";
import { marcoLunar } from "./calculos.js";
import { latLonAPunto, formatearCoordenadas, RADIO_LUNA_KM } from "./coordenadas.js";
import { RADIO_ECUATORIAL_TIERRA_KM as RADIO_TIERRA_KM } from "./tierra.js";
import { suma, resta, escala, norma, limitar } from "./vectores.js";
import {
  crearEscena,
  cargarModelo,
  agregarSol,
  aTres,
  orientarLuna,
  orientarTierra,
  crearNave,
  crearMarcador,
} from "./escena.js";

// Ajustes fáciles de cambiar
const KM_POR_UNIDAD = 10000; // 1 unidad de la escena = 10 000 km
const AGRANDAR = 4; // la Tierra y la Luna se dibujan 4 veces más grandes
const DURACION = 20; // segundos que dura la animación
// Qué parte de la animación ocupa cada etapa (el viaje real dura ~1 h, ~5 días y ~2 h)
const REPARTO = [0, 0.15, 0.7, 1];
const DISTANCIA_SOL = 120; // el Sol se dibuja en su dirección real, pero cerca
const ZONA_LUNA_KM = [30000, 66000]; // dónde la nave pasa de "junto a la Tierra" a "junto a la Luna"

// --- 1. Datos y cálculo ---
const datos = leerDatos();
const viaje = calcularTrayectoria(datos.origen, datos.salida, datos.destino);
const tLlegadaLuna = viaje.fases.find((fase) => fase.nombre === "Lunar orbit").t;
const tFinal = viaje.muestras.at(-1).t;
const cortes = [0, viaje.fases[1].t, tLlegadaLuna, tFinal]; // segundos donde cambia la etapa

// ── De kilómetros reales a la pantalla ─────────────────────────────────────
// Como la Tierra y la Luna están agrandadas, la nave quedaría "dentro" de
// ellas. Por eso empujamos cada punto hacia afuera lo mismo que creció el
// cuerpo: la altura sobre la superficie se conserva.
const empujar = (v, extraKm) => escala(v, 1 + extraKm / norma(v));
const EXTRA_TIERRA = (AGRANDAR - 1) * RADIO_TIERRA_KM;
const EXTRA_LUNA = (AGRANDAR - 1) * RADIO_LUNA_KM;
const aEscena = (km) => aTres(km).divideScalar(KM_POR_UNIDAD);

const lunaEnEscena = (luna) => aEscena(empujar(luna, EXTRA_TIERRA));
const juntoALuna = (nave, luna) => aEscena(empujar(resta(nave, luna), EXTRA_LUNA)); // respecto a la Luna
function naveEnEscena(nave, luna) {
  const cercaTierra = aEscena(empujar(nave, EXTRA_TIERRA));
  const cercaLuna = lunaEnEscena(luna).add(juntoALuna(nave, luna));
  const distancia = norma(resta(nave, luna));
  const mezcla = limitar((distancia - ZONA_LUNA_KM[0]) / (ZONA_LUNA_KM[1] - ZONA_LUNA_KM[0]), 0, 1);
  return cercaLuna.lerp(cercaTierra, mezcla * mezcla * (3 - 2 * mezcla));
}

// Puntos del camino ya en pantalla, de dos formas: "nave" medida desde la
// Tierra y "relativa" medida desde la Luna. Hasta llegar a la Luna usamos la
// primera; después la segunda (esa parte del camino viaja pegada a la Luna).
const camino = viaje.muestras.map((muestra) => ({
  t: muestra.t,
  luna: lunaEnEscena(muestra.luna),
  nave: naveEnEscena(muestra.nave, muestra.luna),
  relativa: juntoALuna(muestra.nave, muestra.luna),
}));
const indiceLuna = camino.findIndex((punto) => punto.t >= tLlegadaLuna);

// Posición de la nave y de la Luna en el segundo "t" (mezcla las dos muestras vecinas)
function estadoEn(t) {
  let i = camino.findIndex((punto) => punto.t >= t);
  if (i < 0) i = camino.length - 1;
  const b = camino[i];
  const a = camino[Math.max(i - 1, 0)];
  const f = b.t > a.t ? (t - a.t) / (b.t - a.t) : 1;
  const luna = a.luna.clone().lerp(b.luna, f);
  const nave = t <= tLlegadaLuna ? a.nave.clone().lerp(b.nave, f) : a.relativa.clone().lerp(b.relativa, f).add(luna);
  return { nave, luna };
}

// --- 2. Escena ---
const { escena, camara, controles, cadaCuadro } = crearEscena(document.getElementById("vista-3d"));
const sol = agregarSol(escena, 10);

const tierra = new THREE.Group();
const luna = new THREE.Group();
tierra.scale.setScalar((RADIO_TIERRA_KM * AGRANDAR) / KM_POR_UNIDAD);
luna.scale.setScalar((RADIO_LUNA_KM * AGRANDAR) / KM_POR_UNIDAD);
escena.add(tierra, luna);
cargarModelo("modelos/tierra.glb").then((modelo) => tierra.add(modelo));
cargarModelo("modelos/luna.glb").then((modelo) => luna.add(modelo));

// Marcas: de dónde sale (verde) y dónde aterriza (rojo). Como son "hijas" de
// los modelos, giran junto con ellos.
const enModelo = (lugar) => Object.values(latLonAPunto(lugar.latitud, lugar.longitud, 1.01));
tierra
  .add(crearMarcador(0x5de39a, 0.04))
  .children.at(-1)
  .position.set(...enModelo(datos.origen));
luna
  .add(crearMarcador(0xff5d6c, 0.07))
  .children.at(-1)
  .position.set(...enModelo(datos.destino));

// Línea punteada del camino: un tramo fijo (hasta la Luna) y otro que viaja con la Luna
const punteado = new THREE.LineDashedMaterial({ color: 0xffffff, dashSize: 0.5, gapSize: 0.3 });
const linea = (puntos, material) =>
  new THREE.Line(new THREE.BufferGeometry().setFromPoints(puntos), material).computeLineDistances();
escena.add(
  linea(
    camino.slice(0, indiceLuna + 1).map((punto) => punto.nave),
    punteado,
  ),
);
const orbitaLunar = linea(
  camino.slice(indiceLuna).map((punto) => punto.relativa),
  new THREE.LineDashedMaterial({ color: 0xffffff, dashSize: 0.06, gapSize: 0.04 }),
);
// El camino de la Luna durante el viaje (gris, tenue)
escena.add(
  orbitaLunar,
  linea(
    camino.map((punto) => punto.luna),
    new THREE.LineBasicMaterial({ color: 0x55607a }),
  ),
);

const nave = crearNave();
escena.add(nave);

// Cámara: de frente al plano donde se mueve la Luna, un poco inclinada, y a
// la distancia justa para que quepan la Tierra y todo el camino de la Luna.
const lunaInicio = camino[0].luna;
const lunaFin = camino.at(-1).luna;
const centro = lunaInicio.clone().add(lunaFin).divideScalar(3); // punto medio entre Tierra (0,0,0) y la Luna al inicio y al final
const radioVista = Math.max(centro.length(), centro.distanceTo(lunaInicio), centro.distanceTo(lunaFin)) + 4;
const arribaPlano = new THREE.Vector3().crossVectors(lunaInicio, lunaFin).normalize();
if (arribaPlano.y < 0) arribaPlano.negate();
const deLado = new THREE.Vector3().crossVectors(lunaFin, arribaPlano).normalize();
const haciaCamara = arribaPlano.clone().multiplyScalar(0.85).addScaledVector(deLado, 0.5).normalize();
const distanciaGeneral = radioVista / Math.sin((camara.fov * Math.PI) / 360) / Math.min(1, camara.aspect);
const DISTANCIA_CERCA = 9; // acercamiento al llegar a la Luna
let camaraLibre = false; // true cuando el usuario mueve la cámara: dejamos de moverla nosotros
controles.addEventListener("start", () => (camaraLibre = true));

function acomodarCamara() {
  camaraLibre = false;
  controles.target.copy(centro);
  camara.position.copy(centro).addScaledVector(haciaCamara, distanciaGeneral);
}

// --- Panel de datos ---
const { datos: d } = viaje;
const filas = [
  ["Launch site", datos.origen.nombre],
  ["Launch", formatearFecha(datos.salida)],
  ["Launch azimuth", `${d.azimutLanzamiento.toFixed(1)}°`],
  ["Parking orbit", `${ALTITUD_ESTACIONAMIENTO_KM} km · ${d.inclinacion.toFixed(1)}° incl.`],
  ["TLI burn (Δv)", `${d.deltaVTLI.toFixed(2)} km/s`],
  ["Lunar orbit burn (Δv)", `${d.deltaVLOI.toFixed(2)} km/s`],
  ["Descent (Δv, est.)", `${d.deltaVDescenso.toFixed(2)} km/s`],
  ["Total Δv", `${d.deltaVTotal.toFixed(2)} km/s`],
  ["Moon distance", `${Math.round(d.distanciaLunaKm).toLocaleString("en-US")} km`],
  ["Flight time", formatearDuracion(d.horasVuelo)],
  ["Landing", formatearFecha(viaje.llegada)],
  ["Landing site", `${datos.destino.nombre} · ${formatearCoordenadas(datos.destino.latitud, datos.destino.longitud)}`],
];
// textContent (no innerHTML): el nombre del lugar viene de la dirección y no debe leerse como HTML
const listaDatos = document.getElementById("datos-viaje");
for (const [nombre, valor] of filas) {
  const titulo = document.createElement("dt");
  const dato = document.createElement("dd");
  titulo.textContent = nombre;
  dato.textContent = valor;
  listaDatos.append(titulo, dato);
}
if (!viaje.convergio) console.warn("La puntería no llegó a 100 km de la Luna; se muestra la mejor aproximación.");

// --- 3. Animación ---
const textoFase = document.getElementById("fase");
const botonContinuar = document.getElementById("continuar");
let avance = 0; // 0 = despegue, 1 = aterrizaje
const ARRIBA = new THREE.Vector3(0, 1, 0);

cadaCuadro((segundos) => {
  avance = Math.min(1, avance + segundos / DURACION);

  // De "avance" (0 a 1) al segundo real de la misión, etapa por etapa
  const etapa = Math.min(
    REPARTO.findLastIndex((inicio) => avance >= inicio),
    2,
  );
  const dentro = (avance - REPARTO[etapa]) / (REPARTO[etapa + 1] - REPARTO[etapa]);
  const t = cortes[etapa] + dentro * (cortes[etapa + 1] - cortes[etapa]);
  const fecha = new Date(datos.salida.getTime() + t * 1000);

  // Tierra, Luna y Sol como están ese día y a esa hora
  const estado = estadoEn(t);
  luna.position.copy(estado.luna);
  orbitaLunar.position.copy(estado.luna);
  orientarLuna(luna, marcoLunar(fecha));
  orientarTierra(tierra, fecha);
  const haciaSol = Astronomy.GeoVector(Astronomy.Body.Sun, fecha, false);
  sol.colocar(aTres([haciaSol.x, haciaSol.y, haciaSol.z]).normalize().multiplyScalar(DISTANCIA_SOL));

  // La nave: parada "hacia afuera" de la Tierra y, al final, de la Luna
  nave.position.copy(estado.nave);
  const junto = etapa === 2 ? estado.luna : new THREE.Vector3();
  nave.quaternion.setFromUnitVectors(ARRIBA, estado.nave.clone().sub(junto).normalize());
  nave.scale.setScalar(etapa === 2 ? 0.25 : etapa === 1 ? 0.9 : 0.5);

  // La cámara sigue la acción: vista general y, al llegar, acercamiento a la Luna
  if (!camaraLibre) {
    const objetivo = etapa === 2 ? estado.luna : centro;
    const distancia = etapa === 2 ? DISTANCIA_CERCA : distanciaGeneral;
    const direccion = camara.position.clone().sub(controles.target);
    const nueva = THREE.MathUtils.lerp(direccion.length(), distancia, 0.05);
    controles.target.lerp(objetivo, 0.08);
    camara.position.copy(controles.target).addScaledVector(direccion.normalize(), nueva);
  }

  const nombre = viaje.fases.findLast((fase) => t >= fase.t).nombre;
  textoFase.innerHTML =
    avance < 1
      ? `<strong>${nombre}</strong> · T+ ${formatearDuracion(t / 3600)}`
      : `<strong>Landed!</strong> · ${formatearFecha(viaje.llegada)}`;
  botonContinuar.classList.toggle("listo", avance >= 1);
});

// --- 4. Botones ---
function repetir() {
  avance = 0;
  acomodarCamara();
}
repetir();
document.getElementById("repetir").addEventListener("click", repetir);
document.getElementById("regresar").addEventListener("click", () => window.history.back());
botonContinuar.addEventListener("click", () => irA("aterrizaje.html", datos));
