// trayectoria.js — El viaje de la nave de la Tierra a la Luna (sin dibujar nada)
//
// ─── RESUMEN DEL VIAJE ─────────────────────────────────────────────────────
// 1. DESPEGUE: la nave sale del centro de lanzamiento a la fecha y hora dadas
//    y entra a una órbita circular baja ("de estacionamiento", 200 km).
// 2. ESPERA: da parte de una vuelta hasta quedar del lado contrario a donde
//    estará la Luna cuando lleguemos.
// 3. IMPULSO (TLI): enciende el motor y queda en una elipse cuyo punto más
//    lejano toca la órbita de la Luna (transferencia tipo Hohmann).
// 4. CRUCERO: unos 5 días. Aquí NO usamos fórmulas cerradas: integramos la
//    gravedad de la Tierra, la Luna y el Sol paso a paso (Runge–Kutta 4), con
//    las posiciones reales de Astronomy Engine para esa fecha.
// 5. LLEGADA: al pasar a 100 km de la Luna frena (LOI) y queda en órbita lunar.
// 6. DESCENSO: sigue la órbita hasta pasar sobre el lugar elegido y baja.
//
// Simplificaciones (para que el equipo las tenga claras):
//   • El ascenso y el descenso se dibujan de forma esquemática.
//   • Los encendidos de motor son instantáneos.
//   • El plano de la órbita lunar se elige para pasar sobre el lugar; en una
//     misión real eso se logra con una corrección pequeña a medio camino.
// Unidades: kilómetros, segundos, km/s. Sistema: centrado en la Tierra,
// ecuatorial J2000 (x → punto vernal, z → polo norte).
// ───────────────────────────────────────────────────────────────────────────

import * as Astronomy from "./lib/astronomy.js";
import { RADIO_LUNA_KM } from "./coordenadas.js";
import { RADIO_ECUATORIAL_TIERRA_KM } from "./tierra.js";
import { marcoLunar, ejesDelSitio, aEspacio } from "./calculos.js";
import { suma, resta, escala, punto, cruz, norma, unitario, girar, RAD, GRAD } from "./vectores.js";

// Gravedad de cada cuerpo: μ = G·masa (km³/s²)
const MU_TIERRA = 398600.4355;
const MU_LUNA = 4902.800118;
const MU_SOL = 1.32712440018e11;

// Valores estándar de la nave (se pueden cambiar aquí)
export const ALTITUD_ESTACIONAMIENTO_KM = 200; // órbita baja alrededor de la Tierra
export const ALTITUD_ORBITA_LUNAR_KM = 100; // órbita baja alrededor de la Luna
const ALTITUD_FRENADO_KM = 15; // altura donde empieza el frenado final
const PERDIDAS_DESCENSO = 1.1; // el frenado real gasta ~10 % más que el ideal

const ESFERA_INFLUENCIA_KM = 66183; // dentro de esto manda la gravedad de la Luna
const DIAS_TABLA = 9; // cuántos días de posiciones precalculamos
const SEGUNDOS_DIA = 86400;

const vector = (v) => [v.x, v.y, v.z];

// ── Posiciones reales de la Luna y el Sol ──────────────────────────────────
// Pedimos a Astronomy Engine la posición cada 10 min (Luna) y cada hora (Sol)
// y entre un dato y otro trazamos una recta. Así el integrador no tiene que
// repetir el cálculo astronómico miles de veces.
function tablaDePosiciones(salida) {
  const tabla = (cuerpo, pasoSegundos) => {
    const puntos = [];
    for (let t = 0; t <= DIAS_TABLA * SEGUNDOS_DIA; t += pasoSegundos) {
      const fecha = new Date(salida.getTime() + t * 1000);
      puntos.push(escala(vector(cuerpo(fecha)), Astronomy.KM_PER_AU));
    }
    return (t) => {
      const i = Math.min(Math.max(Math.floor(t / pasoSegundos), 0), puntos.length - 2);
      const f = t / pasoSegundos - i;
      return suma(escala(puntos[i], 1 - f), escala(puntos[i + 1], f));
    };
  };
  return {
    luna: tabla(Astronomy.GeoMoon, 600),
    sol: tabla((fecha) => Astronomy.GeoVector(Astronomy.Body.Sun, fecha, false), 3600),
  };
}

