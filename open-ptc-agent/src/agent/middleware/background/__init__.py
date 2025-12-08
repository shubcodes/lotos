"""Background subagent execution middleware.

This module provides async/background execution for subagent tasks,
allowing the main agent to continue working while subagents run.
"""

from src.agent.middleware.background.registry import BackgroundTask, BackgroundTaskRegistry
from src.agent.middleware.background.middleware import (
    BackgroundSubagentMiddleware,
    current_background_task_id,
)
from src.agent.middleware.background.orchestrator import BackgroundSubagentOrchestrator
from src.agent.middleware.background.counter import ToolCallCounterMiddleware
from src.agent.middleware.background.tools import (
    create_wait_tool,
    create_task_progress_tool,
)

__all__ = [
    "BackgroundTask",
    "BackgroundTaskRegistry",
    "BackgroundSubagentMiddleware",
    "BackgroundSubagentOrchestrator",
    "ToolCallCounterMiddleware",
    "create_wait_tool",
    "create_task_progress_tool",
    "current_background_task_id",
]
