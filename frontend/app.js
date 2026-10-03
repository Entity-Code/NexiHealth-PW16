const API_URL = "http://127.0.0.1:8000";

let utenteLoggato = null; // { id, nome, cognome, ruolo: 'paziente' | 'admin' | 'dottore' }
let listaPazientiCache = [];
let listaPrenotazioniCache = [];
let idPazienteDaEliminare = null;
let listaDottoriCache = [];
let listaDottoriAttiviBooking = []; // Cache locale per il form di prenotazione

// Helper centralizzato per generare gli header di autenticazione con id e ruolo[cite: 1]
function ottieniHeadersAuth(headersBase = {}) {
    const headers = { ...headersBase };
    if (utenteLoggato && utenteLoggato.id) {
        headers["X-User-ID"] = String(utenteLoggato.id);
        if (utenteLoggato.ruolo) {
            headers["X-User-Role"] = String(utenteLoggato.ruolo);
        }
    }
    return headers;
}

// Logica per apertura modale login admin[cite: 1]
function triggerAdminLoginModal() {
    chiudiMenuMobile();
    const loginModal = document.getElementById('loginModal');
    const loginTypeSelect = document.getElementById('loginType');
    const loginModalTitle = document.getElementById('loginModalTitle');
    const loginTypeGroup = document.getElementById('loginTypeGroup');
    const registerLinkContainer = document.getElementById('registerLinkContainer');
    const loginIdentificativo = document.getElementById('loginIdentificativo');

    if (loginTypeSelect) {
        let adminOpt = loginTypeSelect.querySelector('option[value="admin"]');
        if (!adminOpt) {
            adminOpt = document.createElement('option');
            adminOpt.value = 'admin';
            adminOpt.text = 'Amministratore';
            loginTypeSelect.appendChild(adminOpt);
        }
        loginTypeSelect.value = 'admin';
    }

    if (loginModalTitle) loginModalTitle.textContent = "Accesso Amministratore";
    if (loginTypeGroup) loginTypeGroup.style.display = 'none';
    if (registerLinkContainer) registerLinkContainer.style.display = 'none';
    
    if (loginIdentificativo) {
        loginIdentificativo.placeholder = "Username";
    }

    const loginErrorMsg = document.getElementById("loginErrorMsg");
    if (loginErrorMsg) {
        loginErrorMsg.classList.add("hidden");
        loginErrorMsg.style.display = "none";
    }

    if (loginModal) {
        loginModal.classList.remove('hidden');
    }
}

document.addEventListener("DOMContentLoaded", () => {
    navigaHome();
    caricaVetrinaDottoriHome();
    caricaRepartiVetrinaHome();
    caricaDatiVetrina();

    const topBar = document.querySelector(".top-bar");
    if (topBar) {
        window.addEventListener("scroll", () => {
            if (window.innerWidth > 900) {
                if (window.scrollY > 25) {
                    topBar.classList.add("scrolled");
                } else {
                    topBar.classList.remove("scrolled");
                }
            } else {
                topBar.classList.remove("scrolled");
            }
        }, { passive: true });
    }

    const hamburgerBtn = document.getElementById("hamburgerBtn");
    const navContainer = document.getElementById("navContainer");

    if (hamburgerBtn && navContainer) {
        hamburgerBtn.addEventListener("click", () => {
            navContainer.classList.toggle("active");
        });
    }

    const btnAdminLock = document.getElementById('btnAdminLock');
    if (btnAdminLock) {
        btnAdminLock.addEventListener('click', triggerAdminLoginModal);
    }

    const btnAdminLockMobile = document.getElementById('btnAdminLockMobile');
    if (btnAdminLockMobile) {
        btnAdminLockMobile.addEventListener('click', triggerAdminLoginModal);
    }

    const btnLoginModal = document.getElementById("btnLoginModal");
    if (btnLoginModal) btnLoginModal.addEventListener("click", apriModaleLoginStandard);
    
    const closeModal = document.getElementById("closeModal");
    if (closeModal) closeModal.addEventListener("click", () => {
        document.getElementById("loginModal").classList.add("hidden");
    });

    const btnCambioPasswordModal = document.getElementById("btnCambioPasswordModal");
    if (btnCambioPasswordModal) btnCambioPasswordModal.addEventListener("click", apriModaleCambioPassword);
    
    const closePasswordModal = document.getElementById("closePasswordModal");
    if (closePasswordModal) closePasswordModal.addEventListener("click", () => {
        document.getElementById("changePasswordModal").classList.add("hidden");
    });
    
    const formChangePassword = document.getElementById("formChangePassword");
    if (formChangePassword) formChangePassword.addEventListener("submit", effettuaCambioPassword);

    const closeEditPazienteModal = document.getElementById("closeEditPazienteModal");
    if (closeEditPazienteModal) closeEditPazienteModal.addEventListener("click", () => {
        document.getElementById("editPazienteModal").classList.add("hidden");
    });
    
    const formEditPaziente = document.getElementById("formEditPaziente");
    if (formEditPaziente) formEditPaziente.addEventListener("submit", salvaModificaPaziente);

    const closeEditPrenotazioneModal = document.getElementById("closeEditPrenotazioneModal");
    if (closeEditPrenotazioneModal) closeEditPrenotazioneModal.addEventListener("click", () => {
        document.getElementById("editPrenotazioneModal").classList.add("hidden");
    });
    
    const formEditPrenotazione = document.getElementById("formEditPrenotazione");
    if (formEditPrenotazione) formEditPrenotazione.addEventListener("submit", salvaModificaPrenotazione);

    const closeConfirmDeleteModal = document.getElementById("closeConfirmDeleteModal");
    if (closeConfirmDeleteModal) closeConfirmDeleteModal.addEventListener("click", chiudiModalConfermaEliminazione);
    
    const btnCancelDelete = document.getElementById("btnCancelDelete");
    if (btnCancelDelete) btnCancelDelete.addEventListener("click", chiudiModalConfermaEliminazione);
    
    const btnConfirmDelete = document.getElementById("btnConfirmDelete");
    if (btnConfirmDelete) btnConfirmDelete.addEventListener("click", eseguiEliminazionePazienteConfermata);

    const linkVaiARegistrazione = document.getElementById("linkVaiARegistrazione");
    if (linkVaiARegistrazione) linkVaiARegistrazione.addEventListener("click", (e) => {
        e.preventDefault();
        document.getElementById("loginModal").classList.add("hidden");
        mostraVista('view-register');
    });

    const formLogin = document.getElementById("formLogin");
    if (formLogin) formLogin.addEventListener("submit", effettuaLogin);
    
    const btnLogout = document.getElementById("btnLogout");
    if (btnLogout) btnLogout.addEventListener("click", effettuaLogout);
    
    const formPaziente = document.getElementById("formPaziente");
    if (formPaziente) formPaziente.addEventListener("submit", registraPaziente);
    
    const formPrenotazione = document.getElementById("formPrenotazione");
    if (formPrenotazione) formPrenotazione.addEventListener("submit", creaPrenotazione);

    const specSelect = document.getElementById("specializzazioneSelect");
    if (specSelect) {
        specSelect.addEventListener("change", (e) => {
            filtraDottoriPerSpecializzazione(e.target.value);
        });
    }

    const docSelect = document.getElementById("dottoreSelect");
    if (docSelect) {
        docSelect.addEventListener("change", (e) => {
            const docId = parseInt(e.target.value);
            if (docId) {
                const dottore = listaDottoriAttiviBooking.find(d => d.id === docId);
                if (dottore && specSelect && !specSelect.value) {
                    specSelect.value = dottore.specializzazione;
                }
            }
        });
    }

    const closeEditDottoreModal = document.getElementById("closeEditDottoreModal");
    if (closeEditDottoreModal) closeEditDottoreModal.addEventListener("click", () => {
        document.getElementById("editDottoreModal").classList.add("hidden");
    });
    
    const formEditDottore = document.getElementById("formEditDottore");
    if (formEditDottore) formEditDottore.addEventListener("submit", salvaDottoreAdmin);

    const loginTypeSelect = document.getElementById("loginType");
    if (loginTypeSelect) {
        loginTypeSelect.addEventListener("change", (e) => {
            const loginIdentificativo = document.getElementById("loginIdentificativo");
            if (loginIdentificativo) {
                if (e.target.value === "admin") {
                    loginIdentificativo.placeholder = "Username";
                } else {
                    loginIdentificativo.placeholder = "Codice Fiscale o Email";
                }
            }
        });
    }
});

function chiudiMenuMobile() {
    const navContainer = document.getElementById("navContainer");
    if (navContainer && navContainer.classList.contains("active")) {
        navContainer.classList.remove("active");
    }
}

function navigaHome() {
    chiudiMenuMobile();
    if (utenteLoggato && utenteLoggato.ruolo === 'dottore') {
        mostraVista('view-home-doctor');
    } else if (utenteLoggato && utenteLoggato.ruolo === 'admin') {
        mostraVista('view-home-admin');
    } else {
        mostraVista('view-home');
        caricaVetrinaDottoriHome();
        caricaRepartiVetrinaHome();
        caricaDatiVetrina();
    }
}

function vaiATabAdmin(tabId) {
    mostraVista('view-admin');
    mostraTabAdmin(tabId);
}

async function caricaDatiVetrina() {
    try {
        const res = await fetch(`${API_URL}/vetrina/`);
        if (!res.ok) return;
        const v = await res.json();

        const setTxt = (id, val) => {
            const el = document.getElementById(id);
            if (el) el.textContent = val;
        };

        setTxt("homeKpi1Num", v.kpi1_numero);
        setTxt("homeKpi1Lbl", v.kpi1_label);
        setTxt("homeKpi2Num", v.kpi2_numero);
        setTxt("homeKpi2Lbl", v.kpi2_label);
        setTxt("homeKpi3Num", v.kpi3_numero);
        setTxt("homeKpi3Lbl", v.kpi3_label);
        setTxt("homeKpi4Num", v.kpi4_numero);
        setTxt("homeKpi4Lbl", v.kpi4_label);
        setTxt("homeOrariApertura", v.orari_apertura);
        setTxt("homeTelefonoContatto", `📞 Centralino: ${v.telefono_contatto}`);
        setTxt("homeEmailContatto", `✉️ Email: ${v.email_contatto}`);
    } catch (err) {
        console.error("Errore recupero dati vetrina:", err);
    }
}

async function caricaFormGestioneVetrinaAdmin() {
    if (!utenteLoggato || utenteLoggato.ruolo !== 'admin') return;

    let v = {
        kpi1_numero: "15.000+",
        kpi1_label: "Pazienti Assistiti",
        kpi2_numero: "98%",
        kpi2_label: "Soddisfazione Pazienti",
        kpi3_numero: "< 48h",
        kpi3_label: "Tempo Medio di Accesso",
        kpi4_numero: "100%",
        kpi4_label: "Refertazione Digitale",
        orari_apertura: "Lunedì - Venerdì: 08:00 - 20:00 | Sabato: 08:30 - 14:00",
        telefono_contatto: "+39 081 123 4567",
        email_contatto: "info@nexihealth.it"
    };

    try {
        const res = await fetch(`${API_URL}/vetrina/`);
        if (res.ok) {
            const data = await res.json();
            v = { ...v, ...data };
        }
    } catch (err) {
        console.warn("Uso valori predefiniti vetrina.", err);
    }

    const setVal = (id, val) => {
        const el = document.getElementById(id);
        if (el) el.value = val || "";
    };

    setVal("editKpi1Num", v.kpi1_numero);
    setVal("editKpi1Lbl", v.kpi1_label);
    setVal("editKpi2Num", v.kpi2_numero);
    setVal("editKpi2Lbl", v.kpi2_label);
    setVal("editKpi3Num", v.kpi3_numero);
    setVal("editKpi3Lbl", v.kpi3_label);
    setVal("editKpi4Num", v.kpi4_numero);
    setVal("editKpi4Lbl", v.kpi4_label);
    setVal("editOrariApertura", v.orari_apertura);
    setVal("editTelefonoContatto", v.telefono_contatto);
    setVal("editEmailContatto", v.email_contatto);
}

