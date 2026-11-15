// escena.js — Piezas 3D que comparten las páginas (Three.js)
//
//   cargarModelo(ruta)      → carga un .glb, lo centra y lo deja con radio 1
//   crearEscena(contenedor) → escena + cámara + renderer + girar con el mouse
//   agregarSol(escena)      → el Sol (modelo) y su luz
//   aTres(vector)           → pasa un vector de los cálculos al sistema de Three.js
//   orientarLuna / orientarTierra → giran los modelos como están en la realidad
//   crearNave()             → el módulo de aterrizaje (hecho con figuras simples)
//
// ─── SISTEMAS DE COORDENADAS ───────────────────────────────────────────────
// Los cálculos usan z = norte. Los modelos usan +Y = norte, +X = longitud 0
// y −Z = longitud +90 (ver js/coordenadas.js). Por eso: (x, y, z) → (x, z, −y).
// ───────────────────────────────────────────────────────────────────────────

import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import * as Astronomy from "./lib/astronomy.js";
import { aLuna } from "./calculos.js";
import { RAD } from "./vectores.js";

export const aTres = ([x, y, z]) => new THREE.Vector3(x, z, -y);

// Carga un modelo y lo devuelve dentro de un grupo, centrado y con radio 1.
// Así todos (Luna, Tierra, Sol) se manejan igual: grupo.scale = radio deseado.
export function cargarModelo(ruta) {
  return new GLTFLoader().loadAsync(ruta).then((gltf) => {
    const modelo = gltf.scene;
    const caja = new THREE.Box3().setFromObject(modelo);
    const tamano = caja.getSize(new THREE.Vector3());
    const radio = Math.max(tamano.x, tamano.y, tamano.z) / 2;
    modelo.position.sub(caja.getCenter(new THREE.Vector3())).divideScalar(radio);
    modelo.scale.divideScalar(radio);
    return new THREE.Group().add(modelo);
  });
}

// Escena lista para usar. "cadaCuadro(funcion)" registra algo que se repite
// en cada cuadro de la animación (recibe los segundos que pasaron).
// "arriba" (opcional) dice qué dirección queda hacia arriba en la pantalla.
export function crearEscena(contenedor, campoVision = 40, arriba = null) {
  const escena = new THREE.Scene();
  const camara = new THREE.PerspectiveCamera(campoVision, 1, 0.01, 5000);
  if (arriba) camara.up.copy(arriba);
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true }); // alpha: se ven las estrellas de fondo
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  contenedor.appendChild(renderer.domElement);

  // Arrastrar con el mouse gira la vista; la rueda acerca y aleja
  const controles = new OrbitControls(camara, renderer.domElement);
  controles.enableDamping = true;
  controles.enablePan = false;

  const ajustarTamano = () => {
    renderer.setSize(contenedor.clientWidth, contenedor.clientHeight);
    camara.aspect = contenedor.clientWidth / Math.max(1, contenedor.clientHeight);
    camara.updateProjectionMatrix();
  };
  new ResizeObserver(ajustarTamano).observe(contenedor);
  ajustarTamano();

  const tareas = [];
  const reloj = new THREE.Clock();
  renderer.setAnimationLoop(() => {
    const segundos = Math.min(reloj.getDelta(), 0.1);
    for (const tarea of tareas) tarea(segundos);
    controles.update();
    renderer.render(escena, camara);
  });

  return { escena, camara, renderer, controles, cadaCuadro: (tarea) => tareas.push(tarea) };
}

// El Sol: una luz que alumbra desde su dirección y el modelo para verlo.
// colocar(posicion) lo mueve. La luz llega pareja desde "direccionLuz" (si no
// se da, desde donde está el modelo).
export function agregarSol(escena, radio) {
  const luz = new THREE.DirectionalLight(0xffffff, 3);
  const grupo = new THREE.Group();
  escena.add(luz, grupo, new THREE.AmbientLight(0xffffff, 0.08));
  cargarModelo("modelos/sol.glb").then((modelo) => {
    modelo.scale.setScalar(radio);
    // modelos/sol.glb trae la forma (superficie + corona) pero no el color:
    // la superficie brilla con manchas naranjas y la corona es un halo tenue.
    modelo.traverse((parte) => {
      if (!parte.material) return;
      const esCorona = parte.material.name === "Sol_Corona";
      parte.material = new THREE.MeshBasicMaterial(
        esCorona
          ? { color: 0xff9a2e, transparent: true, opacity: 0.18, depthWrite: false, blending: THREE.AdditiveBlending }
          : { map: texturaSol() },
      );
    });
    grupo.add(modelo);
  });
  return {
    modelo: grupo,
    colocar(posicion, direccionLuz = posicion) {
      grupo.position.copy(posicion);
      luz.position.copy(direccionLuz);
    },
  };
}

