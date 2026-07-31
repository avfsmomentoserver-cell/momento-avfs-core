"""Caching strategy for feature computation."""

import hashlib
import json
import logging
import time
from typing import Any, Dict, Optional

logger = logging.getLogger("momento.feature_cache")


class FeatureCache:
    """Cache for feature computation results."""
    
    def __init__(self, default_ttl: int = 60) -> None:
        self.cache: Dict[str, Dict[str, Any]] = {}
        self.default_ttl = default_ttl
        self.hits = 0
        self.misses = 0
    
    def _generate_key(
        self,
        source: str,
        round_count: int,
        feature_type: str = "all"
    ) -> str:
        """Generate cache key.
        
        Args:
            source: Data source
            round_count: Number of rounds
            feature_type: Type of feature
            
        Returns:
            Cache key
        """
        key_data = f"{source}:{round_count}:{feature_type}"
        return hashlib.md5(key_data.encode()).hexdigest()
    
    def get(
        self,
        source: str,
        round_count: int,
        feature_type: str = "all"
    ) -> Optional[Dict[str, Any]]:
        """Get cached feature result.
        
        Args:
            source: Data source
            round_count: Number of rounds
            feature_type: Type of feature
            
        Returns:
            Cached result or None
        """
        key = self._generate_key(source, round_count, feature_type)
        
        if key in self.cache:
            entry = self.cache[key]
            
            # Check if expired
            if time.time() < entry["expires_at"]:
                self.hits += 1
                logger.debug(f"Cache hit for {key}")
                return entry["data"]
            else:
                # Remove expired entry
                del self.cache[key]
                logger.debug(f"Cache expired for {key}")
        
        self.misses += 1
        return None
    
    def set(
        self,
        source: str,
        round_count: int,
        data: Dict[str, Any],
        feature_type: str = "all",
        ttl: Optional[int] = None
    ) -> None:
        """Cache feature result.
        
        Args:
            source: Data source
            round_count: Number of rounds
            data: Feature data to cache
            feature_type: Type of feature
            ttl: Time to live in seconds
        """
        key = self._generate_key(source, round_count, feature_type)
        ttl = ttl or self.default_ttl
        
        self.cache[key] = {
            "data": data,
            "expires_at": time.time() + ttl,
            "created_at": time.time()
        }
        
        logger.debug(f"Cached {key} with TTL {ttl}s")
    
    def invalidate(self, source: str, round_count: int) -> None:
        """Invalidate cache for specific source and round count.
        
        Args:
            source: Data source
            round_count: Number of rounds
        """
        keys_to_remove = []
        
        for key in self.cache.keys():
            # Invalidate all keys for this source
            if source in key:
                keys_to_remove.append(key)
        
        for key in keys_to_remove:
            del self.cache[key]
        
        logger.debug(f"Invalidated {len(keys_to_remove)} cache entries for {source}")
    
    def clear(self) -> None:
        """Clear all cache entries."""
        self.cache.clear()
        self.hits = 0
        self.misses = 0
        logger.debug("Cache cleared")
    
    def get_stats(self) -> Dict[str, Any]:
        """Get cache statistics.
        
        Returns:
            Cache statistics
        """
        total_requests = self.hits + self.misses
        hit_rate = self.hits / total_requests if total_requests > 0 else 0.0
        
        return {
            "hits": self.hits,
            "misses": self.misses,
            "hit_rate": round(hit_rate, 4),
            "cache_size": len(self.cache),
            "default_ttl": self.default_ttl
        }
    
    def cleanup_expired(self) -> int:
        """Remove expired cache entries.
        
        Returns:
            Number of entries removed
        """
        current_time = time.time()
        keys_to_remove = []
        
        for key, entry in self.cache.items():
            if current_time >= entry["expires_at"]:
                keys_to_remove.append(key)
        
        for key in keys_to_remove:
            del self.cache[key]
        
        if keys_to_remove:
            logger.debug(f"Cleaned up {len(keys_to_remove)} expired entries")
        
        return len(keys_to_remove)


# Global cache instance
feature_cache = FeatureCache(default_ttl=60)
