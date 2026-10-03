import { API_URL, state, setIdPazienteDaEliminare, mostraMessaggio, getBadgeHtml } from './config.js';
import { ottieniHeadersAuth, apriModaleLoginStandard } from './auth.js';
import { inizializzaFiltriTabella } from './filtri.js';

export async function registraPaziente(e) {
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

export async function caricaPazientiAdmin() {
    if (!state.utenteLoggato || state.utenteLoggato.ruolo !== 'admin') return;
    try {
        const res = await fetch(`${API_URL}/pazienti/`, {
            headers: ottieniHeadersAuth()
        });
        
        state.listaPazientiCache = await res.json();

        const tbody = document.querySelector("#tabellaPazienti tbody");
        const selectPaziente = document.getElementById("pazienteSelect");
        
        tbody.innerHTML = "";
        if (selectPaziente) selectPaziente.innerHTML = '<option value="">-- Seleziona Paziente --</option>';

        state.listaPazientiCache.forEach(p => {
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

export function apriModificaPaziente(id) {
    const p = state.listaPazientiCache.find(item => item.id === id);
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

export async function salvaModificaPaziente(e) {
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

export async function apriDettaglioPaziente(id, mostraVistaFn) {
    const p = state.listaPazientiCache.find(item => item.id === id);
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

        if (mostraVistaFn) mostraVistaFn('view-dettaglio-paziente');
        inizializzaFiltriTabella("tabellaDettaglioPrenotazioniPage");
    } catch (err) {
        mostraMessaggio("Errore caricamento dettagli prenotazioni.", true);
    }
}

export function richiediConfermaEliminazionePaziente(id) {
    setIdPazienteDaEliminare(id);
    document.getElementById("confirmDeleteModal").classList.remove("hidden");
}

export function chiudiModalConfermaEliminazione() {
    setIdPazienteDaEliminare(null);
    document.getElementById("confirmDeleteModal").classList.add("hidden");
}

export async function eseguiEliminazionePazienteConfermata(onDeleted) {
    if (!state.idPazienteDaEliminare) return;
    try {
        const res = await fetch(`${API_URL}/pazienti/${state.idPazienteDaEliminare}`, {
            method: "DELETE",
            headers: ottieniHeadersAuth()
        });
        if (res.ok) {
            chiudiModalConfermaEliminazione();
            mostraMessaggio("Paziente e relative prenotazioni eliminate permanentemente.");
            caricaPazientiAdmin();
            if (onDeleted) onDeleted();
        } else {
            const err = await res.json();
            mostraMessaggio(err.detail || "Errore durante l'eliminazione.", true);
        }
    } catch (err) {
        mostraMessaggio("Errore di connessione durante l'eliminazione.", true);
    }
}