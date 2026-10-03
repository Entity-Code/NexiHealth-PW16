from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Header, status
from sqlalchemy.orm import Session
from sqlalchemy.exc import IntegrityError

import database
import crud
import schemas
import models

router = APIRouter(prefix="/pazienti", tags=["Pazienti"])

# Dipendenza specifica per autenticazione e RBAC
def ottieni_utente_corrente(
    x_user_id: Optional[int] = Header(None, alias="X-User-ID"),
    x_user_role: Optional[str] = Header(None, alias="X-User-Role"),
    db: Session = Depends(database.get_db)
):
    if not x_user_id:
        return None
    if x_user_role == "admin":
        admin = db.query(models.Admin).filter(models.Admin.id == x_user_id).first()
        if admin:
            return {"utente": admin, "ruolo": "admin"}
    elif x_user_role == "paziente":
        paziente = crud.get_paziente(db, paziente_id=x_user_id)
        if paziente:
            return {"utente": paziente, "ruolo": "paziente"}
    elif x_user_role == "dottore":
        dottore = crud.get_dottore_by_id(db, dottore_id=x_user_id)
        if dottore:
            return {"utente": dottore, "ruolo": "dottore"}

    admin = db.query(models.Admin).filter(models.Admin.id == x_user_id).first()
    if admin:
        return {"utente": admin, "ruolo": "admin"}
    paziente = crud.get_paziente(db, paziente_id=x_user_id)
    if paziente:
        return {"utente": paziente, "ruolo": "paziente"}
    dottore = crud.get_dottore_by_id(db, dottore_id=x_user_id)
    if dottore:
        return {"utente": dottore, "ruolo": "dottore"}
    return None

def verifica_admin(info_utente: Optional[dict] = Depends(ottieni_utente_corrente)):
    if not info_utente or info_utente.get("ruolo") != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Accesso negato: operazione riservata agli amministratori."
        )
    return info_utente["utente"]

@router.post("/", response_model=schemas.PazienteResponse, status_code=status.HTTP_201_CREATED)
def crea_paziente(paziente: schemas.PazienteCreate, db: Session = Depends(database.get_db)):
    cf_pulito = (paziente.codice_fiscale or "").strip().upper()
    email_pulita = (paziente.email or "").strip().lower()

    if not cf_pulito:
        raise HTTPException(status_code=400, detail="Il Codice Fiscale è obbligatorio.")
    if not email_pulita:
        raise HTTPException(status_code=400, detail="L'indirizzo Email è obbligatorio.")

    if crud.get_paziente_by_cf(db, codice_fiscale=cf_pulito):
        raise HTTPException(status_code=400, detail="Attenzione: il Codice Fiscale inserito è già registrato nel sistema.")
    
    if crud.get_paziente_by_email(db, email=email_pulita):
        raise HTTPException(status_code=400, detail="Attenzione: l'indirizzo Email inserito è già associato a un altro account paziente.")

    try:
        return crud.create_paziente(db=db, paziente=paziente)
    except IntegrityError:
        db.rollback()
        raise HTTPException(status_code=400, detail="Errore di unicità: Codice Fiscale o Email già presenti nel database.")

@router.get("/", response_model=List[schemas.PazienteResponse])
def lista_pazienti(
    skip: int = 0, 
    limit: int = 100, 
    db: Session = Depends(database.get_db),
    admin = Depends(verifica_admin)
):
    return crud.get_pazienti(db, skip=skip, limit=limit)

@router.get("/{paziente_id}", response_model=schemas.PazienteResponse)
def leggi_paziente(
    paziente_id: int, 
    db: Session = Depends(database.get_db),
    info_utente: Optional[dict] = Depends(ottieni_utente_corrente)
):
    if not info_utente:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Utente non autenticato.")

    is_admin = info_utente["ruolo"] == "admin"
    is_owner = info_utente["ruolo"] == "paziente" and info_utente["utente"].id == paziente_id

    if not (is_admin or is_owner):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Accesso non autorizzato ai dati del paziente.")

    db_paziente = crud.get_paziente(db, paziente_id=paziente_id)
    if db_paziente is None:
        raise HTTPException(status_code=404, detail="Paziente non trovato.")
    return db_paziente

