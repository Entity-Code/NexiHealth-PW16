export const API_URL = "http://127.0.0.1:8000";

export const state = {
    utenteLoggato: null, // { id, nome, cognome, ruolo: 'paziente' | 'admin' | 'dottore' }
    listaPazientiCache: [],
    listaPrenotazioniCache: [],
    idPazienteDaEliminare: null,
    listaDottoriCache: [],
    listaDottoriAttiviBooking: []
};

export function setUtenteLoggato(val) {
    state.utenteLoggato = val;
}

export function setIdPazienteDaEliminare(id) {
    state.idPazienteDaEliminare = id;
}

export function mostraMessaggio(testo, isErrore = false) {
    const msgDiv = document.getElementById("msg");
    if (!msgDiv) return;
    msgDiv.textContent = testo;
    msgDiv.className = isErrore ? "alert alert-error" : "alert alert-success";
    msgDiv.classList.remove("hidden");
    setTimeout(() => { msgDiv.classList.add("hidden"); }, 4000);
}

export function getBadgeHtml(stato) {
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