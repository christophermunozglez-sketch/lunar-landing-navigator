// coordenadas.js — La lógica de coordenadas de la Luna (sin dibujar nada)
//
// Aquí está todo lo que necesitamos para pasar de "latitud y longitud"
// (lo que escribe el usuario) a "un punto en el modelo 3D" y al revés.
// No usa Three.js, así que se puede usar en cualquier página.
//
// ─── ¿QUÉ SON LATITUD Y LONGITUD EN LA LUNA? ──────────────────────────────
// Igual que en la Tierra:
//   • Latitud:  qué tan al norte o al sur.  +90 = polo norte, -90 = polo sur.
//   • Longitud: qué tan al este o al oeste. 0 = centro de la cara que vemos
//               desde la Tierra. +90 = este, -90 = oeste, ±180 = lado oculto.
// En este proyecto usamos números con signo: el SUR y el OESTE son NEGATIVOS.
//   Ejemplo: 89.5° S, 45° W  →  latitud -89.5, longitud -45
//
// ─── ¿CÓMO ESTÁ ACOMODADO EL MODELO? (lo medimos en modelos/luna.glb) ─────
//   • Eje +Y (arriba)  → polo norte      • Eje -Y (abajo) → polo sur
//   • Eje +X           → latitud 0, longitud 0 (centro de la cara visible)
//   • Eje -Z           → longitud +90 (este)
//   • Eje +Z           → longitud -90 (oeste)
// El radio del modelo es 1. Para la Luna real, 1 = 1737.4 km.
// ───────────────────────────────────────────────────────────────────────────

// Radio promedio de la Luna en kilómetros (dato de la NASA)
export const RADIO_LUNA_KM = 1737.4;

// ── 1. Revisar que unas coordenadas tengan sentido ─────────────────────────
// Devuelve { valida: true } o { valida: false, error: "mensaje" }
export function validarCoordenadas(latitud, longitud) {
  if (typeof latitud !== "number" || Number.isNaN(latitud)) {
    return { valida: false, error: "La latitud debe ser un número" };
  }
  if (typeof longitud !== "number" || Number.isNaN(longitud)) {
    return { valida: false, error: "La longitud debe ser un número" };
  }
  if (latitud < -90 || latitud > 90) {
    return { valida: false, error: "La latitud debe estar entre -90 y 90" };
  }
  if (longitud < -180 || longitud > 180) {
    return { valida: false, error: "La longitud debe estar entre -180 y 180" };
  }
  return { valida: true };
}

// Convierte lo que escribe el usuario (texto) a número.
// Acepta "25.6", "25,6", "-89.5" y también "89.5 S" o "45 W".
// Devuelve el número, o NaN si no se entiende.
export function leerNumero(texto) {
  let limpio = String(texto).trim().toUpperCase().replace(",", ".").replace("°", "");
  let signo = 1;
  if (limpio.endsWith("S") || limpio.endsWith("W") || limpio.endsWith("O")) {
    signo = -1;
    limpio = limpio.slice(0, -1).trim();
  } else if (limpio.endsWith("N") || limpio.endsWith("E")) {
    limpio = limpio.slice(0, -1).trim();
  }
  if (limpio === "") return NaN;
  return signo * Number(limpio);
}

// Si alguien da una longitud como 270 o -200, la regresamos al rango -180..180
export function normalizarLongitud(longitud) {
  return ((((longitud + 180) % 360) + 360) % 360) - 180;
}

// ── 2. Latitud/longitud → punto 3D en el modelo ────────────────────────────
// Devuelve { x, y, z } sobre una esfera de radio "radio" (1 = superficie del modelo).
// Ojo: esto es la esfera "lisa". Para el punto exacto sobre los relieves,
// usa puntoEnSuperficie() de js/luna3d.js.
export function latLonAPunto(latitud, longitud, radio = 1) {
  const lat = gradosARadianes(latitud);
  const lon = gradosARadianes(longitud);
  return {
    x: radio * Math.cos(lat) * Math.cos(lon),
    y: radio * Math.sin(lat),
    z: -radio * Math.cos(lat) * Math.sin(lon),
  };
}

