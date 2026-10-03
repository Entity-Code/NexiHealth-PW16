import hashlib
from sqlalchemy.orm import Session
from sqlalchemy import or_
import models
import schemas

SECRET_SALT = "NexiHealth_Secure_Salt_2026"

def hash_password(password: str) -> str:
    salted = password + SECRET_SALT
    return hashlib.sha256(salted.encode('utf-8')).hexdigest()

get_password_hash = hash_password

def verify_password(plain_password: str, hashed_password: str) -> bool:
    return hash_password(plain_password) == hashed_password


# --- CRUD ADMIN ---
def get_admin_by_username(db: Session, username: str):
    return db.query(models.Admin).filter(models.Admin.username == username).first()

def get_admin_by_email(db: Session, email: str):
    return db.query(models.Admin).filter(models.Admin.email == email).first()

def authenticate_admin(db: Session, credenziali: schemas.AdminLogin):
    admin = db.query(models.Admin).filter(
        or_(
            models.Admin.username == credenziali.identificativo,
            models.Admin.email == credenziali.identificativo
        )
    ).first()
    if not admin:
        return None
    if not verify_password(credenziali.password, admin.password):
        return None
    return admin

def create_admin(db: Session, admin: schemas.AdminCreate):
    hashed_pwd = hash_password(admin.password)
    db_admin = models.Admin(
        username=admin.username,
        nome=admin.nome,
        cognome=admin.cognome,
        email=admin.email,
        password=hashed_pwd,
        attivo=True
    )
    db.add(db_admin)
    db.commit()
    db.refresh(db_admin)
    return db_admin

def change_admin_password(db: Session, admin_id: int, old_password: str, new_password: str) -> str:
    admin = db.query(models.Admin).filter(models.Admin.id == admin_id).first()
    if not admin:
        return "NOT_FOUND"
    if not verify_password(old_password, admin.password):
        return "WRONG_PASSWORD"
    
    admin.password = hash_password(new_password)
    db.commit()
    return "OK"


# --- CRUD PAZIENTI ---
def get_paziente(db: Session, paziente_id: int):
    return db.query(models.Paziente).filter(models.Paziente.id == paziente_id).first()

def get_paziente_by_cf(db: Session, codice_fiscale: str):
    return db.query(models.Paziente).filter(models.Paziente.codice_fiscale == codice_fiscale).first()

def get_paziente_by_email(db: Session, email: str):
    return db.query(models.Paziente).filter(models.Paziente.email == email).first()

def get_paziente_by_email_or_cf(db: Session, identificativo: str):
    return db.query(models.Paziente).filter(
        or_(
            models.Paziente.email == identificativo,
            models.Paziente.codice_fiscale == identificativo
        )
    ).first()

def authenticate_paziente(db: Session, credenziali: schemas.PazienteLogin):
    identificativo = getattr(credenziali, 'identificativo', getattr(credenziali, 'email', None))
    paziente = get_paziente_by_email_or_cf(db, identificativo)
    if not paziente:
        return None
    if not verify_password(credenziali.password, paziente.password):
        return None
    return paziente

def get_pazienti(db: Session, skip: int = 0, limit: int = 100):
    return db.query(models.Paziente).offset(skip).limit(limit).all()

def create_paziente(db: Session, paziente: schemas.PazienteCreate):
    hashed_pwd = hash_password(paziente.password)
    db_paziente = models.Paziente(
        nome=paziente.nome,
        cognome=paziente.cognome,
        codice_fiscale=paziente.codice_fiscale,
        email=paziente.email,
        telefono=paziente.telefono,
        password=hashed_pwd
    )
    db.add(db_paziente)
    db.commit()
    db.refresh(db_paziente)
    return db_paziente

def update_paziente(db: Session, paziente_id: int, paziente_data: schemas.PazienteUpdate):
    db_paziente = get_paziente(db, paziente_id)
    if not db_paziente:
        return None
    
    update_data = paziente_data.model_dump(exclude_unset=True) if hasattr(paziente_data, 'model_dump') else paziente_data.dict(exclude_unset=True)
    if "password" in update_data and update_data["password"]:
        update_data["password"] = hash_password(update_data["password"])
        
    for key, value in update_data.items():
        setattr(db_paziente, key, value)
        
    db.commit()
    db.refresh(db_paziente)
    return db_paziente

