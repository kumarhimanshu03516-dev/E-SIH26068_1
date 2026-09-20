from sqlalchemy import Column, String, Text
from app.db.database import Base


class UserPrefs(Base):
    __tablename__ = "user_prefs"

    key = Column(String, primary_key=True, index=True)
    value = Column(Text, nullable=False)