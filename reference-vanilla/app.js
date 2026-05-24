/**
 * PodoGest - Anti-Collision Appointment Scheduler (Vanilla JS Reference)
 * 
 * --- RECOMIENDA ESTRUCTURA DE DATOS PARA appointments ---
 * Para realizar comparaciones eficientes de superposición de tiempos:
 * 1. Campo 'date' (Tipo string: YYYY-MM-DD): Facilita filtrado inicial por día en Firestore.
 * 2. Campo 'time' (Tipo string: HH:MM): Facilita ordenamiento y comparación exacta por bloques horarias fijos.
 * 3. Enfoque Alternativo (Timestamp / ISO UTC):
 *    - Guardar 'startTimestamp' (Timestamp) y 'endTimestamp' (Timestamp)
 *    - Esto permite validar choques de bloques dinámicos mediante una consulta del tipo:
 *      (nuevaCita.start < existente.end) AND (nuevaCita.end > existente.start)
 */

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { 
    getAuth, 
    signInWithEmailAndPassword, 
    signOut, 
    onAuthStateChanged 
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import { 
    getFirestore, 
    collection, 
    addDoc, 
    getDocs, 
    query, 
    where, 
    onSnapshot 
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

// 1. CONFIGURACIÓN DEL SDK DE FIREBASE (Cargada dinámicamente desde el archivo de configuración del Applet)
const configResponse = await fetch('/firebase-applet-config.json');
const firebaseConfig = await configResponse.json();

// Inicializar la aplicación y los servicios
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);

// Estado de la sesión actual
let currentUser = null;
let currentClinicianName = "Especialista";

// ELEMENTOS DE LA INTERFAZ DE USUARIO (DOM)
const loginSection = document.getElementById("login-section");
const appSection = document.getElementById("app-section");
const userHeader = document.getElementById("user-header");
const activeUserName = document.getElementById("active-user-name");
const logoutBtn = document.getElementById("logout-btn");
const loginForm = document.getElementById("login-form");
const loginEmailInput = document.getElementById("login-email");
const loginPasswordInput = document.getElementById("login-password");
const loginErrorDiv = document.getElementById("login-error");

const bookingForm = document.getElementById("booking-form");
const patientNameInput = document.getElementById("patient-name");
const patientPhoneInput = document.getElementById("patient-phone");
const appointmentDateInput = document.getElementById("appointment-date");
const appointmentTimeInput = document.getElementById("appointment-time");
const treatmentTypeInput = document.getElementById("treatment-type");
const bookingAlertDiv = document.getElementById("booking-alert");
const appointmentsList = document.getElementById("appointments-list");
const apptCountSpan = document.getElementById("appt-count");
const filterDateInput = document.getElementById("filter-date");

// Establecer fecha de hoy como valor por defecto en los inputs de fecha
const todayISO = new Date().toISOString().split("T")[0];
appointmentDateInput.value = todayISO;
filterDateInput.value = todayISO;

// Cache local de citas activas para consulta instantánea anti-choques
let localAppointmentsCache = [];

// ==========================================
// 1. SISTEMA DE LOGIN POR PERFILES
// ==========================================

// Listener del formulario de Acceso
loginForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    loginErrorDiv.classList.add("hidden");
    const email = loginEmailInput.value.trim();
    const password = loginPasswordInput.value;

    try {
        const userCredential = await signInWithEmailAndPassword(auth, email, password);
        currentUser = userCredential.user;
        
        // Determinar el nombre visible del especialista
        if (email.includes("lizbeth")) {
            currentClinicianName = "Dra. Lizbeth";
        } else if (email.includes("yarella")) {
            currentClinicianName = "Dra. Yarella";
        } else {
            currentClinicianName = email.split("@")[0].toUpperCase();
        }
        
        // Ocultar login y mostrar aplicación
        showApplicationMode();
    } catch (error) {
        console.error("Login Error:", error);
        loginErrorDiv.innerText = "Error: Credenciales inválidas. Verifica tu correo y contraseña.";
        loginErrorDiv.classList.remove("hidden");
    }
});

