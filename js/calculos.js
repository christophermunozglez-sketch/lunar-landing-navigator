// calculos.js — Qué tan bueno es un lugar de la Luna para aterrizar (sin dibujar nada)
//
// Aquí están TODAS las fórmulas de evaluación. Las usan igual:
//   • aterrizaje.html  → un solo lugar, con todo el detalle.
//   • malla.html       → cientos de celdas, para pintarlas de colores.
//
// ─── RESUMEN DEL PROCESO ───────────────────────────────────────────────────
// 1. Con la fecha, Astronomy Engine nos da dónde están el Sol, la Tierra y la
//    Luna, y cómo está girada la Luna (incluye la libración, su "cabeceo").
// 2. Pasamos esas posiciones al sistema "pegado a la Luna" (el de latitud y
//    longitud) → marcoLunar() y estadoCielo().
// 3. Desde el lugar de aterrizaje medimos la elevación (qué tan alto sobre el
//    suelo) y el azimut (hacia qué rumbo) del Sol y de la Tierra → direccionDesde().
// 4. Lo comparamos con el horizonte real del terreno (js/topografia.js):
//        despeje = elevación − horizonte en ese rumbo
//    Si el despeje es positivo, el astro se ve.
// 5. Repetimos durante todas las horas de estancia y sacamos 3 porcentajes:
//    energía, comunicación y relieve → evaluarSitio().
// 6. Cada porcentaje da puntos (3, 2, 1 o 0) y la suma decide el color.
// ───────────────────────────────────────────────────────────────────────────

import * as Astronomy from "./lib/astronomy.js";
import { RADIO_LUNA_KM, LUGARES, distanciaKm } from "./coordenadas.js";
import { RADIO_ECUATORIAL_TIERRA_KM } from "./tierra.js";
import { alturaKm, perfilHorizonte, horizonteEn, pendienteGrados } from "./topografia.js";
import { resta, escala, punto, cruz, norma, RAD, GRAD, limitar } from "./vectores.js";

const RADIO_SOL_KM = 695700;
const MS_POR_HORA = 3600 * 1000;

// Criterios del equipo (fáciles de cambiar)
export const PENDIENTE_LIMITE = 15; // grados: con esta pendiente (o más) el relieve vale 0 %
const DIAS_BUSQUEDA = 30; // hasta cuántos días adelante buscamos la puesta del Sol / de la Tierra
const KM_MISMO_LUGAR = 30; // a menos de esto de una misión pasada, es "el mismo lugar"

const vector = (v) => [v.x, v.y, v.z];

// ── 1. ¿Cómo está girada la Luna? ──────────────────────────────────────────
// Devuelve los 3 ejes de la Luna vistos desde el espacio (sistema ecuatorial
// J2000, el que usa Astronomy Engine):
//   x → latitud 0, longitud 0 (centro de la cara visible)
//   y → latitud 0, longitud +90 (este)
//   z → polo norte
// Fórmula de la IAU: el polo apunta a (α0, δ0) y el meridiano 0 está girado un
// ángulo W desde el "nodo" Q = (−sin α0, cos α0, 0):
//     x = Q·cos W + (z × Q)·sin W          y = z × x
export function marcoLunar(fecha) {
  const eje = Astronomy.RotationAxis(Astronomy.Body.Moon, fecha);
  const z = vector(eje.north);
  const ascension = eje.ra * 15 * RAD; // viene en horas: 1 h = 15°
  const nodo = [-Math.sin(ascension), Math.cos(ascension), 0];
  const giro = eje.spin * RAD;
  const lado = cruz(z, nodo);
  const x = [0, 1, 2].map((i) => nodo[i] * Math.cos(giro) + lado[i] * Math.sin(giro));
  return { x, y: cruz(z, x), z };
}

