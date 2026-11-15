// topografia.js — Relieve real de la Luna (datos LOLA de la NASA)
//
// ─── ¿DE DÓNDE SALEN LOS DATOS? ────────────────────────────────────────────
// datos/lola_ldem_4.img es el mapa de alturas "LDEM_4" del altímetro láser LOLA
// (sonda Lunar Reconnaissance Orbiter), tal cual lo publica la NASA en el PDS:
//   https://pds-geosciences.wustl.edu/lro/lro-l-lola-3-rdr-v1/lrolol_1xxx/data/lola_gdr/cylindrical/img/
// Es una cuadrícula de 1440 × 720 números (4 por grado ≈ 7.6 km en el ecuador).
// Cada número × 0.5 = metros por encima (o debajo) de una esfera de 1737.4 km.
//   • Fila 0 = latitud +90 (norte), fila 719 = latitud -90 (sur).
//   • Columna 0 = longitud 0°, hacia el ESTE hasta 360°.
//
// ─── ¿PARA QUÉ SIRVE? ──────────────────────────────────────────────────────
//   1. Horizonte local: qué tan alto tapa el terreno en cada rumbo (montañas,
//      bordes de cráter). En la Luna no hay aire, así que el horizonte es
//      solo el terreno y la curvatura.
//   2. Relieve: qué tan inclinado está el suelo donde se aterriza.
// Con 7.6 km por celda vemos el relieve "grande" (cráteres, montañas), no las
// rocas. Si el archivo no carga, todo sigue funcionando con una Luna lisa.
// ───────────────────────────────────────────────────────────────────────────

import { RADIO_LUNA_KM } from "./coordenadas.js";
import { RAD, GRAD, limitar } from "./vectores.js";

const COLUMNAS = 1440;
const FILAS = 720;
const CELDAS_POR_GRADO = 4;
export const TAMANO_CELDA_KM = (2 * Math.PI * RADIO_LUNA_KM) / COLUMNAS; // ≈ 7.58 km

// Altura de la antena/panel sobre el suelo (2 m). Desde ahí "miramos" el horizonte.
const ALTURA_OBSERVADOR_KM = 0.002;

// Distancias (km) a las que revisamos el terreno: cerca muy seguido y lejos más
// espaciado, hasta 250 km (una montaña de 5 km ya no se ve desde más lejos).
const DISTANCIAS_KM = [];
for (let d = 3; d <= 250; d *= 1.12) DISTANCIAS_KM.push(d);

const PASO_AZIMUT = 4; // el horizonte se calcula cada 4° de rumbo

let alturas = null; // Int16Array con el mapa (o null si no ha cargado)

export const hayTopografia = () => alturas !== null;

// Recibe el archivo ya leído (ArrayBuffer). Sirve en el navegador y en pruebas.
export function usarTopografia(buffer) {
  alturas = buffer.byteLength === COLUMNAS * FILAS * 2 ? new Int16Array(buffer) : null;
  return hayTopografia();
}

// Descarga el mapa. Devuelve true si se pudo.
export async function cargarTopografia(ruta = "datos/lola_ldem_4.img") {
  if (hayTopografia()) return true;
  try {
    const respuesta = await fetch(ruta);
    if (!respuesta.ok) throw new Error(`HTTP ${respuesta.status}`);
    return usarTopografia(await respuesta.arrayBuffer());
  } catch (error) {
    console.warn("No se pudo cargar la topografía LOLA; se usa una Luna lisa.", error);
    return false;
  }
}

// Altura del terreno (km sobre la esfera de 1737.4 km) en una latitud/longitud.
// Mezcla los 4 números más cercanos (interpolación bilineal).
export function alturaKm(latitud, longitud) {
  if (!alturas) return 0;
  const x = (((longitud % 360) + 360) % 360) * CELDAS_POR_GRADO - 0.5;
  const y = limitar((90 - latitud) * CELDAS_POR_GRADO - 0.5, 0, FILAS - 1);
  const x0 = Math.floor(x);
  const y0 = Math.min(Math.floor(y), FILAS - 2);
  const fx = x - x0;
  const fy = y - y0;
  const columna0 = ((x0 % COLUMNAS) + COLUMNAS) % COLUMNAS;
  const columna1 = (columna0 + 1) % COLUMNAS;
  const valor = (fila, columna) => alturas[fila * COLUMNAS + columna];
  const arriba = valor(y0, columna0) * (1 - fx) + valor(y0, columna1) * fx;
  const abajo = valor(y0 + 1, columna0) * (1 - fx) + valor(y0 + 1, columna1) * fx;
  return ((arriba * (1 - fy) + abajo * fy) * 0.5) / 1000; // ×0.5 → metros → km
}

