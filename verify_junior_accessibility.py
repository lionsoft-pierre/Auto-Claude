#!/usr/bin/env python3
"""
Verify junior developer accessibility of documentation.

Checks:
1. Technical terms are defined on first use
2. Concepts explained with examples
3. No unexplained jargon
4. Step-by-step explanations for complex topics
5. Troubleshooting sections included
"""

import json
import re
from pathlib import Path
from typing import List, Dict, Tuple

# Technical terms that should be defined in docs
TECHNICAL_TERMS = {
    "IPC": "Inter-Process Communication",
    "agent": "AI agent",
    "worktree": "git worktree",
    "Zustand": "state management",
    "Graphiti": "knowledge graph",
    "MCP": "Model Context Protocol",
    "preload": "Electron preload",
    "renderer": "renderer process",
    "context bridge": "Electron contextBridge",
}

def find_markdown_files(docs_dir: Path) -> List[Path]:
    """Find all markdown files in dev-docs/"""
    return list(docs_dir.glob("**/*.md"))

def check_troubleshooting_section(file_path: Path) -> Dict:
    """Check if file has troubleshooting/common issues section"""
    content = file_path.read_text()

    # Look for troubleshooting headers
    patterns = [
        r"##\s+(Troubleshooting|Common Issues|Common Problems)",
        r"###\s+(Troubleshooting|Common Issues|Common Problems)",
    ]

    has_troubleshooting = any(re.search(p, content, re.IGNORECASE) for p in patterns)

    return {
        "has_section": has_troubleshooting,
        "location": find_header_line(content, patterns) if has_troubleshooting else None
    }

def find_header_line(content: str, patterns: List[str]) -> int:
    """Find line number of first matching header"""
    lines = content.split("\n")
    for i, line in enumerate(lines, 1):
        for pattern in patterns:
            if re.search(pattern, line, re.IGNORECASE):
                return i
    return None

def check_code_examples(file_path: Path) -> Dict:
    """Check if file has code examples with explanations"""
    content = file_path.read_text()

    # Find code blocks
    code_blocks = re.findall(r"```[\w]*\n(.*?)```", content, re.DOTALL)

    # Check for explanatory text near code blocks
    has_examples = len(code_blocks) > 0

    # Count code blocks with context (preceded by explanatory text)
    lines = content.split("\n")
    explained_blocks = 0
    in_code_block = False
    prev_line = ""

    for line in lines:
        if line.startswith("```"):
            if not in_code_block and prev_line.strip():
                # Code block starts after non-empty line (likely explanation)
                explained_blocks += 1
            in_code_block = not in_code_block
        prev_line = line

    return {
        "has_examples": has_examples,
        "total_blocks": len(code_blocks),
        "explained_blocks": explained_blocks,
        "ratio": explained_blocks / len(code_blocks) if code_blocks else 0
    }

def check_term_definitions(file_path: Path, terms: Dict[str, str]) -> Dict:
    """Check if technical terms are defined on first use"""
    content = file_path.read_text()

    findings = {}
    for term, description in terms.items():
        # Case-insensitive search for term
        term_pattern = re.compile(r'\b' + re.escape(term) + r'\b', re.IGNORECASE)
        matches = list(term_pattern.finditer(content))

        if not matches:
            findings[term] = {"found": False, "defined": False}
            continue

        # Check if term is explained near first occurrence
        first_match = matches[0]
        context_start = max(0, first_match.start() - 200)
        context_end = min(len(content), first_match.end() + 200)
        context = content[context_start:context_end]

        # Look for definition patterns
        definition_patterns = [
            rf"{term}.*?(?:is|are|refers to|means)",
            rf"(?:is|are|refers to|means).*?{term}",
            rf"\*\*{term}\*\*.*?-",  # Bold term with dash (common definition pattern)
        ]

        has_definition = any(re.search(p, context, re.IGNORECASE) for p in definition_patterns)

        findings[term] = {
            "found": True,
            "defined": has_definition,
            "first_occurrence_line": content[:first_match.start()].count("\n") + 1
        }

    return findings

def check_step_by_step(file_path: Path) -> Dict:
    """Check for step-by-step explanations"""
    content = file_path.read_text()

    # Look for numbered steps or sequential instructions
    patterns = [
        r"(?:^|\n)#{2,4}\s+Step\s+\d+",  # ## Step 1, ### Step 1, etc.
        r"(?:^|\n)\d+\.\s+\*\*",  # 1. **Bold text
        r"(?:^|\n)\*\*Step\s+\d+",  # **Step 1
    ]

    step_by_step_sections = []
    for pattern in patterns:
        matches = re.finditer(pattern, content)
        for match in matches:
            line_num = content[:match.start()].count("\n") + 1
            step_by_step_sections.append(line_num)

    return {
        "has_steps": len(step_by_step_sections) > 0,
        "count": len(step_by_step_sections),
        "locations": sorted(set(step_by_step_sections))
    }

