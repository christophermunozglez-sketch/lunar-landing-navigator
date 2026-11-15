// pagina-aterrizaje.js — Información del lugar de aterrizaje (aterrizaje.html)
//
// Cómo funciona, paso a paso:
// 1. Leemos los datos y calculamos el viaje para saber cuándo llega la nave.
// 2. Evaluamos el lugar (js/calculos.js): energía, comunicación y relieve.
// 3. Llenamos el panel y lo pintamos del color del resultado.
// 4. Dibujamos la vista: la nave sobre la Luna, con la Tierra y el Sol en la
//    dirección real en la que se ven desde ahí.
// 5. La línea de tiempo mueve el reloj: el Sol y la Tierra cambian de lugar.
// 6. "View" cambia entre la vista 3D y la 2D (js/vista-2d.js); las dos
//    muestran el mismo momento y el mismo panel.
// 7. COMPARE vuelve al inicio para capturar otra entrada (js/entradas.js).

import * as THREE from "three";
import { leerDatos, irA, textoDeEntrada, formatearDuracion, formatearFecha } from "./datos.js";
import { direccionCon } from "./entradas.js";
import { calcularTrayectoria } from "./trayectoria.js";
import { cargarTopografia, hayTopografia } from "./topografia.js";
import {
  prepararCielo,
  evaluarSitio,
  observarSitio,
  estadoCielo,
  ejesDelSitio,
  misionMasCercana,
  puntosDe,
  COLORES,
  PENDIENTE_LIMITE,
} from "./calculos.js";
import { formatearCoordenadas } from "./coordenadas.js";
import { suma, escala, RAD } from "./vectores.js";
import { crearEscena, cargarModelo, agregarSol, aTres, orientarTierra, crearNave } from "./escena.js";
import { crearVista2D } from "./vista-2d.js";

// Tamaños y distancias de la vista (la Luna mide 1 de radio).
// La Tierra, el Sol y la nave están agrandados para que se vean; lo que es
// real es la DIRECCIÓN en la que aparece cada uno.
const TAMANO_NAVE = 0.14;
const DISTANCIA_TIERRA = 1.9;
const RADIO_TIERRA = 0.26;
const DISTANCIA_SOL = 2.9;
const RADIO_SOL = 0.5;

const datos = leerDatos();
const sitio = datos.destino;
const elemento = (id) => document.getElementById(id);
const escribir = (id, texto) => (elemento(id).textContent = texto);
const grados = (valor) => `${valor.toFixed(1)}°`;

// --- 1. ¿Cuándo llega? ---
const viaje = calcularTrayectoria(datos.origen, datos.salida, sitio);
const llegada = viaje.llegada;
const fechaEn = (horas) => new Date(llegada.getTime() + horas * 3600 * 1000);

// --- 4. Escena (todo en el sistema pegado a la Luna: el modelo no gira) ---
const ejes = ejesDelSitio(sitio);
const lugar = aTres(ejes.arriba); // el punto de aterrizaje sobre la Luna (radio 1)
// "Arriba" en la pantalla es el cielo del lugar: la Luna queda abajo, como un suelo
const { escena, camara, controles } = crearEscena(elemento("vista-3d"), 45, lugar);
const sol = agregarSol(escena, RADIO_SOL);
const tierra = new THREE.Group();
tierra.scale.setScalar(RADIO_TIERRA);
escena.add(tierra);
cargarModelo("modelos/luna.glb").then((modelo) => escena.add(modelo));
cargarModelo("modelos/tierra.glb").then((modelo) => tierra.add(modelo));

const nave = crearNave();
nave.scale.setScalar(TAMANO_NAVE);
nave.position.copy(lugar);
nave.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), lugar); // parada sobre el suelo
escena.add(nave, new THREE.PointLight(0xffffff, 0.4).translateOnAxis(lugar, 1.3)); // lucecita para que la nave se vea de noche

// Vista 2D: se prepara aparte (carga sus imágenes) y se dibuja con cada momento
let vista2D = null;
let ultimoMomento = null; // lo último que se mostró (para dibujarlo en 2D cuando esté lista)
const vista2DLista = crearVista2D(elemento("vista-2d"), {
  origen: datos.origen,
  sitio,
  info: elemento("info-2d"),
}).then((creada) => (vista2D = creada));

