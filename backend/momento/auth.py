"""Authentication and user management.

Local-first: PBKDF2-HMAC password hashing plus stateless HMAC-signed tokens.
No external identity provider is required for the platform to run.
"""

from __future__ import annotations

import base64
import hashlib
import hmac
import json
import secrets
import time
from typing import Any, Dict, List, Optional

from . import config, db

PBKDF2_ROUNDS = 120_000
ROLES = ("user", "analyst", "operator", "admin")
TIERS = ("free", "premium", "pro")
OPERATOR_ROLES = ("operator", "admin")


# ---------------------------------------------------------------------------
# password hashing
# ---------------------------------------------------------------------------

def hash_password(password: str, salt: Optional[str] = None) -> tuple[str, str]:
    salt_value = salt or secrets.token_hex(16)
    digest = hashlib.pbkdf2_hmac("sha256", password.encode(), salt_value.encode(), PBKDF2_ROUNDS)
    return digest.hex(), salt_value


def verify_password(password: str, password_hash: str, salt: str) -> bool:
    candidate, _ = hash_password(password, salt)
    return hmac.compare_digest(candidate, password_hash)


# ---------------------------------------------------------------------------
# tokens
# ---------------------------------------------------------------------------

def _b64(data: bytes) -> str:
    return base64.urlsafe_b64encode(data).decode().rstrip("=")


def _unb64(text: str) -> bytes:
    padding = "=" * (-len(text) % 4)
    return base64.urlsafe_b64decode(text + padding)


def issue_token(user: Dict[str, Any]) -> str:
    payload = {
        "sub": int(user["id"]),
        "email": user["email"],
        "role": user["role"],
        "tier": user["tier"],
        "exp": int(time.time()) + config.TOKEN_TTL_SECONDS,
        "iat": int(time.time()),
    }
    body = _b64(json.dumps(payload, separators=(",", ":")).encode())
    signature = _b64(hmac.new(config.SECRET_KEY.encode(), body.encode(), hashlib.sha256).digest())
    return f"{body}.{signature}"


def decode_token(token: str) -> Optional[Dict[str, Any]]:
    if not token or "." not in token:
        return None
    body, _, signature = token.partition(".")
    expected = _b64(hmac.new(config.SECRET_KEY.encode(), body.encode(), hashlib.sha256).digest())
    if not hmac.compare_digest(signature, expected):
        return None
    try:
        payload = json.loads(_unb64(body))
    except (ValueError, json.JSONDecodeError):
        return None
    if int(payload.get("exp", 0)) < int(time.time()):
        return None
    return payload


# ---------------------------------------------------------------------------
# user records
# ---------------------------------------------------------------------------

def _public(row: Any) -> Dict[str, Any]:
    return {
        "id": int(row["id"]),
        "email": row["email"],
        "role": row["role"],
        "tier": row["tier"],
        "display_name": row["display_name"],
        "created_at": row["created_at"],
        "last_login": row["last_login"],
        "active": bool(row["active"]),
        "is_operator": row["role"] in OPERATOR_ROLES,
        "is_premium": row["tier"] in ("premium", "pro"),
    }


def create_user(
    email: str,
    password: str,
    role: str = "user",
    tier: str = "free",
    display_name: Optional[str] = None,
) -> Dict[str, Any]:
    normalized = str(email).strip().lower()
    if "@" not in normalized or len(normalized) < 5:
        raise ValueError("A valid email address is required")
    if len(password) < 4:
        raise ValueError("Password must be at least 4 characters")
    if db.query_one("SELECT id FROM users WHERE email = ?", (normalized,)):
        raise ValueError("An account with that email already exists")

    password_hash, salt = hash_password(password)
    user_id = db.execute(
        """INSERT INTO users (email, password_hash, salt, role, tier, display_name, created_at)
           VALUES (?, ?, ?, ?, ?, ?, ?)""",
        (
            normalized,
            password_hash,
            salt,
            role if role in ROLES else "user",
            tier if tier in TIERS else "free",
            display_name or normalized.split("@")[0],
            db.utc_now(),
        ),
    )
    row = db.query_one("SELECT * FROM users WHERE id = ?", (user_id,))
    return _public(row) if row else {}