// Pasa un vector del espacio (J2000) al sistema pegado a la Luna, y al revés
export const aLuna = (marco, v) => [punto(v, marco.x), punto(v, marco.y), punto(v, marco.z)];
export const aEspacio = (marco, v) => [0, 1, 2].map((i) => marco.x[i] * v[0] + marco.y[i] * v[1] + marco.z[i] * v[2]);

// Los 3 rumbos de un lugar, en el sistema pegado a la Luna:
// arriba (sale del suelo), este y norte.
export function ejesDelSitio({ latitud, longitud }) {
  const lat = latitud * RAD;
  const lon = longitud * RAD;
  return {
    arriba: [Math.cos(lat) * Math.cos(lon), Math.cos(lat) * Math.sin(lon), Math.sin(lat)],
    este: [-Math.sin(lon), Math.cos(lon), 0],
    norte: [-Math.sin(lat) * Math.cos(lon), -Math.sin(lat) * Math.sin(lon), Math.cos(lat)],
  };
}

// ── 2. ¿Dónde están el Sol y la Tierra vistos desde el centro de la Luna? ──
// Astronomy Engine da la Luna y el Sol vistos desde la Tierra, así que:
//     Luna→Sol = Sol − Luna          Luna→Tierra = −Luna
// Resultado en km, en el sistema pegado a la Luna.
export function estadoCielo(fecha) {
  const marco = marcoLunar(fecha);
  const luna = vector(Astronomy.GeoMoon(fecha));
  const sol = vector(Astronomy.GeoVector(Astronomy.Body.Sun, fecha, false));
  return {
    fecha,
    marco,
    sol: aLuna(marco, escala(resta(sol, luna), Astronomy.KM_PER_AU)),
    tierra: aLuna(marco, escala(luna, -Astronomy.KM_PER_AU)),
  };
}

// ── 3. Elevación y azimut de un astro desde el lugar ───────────────────────
// "ejes" viene de ejesDelSitio() y "astro" es el vector Luna→astro (km).
//     elevación = asin( d̂ · arriba )
//     azimut    = atan2( d̂ · este, d̂ · norte )     (0 = norte, 90 = este)
// donde d̂ es el rumbo del lugar al astro. También da el radio aparente (grados).
function direccionDesde(ejes, radioSitioKm, astro, radioAstroKm) {
  const d = resta(astro, escala(ejes.arriba, radioSitioKm));
  const distancia = norma(d);
  return {
    elevacion: Math.asin(limitar(punto(d, ejes.arriba) / distancia, -1, 1)) * GRAD,
    azimut: (Math.atan2(punto(d, ejes.este), punto(d, ejes.norte)) * GRAD + 360) % 360,
    radio: Math.asin(radioAstroKm / distancia) * GRAD,
  };
}

// Parte del disco del Sol que asoma sobre el horizonte (0 a 1).
// Con x = despeje / radio del disco:
//     fracción = 1 − ( acos(x) − x·√(1 − x²) ) / π
// (área de un círculo cortado por una línea recta). En los polos el Sol pasa
// días rozando el horizonte, por eso importa contar el disco parcial.
function fraccionDisco(despeje, radio) {
  const x = limitar(despeje / radio, -1, 1);
  return 1 - (Math.acos(x) - x * Math.sqrt(1 - x * x)) / Math.PI;
}

// Todo lo que no cambia con la hora para un lugar: sus ejes, su altura y su horizonte
function prepararSitio(sitio) {
  return {
    ejes: ejesDelSitio(sitio),
    radio: RADIO_LUNA_KM + alturaKm(sitio.latitud, sitio.longitud),
    perfil: perfilHorizonte(sitio),
  };
}