function apriModaleAnteprimaVetrina() {
    const getVal = (id, def) => {
        const el = document.getElementById(id);
        return (el && el.value.trim()) ? el.value.trim() : def;
    };

    const prev1 = document.getElementById("prevKpi1Num"); if (prev1) prev1.textContent = getVal("editKpi1Num", "15.000+");
    const prev1L = document.getElementById("prevKpi1Lbl"); if (prev1L) prev1L.textContent = getVal("editKpi1Lbl", "Pazienti Assistiti");
    const prev2 = document.getElementById("prevKpi2Num"); if (prev2) prev2.textContent = getVal("editKpi2Num", "98%");
    const prev2L = document.getElementById("prevKpi2Lbl"); if (prev2L) prev2L.textContent = getVal("editKpi2Lbl", "Soddisfazione Pazienti");
    const prev3 = document.getElementById("prevKpi3Num"); if (prev3) prev3.textContent = getVal("editKpi3Num", "< 48h");
    const prev3L = document.getElementById("prevKpi3Lbl"); if (prev3L) prev3L.textContent = getVal("editKpi3Lbl", "Tempo Medio di Accesso");
    const prev4 = document.getElementById("prevKpi4Num"); if (prev4) prev4.textContent = getVal("editKpi4Num", "100%");
    const prev4L = document.getElementById("prevKpi4Lbl"); if (prev4L) prev4L.textContent = getVal("editKpi4Lbl", "Refertazione Digitale");
    const prevOr = document.getElementById("prevOrari"); if (prevOr) prevOr.textContent = getVal("editOrariApertura", "Lunedì - Venerdì: 08:00 - 20:00 | Sabato: 08:30 - 14:00");
    const prevTe = document.getElementById("prevTelefono"); if (prevTe) prevTe.textContent = getVal("editTelefonoContatto", "+39 081 123 4567");
    const prevEm = document.getElementById("prevEmail"); if (prevEm) prevEm.textContent = getVal("editEmailContatto", "info@nexihealth.it");

    const modal = document.getElementById("previewVetrinaModal");
    if (modal) modal.classList.remove("hidden");
}

function chiudiModaleAnteprimaVetrina() {
    const modal = document.getElementById("previewVetrinaModal");
    if (modal) modal.classList.add("hidden");
}

async function salvaImpostazioniVetrinaAdmin() {
    if (!utenteLoggato || utenteLoggato.ruolo !== 'admin') {
        mostraMessaggio("Sessione non valida.", true);
        return;
    }

    const payload = {
        kpi1_numero: (document.getElementById("editKpi1Num")?.value || "").trim(),
        kpi1_label: (document.getElementById("editKpi1Lbl")?.value || "").trim(),
        kpi2_numero: (document.getElementById("editKpi2Num")?.value || "").trim(),
        kpi2_label: (document.getElementById("editKpi2Lbl")?.value || "").trim(),
        kpi3_numero: (document.getElementById("editKpi3Num")?.value || "").trim(),
        kpi3_label: (document.getElementById("editKpi3Lbl")?.value || "").trim(),
        kpi4_numero: (document.getElementById("editKpi4Num")?.value || "").trim(),
        kpi4_label: (document.getElementById("editKpi4Lbl")?.value || "").trim(),
        orari_apertura: (document.getElementById("editOrariApertura")?.value || "").trim(),
        telefono_contatto: (document.getElementById("editTelefonoContatto")?.value || "").trim(),
        email_contatto: (document.getElementById("editEmailContatto")?.value || "").trim()
    };

    try {
        const res = await fetch(`${API_URL}/vetrina/`, {
            method: "PUT",
            headers: ottieniHeadersAuth({ "Content-Type": "application/json" }),
            body: JSON.stringify(payload)
        });

        if (res.ok) {
            mostraMessaggio("Impostazioni e KPI della vetrina salvati con successo!");
            caricaDatiVetrina();
        } else {
            const err = await res.json();
            mostraMessaggio(err.detail || "Errore durante il salvataggio.", true);
        }
    } catch (err) {
        mostraMessaggio("Errore di connessione al server.", true);
    }
}

window.apriModaleAnteprimaVetrina = apriModaleAnteprimaVetrina;
window.chiudiModaleAnteprimaVetrina = chiudiModaleAnteprimaVetrina;
window.salvaImpostazioniVetrinaAdmin = salvaImpostazioniVetrinaAdmin;
window.vaiATabAdmin = vaiATabAdmin;

const REPARTI_METADATA = {
    "cardiologia": {
        icona: "❤️",
        descrizione: "Screening cardiovascolari, ECG, holter pressorio e monitoraggio dell'ipertensione arteriosa."
    },
    "dermatologia": {
        icona: "🔍",
        descrizione: "Mappatura nevi in epiluminescenza, cura di dermatiti, psoriasi e salute della cute."
    },
    "ortopedia": {
        icona: "🦴",
        descrizione: "Valutazioni articolari, diagnosi di traumi sportivi e programmi terapeutici osteoarticolari."
    },
    "medicina generale": {
        icona: "🩺",
        descrizione: "Check-up periodici di routine, medicina preventiva e inquadramento clinico generale."
    },
    "urologia": {
        icona: "💧",
        descrizione: "Prevenzione delle patologie urinarie, controlli prostatici ecoguidati e monitoraggio specialistico."
    },
    "oculistica": {
        icona: "👁️",
        descrizione: "Visite refrattive, esame del fondo oculare, tono oculare e diagnosi delle patologie visive."
    },
    "neurologia": {
        icona: "🧠",
        descrizione: "Valutazioni dei disturbi cefalalgici, sistema nervoso periferico e follow-up neurologico mirato."
    },
    "ginecologia": {
        icona: "🌸",
        descrizione: "Prevenzione oncologica femminile, ecografie pelviche transvaginali e percorsi dedicati."
    }
};

async function caricaRepartiVetrinaHome() {
    const container = document.getElementById("departmentsGridContainer");
    if (!container) return;

    try {
        const res = await fetch(`${API_URL}/dottori/attivi`);
        if (!res.ok) return;
        const dottori = await res.json();

        const specializzazioniPresenti = Array.from(
            new Set(dottori.map(d => (d.specializzazione || '').trim()).filter(Boolean))
        ).sort();

        const elenco = specializzazioniPresenti.length > 0 
            ? specializzazioniPresenti 
            : ["Cardiologia", "Dermatologia", "Ortopedia", "Medicina Generale"];

        container.innerHTML = "";
        elenco.forEach(spec => {
            const specKey = spec.toLowerCase();
            const meta = REPARTI_METADATA[specKey] || {
                icona: "🩺",
                descrizione: `Visite specialistiche ambulatoriali, consulenze diagnostiche e protocolli clinici di ${spec}.`
            };

            container.innerHTML += `
                <div class="department-card">
                    <div class="dept-icon">${meta.icona}</div>
                    <h4>${spec}</h4>
                    <p>${meta.descrizione}</p>
                </div>
            `;
        });
    } catch (err) {
        console.error("Errore caricamento reparti home:", err);
    }
}

async function caricaVetrinaDottoriHome() {
    const container = document.getElementById("vetrinaDottoriContainer");
    if (!container) return;

    try {
        const res = await fetch(`${API_URL}/dottori/attivi`);
        if (!res.ok) return;
        const dottori = await res.json();

        if (dottori.length === 0) {
            container.innerHTML = '<p class="text-muted">Nessun medico specialista registrato al momento.</p>';
            return;
        }

        container.innerHTML = "";
        dottori.forEach(d => {
            const iniziali = `${d.nome.charAt(0)}${d.cognome.charAt(0)}`;
            container.innerHTML += `
                <div class="doc-showcase-card">
                    <div class="doc-avatar">${iniziali}</div>
                    <h4>Dr. ${d.nome} ${d.cognome}</h4>
                    <span class="doc-spec-badge">${d.specializzazione}</span>
                    <p>Esperto in protocolli di diagnosi e cura ambulatoriale.</p>
                    <button class="btn-primary" style="margin-top:8px; font-size:0.85rem;" onclick="prenotaConDottore(${d.id}, '${d.specializzazione}')">Prenota con questo Medico</button>
                </div>
            `;
        });
    } catch (err) {
        console.error("Errore vetrina medici:", err);
    }
}

async function prenotaConDottore(dottoreId, specializzazione) {
    if (!utenteLoggato) {
        apriModaleLoginStandard();
        return;
    }
    mostraVista('view-booking');
    await caricaSpecializzazioniEDottoriBooking();
    
    setTimeout(() => {
        const specSel = document.getElementById("specializzazioneSelect");
        if (specSel) {
            specSel.value = specializzazione;
            filtraDottoriPerSpecializzazione(specializzazione);
        }
        const docSel = document.getElementById("dottoreSelect");
        if (docSel) docSel.value = String(dottoreId);
    }, 150);
}

function apriModaleLoginStandard() {
    chiudiMenuMobile();
    const loginModal = document.getElementById('loginModal');
    const loginModalTitle = document.getElementById('loginModalTitle');
    const loginTypeGroup = document.getElementById('loginTypeGroup');
    const registerLinkContainer = document.getElementById('registerLinkContainer');
    const loginTypeSelect = document.getElementById('loginType');
    const loginErrorMsg = document.getElementById("loginErrorMsg");
    const loginIdentificativo = document.getElementById('loginIdentificativo');

    if (loginTypeSelect) {
        const adminOpt = loginTypeSelect.querySelector('option[value="admin"]');
        if (adminOpt) {
            adminOpt.remove();
        }
        loginTypeSelect.value = 'paziente';
    }

    if (loginModalTitle) loginModalTitle.textContent = "Accesso Area Riservata";
    if (loginTypeGroup) loginTypeGroup.style.display = 'block';
    if (registerLinkContainer) registerLinkContainer.style.display = 'block';

    if (loginIdentificativo) {
        loginIdentificativo.placeholder = "Codice Fiscale o Email";
    }

    if (loginErrorMsg) {
        loginErrorMsg.classList.add("hidden");
        loginErrorMsg.style.display = "none";
    }
    
    if (loginModal) {
        loginModal.classList.remove("hidden");
    }
}

function apriModaleLogin() {
    apriModaleLoginStandard();
}

function apriModaleCambioPassword() {
    chiudiMenuMobile();
    const errDiv = document.getElementById("changePasswordErrorMsg");
    if (errDiv) {
        errDiv.classList.add("hidden");
        errDiv.style.display = "none";
    }
    document.getElementById("formChangePassword").reset();
    document.getElementById("changePasswordModal").classList.remove("hidden");
}