@router.get("/{paziente_id}/prenotazioni", response_model=List[schemas.PrenotazioneResponse])
def leggi_prenotazioni_paziente(
    paziente_id: int, 
    db: Session = Depends(database.get_db),
    info_utente: Optional[dict] = Depends(ottieni_utente_corrente)
):
    if not info_utente:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Utente non autenticato.")

    is_admin = info_utente["ruolo"] == "admin"
    is_owner = info_utente["ruolo"] == "paziente" and info_utente["utente"].id == paziente_id

    if not (is_admin or is_owner):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Accesso non autorizzato alle prenotazioni di questo paziente.")

    db_paziente = crud.get_paziente(db, paziente_id=paziente_id)
    if db_paziente is None:
        raise HTTPException(status_code=404, detail="Paziente non trovato.")
    return crud.get_prenotazioni_by_paziente(db, paziente_id=paziente_id)

@router.put("/{paziente_id}", response_model=schemas.PazienteResponse)
def modifica_paziente(
    paziente_id: int, 
    paziente: schemas.PazienteUpdate, 
    db: Session = Depends(database.get_db),
    info_utente: Optional[dict] = Depends(ottieni_utente_corrente)
):
    if not info_utente:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Utente non autenticato.")

    is_admin = info_utente["ruolo"] == "admin"
    is_owner = info_utente["ruolo"] == "paziente" and info_utente["utente"].id == paziente_id

    if not (is_admin or is_owner):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Operazione non autorizzata.")

    cf_pulito = (paziente.codice_fiscale or "").strip().upper()
    if cf_pulito:
        cf_duplicato = db.query(models.Paziente).filter(
            models.Paziente.codice_fiscale == cf_pulito,
            models.Paziente.id != paziente_id
        ).first()
        if cf_duplicato:
            raise HTTPException(status_code=400, detail="Attenzione: il Codice Fiscale inserito appartiene già ad un altro paziente.")

    email_pulita = (paziente.email or "").strip().lower()
    if email_pulita:
        email_duplicata = db.query(models.Paziente).filter(
            models.Paziente.email == email_pulita,
            models.Paziente.id != paziente_id
        ).first()
        if email_duplicata:
            raise HTTPException(status_code=400, detail="Attenzione: l'indirizzo Email inserito è già utilizzato da un altro paziente.")

    try:
        db_paziente = crud.update_paziente(db, paziente_id=paziente_id, paziente_data=paziente)
        if not db_paziente:
            raise HTTPException(status_code=404, detail="Paziente non trovato.")
        return db_paziente
    except IntegrityError:
        db.rollback()
        raise HTTPException(status_code=400, detail="Errore di unicità: Codice Fiscale o Email duplicati.")

@router.put("/{paziente_id}/password")
def cambia_password(
    paziente_id: int,
    dati_password: schemas.CambioPassword,
    db: Session = Depends(database.get_db),
    info_utente: Optional[dict] = Depends(ottieni_utente_corrente)
):
    if not info_utente or info_utente["ruolo"] != "paziente" or info_utente["utente"].id != paziente_id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Operazione non autorizzata.")

    esito = crud.change_password(
        db, 
        paziente_id=paziente_id, 
        old_password=dati_password.old_password, 
        new_password=dati_password.new_password
    )
    if esito == "NOT_FOUND":
        raise HTTPException(status_code=404, detail="Paziente non trovato.")
    if esito == "WRONG_PASSWORD":
        raise HTTPException(status_code=400, detail="La vecchia password inserita non è corretta.")

    return {"messaggio": "Password aggiornata con successo."}

@router.delete("/{paziente_id}")
def elimina_paziente(
    paziente_id: int, 
    db: Session = Depends(database.get_db),
    admin = Depends(verifica_admin)
):
    successo = crud.delete_paziente(db, paziente_id=paziente_id)
    if not successo:
        raise HTTPException(status_code=404, detail="Paziente non trovato.")
    return {"messaggio": f"Paziente {paziente_id} eliminato con successo."}