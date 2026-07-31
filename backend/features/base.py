"""Base feature interface for all analysis features."""

from abc import ABC, abstractmethod
from typing import Any, Dict, List, Sequence


class BaseFeature(ABC):
    """Base class for all analysis features.
    
    All features must implement these methods to ensure consistency
    across the system and enable proper backtesting.
    """
    
    @abstractmethod
    def compute(self, rounds: Sequence[Dict[str, Any]], settings: Dict[str, Any]) -> Dict[str, Any]:
        """Compute feature metrics on a sequence of rounds.
        
        Args:
            rounds: Sequence of round dictionaries (oldest first)
            settings: Feature-specific settings
            
        Returns:
            Dictionary containing computed metrics
        """
        pass
    
    @abstractmethod
    def backtest(self, rounds: Sequence[Dict[str, Any]], config: Dict[str, Any]) -> Dict[str, Any]:
        """Run backtest validation for this feature.
        
        Args:
            rounds: Historical rounds for backtesting
            config: Backtest configuration
            
        Returns:
            Dictionary containing backtest results and metrics
        """
        pass
    
    @abstractmethod
    def get_metrics(self) -> List[str]:
        """Return list of metric names this feature produces.
        
        Returns:
            List of metric identifier strings
        """
        pass
    
    @abstractmethod
    def get_name(self) -> str:
        """Return the feature name.
        
        Returns:
            Feature name string
        """
        pass
    
    @abstractmethod
    def get_description(self) -> str:
        """Return a description of what this feature does.
        
        Returns:
            Feature description string
        """
        pass
