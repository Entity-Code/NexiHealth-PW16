import { API_URL, state, mostraMessaggio, getBadgeHtml } from './config.js';
import { ottieniHeadersAuth, apriModaleLoginStandard } from './auth.js';
import { inizializzaFiltriTabella } from './filtri.js';
import { caricaAgendaDottore, apriDettaglioPazienteDottore } from './dottori.js';

export async function caricaSpecializzazioniEDottoriBooking() {
    try {
        const res = await fetch(`${API_URL}/dottori/attivi`);
        if (!res.ok) return;
        state.listaDottoriAttiviBooking = await res.json();

        const specSelect = document.getElementById("specializzazioneSelect");
        const docSelect = document.getElementById("dottoreSelect");
        if (!specSelect || !docSelect) return;

        const specializzazioniUniche = Array.from(
            new Set(state.listaDottoriAttiviBooking.map(d => d.specializzazione).filter(Boolean))
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

export function filtraDottoriPerSpecializzazione(specializzazioneSelezionata) {
    const docSelect = document.getElementById("dottoreSelect");
    if (!docSelect) return;

    docSelect.innerHTML = '<option value="">-- Seleziona Medico --</option>';

    const filtrati = specializzazioneSelezionata
        ? state.listaDottoriAttiviBooking.filter(d => d.specializzazione === specializzazioneSelezionata)
        : state.listaDottoriAttiviBooking;

    filtrati.forEach(d => {
        docSelect.innerHTML += `<option value="${d.id}">Dr. ${d.nome} ${d.cognome} (${d.specializzazione})</option>`;
    });

    if (filtrati.length === 1 && specializzazioneSelezionata) {
        docSelect.value = String(filtrati[0].id);
    }
}

export async function prenotaConDottore(dottoreId, specializzazione, mostraVistaFn) {
    if (!state.utenteLoggato) {
        apriModaleLoginStandard();
        return;
    }
    if (mostraVistaFn) mostraVistaFn('view-booking');
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

export async function creaPrenotazione(e, mostraVistaFn) {
    e.preventDefault();

    let idPaziente = state.utenteLoggato ? state.utenteLoggato.id : null;
    
    if (state.utenteLoggato && state.utenteLoggato.ruolo === 'admin') {
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
            
            if (state.utenteLoggato.ruolo === 'admin') {
                if (mostraVistaFn) mostraVistaFn('view-admin');
                caricaPrenotazioniAdmin();
            } else {
                if (mostraVistaFn) mostraVistaFn('view-profile');
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

export async function caricaMiePrenotazioni() {
    if (!state.utenteLoggato) return;
    try {
        const res = await fetch(`${API_URL}/pazienti/${state.utenteLoggato.id}/prenotazioni`, {
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

export async function caricaPrenotazioniAdmin() {
    if (!state.utenteLoggato || state.utenteLoggato.ruolo !== 'admin') return;
    try {
        const res = await fetch(`${API_URL}/prenotazioni/`, {
            headers: ottieniHeadersAuth()
        });
        state.listaPrenotazioniCache = await res.json();

        const tbody = document.querySelector("#tabellaPrenotazioni tbody");
        tbody.innerHTML = "";

        if (state.listaPrenotazioniCache.length === 0) {
            tbody.innerHTML = '<tr><td colspan="8">Nessuna prenotazione trovata.</td></tr>';
            inizializzaFiltriTabella("tabellaPrenotazioni");
            return;
        }

        state.listaPrenotazioniCache.forEach(p => {
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

export function apriModificaPrenotazione(id) {
    const pr = state.listaPrenotazioniCache.find(item => item.id === id);
    if (!pr) return;

    document.getElementById("editPrenotazioneId").value = pr.id;
    document.getElementById("editPrenotazionePazienteId").value = pr.paziente_id;
    document.getElementById("editDottoreId").value = pr.dottore_id;

    const doc = state.listaDottoriCache.find(d => d.id === pr.dottore_id);
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

export async function apriModificaPrenotazioneDottore(id) {
    try {
        const res = await fetch(`${API_URL}/prenotazioni/${id}`, {
            headers: ottieniHeadersAuth()
        });
        if (!res.ok) throw new Error("Errore recupero prenotazione");
        const pr = await res.json();

        document.getElementById("editPrenotazioneId").value = pr.id;
        document.getElementById("editPrenotazionePazienteId").value = pr.paziente_id;
        document.getElementById("editDottoreId").value = pr.dottore_id;

        const nomeDottore = state.utenteLoggato.nome ? `Dr. ${state.utenteLoggato.nome} ${state.utenteLoggato.cognome || ''}` : `Dottore ID: ${pr.dottore_id}`;
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

export async function salvaModificaPrenotazione(e) {
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

            if (state.utenteLoggato.ruolo === 'admin') {
                caricaPrenotazioniAdmin();
            } else if (state.utenteLoggato.ruolo === 'dottore') {
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

export async function eliminaPrenotazioneAdmin(id) {
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