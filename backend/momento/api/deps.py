"""Shared FastAPI dependencies: auth guards and common query params."""

from __future__ import annotations

from typing import Any, Dict, Optional

from fastapi import Depends, Header, HTTPException, Query, status

from .. import auth, store


def _extract(authorization: Optional[str], token_param: Optional[str]) -> Optional[str]:
    if authorization:
        scheme, _, value = authorization.partition(" ")
        if scheme.lower() == "bearer" and value:
            return value.strip()
        return authorization.strip()
    return token_param


async def optional_user(
    authorization: Optional[str] = Header(default=None),
    token: Optional[str] = Query(default=None),
) -> Optional[Dict[str, Any]]:
    """Resolve the caller if a valid token is present, otherwise None."""
    raw = _extract(authorization, token)
    if not raw:
        return None
    payload = auth.decode_token(raw)
    if payload is None:
        return None
    return auth.get_user(int(payload["sub"]))


async def current_user(user: Optional[Dict[str, Any]] = Depends(optional_user)) -> Dict[str, Any]:
    if user is None:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Authentication required")
    if not user.get("active"):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Account disabled")
    return user


async def operator_user(user: Dict[str, Any] = Depends(current_user)) -> Dict[str, Any]:
    if not user.get("is_operator"):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Operator role required")
    return user


async def premium_user(user: Dict[str, Any] = Depends(current_user)) -> Dict[str, Any]:
    if not (user.get("is_premium") or user.get("is_operator")):
        raise HTTPException(status_code=status.HTTP_402_PAYMENT_REQUIRED, detail="Premium subscription required")
    return user


def source_param(source: str = Query(default="aviator", description="Data source id")) -> str:
    return store.normalize_source(source)
