# Task Manager CLI

A simple command-line task management tool built with Python.

## Features

- Add tasks with descriptions and priorities
- List all tasks
- Mark tasks as complete
- Delete tasks
- Persistent storage using JSON

## Usage

```bash
python src/task_manager.py add "Buy groceries" --priority high
python src/task_manager.py list
python src/task_manager.py complete 1
python src/task_manager.py delete 1
```

## Project Structure

```
.
├── README.md
├── requirements.txt
├── src/
│   └── task_manager.py
└── data/
    └── tasks.json
```