async function effettuaCambioPassword(e) {
    e.preventDefault();
    const oldPassword = document.getElementById("oldPassword").value;
    const newPassword = document.getElementById("newPassword").value;
    const confirmNewPassword = document.getElementById("confirmNewPassword").value;
    const errDiv = document.getElementById("changePasswordErrorMsg");

    if (newPassword !== confirmNewPassword) {
        errDiv.textContent = "Le nuove password non coincidono.";
        errDiv.classList.remove("hidden");
        errDiv.style.display = "block";
        return;
    }

    let endpoint = `${API_URL}/pazienti/${utenteLoggato.id}/password`;
    if (utenteLoggato.ruolo === "admin") {
        endpoint = `${API_URL}/admin/${utenteLoggato.id}/password`;
    } else if (utenteLoggato.ruolo === "dottore") {
        endpoint = `${API_URL}/dottori/${utenteLoggato.id}/password`;
    }

    try {
        const res = await fetch(endpoint, {
            method: "PUT",
            headers: ottieniHeadersAuth({ "Content-Type": "application/json" }),
            body: JSON.stringify({
                old_password: oldPassword,
                new_password: newPassword
            })
        });

        if (res.ok) {
            document.getElementById("changePasswordModal").classList.add("hidden");
            mostraMessaggio("Password aggiornata con successo!");
        } else {
            const err = await res.json();
            errDiv.textContent = err.detail || "Errore durante il cambio password.";
            errDiv.classList.remove("hidden");
            errDiv.style.display = "block";
        }
    } catch (err) {
        errDiv.textContent = "Errore di connessione al server.";
        errDiv.classList.remove("hidden");
        errDiv.style.display = "block";
    }
}

function getBadgeHtml(stato) {
    const s = stato || 'In attesa di conferma';
    if (s === 'In attesa di conferma') {
        return `<span class="badge badge-warning">In attesa di conferma</span>`;
    } else if (s === 'Confermata') {
        return `<span class="badge badge-success">Confermata</span>`;
    } else if (s === 'Completata') {
        return `<span class="badge badge-info">Completata</span>`;
    } else if (s === 'Annullata') {
        return `<span class="badge badge-danger">Annullata</span>`;
    }
    return `<span class="badge badge-secondary">${s}</span>`;
}

function mostraVista(idVista) {
    chiudiMenuMobile();
    document.querySelectorAll(".view-section").forEach(sec => sec.classList.add("hidden"));
    const vistaTarget = document.getElementById(idVista);
    if (vistaTarget) {
        vistaTarget.classList.remove("hidden");
    }

    if (idVista !== 'view-register') {
        const alertAvviso = document.getElementById("alertAvvisoPrenotazione");
        if (alertAvviso) {
            alertAvviso.classList.add("hidden");
        }
    }

    if (idVista === 'view-booking') {
        caricaSpecializzazioniEDottoriBooking();
    }

    if (idVista === 'view-profile' && utenteLoggato && utenteLoggato.ruolo === 'paziente') {
        caricaMiePrenotazioni();
    }

    if (idVista === 'view-doctor' && utenteLoggato && utenteLoggato.ruolo === 'dottore') {
        mostraTabDottore('tab-doctor-agenda');
    }

    if (idVista === 'view-home-doctor' && utenteLoggato && utenteLoggato.ruolo === 'dottore') {
        caricaHomeDottore();
    }

    if (idVista === 'view-home-admin' && utenteLoggato && utenteLoggato.ruolo === 'admin') {
        caricaHomeAdmin();
    }
}

function gestisciAccessoPrenotazione() {
    chiudiMenuMobile();
    if (utenteLoggato) {
        mostraVista('view-booking');
    } else {
        apriModaleLoginStandard();
    }
}

async function caricaSpecializzazioniEDottoriBooking() {
    try {
        const res = await fetch(`${API_URL}/dottori/attivi`);
        if (!res.ok) return;
        listaDottoriAttiviBooking = await res.json();

        const specSelect = document.getElementById("specializzazioneSelect");
        const docSelect = document.getElementById("dottoreSelect");
        if (!specSelect || !docSelect) return;

        const specializzazioniUniche = Array.from(
            new Set(listaDottoriAttiviBooking.map(d => d.specializzazione).filter(Boolean))
        ).sort();

        specSelect.innerHTML = '<option value="">-- Seleziona Specializzazione --</option>';
        specializzazioniUniche.forEach(spec => {
            specSelect.innerHTML += `<option value="${spec}">${spec}</option>`;
        });

        filtraDottoriPerSpecializzazione("");
    } catch (err) {
        console.error("Errore caricamento branche mediche:", err);
    }
}

function filtraDottoriPerSpecializzazione(specializzazioneSelezionata) {
    const docSelect = document.getElementById("dottoreSelect");
    if (!docSelect) return;

    docSelect.innerHTML = '<option value="">-- Seleziona Medico --</option>';

    const filtrati = specializzazioneSelezionata
        ? listaDottoriAttiviBooking.filter(d => d.specializzazione === specializzazioneSelezionata)
        : listaDottoriAttiviBooking;

    filtrati.forEach(d => {
        docSelect.innerHTML += `<option value="${d.id}">Dr. ${d.nome} ${d.cognome} (${d.specializzazione})</option>`;
    });

    if (filtrati.length === 1 && specializzazioneSelezionata) {
        docSelect.value = String(filtrati[0].id);
    }
}

async function caricaHomeDottore() {
    if (!utenteLoggato || utenteLoggato.ruolo !== 'dottore') return;

    const titleEl = document.getElementById("doctorWelcomeTitle");
    const subEl = document.getElementById("doctorSpecializationSubtitle");
    if (titleEl) {
        titleEl.textContent = `Benvenuto/a, Dott. ${utenteLoggato.nome} ${utenteLoggato.cognome}`;
    }
    if (subEl) {
        subEl.textContent = `Specializzazione: ${utenteLoggato.specializzazione || 'Medicina Generale'} | Centro NexiHealth`;
    }

    try {
        const resVisite = await fetch(`${API_URL}/dottori/${utenteLoggato.id}/prenotazioni`, {
            headers: ottieniHeadersAuth()
        });
        const visite = resVisite.ok ? await resVisite.json() : [];

        let inAttesa = 0;
        let confermate = 0;
        let completate = 0;

        visite.forEach(v => {
            const s = v.stato || "In attesa di conferma";
            if (s === "In attesa di conferma") inAttesa++;
            else if (s === "Confermata") confermate++;
            else if (s === "Completata") completate++;
        });

        const resPazienti = await fetch(`${API_URL}/dottori/${utenteLoggato.id}/pazienti`, {
            headers: ottieniHeadersAuth()
        });
        const pazienti = resPazienti.ok ? await resPazienti.json() : [];

        const elAttesa = document.getElementById("kpiAttesa");
        const elConfermate = document.getElementById("kpiConfermate");
        const elCompletate = document.getElementById("kpiCompletate");
        const elPazienti = document.getElementById("kpiPazienti");

        if (elAttesa) elAttesa.textContent = inAttesa;
        if (elConfermate) elConfermate.textContent = confermate;
        if (elCompletate) elCompletate.textContent = completate;
        if (elPazienti) elPazienti.textContent = pazienti.length;

    } catch (err) {
        console.error("Errore KPI medico:", err);
    }
}

async function caricaHomeAdmin() {
    if (!utenteLoggato || utenteLoggato.ruolo !== 'admin') return;

    try {
        const authH = ottieniHeadersAuth();
        const [resPazienti, resDottori, resPrenotazioni] = await Promise.all([
            fetch(`${API_URL}/pazienti/`, { headers: authH }),
            fetch(`${API_URL}/dottori/`, { headers: authH }),
            fetch(`${API_URL}/prenotazioni/`, { headers: authH })
        ]);

        const pazienti = resPazienti.ok ? await resPazienti.json() : [];
        const dottori = resDottori.ok ? await resDottori.json() : [];
        const prenotazioni = resPrenotazioni.ok ? await resPrenotazioni.json() : [];

        let inAttesa = 0;
        prenotazioni.forEach(p => {
            if ((p.stato || "In attesa di conferma") === "In attesa di conferma") {
                inAttesa++;
            }
        });

        const elPazienti = document.getElementById("kpiAdminPazienti");
        const elDottori = document.getElementById("kpiAdminDottori");
        const elPrenotazioni = document.getElementById("kpiAdminPrenotazioni");
        const elInAttesa = document.getElementById("kpiAdminInAttesa");

        if (elPazienti) elPazienti.textContent = pazienti.length;
        if (elDottori) elDottori.textContent = dottori.length;
        if (elPrenotazioni) elPrenotazioni.textContent = prenotazioni.length;
        if (elInAttesa) elInAttesa.textContent = inAttesa;
    } catch (err) {
        console.error("Errore KPI admin:", err);
    }
}

async function effettuaLogin(e) {
    e.preventDefault();
    
    const loginErrorMsg = document.getElementById("loginErrorMsg");
    if (loginErrorMsg) {
        loginErrorMsg.classList.add("hidden");
        loginErrorMsg.style.display = "none";
    }

    const tipoUtente = document.getElementById("loginType").value;
    const credenziali = {
        identificativo: document.getElementById("loginIdentificativo").value.trim(),
        password: document.getElementById("loginPassword").value
    };

    let endpoint = `${API_URL}/login`;
    if (tipoUtente === "admin") {
        endpoint = `${API_URL}/admin/login`;
    } else if (tipoUtente === "dottore") {
        endpoint = `${API_URL}/dottori/login`;
    }

    try {
        const res = await fetch(endpoint, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(credenziali)
        });

        if (res.ok) {
            const data = await res.json();
            utenteLoggato = {
                ...data,
                ruolo: tipoUtente
            };
            
            document.getElementById("loginModal").classList.add("hidden");
            document.getElementById("formLogin").reset();
            
            aggiornaInterfacciaAuth();
            mostraMessaggio("Login effettuato con successo!");

            if (utenteLoggato.ruolo === 'admin') {
                mostraVista('view-home-admin');
                caricaPazientiAdmin();
                caricaPrenotazioniAdmin();
                caricaDottoriAdmin();
            } else if (utenteLoggato.ruolo === 'dottore') {
                mostraVista('view-home-doctor');
            } else {
                mostraVista('view-profile');
                await caricaMiePrenotazioni();
            }
        } else {
            const errData = await res.json();
            const messaggioErrore = errData.detail || "Credenziali non valide.";
            if (loginErrorMsg) {
                loginErrorMsg.textContent = messaggioErrore;
                loginErrorMsg.classList.remove("hidden");
                loginErrorMsg.style.display = "block";
            }
            mostraMessaggio(messaggioErrore, true);
        }
    } catch (err) {
        if (loginErrorMsg) {
            loginErrorMsg.textContent = "Impossibile contattare il server.";
            loginErrorMsg.classList.add("hidden");
            loginErrorMsg.style.display = "block";
        }
        mostraMessaggio("Impossibile contattare il server.", true);
    }
}