// ── Gravedad ───────────────────────────────────────────────────────────────
// Aceleración de la nave vista desde la Tierra:
//
//   a = −μT·r/|r|³  +  Σ μb·[ (rb − r)/|rb − r|³ − rb/|rb|³ ]     b = Luna, Sol
//
// El primer término es la Tierra. Para la Luna y el Sol se resta cuánto jalan
// a la propia Tierra (porque medimos todo desde ella).
function aceleracion(t, r, cuerpos) {
  const d = norma(r);
  let a = escala(r, -MU_TIERRA / d ** 3);
  for (const [mu, posicion] of [
    [MU_LUNA, cuerpos.luna(t)],
    [MU_SOL, cuerpos.sol(t)],
  ]) {
    const hacia = resta(posicion, r);
    a = suma(a, escala(hacia, mu / norma(hacia) ** 3));
    a = resta(a, escala(posicion, mu / norma(posicion) ** 3));
  }
  return a;
}

// Un paso de Runge–Kutta de 4º orden. estado = { r, v }
function pasoRK4(t, estado, dt, cuerpos) {
  const derivada = (tiempo, e) => ({ r: e.v, v: aceleracion(tiempo, e.r, cuerpos) });
  const mover = (e, k, h) => ({ r: suma(e.r, escala(k.r, h)), v: suma(e.v, escala(k.v, h)) });
  const k1 = derivada(t, estado);
  const k2 = derivada(t + dt / 2, mover(estado, k1, dt / 2));
  const k3 = derivada(t + dt / 2, mover(estado, k2, dt / 2));
  const k4 = derivada(t + dt, mover(estado, k3, dt));
  const mezcla = (a, b, c, d) => escala(suma(suma(a, escala(b, 2)), suma(escala(c, 2), d)), dt / 6);
  return {
    r: suma(estado.r, mezcla(k1.r, k2.r, k3.r, k4.r)),
    v: suma(estado.v, mezcla(k1.v, k2.v, k3.v, k4.v)),
  };
}

// Paso de tiempo: corto cerca de la Tierra o la Luna (todo cambia rápido) y largo en medio
function pasoSegun(distanciaTierra, distanciaLuna) {
  if (distanciaLuna < 6000) return 5;
  if (distanciaTierra < 20000 || distanciaLuna < 20000) return 20;
  if (distanciaTierra < 100000 || distanciaLuna < ESFERA_INFLUENCIA_KM) return 120;
  return 300;
}

// Velocidad de la Luna (km/s) en un instante, para medir la nave respecto a ella
function velocidadLuna(salida, t) {
  const estado = Astronomy.GeoMoonState(new Date(salida.getTime() + t * 1000));
  return escala([estado.vx, estado.vy, estado.vz], Astronomy.KM_PER_AU / SEGUNDOS_DIA);
}

// ── El crucero: del impulso (TLI) hasta el punto más cercano a la Luna ─────
// Devuelve las muestras del camino y el punto donde pasa más cerca de la Luna.
function volarCrucero(salida, cuerpos, tInicio, estadoInicial, tMaximo, guardar) {
  let t = tInicio;
  let estado = estadoInicial;
  let entro = false; // ¿ya entró a la zona donde manda la Luna?
  let cercano = { distancia: Infinity };
  const muestras = [];
  let proximaMuestra = tInicio;

  while (t < tMaximo) {
    const relativo = resta(estado.r, cuerpos.luna(t));
    const distanciaLuna = norma(relativo);
    if (distanciaLuna < cercano.distancia) cercano = { distancia: distanciaLuna, t, estado, relativo };
    else if (entro && distanciaLuna > cercano.distancia * 1.02) break; // ya pasó de largo
    if (distanciaLuna < ESFERA_INFLUENCIA_KM) entro = true;
    if (guardar && t >= proximaMuestra) {
      muestras.push({ t, nave: estado.r });
      proximaMuestra = t + (distanciaLuna < 30000 ? 240 : 1800);
    }
    const dt = pasoSegun(norma(estado.r), distanciaLuna);
    estado = pasoRK4(t, estado, dt, cuerpos);
    t += dt;
  }

  return { muestras, cercano };
}

