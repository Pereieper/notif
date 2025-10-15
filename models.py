from sqlalchemy import Column, Integer, String, Text, ForeignKey, DateTime, Boolean
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from database import Base

# ---------------- User Table ----------------
class UserDB(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    first_name = Column(String, nullable=False)
    middle_name = Column(String, nullable=True)
    last_name = Column(String, nullable=False)
    dob = Column(DateTime, nullable=False)
    gender = Column(String, nullable=False)
    civil_status = Column(String, nullable=False)
    contact = Column(String, unique=True, index=True, nullable=False)
    purok = Column(String, nullable=False)
    barangay = Column(String, nullable=False)
    city = Column(String, nullable=False)
    province = Column(String, nullable=False)
    postal_code = Column(String, nullable=False)
    password = Column(String, nullable=False)
    photo = Column(Text, nullable=False)
    role = Column(String, nullable=False)
    status = Column(String, default="Pending")

    # ✅ relationships
    document_requests = relationship("DocumentRequestDB", back_populates="user", cascade="all, delete-orphan")
    notifications = relationship("NotificationDB", back_populates="user", cascade="all, delete-orphan")


# ---------------- Document Requests Table ----------------
class DocumentRequestDB(Base):
    __tablename__ = "document_requests"

    id = Column(Integer, primary_key=True, index=True)
    document_type = Column(String, nullable=False)
    purpose = Column(String, nullable=False)
    copies = Column(Integer, nullable=False, default=1)
    requirements = Column(Text, default="")
    photo = Column(Text, nullable=True)
    status = Column(String, default="Pending")
    action = Column(String, default="Review")
    notes = Column(Text, default="")
    contact = Column(String, nullable=False, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)

    # ✅ timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)

    # ✅ pickup + soft delete
    pickup_date = Column(DateTime(timezone=True), nullable=True)
    is_deleted = Column(Boolean, default=False, nullable=False)
    deleted_at = Column(DateTime(timezone=True), nullable=True)

    # ✅ relationship
    user = relationship("UserDB", back_populates="document_requests")


# ---------------- Notifications Table ----------------
class NotificationDB(Base):
    __tablename__ = "notifications"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String(255), nullable=False)
    message = Column(Text, nullable=False)
    type = Column(String(50), default="info")
    is_read = Column(Boolean, default=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    user_id = Column(Integer, ForeignKey("users.id"), nullable=True)

    # ✅ back_populates (not backref)
    user = relationship("UserDB", back_populates="notifications")
