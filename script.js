// =====================================================
//  CLIENTE - Sistema de reservas para manicurista
// =====================================================
// 🔁 REEMPLAZA ESTA URL CON LA DE TU APPS SCRIPT
const API_URL = 'https://script.google.com/macros/s/AKfycbzkMAAdfcx8Y1cM6B063ybYSJqnvKiScKd1Ktns_gHEW_A6BJQWmSaKLImupjPuNIG1/exec';

// Variables globales
let fechaSeleccionada = '';
let horaSeleccionada = '';
let serviciosLista = [];

// Elementos DOM
const fechaInput = document.getElementById('fecha');
const horariosContainer = document.getElementById('horariosContainer');
const modal = document.getElementById('modalReserva');
const horaSpan = document.getElementById('horaSeleccionada');
const fechaSpan = document.getElementById('fechaSeleccionada');
const formReserva = document.getElementById('formReserva');
const servicioSelect = document.getElementById('servicio');
const mensajeGlobal = document.getElementById('mensajeGlobal');

// Mostrar mensaje temporal (éxito o error)
function mostrarMensaje(texto, esError = false) {
    mensajeGlobal.textContent = texto;
    mensajeGlobal.classList.remove('hidden', 'error');
    if (esError) mensajeGlobal.classList.add('error');
    setTimeout(() => {
        mensajeGlobal.classList.add('hidden');
    }, 4000);
}

// Cargar lista de servicios al iniciar
async function cargarServicios() {
    try {
        const response = await fetch(`${API_URL}?action=getServicios`);
        if (!response.ok) throw new Error('Error al cargar servicios');
        const servicios = await response.json();
        serviciosLista = servicios;
        // Llenar select del modal
        servicioSelect.innerHTML = '<option value="">Selecciona un servicio...</option>';
        servicios.forEach(serv => {
            const option = document.createElement('option');
            option.value = serv;
            option.textContent = serv;
            servicioSelect.appendChild(option);
        });
    } catch (error) {
        console.error(error);
        mostrarMensaje('⚠️ No se pudieron cargar los servicios. Recarga la página.', true);
    }
}

// Obtener horarios disponibles para una fecha
async function cargarHorarios(fecha) {
    if (!fecha) return;
    horariosContainer.innerHTML = '<div class="mensaje-carga">🕒 Cargando horarios disponibles...</div>';
    try {
        const url = `${API_URL}?action=getDisponibilidad&fecha=${fecha}`;
        const response = await fetch(url);
        if (!response.ok) throw new Error('Error al consultar disponibilidad');
        const data = await response.json();
        const disponibles = data.disponibles || [];
        
        if (disponibles.length === 0) {
            horariosContainer.innerHTML = '<div class="mensaje-carga">😴 No hay horarios libres para este día. Elige otra fecha.</div>';
            return;
        }
        
        // Mostrar botones de horarios
        const grid = document.createElement('div');
        grid.className = 'horarios-grid';
        disponibles.forEach(hora => {
            const btn = document.createElement('button');
            btn.textContent = hora;
            btn.classList.add('horario-btn');
            btn.addEventListener('click', () => abrirModal(fecha, hora));
            grid.appendChild(btn);
        });
        horariosContainer.innerHTML = '';
        horariosContainer.appendChild(grid);
    } catch (error) {
        console.error(error);
        horariosContainer.innerHTML = '<div class="mensaje-carga" style="color:red;">❌ Error de conexión. Intenta de nuevo.</div>';
        mostrarMensaje('Error al cargar horarios', true);
    }
}

// Abrir modal para confirmar reserva
function abrirModal(fecha, hora) {
    fechaSeleccionada = fecha;
    horaSeleccionada = hora;
    fechaSpan.textContent = fecha;
    horaSpan.textContent = hora;
    modal.classList.remove('hidden');
}

// Cerrar modal
function cerrarModal() {
    modal.classList.add('hidden');
    formReserva.reset();
    servicioSelect.value = '';
}

// Enviar reserva al backend
async function enviarReserva(event) {
    event.preventDefault();
    const nombre = document.getElementById('nombre').value.trim();
    const telefono = document.getElementById('telefono').value.trim();
    const servicio = servicioSelect.value;
    
    if (!nombre) {
        mostrarMensaje('❌ Por favor ingresa tu nombre', true);
        return;
    }
    if (!servicio) {
        mostrarMensaje('❌ Selecciona un servicio', true);
        return;
    }
    
    const reserva = {
        action: 'reservar',
        fecha: fechaSeleccionada,
        hora: horaSeleccionada,
        nombre: nombre,
        telefono: telefono || '(no especificado)',
        servicio: servicio
    };
    
    // Mostrar mensaje de "enviando"
    const boton = formReserva.querySelector('button');
    const textoOriginal = boton.textContent;
    boton.textContent = '⏳ Enviando...';
    boton.disabled = true;
    
    try {
        const response = await fetch(API_URL, {
            method: 'POST',
            body: JSON.stringify(reserva),
            headers: { 'Content-Type': 'application/json' }
        });
        const resultado = await response.json();
        if (resultado.success) {
            mostrarMensaje('✅ ¡Reserva confirmada! Te esperamos.');
            cerrarModal();
            // Recargar horarios de la misma fecha para actualizar la disponibilidad
            await cargarHorarios(fechaSeleccionada);
        } else {
            mostrarMensaje(`❌ No se pudo reservar: ${resultado.error}`, true);
        }
    } catch (error) {
        console.error(error);
        mostrarMensaje('❌ Error de red. Intenta de nuevo más tarde.', true);
    } finally {
        boton.textContent = textoOriginal;
        boton.disabled = false;
    }
}

// Configurar fecha mínima (hoy) y evento de cambio
function inicializarCalendario() {
    const hoy = new Date();
    const yyyy = hoy.getFullYear();
    const mm = String(hoy.getMonth() + 1).padStart(2, '0');
    const dd = String(hoy.getDate()).padStart(2, '0');
    fechaInput.min = `${yyyy}-${mm}-${dd}`;
    
    fechaInput.addEventListener('change', (e) => {
        const fecha = e.target.value;
        if (fecha) {
            cargarHorarios(fecha);
        } else {
            horariosContainer.innerHTML = '<div class="mensaje-carga">📅 Selecciona una fecha para ver horarios</div>';
        }
    });
}

// Cerrar modal al hacer clic en la X o fuera del contenido
function configurarModal() {
    const cerrarBtn = document.querySelector('.cerrar');
    cerrarBtn.addEventListener('click', cerrarModal);
    window.addEventListener('click', (e) => {
        if (e.target === modal) cerrarModal();
    });
}

// Inicializar
document.addEventListener('DOMContentLoaded', async () => {
    inicializarCalendario();
    configurarModal();
    formReserva.addEventListener('submit', enviarReserva);
    await cargarServicios();
    // Opcional: si quieres mostrar un mensaje de bienvenida
    console.log('Sistema listo');
});
