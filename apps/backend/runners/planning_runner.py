#!/usr/bin/env python3
"""
Planning Runner - BMAD workflow execution for Planning Mode

This script handles planning chat messages using Claude Agent SDK
with BMAD workflow context. It streams responses back to the frontend.
"""

import argparse
import asyncio
import json
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

try:
    from claude_agent_sdk import ClaudeAgentOptions, ClaudeSDKClient

    SDK_AVAILABLE = True
except ImportError:
    SDK_AVAILABLE = False
    ClaudeAgentOptions = None
    ClaudeSDKClient = None

from core.auth import ensure_claude_code_oauth_token, get_auth_token
from debug import debug, debug_detailed, debug_error, debug_section
from phase_config import resolve_model_id


def get_bmad_system_prompt(workflow_id: str, project_dir: str, session_context: Optional[dict] = None) -> str:
    """
    Build the BMAD workflow system prompt.

    This provides Claude with instructions for guiding the user through
    the BMAD planning methodology.
    """
    workflow_prompts = {
        "product-brief": """You are a skilled Business Analyst helping the user create a Product Brief using the BMAD methodology.

The Product Brief is the foundation of BMAD planning. Your role is to:
1. Understand what the user wants to build through collaborative discovery
2. Ask clarifying questions about the problem, users, goals, and constraints
3. Help articulate the product vision clearly and concisely
4. Guide them toward a complete brief without overwhelming them

Key areas to explore:
- **Problem Statement**: What problem are they solving? Why does it matter?
- **Target Users**: Who will use this? What are their needs and pain points?
- **Value Proposition**: What's the core value? Why would users choose this?
- **Key Features**: What are the essential features for MVP?
- **Constraints**: Budget, timeline, technical limitations, team size?
- **Success Criteria**: How will they know it's successful?

Communication style:
- Be conversational and collaborative, not interrogative
- Ask 1-2 questions at a time, not a checklist
- Build on their answers, show you understand
- Offer suggestions and examples when helpful
- Summarize key points periodically

When you have enough information for a complete Product Brief, summarize what you've learned and ask if they're ready to move to the PRD phase.""",

        "prd": """You are a skilled Product Manager helping the user create a Product Requirements Document (PRD) using the BMAD methodology.

The PRD builds on the Product Brief to define detailed requirements. Your role is to:
1. Review the Product Brief context provided
2. Define clear functional requirements (what the system must do)
3. Define non-functional requirements (quality attributes)
4. Establish success criteria and metrics

Key areas to cover:
- **Functional Requirements**: Specific features and behaviors, organized by capability area
- **Non-Functional Requirements**: Performance, security, usability, reliability
- **User Journeys**: Key user flows through the system
- **Success Metrics**: Measurable outcomes
- **Scope**: What's in MVP vs. future phases

Guide the conversation to systematically cover each area while keeping it natural.""",

        "architecture": """You are a skilled Software Architect helping the user design the system Architecture using the BMAD methodology.

Architecture decisions build on the PRD requirements. Your role is to:
1. Review PRD requirements and constraints
2. Make key technical decisions with clear rationale
3. Define system components and their interactions
4. Document patterns and architectural principles

Key decisions to address:
- **Technology Stack**: Languages, frameworks, databases
- **System Components**: Major modules and their responsibilities
- **Data Architecture**: How data flows and is stored
- **Integration Points**: APIs, external services
- **Security Architecture**: Authentication, authorization, data protection
- **Deployment Architecture**: Infrastructure, scaling, environments

For each decision, explain the options considered and rationale for the choice.""",

        "epics": """You are a skilled Product Manager helping the user create Epics and Stories using the BMAD methodology.

Epics and Stories break down the architecture into implementable units. Your role is to:
1. Review architecture decisions and PRD requirements
2. Create logical groupings of work (epics)
3. Break epics into user stories with clear acceptance criteria
4. Ensure stories are small enough to implement in 1-2 days

Story format:
- **Title**: Clear, action-oriented
- **As a [user type], I want [capability] so that [benefit]**
- **Acceptance Criteria**: Specific, testable conditions

Organize stories by epic, prioritize by value and dependencies.""",
    }

    base_prompt = workflow_prompts.get(workflow_id, workflow_prompts["product-brief"])

    # Add session context if available
    context_parts = [base_prompt]

    if session_context:
        if session_context.get("artifacts"):
            artifacts_info = "\n\n## Existing Artifacts\nThe following planning artifacts have been created in this session:"
            for artifact in session_context.get("artifacts", []):
                artifact_type = artifact.get("type", "unknown")
                artifact_path = artifact.get("path", "")
                artifacts_info += f"\n- {artifact_type}: {artifact_path}"
            context_parts.append(artifacts_info)

    return "\n".join(context_parts)


