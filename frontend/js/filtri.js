export const filtriTabelle = {};
let popupFiltroCorrente = null;
let modalMobileOverlay = null;

export function aggiornaDataLabelTabelle() {
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

export function estraiValoreCella(td, colIndex, isColonnaData = false) {
    if (!td) return "";

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

export function inizializzaFiltriTabella(idTabella) {
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

export function apriDropdownFiltro(e, idTabella, colIndex) {
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

export function chiudiDropdownFiltro() {
    if (popupFiltroCorrente) {
        popupFiltroCorrente.remove();
        popupFiltroCorrente = null;
    }
}

export function chiudiMenuFiltroMobile() {
    if (modalMobileOverlay) {
        modalMobileOverlay.remove();
        modalMobileOverlay = null;
    }
}

export function apriMenuFiltroMobile(idTabella, event) {
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

export function confermaFiltroColonna(idTabella, colIndex) {
    if (!popupFiltroCorrente) return;

    const checkedBoxes = Array.from(popupFiltroCorrente.querySelectorAll(".val-check:checked"));
    const valoriSelezionati = new Set(checkedBoxes.map(cb => cb.value));

    filtriTabelle[idTabella][colIndex] = valoriSelezionati;
    chiudiDropdownFiltro();
    
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

export function rimuoviFiltroColonna(idTabella, colIndex) {
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

export function resetFiltriTabella(idTabella) {
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

export function applicaFiltriAttivi(idTabella) {
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