from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import desc
from typing import List
from database import get_db
from models import NotificationDB
from schemas import NotificationResponse  # ✅ use your schema for clean responses

router = APIRouter(prefix="/notifications", tags=["notifications"])

# ---------------------------
# Get all notifications
# ---------------------------
@router.get("/", response_model=List[NotificationResponse])
def get_notifications(db: Session = Depends(get_db)):
    """Get all notifications (for secretary dashboard)."""
    notifs = db.query(NotificationDB).order_by(desc(NotificationDB.created_at)).all()
    return notifs


# ---------------------------
# Mark a notification as read
# ---------------------------
@router.put("/{notif_id}/read")
def mark_notification_as_read(notif_id: int, db: Session = Depends(get_db)):
    notif = db.query(NotificationDB).filter(NotificationDB.id == notif_id).first()
    if not notif:
        raise HTTPException(status_code=404, detail="Notification not found")

    notif.is_read = True
    db.commit()
    db.refresh(notif)

    return {"message": f"Notification {notif.id} marked as read"}
