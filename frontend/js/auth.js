import { API_URL, state, setUtenteLoggato, mostraMessaggio } from './config.js';

export function ottieniHeadersAuth(headersBase = {}) {
    const headers = { ...headersBase };
    if (state.utenteLoggato && state.utenteLoggato.id) {
        headers["X-User-ID"] = String(state.utenteLoggato.id);
        if (state.utenteLoggato.ruolo) {
            headers["X-User-Role"] = String(state.utenteLoggato.ruolo);
        }
    }
    return headers;
}

export function chiudiMenuMobile() {
    const navContainer = document.getElementById("navContainer");
    if (navContainer && navContainer.classList.contains("active")) {
        navContainer.classList.remove("active");
    }
}

export function triggerAdminLoginModal() {
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

export function apriModaleLoginStandard() {
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

export function apriModaleCambioPassword() {
    chiudiMenuMobile();
    const errDiv = document.getElementById("changePasswordErrorMsg");
    if (errDiv) {
        errDiv.classList.add("hidden");
        errDiv.style.display = "none";
    }
    document.getElementById("formChangePassword").reset();
    document.getElementById("changePasswordModal").classList.remove("hidden");
}

export async function effettuaCambioPassword(e) {
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

    let endpoint = `${API_URL}/pazienti/${state.utenteLoggato.id}/password`;
    if (state.utenteLoggato.ruolo === "admin") {
        endpoint = `${API_URL}/admin/${state.utenteLoggato.id}/password`;
    } else if (state.utenteLoggato.ruolo === "dottore") {
        endpoint = `${API_URL}/dottori/${state.utenteLoggato.id}/password`;
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

export async function effettuaLogin(e, onLoginSuccess) {
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
            setUtenteLoggato({
                ...data,
                ruolo: tipoUtente
            });
            
            document.getElementById("loginModal").classList.add("hidden");
            document.getElementById("formLogin").reset();
            
            aggiornaInterfacciaAuth();
            mostraMessaggio("Login effettuato con successo!");
            if (onLoginSuccess) onLoginSuccess(state.utenteLoggato);
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

export function aggiornaInterfacciaAuth() {
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

    if (state.utenteLoggato) {
        if (btnLoginModal) btnLoginModal.classList.add("hidden");
        if (btnLoginModalMobile) btnLoginModalMobile.classList.add("hidden");
        if (btnAdminLock) btnAdminLock.classList.add("hidden");
        if (btnAdminLockMobile) btnAdminLockMobile.classList.add("hidden");

        if (userMenu) userMenu.classList.remove("hidden");
        if (userMenuMobile) userMenuMobile.classList.remove("hidden");
        if (navRegister) navRegister.classList.add("hidden");

        const nomeMostrato = state.utenteLoggato.nome ? `${state.utenteLoggato.nome} ${state.utenteLoggato.cognome || ''}` : state.utenteLoggato.username || "Utente";
        const displayDesktop = document.getElementById("userNameDisplay");
        const displayMobile = document.getElementById("userNameDisplayMobile");
        if (displayDesktop) displayDesktop.textContent = nomeMostrato;
        if (displayMobile) displayMobile.textContent = nomeMostrato;

        if (navAdmin) navAdmin.classList.add("hidden");
        if (navProfile) navProfile.classList.add("hidden");
        if (navDoctor) navDoctor.classList.add("hidden");
        if (boxSelectPazienteAdmin) boxSelectPazienteAdmin.classList.add("hidden");

        if (state.utenteLoggato.ruolo === 'admin') {
            if (navAdmin) navAdmin.classList.remove("hidden");
            if (boxSelectPazienteAdmin) boxSelectPazienteAdmin.classList.remove("hidden");
            if (navBooking) navBooking.classList.add("hidden");
        } else if (state.utenteLoggato.ruolo === 'dottore') {
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

export function effettuaLogout(onLogoutSuccess) {
    chiudiMenuMobile();
    setUtenteLoggato(null);
    aggiornaInterfacciaAuth();
    mostraMessaggio("Logout effettuato.");
    if (onLogoutSuccess) onLogoutSuccess();
}