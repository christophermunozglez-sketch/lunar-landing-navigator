// pagina-malla.js — La malla de colores sobre la Luna (malla.html)
//
// Es el cálculo "al revés": en vez de evaluar un lugar, evaluamos TODA la Luna
// para la hora en que llegaría la nave, y pintamos cada celda.
//
// Cómo funciona, paso a paso:
// 1. Con el centro de lanzamiento, la fecha y la hora calculamos el viaje
//    (js/trayectoria.js) para saber CUÁNDO llega la nave a la Luna.
// 2. Partimos la Luna en celdas (paralelos y meridianos) y evaluamos cada una
//    para esa llegada y las horas de estancia (js/calculos.js).
// 3. Pintamos cada celda: verde, amarillo, naranja o rojo.
// 4. Al hacer clic, un "rayo" (raycasting) nos dice qué punto de la Luna se
//    tocó; lo evaluamos con exactitud y Enter sigue con ese lugar.

import * as THREE from "three";
import { leerDatos, irA, formatearFecha, formatearDuracion } from "./datos.js";
import { calcularTrayectoria } from "./trayectoria.js";
import { cargarTopografia } from "./topografia.js";
import { prepararCielo, generarMalla, evaluarMalla, evaluarSitio, COLORES } from "./calculos.js";
import { latLonAPunto, puntoALatLon, formatearCoordenadas } from "./coordenadas.js";
import { unitario } from "./vectores.js";
import { crearEscena, cargarModelo, aTres, crearMarcador } from "./escena.js";

const RADIO_MALLA = 1.012; // un poquito arriba de la superficie (radio 1)
const GRADOS_POR_TRAMO = 4; // cada lado de celda se dibuja en tramos cortos para que siga la curva

const datos = leerDatos({ conDestino: false });
const elemento = (id) => document.getElementById(id);
const campoEstancia = elemento("estancia");
const botonContinuar = elemento("continuar");
campoEstancia.value = datos.estancia;

// --- Escena: la Luna quieta; el usuario gira la cámara ---
const { escena, camara, renderer, controles, cadaCuadro } = crearEscena(elemento("vista-3d"), 35);
const DISTANCIA_CAMARA = 4.2;
controles.minDistance = 1.6;
controles.maxDistance = 8;
const luzSol = new THREE.DirectionalLight(0xffffff, 1.6);
escena.add(luzSol, new THREE.AmbientLight(0xffffff, 1.1)); // luz pareja para que se vea toda la malla
cargarModelo("modelos/luna.glb").then((modelo) => escena.add(modelo));

const marcador = crearMarcador(0xffffff, 0.02);
marcador.visible = false;
escena.add(marcador);

// --- 1. ¿Cuándo llega la nave? (el destino exacto casi no cambia la hora) ---
const viaje = calcularTrayectoria(datos.origen, datos.salida);
elemento("datos-llegada").innerHTML = `
  <dt>Launch</dt><dd>${datos.origen.nombre}<br />${formatearFecha(datos.salida)}</dd>
  <dt>Flight time</dt><dd>${formatearDuracion(viaje.datos.horasVuelo)}</dd>
  <dt>Moon arrival</dt><dd>${formatearFecha(viaje.llegada)}</dd>`;
elemento("leyenda").innerHTML = Object.values(COLORES)
  .map((color) => `<li><i style="background:${color.hex}"></i>${color.texto}</li>`)
  .join("");

// --- 2 y 3. Evaluar y pintar la malla ---
let cielo = null;
let celdas = [];
let mallaColores = null; // el objeto 3D con las celdas pintadas
let celdaDeCara = []; // a qué celda pertenece cada triángulo (para el clic)

const enLuna = (latitud, longitud, radio = RADIO_MALLA) => Object.values(latLonAPunto(latitud, longitud, radio));

function pintarMalla() {
  const posiciones = [];
  const colores = [];
  const bordes = [];
  celdaDeCara = [];

  celdas.forEach((celda, numero) => {
    const color = new THREE.Color(COLORES[celda.color].hex);
    const tramos = Math.max(1, Math.ceil((celda.lonMax - celda.lonMin) / GRADOS_POR_TRAMO));
    const ancho = (celda.lonMax - celda.lonMin) / tramos;
    for (let i = 0; i < tramos; i++) {
      const oeste = celda.lonMin + i * ancho;
      const este = oeste + ancho;
      // Cada tramo es un cuadrito hecho con 2 triángulos
      const [a, b, c, d] = [
        enLuna(celda.latMin, oeste),
        enLuna(celda.latMin, este),
        enLuna(celda.latMax, este),
        enLuna(celda.latMax, oeste),
      ];
      posiciones.push(...a, ...b, ...c, ...a, ...c, ...d);
      for (let vertice = 0; vertice < 6; vertice++) colores.push(color.r, color.g, color.b);
      celdaDeCara.push(numero, numero);
      bordes.push(...a, ...b, ...d, ...c); // lados sur y norte
    }
    bordes.push(...enLuna(celda.latMin, celda.lonMin), ...enLuna(celda.latMax, celda.lonMin)); // lado oeste
  });

  if (mallaColores) escena.remove(mallaColores);
  const geometria = new THREE.BufferGeometry();
  geometria.setAttribute("position", new THREE.Float32BufferAttribute(posiciones, 3));
  geometria.setAttribute("color", new THREE.Float32BufferAttribute(colores, 3));
  mallaColores = new THREE.Mesh(
    geometria,
    new THREE.MeshBasicMaterial({ vertexColors: true, transparent: true, opacity: 0.45, depthWrite: false }),
  );
  const lineas = new THREE.BufferGeometry();
  lineas.setAttribute("position", new THREE.Float32BufferAttribute(bordes, 3));
  mallaColores.add(
    new THREE.LineSegments(lineas, new THREE.LineBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.35 })),
  );
  escena.add(mallaColores);
}

