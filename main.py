from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from routes import users, document_requests, notifications
from database import Base, engine
from seed_admins import seed_admins

# ---------------------------
# Database initialization
# ---------------------------
Base.metadata.create_all(bind=engine)

# ---------------------------
# FastAPI app setup
# ---------------------------
app = FastAPI()
app.router.redirect_slashes = True
# ---------------------------
# CORS configuration
# ---------------------------
origins = [
    "http://localhost:8100",    # Ionic local dev
    "http://localhost:8101",    # Alternative dev port
    "capacitor://localhost",    # Mobile app (Capacitor)
    "http://54.206.87.227",     # Your EC2 instance (HTTP)
    "http://54.206.87.227:8100",
    "*" # If frontend is served separately
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ---------------------------
# Root endpoints
# ---------------------------
@app.get("/")
def read_root():
    return {"message": "Hello from EC2 with PostgreSQL!"}


@app.get("/ping")
def ping():
    return {"message": "Backend is alive!"}

# ---------------------------
# Routers
# ---------------------------
app.include_router(users.router)
app.include_router(document_requests.router)
app.include_router(notifications.router)

# ---------------------------
# Startup event
# ---------------------------
@app.on_event("startup")
def startup_tasks():
    """Tasks that run when the backend starts."""
    seed_admins()
    print("✅ Startup complete — routes loaded:")
    for route in app.routes:
        if hasattr(route, "methods"):
            print(f"  {route.path} → {list(route.methods)}")
