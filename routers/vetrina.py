from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Header, status
from sqlalchemy.orm import Session

import database
import crud
import schemas
import models

router = APIRouter(prefix="/vetrina", tags=["Vetrina"])

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
    admin = db.query(models.Admin).filter(models.Admin.id == x_user_id).first()
    if admin:
        return {"utente": admin, "ruolo": "admin"}
    return None

def verifica_admin(info_utente: Optional[dict] = Depends(ottieni_utente_corrente)):
    if not info_utente or info_utente.get("ruolo") != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Accesso negato: operazione riservata agli amministratori."
        )
    return info_utente["utente"]

@router.get("/", response_model=schemas.VetrinaResponse)
def leggi_impostazioni_vetrina(db: Session = Depends(database.get_db)):
    return crud.get_vetrina_settings(db)

@router.put("/", response_model=schemas.VetrinaResponse)
def aggiorna_impostazioni_vetrina(
    dati: schemas.VetrinaUpdate,
    db: Session = Depends(database.get_db),
    admin = Depends(verifica_admin),
    x_user_id: Optional[int] = Header(None, alias="X-User-ID"),
    x_user_role: Optional[str] = Header(None, alias="X-User-Role")
):
    return crud.update_vetrina_settings(db, dati=dati)