from fastapi import APIRouter, HTTPException, Depends
from sqlalchemy.orm import Session
from typing import List
import hashlib
from datetime import datetime

from database import get_db
from models import UserDB, NotificationDB
from schemas import UserCreate, UserResponse, UserLogin, UserUpdate

router = APIRouter(
    prefix="/users",
    tags=["Users"]
)

# --------------------------- Password hashing ---------------------------
def hash_password(password: str) -> str:
    """Hash password using SHA256."""
    return hashlib.sha256(password.encode()).hexdigest()

def verify_password(plain: str, hashed: str) -> bool:
    """Verify SHA256 password."""
    return hash_password(plain) == hashed


# --------------------------- Contact normalization ---------------------------
def normalize_contact(contact: str) -> str:
    """
    Normalize Philippine mobile numbers to 09… format.
    Handles +63, 63, 0 prefixes.
    """
    contact = contact.replace(" ", "").strip()
    if contact.startswith("+63"):
        return "0" + contact[3:]
    elif contact.startswith("63"):
        return "0" + contact[2:]
    elif contact.startswith("0"):
        return contact
    else:
        raise ValueError("Invalid contact number format")


# --------------------------- Routes ---------------------------

# Register new user with notification
@router.post("/", response_model=UserResponse)
def register(user: UserCreate, db: Session = Depends(get_db)):
    try:
        normalized_contact = normalize_contact(user.contact)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid contact number format")

    # Check existing contact
    if db.query(UserDB).filter(UserDB.contact == normalized_contact).first():
        raise HTTPException(status_code=400, detail="Contact already registered")

    # Check duplicate name
    if db.query(UserDB).filter(
        UserDB.first_name.ilike(user.firstName.strip()),
        UserDB.last_name.ilike(user.lastName.strip())
    ).first():
        raise HTTPException(status_code=400, detail="User with same name already registered")

    if not user.photo or user.photo.strip() == "":
        raise HTTPException(status_code=400, detail="Photo is required for registration")

    # Create user
    db_user = UserDB(
        first_name=user.firstName.strip(),
        middle_name=user.middleName.strip() if user.middleName else None,
        last_name=user.lastName.strip(),
        dob=user.dob,
        gender=user.gender,
        civil_status=user.civilStatus,
        contact=normalized_contact,
        purok=user.purok,
        barangay=user.barangay,
        city=user.city,
        province=user.province,
        postal_code=user.postalCode,
        password=hash_password(user.password),
        photo=user.photo,
        role=user.role,
        status="Pending",
    )

    db.add(db_user)
    db.flush()  # get ID before commit

    # Create notification
    notif = NotificationDB(
        title="New User Registration",
        message=f"{db_user.first_name} {db_user.last_name} registered as {db_user.role}.",
        type="registration",
        user_id=db_user.id,
        created_at=datetime.utcnow()
    )
    db.add(notif)
    db.commit()
    db.refresh(db_user)

    return UserResponse(
        id=db_user.id,
        firstName=db_user.first_name,
        middleName=db_user.middle_name,
        lastName=db_user.last_name,
        dob=db_user.dob,
        gender=db_user.gender,
        civilStatus=db_user.civil_status,
        contact=db_user.contact,
        purok=db_user.purok,
        barangay=db_user.barangay,
        city=db_user.city,
        province=db_user.province,
        postalCode=db_user.postal_code,
        photo=db_user.photo,
        role=db_user.role,
        status=db_user.status,
    )


# Login route
@router.post("/login", response_model=UserResponse)
def login(user: UserLogin, db: Session = Depends(get_db)):
    try:
        normalized_contact = normalize_contact(user.contact)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid contact number format")

    db_user = db.query(UserDB).filter(UserDB.contact == normalized_contact).first()
    if not db_user:
        raise HTTPException(status_code=404, detail="User not found")

    if not verify_password(user.password, db_user.password):
        raise HTTPException(status_code=401, detail="Incorrect password")

    if db_user.role == "resident" and db_user.status != "Approved":
        raise HTTPException(
            status_code=403,
            detail=f"Resident account not approved. Current status: {db_user.status}"
        )

    return UserResponse(
        id=db_user.id,
        firstName=db_user.first_name,
        middleName=db_user.middle_name,
        lastName=db_user.last_name,
        dob=db_user.dob,
        gender=db_user.gender,
        civilStatus=db_user.civil_status,
        contact=db_user.contact,
        purok=db_user.purok,
        barangay=db_user.barangay,
        city=db_user.city,
        province=db_user.province,
        postalCode=db_user.postal_code,
        photo=db_user.photo,
        role=db_user.role,
        status=db_user.status,
    )


# Get all users
@router.get("/", response_model=List[UserResponse])
def get_users(db: Session = Depends(get_db)):
    return db.query(UserDB).all()


# Get user by ID
@router.get("/{user_id}", response_model=UserResponse)
def get_user(user_id: int, db: Session = Depends(get_db)):
    db_user = db.query(UserDB).filter(UserDB.id == user_id).first()
    if not db_user:
        raise HTTPException(status_code=404, detail="User not found")
    return db_user


# Update user info
@router.put("/{user_id}", response_model=UserResponse)
def update_user(user_id: int, update_data: UserUpdate, db: Session = Depends(get_db)):
    db_user = db.query(UserDB).filter(UserDB.id == user_id).first()
    if not db_user:
        raise HTTPException(status_code=404, detail="User not found")

    data = update_data.dict(exclude_unset=True)

    # Normalize contact if being updated
    if "contact" in data:
        try:
            data["contact"] = normalize_contact(data["contact"])
        except ValueError:
            raise HTTPException(status_code=400, detail="Invalid contact number format")

    for key, value in data.items():
        setattr(db_user, key, value)

    db.commit()
    db.refresh(db_user)
    return db_user


# Delete user
@router.delete("/{user_id}")
def delete_user(user_id: int, db: Session = Depends(get_db)):
    db_user = db.query(UserDB).filter(UserDB.id == user_id).first()
    if not db_user:
        raise HTTPException(status_code=404, detail="User not found")

    db.delete(db_user)
    db.commit()
    return {"message": "User deleted successfully"}