def authenticate(email: str, password: str) -> Optional[Dict[str, Any]]:
    row = db.query_one("SELECT * FROM users WHERE email = ?", (str(email).strip().lower(),))
    if row is None or not bool(row["active"]):
        return None
    if not verify_password(password, row["password_hash"], row["salt"]):
        return None
    db.execute("UPDATE users SET last_login = ? WHERE id = ?", (db.utc_now(), int(row["id"])))
    refreshed = db.query_one("SELECT * FROM users WHERE id = ?", (int(row["id"]),))
    return _public(refreshed) if refreshed else None


def get_user(user_id: int) -> Optional[Dict[str, Any]]:
    row = db.query_one("SELECT * FROM users WHERE id = ?", (int(user_id),))
    return _public(row) if row else None


def list_users(limit: int = 200) -> List[Dict[str, Any]]:
    rows = db.query("SELECT * FROM users ORDER BY created_at DESC LIMIT ?", (max(1, min(int(limit), 1000)),))
    return [_public(row) for row in rows]


def update_user(user_id: int, values: Dict[str, Any]) -> Optional[Dict[str, Any]]:
    fields: List[str] = []
    params: List[Any] = []

    if values.get("role") in ROLES:
        fields.append("role = ?")
        params.append(values["role"])
    if values.get("tier") in TIERS:
        fields.append("tier = ?")
        params.append(values["tier"])
    if values.get("display_name") is not None:
        fields.append("display_name = ?")
        params.append(str(values["display_name"])[:80])
    if values.get("active") is not None:
        fields.append("active = ?")
        params.append(1 if values["active"] else 0)
    if values.get("password"):
        password_hash, salt = hash_password(str(values["password"]))
        fields.extend(["password_hash = ?", "salt = ?"])
        params.extend([password_hash, salt])

    if not fields:
        return get_user(user_id)

    params.append(int(user_id))
    db.execute(f"UPDATE users SET {', '.join(fields)} WHERE id = ?", params)
    return get_user(user_id)


def delete_user(user_id: int) -> bool:
    row = db.query_one("SELECT role FROM users WHERE id = ?", (int(user_id),))
    if row is None:
        return False
    if row["role"] == "admin":
        admins = db.query_one("SELECT COUNT(*) AS c FROM users WHERE role = 'admin'")
        if admins and int(admins["c"]) <= 1:
            raise ValueError("Cannot delete the last admin account")
    db.execute("DELETE FROM users WHERE id = ?", (int(user_id),))
    return True


def stats() -> Dict[str, Any]:
    total = db.query_one("SELECT COUNT(*) AS c FROM users")
    by_role = db.query("SELECT role, COUNT(*) AS c FROM users GROUP BY role")
    by_tier = db.query("SELECT tier, COUNT(*) AS c FROM users GROUP BY tier")
    active = db.query_one("SELECT COUNT(*) AS c FROM users WHERE active = 1")
    return {
        "total": int(total["c"]) if total else 0,
        "active": int(active["c"]) if active else 0,
        "by_role": {row["role"]: int(row["c"]) for row in by_role},
        "by_tier": {row["tier"]: int(row["c"]) for row in by_tier},
    }


def bootstrap() -> None:
    """Create the operator account on first boot so the platform is usable."""
    row = db.query_one("SELECT COUNT(*) AS c FROM users")
    if row and int(row["c"]) > 0:
        return
    try:
        create_user(
            config.BOOTSTRAP_OPERATOR_EMAIL,
            config.BOOTSTRAP_OPERATOR_PASSWORD,
            role="admin",
            tier="pro",
            display_name="Operator",
        )
        db.log_audit("system", "bootstrap_operator", {"email": config.BOOTSTRAP_OPERATOR_EMAIL})
    except ValueError:
        pass