def change_password(db: Session, paziente_id: int, old_password: str, new_password: str) -> str:
    paziente = get_paziente(db, paziente_id)
    if not paziente:
        return "NOT_FOUND"
    if not verify_password(old_password, paziente.password):
        return "WRONG_PASSWORD"
    
    paziente.password = hash_password(new_password)
    db.commit()
    return "OK"

def delete_paziente(db: Session, paziente_id: int):
    db_paziente = get_paziente(db, paziente_id)
    if db_paziente:
        db.delete(db_paziente)
        db.commit()
        return True
    return False


# --- CRUD DOTTORI ---
def get_dottore_by_email_or_cf(db: Session, identificativo: str):
    return db.query(models.Dottore).filter(
        or_(
            models.Dottore.email == identificativo,
            models.Dottore.codice_fiscale == identificativo
        )
    ).first()

def get_dottore_by_id(db: Session, dottore_id: int):
    return db.query(models.Dottore).filter(models.Dottore.id == dottore_id).first()

def authenticate_dottore(db: Session, credenziali: schemas.DottoreLogin):
    identificativo = getattr(credenziali, 'identificativo', getattr(credenziali, 'email', None))
    dottore = get_dottore_by_email_or_cf(db, identificativo)
    if not dottore:
        return None
    if not verify_password(credenziali.password, dottore.password):
        return None
    return dottore

def get_dottori(db: Session, skip: int = 0, limit: int = 100):
    return db.query(models.Dottore).offset(skip).limit(limit).all()

def get_dottori_attivi(db: Session):
    return db.query(models.Dottore).filter(models.Dottore.attivo == True).all()

def create_dottore(db: Session, dottore: schemas.DottoreCreate):
    cf_val = dottore.codice_fiscale or "BNCRRT80A01F205X"
    raw_pwd = dottore.password or "Dottore2026!"
    hashed_pwd = hash_password(raw_pwd)
    
    db_dottore = models.Dottore(
        nome=dottore.nome,
        cognome=dottore.cognome,
        codice_fiscale=cf_val,
        specializzazione=dottore.specializzazione,
        email=dottore.email,
        telefono=dottore.telefono,
        password=hashed_pwd,
        attivo=True
    )
    db.add(db_dottore)
    db.commit()
    db.refresh(db_dottore)
    return db_dottore

def change_dottore_password(db: Session, dottore_id: int, old_password: str, new_password: str) -> str:
    dottore = get_dottore_by_id(db, dottore_id)
    if not dottore:
        return "NOT_FOUND"
    if not verify_password(old_password, dottore.password):
        return "WRONG_PASSWORD"
    
    dottore.password = hash_password(new_password)
    db.commit()
    return "OK"

def update_dottore(db: Session, dottore_id: int, dottore_data: schemas.DottoreUpdate):
    db_dottore = get_dottore_by_id(db, dottore_id)
    if not db_dottore:
        return None
    
    update_data = dottore_data.model_dump(exclude_unset=True) if hasattr(dottore_data, 'model_dump') else dottore_data.dict(exclude_unset=True)
    if "password" in update_data and update_data["password"]:
        update_data["password"] = hash_password(update_data["password"])
        
    for key, value in update_data.items():
        setattr(db_dottore, key, value)
        
    db.commit()
    db.refresh(db_dottore)
    return db_dottore

def delete_dottore(db: Session, dottore_id: int):
    db_dottore = get_dottore_by_id(db, dottore_id)
    if db_dottore:
        db.delete(db_dottore)
        db.commit()
        return True
    return False

def get_pazienti_by_dottore(db: Session, dottore_id: int):
    prenotazioni = db.query(models.Prenotazione).filter(models.Prenotazione.dottore_id == dottore_id).all()
    pazienti_dict = {}
    for pr in prenotazioni:
        p = pr.paziente
        if p and p.id not in pazienti_dict:
            pazienti_dict[p.id] = {
                "id": p.id,
                "nome": p.nome,
                "cognome": p.cognome,
                "codice_fiscale": p.codice_fiscale,
                "email": p.email,
                "telefono": p.telefono
            }
    return list(pazienti_dict.values())


