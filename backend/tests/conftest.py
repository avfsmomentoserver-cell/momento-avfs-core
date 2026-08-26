"""Shared pytest bootstrap for backend unit tests.

The `momento` package lives under `backend/`, so when pytest is invoked from
the repository root the package is not importable. Inserting `backend/` on
sys.path keeps tests runnable from either the root or the backend directory.
"""

import os
import sys

_BACKEND = os.path.abspath(os.path.join(os.path.dirname(__file__), os.pardir))
if _BACKEND not in sys.path:
    sys.path.insert(0, _BACKEND)