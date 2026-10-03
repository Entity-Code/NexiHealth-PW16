from contextlib import asynccontextmanager
from fastapi import FastAPI, Depends, HTTPException, Header, status
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session
from typing import Optional

import models
import schemas
import crud
from database import engine, get_db, SessionLocal
from routers import auth, pazienti, dottori, prenotazioni, vetrina

models.Base.metadata.create_all(bind=engine)

@asynccontextmanager
async def lifespan(app: FastAPI):
    db = SessionLocal()
    try:
        admin_esistente = db.query(models.Admin).filter(models.Admin.username == "admin").first()
        if not admin_esistente:
            admin = models.Admin(
                username="admin",
                nome="Admin",
                cognome="Sistema",
                email="admin@centromedico.it",
                password=crud.hash_password("Admin123")
            )
            db.add(admin)
            db.commit()
        crud.get_vetrina_settings(db)
    finally:
        db.close()
    
    yield

app = FastAPI(
    title="NexiHealth API",
    description="API RESTful modulare per la gestione di pazienti, medici, visite e vetrina clinica presso il centro medico NexiHealth.",
    version="2.0.0",
    lifespan=lifespan
)

# Registrazione Router Modulari
app.include_router(auth.router)
app.include_router(pazienti.router)
app.include_router(dottori.router)
app.include_router(prenotazioni.router)
app.include_router(vetrina.router)

# Gestione cambio password amministratore
def ottieni_utente_corrente(
    x_user_id: Optional[int] = Header(None, alias="X-User-ID"),
    x_user_role: Optional[str] = Header(None, alias="X-User-Role"),
    db: Session = Depends(get_db)
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

@app.put("/admin/{admin_id}/password", tags=["Admin"])
def cambia_password_admin(
    admin_id: int,
    dati_password: schemas.CambioPassword,
    db: Session = Depends(get_db),
    info_utente: Optional[dict] = Depends(ottieni_utente_corrente)
):
    if not info_utente or info_utente["ruolo"] != "admin" or info_utente["utente"].id != admin_id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Operazione non autorizzata.")

    esito = crud.change_admin_password(
        db,
        admin_id=admin_id,
        old_password=dati_password.old_password,
        new_password=dati_password.new_password
    )
    if esito == "NOT_FOUND":
        raise HTTPException(status_code=404, detail="Amministratore non trovato.")
    if esito == "WRONG_PASSWORD":
        raise HTTPException(status_code=400, detail="La vecchia password inserita non è corretta.")

    return {"messaggio": "Password amministratore aggiornata con successo."}

# Mount cartella frontend
app.mount("/static", StaticFiles(directory="frontend"), name="static")

@app.get("/", include_in_schema=False)
def read_index():
    return FileResponse("frontend/index.html")