// ── 3. Punto 3D en el modelo → latitud/longitud (lo contrario) ─────────────
// Sirve, por ejemplo, para saber dónde hizo clic el usuario sobre la Luna.
export function puntoALatLon({ x, y, z }) {
  const radio = Math.sqrt(x * x + y * y + z * z);
  return {
    latitud: radianesAGrados(Math.asin(y / radio)),
    longitud: radianesAGrados(Math.atan2(-z, x)),
  };
}

// ── 4. Distancia entre dos lugares de la Luna (en km) ──────────────────────
// Usa la fórmula de "haversine": la distancia caminando por la superficie,
// no en línea recta atravesando la Luna.
export function distanciaKm(lugarA, lugarB) {
  const lat1 = gradosARadianes(lugarA.latitud);
  const lat2 = gradosARadianes(lugarB.latitud);
  const dLat = lat2 - lat1;
  const dLon = gradosARadianes(lugarB.longitud - lugarA.longitud);
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2;
  return 2 * RADIO_LUNA_KM * Math.asin(Math.sqrt(a));
}

// Convierte km reales a unidades del modelo (y al revés)
export const kmAModelo = (km) => km / RADIO_LUNA_KM;
export const modeloAKm = (unidades) => unidades * RADIO_LUNA_KM;

// ── 5. Mostrar coordenadas bonitas ─────────────────────────────────────────
// formatearCoordenadas(-89.5, 45) → "89.50° S, 45.00° E"
export function formatearCoordenadas(latitud, longitud, decimales = 2) {
  const ns = latitud < 0 ? "S" : "N";
  const ew = longitud < 0 ? "W" : "E";
  return `${Math.abs(latitud).toFixed(decimales)}° ${ns}, ${Math.abs(longitud).toFixed(decimales)}° ${ew}`;
}

// ── 6. Lugares conocidos (para "Select place (previous)") ──────────────────
// Sitios de aterrizaje anteriores y lugares importantes del polo sur.
// IMPORTANTE: antes de la entrega, revisar estos números con fuentes oficiales
// (NASA, LROC, ISRO, CNSA). Sur y oeste van en negativo.
export const LUGARES = [
  { id: "polo-sur", nombre: "Polo sur", latitud: -90, longitud: 0, tipo: "referencia" },
  { id: "shackleton", nombre: "Cráter Shackleton", latitud: -89.67, longitud: 129.78, tipo: "polo sur" },
  { id: "im-1", nombre: "IM-1 Odysseus (CLPS, 2024)", latitud: -80.13, longitud: 1.44, tipo: "aterrizaje" },
  { id: "chandrayaan-3", nombre: "Chandrayaan-3 (2023)", latitud: -69.37, longitud: 32.32, tipo: "aterrizaje" },
  { id: "change-4", nombre: "Chang'e 4 (2019)", latitud: -45.44, longitud: 177.6, tipo: "aterrizaje" },
  { id: "apollo-11", nombre: "Apollo 11 (1969)", latitud: 0.674, longitud: 23.473, tipo: "aterrizaje" },
  { id: "apollo-12", nombre: "Apollo 12 (1969)", latitud: -3.012, longitud: -23.422, tipo: "aterrizaje" },
  { id: "apollo-14", nombre: "Apollo 14 (1971)", latitud: -3.645, longitud: -17.471, tipo: "aterrizaje" },
  { id: "apollo-15", nombre: "Apollo 15 (1971)", latitud: 26.132, longitud: 3.634, tipo: "aterrizaje" },
  { id: "apollo-16", nombre: "Apollo 16 (1972)", latitud: -8.973, longitud: 15.5, tipo: "aterrizaje" },
  { id: "apollo-17", nombre: "Apollo 17 (1972)", latitud: 20.191, longitud: 30.772, tipo: "aterrizaje" },
];

// Buscar un lugar por su id: buscarLugar("shackleton")
export function buscarLugar(id) {
  return LUGARES.find((lugar) => lugar.id === id) ?? null;
}

// ── Ayudantes ──────────────────────────────────────────────────────────────
function gradosARadianes(grados) {
  return (grados * Math.PI) / 180;
}

function radianesAGrados(radianes) {
  return (radianes * 180) / Math.PI;
}