function aggiornaInterfacciaAuth() {
    const btnLoginModal = document.getElementById("btnLoginModal");
    const userMenu = document.getElementById("userMenu");
    const btnLoginModalMobile = document.getElementById("btnLoginModalMobile");
    const userMenuMobile = document.getElementById("userMenuMobile");

    const navRegister = document.getElementById("navRegister");
    const navProfile = document.getElementById("navProfile");
    const navAdmin = document.getElementById("navAdmin");
    const navDoctor = document.getElementById("navDoctor");
    const navBooking = document.getElementById("navBooking");
    const boxSelectPazienteAdmin = document.getElementById("boxSelectPazienteAdmin");
    const btnAdminLock = document.getElementById("btnAdminLock");
    const btnAdminLockMobile = document.getElementById("btnAdminLockMobile");

    if (utenteLoggato) {
        if (btnLoginModal) btnLoginModal.classList.add("hidden");
        if (btnLoginModalMobile) btnLoginModalMobile.classList.add("hidden");
        if (btnAdminLock) btnAdminLock.classList.add("hidden");
        if (btnAdminLockMobile) btnAdminLockMobile.classList.add("hidden");

        if (userMenu) userMenu.classList.remove("hidden");
        if (userMenuMobile) userMenuMobile.classList.remove("hidden");
        if (navRegister) navRegister.classList.add("hidden");

        const nomeMostrato = utenteLoggato.nome ? `${utenteLoggato.nome} ${utenteLoggato.cognome || ''}` : utenteLoggato.username || "Utente";
        const displayDesktop = document.getElementById("userNameDisplay");
        const displayMobile = document.getElementById("userNameDisplayMobile");
        if (displayDesktop) displayDesktop.textContent = nomeMostrato;
        if (displayMobile) displayMobile.textContent = nomeMostrato;

        if (navAdmin) navAdmin.classList.add("hidden");
        if (navProfile) navProfile.classList.add("hidden");
        if (navDoctor) navDoctor.classList.add("hidden");
        if (boxSelectPazienteAdmin) boxSelectPazienteAdmin.classList.add("hidden");

        if (utenteLoggato.ruolo === 'admin') {
            if (navAdmin) navAdmin.classList.remove("hidden");
            if (boxSelectPazienteAdmin) boxSelectPazienteAdmin.classList.remove("hidden");
            if (navBooking) navBooking.classList.add("hidden");
        } else if (utenteLoggato.ruolo === 'dottore') {
            if (navDoctor) navDoctor.classList.remove("hidden");
            if (navBooking) navBooking.classList.add("hidden");
        } else {
            if (navProfile) navProfile.classList.remove("hidden");
            if (navBooking) navBooking.classList.remove("hidden");
        }
    } else {
        if (btnLoginModal) btnLoginModal.classList.remove("hidden");
        if (btnLoginModalMobile) btnLoginModalMobile.classList.remove("hidden");
        if (btnAdminLock) btnAdminLock.classList.remove("hidden");
        if (btnAdminLockMobile) btnAdminLockMobile.classList.remove("hidden");

        if (userMenu) userMenu.classList.add("hidden");
        if (userMenuMobile) userMenuMobile.classList.add("hidden");
        if (navRegister) navRegister.classList.remove("hidden");
        if (navProfile) navProfile.classList.add("hidden");
        if (navAdmin) navAdmin.classList.add("hidden");
        if (navDoctor) navDoctor.classList.add("hidden");
        if (navBooking) navBooking.classList.remove("hidden");
        if (boxSelectPazienteAdmin) boxSelectPazienteAdmin.classList.add("hidden");
    }
}

function effettuaLogout() {
    chiudiMenuMobile();
    utenteLoggato = null;
    aggiornaInterfacciaAuth();
    mostraMessaggio("Logout effettuato.");
    navigaHome();
}

function mostraMessaggio(testo, isErrore = false) {
    const msgDiv = document.getElementById("msg");
    if (!msgDiv) return;
    msgDiv.textContent = testo;
    msgDiv.className = isErrore ? "alert alert-error" : "alert alert-success";
    msgDiv.classList.remove("hidden");
    setTimeout(() => { msgDiv.classList.add("hidden"); }, 4000);
}

async function registraPaziente(e) {
    e.preventDefault();
    const errBox = document.getElementById("registerErrorMsg");
    if (errBox) {
        errBox.classList.add("hidden");
        errBox.textContent = "";
    }

    const dati = {
        nome: document.getElementById("nome").value.trim(),
        cognome: document.getElementById("cognome").value.trim(),
        codice_fiscale: document.getElementById("cf").value.trim().toUpperCase(),
        email: document.getElementById("email").value.trim().toLowerCase(),
        telefono: document.getElementById("telefono").value.trim(),
        password: document.getElementById("password").value
    };

    try {
        const res = await fetch(`${API_URL}/pazienti/`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(dati)
        });

        if (res.ok) {
            mostraMessaggio("Registrazione completata! Ora puoi effettuare il login.");
            document.getElementById("formPaziente").reset();
            apriModaleLoginStandard();
        } else {
            const err = await res.json();
            const msgErrore = err.detail || "Errore nella registrazione del paziente.";
            if (errBox) {
                errBox.textContent = msgErrore;
                errBox.classList.remove("hidden");
            }
            mostraMessaggio(msgErrore, true);
        }
    } catch (err) {
        if (errBox) {
            errBox.textContent = "Errore di connessione al server.";
            errBox.classList.remove("hidden");
        }
        mostraMessaggio("Errore di connessione al server.", true);
    }
}

async function creaPrenotazione(e) {
    e.preventDefault();

    let idPaziente = utenteLoggato ? utenteLoggato.id : null;
    
    if (utenteLoggato && utenteLoggato.ruolo === 'admin') {
        const sel = document.getElementById("pazienteSelect");
        if (sel.value) idPaziente = parseInt(sel.value);
    }

    const dottoreSelect = document.getElementById("dottoreSelect");
    const dottoreIdVal = parseInt(dottoreSelect.value);
    const specSelect = document.getElementById("specializzazioneSelect");
    const specializzazioneVal = specSelect ? specSelect.value.trim() : "";

    if (!specializzazioneVal) {
        mostraMessaggio("Seleziona una specializzazione valida.", true);
        return;
    }
    if (!dottoreIdVal) {
        mostraMessaggio("Seleziona un medico per la visita.", true);
        return;
    }

    const dati = {
        paziente_id: idPaziente,
        specializzazione: specializzazioneVal,
        dottore_id: dottoreIdVal,
        data_ora: document.getElementById("dataOra").value,
        note: document.getElementById("note").value || null,
        stato: "In attesa di conferma"
    };

    try {
        const res = await fetch(`${API_URL}/prenotazioni/`, {
            method: "POST",
            headers: ottieniHeadersAuth({ "Content-Type": "application/json" }),
            body: JSON.stringify(dati)
        });

        if (res.ok) {
            mostraMessaggio("Prenotazione registrata! In attesa di conferma dal medico.");
            document.getElementById("formPrenotazione").reset();
            
            if (utenteLoggato.ruolo === 'admin') {
                mostraVista('view-admin');
                caricaPrenotazioniAdmin();
            } else {
                mostraVista('view-profile');
                caricaMiePrenotazioni();
            }
        } else {
            const err = await res.json();
            mostraMessaggio(err.detail || "Errore durante la prenotazione.", true);
        }
    } catch (err) {
        mostraMessaggio("Errore di connessione.", true);
    }
}

async function caricaMiePrenotazioni() {
    if (!utenteLoggato) return;
    try {
        const res = await fetch(`${API_URL}/pazienti/${utenteLoggato.id}/prenotazioni`, {
            headers: ottieniHeadersAuth()
        });

        if (!res.ok) {
            const errData = await res.json();
            mostraMessaggio(errData.detail || "Errore caricamento prenotazioni.", true);
            return;
        }

        const prenotazioni = await res.json();
        const tbody = document.querySelector("#tabellaMiePrenotazioni tbody");
        if (!tbody) return;
        
        tbody.innerHTML = "";

        if (prenotazioni.length === 0) {
            tbody.innerHTML = '<tr><td colspan="6">Nessuna prenotazione trovata.</td></tr>';
            inizializzaFiltriTabella("tabellaMiePrenotazioni");
            return;
        }

        prenotazioni.forEach(p => {
            tbody.innerHTML += `
                <tr>
                    <td>${p.id}</td>
                    <td>${p.specializzazione}</td>
                    <td>${p.dottore_id}</td>
                    <td>${new Date(p.data_ora).toLocaleString('it-IT')}</td>
                    <td>${getBadgeHtml(p.stato)}</td>
                    <td>${p.note || '-'}</td>
                </tr>
            `;
        });

        inizializzaFiltriTabella("tabellaMiePrenotazioni");
    } catch (err) {
        mostraMessaggio("Errore caricamento prenotazioni.", true);
    }
}

function mostraTabAdmin(tabId) {
    document.querySelectorAll(".admin-tab-content").forEach(tab => tab.classList.add("hidden"));
    document.querySelectorAll("#view-admin .tab-btn").forEach(btn => btn.classList.remove("active"));
    
    const targetTab = document.getElementById(tabId);
    if (targetTab) targetTab.classList.remove("hidden");

    const mapTabBtn = {
        'tab-pazienti': 'btnTabAdminPazienti',
        'tab-prenotazioni': 'btnTabAdminPrenotazioni',
        'tab-dottori': 'btnTabAdminDottori',
        'tab-vetrina-gestione': 'btnTabAdminVetrina'
    };

    const targetBtnId = mapTabBtn[tabId];
    if (targetBtnId) {
        document.getElementById(targetBtnId)?.classList.add("active");
    }

    if (tabId === 'tab-pazienti') caricaPazientiAdmin();
    if (tabId === 'tab-prenotazioni') caricaPrenotazioniAdmin();
    if (tabId === 'tab-dottori') caricaDottoriAdmin();
    if (tabId === 'tab-vetrina-gestione') caricaFormGestioneVetrinaAdmin();
}

async function caricaPazientiAdmin() {
    if (!utenteLoggato || utenteLoggato.ruolo !== 'admin') return;
    try {
        const res = await fetch(`${API_URL}/pazienti/`, {
            headers: ottieniHeadersAuth()
        });
        
        listaPazientiCache = await res.json();

        const tbody = document.querySelector("#tabellaPazienti tbody");
        const selectPaziente = document.getElementById("pazienteSelect");
        
        tbody.innerHTML = "";
        if (selectPaziente) selectPaziente.innerHTML = '<option value="">-- Seleziona Paziente --</option>';

        listaPazientiCache.forEach(p => {
            tbody.innerHTML += `
                <tr>
                    <td>${p.id}</td>
                    <td>
                        <a href="javascript:void(0)" class="table-link" onclick="apriDettaglioPaziente(${p.id})">
                            ${p.nome} ${p.cognome}
                        </a>
                    </td>
                    <td>${p.codice_fiscale}</td>
                    <td>${p.email}</td>
                    <td>${p.telefono}</td>
                    <td>
                        <div class="action-buttons">
                            <button class="btn-info" onclick="apriDettaglioPaziente(${p.id})">Dettagli</button>
                            <button class="btn-secondary" onclick="apriModificaPaziente(${p.id})">Modifica</button>
                            <button class="btn-danger" onclick="richiediConfermaEliminazionePaziente(${p.id})">Elimina</button>
                        </div>
                    </td>
                </tr>
            `;

            if (selectPaziente) selectPaziente.innerHTML += `<option value="${p.id}">${p.nome} ${p.cognome} (ID: ${p.id})</option>`;
        });

        inizializzaFiltriTabella("tabellaPazienti");
    } catch (err) {
        mostraMessaggio("Errore caricamento lista pazienti.", true);
    }
}