def check_jargon(file_path: Path) -> Dict:
    """Check for unexplained jargon"""
    content = file_path.read_text()

    # Common jargon terms that should be explained
    jargon_terms = [
        "orchestration", "ephemeral", "idempotent", "monorepo",
        "worktree", "IPC", "context isolation", "preload",
        "renderer process", "main process", "semantic search",
        "knowledge graph", "embeddings", "subtask", "subagent"
    ]

    unexplained = []
    explained = []

    for term in jargon_terms:
        if term.lower() in content.lower():
            # Check if explained (has definition or context nearby)
            pattern = re.compile(r'\b' + re.escape(term) + r'\b', re.IGNORECASE)
            matches = list(pattern.finditer(content))

            if matches:
                first_match = matches[0]
                context_start = max(0, first_match.start() - 300)
                context_end = min(len(content), first_match.end() + 300)
                context = content[context_start:context_end]

                # Check for explanatory patterns
                explanation_indicators = [
                    "is a", "is the", "refers to", "means", "allows", "enables",
                    "**" + term + "**", f"- **{term}", "### " + term, "## " + term
                ]

                is_explained = any(indicator.lower() in context.lower()
                                  for indicator in explanation_indicators)

                if is_explained:
                    explained.append(term)
                else:
                    unexplained.append(term)

    return {
        "unexplained": unexplained,
        "explained": explained,
        "total_jargon": len(unexplained) + len(explained)
    }

def generate_report(docs_dir: Path) -> str:
    """Generate comprehensive accessibility report"""
    files = find_markdown_files(docs_dir)

    # Skip verification reports
    files = [f for f in files if "VERIFICATION" not in f.name]

    report = ["# Junior Developer Accessibility Verification Report\n"]
    report.append(f"Generated: {Path.cwd()}\n")
    report.append(f"Total documentation files checked: {len(files)}\n")

    # Track overall statistics
    total_with_troubleshooting = 0
    total_with_examples = 0
    total_with_steps = 0
    all_term_findings = {}
    all_unexplained_jargon = []

    report.append("\n## Summary by File\n")

    for file_path in sorted(files):
        relative_path = file_path.relative_to(docs_dir.parent)
        report.append(f"\n### {relative_path}\n")

        # Check troubleshooting
        troubleshooting = check_troubleshooting_section(file_path)
        if troubleshooting["has_section"]:
            total_with_troubleshooting += 1
            report.append(f"✅ Troubleshooting section: Yes (line {troubleshooting['location']})\n")
        else:
            report.append(f"⚠️  Troubleshooting section: No\n")

        # Check code examples
        examples = check_code_examples(file_path)
        if examples["has_examples"]:
            total_with_examples += 1
            ratio = examples["ratio"] * 100
            report.append(f"✅ Code examples: {examples['total_blocks']} blocks, {examples['explained_blocks']} explained ({ratio:.0f}%)\n")
        else:
            report.append(f"ℹ️  Code examples: None (OK for overview docs)\n")

        # Check step-by-step
        steps = check_step_by_step(file_path)
        if steps["has_steps"]:
            total_with_steps += 1
            report.append(f"✅ Step-by-step explanations: {steps['count']} sections\n")
        else:
            report.append(f"ℹ️  Step-by-step explanations: None (OK for reference docs)\n")

        # Check jargon
        jargon = check_jargon(file_path)
        if jargon["unexplained"]:
            all_unexplained_jargon.extend(jargon["unexplained"])
            report.append(f"⚠️  Unexplained jargon: {', '.join(jargon['unexplained'][:3])}{'...' if len(jargon['unexplained']) > 3 else ''}\n")
        else:
            report.append(f"✅ Jargon: All terms explained or contextual\n")

    # Overall summary
    report.append(f"\n## Overall Statistics\n")
    report.append(f"- Files with troubleshooting sections: {total_with_troubleshooting}/{len(files)}\n")
    report.append(f"- Files with code examples: {total_with_examples}/{len(files)}\n")
    report.append(f"- Files with step-by-step explanations: {total_with_steps}/{len(files)}\n")

    # Verification checklist
    report.append(f"\n## QA Verification Checklist\n")
    report.append(f"- [{'x' if total_with_examples >= len(files) * 0.7 else ' '}] ✅ Code examples present in most files (70%+)\n")
    report.append(f"- [{'x' if total_with_troubleshooting >= 5 else ' '}] ✅ Troubleshooting sections in key docs (5+)\n")
    report.append(f"- [{'x' if total_with_steps >= 5 else ' '}] ✅ Step-by-step explanations in setup/workflow docs (5+)\n")
    report.append(f"- [{'x' if len(set(all_unexplained_jargon)) < 5 else ' '}] ✅ Minimal unexplained jargon (< 5 unique terms)\n")

    report.append(f"\n## Conclusion\n")

    # Calculate pass/fail
    passes = [
        total_with_examples >= len(files) * 0.7,
        total_with_troubleshooting >= 5,
        total_with_steps >= 5,
        len(set(all_unexplained_jargon)) < 5
    ]

    if all(passes):
        report.append("✅ **PASS** - Documentation meets junior developer accessibility standards.\n")
    else:
        report.append("⚠️  **NEEDS IMPROVEMENT** - Some accessibility criteria not fully met.\n")
        report.append("\nRecommendations:\n")
        if not passes[0]:
            report.append("- Add more code examples with explanatory context\n")
        if not passes[1]:
            report.append("- Add troubleshooting sections to more documentation files\n")
        if not passes[2]:
            report.append("- Add step-by-step instructions for complex procedures\n")
        if not passes[3]:
            report.append(f"- Define or provide context for: {', '.join(list(set(all_unexplained_jargon))[:10])}\n")

    return "".join(report)

if __name__ == "__main__":
    docs_dir = Path("dev-docs")

    if not docs_dir.exists():
        print("Error: dev-docs/ directory not found")
        exit(1)

    report = generate_report(docs_dir)

    # Save report
    output_file = docs_dir / "JUNIOR_ACCESSIBILITY_REPORT.md"
    output_file.write_text(report)

    print(report)
    print(f"\nReport saved to: {output_file}")
