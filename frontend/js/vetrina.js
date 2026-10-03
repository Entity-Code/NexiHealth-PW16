import { API_URL, state, mostraMessaggio } from './config.js';
import { ottieniHeadersAuth } from './auth.js';

export const REPARTI_METADATA = {
    "cardiologia": { icona: "❤️", descrizione: "Screening cardiovascolari, ECG, holter pressorio e monitoraggio dell'ipertensione arteriosa." },
    "dermatologia": { icona: "🔍", descrizione: "Mappatura nevi in epiluminescenza, cura di dermatiti, psoriasi e salute della cute." },
    "ortopedia": { icona: "🦴", descrizione: "Valutazioni articolari, diagnosi di traumi sportivi e programmi terapeutici osteoarticolari." },
    "medicina generale": { icona: "🩺", descrizione: "Check-up periodici di routine, medicina preventiva e inquadramento clinico generale." },
    "urologia": { icona: "💧", descrizione: "Prevenzione delle patologie urinarie, controlli prostatici ecoguidati e monitoraggio specialistico." },
    "oculistica": { icona: "👁️", descrizione: "Visite refrattive, esame del fondo oculare, tono oculare e diagnosi delle patologie visive." },
    "neurologia": { icona: "🧠", descrizione: "Valutazioni dei disturbi cefalalgici, sistema nervoso periferico e follow-up neurologico mirato." },
    "ginecologia": { icona: "🌸", descrizione: "Prevenzione oncologica femminile, ecografie pelviche transvaginali e percorsi dedicati." }
};

export async function caricaDatiVetrina() {
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

export async function caricaRepartiVetrinaHome() {
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

export async function caricaVetrinaDottoriHome() {
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

export async function caricaFormGestioneVetrinaAdmin() {
    if (!state.utenteLoggato || state.utenteLoggato.ruolo !== 'admin') return;

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

export function apriModaleAnteprimaVetrina() {
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

export function chiudiModaleAnteprimaVetrina() {
    const modal = document.getElementById("previewVetrinaModal");
    if (modal) modal.classList.add("hidden");
}

export async function salvaImpostazioniVetrinaAdmin() {
    if (!state.utenteLoggato || state.utenteLoggato.ruolo !== 'admin') {
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