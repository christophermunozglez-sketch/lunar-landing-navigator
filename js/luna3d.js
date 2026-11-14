// luna3d.js — Muestra el modelo 3D de la Luna (modelos/luna.glb) girando.
//
// ─── CÓMO USARLO EN CUALQUIER PÁGINA ───────────────────────────────────────
// 1. En el HTML, pon un contenedor donde quieras la Luna:
//        <div id="luna-3d" aria-hidden="true"></div>
// 2. Antes de </body>, pega estas dos cosas (iguales en todas las páginas):
//        <script type="importmap">
//          { "imports": {
//              "three": "https://cdn.jsdelivr.net/npm/three@0.170.0/build/three.module.js",
//              "three/addons/": "https://cdn.jsdelivr.net/npm/three@0.170.0/examples/jsm/"
//          } }
//        </script>
//        <script type="module" src="js/luna3d.js"></script>
// Con eso, la Luna aparece sola dentro de #luna-3d. El tamaño y la posición
// se controlan con CSS (ver #luna-3d en css/inicio.css).
// ───────────────────────────────────────────────────────────────────────────
//
// Cómo funciona por dentro, paso a paso:
// 1. Creamos una "escena" (el mundo 3D), una "cámara" (desde dónde miramos)
//    y un "renderer" (lo que dibuja la escena en un <canvas>).
// 2. Ponemos luces: una fuerte como el Sol y una suave para el lado oscuro.
// 3. Cargamos el archivo .glb y lo agregamos a la escena.
// 4. En cada cuadro (unas 60 veces por segundo) giramos la Luna un poquito.

import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";

// Ajustes fáciles de cambiar
const RUTA_MODELO = "modelos/luna.glb";
const VELOCIDAD_GIRO = 0.1; // vueltas por minuto (más grande = gira más rápido)

export function mostrarLuna(contenedor) {
  // --- 1. Escena, cámara y renderer ---
  const escena = new THREE.Scene();
  const camara = new THREE.PerspectiveCamera(30, 1, 0.1, 100);

  // alpha: true → fondo transparente, así se ven las estrellas detrás
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  contenedor.appendChild(renderer.domElement);

  // --- 2. Luces ---
  const sol = new THREE.DirectionalLight(0xffffff, 2.5);
  sol.position.set(-3, 2, 4); // viene de arriba a la izquierda, un poco de frente
  escena.add(sol);
  escena.add(new THREE.AmbientLight(0xffffff, 0.25));

  // --- 3. Cargar el modelo ---
  let luna = null;
  new GLTFLoader().load(
    RUTA_MODELO,
    (gltf) => {
      luna = gltf.scene;

      // Centramos la Luna y alejamos la cámara lo justo para que se vea completa
      const caja = new THREE.Box3().setFromObject(luna);
      const radio = caja.getBoundingSphere(new THREE.Sphere()).radius;
      luna.position.sub(caja.getCenter(new THREE.Vector3()));
      camara.position.z = radio / Math.sin(THREE.MathUtils.degToRad(camara.fov / 2));

      escena.add(luna);
      // Esta clase apaga la Luna de CSS de respaldo y hace aparecer la 3D
      contenedor.classList.add("con-modelo");
    },
    undefined,
    (error) => console.error("No se pudo cargar la Luna 3D:", error),
  );

  // --- Ajustar el tamaño cuando cambia el contenedor ---
  function ajustarTamano() {
    const ancho = contenedor.clientWidth;
    const alto = contenedor.clientHeight;
    renderer.setSize(ancho, alto);
    camara.aspect = ancho / alto;
    camara.updateProjectionMatrix();
  }
  new ResizeObserver(ajustarTamano).observe(contenedor);

  // --- 4. Animación: girar la Luna ---
  const reloj = new THREE.Clock();
  renderer.setAnimationLoop(() => {
    const segundos = reloj.getDelta();
    if (luna) luna.rotation.y += segundos * (VELOCIDAD_GIRO / 60) * Math.PI * 2;
    renderer.render(escena, camara);
  });
}

// Si la página tiene <div id="luna-3d">, ponemos la Luna ahí automáticamente
const contenedor = document.getElementById("luna-3d");
if (contenedor) mostrarLuna(contenedor);
