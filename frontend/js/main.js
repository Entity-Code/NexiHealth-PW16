import { API_URL, state } from './config.js';
import { 
    ottieniHeadersAuth, 
    chiudiMenuMobile, 
    triggerAdminLoginModal, 
    apriModaleLoginStandard, 
    apriModaleCambioPassword, 
    effettuaCambioPassword, 
    effettuaLogin, 
    effettuaLogout, 
    aggiornaInterfacciaAuth 
} from './auth.js';
import { 
    caricaDatiVetrina, 
    caricaRepartiVetrinaHome, 
    caricaVetrinaDottoriHome, 
    caricaFormGestioneVetrinaAdmin, 
    apriModaleAnteprimaVetrina, 
    chiudiModaleAnteprimaVetrina, 
    salvaImpostazioniVetrinaAdmin 
} from './vetrina.js';
import { 
    registraPaziente, 
    caricaPazientiAdmin, 
    apriModificaPaziente, 
    salvaModificaPaziente, 
    apriDettaglioPaziente, 
    richiediConfermaEliminazionePaziente, 
    chiudiModalConfermaEliminazione, 
    eseguiEliminazionePazienteConfermata 
} from './pazienti.js';
import { 
    caricaHomeDottore, 
    caricaDottoriAdmin, 
    apriModalNuovoDottoreAdmin, 
    apriModificaDottore, 
    apriDettaglioDottore, 
    salvaDottoreAdmin, 
    eliminaDottoreAdmin, 
    caricaAgendaDottore, 
    caricaPazientiDottore, 
    apriDettaglioPazienteDottore, 
    cambiaStatoVisita 
} from './dottori.js';
import { 
    caricaSpecializzazioniEDottoriBooking, 
    filtraDottoriPerSpecializzazione, 
    prenotaConDottore, 
    creaPrenotazione, 
    caricaMiePrenotazioni, 
    caricaPrenotazioniAdmin, 
    apriModificaPrenotazione, 
    apriModificaPrenotazioneDottore, 
    salvaModificaPrenotazione, 
    eliminaPrenotazioneAdmin 
} from './prenotazioni.js';
import { 
    inizializzaFiltriTabella, 
    apriDropdownFiltro, 
    chiudiDropdownFiltro, 
    chiudiMenuFiltroMobile, 
    apriMenuFiltroMobile, 
    confermaFiltroColonna, 
    rimuoviFiltroColonna, 
    resetFiltriTabella 
} from './filtri.js';

// Router SPA: Gestione Viste
export function mostraVista(idVista) {
    chiudiMenuMobile();
    document.querySelectorAll(".view-section").forEach(sec => sec.classList.add("hidden"));
    const vistaTarget = document.getElementById(idVista);
    if (vistaTarget) {
        vistaTarget.classList.remove("hidden");
    }

    if (idVista !== 'view-register') {
        const alertAvviso = document.getElementById("alertAvvisoPrenotazione");
        if (alertAvviso) alertAvviso.classList.add("hidden");
    }

    if (idVista === 'view-booking') {
        caricaSpecializzazioniEDottoriBooking();
    }
    if (idVista === 'view-profile' && state.utenteLoggato && state.utenteLoggato.ruolo === 'paziente') {
        caricaMiePrenotazioni();
    }
    if (idVista === 'view-doctor' && state.utenteLoggato && state.utenteLoggato.ruolo === 'dottore') {
        mostraTabDottore('tab-doctor-agenda');
    }
    if (idVista === 'view-home-doctor' && state.utenteLoggato && state.utenteLoggato.ruolo === 'dottore') {
        caricaHomeDottore();
    }
    if (idVista === 'view-home-admin' && state.utenteLoggato && state.utenteLoggato.ruolo === 'admin') {
        caricaHomeAdmin();
    }
}

