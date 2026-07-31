"""Equal baseline chart feature - converts multipliers to equal scale for momentum analysis."""

from .converter import MultiplierConverter
from .trendlines import TrendlineComputer

__all__ = ["MultiplierConverter", "TrendlineComputer"]
