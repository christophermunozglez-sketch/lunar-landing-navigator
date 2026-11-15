// datos.js — Pasar los datos de una página a la siguiente
//
// Los datos viajan en la dirección de la página (lo que va después del "?"):
//   trayectoria.html?origen=opcion-1&fecha=2026-11-20&hora=14:30&lat=-89.5&lon=45&nombre=...
// Así cualquiera puede copiar el enlace y ver exactamente el mismo escenario.
//
//   irA("trayectoria.html", datos)  → cambia de página llevando los datos
//                                     (si se está comparando, ver js/entradas.js)
//   leerDatos()                     → los recupera en la página nueva
//
// "datos" tiene la forma que arma js/enter.js:
//   { origen: { id }, fecha, hora, destino: { nombre, latitud, longitud } | null, estancia }

import { buscarCentro } from "./tierra.js";
import { validarCoordenadas } from "./coordenadas.js";
import { entradasPrevias, direccionCon } from "./entradas.js";

export const ESTANCIA_HORAS = 240; // horas en la Luna si nadie dice otra cosa (10 días)

// La entrada como texto: "origen=...&fecha=...&hora=...&lat=...&lon=...&nombre=..."
export function textoDeEntrada(datos) {
  const parametros = new URLSearchParams({ origen: datos.origen.id, fecha: datos.fecha, hora: datos.hora });
  if (datos.estancia) parametros.set("estancia", datos.estancia);
  if (datos.destino) {
    parametros.set("lat", datos.destino.latitud.toFixed(4));
    parametros.set("lon", datos.destino.longitud.toFixed(4));
    parametros.set("nombre", datos.destino.nombre);
  }
  return parametros.toString();
}

export function irA(pagina, datos) {
  const previas = entradasPrevias();
  // Comparando y la entrada nueva ya tiene destino: pantalla dividida con todas
  if (previas.length && datos.destino) return compararCon(previas, datos);
  // Si no, a la página pedida (conservando las entradas anteriores, si hay)
  window.location.href = direccionCon(pagina, previas, textoDeEntrada(datos));
}

// Abre la comparación con las entradas anteriores más esta
export function compararCon(previas, datos) {
  window.location.href = direccionCon("comparar.html", [...previas, textoDeEntrada(datos)]);
}

// Devuelve los datos listos para calcular. Si falta algo (por ejemplo, alguien
// abrió la página sin pasar por el formulario) regresa al inicio.
export function leerDatos({ conDestino = true } = {}) {
  const parametros = new URLSearchParams(window.location.search);
  const origen = buscarCentro(parametros.get("origen"));
  const fecha = parametros.get("fecha");
  const hora = parametros.get("hora");
  const salida = new Date(`${fecha}T${hora}:00Z`); // la hora se toma como UTC

  let destino = null;
  if (parametros.has("lat") && parametros.has("lon")) {
    const latitud = Number(parametros.get("lat"));
    const longitud = Number(parametros.get("lon"));
    if (validarCoordenadas(latitud, longitud).valida) {
      destino = { nombre: parametros.get("nombre") || "Custom coordinates", latitud, longitud };
    }
  }

  if (!origen || Number.isNaN(salida.getTime()) || (conDestino && !destino)) {
    window.location.replace("index.html");
    throw new Error("Faltan datos de la misión; regresando al inicio.");
  }
  const estancia = Number(parametros.get("estancia")) || ESTANCIA_HORAS;
  return { origen, fecha, hora, salida, destino, estancia };
}

// ── Textos ─────────────────────────────────────────────────────────────────
// 236.2 horas → "9 d 20 h" · 5.5 → "5 h 30 min"
export function formatearDuracion(horas) {
  const minutos = Math.round(horas * 60);
  const d = Math.floor(minutos / 1440);
  const h = Math.floor((minutos % 1440) / 60);
  const m = minutos % 60;
  if (d > 0) return `${d} d ${h} h`;
  return h > 0 ? `${h} h ${m} min` : `${m} min`;
}

// Date → "2026-11-24 23:14 UTC"
export const formatearFecha = (fecha) => `${fecha.toISOString().slice(0, 16).replace("T", " ")} UTC`;
