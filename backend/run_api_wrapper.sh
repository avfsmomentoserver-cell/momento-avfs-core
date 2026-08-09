#!/bin/bash
export MOMENTO_WATCHER_ENABLED=false
export MOMENTO_FEED_AUTOSTART=false
exec /home/pirates/Avfs_Core/avfs/v4/backend/.venv/bin/python run_api.py "$@"
