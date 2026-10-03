from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Header, status
from sqlalchemy.orm import Session
from sqlalchemy.exc import IntegrityError

import database
import crud
import schemas
import models

router = APIRouter(prefix="/dottori", tags=["Dottori"])

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
    elif x_user_role == "dottore":
        dottore = crud.get_dottore_by_id(db, dottore_id=x_user_id)
        if dottore:
            return {"utente": dottore, "ruolo": "dottore"}
    elif x_user_role == "paziente":
        paziente = crud.get_paziente(db, paziente_id=x_user_id)
        if paziente:
            return {"utente": paziente, "ruolo": "paziente"}

    admin = db.query(models.Admin).filter(models.Admin.id == x_user_id).first()
    if admin:
        return {"utente": admin, "ruolo": "admin"}
    dottore = crud.get_dottore_by_id(db, dottore_id=x_user_id)
    if dottore:
        return {"utente": dottore, "ruolo": "dottore"}
    paziente = crud.get_paziente(db, paziente_id=x_user_id)
    if paziente:
        return {"utente": paziente, "ruolo": "paziente"}
    return None

def verifica_admin(info_utente: Optional[dict] = Depends(ottieni_utente_corrente)):
    if not info_utente or info_utente.get("ruolo") != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Accesso negato: operazione riservata agli amministratori."
        )
    return info_utente["utente"]

@router.get("/", response_model=List[schemas.DottoreResponse])
def lista_dottori(skip: int = 0, limit: int = 100, db: Session = Depends(database.get_db)):
    return crud.get_dottori(db, skip=skip, limit=limit)

@router.get("/attivi", response_model=List[schemas.DottoreResponse])
def lista_dottori_attivi(db: Session = Depends(database.get_db)):
    return crud.get_dottori_attivi(db)

@router.post("/", response_model=schemas.DottoreResponse, status_code=status.HTTP_201_CREATED)
def crea_dottore(
    dottore: schemas.DottoreCreate, 
    db: Session = Depends(database.get_db), 
    admin = Depends(verifica_admin),
    x_user_id: Optional[int] = Header(None, alias="X-User-ID"),
    x_user_role: Optional[str] = Header(None, alias="X-User-Role")
):
    cf_pulito = (dottore.codice_fiscale or "").strip().upper()
    email_pulita = (dottore.email or "").strip().lower()

    if not cf_pulito:
        raise HTTPException(status_code=400, detail="Il campo Codice Fiscale è obbligatorio.")
    if not email_pulita:
        raise HTTPException(status_code=400, detail="Il campo Email è obbligatorio.")

    cf_esistente = db.query(models.Dottore).filter(models.Dottore.codice_fiscale == cf_pulito).first()
    if cf_esistente:
        raise HTTPException(status_code=400, detail=f"Attenzione: il Codice Fiscale '{cf_pulito}' è già assegnato a un altro medico.")
    
    email_esistente = db.query(models.Dottore).filter(models.Dottore.email == email_pulita).first()
    if email_esistente:
        raise HTTPException(status_code=400, detail=f"Attenzione: l'indirizzo Email '{email_pulita}' è già registrato per un altro medico.")

    try:
        return crud.create_dottore(db=db, dottore=dottore)
    except IntegrityError:
        db.rollback()
        raise HTTPException(status_code=400, detail="Errore di duplicazione: Codice Fiscale o Email già esistenti nel database.")

@router.put("/{dottore_id}", response_model=schemas.DottoreResponse)
def modifica_dottore(
    dottore_id: int, 
    dottore: schemas.DottoreUpdate, 
    db: Session = Depends(database.get_db),
    admin = Depends(verifica_admin),
    x_user_id: Optional[int] = Header(None, alias="X-User-ID"),
    x_user_role: Optional[str] = Header(None, alias="X-User-Role")
):
    cf_pulito = (dottore.codice_fiscale or "").strip().upper()
    if cf_pulito:
        cf_duplicato = db.query(models.Dottore).filter(
            models.Dottore.codice_fiscale == cf_pulito,
            models.Dottore.id != dottore_id
        ).first()
        if cf_duplicato:
            raise HTTPException(status_code=400, detail=f"Attenzione: il Codice Fiscale '{cf_pulito}' appartiene già ad un altro medico.")

    email_pulita = (dottore.email or "").strip().lower()
    if email_pulita:
        email_duplicata = db.query(models.Dottore).filter(
            models.Dottore.email == email_pulita,
            models.Dottore.id != dottore_id
        ).first()
        if email_duplicata:
            raise HTTPException(status_code=400, detail=f"Attenzione: l'Email '{email_pulita}' appartiene già ad un altro medico.")

    try:
        db_dottore = crud.update_dottore(db, dottore_id=dottore_id, dottore_data=dottore)
        if not db_dottore:
            raise HTTPException(status_code=404, detail="Dottore non trovato.")
        return db_dottore
    except IntegrityError:
        db.rollback()
        raise HTTPException(status_code=400, detail="Errore di unicità: Codice Fiscale o Email già registrati.")

