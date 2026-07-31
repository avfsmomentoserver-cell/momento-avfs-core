"""Feature registry and management system."""

from typing import Dict, List, Type
from .base import BaseFeature


class FeatureRegistry:
    """Registry for managing available features.
    
    This registry allows dynamic feature loading, enabling/disabling,
    and centralized management of all analysis features.
    """
    
    def __init__(self) -> None:
        self._features: Dict[str, Type[BaseFeature]] = {}
        self._enabled: Dict[str, bool] = {}
    
    def register(self, name: str, feature_class: Type[BaseFeature]) -> None:
        """Register a feature class.
        
        Args:
            name: Feature identifier
            feature_class: Feature class to register
        """
        self._features[name] = feature_class
        self._enabled[name] = True
    
    def get(self, name: str) -> BaseFeature:
        """Get a feature instance.
        
        Args:
            name: Feature identifier
            
        Returns:
            Feature instance
            
        Raises:
            KeyError: If feature not found
        """
        if name not in self._features:
            raise KeyError(f"Feature '{name}' not found in registry")
        
        return self._features[name]()
    
    def list_features(self) -> List[str]:
        """List all registered features.
        
        Returns:
            List of feature names
        """
        return list(self._features.keys())
    
    def enable(self, name: str) -> None:
        """Enable a feature.
        
        Args:
            name: Feature identifier
        """
        if name in self._features:
            self._enabled[name] = True
    
    def disable(self, name: str) -> None:
        """Disable a feature.
        
        Args:
            name: Feature identifier
        """
        if name in self._features:
            self._enabled[name] = False
    
    def is_enabled(self, name: str) -> bool:
        """Check if a feature is enabled.
        
        Args:
            name: Feature identifier
            
        Returns:
            True if enabled, False otherwise
        """
        return self._enabled.get(name, False)
    
    def get_enabled_features(self) -> List[str]:
        """Get list of enabled features.
        
        Returns:
            List of enabled feature names
        """
        return [name for name, enabled in self._enabled.items() if enabled]


# Global registry instance
registry = FeatureRegistry()
