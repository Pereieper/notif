from database import SessionLocal
from models import UserDB
import hashlib

# --- Helper function for hashing ---
def hash_password(password: str):
    return hashlib.sha256(password.encode()).hexdigest()

# --- Seed admins (secretary & captain) ---
def seed_admins():
    db = SessionLocal()
    try:
        # Secretary account
        secretary = db.query(UserDB).filter(UserDB.role == "secretary").first()
        if not secretary:
            db.add(UserDB(
                first_name="System",
                middle_name=None,
                last_name="Secretary",
                dob="1970-01-01",            # default dob
                gender="N/A",
                civil_status="N/A",
                contact="+639123456789",
                purok="N/A",                  # default purok
                barangay="DefaultBarangay",
                city="DefaultCity",
                province="DefaultProvince",
                postal_code="0000",
                password=hash_password("secret123"),
                photo="default_photo.png",     # default photo
                role="secretary",
                status="Pending",
            ))
            print("✅ Secretary account created.")

        # Captain account
        captain = db.query(UserDB).filter(UserDB.role == "captain").first()
        if not captain:
            db.add(UserDB(
                first_name="System",
                middle_name=None,
                last_name="Captain",
                dob="1970-01-01",            # default dob
                gender="N/A",
                civil_status="N/A",
                contact="+639987654321",
                purok="N/A",                  # default purok
                barangay="DefaultBarangay",
                city="DefaultCity",
                province="DefaultProvince",
                postal_code="0000",
                password=hash_password("captain123"),
                photo="default_photo.png",     # default photo
                role="captain",
                status="Pending",
            ))
            print("✅ Captain account created.")

        db.commit()
    finally:
        db.close()

# --- Run directly ---
if __name__ == "__main__":
    seed_admins()
    print("🎉 Seeding complete.")