@router.delete("/{dottore_id}")
def elimina_dottore(
    dottore_id: int, 
    db: Session = Depends(database.get_db),
    admin = Depends(verifica_admin),
    x_user_id: Optional[int] = Header(None, alias="X-User-ID"),
    x_user_role: Optional[str] = Header(None, alias="X-User-Role")
):
    successo = crud.delete_dottore(db, dottore_id=dottore_id)
    if not successo:
        raise HTTPException(status_code=404, detail="Dottore non trovato.")
    return {"messaggio": f"Dottore {dottore_id} eliminato con successo."}

@router.get("/{dottore_id}/dettaglio")
def leggi_dettaglio_dottore(
    dottore_id: int, 
    db: Session = Depends(database.get_db),
    admin = Depends(verifica_admin),
    x_user_id: Optional[int] = Header(None, alias="X-User-ID"),
    x_user_role: Optional[str] = Header(None, alias="X-User-Role")
):
    db_dottore = crud.get_dottore_by_id(db, dottore_id=dottore_id)
    if not db_dottore:
        raise HTTPException(status_code=404, detail="Dottore non trovato.")
    
    prenotazioni = crud.get_prenotazioni_by_dottore(db, dottore_id=dottore_id)
    
    return {
        "dottore": db_dottore,
        "prenotazioni": prenotazioni
    }

@router.get("/{dottore_id}/prenotazioni", response_model=List[schemas.PrenotazioneResponse])
def leggi_prenotazioni_dottore(
    dottore_id: int, 
    db: Session = Depends(database.get_db),
    info_utente: Optional[dict] = Depends(ottieni_utente_corrente)
):
    if not info_utente:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Utente non autenticato.")

    is_admin = info_utente["ruolo"] == "admin"
    is_owner = info_utente["ruolo"] == "dottore" and info_utente["utente"].id == dottore_id

    if not (is_admin or is_owner):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Accesso non autorizzato alle prenotazioni di questo dottore.")

    db_dottore = crud.get_dottore_by_id(db, dottore_id=dottore_id)
    if db_dottore is None:
        raise HTTPException(status_code=404, detail="Dottore non trovato.")
    return crud.get_prenotazioni_by_dottore(db, dottore_id=dottore_id)

@router.put("/{dottore_id}/password")
def cambia_password_dottore(
    dottore_id: int,
    dati_password: schemas.CambioPassword,
    db: Session = Depends(database.get_db),
    info_utente: Optional[dict] = Depends(ottieni_utente_corrente)
):
    if not info_utente or info_utente["ruolo"] != "dottore" or info_utente["utente"].id != dottore_id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Operazione non autorizzata.")

    esito = crud.change_dottore_password(
        db,
        dottore_id=dottore_id,
        old_password=dati_password.old_password,
        new_password=dati_password.new_password
    )
    if esito == "NOT_FOUND":
        raise HTTPException(status_code=404, detail="Dottore non trovato.")
    if esito == "WRONG_PASSWORD":
        raise HTTPException(status_code=400, detail="La vecchia password inserita non è corretta.")

    return {"messaggio": "Password dottore aggiornata con successo."}

@router.get("/{dottore_id}/pazienti")
def lista_pazienti_dottore(
    dottore_id: int,
    db: Session = Depends(database.get_db),
    info_utente: Optional[dict] = Depends(ottieni_utente_corrente)
):
    if not info_utente:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Utente non autenticato.")

    is_admin = info_utente["ruolo"] == "admin"
    is_owner = info_utente["ruolo"] == "dottore" and info_utente["utente"].id == dottore_id

    if not (is_admin or is_owner):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Accesso non autorizzato.")

    return crud.get_pazienti_by_dottore(db, dottore_id=dottore_id)

@router.get("/{dottore_id}/pazienti/{paziente_id}/dettaglio")
def dettaglio_paziente_dottore(
    dottore_id: int,
    paziente_id: int,
    db: Session = Depends(database.get_db),
    info_utente: Optional[dict] = Depends(ottieni_utente_corrente)
):
    if not info_utente:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Utente non autenticato.")

    is_admin = info_utente["ruolo"] == "admin"
    is_owner = info_utente["ruolo"] == "dottore" and info_utente["utente"].id == dottore_id

    if not (is_admin or is_owner):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Accesso non autorizzato.")

    paziente = crud.get_paziente(db, paziente_id=paziente_id)
    if not paziente:
        raise HTTPException(status_code=404, detail="Paziente non trovato.")

    prenotazioni = db.query(models.Prenotazione).filter(
        models.Prenotazione.dottore_id == dottore_id,
        models.Prenotazione.paziente_id == paziente_id
    ).all()

    return {
        "paziente": paziente,
        "prenotazioni": prenotazioni
    }