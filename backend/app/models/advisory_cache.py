from sqlalchemy import Column, String, Text, Integer
from app.db.database import Base


class AdvisoryCache(Base):
    __tablename__ = "advisory_cache"

    key = Column(String, primary_key=True, index=True)
    data = Column(Text, nullable=False)
    fetched_at = Column(Integer, nullable=False)
    expires_at = Column(Integer, nullable=False)