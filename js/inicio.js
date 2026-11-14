// inicio.js — Lógica de la pantalla de inicio

// --- Fondo de estrellas ---
const canvas = document.getElementById("estrellas");
const ctx = canvas.getContext("2d");

function dibujarEstrellas() {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
  const cantidad = Math.floor((canvas.width * canvas.height) / 3000);
  for (let i = 0; i < cantidad; i++) {
    const x = Math.random() * canvas.width;
    const y = Math.random() * canvas.height;
    const radio = Math.random() * 1.2;
    ctx.fillStyle = `rgba(255, 255, 255, ${0.3 + Math.random() * 0.7})`;
    ctx.beginPath();
    ctx.arc(x, y, radio, 0, Math.PI * 2);
    ctx.fill();
  }
}

dibujarEstrellas();
window.addEventListener("resize", dibujarEstrellas);

// --- Botones ---
// TODO: cuando existan las siguientes pantallas, cambiar los alert por la navegación real.
document.getElementById("btn-coordenadas").addEventListener("click", () => {
  alert("Próximamente: pantalla para escribir coordenadas");
});

document.getElementById("btn-lugar").addEventListener("click", () => {
  alert("Próximamente: pantalla para elegir un lugar en la Luna");
});
