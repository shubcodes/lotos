# Deployment Guide

## Production Deployment Checklist

### Pre-Deployment

- [x] All tests passing
- [x] Code reviewed and documented
- [x] Bug fixes applied (ID generation)
- [x] Error handling implemented
- [x] Data persistence verified

### Deployment Steps

#### 1. Environment Setup

```bash
# Ensure Python 3.8+ is installed
python3 --version

# Create virtual environment (recommended)
python3 -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install dependencies (none required - uses only stdlib)
# No external dependencies needed!
```

#### 2. Installation

```bash
# Clone or copy the project
git clone <repository-url>
cd task-manager-cli

# Make the script executable
chmod +x src/task_manager.py

# Optional: Add to PATH
export PATH=$PATH:$(pwd)/src
```

#### 3. Configuration

The application uses a JSON file for data storage:
- Default location: `data/tasks.json`
- Can be customized by modifying `TASKS_FILE` in `task_manager.py`

#### 4. Verification

```bash
# Run test suite
python3 test_task_manager.py

# Test CLI
python3 src/task_manager.py --help
python3 src/task_manager.py add "Test deployment" --priority high
python3 src/task_manager.py list
```

#### 5. Production Considerations

- **Data Backup**: Regularly backup `data/tasks.json`
- **Permissions**: Ensure write access to data directory
- **Logging**: Consider adding logging for production use
- **Monitoring**: Monitor disk space for data file growth

### System Requirements

- Python 3.8 or higher
- Write access to data directory
- ~1MB disk space for application files

### Rollback Plan

1. Restore previous `data/tasks.json` backup
2. Revert to previous version of `task_manager.py`
3. Re-run tests to verify

### Post-Deployment

- [ ] Monitor application performance
- [ ] Check data file integrity
- [ ] Verify user access
- [ ] Document any issues

## Version Information

- **Version**: 1.0.0
- **Release Date**: 2025-11-20
- **Python Version**: 3.8+
- **Dependencies**: None (stdlib only)
