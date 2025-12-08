#!/usr/bin/env python3
"""
Task Manager CLI - A simple command-line task management tool.
"""

import json
import argparse
import sys
from pathlib import Path
from datetime import datetime
from typing import List, Dict, Optional


TASKS_FILE = Path(__file__).parent.parent / "data" / "tasks.json"


class TaskManager:
    def __init__(self, tasks_file: Path = TASKS_FILE):
        self.tasks_file = tasks_file
        self.tasks_file.parent.mkdir(parents=True, exist_ok=True)
        self.tasks = self._load_tasks()

    def _load_tasks(self) -> List[Dict]:
        """Load tasks from JSON file."""
        if self.tasks_file.exists():
            try:
                with open(self.tasks_file, 'r') as f:
                    return json.load(f)
            except (json.JSONDecodeError, IOError):
                return []
        return []

    def _save_tasks(self):
        """Save tasks to JSON file."""
        with open(self.tasks_file, 'w') as f:
            json.dump(self.tasks, f, indent=2)

    def add_task(self, description: str, priority: str = "medium") -> Dict:
        """Add a new task."""
        # Generate ID as max existing ID + 1 (handles deleted tasks)
        max_id = max([t["id"] for t in self.tasks], default=0)
        task = {
            "id": max_id + 1,
            "description": description,
            "priority": priority.lower(),
            "completed": False,
            "created_at": datetime.now().isoformat()
        }
        self.tasks.append(task)
        self._save_tasks()
        return task

    def list_tasks(self, show_completed: bool = False) -> List[Dict]:
        """List all tasks, optionally including completed ones."""
        if show_completed:
            return self.tasks
        return [task for task in self.tasks if not task.get("completed", False)]

    def complete_task(self, task_id: int) -> Optional[Dict]:
        """Mark a task as completed."""
        for task in self.tasks:
            if task["id"] == task_id:
                task["completed"] = True
                task["completed_at"] = datetime.now().isoformat()
                self._save_tasks()
                return task
        return None

    def delete_task(self, task_id: int) -> bool:
        """Delete a task."""
        initial_count = len(self.tasks)
        self.tasks = [task for task in self.tasks if task["id"] != task_id]
        if len(self.tasks) < initial_count:
            self._save_tasks()
            return True
        return False

    def _format_task(self, task: Dict) -> str:
        """Format a task for display."""
        status = "✓" if task.get("completed", False) else "○"
        priority_colors = {
            "high": "🔴",
            "medium": "🟡",
            "low": "🟢"
        }
        priority_icon = priority_colors.get(task.get("priority", "medium"), "⚪")
        return f"{status} [{task['id']}] {priority_icon} {task['description']}"


def main():
    parser = argparse.ArgumentParser(description="Task Manager CLI")
    subparsers = parser.add_subparsers(dest="command", help="Available commands")

    # Add command
    add_parser = subparsers.add_parser("add", help="Add a new task")
    add_parser.add_argument("description", help="Task description")
    add_parser.add_argument("--priority", choices=["high", "medium", "low"], 
                          default="medium", help="Task priority")

    # List command
    list_parser = subparsers.add_parser("list", help="List all tasks")
    list_parser.add_argument("--all", action="store_true", 
                           help="Show completed tasks too")

    # Complete command
    complete_parser = subparsers.add_parser("complete", help="Mark a task as complete")
    complete_parser.add_argument("id", type=int, help="Task ID to complete")

    # Delete command
    delete_parser = subparsers.add_parser("delete", help="Delete a task")
    delete_parser.add_argument("id", type=int, help="Task ID to delete")

    args = parser.parse_args()

    if not args.command:
        parser.print_help()
        sys.exit(1)

    manager = TaskManager()

    if args.command == "add":
        task = manager.add_task(args.description, args.priority)
        print(f"✓ Added task: {task['description']} (Priority: {task['priority']})")

    elif args.command == "list":
        tasks = manager.list_tasks(show_completed=args.all)
        if not tasks:
            print("No tasks found.")
        else:
            print("\nTasks:")
            print("-" * 50)
            for task in tasks:
                print(manager._format_task(task))
            print("-" * 50)
            print(f"Total: {len(tasks)} task(s)")

    elif args.command == "complete":
        task = manager.complete_task(args.id)
        if task:
            print(f"✓ Completed task: {task['description']}")
        else:
            print(f"✗ Task with ID {args.id} not found.")
            sys.exit(1)

    elif args.command == "delete":
        if manager.delete_task(args.id):
            print(f"✓ Deleted task with ID {args.id}")
        else:
            print(f"✗ Task with ID {args.id} not found.")
            sys.exit(1)


if __name__ == "__main__":
    main()