// ── Cálculo completo ───────────────────────────────────────────────────────
// centro  = { latitud, longitud } del centro de lanzamiento (js/tierra.js)
// salida  = Date (UTC) del despegue
// destino = { latitud, longitud } en la Luna, o null si aún no se elige
export function calcularTrayectoria(centro, salida, destino = null) {
  const cuerpos = tablaDePosiciones(salida);
  const radioInicial = RADIO_ECUATORIAL_TIERRA_KM + ALTITUD_ESTACIONAMIENTO_KM;
  const giroOrbita = Math.sqrt(MU_TIERRA / radioInicial ** 3); // rad/s en la órbita baja

  // Dónde está el centro de lanzamiento en el espacio al despegar (la Tierra gira)
  const observador = new Astronomy.Observer(centro.latitud, centro.longitud, 0);
  const sitio = unitario(vector(Astronomy.ObserverVector(salida, observador, false)));
  const polo = [0, 0, 1];

  // --- Plan inicial (fórmulas de Hohmann) ---
  //   a   = (r1 + r2) / 2                  semieje de la elipse de transferencia
  //   T   = π·√(a³/μ)                      tiempo de vuelo (media elipse)
  //   vTLI = √( μ·(2/r1 − 1/a) )           velocidad justo después del impulso
  // r2 es la distancia REAL de la Luna el día de llegada, así que se repite
  // unas veces: la llegada depende del vuelo y el vuelo de la llegada.
  let plan = null;
  const planear = (adelanto, ajuste) => {
    let tLlegada = 5 * SEGUNDOS_DIA;
    for (let i = 0; i < 8; i++) {
      const luna = cuerpos.luna(tLlegada + ajuste);
      const semieje = (radioInicial + norma(luna)) / 2;
      const tiempoVuelo = Math.PI * Math.sqrt(semieje ** 3 / MU_TIERRA);
      // Plano de la órbita: contiene al centro de lanzamiento y a la Luna de la llegada
      let normal = cruz(sitio, unitario(luna));
      if (norma(normal) < 0.05) normal = resta(polo, escala(sitio, punto(polo, sitio))); // casi alineados
      normal = unitario(normal);
      if (normal[2] < 0) normal = escala(normal, -1); // siempre girando hacia el este
      // El impulso se da del lado contrario a la Luna, dentro de ese plano
      const enPlano = resta(luna, escala(normal, punto(luna, normal)));
      const lugarImpulso = girar(escala(unitario(enPlano), -1), normal, adelanto);
      const angulo = Math.atan2(punto(cruz(sitio, lugarImpulso), normal), punto(sitio, lugarImpulso));
      const espera = ((angulo + 2 * Math.PI) % (2 * Math.PI)) / giroOrbita;
      tLlegada = espera + tiempoVuelo;
      plan = { normal, lugarImpulso, espera, tiempoVuelo, semieje, anguloEspera: espera * giroOrbita };
    }
    const rapidez = Math.sqrt(MU_TIERRA * (2 / radioInicial - 1 / plan.semieje));
    plan.estado = {
      r: escala(plan.lugarImpulso, radioInicial),
      v: escala(cruz(plan.normal, plan.lugarImpulso), rapidez),
    };
    plan.deltaVTLI = rapidez - Math.sqrt(MU_TIERRA / radioInicial);
    return plan;
  };

  // --- Puntería ---
  // El plan de Hohmann no cuenta que la Luna también jala. Movemos un poquito
  // el lugar del impulso ("adelanto") hasta que la nave pase justo a 100 km
  // de la superficie lunar:
  //   1) probamos adelantos de −8° a +8° y vemos a qué distancia pasa cada uno;
  //   2) entre los dos que encierran la distancia deseada, partimos el intervalo
  //      a la mitad muchas veces (bisección) hasta atinarle.
  // Si no se logra, es que la nave llegó a otra hora de la planeada y la Luna
  // ya se había movido: apuntamos a la hora real de llegada ("ajuste") y repetimos.
  const radioPaso = RADIO_LUNA_KM + ALTITUD_ORBITA_LUNAR_KM;
  const volar = (adelanto, ajuste, guardar) => {
    const p = planear(adelanto, ajuste);
    return volarCrucero(salida, cuerpos, p.espera, p.estado, p.espera + p.tiempoVuelo * 1.4, guardar);
  };
  let crucero = null;
  let ajuste = 0;
  for (let intento = 0; intento < 4; intento++) {
    const error = (adelanto) => volar(adelanto, ajuste, false).cercano.distancia - radioPaso;
    let intervalo = null; // el que encierra la solución más cercana a "sin adelanto"
    let anterior = null;
    for (let grados = -8; grados <= 8; grados++) {
      const actual = { adelanto: grados * RAD, error: error(grados * RAD) };
      const encierra = anterior && anterior.error * actual.error <= 0;
      if (encierra && (!intervalo || Math.abs(grados) < Math.abs(intervalo.b * GRAD))) {
        intervalo = { a: anterior.adelanto, b: actual.adelanto, errorA: anterior.error };
      }
      anterior = actual;
    }
    let adelanto = 0;
    for (let i = 0; intervalo && i < 40; i++) {
      adelanto = (intervalo.a + intervalo.b) / 2;
      const errorMedio = error(adelanto);
      if (Math.abs(errorMedio) < 0.5) break; // a menos de 500 m de lo deseado
      if (errorMedio * intervalo.errorA > 0) intervalo.a = adelanto;
      else intervalo.b = adelanto;
    }
    crucero = volar(adelanto, ajuste, true);
    if (Math.abs(crucero.cercano.distancia - radioPaso) < 5) break;
    ajuste += crucero.cercano.t - (plan.espera + plan.tiempoVuelo + ajuste);
  }
  const paso = crucero.cercano; // el punto más cercano a la Luna
  const convergio = Math.abs(paso.distancia - radioPaso) < 5;

  // --- 1 y 2. Despegue y espera en órbita baja (círculo alrededor de la Tierra) ---
  const muestras = [];
  const pasos = Math.max(8, Math.ceil(plan.anguloEspera / (3 * RAD)));
  for (let i = 0; i < pasos; i++) {
    const angulo = (plan.anguloEspera * i) / pasos;
    // Ascenso esquemático: sube de 0 a 200 km en los primeros 20° de órbita
    const subida = Math.min(1, angulo / (20 * RAD));
    const altitud = ALTITUD_ESTACIONAMIENTO_KM * (1 - (1 - subida) ** 2);
    muestras.push({
      t: angulo / giroOrbita,
      nave: escala(girar(sitio, plan.normal, angulo), RADIO_ECUATORIAL_TIERRA_KM + altitud),
    });
  }
  const fases = [
    { nombre: "Launch and parking orbit", t: 0 },
    { nombre: "Trans-lunar coast", t: plan.espera },
  ];
  muestras.push(...crucero.muestras.filter((muestra) => muestra.t < paso.t), { t: paso.t, nave: paso.estado.r });

  // --- 5. Llegada: frenado para quedar en órbita lunar (LOI) ---
  //   Δv = v de paso − v circular = |v| − √(μL/rp)
  const velocidadPaso = resta(paso.estado.v, velocidadLuna(salida, paso.t));
  const deltaVLOI = norma(velocidadPaso) - Math.sqrt(MU_LUNA / paso.distancia);
  fases.push({ nombre: "Lunar orbit", t: paso.t });

  // --- 6. Órbita lunar y descenso hasta el lugar ---
  const giroLunar = Math.sqrt(MU_LUNA / radioPaso ** 3); // rad/s
  const inicio = unitario(paso.relativo);
  // Sin destino todavía: una vuelta completa en el mismo plano en el que llegó
  let normalLunar = unitario(cruz(inicio, velocidadPaso));
  let arco = 2 * Math.PI;
  let tAterrizaje = paso.t + arco / giroLunar;
  if (destino) {
    for (let i = 0; i < 3; i++) {
      // Dónde estará el lugar (la Luna gira) al momento de aterrizar
      const marco = marcoLunar(new Date(salida.getTime() + tAterrizaje * 1000));
      const meta = aEspacio(marco, ejesDelSitio(destino).arriba);
      normalLunar = cruz(inicio, meta);
      if (norma(normalLunar) < 1e-6) normalLunar = cruz(inicio, velocidadPaso);
      normalLunar = unitario(normalLunar);
      if (punto(cruz(normalLunar, inicio), velocidadPaso) < 0) normalLunar = escala(normalLunar, -1);
      arco = Math.atan2(punto(cruz(inicio, meta), normalLunar), punto(inicio, meta));
      arco = (arco + 2 * Math.PI) % (2 * Math.PI);
      if (arco < Math.PI / 2) arco += 2 * Math.PI; // al menos un cuarto de vuelta antes de bajar
      tAterrizaje = paso.t + arco / giroLunar;
    }
  }
  const ARCO_DESCENSO = 30 * RAD; // el descenso (esquemático) ocupa los últimos 30°
  const pasosLunares = Math.ceil(arco / (4 * RAD));
  for (let i = 1; i <= pasosLunares; i++) {
    const angulo = (arco * i) / pasosLunares;
    const t = paso.t + angulo / giroLunar;
    const falta = Math.min(1, (arco - angulo) / ARCO_DESCENSO); // 1 = aún en órbita, 0 = en el suelo
    const altitud = destino ? ALTITUD_ORBITA_LUNAR_KM * (1 - (1 - falta) ** 2) : ALTITUD_ORBITA_LUNAR_KM;
    muestras.push({
      t,
      nave: suma(cuerpos.luna(t), escala(girar(inicio, normalLunar, angulo), RADIO_LUNA_KM + altitud)),
    });
  }
  if (destino) fases.push({ nombre: "Descent and landing", t: tAterrizaje - ARCO_DESCENSO / giroLunar });
  for (const muestra of muestras) muestra.luna = cuerpos.luna(muestra.t);

  // Combustible del descenso (estimación):
  //   1) bajar el punto más cercano de la órbita a 15 km (Hohmann):  Δv1
  //   2) frenar toda la velocidad que trae a 15 km, con 10 % de pérdidas
  const radioFrenado = RADIO_LUNA_KM + ALTITUD_FRENADO_KM;
  const semiejeBajada = (radioPaso + radioFrenado) / 2;
  const deltaV1 = Math.sqrt(MU_LUNA / radioPaso) - Math.sqrt(MU_LUNA * (2 / radioPaso - 1 / semiejeBajada));
  const deltaVDescenso = deltaV1 + PERDIDAS_DESCENSO * Math.sqrt(MU_LUNA * (2 / radioFrenado - 1 / semiejeBajada));

  // Rumbo de despegue (azimut): hacia dónde apunta la velocidad sobre el centro de lanzamiento
  const este = unitario(cruz(polo, sitio));
  const norte = cruz(sitio, este);
  const rumbo = cruz(plan.normal, sitio);

  return {
    muestras, // [{ t (s desde el despegue), nave [km], luna [km] }]
    fases, // [{ nombre, t }]
    convergio,
    llegada: new Date(salida.getTime() + tAterrizaje * 1000),
    datos: {
      azimutLanzamiento: (Math.atan2(punto(rumbo, este), punto(rumbo, norte)) * GRAD + 360) % 360,
      inclinacion: Math.acos(plan.normal[2]) * GRAD,
      esperaMinutos: plan.espera / 60,
      horasVuelo: tAterrizaje / 3600,
      distanciaLunaKm: norma(cuerpos.luna(paso.t)),
      altitudPasoKm: paso.distancia - RADIO_LUNA_KM,
      deltaVTLI: plan.deltaVTLI,
      deltaVLOI,
      deltaVDescenso,
      deltaVTotal: plan.deltaVTLI + deltaVLOI + deltaVDescenso,
    },
  };
}