// Listener de Cerrar Sesión
logoutBtn.addEventListener("logout-btn", (e) => {
    e.preventDefault();
});
logoutBtn.click(); // Reset listeners

logoutBtn.onclick = async () => {
    try {
        await signOut(auth);
        showLoginMode();
    } catch (error) {
        console.error("Logout Error:", error);
    }
};

// Observar el estado de autenticación global en tiempo real
onAuthStateChanged(auth, (user) => {
    if (user) {
        currentUser = user;
        const email = user.email || "";
        if (email.includes("lizbeth")) {
            currentClinicianName = "Dra. Lizbeth";
        } else if (email.includes("yarella")) {
            currentClinicianName = "Dra. Yarella";
        } else {
            currentClinicianName = user.displayName || email.split("@")[0] || "Profesional";
        }
        showApplicationMode();
        setupRealtimeAppointments();
    } else {
        showLoginMode();
    }
});

function showApplicationMode() {
    loginSection.classList.add("hidden");
    appSection.classList.remove("hidden");
    userHeader.classList.remove("hidden");
    userHeader.classList.add("flex");
    activeUserName.innerText = currentClinicianName;
}

function showLoginMode() {
    loginSection.classList.remove("hidden");
    appSection.classList.add("hidden");
    userHeader.classList.add("hidden");
    userHeader.classList.remove("flex");
    currentUser = null;
}

// ==========================================
// 2. CALENDARIO GLOBAL ANTI-CHOQUES DE HORARIO
// ==========================================

// Listener para agendar cita
bookingForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    hideBookingAlert();

    // Requisito 1: Bloquear agilización si no hay sesión iniciada
    if (!auth.currentUser) {
        showBookingAlert("Debes iniciar sesión para realizar reservas.", "error");
        return;
    }

    const patientName = patientNameInput.value.trim();
    const patientPhone = patientPhoneInput.value.trim();
    const date = appointmentDateInput.value;
    const time = appointmentTimeInput.value;
    const treatmentType = treatmentTypeInput.value.trim();

    // 1. REVISIÓN DE CHOQUES DE HORARIO EN LA BASE DE DATOS
    // Se realiza la validación local contra la base de datos sincronizada
    const collision = localAppointmentsCache.find(appt => 
        appt.date === date && 
        appt.time === time && 
        appt.status !== 'cancelled'
    );

    if (collision) {
        // Horario ocupado: Informar con detalle de conflicto
        const otherSpecialist = collision.specialistName || "Otra profesional";
        showBookingAlert(`Horario no disponible, ${otherSpecialist} ya tiene paciente a las ${time} horas.`, "error");
        return;
    }

    // 2. HORARIO DISPONIBLE: GUARDAR DOCUMENTO EN FIRESTORE
    try {
        // Estructura de guardado consistente y recomendada
        const newApptDoc = {
            patientName: patientName,
            patientPhone: patientPhone,
            date: date,                     // 'YYYY-MM-DD'
            time: time,                     // 'HH:MM'
            treatmentType: treatmentType,
            status: "pending",              // estado inicial
            patientId: "temp-patient-id",   // ID de referencia
            cost: 25000,                    // costo estimado por defecto
            paid: false,
            specialistId: `esp-${auth.currentUser.uid}`, // ID único del especialista
            specialistName: currentClinicianName,       // Nombre amigable para alertas anti-choque
            createdAt: new Date().toISOString()
        };

        await addDoc(collection(db, "appointments"), newApptDoc);
        
        // Limpiar formulario y celebrar éxito
        bookingForm.reset();
        appointmentDateInput.value = todayISO;
        showBookingAlert("¡Cita agendada exitosamente en el calendario centralizado!", "success");
    } catch (error) {
        console.error("Error al agendar:", error);
        showBookingAlert("Error de conexión: No se pudo registrar la cita. Inténtalo nuevamente.", "error");
    }
});

