// 🔁 REEMPLAZA con tu URL real de Google Apps Script
const API_URL = 'https://script.google.com/macros/s/AKfycbxkQ6flk6W8LT7tEH_JTk9UwSAlOOOt9ezqydLYYSrV4pPM0slluqSybmDYFOvF7BGq/exec';

let turnosActuales = [];

// Elementos DOM
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

// ---- Helper fetch ----
async function peticion(url, opciones = {}) {
  const res = await fetch(url, opciones);
  const data = await res.json();
  if (!res.ok || data.error) throw new Error(data.error || 'Error de conexión');
  return data;
}

// ---- Cargar turnos de una fecha ----
async function cargarTurnos(fecha) {
  turnosContainer.innerHTML = '';
  loadingDiv.classList.remove('oculto');
  
  try {
    const turnos = await peticion(`${API_URL}?fecha=${fecha}`);
    turnosActuales = turnos;
    renderizarTurnos(turnos);
  } catch (err) {
    turnosContainer.innerHTML = `<div class="error">❌ ${err.message}</div>`;
  } finally {
    loadingDiv.classList.add('oculto');
  }
}

// ---- Mostrar turnos en pantalla ----
function renderizarTurnos(turnos) {
  if (turnos.length === 0) {
    turnosContainer.innerHTML = '<div class="aviso">📭 No hay turnos programados para esta fecha.</div>';
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

// ---- Abrir modal para reservar ----
function abrirModal(hora) {
  horaSeleccionada = hora;
  fechaSeleccionada = fechaInput.value;
  modalHoraSpan.innerText = hora;
  nombreInput.value = '';
  telefonoInput.value = '';
  modalMensaje.innerHTML = '';
  modal.classList.remove('oculto');
}

// ---- Confirmar reserva ----
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
    const respuesta = await peticion(API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        fecha: fechaSeleccionada,
        hora: horaSeleccionada,
        nombre: nombre,
        telefono: telefono
      })
    });
    
    if (respuesta.success) {
      modalMensaje.innerHTML = '✅ ¡Turno reservado con éxito!';
      setTimeout(() => {
        modal.classList.add('oculto');
        cargarTurnos(fechaSeleccionada);  // recargar la vista
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

// ---- Eventos ----
fechaInput.addEventListener('change', (e) => {
  const fecha = e.target.value;
  if (fecha) cargarTurnos(fecha);
});

closeModal.addEventListener('click', () => {
  modal.classList.add('oculto');
});
window.addEventListener('click', (e) => {
  if (e.target === modal) modal.classList.add('oculto');
});
confirmarBtn.addEventListener('click', confirmarReserva);

// ---- Al cargar la página, poner la fecha de hoy si es válida ----
const hoy = new Date().toISOString().slice(0,10);
fechaInput.value = hoy;
cargarTurnos(hoy);
