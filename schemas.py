from pydantic import BaseModel
from datetime import datetime
from typing import Optional, List

# --- ADMIN SCHEMAS ---
class AdminBase(BaseModel):
    username: str
    nome: Optional[str] = "Admin"
    cognome: Optional[str] = "Sistema"
    email: Optional[str] = None

class AdminCreate(AdminBase):
    password: str

class AdminResponse(AdminBase):
    id: int
    attivo: Optional[bool] = True

    class Config:
        from_attributes = True


# --- PAZIENTE SCHEMAS ---
class PazienteBase(BaseModel):
    codice_fiscale: str
    nome: str
    cognome: str
    email: str
    telefono: Optional[str] = None
    indirizzo: Optional[str] = None

class PazienteCreate(PazienteBase):
    password: str

class PazienteUpdate(BaseModel):
    codice_fiscale: Optional[str] = None
    nome: Optional[str] = None
    cognome: Optional[str] = None
    email: Optional[str] = None
    telefono: Optional[str] = None
    indirizzo: Optional[str] = None
    password: Optional[str] = None

class PazienteResponse(PazienteBase):
    id: int

    class Config:
        from_attributes = True

Paziente = PazienteResponse


# --- DOTTORE SCHEMAS ---
class DottoreBase(BaseModel):
    nome: str
    cognome: str
    codice_fiscale: Optional[str] = None
    specializzazione: str
    email: Optional[str] = None
    telefono: Optional[str] = None

class DottoreCreate(DottoreBase):
    password: Optional[str] = "Dottore123!"

class DottoreResponse(DottoreBase):
    id: int
    attivo: bool = True

    class Config:
        from_attributes = True

class DottoreUpdate(BaseModel):
    nome: Optional[str] = None
    cognome: Optional[str] = None
    codice_fiscale: Optional[str] = None
    specializzazione: Optional[str] = None
    email: Optional[str] = None
    telefono: Optional[str] = None
    password: Optional[str] = None


# --- PRENOTAZIONE SCHEMAS ---
class PrenotazioneBase(BaseModel):
    paziente_id: int
    dottore_id: int
    specializzazione: str
    data_ora: datetime
    note: Optional[str] = None
    stato: Optional[str] = "In attesa di conferma"

class PrenotazioneCreate(PrenotazioneBase):
    pass

class PrenotazioneUpdate(BaseModel):
    paziente_id: Optional[int] = None
    dottore_id: Optional[int] = None
    specializzazione: Optional[str] = None
    data_ora: Optional[datetime] = None
    note: Optional[str] = None
    stato: Optional[str] = None

class PrenotazioneResponse(PrenotazioneBase):
    id: int
    paziente: Optional[PazienteResponse] = None
    dottore: Optional[DottoreResponse] = None

    class Config:
        from_attributes = True

Prenotazione = PrenotazioneResponse


# --- AUTH & PASSWORD SCHEMAS ---
class AdminLogin(BaseModel):
    identificativo: str
    password: str

class PazienteLogin(BaseModel):
    identificativo: str
    password: str

class DottoreLogin(BaseModel):
    identificativo: str
    password: str

class CambioPassword(BaseModel):
    old_password: str
    new_password: str


# --- SCHEMI VETRINA & KPI ---
class VetrinaBase(BaseModel):
    kpi1_numero: str
    kpi1_label: str
    kpi2_numero: str
    kpi2_label: str
    kpi3_numero: str
    kpi3_label: str
    kpi4_numero: str
    kpi4_label: str
    orari_apertura: Optional[str] = None
    telefono_contatto: Optional[str] = None
    email_contatto: Optional[str] = None

class VetrinaUpdate(VetrinaBase):
    pass

class VetrinaResponse(VetrinaBase):
    id: int

    class Config:
        from_attributes = True