// Listener del filtro por fecha de calendario
filterDateInput.addEventListener("change", () => {
    renderAppointmentsTable();
});

// ESCUCHA EN TIEMPO REAL DE LA COLECCIÓN DE CITAS (Sincronización multi-dispositivo)
let unsubscribeAppointments = null;
function setupRealtimeAppointments() {
    if (unsubscribeAppointments) {
        unsubscribeAppointments();
    }

    const apptsCollection = collection(db, "appointments");
    
    // Configura la escucha activa
    unsubscribeAppointments = onSnapshot(apptsCollection, (snapshot) => {
        localAppointmentsCache = [];
        snapshot.forEach((doc) => {
            localAppointmentsCache.push({
                id: doc.id,
                ...doc.data()
            });
        });
        
        // Actualizar tabla visible
        renderAppointmentsTable();
    }, (error) => {
        console.error("Firestore snapshot error:", error);
    });
}

// RENDERIZADO DINÁMICO DE LA AGENDA
function renderAppointmentsTable() {
    const selectedDateStr = filterDateInput.value;
    appointmentsList.innerHTML = "";

    // Filtrar citas del día seleccionado
    const filtered = localAppointmentsCache.filter(appt => appt.date === selectedDateStr);
    
    apptCountSpan.innerText = filtered.length;

    if (filtered.length === 0) {
        appointmentsList.innerHTML = `<li class="p-8 text-center text-slate-400 text-xs font-semibold bg-slate-50 rounded-2xl border border-dashed border-slate-200">
            No hay citas registradas para el día ${selectedDateStr}. ¡Agenda una hora arriba!
        </li>`;
        return;
    }

    // Ordenar de mañana a tarde
    filtered.sort((a, b) => a.time.localeCompare(b.time));

    filtered.forEach(appt => {
        const isSelf = appt.specialistId === `esp-${auth.currentUser?.uid}`;
        const itemLI = document.createElement("li");
        
        // Estilo adaptativo según especialista
        itemLI.className = `p-4 rounded-2xl border flex flex-col sm:flex-row sm:items-center justify-between gap-3 transition-all ${
            appt.status === "cancelled" 
                ? "bg-slate-50 border-slate-200 opacity-60 line-through" 
                : isSelf 
                    ? "bg-emerald-50/50 border-emerald-100" 
                    : "bg-amber-50/40 border-amber-150/40"
        }`;

        itemLI.innerHTML = `
            <div class="flex items-start gap-3">
                <span class="font-mono text-xs font-black px-2.5 py-1.5 bg-slate-100/90 text-slate-600 rounded-lg shrink-0 mt-0.5">${appt.time}</span>
                <div>
                    <h4 class="text-sm font-bold text-slate-800">${appt.patientName} (${appt.treatmentType})</h4>
                    <p class="text-xs text-slate-500 mt-0.5">Teléfono: ${appt.patientPhone}</p>
                </div>
            </div>
            <div class="flex items-center gap-2">
                <span class="text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded-md ${
                    isSelf 
                        ? "bg-emerald-600/10 text-emerald-700" 
                        : "bg-amber-600/10 text-amber-700"
                }">
                    Especialista: ${appt.specialistName || "Dra. PodoGest"}
                </span>
            </div>
        `;
        appointmentsList.appendChild(itemLI);
    });
}

// UTILERÍAS DE ALERTAS DE AGENDA
function showBookingAlert(msg, type) {
    bookingAlertDiv.innerText = msg;
    bookingAlertDiv.className = `p-3.5 rounded-xl text-xs font-bold mb-4 border ${
        type === "success" 
            ? "bg-emerald-50 border-emerald-150 text-emerald-700" 
            : "bg-rose-50 border-rose-150 text-rose-700"
    }`;
    bookingAlertDiv.classList.remove("hidden");
}

function hideBookingAlert() {
    bookingAlertDiv.classList.add("hidden");
}
