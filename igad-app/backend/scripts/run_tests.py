#!/usr/bin/env python3
import os
import subprocess
import sys


def main():
    backend_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    os.chdir(backend_dir)

    # Install dependencies
    subprocess.run(
        [sys.executable, "-m", "pip", "install", "-r", "requirements-test.txt"],
        check=True,
    )

    # Run tests
    cmd = [
        sys.executable,
        "-m",
        "pytest",
        "tests/",
        "-v",
        "--cov=app",
        "--cov-report=term-missing",
    ]

    if len(sys.argv) > 1:
        cmd.append(f"tests/{sys.argv[1]}")

    result = subprocess.run(cmd)
    sys.exit(result.returncode)


if __name__ == "__main__":
    main()
