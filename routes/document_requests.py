from fastapi import APIRouter, Depends, HTTPException, status, Body, Query
from sqlalchemy.orm import Session, joinedload
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy import func
from typing import Optional, List
from datetime import datetime
import traceback

from database import get_db
from models import DocumentRequestDB, UserDB, NotificationDB
from schemas import (
    DocumentRequest, DocumentRequestUpdate, DocumentRequestResponse,
    UserInfoResponse, StatusUpdate
)

router = APIRouter(prefix="/document-requests", tags=["document-requests"])

# ---------------- Helper Functions ----------------
def normalize_contact(contact: str) -> str:
    """Standardize contact format (e.g., +63 -> 0)."""
    contact = (contact or "").strip()
    if contact.startswith("+63"):
        return "0" + contact[3:]
    elif contact.startswith("63"):
        return "0" + contact[2:]
    return contact


def safe_user_response(user: Optional[UserDB]) -> Optional[UserInfoResponse]:
    """Convert UserDB to safe response format."""
    if not user:
        return None
    return UserInfoResponse(
        firstName=user.first_name or "",
        middleName=user.middle_name,
        lastName=user.last_name or "",
        photo=user.photo
    )


def document_request_response(db_request: DocumentRequestDB) -> DocumentRequestResponse:
    """Convert DB model into API-safe schema."""
    return DocumentRequestResponse(
        id=db_request.id,
        documentType=db_request.document_type or "Unknown",
        purpose=db_request.purpose or "",
        copies=db_request.copies or 1,
        requirements=db_request.requirements or "",
        photo=db_request.photo or None,
        contact=db_request.contact or "",
        notes=db_request.notes or "",
        status=db_request.status or "Pending",
        action=db_request.action or "Review",
        user_id=db_request.user_id,
        pickup_date=db_request.pickup_date,
        created_at=db_request.created_at,
        updated_at=db_request.updated_at,
        user=safe_user_response(getattr(db_request, "user", None)),
    )


def get_request_by_id(db: Session, request_id: int, include_deleted: bool = False) -> DocumentRequestDB:
    """Fetch request by ID, raise 404 if not found."""
    query = db.query(DocumentRequestDB).options(joinedload(DocumentRequestDB.user)).filter(DocumentRequestDB.id == request_id)
    if not include_deleted:
        query = query.filter(DocumentRequestDB.is_deleted == False)
    db_request = query.first()
    if not db_request:
        raise HTTPException(status_code=404, detail="Request not found")
    return db_request


def create_notification(db: Session, user_id: int, title: str, message: str):
    """Helper to create a notification."""
    try:
        notif = NotificationDB(
            user_id=user_id,
            title=title,
            message=message,
            is_read=False,
            timestamp=datetime.utcnow()
        )
        db.add(notif)
        db.commit()
    except Exception:
        db.rollback()
        print("⚠ Failed to create notification")
        traceback.print_exc()


# ---------------- Create Request ----------------
@router.post("/", response_model=DocumentRequestResponse, status_code=status.HTTP_201_CREATED)
def create_request(request: DocumentRequest, db: Session = Depends(get_db)):
    try:
        contact = normalize_contact(request.contact)
        user = db.query(UserDB).filter(
            UserDB.contact == contact,
            func.lower(UserDB.status) == "approved"
        ).first()

        if not user:
            raise HTTPException(
                status_code=400,
                detail=f"User with contact '{contact}' not found or not approved."
            )

        db_request = DocumentRequestDB(
            document_type=(request.documentType or "Unknown").strip(),
            purpose=(request.purpose or "").strip(),
            copies=request.copies or 1,
            requirements=(request.requirements or "").strip(),
            photo=(request.photo or "").strip() if request.photo else None,
            contact=contact,
            notes=(request.notes or "").strip(),
            status="Pending",
            action="Review",
            user_id=user.id,
            is_deleted=False,
            created_at=datetime.utcnow()
        )

        db.add(db_request)
        db.commit()
        db.refresh(db_request)

        # 🔔 Create notification for new request
        create_notification(db, user.id, "New Document Request Submitted",
                            f"Your request for {db_request.document_type} has been submitted and is now under review.")

        return document_request_response(db_request)

    except HTTPException:
        raise
    except SQLAlchemyError:
        db.rollback()
        traceback.print_exc()
        raise HTTPException(status_code=500, detail="Database error occurred")
    except Exception as e:
        db.rollback()
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Unexpected error: {str(e)}")