export function navigaHome() {
    chiudiMenuMobile();
    if (state.utenteLoggato && state.utenteLoggato.ruolo === 'dottore') {
        mostraVista('view-home-doctor');
    } else if (state.utenteLoggato && state.utenteLoggato.ruolo === 'admin') {
        mostraVista('view-home-admin');
    } else {
        mostraVista('view-home');
        caricaVetrinaDottoriHome();
        caricaRepartiVetrinaHome();
        caricaDatiVetrina();
    }
}

export function gestisciAccessoPrenotazione() {
    chiudiMenuMobile();
    if (state.utenteLoggato) {
        mostraVista('view-booking');
    } else {
        apriModaleLoginStandard();
    }
}

export function vaiATabAdmin(tabId) {
    mostraVista('view-admin');
    mostraTabAdmin(tabId);
}

export function mostraTabAdmin(tabId) {
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

export function mostraTabDottore(tabId) {
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

export async function caricaHomeAdmin() {
    if (!state.utenteLoggato || state.utenteLoggato.ruolo !== 'admin') return;

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
            if ((p.stato || "In attesa di conferma") === "In attesa di conferma") inAttesa++;
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

// Inizializzazione Listener DOM
document.addEventListener("DOMContentLoaded", () => {
    navigaHome();
    caricaVetrinaDottoriHome();
    caricaRepartiVetrinaHome();
    caricaDatiVetrina();

    const topBar = document.querySelector(".top-bar");
    if (topBar) {
        window.addEventListener("scroll", () => {
            if (window.innerWidth > 900) {
                if (window.scrollY > 25) topBar.classList.add("scrolled");
                else topBar.classList.remove("scrolled");
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

    document.getElementById('btnAdminLock')?.addEventListener('click', triggerAdminLoginModal);
    document.getElementById('btnAdminLockMobile')?.addEventListener('click', triggerAdminLoginModal);
    document.getElementById("btnLoginModal")?.addEventListener("click", apriModaleLoginStandard);
    document.getElementById("btnLoginModalMobile")?.addEventListener("click", apriModaleLoginStandard);
    document.getElementById("closeModal")?.addEventListener("click", () => {
        document.getElementById("loginModal").classList.add("hidden");
    });

    document.getElementById("btnCambioPasswordModal")?.addEventListener("click", apriModaleCambioPassword);
    document.getElementById("closePasswordModal")?.addEventListener("click", () => {
        document.getElementById("changePasswordModal").classList.add("hidden");
    });
    document.getElementById("formChangePassword")?.addEventListener("submit", effettuaCambioPassword);

    document.getElementById("closeEditPazienteModal")?.addEventListener("click", () => {
        document.getElementById("editPazienteModal").classList.add("hidden");
    });
    document.getElementById("formEditPaziente")?.addEventListener("submit", salvaModificaPaziente);

    document.getElementById("closeEditPrenotazioneModal")?.addEventListener("click", () => {
        document.getElementById("editPrenotazioneModal").classList.add("hidden");
    });
    document.getElementById("formEditPrenotazione")?.addEventListener("submit", salvaModificaPrenotazione);

    document.getElementById("closeConfirmDeleteModal")?.addEventListener("click", chiudiModalConfermaEliminazione);
    document.getElementById("btnCancelDelete")?.addEventListener("click", chiudiModalConfermaEliminazione);
    document.getElementById("btnConfirmDelete")?.addEventListener("click", () => {
        eseguiEliminazionePazienteConfermata(() => caricaPrenotazioniAdmin());
    });

    document.getElementById("linkVaiARegistrazione")?.addEventListener("click", (e) => {
        e.preventDefault();
        document.getElementById("loginModal").classList.add("hidden");
        mostraVista('view-register');
    });

    document.getElementById("formLogin")?.addEventListener("submit", (e) => {
        effettuaLogin(e, (user) => {
            if (user.ruolo === 'admin') {
                mostraVista('view-home-admin');
                caricaPazientiAdmin();
                caricaPrenotazioniAdmin();
                caricaDottoriAdmin();
            } else if (user.ruolo === 'dottore') {
                mostraVista('view-home-doctor');
            } else {
                mostraVista('view-profile');
                caricaMiePrenotazioni();
            }
        });
    });

    document.getElementById("btnLogout")?.addEventListener("click", () => effettuaLogout(() => navigaHome()));
    document.getElementById("formPaziente")?.addEventListener("submit", registraPaziente);
    document.getElementById("formPrenotazione")?.addEventListener("submit", (e) => creaPrenotazione(e, mostraVista));

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
                const dottore = state.listaDottoriAttiviBooking.find(d => d.id === docId);
                if (dottore && specSelect && !specSelect.value) {
                    specSelect.value = dottore.specializzazione;
                }
            }
        });
    }

    document.getElementById("closeEditDottoreModal")?.addEventListener("click", () => {
        document.getElementById("editDottoreModal").classList.add("hidden");
    });
    document.getElementById("formEditDottore")?.addEventListener("submit", salvaDottoreAdmin);

    document.getElementById("loginType")?.addEventListener("change", (e) => {
        const loginIdentificativo = document.getElementById("loginIdentificativo");
        if (loginIdentificativo) {
            loginIdentificativo.placeholder = e.target.value === "admin" ? "Username" : "Codice Fiscale o Email";
        }
    });

    document.addEventListener("click", () => {
        chiudiDropdownFiltro();
        chiudiMenuFiltroMobile();
    });
});

// Esportazione funzioni su window per preservare tutti gli onclick inline dell'HTML
window.navigaHome = navigaHome;
window.mostraVista = mostraVista;
window.gestisciAccessoPrenotazione = gestisciAccessoPrenotazione;
window.apriModaleLoginStandard = apriModaleLoginStandard;
window.apriModaleCambioPassword = apriModaleCambioPassword;
window.effettuaLogout = () => effettuaLogout(() => navigaHome());
window.vaiATabAdmin = vaiATabAdmin;
window.mostraTabAdmin = mostraTabAdmin;
window.mostraTabDottore = mostraTabDottore;

window.apriModaleAnteprimaVetrina = apriModaleAnteprimaVetrina;
window.chiudiModaleAnteprimaVetrina = chiudiModaleAnteprimaVetrina;
window.salvaImpostazioniVetrinaAdmin = salvaImpostazioniVetrinaAdmin;

window.prenotaConDottore = (id, spec) => prenotaConDottore(id, spec, mostraVista);
window.apriModalNuovoPazienteAdmin = () => mostraVista('view-register');
window.apriModificaPaziente = apriModificaPaziente;
window.apriDettaglioPaziente = (id) => apriDettaglioPaziente(id, mostraVista);
window.richiediConfermaEliminazionePaziente = richiediConfermaEliminazionePaziente;

window.apriModalNuovoDottoreAdmin = apriModalNuovoDottoreAdmin;
window.apriModificaDottore = apriModificaDottore;
window.apriDettaglioDottore = (id) => apriDettaglioDottore(id, mostraVista);
window.eliminaDottoreAdmin = eliminaDottoreAdmin;
window.apriDettaglioPazienteDottore = (id) => apriDettaglioPazienteDottore(id, mostraVista);
window.cambiaStatoVisita = cambiaStatoVisita;

window.apriModificaPrenotazione = apriModificaPrenotazione;
window.apriModificaPrenotazioneDottore = apriModificaPrenotazioneDottore;
window.eliminaPrenotazioneAdmin = eliminaPrenotazioneAdmin;

window.resetFiltriTabella = resetFiltriTabella;
window.apriMenuFiltroMobile = apriMenuFiltroMobile;
window.chiudiMenuFiltroMobile = chiudiMenuFiltroMobile;
window.apriDropdownFiltro = apriDropdownFiltro;
window.confermaFiltroColonna = confermaFiltroColonna;
window.rimuoviFiltroColonna = rimuoviFiltroColonna;