#!/usr/bin/env python3
"""
Simple test script for Task Manager CLI
"""

import sys
import os
from pathlib import Path

# Add src to path
sys.path.insert(0, str(Path(__file__).parent / "src"))

from task_manager import TaskManager

def test_task_manager():
    """Run basic tests on TaskManager."""
    print("Running Task Manager Tests...")
    print("=" * 60)
    
    # Use a test data file
    test_file = Path(__file__).parent / "data" / "test_tasks.json"
    manager = TaskManager(tasks_file=test_file)
    
    # Clean up any existing test data
    if test_file.exists():
        test_file.unlink()
    manager = TaskManager(tasks_file=test_file)
    
    # Test 1: Add tasks
    print("\n1. Testing add_task()...")
    task1 = manager.add_task("Test task 1", "high")
    task2 = manager.add_task("Test task 2", "low")
    assert task1["id"] == 1
    assert task2["id"] == 2
    assert len(manager.tasks) == 2
    print("   ✓ Add task works correctly")
    
    # Test 2: List tasks
    print("\n2. Testing list_tasks()...")
    tasks = manager.list_tasks()
    assert len(tasks) == 2
    assert all(not t.get("completed", False) for t in tasks)
    print("   ✓ List tasks works correctly")
    
    # Test 3: Complete task
    print("\n3. Testing complete_task()...")
    completed = manager.complete_task(1)
    assert completed is not None
    assert completed["completed"] == True
    assert "completed_at" in completed
    tasks = manager.list_tasks()
    assert len(tasks) == 1  # Only uncompleted tasks
    print("   ✓ Complete task works correctly")
    
    # Test 4: Delete task
    print("\n4. Testing delete_task()...")
    deleted = manager.delete_task(2)
    assert deleted == True
    assert len(manager.tasks) == 1
    print("   ✓ Delete task works correctly")
    
    # Cleanup
    if test_file.exists():
        test_file.unlink()
    
    print("\n" + "=" * 60)
    print("All tests passed! ✓")

if __name__ == "__main__":
    test_task_manager()