function apriModalNuovoPazienteAdmin() {
    mostraVista('view-register');
}

function apriModificaPaziente(id) {
    const p = listaPazientiCache.find(item => item.id === id);
    if (!p) return;

    const errBox = document.getElementById("editPazienteErrorMsg");
    if (errBox) {
        errBox.classList.add("hidden");
        errBox.textContent = "";
    }

    document.getElementById("editPazienteId").value = p.id;
    document.getElementById("editNome").value = p.nome;
    document.getElementById("editCognome").value = p.cognome;
    document.getElementById("editCf").value = p.codice_fiscale;
    document.getElementById("editEmail").value = p.email;
    document.getElementById("editTelefono").value = p.telefono;

    document.getElementById("editPazienteModal").classList.remove("hidden");
}

async function salvaModificaPaziente(e) {
    e.preventDefault();
    const id = document.getElementById("editPazienteId").value;
    const errBox = document.getElementById("editPazienteErrorMsg");
    if (errBox) {
        errBox.classList.add("hidden");
        errBox.textContent = "";
    }

    const dati = {
        nome: document.getElementById("editNome").value.trim(),
        cognome: document.getElementById("editCognome").value.trim(),
        codice_fiscale: document.getElementById("editCf").value.trim().toUpperCase(),
        email: document.getElementById("editEmail").value.trim().toLowerCase(),
        telefono: document.getElementById("editTelefono").value.trim()
    };

    try {
        const res = await fetch(`${API_URL}/pazienti/${id}`, {
            method: "PUT",
            headers: ottieniHeadersAuth({ "Content-Type": "application/json" }),
            body: JSON.stringify(dati)
        });

        if (res.ok) {
            document.getElementById("editPazienteModal").classList.add("hidden");
            mostraMessaggio("Dati paziente aggiornati con successo!");
            caricaPazientiAdmin();
        } else {
            const err = await res.json();
            const msgErrore = err.detail || "Errore aggiornamento paziente.";
            if (errBox) {
                errBox.textContent = msgErrore;
                errBox.classList.remove("hidden");
            }
            mostraMessaggio(msgErrore, true);
        }
    } catch (err) {
        mostraMessaggio("Errore di connessione.", true);
    }
}

async function apriDettaglioPaziente(id) {
    const p = listaPazientiCache.find(item => item.id === id);
    if (!p) return;

    const infoDiv = document.getElementById("dettaglioInfoPazientePage");
    infoDiv.innerHTML = `
        <p><strong>ID Paziente:</strong> ${p.id}</p>
        <p><strong>Nome e Cognome:</strong> ${p.nome} ${p.cognome}</p>
        <p><strong>Codice Fiscale:</strong> ${p.codice_fiscale}</p>
        <p><strong>Email:</strong> ${p.email}</p>
        <p><strong>Telefono:</strong> ${p.telefono}</p>
    `;

    try {
        const res = await fetch(`${API_URL}/pazienti/${id}/prenotazioni`, {
            headers: ottieniHeadersAuth()
        });
        const prenotazioni = await res.json();
        const tbody = document.querySelector("#tabellaDettaglioPrenotazioniPage tbody");
        tbody.innerHTML = "";

        if (prenotazioni.length === 0) {
            tbody.innerHTML = '<tr><td colspan="6">Nessuna prenotazione trovata per questo paziente.</td></tr>';
        } else {
            prenotazioni.forEach(pr => {
                tbody.innerHTML += `
                    <tr>
                        <td>${pr.id}</td>
                        <td>${pr.specializzazione}</td>
                        <td>${pr.dottore_id}</td>
                        <td>${new Date(pr.data_ora).toLocaleString('it-IT')}</td>
                        <td>${getBadgeHtml(pr.stato)}</td>
                        <td>${pr.note || '-'}</td>
                    </tr>
                `;
            });
        }

        mostraVista('view-dettaglio-paziente');
        inizializzaFiltriTabella("tabellaDettaglioPrenotazioniPage");
    } catch (err) {
        mostraMessaggio("Errore caricamento dettagli prenotazioni.", true);
    }
}

async function caricaPrenotazioniAdmin() {
    if (!utenteLoggato || utenteLoggato.ruolo !== 'admin') return;
    try {
        const res = await fetch(`${API_URL}/prenotazioni/`, {
            headers: ottieniHeadersAuth()
        });
        listaPrenotazioniCache = await res.json();

        const tbody = document.querySelector("#tabellaPrenotazioni tbody");
        tbody.innerHTML = "";

        if (listaPrenotazioniCache.length === 0) {
            tbody.innerHTML = '<tr><td colspan="8">Nessuna prenotazione trovata.</td></tr>';
            inizializzaFiltriTabella("tabellaPrenotazioni");
            return;
        }

        listaPrenotazioniCache.forEach(p => {
            const nomePaziente = (p.paziente && p.paziente.nome)
                ? `${p.paziente.nome} ${p.paziente.cognome}`
                : `Paziente #${p.paziente_id}`;

            tbody.innerHTML += `
                <tr>
                    <td>${p.id}</td>
                    <td>
                        <a href="javascript:void(0)" class="table-link" onclick="apriDettaglioPaziente(${p.paziente_id})">
                            ${nomePaziente}
                        </a>
                    </td>
                    <td>${p.specializzazione}</td>
                    <td>${p.dottore_id}</td>
                    <td>${new Date(p.data_ora).toLocaleString('it-IT')}</td>
                    <td>${getBadgeHtml(p.stato)}</td>
                    <td>${p.note || '-'}</td>
                    <td>
                        <div class="action-buttons">
                            <button class="btn-secondary" onclick="apriModificaPrenotazione(${p.id})">Modifica</button>
                            <button class="btn-danger" onclick="eliminaPrenotazioneAdmin(${p.id})">Annulla</button>
                        </div>
                    </td>
                </tr>
            `;
        });

        inizializzaFiltriTabella("tabellaPrenotazioni");
    } catch (err) {
        mostraMessaggio("Errore caricamento lista prenotazioni.", true);
    }
}

function apriModificaPrenotazione(id) {
    const pr = listaPrenotazioniCache.find(item => item.id === id);
    if (!pr) return;

    document.getElementById("editPrenotazioneId").value = pr.id;
    document.getElementById("editPrenotazionePazienteId").value = pr.paziente_id;
    document.getElementById("editDottoreId").value = pr.dottore_id;

    const doc = listaDottoriCache.find(d => d.id === pr.dottore_id);
    const nomeDottore = doc ? `Dr. ${doc.nome} ${doc.cognome}` : `Dottore ID: ${pr.dottore_id}`;
    document.getElementById("editDottoreNomeCompleto").value = nomeDottore;

    document.getElementById("editSpecializzazione").value = pr.specializzazione;
    
    const d = new Date(pr.data_ora);
    const pad = (num) => String(num).padStart(2, '0');
    const formattedDate = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
    document.getElementById("editDataOra").value = formattedDate;

    const selectStato = document.getElementById("editStatoPrenotazione");
    if (selectStato) {
        selectStato.value = pr.stato || "In attesa di conferma";
    }
    
    document.getElementById("editNote").value = pr.note || "";

    document.getElementById("editPrenotazioneModal").classList.remove("hidden");
}

async function apriModificaPrenotazioneDottore(id) {
    try {
        const res = await fetch(`${API_URL}/prenotazioni/${id}`, {
            headers: ottieniHeadersAuth()
        });
        if (!res.ok) throw new Error("Errore recupero prenotazione");
        const pr = await res.json();

        document.getElementById("editPrenotazioneId").value = pr.id;
        document.getElementById("editPrenotazionePazienteId").value = pr.paziente_id;
        document.getElementById("editDottoreId").value = pr.dottore_id;

        const nomeDottore = utenteLoggato.nome ? `Dr. ${utenteLoggato.nome} ${utenteLoggato.cognome || ''}` : `Dottore ID: ${pr.dottore_id}`;
        document.getElementById("editDottoreNomeCompleto").value = nomeDottore;

        document.getElementById("editSpecializzazione").value = pr.specializzazione;

        const d = new Date(pr.data_ora);
        const pad = (num) => String(num).padStart(2, '0');
        const formattedDate = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
        document.getElementById("editDataOra").value = formattedDate;

        const selectStato = document.getElementById("editStatoPrenotazione");
        if (selectStato) {
            selectStato.value = pr.stato || "In attesa di conferma";
        }

        document.getElementById("editNote").value = pr.note || "";
        document.getElementById("editPrenotazioneModal").classList.remove("hidden");
    } catch (err) {
        mostraMessaggio("Impossibile aprire la modifica prenotazione.", true);
    }
}

async function salvaModificaPrenotazione(e) {
    e.preventDefault();
    const id = document.getElementById("editPrenotazioneId").value;
    const selectStato = document.getElementById("editStatoPrenotazione");

    const dati = {
        paziente_id: parseInt(document.getElementById("editPrenotazionePazienteId").value),
        specializzazione: document.getElementById("editSpecializzazione").value,
        dottore_id: parseInt(document.getElementById("editDottoreId").value),
        data_ora: document.getElementById("editDataOra").value,
        stato: selectStato ? selectStato.value : undefined,
        note: document.getElementById("editNote").value || null
    };

    try {
        const res = await fetch(`${API_URL}/prenotazioni/${id}`, {
            method: "PUT",
            headers: ottieniHeadersAuth({ "Content-Type": "application/json" }),
            body: JSON.stringify(dati)
        });

        if (res.ok) {
            document.getElementById("editPrenotazioneModal").classList.add("hidden");
            mostraMessaggio("Prenotazione aggiornata con successo!");

            if (utenteLoggato.ruolo === 'admin') {
                caricaPrenotazioniAdmin();
            } else if (utenteLoggato.ruolo === 'dottore') {
                caricaAgendaDottore();
                const dettaglioVisibile = !document.getElementById("view-dettaglio-paziente-dottore").classList.contains("hidden");
                if (dettaglioVisibile) {
                    const infoDiv = document.getElementById("dettaglioInfoPazienteDottorePage");
                    const idMatch = infoDiv?.innerText.match(/ID Paziente:\s*(\d+)/);
                    if (idMatch && idMatch[1]) {
                        apriDettaglioPazienteDottore(parseInt(idMatch[1]));
                    }
                }
            }
        } else {
            const err = await res.json();
            mostraMessaggio(err.detail || "Errore aggiornamento prenotazione.", true);
        }
    } catch (err) {
        mostraMessaggio("Errore di connessione.", true);
    }
}

function richiediConfermaEliminazionePaziente(id) {
    idPazienteDaEliminare = id;
    document.getElementById("confirmDeleteModal").classList.remove("hidden");
}

function chiudiModalConfermaEliminazione() {
    idPazienteDaEliminare = null;
    document.getElementById("confirmDeleteModal").classList.add("hidden");
}

async function eseguiEliminazionePazienteConfermata() {
    if (!idPazienteDaEliminare) return;
    try {
        const res = await fetch(`${API_URL}/pazienti/${idPazienteDaEliminare}`, {
            method: "DELETE",
            headers: ottieniHeadersAuth()
        });
        if (res.ok) {
            chiudiModalConfermaEliminazione();
            mostraMessaggio("Paziente e relative prenotazioni eliminate permanentemente.");
            caricaPazientiAdmin();
            caricaPrenotazioniAdmin();
        } else {
            const err = await res.json();
            mostraMessaggio(err.detail || "Errore durante l'eliminazione.", true);
        }
    } catch (err) {
        mostraMessaggio("Errore di connessione durante l'eliminazione.", true);
    }
}