// Rumbo (unitario, sistema de la Luna) hacia un astro con cierta elevación y azimut
function rumbo({ elevacion, azimut }) {
  const [e, a] = [elevacion * RAD, azimut * RAD];
  const horizontal = suma(escala(ejes.norte, Math.cos(a)), escala(ejes.este, Math.sin(a)));
  return aTres(suma(escala(horizontal, Math.cos(e)), escala(ejes.arriba, Math.sin(e))));
}

// Cámara: atrás y arriba de la nave, mirando hacia un punto medio entre la
// Tierra y el Sol para que salgan los dos. Si están en lados opuestos del
// cielo, miramos de costado: uno queda a la izquierda y otro a la derecha.
function acomodarCamara(vista) {
  const haciaTierra = rumbo({ elevacion: 0, azimut: vista.tierra.azimut });
  const frente = haciaTierra.clone().add(rumbo({ elevacion: 0, azimut: vista.sol.azimut }));
  if (frente.length() < 0.5) frente.crossVectors(lugar, haciaTierra);
  frente.normalize();
  controles.target.copy(lugar).multiplyScalar(1.6).addScaledVector(frente, 0.3);
  camara.position.copy(lugar).multiplyScalar(1.75).addScaledVector(frente, -3.6);
  controles.minDistance = 0.6;
  controles.maxDistance = 12;
}

// --- 5. Mover el reloj ---
const reloj = elemento("reloj");
const textoCruce = (visible, horas, nombre) => {
  if (horas === null) return visible ? `no ${nombre}set within 30 d` : `no ${nombre}rise within 30 d`;
  return `${nombre}${visible ? "set" : "rise"} in ${formatearDuracion(horas)}`;
};
const capitalizar = (texto) => texto[0].toUpperCase() + texto.slice(1);

function mostrarMomento(horas) {
  const fecha = fechaEn(horas);
  const vista = observarSitio(sitio, fecha);

  // Tierra y Sol en su dirección real vista desde el lugar
  tierra.position.copy(lugar).addScaledVector(rumbo(vista.tierra), DISTANCIA_TIERRA);
  orientarTierra(tierra, fecha, estadoCielo(fecha).marco);
  const haciaSol = rumbo(vista.sol);
  sol.colocar(lugar.clone().addScaledVector(haciaSol, DISTANCIA_SOL), haciaSol);
  // Lo que queda bajo el horizonte del lugar no se dibuja (desde ahí no se ve)
  tierra.visible = vista.tierra.visible;
  sol.modelo.visible = vista.sol.despeje > -vista.sol.radio;

  ultimoMomento = { fecha, vista };
  vista2D?.dibujar(fecha, vista);

  escribir("reloj-texto", `Time on the surface: +${formatearDuracion(horas)} · ${formatearFecha(fecha)}`);
  escribir("tierra-elevacion", `Elevation ${grados(vista.tierra.elevacion)}`);
  escribir("tierra-azimut", `Azimuth ${grados(vista.tierra.azimut)}`);
  escribir("sol-elevacion", `Elevation ${grados(vista.sol.elevacion)}`);
  escribir("sol-azimut", `Azimuth ${grados(vista.sol.azimut)}`);
  escribir("cruce-tierra", capitalizar(textoCruce(vista.tierra.visible, vista.cruces.tierra, "Earth")));
  escribir("cruce-sol", capitalizar(textoCruce(vista.sol.visible, vista.cruces.sol, "sun")));
  escribir(
    "horizonte-sol",
    `${grados(vista.sol.horizonte)} → clearance ${grados(vista.sol.despeje)} (${vista.sol.visible ? "direct light" : "in shadow"})`,
  );
  escribir(
    "horizonte-tierra",
    `${grados(vista.tierra.horizonte)} → clearance ${grados(vista.tierra.despeje)} (${vista.tierra.visible ? "Earth in view" : "Earth hidden"})`,
  );
  return vista;
}

// --- 2 y 3. Evaluar y llenar el panel ---
const panel = elemento("panel-sitio");
const filaPuntos = (nombre, porcentaje, extra = "") =>
  `<dt>${nombre}</dt><dd>${porcentaje.toFixed(1)} %${extra} → ${puntosDe(porcentaje)} pts</dd>`;

let colorResultado = COLORES.verde.hex;

