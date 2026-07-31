import unittest
from pathlib import Path
import importlib.util

ROOT = Path(__file__).resolve().parents[1]
MODULE_PATH = ROOT / 'scripts' / 'validate_package.py'

spec = importlib.util.spec_from_file_location('validate_package', MODULE_PATH)
validate_package = importlib.util.module_from_spec(spec)
spec.loader.exec_module(validate_package)


class ValidatePackageTests(unittest.TestCase):
    def test_validate_package_passes_for_current_workspace(self):
        report = validate_package.validate_package(ROOT)
        self.assertTrue(report['ok'], msg=report['issues'])


if __name__ == '__main__':
    unittest.main()
