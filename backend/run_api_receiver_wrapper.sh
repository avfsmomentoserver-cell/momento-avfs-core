#!/bin/bash
export MOMENTO_FEED_AUTOSTART=false
exec /home/pirates/Avfs_Core/avfs/v4/backend/.venv/bin/python run_api.py --receiver-only "$@"
