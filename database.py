# FILE che gestisce la connessione a SQLite
# importiamo i moduli necessari di sqlalchemy
from sqlalchemy import create_engine, event
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker

# definiamo l'url del database sqlite locale
# il file nexihealth.db verrà creato automaticamente nella cartella di progetto
SQLALCHEMY_DATABASE_URL = "sqlite:///./nexihealth.db"

# creiamo l'engine di connessione per sqlite
engine = create_engine(
    SQLALCHEMY_DATABASE_URL, connect_args={"check_same_thread": False}
)

# forziamo sqlite a rispettare i vincoli delle chiavi esterne (foreign key) ad ogni connessione
@event.listens_for(engine, "connect")
def set_sqlite_pragma(dbapi_connection, connection_record):
    cursor = dbapi_connection.cursor()
    cursor.execute("PRAGMA foreign_keys=ON")
    cursor.close()

# creiamo la sessione per interagire con il database
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# classe base per i modelli orm
Base = declarative_base()

# funzione di supporto per ottenere la sessione del database e chiuderla dopo l'uso
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()