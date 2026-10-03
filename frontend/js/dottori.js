import { API_URL, state, mostraMessaggio, getBadgeHtml } from './config.js';
import { ottieniHeadersAuth } from './auth.js';
import { inizializzaFiltriTabella } from './filtri.js';
import { caricaVetrinaDottoriHome, caricaRepartiVetrinaHome } from './vetrina.js';

export async function caricaHomeDottore() {
    if (!state.utenteLoggato || state.utenteLoggato.ruolo !== 'dottore') return;

    const titleEl = document.getElementById("doctorWelcomeTitle");
    const subEl = document.getElementById("doctorSpecializationSubtitle");
    if (titleEl) {
        titleEl.textContent = `Benvenuto/a, Dott. ${state.utenteLoggato.nome} ${state.utenteLoggato.cognome}`;
    }
    if (subEl) {
        subEl.textContent = `Specializzazione: ${state.utenteLoggato.specializzazione || 'Medicina Generale'} | Centro NexiHealth`;
    }

    try {
        const resVisite = await fetch(`${API_URL}/dottori/${state.utenteLoggato.id}/prenotazioni`, {
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

        const resPazienti = await fetch(`${API_URL}/dottori/${state.utenteLoggato.id}/pazienti`, {
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

export async function caricaDottoriAdmin() {
    if (!state.utenteLoggato || state.utenteLoggato.ruolo !== 'admin') return;
    try {
        const res = await fetch(`${API_URL}/dottori/`, {
            headers: ottieniHeadersAuth()
        });
        
        state.listaDottoriCache = await res.json();
        const tbody = document.querySelector("#tabellaDottori tbody");
        if (!tbody) return;

        tbody.innerHTML = "";

        if (state.listaDottoriCache.length === 0) {
            tbody.innerHTML = '<tr><td colspan="6">Nessun dottore trovato.</td></tr>';
            inizializzaFiltriTabella("tabellaDottori");
            return;
        }

        state.listaDottoriCache.forEach(d => {
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

export function apriModalNuovoDottoreAdmin() {
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

export function apriModificaDottore(id) {
    const d = state.listaDottoriCache.find(item => item.id === id);
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

export async function apriDettaglioDottore(dottoreId, mostraVistaFn) {
    if (!state.utenteLoggato) return;
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
        
        if (mostraVistaFn) mostraVistaFn('view-dettaglio-medico');
        inizializzaFiltriTabella("tabellaDettaglioPrenotazioniMedicoPage");
    } catch (error) {
        console.error(error);
        mostraMessaggio("Impossibile caricare i dettagli del medico.", true);
    }
}

export async function salvaDottoreAdmin(e) {
    if (e && e.preventDefault) e.preventDefault();
    if (!state.utenteLoggato || state.utenteLoggato.ruolo !== 'admin') {
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

export async function eliminaDottoreAdmin(id) {
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

export async function caricaAgendaDottore() {
    if (!state.utenteLoggato || state.utenteLoggato.ruolo !== 'dottore') return;
    try {
        const res = await fetch(`${API_URL}/dottori/${state.utenteLoggato.id}/prenotazioni`, {
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

export async function caricaPazientiDottore() {
    if (!state.utenteLoggato || state.utenteLoggato.ruolo !== 'dottore') return;
    try {
        const res = await fetch(`${API_URL}/dottori/${state.utenteLoggato.id}/pazienti`, {
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

export async function apriDettaglioPazienteDottore(pazienteId, mostraVistaFn) {
    if (!state.utenteLoggato || state.utenteLoggato.ruolo !== 'dottore') return;
    try {
        const res = await fetch(`${API_URL}/dottori/${state.utenteLoggato.id}/pazienti/${pazienteId}/dettaglio`, {
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

        if (mostraVistaFn) mostraVistaFn('view-dettaglio-paziente-dottore');
        inizializzaFiltriTabella("tabellaDettaglioPrenotazioniPazienteDottorePage");
    } catch (err) {
        mostraMessaggio("Impossibile caricare i dati del paziente.", true);
    }
}

export async function cambiaStatoVisita(prenotazioneId, nuovoStato) {
    if (!state.utenteLoggato) return;
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