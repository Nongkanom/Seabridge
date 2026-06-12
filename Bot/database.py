import os
from dotenv import load_dotenv
from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker
from sqlalchemy.orm import declarative_base, Mapped, mapped_column
from sqlalchemy import String, Integer, Text

load_dotenv()
DATABASE_URL = os.getenv("DATABASE_URL")

if not DATABASE_URL:
    raise ValueError("❌ DATABASE_URL not found. Please check your Environment Variables.")

Base = declarative_base()

class Task(Base):
    __tablename__ = "tasks"
    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    user_id: Mapped[str] = mapped_column(Text)
    assigned_to: Mapped[str] = mapped_column(Text)
    task_name: Mapped[str] = mapped_column(Text)
    due_date: Mapped[str] = mapped_column(Text)
    status: Mapped[str] = mapped_column(String(50))

class Backlog(Base):
    __tablename__ = "backlogs"
    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    message: Mapped[str] = mapped_column(Text)
    created_at: Mapped[str] = mapped_column(Text)

engine = create_async_engine(
    DATABASE_URL, 
    echo=False,
    connect_args={
        "statement_cache_size": 0,          
        "prepared_statement_cache_size": 0, 
    }
)
AsyncSessionLocal = async_sessionmaker(bind=engine, expire_on_commit=False)