async function eliminaPrenotazioneAdmin(id) {
    if (!confirm("Sei sicuro di voler cancellare questa prenotazione?")) return;
    try {
        const res = await fetch(`${API_URL}/prenotazioni/${id}`, {
            method: "DELETE",
            headers: ottieniHeadersAuth()
        });
        if (res.ok) {
            mostraMessaggio("Prenotazione annullata.");
            caricaPrenotazioniAdmin();
        }
    } catch (err) {
        mostraMessaggio("Errore durante la cancellazione.", true);
    }
}

async function caricaDottoriAdmin() {
    if (!utenteLoggato || utenteLoggato.ruolo !== 'admin') return;
    try {
        const res = await fetch(`${API_URL}/dottori/`, {
            headers: ottieniHeadersAuth()
        });
        
        listaDottoriCache = await res.json();
        const tbody = document.querySelector("#tabellaDottori tbody");
        if (!tbody) return;

        tbody.innerHTML = "";

        if (listaDottoriCache.length === 0) {
            tbody.innerHTML = '<tr><td colspan="6">Nessun dottore trovato.</td></tr>';
            inizializzaFiltriTabella("tabellaDottori");
            return;
        }

        listaDottoriCache.forEach(d => {
            tbody.innerHTML += `
                <tr>
                    <td>${d.id}</td>
                    <td>${d.nome} ${d.cognome}</td>
                    <td>${d.specializzazione || '-'}</td>
                    <td>${d.email}</td>
                    <td>${d.telefono || '-'}</td>
                    <td>
                        <div class="action-buttons">
                            <button class="btn-info" onclick="apriDettaglioDottore(${d.id})">Dettagli</button>
                            <button class="btn-secondary" onclick="apriModificaDottore(${d.id})">Modifica</button>
                            <button class="btn-danger" onclick="eliminaDottoreAdmin(${d.id})">Elimina</button>
                        </div>
                    </td>
                </tr>
            `;
        });

        inizializzaFiltriTabella("tabellaDottori");
    } catch (err) {
        mostraMessaggio("Errore caricamento lista dottori.", true);
    }
}

function apriModalNuovoDottoreAdmin() {
    const errBox = document.getElementById("editDottoreErrorMsg");
    if (errBox) {
        errBox.classList.add("hidden");
        errBox.textContent = "";
    }

    const form = document.getElementById("formEditDottore");
    if (form) form.reset();

    const idInput = document.getElementById("editDottoreId");
    if (idInput) idInput.value = "";

    const titleEl = document.getElementById("titleEditDottoreModal");
    if (titleEl) titleEl.textContent = "Nuovo Dottore";

    const pwdInput = document.getElementById("editDottorePassword");
    if (pwdInput) pwdInput.required = true;

    const modal = document.getElementById("editDottoreModal");
    if (modal) modal.classList.remove("hidden");
}

function apriModificaDottore(id) {
    const d = listaDottoriCache.find(item => item.id === id);
    if (!d) return;

    const errBox = document.getElementById("editDottoreErrorMsg");
    if (errBox) {
        errBox.classList.add("hidden");
        errBox.textContent = "";
    }

    const form = document.getElementById("formEditDottore");
    if (form) {
        const idInput = form.querySelector("#editDottoreId") || document.getElementById("editDottoreId");
        const nomeInput = form.querySelector("#editDottoreNome") || document.getElementById("editDottoreNome");
        const cognomeInput = form.querySelector("#editDottoreCognome") || document.getElementById("editDottoreCognome");
        const cfInput = form.querySelector("#editDottoreCf") || document.getElementById("editDottoreCf");
        const specInput = form.querySelector("#editDottoreSpecializzazione") || document.getElementById("editDottoreSpecializzazione");
        const emailInput = form.querySelector("#editDottoreEmail") || document.getElementById("editDottoreEmail");
        const telInput = form.querySelector("#editDottoreTelefono") || document.getElementById("editDottoreTelefono");
        const pwdInput = form.querySelector("#editDottorePassword") || document.getElementById("editDottorePassword");

        if (idInput) idInput.value = d.id;
        if (nomeInput) nomeInput.value = d.nome || "";
        if (cognomeInput) cognomeInput.value = d.cognome || "";
        if (cfInput) cfInput.value = d.codice_fiscale || "";
        if (specInput) specInput.value = d.specializzazione || "";
        if (emailInput) emailInput.value = d.email || "";
        if (telInput) telInput.value = d.telefono || "";
        if (pwdInput) {
            pwdInput.value = "";
            pwdInput.required = false;
        }
    }

    const titleEl = document.getElementById("titleEditDottoreModal");
    if (titleEl) titleEl.textContent = "Modifica Dottore";

    const modal = document.getElementById("editDottoreModal");
    if (modal) modal.classList.remove("hidden");
}

async function apriDettaglioDottore(dottoreId) {
    if (!utenteLoggato) return;
    try {
        const response = await fetch(`${API_URL}/dottori/${dottoreId}/dettaglio`, {
            headers: ottieniHeadersAuth()
        });
        
        if (!response.ok) throw new Error("Errore recupero dettagli medico");
        
        const data = await response.json();
        
        const infoDiv = document.getElementById("dettaglioInfoMedicoPage");
        if (infoDiv) {
            infoDiv.innerHTML = `
                <p><strong>ID Dottore:</strong> ${data.dottore.id}</p>
                <p><strong>Nome e Cognome:</strong> ${data.dottore.nome} ${data.dottore.cognome}</p>
                <p><strong>Specializzazione:</strong> ${data.dottore.specializzazione}</p>
                <p><strong>Codice Fiscale:</strong> ${data.dottore.codice_fiscale || '-'}</p>
                <p><strong>Email:</strong> ${data.dottore.email || '-'}</p>
                <p><strong>Telefono:</strong> ${data.dottore.telefono || '-'}</p>
            `;
        }
        
        const tbody = document.querySelector("#tabellaDettaglioPrenotazioniMedicoPage tbody");
        if (tbody) {
            tbody.innerHTML = '';
            if (data.prenotazioni && data.prenotazioni.length > 0) {
                data.prenotazioni.forEach(p => {
                    tbody.innerHTML += `
                        <tr>
                            <td>${p.id}</td>
                            <td>${p.paziente_id}</td>
                            <td>${p.specializzazione}</td>
                            <td>${new Date(p.data_ora).toLocaleString('it-IT')}</td>
                            <td>${getBadgeHtml(p.stato)}</td>
                            <td>${p.note || '-'}</td>
                        </tr>
                    `;
                });
            } else {
                tbody.innerHTML = '<tr><td colspan="6">Nessun appuntamento trovato per questo medico.</td></tr>';
            }
        }
        
        mostraVista('view-dettaglio-medico');
        inizializzaFiltriTabella("tabellaDettaglioPrenotazioniMedicoPage");
    } catch (error) {
        console.error(error);
        mostraMessaggio("Impossibile caricare i dettagli del medico.", true);
    }
}

async function salvaDottoreAdmin(e) {
    if (e && e.preventDefault) e.preventDefault();
    if (!utenteLoggato || utenteLoggato.ruolo !== 'admin') {
        mostraMessaggio("Sessione non autorizzata.", true);
        return;
    }

    const errBox = document.getElementById("editDottoreErrorMsg");
    if (errBox) {
        errBox.classList.add("hidden");
        errBox.textContent = "";
    }

    const form = document.getElementById("formEditDottore");
    if (!form) return;

    const idInput = form.querySelector("#editDottoreId") || document.getElementById("editDottoreId");
    const nomeInput = form.querySelector("#editDottoreNome") || document.getElementById("editDottoreNome");
    const cognomeInput = form.querySelector("#editDottoreCognome") || document.getElementById("editDottoreCognome");
    const cfInput = form.querySelector("#editDottoreCf") || document.getElementById("editDottoreCf");
    const specInput = form.querySelector("#editDottoreSpecializzazione") || document.getElementById("editDottoreSpecializzazione");
    const emailInput = form.querySelector("#editDottoreEmail") || document.getElementById("editDottoreEmail");
    const telInput = form.querySelector("#editDottoreTelefono") || document.getElementById("editDottoreTelefono");
    const pwdInput = form.querySelector("#editDottorePassword") || document.getElementById("editDottorePassword");

    const id = idInput ? idInput.value.trim() : "";
    const isEdit = id !== "";

    const dati = {
        nome: nomeInput ? nomeInput.value.trim() : "",
        cognome: cognomeInput ? cognomeInput.value.trim() : "",
        codice_fiscale: cfInput ? cfInput.value.trim().toUpperCase() : "",
        specializzazione: specInput ? specInput.value.trim() : "",
        email: emailInput ? emailInput.value.trim().toLowerCase() : "",
        telefono: telInput ? telInput.value.trim() : ""
    };

    const passwordVal = pwdInput ? pwdInput.value : "";
    if (!isEdit || passwordVal) {
        dati.password = passwordVal || "Dottore123!";
    }

    const endpoint = isEdit ? `${API_URL}/dottori/${id}` : `${API_URL}/dottori/`;
    const method = isEdit ? "PUT" : "POST";

    try {
        const res = await fetch(endpoint, {
            method: method,
            headers: ottieniHeadersAuth({ "Content-Type": "application/json" }),
            body: JSON.stringify(dati)
        });

        if (res.ok) {
            document.getElementById("editDottoreModal").classList.add("hidden");
            mostraMessaggio(isEdit ? "Dottore aggiornato con successo!" : "Dottore creato con successo!");
            caricaDottoriAdmin();
            caricaVetrinaDottoriHome();
            caricaRepartiVetrinaHome();
        } else {
            const err = await res.json();
            const msgErrore = err.detail || "Errore durante il salvataggio del dottore.";
            if (errBox) {
                errBox.textContent = msgErrore;
                errBox.classList.remove("hidden");
            }
            mostraMessaggio(msgErrore, true);
        }
    } catch (err) {
        if (errBox) {
            errBox.textContent = "Errore di connessione al server.";
            errBox.classList.remove("hidden");
        }
        mostraMessaggio("Errore di connessione al server.", true);
    }
}

async function eliminaDottoreAdmin(id) {
    if (!confirm("Sei sicuro di voler eliminare questo dottore?")) return;
    try {
        const res = await fetch(`${API_URL}/dottori/${id}`, {
            method: "DELETE",
            headers: ottieniHeadersAuth()
        });
        if (res.ok) {
            mostraMessaggio("Dottore eliminato con successo.");
            caricaDottoriAdmin();
            caricaVetrinaDottoriHome();
            caricaRepartiVetrinaHome();
        } else {
            const err = await res.json();
            mostraMessaggio(err.detail || "Errore durante l'eliminazione.", true);
        }
    } catch (err) {
        mostraMessaggio("Errore di connessione.", true);
    }
}

