// enter.js — El botón "Enter" de las 3 páginas (coordenadas, misión y lugar)
//
// Las 3 opciones terminan dando LOS MISMOS datos, siempre con esta forma:
//
//   {
//     origen:  { id: "opcion-1", nombre: "Kennedy Space Center" }, // dónde sales en la Tierra
//     fecha:   "2026-11-14",                                        // día de salida (AAAA-MM-DD)
//     hora:    "23:59",                                             // hora de salida (24 h)
//     destino: { nombre: "Apollo 11", latitud: 0.67416, longitud: 23.47314 }, // a dónde vas en la Luna
//   }
//
// - coordenadas.html: el destino sale de la latitud/longitud que escribes.
// - lugar.html:       el destino sale del pin (misión pasada) que eliges.
// - mision.html:      todavía no tiene destino (destino: null), lo definimos después.
//
// Por ahora Enter solo junta los datos y llama a continuar(datos) (TODO).

import { leerNumero, validarCoordenadas } from "./coordenadas.js";

const formulario = document.querySelector("form.datos-entrada");

if (formulario) {
  // ── lugar.html: el destino es el pin elegido ──────────────────────────────
  // Enter empieza apagado y se prende cuando eliges una misión.
  let misionElegida = null;
  const botonEnter = formulario.querySelector(".boton-enter");

  if ("requiereDestino" in formulario.dataset) {
    document.addEventListener("mision-seleccionada", (evento) => {
      misionElegida = evento.detail;
      botonEnter.disabled = false;
    });
  }

  formulario.addEventListener("submit", (evento) => {
    evento.preventDefault(); // que no recargue la página
    // (El navegador ya revisó que los campos "required" estén llenos)

    const campos = formulario.elements;
    const centro = campos["centro-lanzamiento"];

    const datos = {
      origen: {
        id: centro.value,
        nombre: centro.selectedOptions[0].textContent.trim(),
      },
      fecha: campos["fecha-mision"].value,
      hora: campos["hora-mision"].value,
      destino: null,
    };

    // ── coordenadas.html: el destino es la latitud/longitud escrita ─────────
    const campoLat = campos.latitud;
    const campoLon = campos.longitud;
    if (campoLat && campoLon) {
      const latitud = leerNumero(campoLat.value);
      const longitud = leerNumero(campoLon.value);
      const revision = validarCoordenadas(latitud, longitud);

      if (!revision.valida) {
        // Marcamos el campo que está mal y mostramos el mensaje del navegador
        const campoMalo = revision.error.includes("latitud") ? campoLat : campoLon;
        campoMalo.setCustomValidity(revision.error);
        campoMalo.reportValidity();
        return;
      }
      datos.destino = { nombre: "Custom coordinates", latitud, longitud };
    }

    // ── lugar.html ────────────────────────────────────────────────────────
    if (misionElegida) {
      const { nombre, latitud, longitud } = misionElegida;
      datos.destino = { nombre, latitud, longitud };
    }

    continuar(datos);
  });

  // Cuando el usuario corrige lo que escribió, quitamos el mensaje de error
  formulario.addEventListener("input", (evento) => evento.target.setCustomValidity?.(""));
}

// ── Qué pasa después ───────────────────────────────────────────────────────
function continuar(datos) {
  console.log("Enter con estos datos:", datos);
  // TODO: aquí van los cálculos (los definimos después).
}
