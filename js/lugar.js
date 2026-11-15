// lugar.js — Pines de las misiones pasadas sobre la Luna 3D (lugar.html)
//
// Cómo funciona, paso a paso:
// 1. Esperamos a que la Luna termine de cargar (lunaLista).
// 2. Por cada misión de MISIONES_PASADAS creamos un botón con forma de pin.
// 3. Calculamos dónde queda su coordenada sobre la superficie 3D.
// 4. En cada cuadro, convertimos ese punto 3D a un lugar en la pantalla
//    y movemos el pin ahí. Así el pin siempre queda pegado a la Luna.
// 5. Al hacer clic en un pin, lo marcamos como seleccionado.

import * as THREE from "three";
import { lunaLista, puntoEnSuperficie } from "./luna3d.js";
import { MISIONES_PASADAS, formatearCoordenadas } from "./coordenadas.js";

const capa = document.getElementById("marcadores");

// Dibujo del pin (rojo con un círculo blanco en medio)
const DIBUJO_PIN = `
  <svg viewBox="0 0 24 32" aria-hidden="true">
    <path d="M12 0C5.4 0 0 5.3 0 11.9 0 20.8 12 32 12 32s12-11.2 12-20.1C24 5.3 18.6 0 12 0z" fill="#e10600"/>
    <circle cx="12" cy="11.5" r="4.5" fill="#fff"/>
  </svg>`;

// --- 1. Esperar a la Luna ---
const { luna, camara, renderer } = await lunaLista;

// --- 2 y 3. Crear un pin por misión ---
const pines = MISIONES_PASADAS.map((mision) => {
  const boton = document.createElement("button");
  boton.className = "pin";
  boton.type = "button";
  boton.setAttribute("aria-pressed", "false");
  boton.setAttribute("aria-label", `${mision.nombre}, ${formatearCoordenadas(mision.latitud, mision.longitud)}`);
  boton.innerHTML = `${DIBUJO_PIN}<span class="pin-etiqueta">${mision.nombre}</span>`;
  boton.addEventListener("click", () => seleccionar(mision));
  capa.appendChild(boton);

  return {
    mision,
    boton,
    punto: puntoEnSuperficie(luna, mision.latitud, mision.longitud), // punto 3D (local de la Luna)
  };
});

// --- 4. Mover los pines para que sigan a la Luna ---
const enMundo = new THREE.Vector3();
const haciaCamara = new THREE.Vector3();

function moverPines() {
  const lienzo = renderer.domElement.getBoundingClientRect();

  for (const { punto, boton } of pines) {
    enMundo.copy(punto);
    luna.localToWorld(enMundo);

    // ¿El punto está del lado que vemos? (si está atrás de la Luna, escondemos el pin)
    haciaCamara.copy(camara.position).sub(enMundo);
    const centro = luna.localToWorld(new THREE.Vector3());
    const visible = enMundo.clone().sub(centro).dot(haciaCamara) > 0;

    // Convertir de 3D a pantalla
    enMundo.project(camara); // ahora x, y van de -1 a 1
    const x = lienzo.left + ((enMundo.x + 1) / 2) * lienzo.width;
    const y = lienzo.top + ((1 - enMundo.y) / 2) * lienzo.height;

    boton.style.left = `${x}px`;
    boton.style.top = `${y}px`;
    boton.hidden = !visible;
  }
  requestAnimationFrame(moverPines);
}
moverPines();

// --- 5. Seleccionar una misión ---
function seleccionar(mision) {
  for (const { mision: m, boton } of pines) {
    boton.setAttribute("aria-pressed", String(m.id === mision.id));
  }

  // Avisamos al resto de la página qué misión se eligió.
  // Otro código puede escucharlo así:
  //   document.addEventListener("mision-seleccionada", (e) => console.log(e.detail));
  document.dispatchEvent(new CustomEvent("mision-seleccionada", { detail: mision }));

  // TODO: aquí va lo que pasa al elegir una misión (lo definimos después).
}
