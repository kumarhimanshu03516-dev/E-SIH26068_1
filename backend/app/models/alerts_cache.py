from sqlalchemy import Column, String, Text, Integer
from app.db.database import Base


class AlertsCache(Base):
    __tablename__ = "alerts_cache"

    id = Column(String, primary_key=True, index=True)
    data = Column(Text, nullable=False)
    severity = Column(String, nullable=False, index=True)
    area = Column(String, nullable=False, index=True)
    fetched_at = Column(Integer, nullable=False)
    expires_at = Column(Integer, nullable=False)