function calcularMalla() {
  const horas = Math.min(2000, Math.max(1, Number(campoEstancia.value) || datos.estancia));
  datos.estancia = horas;
  cielo = prepararCielo(viaje.llegada, horas);
  celdas = evaluarMalla(generarMalla(), cielo);
  // La luz viene de donde está el Sol al llegar: se ve qué lado es de día
  luzSol.position.copy(aTres(unitario(cielo.inicial.sol)));
  pintarMalla();
  if (datos.destino) return mostrarElegido(datos.destino);

  // Giramos la vista hacia la mejor celda, para no tener que buscarla
  const mejor = celdas.reduce((a, b) =>
    b.suma > a.suma || (b.suma === a.suma && b.conveniencia > a.conveniencia) ? b : a,
  );
  camara.position.set(...enLuna(mejor.latitud, mejor.longitud, DISTANCIA_CAMARA));
  const buenas = celdas.filter((celda) => celda.color === "verde").length;
  elemento("elegido").innerHTML =
    `<p>${buenas} of ${celdas.length} cells are optimal for this arrival. The view is centred on the best one: click a spot to evaluate it.</p>`;
}

// --- 4. Elegir un lugar con un clic ---
const barra = (nombre, porcentaje) => `
  <div class="barra">
    <span>${nombre}</span>
    <div><i style="width:${porcentaje.toFixed(0)}%;background:${porcentaje >= 90 ? COLORES.verde.hex : porcentaje >= 80 ? COLORES.amarillo.hex : porcentaje >= 70 ? COLORES.naranja.hex : COLORES.rojo.hex}"></i></div>
    <b>${porcentaje.toFixed(0)}%</b>
  </div>`;

function mostrarElegido(destino) {
  datos.destino = destino;
  const resultado = evaluarSitio(destino, cielo);
  marcador.position.set(...enLuna(destino.latitud, destino.longitud, 1.02));
  marcador.visible = true;
  elemento("elegido").innerHTML = `
    <p><strong>${formatearCoordenadas(destino.latitud, destino.longitud)}</strong></p>
    ${barra("Energy", resultado.energia)}
    ${barra("Communication", resultado.comunicacion)}
    ${barra("Terrain", resultado.relieve)}
    <p class="veredicto" style="background:${COLORES[resultado.color].hex}">${COLORES[resultado.color].texto}</p>`;
  botonContinuar.disabled = false;
}

// Un clic de verdad (no un arrastre para girar): el mouse casi no se movió
const lienzo = renderer.domElement;
const rayo = new THREE.Raycaster();
let inicioClic = null;
lienzo.addEventListener("pointerdown", (evento) => (inicioClic = [evento.clientX, evento.clientY]));
lienzo.addEventListener("pointerup", (evento) => {
  if (!inicioClic || !mallaColores) return;
  if (Math.hypot(evento.clientX - inicioClic[0], evento.clientY - inicioClic[1]) > 5) return;
  const caja = lienzo.getBoundingClientRect();
  const posicion = new THREE.Vector2(
    ((evento.clientX - caja.left) / caja.width) * 2 - 1,
    1 - ((evento.clientY - caja.top) / caja.height) * 2,
  );
  rayo.setFromCamera(posicion, camara);
  const choque = rayo.intersectObject(mallaColores, false)[0];
  if (!choque) return;
  // Del punto 3D tocado a latitud y longitud
  const { latitud, longitud } = puntoALatLon(choque.point);
  mostrarElegido({ nombre: "Grid selection", latitud, longitud });
});

// El marcador late para que se note
cadaCuadro(() => marcador.scale.setScalar(1 + 0.3 * Math.sin(performance.now() / 250)));

campoEstancia.addEventListener("change", calcularMalla);
botonContinuar.addEventListener("click", () => irA("trayectoria.html", datos));

// Primero el relieve (si no carga, se usa una Luna lisa) y luego la malla
await cargarTopografia();
calcularMalla();