// Sol y Tierra vistos desde el lugar en un momento: elevación, azimut,
// horizonte del terreno en ese rumbo, despeje y si se ve.
function observar(preparado, cielo) {
  const mirar = (astro, radioAstro) => {
    const direccion = direccionDesde(preparado.ejes, preparado.radio, astro, radioAstro);
    const horizonte = horizonteEn(preparado.perfil, direccion.azimut);
    const despeje = direccion.elevacion - horizonte;
    return { ...direccion, horizonte, despeje, visible: despeje > 0 };
  };
  return { sol: mirar(cielo.sol, RADIO_SOL_KM), tierra: mirar(cielo.tierra, RADIO_ECUATORIAL_TIERRA_KM) };
}

// Sol y Tierra desde el lugar en una fecha cualquiera, y cuánto falta para
// que cada uno se meta o salga (ver proximosCruces más abajo).
export function observarSitio(sitio, fecha) {
  const preparado = prepararSitio(sitio);
  return { ...observar(preparado, estadoCielo(fecha)), cruces: proximosCruces(preparado, fecha) };
}

// ── 4. El cielo durante la estancia ────────────────────────────────────────
// Calcula una sola vez dónde están el Sol y la Tierra a cada rato de la
// estancia. Así la malla reutiliza lo mismo para todas sus celdas.
export function prepararCielo(llegada, horasEstancia) {
  const cantidad = limitar(Math.ceil(horasEstancia), 48, 480); // más o menos una muestra por hora
  const pasoHoras = horasEstancia / cantidad;
  const muestras = [];
  for (let i = 0; i < cantidad; i++) {
    // a la mitad de cada intervalo
    muestras.push(estadoCielo(new Date(llegada.getTime() + (i + 0.5) * pasoHoras * MS_POR_HORA)));
  }
  return { llegada, horasEstancia, pasoHoras, muestras, inicial: estadoCielo(llegada) };
}

// ── 5. Puntos y colores (regla del equipo) ─────────────────────────────────
//   ≥ 90 % → 3 puntos · ≥ 80 % → 2 · ≥ 70 % → 1 · menos → 0
//   Suma de los 3 rubros: 9 → verde · 8 → amarillo · 7 → naranja · 6 o menos → rojo
export const puntosDe = (porcentaje) => (porcentaje >= 90 ? 3 : porcentaje >= 80 ? 2 : porcentaje >= 70 ? 1 : 0);
export const colorDe = (suma) => (suma >= 9 ? "verde" : suma === 8 ? "amarillo" : suma === 7 ? "naranja" : "rojo");

export const COLORES = {
  verde: { hex: "#18c93a", texto: "Optimal landing site" },
  amarillo: { hex: "#f2c40c", texto: "Fairly good landing site" },
  naranja: { hex: "#ff8a1e", texto: "Rather poor landing site" },
  rojo: { hex: "#e0352b", texto: "Not recommended" },
};

// ── 6. Evaluar un lugar ────────────────────────────────────────────────────
// sitio = { latitud, longitud } · cielo = prepararCielo(llegada, horas)
//   Energía       = promedio del disco solar visible durante la estancia
//                   (100 % = Sol a la vista todo el tiempo; paneles bien orientados).
//   Comunicación  = % del tiempo con la Tierra sobre el horizonte (sin satélites).
//   Relieve       = 100 · (1 − pendiente / PENDIENTE_LIMITE)   (100 % = plano).
export function evaluarSitio(sitio, cielo) {
  const preparado = prepararSitio(sitio);

  let luz = 0;
  let tierraVisible = 0;
  for (const muestra of cielo.muestras) {
    const { sol, tierra } = observar(preparado, muestra);
    luz += fraccionDisco(sol.despeje, sol.radio);
    if (tierra.visible) tierraVisible++;
  }
  const total = cielo.muestras.length;
  const pendiente = pendienteGrados(sitio);
  const energia = (100 * luz) / total;
  const comunicacion = (100 * tierraVisible) / total;
  const relieve = 100 * limitar(1 - pendiente / PENDIENTE_LIMITE, 0, 1);
  const suma = puntosDe(energia) + puntosDe(comunicacion) + puntosDe(relieve);

  return {
    energia,
    comunicacion,
    relieve,
    pendiente,
    conveniencia: (energia + comunicacion + relieve) / 3,
    suma,
    color: colorDe(suma),
    horasLuz: (energia / 100) * cielo.horasEstancia,
    horasTierra: (comunicacion / 100) * cielo.horasEstancia,
    alturaKm: preparado.radio - RADIO_LUNA_KM,
  };
}