// Punto al que llegas si sales de (latitud, longitud) con un rumbo (azimut:
// 0 = norte, 90 = este) y caminas "distanciaKm" sobre la superficie.
export function puntoDestino(latitud, longitud, azimut, distanciaKm) {
  const lat = latitud * RAD;
  const rumbo = azimut * RAD;
  const arco = distanciaKm / RADIO_LUNA_KM; // ángulo recorrido visto desde el centro
  const senoLat = Math.sin(lat) * Math.cos(arco) + Math.cos(lat) * Math.sin(arco) * Math.cos(rumbo);
  const lat2 = Math.asin(limitar(senoLat, -1, 1));
  const dLon = Math.atan2(
    Math.sin(rumbo) * Math.sin(arco) * Math.cos(lat),
    Math.cos(arco) - Math.sin(lat) * Math.sin(lat2),
  );
  return { latitud: lat2 * GRAD, longitud: longitud + dLon * GRAD };
}

// ── Horizonte local ────────────────────────────────────────────────────────
// Para cada rumbo, la elevación (grados) del punto de terreno que más tapa.
// Si estamos en el punto A (radio rA) y hay terreno B (radio rB) a un arco θ:
//
//     tan(elevación) = (rB·cos θ − rA) / (rB·sin θ)
//
// En terreno plano da un poco menos de 0° (la Luna se curva hacia abajo).
export function perfilHorizonte({ latitud, longitud }) {
  const radioA = RADIO_LUNA_KM + alturaKm(latitud, longitud) + ALTURA_OBSERVADOR_KM;
  const perfil = new Float32Array(360 / PASO_AZIMUT);
  for (let i = 0; i < perfil.length; i++) {
    let maximo = -Infinity;
    for (const distancia of DISTANCIAS_KM) {
      const lugar = puntoDestino(latitud, longitud, i * PASO_AZIMUT, distancia);
      const radioB = RADIO_LUNA_KM + alturaKm(lugar.latitud, lugar.longitud);
      const arco = distancia / RADIO_LUNA_KM;
      maximo = Math.max(maximo, Math.atan2(radioB * Math.cos(arco) - radioA, radioB * Math.sin(arco)));
    }
    perfil[i] = maximo * GRAD;
  }
  return perfil;
}

// Elevación del horizonte en un rumbo cualquiera (mezcla los dos rumbos calculados más cercanos)
export function horizonteEn(perfil, azimut) {
  const posicion = ((((azimut % 360) + 360) % 360) / 360) * perfil.length;
  const i = Math.floor(posicion) % perfil.length;
  const fraccion = posicion - Math.floor(posicion);
  return perfil[i] * (1 - fraccion) + perfil[(i + 1) % perfil.length] * fraccion;
}

// ── Pendiente del terreno ──────────────────────────────────────────────────
// Comparamos la altura una celda al norte, sur, este y oeste:
//
//     pendiente = atan( √( (ΔhEste-Oeste / 2d)² + (ΔhNorte-Sur / 2d)² ) )
//
// Devuelve grados (0 = plano).
export function pendienteGrados({ latitud, longitud }) {
  const d = TAMANO_CELDA_KM;
  const altura = (azimut) => {
    const lugar = puntoDestino(latitud, longitud, azimut, d);
    return alturaKm(lugar.latitud, lugar.longitud);
  };
  const esteOeste = (altura(90) - altura(270)) / (2 * d);
  const norteSur = (altura(0) - altura(180)) / (2 * d);
  return Math.atan(Math.hypot(esteOeste, norteSur)) * GRAD;
}
