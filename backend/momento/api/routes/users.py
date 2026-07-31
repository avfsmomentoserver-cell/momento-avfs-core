"""Authentication and user administration."""

from __future__ import annotations

from typing import Any, Dict, Optional

from fastapi import APIRouter, Depends, HTTPException, Query

from ... import auth, db
from ..deps import current_user, operator_user
from ..schemas import (
    AuthResponse,
    LoginRequest,
    RegisterRequest,
    UserCreateRequest,
    UserUpdateRequest,
)

router = APIRouter()


@router.post("/auth/login", response_model=AuthResponse)
async def login(body: LoginRequest) -> Dict[str, Any]:
    user = auth.authenticate(body.email, body.password)
    if user is None:
        raise HTTPException(status_code=401, detail="Invalid email or password")
    db.log_audit(user["email"], "login", {"role": user["role"]})
    return {"token": auth.issue_token(user), "user": user}


@router.post("/auth/register", response_model=AuthResponse)
async def register(body: RegisterRequest) -> Dict[str, Any]:
    try:
        user = auth.create_user(body.email, body.password, display_name=body.display_name)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    db.log_audit(user["email"], "register", None)
    return {"token": auth.issue_token(user), "user": user}


@router.get("/auth/me")
async def me(user: Dict[str, Any] = Depends(current_user)) -> Dict[str, Any]:
    return {"user": user}


@router.post("/auth/refresh", response_model=AuthResponse)
async def refresh(user: Dict[str, Any] = Depends(current_user)) -> Dict[str, Any]:
    return {"token": auth.issue_token(user), "user": user}


@router.get("/users")
async def list_users(
    limit: int = Query(default=200, ge=1, le=1000),
    _: Dict[str, Any] = Depends(operator_user),
) -> Dict[str, Any]:
    return {"users": auth.list_users(limit), "statistics": auth.stats()}


@router.post("/users")
async def create_user(body: UserCreateRequest, actor: Dict[str, Any] = Depends(operator_user)) -> Dict[str, Any]:
    try:
        user = auth.create_user(body.email, body.password, body.role, body.tier, body.display_name)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    db.log_audit(actor["email"], "user_create", {"email": user["email"], "role": user["role"]})
    return {"user": user}


@router.put("/users/{user_id}")
async def update_user(
    user_id: int,
    body: UserUpdateRequest,
    actor: Dict[str, Any] = Depends(operator_user),
) -> Dict[str, Any]:
    updated: Optional[Dict[str, Any]] = auth.update_user(user_id, body.model_dump(exclude_none=True))
    if updated is None:
        raise HTTPException(status_code=404, detail="User not found")
    db.log_audit(actor["email"], "user_update", {"id": user_id, "changes": body.model_dump(exclude_none=True)})
    return {"user": updated}


@router.delete("/users/{user_id}")
async def delete_user(user_id: int, actor: Dict[str, Any] = Depends(operator_user)) -> Dict[str, Any]:
    try:
        deleted = auth.delete_user(user_id)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    if not deleted:
        raise HTTPException(status_code=404, detail="User not found")
    db.log_audit(actor["email"], "user_delete", {"id": user_id})
    return {"deleted": user_id}
