#!/usr/bin/env python3
"""
Planning Runner - BMAD workflow execution for Planning Mode

This script handles planning chat messages by invoking Claude Code
with BMAD workflow context. It streams responses back to the frontend
and handles artifact generation.
"""

import argparse
import asyncio
import json
import os
import subprocess
import sys
from pathlib import Path
from typing import Optional

# Add auto-claude to path
sys.path.insert(0, str(Path(__file__).parent.parent))

# Load .env file with centralized error handling
from cli.utils import import_dotenv

load_dotenv = import_dotenv()

env_file = Path(__file__).parent.parent / ".env"
if env_file.exists():
    load_dotenv(env_file)

from debug import debug, debug_error, debug_section


# Output markers for IPC communication
STREAM_MARKER = "__PLANNING_STREAM__:"
ARTIFACT_MARKER = "__PLANNING_ARTIFACT__:"
WORKFLOW_MARKER = "__PLANNING_WORKFLOW__:"
ERROR_MARKER = "__PLANNING_ERROR__:"
DONE_MARKER = "__PLANNING_DONE__"


def emit_stream(text: str) -> None:
    """Emit streaming text to frontend."""
    # Send each line with marker
    print(f"{STREAM_MARKER}{text}", flush=True)


def emit_artifact(artifact_type: str, path: str, title: str) -> None:
    """Emit artifact creation notification."""
    data = json.dumps({"type": artifact_type, "path": path, "title": title})
    print(f"{ARTIFACT_MARKER}{data}", flush=True)


def emit_workflow_progress(workflow: str, step: str, status: str) -> None:
    """Emit workflow progress update."""
    data = json.dumps({"workflow": workflow, "step": step, "status": status})
    print(f"{WORKFLOW_MARKER}{data}", flush=True)


def emit_error(message: str) -> None:
    """Emit error message."""
    print(f"{ERROR_MARKER}{message}", flush=True)


def emit_done() -> None:
    """Emit completion signal."""
    print(DONE_MARKER, flush=True)


def get_bmad_workflow_context(workflow_id: str, project_dir: str) -> str:
    """
    Load BMAD workflow context for the current step.

    This provides Claude with information about the BMAD workflow
    being executed so it can guide the user appropriately.
    """
    workflow_descriptions = {
        "product-brief": """You are helping the user create a Product Brief using the BMAD methodology.

The Product Brief is the first step in BMAD planning. Your goal is to:
1. Understand what the user wants to build
2. Ask clarifying questions about the problem, users, and goals
3. Help articulate the product vision clearly

When the user has provided enough information, you can invoke the BMAD product-brief workflow
by using the skill: /bmad:bmm:workflows:create-product-brief

Guide the conversation naturally - ask about:
- What problem are they solving?
- Who are the target users?
- What's the core value proposition?
- What are the key features they envision?
- What constraints or requirements exist?

Be conversational and collaborative. Don't rush - the goal is clarity.""",

        "prd": """You are helping the user create a Product Requirements Document (PRD) using the BMAD methodology.

The PRD builds on the Product Brief to define detailed requirements. Your goal is to:
1. Review the Product Brief for context
2. Define functional requirements (what the system must do)
3. Define non-functional requirements (quality attributes)
4. Establish success criteria

When ready, invoke: /bmad:bmm:workflows:create-prd""",

        "architecture": """You are helping the user design the system Architecture using the BMAD methodology.

Architecture decisions build on the PRD to define how the system will be built. Your goal is to:
1. Review PRD requirements
2. Make key technical decisions
3. Define system components and their interactions
4. Document patterns and constraints

When ready, invoke: /bmad:bmm:workflows:create-architecture""",

        "epics": """You are helping the user create Epics and Stories using the BMAD methodology.

Epics break down the architecture into implementable units. Your goal is to:
1. Review architecture decisions
2. Create logical groupings of work (epics)
3. Break epics into user stories
4. Define acceptance criteria

When ready, invoke: /bmad:bmm:workflows:create-epics-and-stories""",
    }

    return workflow_descriptions.get(workflow_id, workflow_descriptions["product-brief"])


