from pydantic import BaseModel, Field, ConfigDict
from datetime import datetime, date
from typing import Optional


# ---------------- User Schema (for create) ----------------
class UserCreate(BaseModel):
    firstName: str
    middleName: Optional[str] = None
    lastName: str
    dob: date
    gender: str
    civilStatus: str
    contact: str
    purok: str
    barangay: str
    city: str
    province: str
    postalCode: str
    password: str
    photo: str
    role: str

    model_config = ConfigDict(from_attributes=True, populate_by_name=True)


# ---------------- User Login ----------------
class UserLogin(BaseModel):
    contact: str
    password: str


# ---------------- User Update ----------------
class UserUpdate(BaseModel):
    first_name: Optional[str] = None
    middle_name: Optional[str] = None
    last_name: Optional[str] = None
    status: Optional[str] = None
    role: Optional[str] = None

    model_config = ConfigDict(from_attributes=True, populate_by_name=True)


# ---------------- User Info Response ----------------
class UserInfoResponse(BaseModel):
    firstName: str = Field(..., alias="first_name")
    middleName: Optional[str] = Field(None, alias="middle_name")
    lastName: str = Field(..., alias="last_name")
    photo: Optional[str] = None

    model_config = ConfigDict(from_attributes=True, populate_by_name=True)


# ---------------- User Response (full) ----------------
class UserResponse(BaseModel):
    id: int
    firstName: str = Field(..., alias="first_name")
    middleName: Optional[str] = Field(None, alias="middle_name")
    lastName: str = Field(..., alias="last_name")
    dob: date
    gender: str
    civilStatus: str = Field(..., alias="civil_status")
    contact: str
    purok: str
    barangay: str
    city: str
    province: str
    postalCode: str = Field(..., alias="postal_code")
    photo: str
    role: str
    status: str

    model_config = ConfigDict(from_attributes=True, populate_by_name=True)


# ---------------- Document Request Schema ----------------
class DocumentRequest(BaseModel):
    documentType: str
    purpose: str
    copies: int = 1
    requirements: Optional[str] = None
    photo: Optional[str] = None
    contact: str
    notes: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)


# ---------------- Document Request Update ----------------
class DocumentRequestUpdate(BaseModel):
    documentType: Optional[str] = None
    purpose: Optional[str] = None
    copies: Optional[int] = None
    requirements: Optional[str] = None
    photo: Optional[str] = None
    notes: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)


# ---------------- Document Request Response ----------------
class DocumentRequestResponse(BaseModel):
    id: int
    documentType: str
    purpose: str
    copies: int
    requirements: Optional[str] = None
    photo: Optional[str] = None
    contact: str
    notes: Optional[str] = None
    status: str
    action: Optional[str] = None
    user_id: Optional[int] = None
    pickup_date: Optional[datetime] = None

    created_at: datetime
    updated_at: Optional[datetime] = None

    user: Optional[UserInfoResponse]

    model_config = ConfigDict(from_attributes=True)


# ---------------- Status Update ----------------
class StatusUpdate(BaseModel):
    id: int
    status: str
    action: Optional[str] = None
    notes: Optional[str] = None


# ---------------- Notification Schema ----------------
class NotificationResponse(BaseModel):
    id: int
    title: str
    message: str
    type: str
    is_read: bool
    created_at: datetime
    user_id: Optional[int]

    model_config = ConfigDict(from_attributes=True)