// Dibujo de la superficie del Sol: fondo naranja con manchas claras y oscuras al azar
function texturaSol() {
  const lienzo = document.createElement("canvas");
  [lienzo.width, lienzo.height] = [512, 256];
  const pincel = lienzo.getContext("2d");
  pincel.fillStyle = "#ff8a1c";
  pincel.fillRect(0, 0, lienzo.width, lienzo.height);
  for (let i = 0; i < 900; i++) {
    const [x, y, radio] = [Math.random() * lienzo.width, Math.random() * lienzo.height, 4 + Math.random() * 22];
    const mancha = pincel.createRadialGradient(x, y, 0, x, y, radio);
    mancha.addColorStop(0, Math.random() < 0.6 ? "rgba(255, 214, 90, 0.5)" : "rgba(196, 52, 8, 0.45)");
    mancha.addColorStop(1, "rgba(255, 138, 28, 0)");
    pincel.fillStyle = mancha;
    pincel.fillRect(x - radio, y - radio, radio * 2, radio * 2);
  }
  const textura = new THREE.CanvasTexture(lienzo);
  textura.colorSpace = THREE.SRGBColorSpace;
  return textura;
}

// Gira el modelo de la Luna para que quede como en la realidad.
// "marco" viene de marcoLunar() en js/calculos.js (ejes x, y, z de la Luna).
export function orientarLuna(modelo, marco) {
  const base = new THREE.Matrix4().makeBasis(aTres(marco.x), aTres(marco.z), aTres(marco.y).negate());
  modelo.quaternion.setFromRotationMatrix(base);
}

// Gira el modelo de la Tierra según la hora (tiempo sideral: cuánto ha girado
// la Tierra respecto a las estrellas). Si se pasa "marco", la deja en el
// sistema pegado a la Luna (para verla desde la superficie lunar).
export function orientarTierra(modelo, fecha, marco = null) {
  const giro = Astronomy.SiderealTime(fecha) * 15 * RAD; // viene en horas: 1 h = 15°
  let ejes = [
    [Math.cos(giro), Math.sin(giro), 0], // longitud 0 (Greenwich)
    [0, 0, 1], // polo norte
    [Math.sin(giro), -Math.cos(giro), 0], // longitud −90 (oeste)
  ];
  if (marco) ejes = ejes.map((eje) => aLuna(marco, eje));
  modelo.quaternion.setFromRotationMatrix(new THREE.Matrix4().makeBasis(...ejes.map(aTres)));
}

// Un puntito de color para marcar un lugar sobre un modelo de radio 1
export function crearMarcador(color, tamano = 0.03) {
  return new THREE.Mesh(new THREE.SphereGeometry(tamano, 16, 12), new THREE.MeshBasicMaterial({ color }));
}

// ── La nave ────────────────────────────────────────────────────────────────
// Módulo de aterrizaje hecho con figuras simples. Mide ~1 de alto, "arriba" es
// +Y y sus patas tocan el suelo en y = 0.
export function crearNave() {
  const nave = new THREE.Group();
  const dorado = new THREE.MeshStandardMaterial({ color: 0xd9a441, metalness: 0.6, roughness: 0.45 });
  const gris = new THREE.MeshStandardMaterial({ color: 0xb9bec6, metalness: 0.5, roughness: 0.5 });
  const oscuro = new THREE.MeshStandardMaterial({ color: 0x33363c, metalness: 0.3, roughness: 0.7 });
  const pieza = (geometria, material, x, y, z) => {
    const malla = new THREE.Mesh(geometria, material);
    malla.position.set(x, y, z);
    nave.add(malla);
    return malla;
  };

  pieza(new THREE.CylinderGeometry(0.34, 0.34, 0.26, 8), dorado, 0, 0.4, 0); // etapa de descenso (octágono)
  pieza(new THREE.CylinderGeometry(0.2, 0.27, 0.3, 8), gris, 0, 0.68, 0); // cabina
  pieza(new THREE.SphereGeometry(0.1, 12, 8), gris, 0.16, 0.86, 0); // antena
  pieza(new THREE.CylinderGeometry(0.07, 0.15, 0.16, 12, 1, true), oscuro, 0, 0.2, 0); // tobera del motor

  for (let i = 0; i < 4; i++) {
    const angulo = (i * Math.PI) / 2 + Math.PI / 4;
    const [x, z] = [Math.cos(angulo), Math.sin(angulo)];
    const pata = pieza(new THREE.CylinderGeometry(0.015, 0.015, 0.52, 6), gris, x * 0.42, 0.22, z * 0.42);
    pata.rotation.set(z * 0.55, 0, -x * 0.55); // abierta hacia afuera
    pieza(new THREE.CylinderGeometry(0.07, 0.07, 0.02, 10), oscuro, x * 0.56, 0.01, z * 0.56); // zapata
  }
  return nave;
}