function mostraTabDottore(tabId) {
    document.querySelectorAll(".doctor-tab-content").forEach(tab => tab.classList.add("hidden"));
    document.querySelectorAll("#view-doctor .tab-btn").forEach(btn => btn.classList.remove("active"));

    const targetTab = document.getElementById(tabId);
    if (targetTab) targetTab.classList.remove("hidden");

    if (tabId === 'tab-doctor-agenda') {
        document.getElementById("btnTabDoctorAgenda")?.classList.add("active");
        caricaAgendaDottore();
    } else if (tabId === 'tab-doctor-pazienti') {
        document.getElementById("btnTabDoctorPazienti")?.classList.add("active");
        caricaPazientiDottore();
    }
}

async function caricaAgendaDottore() {
    if (!utenteLoggato || utenteLoggato.ruolo !== 'dottore') return;
    try {
        const res = await fetch(`${API_URL}/dottori/${utenteLoggato.id}/prenotazioni`, {
            headers: ottieniHeadersAuth()
        });
        
        const prenotazioni = await res.json();
        const tbody = document.querySelector("#tabellaAgendaDottore tbody");
        if (!tbody) return;

        tbody.innerHTML = "";

        if (prenotazioni.length === 0) {
            tbody.innerHTML = '<tr><td colspan="7">Nessuna visita in agenda.</td></tr>';
            inizializzaFiltriTabella("tabellaAgendaDottore");
            return;
        }

        prenotazioni.forEach(p => {
            let azioniHtml = '';
            const stato = p.stato || 'In attesa di conferma';

            if (stato === 'In attesa di conferma') {
                azioniHtml = `
                    <button class="btn-success" onclick="cambiaStatoVisita(${p.id}, 'Confermata')">Conferma</button>
                    <button class="btn-secondary" onclick="apriModificaPrenotazioneDottore(${p.id})">Modifica</button>
                    <button class="btn-danger" onclick="cambiaStatoVisita(${p.id}, 'Annullata')">Rifiuta</button>
                `;
            } else if (stato === 'Confermata') {
                azioniHtml = `
                    <button class="btn-primary" onclick="cambiaStatoVisita(${p.id}, 'Completata')">Completata</button>
                    <button class="btn-secondary" onclick="apriModificaPrenotazioneDottore(${p.id})">Modifica</button>
                    <button class="btn-danger" onclick="cambiaStatoVisita(${p.id}, 'Annullata')">Annulla</button>
                `;
            } else {
                azioniHtml = `
                    <button class="btn-warning" onclick="cambiaStatoVisita(${p.id}, 'Confermata')">Ripristina</button>
                `;
            }

            const nomePaziente = (p.paziente && p.paziente.nome) 
                ? `${p.paziente.nome} ${p.paziente.cognome}` 
                : `Paziente #${p.paziente_id}`;

            tbody.innerHTML += `
                <tr>
                    <td>${p.id}</td>
                    <td>
                        <a href="javascript:void(0)" class="table-link" onclick="apriDettaglioPazienteDottore(${p.paziente_id})">
                            ${nomePaziente}
                        </a>
                    </td>
                    <td>${p.specializzazione}</td>
                    <td>${new Date(p.data_ora).toLocaleString('it-IT')}</td>
                    <td>${getBadgeHtml(p.stato)}</td>
                    <td>${p.note || '-'}</td>
                    <td>
                        <div class="action-buttons">
                            ${azioniHtml}
                        </div>
                    </td>
                </tr>
            `;
        });

        inizializzaFiltriTabella("tabellaAgendaDottore");
    } catch (err) {
        mostraMessaggio("Errore agenda medica.", true);
    }
}

async function caricaPazientiDottore() {
    if (!utenteLoggato || utenteLoggato.ruolo !== 'dottore') return;
    try {
        const res = await fetch(`${API_URL}/dottori/${utenteLoggato.id}/pazienti`, {
            headers: ottieniHeadersAuth()
        });
        
        const pazienti = await res.json();
        const tbody = document.querySelector("#tabellaPazientiDottore tbody");
        if (!tbody) return;

        tbody.innerHTML = "";

        if (pazienti.length === 0) {
            tbody.innerHTML = '<tr><td colspan="6">Nessun paziente associato a questo profilo medico.</td></tr>';
            inizializzaFiltriTabella("tabellaPazientiDottore");
            return;
        }

        pazienti.forEach(p => {
            tbody.innerHTML += `
                <tr>
                    <td>${p.id}</td>
                    <td>
                        <a href="javascript:void(0)" class="table-link" onclick="apriDettaglioPazienteDottore(${p.id})">
                            ${p.nome} ${p.cognome}
                        </a>
                    </td>
                    <td>${p.codice_fiscale}</td>
                    <td>${p.email}</td>
                    <td>${p.telefono || '-'}</td>
                    <td>
                        <div class="action-buttons">
                            <button class="btn-info" onclick="apriDettaglioPazienteDottore(${p.id})">Dettagli</button>
                        </div>
                    </td>
                </tr>
            `;
        });

        inizializzaFiltriTabella("tabellaPazientiDottore");
    } catch (err) {
        mostraMessaggio("Errore recupero pazienti.", true);
    }
}

async function apriDettaglioPazienteDottore(pazienteId) {
    if (!utenteLoggato || utenteLoggato.ruolo !== 'dottore') return;
    try {
        const res = await fetch(`${API_URL}/dottori/${utenteLoggato.id}/pazienti/${pazienteId}/dettaglio`, {
            headers: ottieniHeadersAuth()
        });
        
        if (!res.ok) throw new Error("Errore scheda paziente");
        
        const data = await res.json();
        const p = data.paziente;

        const infoDiv = document.getElementById("dettaglioInfoPazienteDottorePage");
        if (infoDiv) {
            infoDiv.innerHTML = `
                <p><strong>ID Paziente:</strong> ${p.id}</p>
                <p><strong>Nome e Cognome:</strong> ${p.nome} ${p.cognome}</p>
                <p><strong>Codice Fiscale:</strong> ${p.codice_fiscale}</p>
                <p><strong>Email:</strong> ${p.email}</p>
                <p><strong>Telefono:</strong> ${p.telefono || '-'}</p>
            `;
        }

        const tbody = document.querySelector("#tabellaDettaglioPrenotazioniPazienteDottorePage tbody");
        if (tbody) {
            tbody.innerHTML = "";
            if (data.prenotazioni.length === 0) {
                tbody.innerHTML = '<tr><td colspan="6">Nessun appuntamento attivo con questo paziente.</td></tr>';
            } else {
                data.prenotazioni.forEach(pr => {
                    let azioniHtml = '';
                    const s = pr.stato || 'In attesa di conferma';
                    if (s === 'In attesa di conferma') {
                        azioniHtml = `
                            <button class="btn-success" onclick="cambiaStatoVisita(${pr.id}, 'Confermata')">Conferma</button>
                            <button class="btn-secondary" onclick="apriModificaPrenotazioneDottore(${pr.id})">Modifica</button>
                            <button class="btn-danger" onclick="cambiaStatoVisita(${pr.id}, 'Annullata')">Rifiuta</button>
                        `;
                    } else if (s === 'Confermata') {
                        azioniHtml = `
                            <button class="btn-primary" onclick="cambiaStatoVisita(${pr.id}, 'Completata')">Completata</button>
                            <button class="btn-secondary" onclick="apriModificaPrenotazioneDottore(${pr.id})">Modifica</button>
                            <button class="btn-danger" onclick="cambiaStatoVisita(${pr.id}, 'Annullata')">Annulla</button>
                        `;
                    } else {
                        azioniHtml = `
                            <button class="btn-warning" onclick="cambiaStatoVisita(${pr.id}, 'Confermata')">Ripristina</button>
                        `;
                    }

                    tbody.innerHTML += `
                        <tr>
                            <td>${pr.id}</td>
                            <td>${pr.specializzazione}</td>
                            <td>${new Date(pr.data_ora).toLocaleString('it-IT')}</td>
                            <td>${getBadgeHtml(pr.stato)}</td>
                            <td>${pr.note || '-'}</td>
                            <td>
                                <div class="action-buttons">${azioniHtml}</div>
                            </td>
                        </tr>
                    `;
                });
            }
        }

        mostraVista('view-dettaglio-paziente-dottore');
        inizializzaFiltriTabella("tabellaDettaglioPrenotazioniPazienteDottorePage");
    } catch (err) {
        mostraMessaggio("Impossibile caricare i dati del paziente.", true);
    }
}

async function cambiaStatoVisita(prenotazioneId, nuovoStato) {
    if (!utenteLoggato) return;
    try {
        const res = await fetch(`${API_URL}/prenotazioni/${prenotazioneId}/stato?nuovo_stato=${encodeURIComponent(nuovoStato)}`, {
            method: "PATCH",
            headers: ottieniHeadersAuth()
        });

        if (res.ok) {
            mostraMessaggio(`Stato della prenotazione aggiornato a: ${nuovoStato}`);
            caricaAgendaDottore();
            const dettaglioVisibile = !document.getElementById("view-dettaglio-paziente-dottore").classList.contains("hidden");
            if (dettaglioVisibile) {
                const infoDiv = document.getElementById("dettaglioInfoPazienteDottorePage");
                const idMatch = infoDiv?.innerText.match(/ID Paziente:\s*(\d+)/);
                if (idMatch && idMatch[1]) {
                    apriDettaglioPazienteDottore(parseInt(idMatch[1]));
                }
            }
        } else {
            const err = await res.json();
            mostraMessaggio(err.detail || "Impossibile aggiornare lo stato.", true);
        }
    } catch (err) {
        mostraMessaggio("Errore di connessione.", true);
    }
}

// ======================================================================
// FASE 10: INIEZIONE DATA-LABEL PER RESPONSIVE TABLES (MOBILE)[cite: 1]
// ======================================================================

function aggiornaDataLabelTabelle() {
    document.querySelectorAll(".table-responsive table").forEach(table => {
        const headers = Array.from(table.querySelectorAll("thead th")).map(th => {
            return th.getAttribute("data-original-title") || th.innerText.replace(/[▼🔽]/g, '').trim();
        });

        table.querySelectorAll("tbody tr").forEach(row => {
            if (row.children.length <= 1) return;
            Array.from(row.children).forEach((td, index) => {
                if (headers[index]) {
                    td.setAttribute("data-label", headers[index]);
                }
            });
        });
    });
}

// ======================================================================
// GESTIONE FILTRI TABELLE STILE EXCEL + POPUP CENTRATO PER MOBILE
// ======================================================================

const filtriTabelle = {};
let popupFiltroCorrente = null;
let modalMobileOverlay = null;

function chiudiMenuFiltroMobile() {
    if (modalMobileOverlay) {
        modalMobileOverlay.remove();
        modalMobileOverlay = null;
    }
}

