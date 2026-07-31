#!/usr/bin/env python3
"""Load agent configuration and print agent persona for local flows.

This is a helper for local tooling to adopt the `agent_config.json` settings.
It does not connect to any network or change assistant runtime behavior.
"""
import json
from pathlib import Path
import argparse


def load_agent_config(path: Path):
    return json.loads(path.read_text())


def main():
    p = argparse.ArgumentParser()
    p.add_argument('--agent', '-a', help='Agent id to use (overrides current_agent_id)')
    args = p.parse_args()
    cfg_path = Path(__file__).resolve().parents[1] / 'config' / 'agent_config.json'
    if not cfg_path.exists():
        print('No agent_config.json found at', cfg_path)
        return
    cfg = load_agent_config(cfg_path)
    agent_id = args.agent or cfg.get('current_agent_id')
    agent = cfg.get('agents', {}).get(agent_id)
    if not agent:
        print('Agent not found:', agent_id)
        return
    print('Agent:', agent_id)
    print('Display name:', agent.get('display_name'))
    print('Model:', agent.get('model'))
    print('Model settings:', json.dumps(agent.get('model_settings', {})))
    print('Permissions:', ','.join(agent.get('permissions', [])))
    print('\nDefault prompt:')
    print(agent.get('default_prompt'))


if __name__ == '__main__':
    main()
