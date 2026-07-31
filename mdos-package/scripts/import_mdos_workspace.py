#!/usr/bin/env python3
"""Import an MDOS workspace JSON file into an MDOS instance.

Usage:
  import_mdos_workspace.py --file mdos.workspace.json [--url URL] [--token TOKEN] [--dry-run]

Defaults:
  URL: http://localhost:3000/import

The script sends the JSON file as a POST with Content-Type: application/json.
If the MDOS instance expects multipart upload, use the `curl` example in IMPORT.md.
"""
import argparse
import json
import sys
from pathlib import Path
from urllib.request import Request, urlopen

# Respect local env config if present
ENV_CONFIG_PATH = Path(__file__).resolve().parents[1] / 'config' / 'env_config.json'


def parse_args():
    p = argparse.ArgumentParser(description='Import mdos.workspace.json into an MDOS instance')
    p.add_argument('--file', '-f', required=True, help='Path to mdos.workspace.json')
    p.add_argument('--url', '-u', default=None, help='MDOS import endpoint URL (overrides env config)')
    p.add_argument('--token', '-t', help='Optional Bearer token for Authorization header')
    p.add_argument('--dry-run', action='store_true', help='Show what would be sent and exit')
    p.add_argument('--force', action='store_true', help='Allow network import even when ALLOW_NETWORK_IMPORT is false in env_config.json')
    return p.parse_args()


def load_json(path: Path):
    data = path.read_text()
    # quick validation
    try:
        json.loads(data)
    except Exception as e:
        raise ValueError(f'Invalid JSON in {path}: {e}')
    return data


def load_env_config():
    if not ENV_CONFIG_PATH.exists():
        return {}
    try:
        return json.loads(ENV_CONFIG_PATH.read_text())
    except Exception:
        return {}


def do_post(url: str, data: str, token: str | None):
    headers = {'Content-Type': 'application/json'}
    if token:
        headers['Authorization'] = f'Bearer {token}'
    req = Request(url, data=data.encode('utf-8'), headers=headers, method='POST')
    with urlopen(req, timeout=30) as resp:
        status = resp.getcode()
        body = resp.read().decode('utf-8', errors='ignore')
    return status, body


def main():
    args = parse_args()
    path = Path(args.file)
    if not path.exists():
        print(f'Error: file not found: {path}', file=sys.stderr)
        sys.exit(2)
    data = load_json(path)
    env = load_env_config()
    cfg_url = None
    if args.url:
        cfg_url = args.url
    else:
        cfg_url = env.get('env', {}).get('IMPORT_URL') or env.get('env', {}).get('MDOS_IMPORT_URL') or 'http://localhost:3000/import'

    allow_network = env.get('env', {}).get('ALLOW_NETWORK_IMPORT', False)
    if not allow_network and not args.force and not args.dry_run:
        print('Network imports are disabled by `ALLOW_NETWORK_IMPORT` in', ENV_CONFIG_PATH)
        print('Use --force to override or set ALLOW_NETWORK_IMPORT to true in the env config.')
        sys.exit(4)

    if args.dry_run:
        print('Dry run: would POST to', cfg_url)
        print('Headers:')
        print('  Content-Type: application/json')
        if args.token:
            print('  Authorization: Bearer <token provided>')
        print('\nPayload preview (first 1024 chars):')
        print(data[:1024])
        sys.exit(0)
    try:
        status, body = do_post(cfg_url, data, args.token)
    except Exception as e:
        print('Request failed:', e, file=sys.stderr)
        sys.exit(3)
    print('Response status:', status)
    print('Response body (truncated 400 chars):')
    print(body[:400])


if __name__ == '__main__':
    main()
