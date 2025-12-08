# Changelog

All notable changes to Task Manager CLI will be documented in this file.

## [1.0.0] - 2025-11-20

### Added
- Initial release of Task Manager CLI
- Add tasks with descriptions and priority levels (high/medium/low)
- List all tasks with visual indicators
- Mark tasks as completed
- Delete tasks
- Filter completed tasks from active list
- Persistent JSON storage
- Comprehensive test suite
- CLI interface with argparse
- Error handling for invalid operations
- Data integrity validation

### Fixed
- ID generation bug that caused duplicate IDs when tasks were deleted
- Now uses max existing ID + 1 instead of len + 1

### Security
- No external dependencies (stdlib only)
- Input validation for task IDs and priorities
- Path traversal protection in file operations

### Performance
- Efficient JSON-based storage
- Fast task lookups by ID
- Minimal memory footprint

## [Unreleased]

### Planned Features
- Task editing capability
- Due dates for tasks
- Task categories/tags
- Search functionality
- Export to CSV/JSON
- Recurring tasks
- Task notes/descriptions
