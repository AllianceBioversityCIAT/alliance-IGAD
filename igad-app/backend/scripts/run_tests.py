#!/usr/bin/env python3
"""
Script to run unit tests for the Prompt Manager backend
"""

import subprocess
import sys
import os

def run_tests():
    """Run all unit tests with coverage"""
    
    print("🧪 Running Prompt Manager Backend Tests")
    print("=" * 50)
    
    # Change to backend directory
    backend_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    os.chdir(backend_dir)
    
    # Install test dependencies
    print("📦 Installing test dependencies...")
    try:
        subprocess.run([
            sys.executable, "-m", "pip", "install", "-r", "requirements-test.txt"
        ], check=True, capture_output=True)
        print("✅ Dependencies installed")
    except subprocess.CalledProcessError as e:
        print(f"❌ Failed to install dependencies: {e}")
        return False
    
    # Run tests with coverage
    print("\n🔍 Running unit tests with coverage...")
    try:
        result = subprocess.run([
            sys.executable, "-m", "pytest",
            "tests/",
            "-v",
            "--cov=app",
            "--cov-report=term-missing",
            "--cov-report=html:htmlcov",
            "--tb=short",
            "-m", "unit"
        ], check=False)
        
        if result.returncode == 0:
            print("\n✅ All tests passed!")
            print("📊 Coverage report generated in htmlcov/index.html")
            return True
        else:
            print(f"\n❌ Some tests failed (exit code: {result.returncode})")
            return False
            
    except Exception as e:
        print(f"❌ Error running tests: {e}")
        return False

def run_specific_test(test_file=None, test_function=None):
    """Run specific test file or function"""
    
    backend_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    os.chdir(backend_dir)
    
    cmd = [sys.executable, "-m", "pytest", "-v"]
    
    if test_file:
        if test_function:
            cmd.append(f"tests/{test_file}::{test_function}")
        else:
            cmd.append(f"tests/{test_file}")
    
    try:
        result = subprocess.run(cmd, check=False)
        return result.returncode == 0
    except Exception as e:
        print(f"❌ Error running test: {e}")
        return False

def main():
    """Main function"""
    if len(sys.argv) > 1:
        if sys.argv[1] == "--help":
            print("Usage:")
            print("  python run_tests.py                    # Run all tests")
            print("  python run_tests.py test_file.py       # Run specific test file")
            print("  python run_tests.py test_file.py::test_function  # Run specific test")
            return
        
        # Parse specific test arguments
        test_arg = sys.argv[1]
        if "::" in test_arg:
            test_file, test_function = test_arg.split("::", 1)
            success = run_specific_test(test_file, test_function)
        else:
            success = run_specific_test(test_arg)
    else:
        success = run_tests()
    
    sys.exit(0 if success else 1)

if __name__ == "__main__":
    main()
