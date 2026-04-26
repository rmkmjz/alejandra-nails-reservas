// =====================================================
//  CLIENTE - Sistema de reservas para Alejandra Nails
//  Versión JSONP (sin errores CORS)
// =====================================================

const API_URL = 'https://script.google.com/macros/s/AKfycbxhXU_aVhGvCUNaA5i6PBbXnGRlr4EpYFqmnbdiklHtjYhBCO5gSeMzbdE9XEINDvwy/exec'; 

let fechaSeleccionada = '';
let horaSeleccionada = '';

const fechaInput = document.getElementById('fecha');
const horariosContainer = document.getElementById('horariosContainer');
const modal = document.getElementById('modalReserva');
const horaSpan = document.getElementById('horaSeleccionada');
const fechaSpan = document.getElementById('fechaSeleccionada');
const formReserva = document.getElementById('formReserva');
const servicioSelect = document.getElementById('servicio');
const mensajeGlobal = document.getElementById('mensajeGlobal');

function jsonp(url, timeout = 10000) {
  return new Promise((resolve, reject) => {
    const callbackName = `jsonp_callback_${Date.now()}_${Math.floor(Math.random() * 100000)}`;
    const script = document.createElement('script');
    let timer;
    function cleanup() {
      if (script.parentNode) script.parentNode.removeChild(script);
      delete window[callbackName];
      if (timer) clearTimeout(timer);
    }
    timer = setTimeout(() => {
      cleanup();
      reject(new Error('La petición JSONP ha expirado'));
    }, timeout);
    window[callbackName] = (data) => {
      cleanup();
      resolve(data);
    };
    const separator = url.includes('?') ? '&' : '?';
    script.src = `${url}${separator}callback=${callbackName}&_=${Date.now()}`;
    script.onerror = () => {
      cleanup();
      reject(new Error('Error al cargar el script JSONP'));
    };
    document.body.appendChild(script);
  });
}

function mostrarMensaje(texto, esError = false) {
    mensajeGlobal.textContent = texto;
    mensajeGlobal.classList.remove('hidden', 'error');
    if (esError) mensajeGlobal.classList.add('error');
    setTimeout(() => {
        mensajeGlobal.classList.add('hidden');
    }, 4000);
}

async function cargarServicios() {
    try {
        const servicios = await jsonp(`${API_URL}?action=getServicios`);
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

async function cargarHorarios(fecha) {
    if (!fecha) return;
    horariosContainer.innerHTML = '<div class="mensaje-carga">🕒 Cargando horarios disponibles...</div>';
    try {
        const url = `${API_URL}?action=getDisponibilidad&fecha=${fecha}`;
        const data = await jsonp(url);
        const disponibles = data.disponibles || [];
        if (disponibles.length === 0) {
            horariosContainer.innerHTML = '<div class="mensaje-carga">😴 No hay horarios libres para este día. Elige otra fecha.</div>';
            return;
        }
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

function abrirModal(fecha, hora) {
    fechaSeleccionada = fecha;
    horaSeleccionada = hora;
    fechaSpan.textContent = fecha;
    horaSpan.textContent = hora;
    modal.classList.remove('hidden');
}

function cerrarModal() {
    modal.classList.add('hidden');
    formReserva.reset();
    servicioSelect.value = '';
}

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
    const boton = formReserva.querySelector('button');
    const textoOriginal = boton.textContent;
    boton.textContent = '⏳ Enviando...';
    boton.disabled = true;
    try {
        const params = new URLSearchParams({
            action: 'reservar',
            fecha: fechaSeleccionada,
            hora: horaSeleccionada,
            nombre: nombre,
            telefono: telefono || '(no especificado)',
            servicio: servicio
        });
        const url = `${API_URL}?${params.toString()}`;
        const resultado = await jsonp(url);
        if (resultado.success) {
            mostrarMensaje('✅ ¡Reserva confirmada! Te esperamos.');
            cerrarModal();
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

function configurarModal() {
    const cerrarBtn = document.querySelector('.cerrar');
    if (cerrarBtn) cerrarBtn.addEventListener('click', cerrarModal);
    window.addEventListener('click', (e) => {
        if (e.target === modal) cerrarModal();
    });
}

document.addEventListener('DOMContentLoaded', async () => {
    inicializarCalendario();
    configurarModal();
    formReserva.addEventListener('submit', enviarReserva);
    await cargarServicios();
    console.log('Sistema listo (JSONP activo, sin errores CORS)');
});