def build_system_prompt(
    workflow_id: str,
    project_dir: str,
    session_context: Optional[dict] = None
) -> str:
    """Build the system prompt for Claude Code."""

    workflow_context = get_bmad_workflow_context(workflow_id, project_dir)

    # Add session context if available
    context_parts = [workflow_context]

    if session_context:
        if session_context.get("artifacts"):
            artifacts_info = "\n\nExisting artifacts in this planning session:"
            for artifact in session_context["artifacts"]:
                artifacts_info += f"\n- {artifact['type']}: {artifact['path']}"
            context_parts.append(artifacts_info)

        if session_context.get("messages"):
            # Include recent conversation history
            recent = session_context["messages"][-10:]  # Last 10 messages
            history = "\n\nRecent conversation:"
            for msg in recent:
                role = "User" if msg["role"] == "user" else "Assistant"
                content = msg["content"][:500]  # Truncate long messages
                history += f"\n{role}: {content}"
            context_parts.append(history)

    return "\n".join(context_parts)


def run_claude_code(
    message: str,
    project_dir: str,
    workflow_id: str,
    session_context: Optional[dict] = None
) -> None:
    """
    Run Claude Code CLI with the planning message.

    Streams output back to the frontend via stdout markers.
    """
    debug_section("Planning Runner")
    debug(f"Project: {project_dir}")
    debug(f"Workflow: {workflow_id}")
    debug(f"Message: {message[:100]}...")

    # Build the prompt with workflow context
    system_prompt = build_system_prompt(workflow_id, project_dir, session_context)

    # Combine system prompt with user message
    full_prompt = f"""{system_prompt}

---

User's message: {message}"""

    emit_workflow_progress(workflow_id, "processing", "started")

    try:
        # Find claude CLI
        claude_cmd = "claude"

        # Build command - use --print for non-interactive mode
        cmd = [
            claude_cmd,
            "-p", full_prompt,
            "--print",  # Non-interactive, prints response
        ]

        debug(f"Running: {' '.join(cmd[:3])}...")

        # Run claude and stream output
        process = subprocess.Popen(
            cmd,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            text=True,
            cwd=project_dir,
            env={**os.environ, "CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC": "1"}
        )

        # Stream stdout
        if process.stdout:
            for line in process.stdout:
                # Check for artifact markers in Claude's output
                if "```" in line and any(ext in line for ext in [".md", ".json", ".yaml"]):
                    # Potential artifact being written - we'll detect this better later
                    pass
                emit_stream(line.rstrip())

        # Wait for completion
        process.wait()

        # Check for errors
        if process.returncode != 0:
            stderr = process.stderr.read() if process.stderr else ""
            if stderr:
                emit_error(f"Claude Code error: {stderr}")

        emit_workflow_progress(workflow_id, "processing", "completed")

    except FileNotFoundError:
        emit_error("Claude Code CLI not found. Please ensure 'claude' is installed and in PATH.")
    except Exception as e:
        emit_error(f"Error running Claude Code: {str(e)}")
    finally:
        emit_done()


def main():
    parser = argparse.ArgumentParser(description="Planning Runner for BMAD workflows")
    parser.add_argument("--project-dir", required=True, help="Path to the project directory")
    parser.add_argument("--message", required=True, help="User message to process")
    parser.add_argument("--workflow", default="product-brief", help="Current workflow ID")
    parser.add_argument("--session-file", help="Path to session context JSON file")

    args = parser.parse_args()

    # Load session context if provided
    session_context = None
    if args.session_file and Path(args.session_file).exists():
        try:
            with open(args.session_file) as f:
                session_context = json.load(f)
        except Exception as e:
            debug_error(f"Failed to load session context: {e}")

    # Run Claude Code with the message
    run_claude_code(
        message=args.message,
        project_dir=args.project_dir,
        workflow_id=args.workflow,
        session_context=session_context
    )


if __name__ == "__main__":
    main()
