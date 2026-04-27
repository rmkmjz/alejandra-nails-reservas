// ⚠️ REEMPLAZA con la URL de tu Web App de Google Apps Script
const API_URL = 'https://script.google.com/macros/s/AKfycbxkQ6flk6W8LT7tEH_JTk9UwSAlOOOt9ezqydLYYSrV4pPM0slluqSybmDYFOvF7BGq/exec';

let turnosActuales = [];

// DOM elements
const fechaInput = document.getElementById('fecha');
const turnosContainer = document.getElementById('turnos-container');
const loadingDiv = document.getElementById('loading');
const modal = document.getElementById('modal');
const closeModal = document.querySelector('.close');
const modalHoraSpan = document.getElementById('modal-hora');
const confirmarBtn = document.getElementById('confirmar-reserva');
const nombreInput = document.getElementById('cliente-nombre');
const telefonoInput = document.getElementById('cliente-telefono');
const modalMensaje = document.getElementById('modal-mensaje');

let horaSeleccionada = null;
let fechaSeleccionada = null;

// --- GET: Obtener turnos de una fecha ---
async function obtenerTurnos(fecha) {
  const url = `${API_URL}?fecha=${encodeURIComponent(fecha)}`;
  const resp = await fetch(url);
  const data = await resp.json();
  if (data.error) throw new Error(data.error);
  return data;
}

// --- POST: Reservar usando application/x-www-form-urlencoded (sin preflight CORS) ---
async function reservarTurno(fecha, hora, nombre, telefono) {
  const formData = new URLSearchParams();
  formData.append('fecha', fecha);
  formData.append('hora', hora);
  formData.append('nombre', nombre);
  formData.append('telefono', telefono);

  const resp = await fetch(API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: formData.toString()
  });
  const data = await resp.json();
  if (data.error) throw new Error(data.error);
  return data;
}

// --- Cargar y mostrar turnos ---
async function cargarTurnos(fecha) {
  turnosContainer.innerHTML = '';
  loadingDiv.classList.remove('oculto');
  
  try {
    const turnos = await obtenerTurnos(fecha);
    turnosActuales = turnos;
    renderizarTurnos(turnos);
  } catch (err) {
    turnosContainer.innerHTML = `<div class="error">❌ ${err.message}</div>`;
  } finally {
    loadingDiv.classList.add('oculto');
  }
}

function renderizarTurnos(turnos) {
  if (turnos.length === 0) {
    turnosContainer.innerHTML = '<div class="aviso">📭 No hay turnos para esta fecha.</div>';
    return;
  }
  
  turnosContainer.innerHTML = '';
  turnos.forEach(turno => {
    const card = document.createElement('div');
    card.className = `turno-card ${turno.estado}`;
    card.innerHTML = `
      <div class="hora">${turno.hora}</div>
      <div class="estado">${turno.estado === 'disponible' ? '✅ Libre' : '❌ Ocupado'}</div>
    `;
    if (turno.estado === 'disponible') {
      card.addEventListener('click', () => abrirModal(turno.hora));
    }
    turnosContainer.appendChild(card);
  });
}

function abrirModal(hora) {
  horaSeleccionada = hora;
  fechaSeleccionada = fechaInput.value;
  modalHoraSpan.innerText = hora;
  nombreInput.value = '';
  telefonoInput.value = '';
  modalMensaje.innerHTML = '';
  modal.classList.remove('oculto');
}

async function confirmarReserva() {
  const nombre = nombreInput.value.trim();
  const telefono = telefonoInput.value.trim();
  if (!nombre || !telefono) {
    modalMensaje.innerHTML = '⚠️ Completa nombre y teléfono';
    return;
  }
  
  modalMensaje.innerHTML = '📡 Reservando...';
  confirmarBtn.disabled = true;
  
  try {
    const respuesta = await reservarTurno(fechaSeleccionada, horaSeleccionada, nombre, telefono);
    if (respuesta.success) {
      modalMensaje.innerHTML = '✅ ¡Turno reservado con éxito!';
      setTimeout(() => {
        modal.classList.add('oculto');
        cargarTurnos(fechaSeleccionada);
      }, 1500);
    } else {
      modalMensaje.innerHTML = `❌ ${respuesta.error || 'Error inesperado'}`;
    }
  } catch (err) {
    modalMensaje.innerHTML = `❌ ${err.message}`;
  } finally {
    confirmarBtn.disabled = false;
  }
}

// --- Event listeners ---
fechaInput.addEventListener('change', (e) => {
  if (e.target.value) cargarTurnos(e.target.value);
});
closeModal.addEventListener('click', () => modal.classList.add('oculto'));
window.addEventListener('click', (e) => {
  if (e.target === modal) modal.classList.add('oculto');
});
confirmarBtn.addEventListener('click', confirmarReserva);

// Inicializar con la fecha de hoy
const hoy = new Date().toISOString().slice(0,10);
fechaInput.value = hoy;
cargarTurnos(hoy);
