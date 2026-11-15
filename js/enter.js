// enter.js — El botón "Enter" de las 3 páginas (coordenadas, misión y lugar)
//
// Por ahora es MUY básico:
//   1. Revisa que el usuario haya llenado todo.
//   2. Junta los datos en un objeto.
//   3. Llama a continuar(datos), que todavía no hace nada (TODO).
// Lo que pasa después depende de lo que se elija, y lo definimos más adelante.

import { leerNumero, validarCoordenadas } from "./coordenadas.js";

// ── Páginas con formulario (coordenadas.html y mision.html) ────────────────
const formulario = document.querySelector("form.datos-entrada");

if (formulario) {
  formulario.addEventListener("submit", (evento) => {
    evento.preventDefault(); // que no recargue la página

    // Si la página tiene latitud y longitud, revisamos que tengan sentido
    const campoLat = formulario.elements.latitud;
    const campoLon = formulario.elements.longitud;
    const datos = Object.fromEntries(new FormData(formulario)); // { "centro-lanzamiento": ..., ... }

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
      datos.latitud = latitud;
      datos.longitud = longitud;
    }

    continuar(datos);
  });

  // Cuando el usuario corrige lo que escribió, quitamos el mensaje de error
  formulario.addEventListener("input", (evento) => evento.target.setCustomValidity?.(""));
}

// ── Página de lugar (lugar.html) ───────────────────────────────────────────
// El botón empieza apagado y se prende cuando eliges una misión (un pin).
const botonLugar = document.getElementById("enter-lugar");

if (botonLugar) {
  let misionElegida = null;

  document.addEventListener("mision-seleccionada", (evento) => {
    misionElegida = evento.detail;
    botonLugar.disabled = false;
  });

  botonLugar.addEventListener("click", () => {
    if (misionElegida) continuar({ mision: misionElegida });
  });
}

// ── Qué pasa después ───────────────────────────────────────────────────────
function continuar(datos) {
  console.log("Enter con estos datos:", datos);
  // TODO: aquí va lo que sigue (lo definimos después).
}
