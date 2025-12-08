.PHONY: help install test clean run

help:
	@echo "Task Manager CLI - Makefile Commands"
	@echo "====================================="
	@echo "  make install  - Install and setup the application"
	@echo "  make test      - Run the test suite"
	@echo "  make clean     - Clean up generated files"
	@echo "  make run       - Run example commands"
	@echo "  make help      - Show this help message"

install:
	@echo "Installing Task Manager CLI..."
	@chmod +x src/task_manager.py
	@mkdir -p data
	@echo "✅ Installation complete"

test:
	@echo "Running tests..."
	@python3 test_task_manager.py

clean:
	@echo "Cleaning up..."
	@find . -type d -name __pycache__ -exec rm -r {} + 2>/dev/null || true
	@find . -type f -name "*.pyc" -delete 2>/dev/null || true
	@echo "✅ Cleanup complete"

run:
	@echo "Running example commands..."
	@python3 src/task_manager.py add "Example task" --priority high
	@python3 src/task_manager.py list
