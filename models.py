from sqlalchemy import Column, Integer, String, Boolean, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from database import Base

class Admin(Base):
    __tablename__ = "admin"

    id = Column(Integer, primary_key=True, index=True)
    username = Column(String, unique=True, index=True, nullable=False)
    nome = Column(String, nullable=False)
    cognome = Column(String, nullable=False)
    email = Column(String, unique=True, index=True, nullable=False)
    password = Column(String, nullable=False)
    attivo = Column(Boolean, default=True)


class Paziente(Base):
    __tablename__ = "pazienti"

    id = Column(Integer, primary_key=True, index=True)
    nome = Column(String, nullable=False)
    cognome = Column(String, nullable=False)
    codice_fiscale = Column(String, unique=True, index=True, nullable=False)
    email = Column(String, nullable=False)
    telefono = Column(String, nullable=False)
    password = Column(String, nullable=False)

    # Relazione 1-a-N con Prenotazione (con eliminazione a cascata)
    prenotazioni = relationship("Prenotazione", back_populates="paziente", cascade="all, delete-orphan")


class Dottore(Base):
    __tablename__ = "dottori"

    id = Column(Integer, primary_key=True, index=True)
    nome = Column(String, nullable=False)
    cognome = Column(String, nullable=False)
    codice_fiscale = Column(String, unique=True, index=True, nullable=False)
    email = Column(String, unique=True, index=True, nullable=False)
    specializzazione = Column(String, nullable=False)
    telefono = Column(String, nullable=False)
    password = Column(String, nullable=False)
    attivo = Column(Boolean, default=True)

    # Relazione 1-a-N con Prenotazione
    prenotazioni = relationship("Prenotazione", back_populates="dottore")


class Prenotazione(Base):
    __tablename__ = "prenotazioni"

    id = Column(Integer, primary_key=True, index=True)
    paziente_id = Column(Integer, ForeignKey("pazienti.id"), nullable=False)
    dottore_id = Column(Integer, ForeignKey("dottori.id"), nullable=False)
    specializzazione = Column(String, nullable=False)
    data_ora = Column(DateTime, nullable=False)
    stato = Column(String, default="Confermata")
    note = Column(String, nullable=True)

    paziente = relationship("Paziente", back_populates="prenotazioni")
    dottore = relationship("Dottore", back_populates="prenotazioni")


class ImpostazioneVetrina(Base):
    __tablename__ = "impostazioni_vetrina"

    id = Column(Integer, primary_key=True, index=True)
    kpi1_numero = Column(String, default="15.000+")
    kpi1_label = Column(String, default="Pazienti Assistiti")
    kpi2_numero = Column(String, default="98%")
    kpi2_label = Column(String, default="Soddisfazione Pazienti")
    kpi3_numero = Column(String, default="< 48h")
    kpi3_label = Column(String, default="Tempo Medio di Accesso")
    kpi4_numero = Column(String, default="100%")
    kpi4_label = Column(String, default="Refertazione Digitale")
    orari_apertura = Column(String, default="Lun-Ven: 08:00 - 20:00 | Sab: 08:30 - 14:00")
    telefono_contatto = Column(String, default="+39 081 123 4567")
    email_contatto = Column(String, default="info@nexihealth.it")