from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Header, status
from sqlalchemy.orm import Session

import database
import crud
import schemas
import models

router = APIRouter(prefix="/prenotazioni", tags=["Prenotazioni"])

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

@router.post("/", response_model=schemas.PrenotazioneResponse, status_code=status.HTTP_201_CREATED)
def crea_prenotazione(prenotazione: schemas.PrenotazioneCreate, db: Session = Depends(database.get_db)):
    paziente_esistente = db.query(models.Paziente).filter(models.Paziente.id == prenotazione.paziente_id).first()
    if not paziente_esistente:
        raise HTTPException(
            status_code=404, 
            detail=f"Impossibile creare la prenotazione: il paziente con ID {prenotazione.paziente_id} non esiste."
        )
    return crud.create_prenotazione(db=db, prenotazione=prenotazione)

@router.get("/", response_model=List[schemas.PrenotazioneResponse])
def lista_prenotazioni(
    skip: int = 0, 
    limit: int = 100, 
    db: Session = Depends(database.get_db),
    admin = Depends(verifica_admin)
):
    return crud.get_prenotazioni(db, skip=skip, limit=limit)

@router.get("/{prenotazione_id}", response_model=schemas.PrenotazioneResponse)
def leggi_prenotazione(
    prenotazione_id: int, 
    db: Session = Depends(database.get_db),
    info_utente: Optional[dict] = Depends(ottieni_utente_corrente)
):
    db_prenotazione = crud.get_prenotazione(db, prenotazione_id=prenotazione_id)
    if db_prenotazione is None:
        raise HTTPException(status_code=404, detail="Prenotazione non trovata.")

    if not info_utente:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Accesso non autorizzato.")

    is_admin = info_utente["ruolo"] == "admin"
    is_owner = info_utente["ruolo"] == "paziente" and db_prenotazione.paziente_id == info_utente["utente"].id
    is_doctor = info_utente["ruolo"] == "dottore" and db_prenotazione.dottore_id == info_utente["utente"].id

    if not (is_admin or is_owner or is_doctor):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Accesso non autorizzato a questa prenotazione.")

    return db_prenotazione

@router.put("/{prenotazione_id}", response_model=schemas.PrenotazioneResponse)
def modifica_prenotazione(
    prenotazione_id: int, 
    prenotazione: schemas.PrenotazioneUpdate, 
    db: Session = Depends(database.get_db),
    info_utente: Optional[dict] = Depends(ottieni_utente_corrente)
):
    db_prenotazione = crud.get_prenotazione(db, prenotazione_id=prenotazione_id)
    if not db_prenotazione:
        raise HTTPException(status_code=404, detail="Prenotazione non trovata.")

    if not info_utente:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Operazione non autorizzata.")

    is_admin = info_utente["ruolo"] == "admin"
    is_owner = info_utente["ruolo"] == "paziente" and db_prenotazione.paziente_id == info_utente["utente"].id
    is_doctor = info_utente["ruolo"] == "dottore" and db_prenotazione.dottore_id == info_utente["utente"].id

    if not (is_admin or is_owner or is_doctor):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Operazione non autorizzata.")

    return crud.update_prenotazione(db, prenotazione_id=prenotazione_id, prenotazione_data=prenotazione)

@router.delete("/{prenotazione_id}")
def elimina_prenotazione(
    prenotazione_id: int, 
    db: Session = Depends(database.get_db),
    info_utente: Optional[dict] = Depends(ottieni_utente_corrente)
):
    db_prenotazione = crud.get_prenotazione(db, prenotazione_id=prenotazione_id)
    if not db_prenotazione:
        raise HTTPException(status_code=404, detail="Prenotazione non trovata.")

    if not info_utente:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Operazione non autorizzata.")

    is_admin = info_utente["ruolo"] == "admin"
    is_owner = info_utente["ruolo"] == "paziente" and db_prenotazione.paziente_id == info_utente["utente"].id

    if not (is_admin or is_owner):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Operazione non autorizzata.")

    crud.delete_prenotazione(db, prenotazione_id=prenotazione_id)
    return {"messaggio": f"Prenotazione {prenotazione_id} eliminata con successo."}

@router.patch("/{prenotazione_id}/stato", response_model=schemas.PrenotazioneResponse)
def cambia_stato_prenotazione(
    prenotazione_id: int,
    nuovo_stato: str,
    db: Session = Depends(database.get_db),
    info_utente: Optional[dict] = Depends(ottieni_utente_corrente)
):
    if not info_utente:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Utente non autenticato.")

    db_prenotazione = crud.get_prenotazione(db, prenotazione_id=prenotazione_id)
    if not db_prenotazione:
        raise HTTPException(status_code=404, detail="Prenotazione non trovata.")

    is_admin = info_utente["ruolo"] == "admin"
    is_doctor = info_utente["ruolo"] == "dottore" and db_prenotazione.dottore_id == info_utente["utente"].id

    if not (is_admin or is_doctor):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Operazione non autorizzata.")

    prenotazione_aggiornata = crud.update_stato_prenotazione(db, prenotazione_id=prenotazione_id, nuovo_stato=nuovo_stato)
    return prenotazione_aggiornata