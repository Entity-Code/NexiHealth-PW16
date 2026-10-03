from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import Optional

import database
import crud
import schemas
import models

router = APIRouter(tags=["Autenticazione"])

@router.post("/login", response_model=schemas.PazienteResponse)
def login_paziente(credenziali: schemas.PazienteLogin, db: Session = Depends(database.get_db)):
    paziente = crud.authenticate_paziente(db, credenziali=credenziali)
    if not paziente:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Codice fiscale/Email o password non validi."
        )
    return paziente

@router.post("/dottori/login", response_model=schemas.DottoreResponse)
def login_dottore(credenziali: schemas.DottoreLogin, db: Session = Depends(database.get_db)):
    dottore = crud.authenticate_dottore(db, credenziali=credenziali)
    if not dottore:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Codice fiscale/Email o password del dottore non validi."
        )
    return dottore

@router.post("/admin/login", response_model=schemas.AdminResponse)
def login_admin(credenziali: schemas.AdminLogin, db: Session = Depends(database.get_db)):
    admin = crud.authenticate_admin(db, credenziali=credenziali)
    if not admin:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Username o password amministratore non validi."
        )
    return admin