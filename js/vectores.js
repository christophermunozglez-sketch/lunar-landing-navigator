// vectores.js — Operaciones con vectores 3D (un vector es un arreglo [x, y, z])
//
// Las usan los cálculos (js/calculos.js, js/topografia.js, js/trayectoria.js).
// Están aquí una sola vez para no repetirlas en cada archivo.

export const suma = (a, b) => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
export const resta = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
export const escala = (a, k) => [a[0] * k, a[1] * k, a[2] * k];
export const punto = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2]; // producto punto
export const cruz = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
export const norma = (a) => Math.hypot(a[0], a[1], a[2]); // largo del vector
export const unitario = (a) => escala(a, 1 / norma(a)); // mismo rumbo, largo 1

// Gira el vector "v" un ángulo (radianes) alrededor del eje unitario "eje" (fórmula de Rodrigues)
export function girar(v, eje, angulo) {
  const c = Math.cos(angulo);
  const s = Math.sin(angulo);
  return suma(suma(escala(v, c), escala(cruz(eje, v), s)), escala(eje, punto(eje, v) * (1 - c)));
}

export const RAD = Math.PI / 180; // grados → radianes: grados * RAD
export const GRAD = 180 / Math.PI; // radianes → grados: radianes * GRAD
export const limitar = (valor, minimo, maximo) => Math.min(maximo, Math.max(minimo, valor));
