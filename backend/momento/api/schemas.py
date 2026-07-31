"""Pydantic request/response models."""

from __future__ import annotations

from typing import Any, Dict, List, Optional, Union

from pydantic import BaseModel, Field


class RoundIn(BaseModel):
    multiplier: float = Field(gt=0, le=1_000_000)
    timestamp: Optional[Union[str, int, float]] = None
    source: Optional[str] = None
    color: Optional[str] = None


class IngestRequest(BaseModel):
    source: str = "aviator"
    rounds: Optional[List[Union[RoundIn, float, Dict[str, Any]]]] = None
    payload: Optional[Any] = None
    raw: Optional[str] = None


class IngestResponse(BaseModel):
    imported: int
    duplicates: int
    rejected: int
    sources: List[str]
    rounds: List[Dict[str, Any]] = []


class LoginRequest(BaseModel):
    email: str
    password: str


class RegisterRequest(BaseModel):
    email: str
    password: str
    display_name: Optional[str] = None


class AuthResponse(BaseModel):
    token: str
    user: Dict[str, Any]


class UserUpdateRequest(BaseModel):
    role: Optional[str] = None
    tier: Optional[str] = None
    display_name: Optional[str] = None
    active: Optional[bool] = None
    password: Optional[str] = None


class UserCreateRequest(BaseModel):
    email: str
    password: str
    role: str = "user"
    tier: str = "free"
    display_name: Optional[str] = None


class SettingsUpdateRequest(BaseModel):
    analysis: Optional[Dict[str, Any]] = None
    runtime: Optional[Dict[str, Any]] = None
    backtesting: Optional[Dict[str, Any]] = None
    dashboard: Optional[Dict[str, Any]] = None


class FeedStartRequest(BaseModel):
    source: str = "aviator"
    interval_seconds: float = Field(default=6.0, ge=0.5, le=300)
    house_edge: float = Field(default=0.03, ge=0.0, le=0.2)
    jitter: float = Field(default=0.35, ge=0.0, le=0.9)


class PluginToggleRequest(BaseModel):
    enabled: bool


class PluginConfigRequest(BaseModel):
    config: Dict[str, Any]


class PluginCreateRequest(BaseModel):
    name: str
    base: str
    id: Optional[str] = None
    description: Optional[str] = None
    category: Optional[str] = None
    author: Optional[str] = None
    version: Optional[str] = None
    config: Optional[Dict[str, Any]] = None


class OrchestratorSettingsRequest(BaseModel):
    module: Optional[str] = None
    bankroll: Optional[float] = None
    base_position_size: Optional[float] = None
    max_risk_per_round: Optional[float] = None
    daily_loss_limit: Optional[float] = None
    position_sizing_method: Optional[str] = None
    min_confidence_threshold: Optional[float] = None
    execution_delay_ms: Optional[float] = None


class AutopilotConfigRequest(BaseModel):
    enabled: Optional[bool] = None
    source: Optional[str] = None
    max_risk_per_round: Optional[float] = None
    daily_loss_limit: Optional[float] = None
    max_consecutive_losses: Optional[float] = None
    enable_ceiling_analyzer: Optional[bool] = None
    enable_gap_swing_analyzer: Optional[bool] = None
    enable_linguistic_analysis: Optional[bool] = None
    min_confidence_threshold: Optional[float] = None
    execution_delay_ms: Optional[float] = None
    base_position_size: Optional[float] = None
    position_sizing_method: Optional[str] = None
    ceiling_analyzer_weight: Optional[float] = None
    gap_swing_analyzer_weight: Optional[float] = None
    linguistic_analysis_weight: Optional[float] = None


class SourceUpsertRequest(BaseModel):
    id: str
    name: str
    icon: Optional[str] = "activity"
    active: bool = True


class VerifyRequest(BaseModel):
    seed: str
    multiplier: float
    house_edge: float = 0.03