async def run_with_sdk(
    project_dir: str,
    message: str,
    workflow_id: str,
    session_context: Optional[dict] = None,
) -> None:
    """Run the planning chat using Claude SDK with streaming."""
    if not SDK_AVAILABLE:
        print("Error: Claude SDK not available. Please install claude-agent-sdk.", flush=True)
        return

    if not get_auth_token():
        print("Error: No authentication token found. Please run 'claude auth' to authenticate.", flush=True)
        return

    # Ensure SDK can find the token
    ensure_claude_code_oauth_token()

    system_prompt = get_bmad_system_prompt(workflow_id, project_dir, session_context)
    project_path = Path(project_dir).resolve()

    # Build conversation context from session history
    conversation_context = ""
    if session_context and session_context.get("messages"):
        for msg in session_context.get("messages", [])[-20:]:  # Last 20 messages for context
            role = "User" if msg.get("role") == "user" else "Assistant"
            content = msg.get("content", "")[:2000]  # Truncate long messages
            conversation_context += f"\n{role}: {content}\n"

    # Build the full prompt with conversation history
    full_prompt = message
    if conversation_context.strip():
        full_prompt = f"""Previous conversation:
{conversation_context}

Current message: {message}"""

    debug_section("planning_runner", "Planning Runner")
    debug("planning_runner", "Starting", workflow=workflow_id, project=project_dir)

    try:
        # Create Claude SDK client for planning
        client = ClaudeSDKClient(
            options=ClaudeAgentOptions(
                model=resolve_model_id("sonnet"),  # Use Sonnet for planning
                system_prompt=system_prompt,
                allowed_tools=[
                    "Read",  # Allow reading project files for context
                    "Glob",  # Allow file searching
                    "Grep",  # Allow content searching
                ],
                max_turns=30,  # Allow sufficient turns for conversation
                cwd=str(project_path),
            )
        )

        # Use async context manager pattern
        async with client:
            # Send the query
            await client.query(full_prompt)

            # Stream the response
            async for msg in client.receive_response():
                msg_type = type(msg).__name__

                if msg_type == "AssistantMessage" and hasattr(msg, "content"):
                    for block in msg.content:
                        block_type = type(block).__name__

                        if block_type == "TextBlock" and hasattr(block, "text"):
                            # Print text directly - IPC handler will stream it
                            print(block.text, flush=True)

                        elif block_type == "ToolUseBlock" and hasattr(block, "name"):
                            # Emit tool usage info
                            tool_name = block.name
                            tool_input = ""
                            if hasattr(block, "input") and block.input:
                                inp = block.input
                                if isinstance(inp, dict):
                                    if "pattern" in inp:
                                        tool_input = f"pattern: {inp['pattern']}"
                                    elif "file_path" in inp:
                                        fp = inp["file_path"]
                                        if len(fp) > 50:
                                            fp = "..." + fp[-47:]
                                        tool_input = fp
                            print(f"[Using {tool_name}: {tool_input}]", flush=True)

                elif msg_type == "ToolResultMessage":
                    # Tool results - don't print raw results, just acknowledge
                    pass

    except Exception as e:
        debug_error("planning_runner", f"SDK error: {e}")
        print(f"Error during planning: {str(e)}", flush=True)


def run_simple(project_dir: str, message: str, workflow_id: str) -> None:
    """Fallback mode without SDK - just echo back."""
    print(f"Planning mode requires Claude authentication.", flush=True)
    print(f"Please run 'claude auth' to authenticate, then try again.", flush=True)


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
            debug_error("planning_runner", f"Failed to load session context: {e}")

    # Run with SDK
    asyncio.run(run_with_sdk(
        project_dir=args.project_dir,
        message=args.message,
        workflow_id=args.workflow,
        session_context=session_context
    ))


if __name__ == "__main__":
    main()
