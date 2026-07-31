#!/usr/bin/env python3
"""Validate the MDOS package structure and key configuration files."""
import json
import sys
from pathlib import Path
from typing import Dict, List


REQUIRED_FILES = [
    'config/agent_config.json',
    'config/entry_points.json',
    'config/env_config.json',
    'config/master_wiring.json',
    'config/prompt_defaults.json',
    'mdos.workspace.json',
    'data/agents.json',
    'data/decisions.json',
    'data/knowledge.json',
    'data/projects.json',
    'data/skills.json',
    'data/tasks.json',
    'data/workflows.json',
]


def validate_package(root: Path) -> Dict[str, object]:
    issues: List[str] = []
    root = root.resolve()

    for rel_path in REQUIRED_FILES:
        path = root / rel_path
        if not path.exists():
            issues.append(f'Missing file: {rel_path}')
            continue
        try:
            with path.open() as fh:
                json.load(fh)
        except Exception as exc:  # pragma: no cover - defensive
            issues.append(f'Invalid JSON in {rel_path}: {exc}')

    if issues:
        return {'ok': False, 'issues': issues}

    return {'ok': True, 'issues': []}


def main() -> int:
    root = Path(sys.argv[1]).resolve() if len(sys.argv) > 1 else Path(__file__).resolve().parents[1]
    report = validate_package(root)
    if report['ok']:
        print('Package validation passed')
        return 0
    print('Package validation failed:')
    for issue in report['issues']:
        print('-', issue)
    return 1


if __name__ == '__main__':
    main()
