from sqlalchemy.orm import Session
from database import SessionLocal, engine, Base
import models
import crud
from schemas import AdminCreate, PazienteCreate, DottoreCreate, PrenotazioneCreate
from datetime import datetime, timedelta

def reset_and_seed_db():
    print("Inizializzazione del Database...")
    
    # Ricrea le tabelle da zero per applicare la nuova struttura
    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)

    db: Session = SessionLocal()

    try:
        print("1. Creazione Utente Amministratore...")
        crud.create_admin(db, AdminCreate(
            username="admin",
            nome="Admin",
            cognome="Sistema",
            email="admin@centromedico.it",
            password="Admin123"
        ))

        print("2. Inserimento Dottori di Test...")
        dottore_1 = crud.create_dottore(db, DottoreCreate(
            nome="Roberto",
            cognome="Bianchi",
            codice_fiscale="BNCRBR75A01F205Z",
            email="r.bianchi@nexihealth.it",
            specializzazione="Cardiologia",
            telefono="3331112233",
            password="Dottore123!"
        ))

        dottore_2 = crud.create_dottore(db, DottoreCreate(
            nome="Elena",
            cognome="Verdi",
            codice_fiscale="VRDLNE82M12F205Y",
            email="e.verdi@nexihealth.it",
            specializzazione="Dermatologia",
            telefono="3334445566",
            password="Dottore123!"
        ))

        dottore_3 = crud.create_dottore(db, DottoreCreate(
            nome="Marco",
            cognome="Neri",
            codice_fiscale="NREMRC80A01F205K",
            email="m.neri@nexihealth.it",
            specializzazione="Ortopedia",
            telefono="3337778899",
            password="Dottore123!"
        ))

        print("3. Inserimento Pazienti di Test...")
        paziente_1 = crud.create_paziente(db, PazienteCreate(
            nome="Mario",
            cognome="Rossi",
            codice_fiscale="RSSMRA80A01F205X",
            email="mario.rossi@email.it",
            telefono="3201234567",
            password="Password123!"
        ))

        paziente_2 = crud.create_paziente(db, PazienteCreate(
            nome="Giulia",
            cognome="Bianchi",
            codice_fiscale="BNCGLI92E45F205Z",
            email="giulia.bianchi@email.it",
            telefono="3209876543",
            password="Password123!"
        ))

        paziente_3 = crud.create_paziente(db, PazienteCreate(
            nome="Luca",
            cognome="Verdi",
            codice_fiscale="VRDLCU88M12F205Y",
            email="luca.verdi@email.it",
            telefono="3205556677",
            password="Password123!"
        ))

        paziente_4 = crud.create_paziente(db, PazienteCreate(
            nome="Sara",
            cognome="Esposito",
            codice_fiscale="SPSSRA95A41F205J",
            email="sara.esposito@email.it",
            telefono="3401122334",
            password="Password123!"
        ))

        paziente_5 = crud.create_paziente(db, PazienteCreate(
            nome="Davide",
            cognome="Romano",
            codice_fiscale="RMNDVD85T15F205M",
            email="davide.romano@email.it",
            telefono="3499988776",
            password="Password123!"
        ))

        paziente_6 = crud.create_paziente(db, PazienteCreate(
            nome="Chiara",
            cognome="Ferrari",
            codice_fiscale="FRRCHR91D55F205W",
            email="chiara.ferrari@email.it",
            telefono="3385544332",
            password="Password123!"
        ))

        print("4. Inserimento Prenotazioni di Test con stati differenziati...")
        ora_base = datetime.now()

        # Visite Dr. Roberto Bianchi (Cardiologia)
        crud.create_prenotazione(db, PrenotazioneCreate(
            paziente_id=paziente_1.id,
            dottore_id=dottore_1.id,
            specializzazione=dottore_1.specializzazione,
            data_ora=(ora_base + timedelta(days=1)).replace(hour=9, minute=30, second=0, microsecond=0),
            stato="In attesa di conferma",
            note="Prima visita per controllo pressione arteriosa"
        ))

        crud.create_prenotazione(db, PrenotazioneCreate(
            paziente_id=paziente_4.id,
            dottore_id=dottore_1.id,
            specializzazione=dottore_1.specializzazione,
            data_ora=(ora_base + timedelta(days=2)).replace(hour=11, minute=0, second=0, microsecond=0),
            stato="Confermata",
            note="Elettrocardiogramma di routine"
        ))

        crud.create_prenotazione(db, PrenotazioneCreate(
            paziente_id=paziente_1.id,
            dottore_id=dottore_1.id,
            specializzazione=dottore_1.specializzazione,
            data_ora=(ora_base - timedelta(days=10)).replace(hour=10, minute=0, second=0, microsecond=0),
            stato="Completata",
            note="Visita di controllo annuale regolarmente conclusa"
        ))

        # Visite Dr.ssa Elena Verdi (Dermatologia)
        crud.create_prenotazione(db, PrenotazioneCreate(
            paziente_id=paziente_2.id,
            dottore_id=dottore_2.id,
            specializzazione=dottore_2.specializzazione,
            data_ora=(ora_base + timedelta(days=2)).replace(hour=10, minute=30, second=0, microsecond=0),
            stato="In attesa di conferma",
            note="Mappatura preventiva dei nei"
        ))

        crud.create_prenotazione(db, PrenotazioneCreate(
            paziente_id=paziente_5.id,
            dottore_id=dottore_2.id,
            specializzazione=dottore_2.specializzazione,
            data_ora=(ora_base + timedelta(days=3)).replace(hour=15, minute=30, second=0, microsecond=0),
            stato="Confermata",
            note="Controllo dermatite allergica da contatto"
        ))

        crud.create_prenotazione(db, PrenotazioneCreate(
            paziente_id=paziente_6.id,
            dottore_id=dottore_2.id,
            specializzazione=dottore_2.specializzazione,
            data_ora=(ora_base - timedelta(days=4)).replace(hour=12, minute=0, second=0, microsecond=0),
            stato="Annullata",
            note="Paziente impossibilitato per imprevisto lavorativo"
        ))

        # Visite Dr. Marco Neri (Ortopedia)
        crud.create_prenotazione(db, PrenotazioneCreate(
            paziente_id=paziente_3.id,
            dottore_id=dottore_3.id,
            specializzazione=dottore_3.specializzazione,
            data_ora=(ora_base + timedelta(days=1)).replace(hour=16, minute=0, second=0, microsecond=0),
            stato="Confermata",
            note="Consulto per dolore articolare al ginocchio destro"
        ))

        crud.create_prenotazione(db, PrenotazioneCreate(
            paziente_id=paziente_6.id,
            dottore_id=dottore_3.id,
            specializzazione=dottore_3.specializzazione,
            data_ora=(ora_base + timedelta(days=4)).replace(hour=14, minute=30, second=0, microsecond=0),
            stato="In attesa di conferma",
            note="Valutazione post-traumatica spalla sinistra"
        ))

        crud.create_prenotazione(db, PrenotazioneCreate(
            paziente_id=paziente_2.id,
            dottore_id=dottore_3.id,
            specializzazione=dottore_3.specializzazione,
            data_ora=(ora_base - timedelta(days=20)).replace(hour=17, minute=0, second=0, microsecond=0),
            stato="Completata",
            note="Follow-up riabilitativo post rimozione gesso"
        ))

        print("Popolamento del database completato con successo!")

    except Exception as e:
        print(f"Errore durante il seeding del DB: {e}")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    reset_and_seed_db()