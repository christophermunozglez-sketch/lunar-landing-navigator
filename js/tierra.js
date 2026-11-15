// tierra.js — Coordenadas de la Tierra y los centros de lanzamiento (sin dibujar nada)
//
// Es la versión "Tierra" de js/coordenadas.js. Las mismas reglas:
//   • Latitud:  +90 = polo norte, -90 = polo sur.
//   • Longitud: 0 = Greenwich (Londres). +180 = este, -180 = oeste.
//   • El SUR y el OESTE son NEGATIVOS.
//       Ejemplo: 28.5729° N, 80.6490° W  →  latitud 28.5729, longitud -80.649
//
// ─── ¿CÓMO ESTÁ ACOMODADO EL MODELO? (lo medimos en modelos/tierra.glb) ────
// ¡Igual que la Luna! Por eso sirven las mismas fórmulas:
//   • Eje +Y → polo norte          • Eje -Y → polo sur
//   • Eje +X → latitud 0, longitud 0 (Greenwich con el ecuador)
//   • Eje -Z → longitud +90 (este)  • Eje +Z → longitud -90 (oeste)
// El radio del modelo es 1. Para la Tierra real, 1 = 6371 km.
//
// Para poner algo sobre la Tierra 3D:
//     const { x, y, z } = latLonAPunto(centro.latitud, centro.longitud);
//     marcador.position.set(x, y, z);   // como hijo del modelo de la Tierra
// ───────────────────────────────────────────────────────────────────────────

import { distanciaKm, latLonAPunto, puntoALatLon } from "./coordenadas.js";

// Radio promedio de la Tierra en kilómetros
export const RADIO_TIERRA_KM = 6371.0;

// Las mismas fórmulas de la Luna, con nombre de Tierra para que se lea claro
export const tierraLatLonAPunto = latLonAPunto;
export const tierraPuntoALatLon = puntoALatLon;
export const distanciaTierraKm = (lugarA, lugarB) => distanciaKm(lugarA, lugarB, RADIO_TIERRA_KM);
export const kmATierraModelo = (km) => km / RADIO_TIERRA_KM;
export const tierraModeloAKm = (unidades) => unidades * RADIO_TIERRA_KM;

// ── Centros de lanzamiento (puntos de salida) ──────────────────────────────
// El "id" es el mismo "value" que tienen las opciones del menú
// <select name="centro-lanzamiento"> en coordenadas, misión y lugar.
// Coordenadas investigadas por el equipo.
export const CENTROS_LANZAMIENTO = [
  { id: "opcion-1", nombre: "Kennedy Space Center", latitud: 28.5729, longitud: -80.649, lugar: "Merritt Island, Florida, USA" },
  { id: "opcion-2", nombre: "Cape Canaveral Space Force Station", latitud: 28.4684, longitud: -80.5593, lugar: "Brevard County, Florida, USA" },
  { id: "opcion-3", nombre: "Vandenberg Space Force Base", latitud: 34.742, longitud: -120.5724, lugar: "Santa Barbara County, California, USA" },
  { id: "opcion-4", nombre: "Wallops Flight Facility", latitud: 37.9398, longitud: -75.4647, lugar: "Wallops Island, Virginia, USA" },
  { id: "opcion-5", nombre: "Reagan Test Site Kwajalein Atoll", latitud: 8.7183, longitud: 167.7297, lugar: "Marshall Islands, Pacific Ocean" },
  { id: "opcion-6", nombre: "Rocket Lab Launch Complex 1", latitud: -39.2608, longitud: 177.8653, lugar: "Māhia Peninsula, New Zealand" },
  { id: "opcion-7", nombre: "SpaceX Starbase", latitud: 25.9972, longitud: -97.1561, lugar: "Boca Chica, Texas, USA" },
  // Todavía NO está en los menús (solo guardado para después)
  { id: "opcion-8", nombre: "Kodiak Island (Pacific Spaceport Complex)", latitud: 57.4795, longitud: -153.3745, lugar: "Alaska, USA" },
];

// buscarCentro("opcion-1") → el objeto de Kennedy Space Center (o undefined)
export function buscarCentro(id) {
  return CENTROS_LANZAMIENTO.find((centro) => centro.id === id);
}