function evaluar() {
  const horas = Math.min(2000, Math.max(1, Number(elemento("estancia").value) || datos.estancia));
  datos.estancia = horas;
  const resultado = evaluarSitio(sitio, prepararCielo(llegada, horas));
  const color = COLORES[resultado.color];
  const previa = misionMasCercana(sitio);

  panel.style.setProperty("--resultado", color.hex);
  colorResultado = color.hex;
  vista2D?.ponerColor(color.hex);
  panel.style.setProperty("--resultado-texto", resultado.color === "amarillo" ? "#06122b" : "#fff");

  const [latitud, longitud] = formatearCoordenadas(sitio.latitud, sitio.longitud).split(", ");
  escribir("latitud", latitud);
  escribir("longitud", longitud);
  escribir("altura", `${resultado.alturaKm >= 0 ? "+" : "−"}${Math.abs(resultado.alturaKm).toFixed(2)} km`);
  escribir(
    "mision-previa",
    previa.mismoLugar
      ? `${previa.nombre} (${previa.anio})`
      : `None (nearest: ${previa.nombre}, ${Math.round(previa.km)} km)`,
  );
  escribir("conveniencia", `${resultado.conveniencia.toFixed(0)} % · ${color.texto}`);
  elemento("comunicacion").innerHTML =
    `Earth in view ${resultado.comunicacion.toFixed(0)} % of the stay (${formatearDuracion(resultado.horasTierra)})<br /><span id="cruce-tierra"></span>`;
  elemento("energia").innerHTML =
    `Sunlight ${resultado.energia.toFixed(0)} % of the stay (${formatearDuracion(resultado.horasLuz)})<br /><span id="cruce-sol"></span>`;

  elemento("detalle").innerHTML = `
    ${filaPuntos("Energy", resultado.energia)}
    ${filaPuntos("Communication", resultado.comunicacion)}
    ${filaPuntos("Terrain", resultado.relieve, ` (slope ${resultado.pendiente.toFixed(1)}° of ${PENDIENTE_LIMITE}° max)`)}
    <dt>Total</dt><dd>${resultado.suma} of 9 pts → ${color.texto}</dd>
    <dt>Horizon toward Sun</dt><dd id="horizonte-sol"></dd>
    <dt>Horizon toward Earth</dt><dd id="horizonte-tierra"></dd>
    <dt>Launch</dt><dd>${datos.origen.nombre} · ${formatearFecha(datos.salida)}</dd>
    <dt>Landing</dt><dd>${formatearFecha(llegada)}</dd>`;
  escribir(
    "curiosidad",
    `${Math.abs(sitio.latitud) >= 80 ? "Near the poles the Sun never climbs more than a few degrees, so a single hill or crater rim can switch the power on or off." : "Here the Sun moves like on Earth, only about 30 times slower."} A lunar day lasts 29.5 Earth days: about two weeks of light, then two weeks of night. ${hayTopografia() ? "" : "Terrain data could not be loaded: a smooth Moon was assumed."}`,
  );

  reloj.max = horas;
  reloj.value = Math.min(Number(reloj.value), horas);
  elemento("estado").hidden = true;
  elemento("contenido").hidden = false;
  return mostrarMomento(Number(reloj.value));
}

elemento("estancia").value = datos.estancia;
await cargarTopografia();
acomodarCamara(evaluar());

elemento("estancia").addEventListener("change", evaluar);
reloj.addEventListener("input", () => mostrarMomento(Number(reloj.value)));
// --- 6. Cambiar entre 3D y 2D ---
function mostrarVista(tipo) {
  const es2D = tipo === "2d";
  elemento("vista-3d").hidden = es2D;
  elemento("vista-2d").hidden = !es2D;
  elemento("info-2d").hidden = !es2D;
  if (es2D) vista2D?.redibujar();
}

elemento("vista").addEventListener("change", (evento) => {
  const valor = evento.target.value;
  if (valor === "trayectoria") return irA("trayectoria.html", datos);
  mostrarVista(valor);
});

// Cuando terminan de cargar las imágenes de la 2D, dibujamos el momento actual
vista2DLista.then(() => {
  vista2D.ponerColor(colorResultado);
  if (ultimoMomento) vista2D.dibujar(ultimoMomento.fecha, ultimoMomento.vista);
  mostrarVista(elemento("vista").value);
});

// --- 7. COMPARE: el programa se corre otra vez, recordando esta entrada ---
elemento("comparar").addEventListener("click", () => {
  window.location.href = direccionCon("index.html", [textoDeEntrada(datos)]);
});