function apriMenuFiltroMobile(idTabella, event) {
    if (event) event.stopPropagation();
    chiudiMenuFiltroMobile();
    chiudiDropdownFiltro();

    const table = document.getElementById(idTabella);
    if (!table) return;

    const thElements = Array.from(table.querySelectorAll("thead th"));

    const overlay = document.createElement("div");
    overlay.className = "mobile-filter-modal-overlay";

    const dialog = document.createElement("div");
    dialog.className = "mobile-filter-dialog";

    dialog.innerHTML = `
        <div class="mobile-filter-dialog-header">
            <h3>Filtra per Colonna</h3>
            <button class="mobile-filter-dialog-close" onclick="chiudiMenuFiltroMobile()">&times;</button>
        </div>
        <div class="mobile-filter-list-col" id="mobileFilterColList"></div>
    `;

    const colListContainer = dialog.querySelector("#mobileFilterColList");

    thElements.forEach((th, index) => {
        const titolo = th.getAttribute("data-original-title") || th.innerText.replace(/[▼🔽]/g, '').trim();
        if (titolo.toLowerCase() === "azioni") return;

        const hasFilter = filtriTabelle[idTabella] && filtriTabelle[idTabella][index] !== undefined;

        const opt = document.createElement("div");
        opt.className = `mobile-filter-option ${hasFilter ? 'has-active-filter' : ''}`;
        opt.innerHTML = `<span>${titolo}</span> <span>${hasFilter ? '✓' : '›'}</span>`;
        opt.onclick = (e) => {
            e.stopPropagation();
            chiudiMenuFiltroMobile();
            apriDropdownFiltro(null, idTabella, index);
        };
        colListContainer.appendChild(opt);
    });

    overlay.appendChild(dialog);
    document.body.appendChild(overlay);
    modalMobileOverlay = overlay;

    overlay.addEventListener("click", (e) => {
        if (e.target === overlay) {
            chiudiMenuFiltroMobile();
        }
    });

    dialog.addEventListener("click", (e) => e.stopPropagation());
}

window.apriMenuFiltroMobile = apriMenuFiltroMobile;
window.chiudiMenuFiltroMobile = chiudiMenuFiltroMobile;

// Estrazione deterministica del valore pulito della cella
function estraiValoreCella(td, colIndex, isColonnaData = false) {
    if (!td) return "";

    // Legge solo i nodi testuali ignorando etichette pseudo-elementi e pulsanti
    let testo = "";
    Array.from(td.childNodes).forEach(node => {
        if (node.nodeType === Node.TEXT_NODE) {
            testo += " " + node.textContent;
        } else if (node.nodeType === Node.ELEMENT_NODE) {
            if (!node.classList.contains("action-buttons") && !node.classList.contains("filter-btn")) {
                testo += " " + node.innerText;
            }
        }
    });

    testo = testo.trim();

    if (!testo) {
        testo = td.innerText.trim();
        const dataLabel = td.getAttribute("data-label");
        if (dataLabel && testo.startsWith(dataLabel)) {
            testo = testo.substring(dataLabel.length).trim();
        }
    }

    if (isColonnaData) {
        // Cerca pattern gg/mm/aaaa ed assicura zeri (es. 16/09/2026)
        const matchData = testo.match(/(\d{1,2})\/(\d{1,2})\/(\d{4})/);
        if (matchData) {
            const gg = matchData[1].padStart(2, '0');
            const mm = matchData[2].padStart(2, '0');
            const aaaa = matchData[3];
            return `${gg}/${mm}/${aaaa}`;
        }
    }

    return testo || "(Vuoto)";
}

function inizializzaFiltriTabella(idTabella) {
    const table = document.getElementById(idTabella);
    if (!table) return;

    if (!filtriTabelle[idTabella]) {
        filtriTabelle[idTabella] = {};
    }

    const thElements = table.querySelectorAll("thead th");
    thElements.forEach((th, index) => {
        let titolo = th.getAttribute("data-original-title");
        if (!titolo) {
            titolo = th.innerText.replace(/[▼🔽]/g, '').trim();
            th.setAttribute("data-original-title", titolo);
        }

        if (titolo.toLowerCase() === "azioni") return;

        th.classList.add("filterable");
        const hasFilter = filtriTabelle[idTabella][index] !== undefined;

        th.innerHTML = `
            <div class="th-content">
                <span>${titolo}</span>
                <button type="button" class="filter-btn ${hasFilter ? 'active' : ''}" title="Filtra per ${titolo}" onclick="apriDropdownFiltro(event, '${idTabella}', ${index})">
                    ${hasFilter ? '🔽' : '▼'}
                </button>
            </div>
        `;
    });

    applicaFiltriAttivi(idTabella);
}

function apriDropdownFiltro(e, idTabella, colIndex) {
    if (e && e.stopPropagation) e.stopPropagation();
    chiudiDropdownFiltro();
    chiudiMenuFiltroMobile();

    const table = document.getElementById(idTabella);
    const th = table.querySelectorAll("thead th")[colIndex];
    const nomeColonna = th ? (th.getAttribute("data-original-title") || th.innerText.replace(/[▼🔽]/g, '').trim()) : "";
    const isColonnaData = nomeColonna.toLowerCase().includes("data");

    const righe = Array.from(table.querySelectorAll("tbody tr"));
    const valoriSet = new Set();

    righe.forEach(r => {
        if (r.children.length <= 1) return;
        const td = r.children[colIndex];
        if (td) {
            valoriSet.add(estraiValoreCella(td, colIndex, isColonnaData));
        }
    });

    const valoriUnici = Array.from(valoriSet).sort();
    const filtroAttivo = filtriTabelle[idTabella][colIndex];
    const filtroSelezionato = filtroAttivo ? filtroAttivo : new Set(valoriUnici);

    const popup = document.createElement("div");
    popup.className = "excel-filter-dropdown";

    if (window.innerWidth <= 768) {
        popup.style.top = "50%";
        popup.style.left = "50%";
        popup.style.transform = "translate(-50%, -50%)";
        popup.style.width = "90vw";
        popup.style.maxWidth = "320px";
    } else {
        const btn = e ? e.currentTarget : null;
        const rect = btn && btn.getBoundingClientRect ? btn.getBoundingClientRect() : { bottom: 120, left: 20 };
        popup.style.top = `${rect.bottom + window.scrollY + 6}px`;
        let leftPos = rect.left + window.scrollX - 160;
        if (leftPos < 10) leftPos = 10;
        popup.style.left = `${leftPos}px`;
    }

    popup.innerHTML = `
        <div style="font-weight:700; color:var(--aero-blue-deep); margin-bottom:8px; font-size:0.92rem;">Filtra per: ${nomeColonna}</div>
        <input type="text" id="searchFilterBox" placeholder="Cerca valore..." autocomplete="off">
        <div class="excel-filter-list">
            <label class="excel-filter-item" style="font-weight:700; border-bottom:1px solid #e2e8f0; padding-bottom:6px;">
                <input type="checkbox" id="selectAllFilter" ${filtroSelezionato.size === valoriUnici.length ? 'checked' : ''}>
                (Seleziona tutto)
            </label>
            <div id="filterItemsContainer">
                ${valoriUnici.map(val => `
                    <label class="excel-filter-item">
                        <input type="checkbox" class="val-check" value="${val}" ${filtroSelezionato.has(val) ? 'checked' : ''}>
                        <span>${val}</span>
                    </label>
                `).join('')}
            </div>
        </div>
        <div class="excel-filter-actions">
            <button type="button" class="btn-secondary" onclick="rimuoviFiltroColonna('${idTabella}', ${colIndex})">Cancella</button>
            <button type="button" class="btn-primary" onclick="confermaFiltroColonna('${idTabella}', ${colIndex})">Applica</button>
        </div>
    `;

    document.body.appendChild(popup);
    popupFiltroCorrente = popup;

    const searchBox = popup.querySelector("#searchFilterBox");
    searchBox.addEventListener("input", (ev) => {
        const q = ev.target.value.toLowerCase();
        popup.querySelectorAll("#filterItemsContainer .excel-filter-item").forEach(item => {
            const txt = item.querySelector("span").innerText.toLowerCase();
            item.style.display = txt.includes(q) ? "flex" : "none";
        });
    });

    const selectAllCheck = popup.querySelector("#selectAllFilter");
    selectAllCheck.addEventListener("change", (ev) => {
        const isChecked = ev.target.checked;
        popup.querySelectorAll(".val-check").forEach(cb => cb.checked = isChecked);
    });

    popup.addEventListener("click", (ev) => ev.stopPropagation());
}

function chiudiDropdownFiltro() {
    if (popupFiltroCorrente) {
        popupFiltroCorrente.remove();
        popupFiltroCorrente = null;
    }
}

document.addEventListener("click", () => {
    chiudiDropdownFiltro();
    chiudiMenuFiltroMobile();
});

function confermaFiltroColonna(idTabella, colIndex) {
    if (!popupFiltroCorrente) return;

    const checkedBoxes = Array.from(popupFiltroCorrente.querySelectorAll(".val-check:checked"));
    const valoriSelezionati = new Set(checkedBoxes.map(cb => cb.value));

    filtriTabelle[idTabella][colIndex] = valoriSelezionati;
    chiudiDropdownFiltro();
    
    // Aggiorna classe e icona senza riscrivere il DOM del TH
    const table = document.getElementById(idTabella);
    if (table) {
        const th = table.querySelectorAll("thead th")[colIndex];
        const btn = th ? th.querySelector(".filter-btn") : null;
        if (btn) {
            btn.classList.add("active");
            btn.textContent = "🔽";
        }
    }

    applicaFiltriAttivi(idTabella);
}

function rimuoviFiltroColonna(idTabella, colIndex) {
    delete filtriTabelle[idTabella][colIndex];
    chiudiDropdownFiltro();

    const table = document.getElementById(idTabella);
    if (table) {
        const th = table.querySelectorAll("thead th")[colIndex];
        const btn = th ? th.querySelector(".filter-btn") : null;
        if (btn) {
            btn.classList.remove("active");
            btn.textContent = "▼";
        }
    }

    applicaFiltriAttivi(idTabella);
}

function resetFiltriTabella(idTabella) {
    filtriTabelle[idTabella] = {};
    const table = document.getElementById(idTabella);
    if (table) {
        table.querySelectorAll(".filter-btn").forEach(btn => {
            btn.classList.remove("active");
            btn.textContent = "▼";
        });
    }
    applicaFiltriAttivi(idTabella);
}

function applicaFiltriAttivi(idTabella) {
    const table = document.getElementById(idTabella);
    if (!table) return;

    const ths = table.querySelectorAll("thead th");
    const filtri = filtriTabelle[idTabella] || {};
    const righe = table.querySelectorAll("tbody tr");

    const haFiltriAttivi = Object.keys(filtri).length > 0;
    const container = table.closest(".card");
    if (container) {
        const resetBtn = container.querySelector(".btn-reset-filters");
        if (resetBtn) {
            if (haFiltriAttivi) {
                resetBtn.classList.remove("hidden");
            } else {
                resetBtn.classList.add("hidden");
            }
        }
    }

    righe.forEach(riga => {
        if (riga.children.length <= 1) return;

        let rigaVisibile = true;

        for (const [colIndexStr, valoriAmmessi] of Object.entries(filtri)) {
            const colIndex = parseInt(colIndexStr);
            const th = ths[colIndex];
            
            const titleTh = (th ? (th.getAttribute("data-original-title") || th.innerText) : "").toLowerCase();
            const isColonnaData = titleTh.includes("data");
            
            const valCella = estraiValoreCella(riga.children[colIndex], colIndex, isColonnaData);

            if (!valoriAmmessi.has(valCella)) {
                rigaVisibile = false;
                break;
            }
        }

        // Utilizziamo sia style.display che la classe .filter-hidden con display: none !important
        if (rigaVisibile) {
            riga.classList.remove("filter-hidden");
            riga.style.display = "";
        } else {
            riga.classList.add("filter-hidden");
            riga.style.setProperty("display", "none", "important");
        }
    });

    aggiornaDataLabelTabelle();
}