# ---------------- Get Requests ----------------
@router.get("/", response_model=List[DocumentRequestResponse], status_code=status.HTTP_200_OK)
def get_requests(
    contact: Optional[str] = Query(None),
    status: Optional[str] = Query(None),
    include_deleted: bool = Query(False, description="Include soft-deleted requests"),
    db: Session = Depends(get_db)
):
    try:
        query = db.query(DocumentRequestDB).options(joinedload(DocumentRequestDB.user))
        if not include_deleted:
            query = query.filter(DocumentRequestDB.is_deleted == False)

        if contact:
            query = query.filter(DocumentRequestDB.contact == normalize_contact(contact))

        if status:
            query = query.filter(func.lower(DocumentRequestDB.status) == status.strip().lower())

        requests = query.order_by(DocumentRequestDB.created_at.desc()).all()
        return [document_request_response(r) for r in requests]

    except SQLAlchemyError:
        traceback.print_exc()
        raise HTTPException(status_code=500, detail="Database error occurred")
    except Exception:
        traceback.print_exc()
        raise HTTPException(status_code=500, detail="Failed to fetch document requests")


# ---------------- Update Request Status ----------------
@router.post("/status", response_model=DocumentRequestResponse)
def update_request_status(payload: StatusUpdate = Body(...), db: Session = Depends(get_db)):
    try:
        db_request = get_request_by_id(db, payload.id)
        old_status = db_request.status

        # --- Status logic ---
        match payload.status:
            case "Returned":
                db_request.status = "Returned"
                db_request.notes = payload.notes or "Request returned for correction"
                db_request.action = payload.action or "Update Request"

            case "Rejected":
                db_request.status = "Rejected"
                db_request.notes = payload.notes or "Request rejected"
                db_request.action = payload.action or "Reject"

            case "Approved" | "For Print" | "Completed":
                db_request.status = payload.status
                db_request.action = payload.action or "Review"
                db_request.notes = ""

            case "For Pickup":
                db_request.status = "For Pickup"
                db_request.action = payload.action or "Pickup"
                db_request.notes = ""
                db_request.pickup_date = datetime.utcnow()

            case "Pending":
                if old_status != "Returned":
                    raise HTTPException(status_code=400, detail="Only Returned requests can be resubmitted.")
                db_request.status = "Pending"
                db_request.action = payload.action or "Resubmitted"
                db_request.notes = ""

            case _:
                raise HTTPException(status_code=400, detail=f"Invalid status: {payload.status}")

        db_request.updated_at = datetime.utcnow()
        db.commit()
        db.refresh(db_request)

        # 🔔 Notify user of status change
        create_notification(
            db,
            db_request.user_id,
            f"Request {db_request.status}",
            f"Your document request for {db_request.document_type} is now '{db_request.status}'."
        )

        return document_request_response(db_request)

    except Exception as e:
        db.rollback()
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Error updating request: {str(e)}")


# ---------------- Update Request Details (User Resubmit) ----------------
@router.post("/{request_id}/update", response_model=DocumentRequestResponse)
def update_request_details(request_id: int, payload: DocumentRequestUpdate = Body(...), db: Session = Depends(get_db)):
    try:
        db_request = get_request_by_id(db, request_id)

        if db_request.status != "Returned":
            raise HTTPException(status_code=400, detail="Only Returned requests can be updated by user.")

        # Update only provided fields
        for field in ["documentType", "purpose", "copies", "requirements", "photo", "notes"]:
            value = getattr(payload, field, None)
            if value is not None:
                setattr(db_request, field.lower() if field != "documentType" else "document_type", value.strip())

        db_request.status = "Pending"
        db_request.action = "Resubmitted"
        db_request.updated_at = datetime.utcnow()

        db.commit()
        db.refresh(db_request)

        # 🔔 Notify secretary of resubmission
        create_notification(db, db_request.user_id,
                            "Request Resubmitted",
                            f"{db_request.document_type} request was updated and resubmitted for review.")

        return document_request_response(db_request)

    except HTTPException:
        raise
    except SQLAlchemyError:
        db.rollback()
        traceback.print_exc()
        raise HTTPException(status_code=500, detail="Database error occurred")
    except Exception as e:
        db.rollback()
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Unexpected error: {str(e)}")


# ---------------- Soft Delete Request ----------------
@router.delete("/{request_id}", status_code=status.HTTP_200_OK)
def soft_delete_request(request_id: int, db: Session = Depends(get_db)):
    try:
        db_request = get_request_by_id(db, request_id)

        if db_request.is_deleted:
            raise HTTPException(status_code=400, detail="Request already deleted.")

        db_request.is_deleted = True
        db_request.deleted_at = datetime.utcnow()
        db_request.status = "Cancelled"

        db.commit()
        db.refresh(db_request)

        # 🔔 Notify user of deletion
        create_notification(
            db,
            db_request.user_id,
            "Request Cancelled",
            f"Your request for {db_request.document_type} has been cancelled."
        )

        return {"message": f"Request {request_id} soft deleted successfully"}

    except HTTPException:
        raise
    except SQLAlchemyError:
        db.rollback()
        traceback.print_exc()
        raise HTTPException(status_code=500, detail="Database error occurred")
    except Exception as e:
        db.rollback()
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Unexpected error: {str(e)}")
