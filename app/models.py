from sqlalchemy import Column, Integer, String
from database import Base

class Registration(Base):
    __tablename__ = "registrations"

    id = Column(Integer, primary_key=True, index=True)
    firstName = Column(String)
    middleName = Column(String)
    lastName = Column(String)
    dob = Column(String)
    gender = Column(String)
    civilStatus = Column(String)
    contact = Column(String)
    purok = Column(String)
    barangay = Column(String)
    city = Column(String)
    province = Column(String)
    postalCode = Column(String)
    photo = Column(String, nullable=True)
