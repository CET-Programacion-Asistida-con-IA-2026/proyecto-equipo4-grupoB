/* ═══════════════════════════════════════════════════════════
   CONTIGO — app.js
   Maneja: navegación entre pantallas + toggle claro/oscuro
═══════════════════════════════════════════════════════════ */


// ── NAVEGACIÓN ────────────────────────────────────────────

/**
 * Muestra una pantalla y oculta todas las demás.
 * @param {string} idDestino - El id del <section> a mostrar
 */
function navegarA(idDestino) {
  // 1. Buscar todas las pantallas
  const todasLasPantallas = document.querySelectorAll('.pantalla');

  // 2. Ocultar todas
  todasLasPantallas.forEach(function(pantalla) {
    pantalla.classList.remove('activa');
  });

  // 3. Mostrar solo la que corresponde
  const destino = document.getElementById(idDestino);
  if (destino) {
    destino.classList.add('activa');
    // Volver al tope de la página al navegar
    window.scrollTo({ top: 0, behavior: 'smooth' });
  } else {
    console.warn('No se encontró la pantalla con id:', idDestino);
  }
}


// ── ESCUCHAR CLICS EN BOTONES DE NAVEGACIÓN ───────────────

/**
 * En lugar de asignar eventos uno por uno, usamos "delegación":
 * escuchamos un solo clic en todo el documento y chequeamos
 * si el elemento clickeado tiene el atributo data-destino.
 */
document.addEventListener('click', function(evento) {
  // Buscar el botón más cercano con data-destino
  const boton = evento.target.closest('[data-destino]');

  if (boton) {
    const destino = boton.getAttribute('data-destino');
    navegarA(destino);
  }
});


// ── TOGGLE DE TEMA CLARO / OSCURO ─────────────────────────

const CLAVE_TEMA = 'contigo-tema'; // clave para guardar preferencia

/**
 * Aplica el tema al <html> y actualiza el ícono del botón.
 * @param {string} tema - 'light' o 'dark'
 */
function aplicarTema(tema) {
  document.documentElement.setAttribute('data-theme', tema);

  const iconoTema = document.querySelector('.icono-tema');
  if (iconoTema) {
    iconoTema.textContent = tema === 'dark' ? '🌙' : '☀️';
  }

  // Guardar preferencia en localStorage
  localStorage.setItem(CLAVE_TEMA, tema);
}

/**
 * Alterna entre claro y oscuro.
 */
function alternarTema() {
  const temaActual = document.documentElement.getAttribute('data-theme');
  const nuevoTema = temaActual === 'dark' ? 'light' : 'dark';
  aplicarTema(nuevoTema);
}

// Asignar el evento al botón de toggle
const botonTema = document.getElementById('toggleTema');
if (botonTema) {
  botonTema.addEventListener('click', alternarTema);
}


// ── CARGAR TEMA GUARDADO AL INICIAR ───────────────────────

/**
 * Al abrir la app, revisamos si el usuario ya eligió un tema
 * antes. Si no, usamos la preferencia del sistema operativo.
 */
function cargarTemaInicial() {
  const temaGuardado = localStorage.getItem(CLAVE_TEMA);

  if (temaGuardado) {
    // El usuario ya eligió antes
    aplicarTema(temaGuardado);
  } else {
    // Detectar preferencia del sistema
    const prefiereDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    aplicarTema(prefiereDark ? 'dark' : 'light');
  }
}

cargarTemaInicial();