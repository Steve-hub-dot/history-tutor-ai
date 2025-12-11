from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional
from supabase import create_client, Client
import os
from dotenv import load_dotenv
from pathlib import Path

# Load environment
env_path = Path(__file__).resolve().parents[1] / ".env.local"
load_dotenv(env_path)

SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY")

if not SUPABASE_URL or not SUPABASE_KEY:
    raise RuntimeError("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY.")

app = FastAPI(title="BKT Server", version="2.0.0")

supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)

# Enable CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://127.0.0.1:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# -----------------------------------------
# Models
# -----------------------------------------
class AnswerRequest(BaseModel):
    user_id: str
    skill_key: str      # ← FIXED
    correct: bool
    lesson_id: Optional[str] = None
    question_id: Optional[str] = None


class BKTResponse(BaseModel):
    p_old: float
    p_new: float
    p_learn: float
    p_guess: float
    p_slip: float


# -----------------------------------------
# Defaults
# -----------------------------------------
DEFAULT_P_LEARN = 0.3
DEFAULT_P_GUESS = 0.2
DEFAULT_P_SLIP = 0.1
DEFAULT_P_KNOWN = 0.5


# -----------------------------------------
# Helper DB functions
# -----------------------------------------
def fetch_bkt_state(user_id: str, skill_key: str):
    """Load a stored BKT state or return defaults."""
    res = (
        supabase.table("bkt_states")
        .select("*")
        .eq("user_id", user_id)
        .eq("skill_key", skill_key)
        .execute()
    )

    if res.data:
        row = res.data[0]
        return (
            row["p_known"],
            row["p_learn"],
            row["p_guess"],
            row["p_slip"],
        )

    return (
        DEFAULT_P_KNOWN,
        DEFAULT_P_LEARN,
        DEFAULT_P_GUESS,
        DEFAULT_P_SLIP,
    )


def save_bkt_state(user_id: str, skill_key: str, p_known, p_learn, p_guess, p_slip):
    supabase.table("bkt_states").upsert(
        {
            "user_id": user_id,
            "skill_key": skill_key,   # ← FIXED
            "p_known": p_known,
            "p_learn": p_learn,
            "p_guess": p_guess,
            "p_slip": p_slip,
        }
    ).execute()


def log_quiz_answer(req: AnswerRequest, p_old, p_new):
    supabase.table("quiz_answers").insert(
        {
            "user_id": req.user_id,
            "skill_key": req.skill_key,  # ← FIXED
            "question_id": req.question_id,
            "lesson_id": req.lesson_id,
            "was_correct": req.correct,
            "p_known_before": p_old,
            "p_known_after": p_new,
        }
    ).execute()


# -----------------------------------------
# BKT Update Endpoint
# -----------------------------------------
@app.post("/bkt/answer", response_model=BKTResponse)
def update_bkt_state(request: AnswerRequest):

    # Load previous state
    p_known, p_learn, p_guess, p_slip = fetch_bkt_state(
        request.user_id, request.skill_key
    )
    p_old = p_known

    # Bayesian knowledge update
    if request.correct:
        numerator = p_known * (1 - p_slip)
        denominator = numerator + (1 - p_known) * p_guess
        p_new = numerator / denominator if denominator > 0 else 1.0
    else:
        numerator = p_known * p_slip
        denominator = numerator + (1 - p_known) * (1 - p_guess)
        p_new = numerator / denominator if denominator > 0 else 0.0

    # Learning transition
    p_new = p_new + (1 - p_new) * p_learn
    p_new = max(0.0, min(1.0, p_new))

    # Save updated state
    save_bkt_state(request.user_id, request.skill_key, p_new, p_learn, p_guess, p_slip)

    # Log event
    log_quiz_answer(request, p_old, p_new)

    return BKTResponse(
        p_old=p_old,
        p_new=p_new,
        p_learn=p_learn,
        p_guess=p_guess,
        p_slip=p_slip,
    )
