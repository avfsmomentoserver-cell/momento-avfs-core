"""Real-time WebSocket alerts for feature changes."""

import logging
from typing import Any, Dict, List, Optional
from datetime import datetime

logger = logging.getLogger("momento.feature_alerts")


class FeatureAlertManager:
    """Manage real-time alerts for significant feature changes."""
    
    def __init__(self) -> None:
        self.previous_state: Dict[str, Any] = {}
        self.alert_thresholds = {
            "pressure_critical": 80.0,
            "pressure_high": 70.0,
            "moonshot_confidence": 0.75,
            "momentum_shift": 5.0,
            "band_collapse": 3
        }
    
    def check_alerts(
        self,
        advanced_features: Dict[str, Any],
        source: str = "aviator"
    ) -> List[Dict[str, Any]]:
        """Check for alert conditions based on current features.
        
        Args:
            advanced_features: Current advanced features from analysis
            source: Data source
            
        Returns:
            List of alert dictionaries
        """
        alerts = []
        
        if not advanced_features:
            return alerts
        
        # Check pressure alerts
        pressure_alerts = self._check_pressure_alerts(advanced_features, source)
        alerts.extend(pressure_alerts)
        
        # Check moonshot alerts
        moonshot_alerts = self._check_moonshot_alerts(advanced_features, source)
        alerts.extend(moonshot_alerts)
        
        # Check momentum alerts
        momentum_alerts = self._check_momentum_alerts(advanced_features, source)
        alerts.extend(momentum_alerts)
        
        # Check band alerts
        band_alerts = self._check_band_alerts(advanced_features, source)
        alerts.extend(band_alerts)
        
        # Update previous state
        self.previous_state = advanced_features
        
        return alerts
    
    def _check_pressure_alerts(
        self,
        features: Dict[str, Any],
        source: str
    ) -> List[Dict[str, Any]]:
        """Check for pressure-related alerts.
        
        Args:
            features: Advanced features
            source: Data source
            
        Returns:
            List of pressure alerts
        """
        alerts = []
        pressure_data = features.get("pressure", {})
        
        if not pressure_data:
            return alerts
        
        pressure_percent = pressure_data.get("pressure_percent", 0.0)
        
        # Critical pressure alert
        if pressure_percent >= self.alert_thresholds["pressure_critical"]:
            alerts.append({
                "type": "pressure_critical",
                "level": "critical",
                "message": f"Critical pressure detected: {pressure_percent}%",
                "source": source,
                "timestamp": datetime.utcnow().isoformat() + "Z",
                "data": {
                    "pressure_percent": pressure_percent,
                    "release_probability": pressure_data.get("release_probability", 0.0),
                    "imminent_ranges": pressure_data.get("imminent_ranges", [])
                }
            })
        
        # High pressure alert
        elif pressure_percent >= self.alert_thresholds["pressure_high"]:
            alerts.append({
                "type": "pressure_high",
                "level": "high",
                "message": f"High pressure detected: {pressure_percent}%",
                "source": source,
                "timestamp": datetime.utcnow().isoformat() + "Z",
                "data": {
                    "pressure_percent": pressure_percent,
                    "release_probability": pressure_data.get("release_probability", 0.0)
                }
            })
        
        return alerts
    
    def _check_moonshot_alerts(
        self,
        features: Dict[str, Any],
        source: str
    ) -> List[Dict[str, Any]]:
        """Check for moonshot-related alerts.
        
        Args:
            features: Advanced features
            source: Data source
            
        Returns:
            List of moonshot alerts
        """
        alerts = []
        moonshot_data = features.get("moonshot", {})
        
        if not moonshot_data:
            return alerts
        
        imminent = moonshot_data.get("imminent", False)
        confidence = moonshot_data.get("confidence", 0.0)
        
        # High confidence moonshot alert
        if confidence >= self.alert_thresholds["moonshot_confidence"]:
            alerts.append({
                "type": "moonshot_imminent",
                "level": "high",
                "message": f"Moonshot conditions detected (confidence: {confidence:.2f})",
                "source": source,
                "timestamp": datetime.utcnow().isoformat() + "Z",
                "data": {
                    "confidence": confidence,
                    "imminent": imminent,
                    "factors": moonshot_data.get("factors", {})
                }
            })
        
        return alerts
    
    def _check_momentum_alerts(
        self,
        features: Dict[str, Any],
        source: str
    ) -> List[Dict[str, Any]]:
        """Check for momentum-related alerts.
        
        Args:
            features: Advanced features
            source: Data source
            
        Returns:
            List of momentum alerts
        """
        alerts = []
        baseline_data = features.get("baseline", {})
        
        if not baseline_data:
            return alerts
        
        shifts = baseline_data.get("shifts", [])
        
        # Check for recent momentum shifts
        if shifts:
            latest_shift = shifts[-1]
            magnitude = latest_shift.get("magnitude", 0.0)
            direction = latest_shift.get("direction", "unknown")
            
            if abs(magnitude) >= self.alert_thresholds["momentum_shift"]:
                alerts.append({
                    "type": "momentum_shift",
                    "level": "medium",
                    "message": f"Momentum shift detected: {direction} (magnitude: {magnitude:.2f})",
                    "source": source,
                    "timestamp": datetime.utcnow().isoformat() + "Z",
                    "data": {
                        "direction": direction,
                        "magnitude": magnitude,
                        "confidence": latest_shift.get("confidence", 0.0)
                    }
                })
        
        return alerts
    
    def _check_band_alerts(
        self,
        features: Dict[str, Any],
        source: str
    ) -> List[Dict[str, Any]]:
        """Check for band-related alerts.
        
        Args:
            features: Advanced features
            source: Data source
            
        Returns:
            List of band alerts
        """
        alerts = []
        bands_data = features.get("bands", {})
        
        if not bands_data:
            return alerts
        
        # Check each band for collapse alerts
        for band_name, band_data in bands_data.items():
            if not isinstance(band_data, dict):
                continue
            
            collapse_points = band_data.get("collapse_points", [])
            collapse_freq = band_data.get("collapse_frequency", 0.0)
            
            # High collapse frequency alert
            if collapse_freq > 0.05:  # More than 5% collapse rate
                alerts.append({
                    "type": "band_collapse",
                    "level": "medium",
                    "message": f"High collapse frequency in {band_name}: {collapse_freq:.2%}",
                    "source": source,
                    "timestamp": datetime.utcnow().isoformat() + "Z",
                    "data": {
                        "band": band_name,
                        "collapse_frequency": collapse_freq,
                        "collapse_count": len(collapse_points)
                    }
                })
        
        return alerts
    
    def set_threshold(self, alert_type: str, value: float) -> None:
        """Update alert threshold.
        
        Args:
            alert_type: Type of alert threshold to update
            value: New threshold value
        """
        if alert_type in self.alert_thresholds:
            self.alert_thresholds[alert_type] = value
            logger.info(f"Updated {alert_type} threshold to {value}")
    
    def get_thresholds(self) -> Dict[str, float]:
        """Get current alert thresholds.
        
        Returns:
            Dictionary of alert thresholds
        """
        return self.alert_thresholds.copy()


# Global alert manager instance
alert_manager = FeatureAlertManager()