# --- CRUD PRENOTAZIONI ---
def get_prenotazione(db: Session, prenotazione_id: int):
    return db.query(models.Prenotazione).filter(models.Prenotazione.id == prenotazione_id).first()

def get_prenotazioni(db: Session, skip: int = 0, limit: int = 100):
    return db.query(models.Prenotazione).offset(skip).limit(limit).all()

def create_prenotazione(db: Session, prenotazione: schemas.PrenotazioneCreate):
    db_prenotazione = models.Prenotazione(
        paziente_id=prenotazione.paziente_id,
        dottore_id=prenotazione.dottore_id,
        specializzazione=prenotazione.specializzazione,
        data_ora=prenotazione.data_ora,
        note=prenotazione.note,
        stato=prenotazione.stato or "In attesa di conferma"
    )
    db.add(db_prenotazione)
    db.commit()
    db.refresh(db_prenotazione)
    return db_prenotazione

def get_prenotazioni_by_paziente(db: Session, paziente_id: int):
    return db.query(models.Prenotazione).filter(models.Prenotazione.paziente_id == paziente_id).all()

def get_prenotazioni_by_dottore(db: Session, dottore_id: int):
    return db.query(models.Prenotazione).filter(models.Prenotazione.dottore_id == dottore_id).all()

def update_prenotazione(db: Session, prenotazione_id: int, prenotazione_data: schemas.PrenotazioneUpdate):
    db_prenotazione = get_prenotazione(db, prenotazione_id)
    if not db_prenotazione:
        return None

    update_data = prenotazione_data.model_dump(exclude_unset=True) if hasattr(prenotazione_data, 'model_dump') else prenotazione_data.dict(exclude_unset=True)
    for key, value in update_data.items():
        setattr(db_prenotazione, key, value)

    db.commit()
    db.refresh(db_prenotazione)
    return db_prenotazione

def update_stato_prenotazione(db: Session, prenotazione_id: int, nuovo_stato: str):
    db_prenotazione = get_prenotazione(db, prenotazione_id)
    if db_prenotazione:
        db_prenotazione.stato = nuovo_stato
        db.commit()
        db.refresh(db_prenotazione)
        return db_prenotazione
    return None

def delete_prenotazione(db: Session, prenotazione_id: int):
    db_prenotazione = get_prenotazione(db, prenotazione_id)
    if db_prenotazione:
        db.delete(db_prenotazione)
        db.commit()
        return True
    return False


# --- CRUD VETRINA & KPI ---
def get_vetrina_settings(db: Session) -> models.ImpostazioneVetrina:
    vetrina = db.query(models.ImpostazioneVetrina).first()
    if not vetrina:
        vetrina = models.ImpostazioneVetrina(
            kpi1_numero="15.000+",
            kpi1_label="Pazienti Assistiti",
            kpi2_numero="98%",
            kpi2_label="Soddisfazione Pazienti",
            kpi3_numero="< 48h",
            kpi3_label="Tempo Medio di Accesso",
            kpi4_numero="100%",
            kpi4_label="Refertazione Digitale",
            orari_apertura="Lun-Ven: 08:00 - 20:00 | Sab: 08:30 - 14:00",
            telefono_contatto="+39 081 123 4567",
            email_contatto="info@nexihealth.it"
        )
        db.add(vetrina)
        db.commit()
        db.refresh(vetrina)
    return vetrina

def update_vetrina_settings(db: Session, dati: schemas.VetrinaUpdate) -> models.ImpostazioneVetrina:
    vetrina = get_vetrina_settings(db)
    update_data = dati.model_dump(exclude_unset=True) if hasattr(dati, 'model_dump') else dati.dict(exclude_unset=True)
    for key, value in update_data.items():
        setattr(vetrina, key, value)
    db.commit()
    db.refresh(vetrina)
    return vetrina