// ── 7. ¿Cuánto falta para que se meta (o salga) el Sol o la Tierra? ────────
// Avanzamos de 2 en 2 horas hasta que el despeje cambie de signo, y luego
// afinamos partiendo el intervalo a la mitad 20 veces (bisección).
// Devuelve { sol: horas, tierra: horas } — null si no pasa en 30 días
// (por ejemplo, en la cara visible la Tierra nunca se mete).
function proximosCruces(preparado, desde) {
  const mirar = (horas) => observar(preparado, estadoCielo(new Date(desde.getTime() + horas * MS_POR_HORA)));
  const PASO = 2;
  const ahora = mirar(0);
  const cruces = { sol: null, tierra: null };
  const pendientes = new Set(["sol", "tierra"]);
  for (let horas = PASO; horas <= DIAS_BUSQUEDA * 24 && pendientes.size; horas += PASO) {
    const luego = mirar(horas);
    for (const astro of pendientes) {
      if (luego[astro].visible === ahora[astro].visible) continue;
      let antes = horas - PASO;
      let despues = horas;
      for (let i = 0; i < 20; i++) {
        const medio = (antes + despues) / 2;
        if (mirar(medio)[astro].visible === ahora[astro].visible) antes = medio;
        else despues = medio;
      }
      cruces[astro] = (antes + despues) / 2;
      pendientes.delete(astro);
    }
  }
  return cruces;
}

// ── 8. ¿Ya se aterrizó aquí antes? ─────────────────────────────────────────
export function misionMasCercana(sitio) {
  let mejor = null;
  for (const lugar of LUGARES) {
    if (!lugar.anio) continue; // solo misiones reales, no puntos de referencia
    const km = distanciaKm(sitio, lugar);
    if (!mejor || km < mejor.km) mejor = { nombre: lugar.nombre, anio: lugar.anio, km };
  }
  return { ...mejor, mismoLugar: mejor.km <= KM_MISMO_LUGAR };
}

// ── 9. La malla (cuadrícula) de toda la Luna ───────────────────────────────
// Franjas de latitud de "paso" grados, de −90 a +90. En cada franja caben
//     N = 360 · cos(latitud del centro) / paso
// celdas: muchas en el ecuador y pocas cerca de los polos, para que todas
// midan más o menos lo mismo sobre el suelo. Nadie tiene que escribir nada.
export function generarMalla(paso = 7.5) {
  const celdas = [];
  for (let latMin = -90; latMin < 90; latMin += paso) {
    const latitud = latMin + paso / 2;
    const cantidad = Math.max(4, Math.round((360 * Math.cos(latitud * RAD)) / paso));
    const ancho = 360 / cantidad;
    for (let i = 0; i < cantidad; i++) {
      const lonMin = -180 + i * ancho;
      celdas.push({
        latMin,
        latMax: latMin + paso,
        lonMin,
        lonMax: lonMin + ancho,
        latitud,
        longitud: lonMin + ancho / 2,
      });
    }
  }
  return celdas;
}

// Evalúa todas las celdas (en su centro) para la misma llegada y estancia
export function evaluarMalla(celdas, cielo) {
  return celdas.map((celda) => ({ ...celda, ...evaluarSitio(celda, cielo) }));
}

// La celda donde cae una latitud/longitud (para saber cuál se tocó)
export function celdaDe(celdas, latitud, longitud) {
  return celdas.find((c) => latitud >= c.latMin && latitud <= c.latMax && longitud >= c.lonMin && longitud <= c.lonMax);
}
