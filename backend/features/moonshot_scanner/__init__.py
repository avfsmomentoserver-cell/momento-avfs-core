"""Moonshot release scanner - detects moonshot conditions using new linguistics."""

from .linguistics import MoonshotLinguistics
from .scanner import MoonshotScanner

__all__ = ["MoonshotLinguistics", "MoonshotScanner"]
