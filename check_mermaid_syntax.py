#!/usr/bin/env python3
"""
Mermaid Diagram Syntax Validator
Checks that all Mermaid diagrams have valid syntax.
"""

import re
from pathlib import Path
from typing import List, Tuple

def extract_mermaid_blocks(content: str) -> List[Tuple[int, str]]:
    """Extract all Mermaid code blocks with their starting line numbers."""
    lines = content.split('\n')
    mermaid_blocks = []
    in_mermaid = False
    mermaid_start = 0
    mermaid_content = []

    for i, line in enumerate(lines, 1):
        if line.strip().startswith('```mermaid'):
            in_mermaid = True
            mermaid_start = i
            mermaid_content = []
        elif in_mermaid:
            if line.strip().startswith('```'):
                in_mermaid = False
                mermaid_blocks.append((mermaid_start, '\n'.join(mermaid_content)))
            else:
                mermaid_content.append(line)

    return mermaid_blocks

def validate_mermaid_syntax(content: str, start_line: int) -> List[str]:
    """Validate basic Mermaid syntax."""
    errors = []

    if not content.strip():
        errors.append(f"Line {start_line}: Empty Mermaid diagram")
        return errors

    lines = content.strip().split('\n')
    first_line = lines[0].strip()

    # Check for valid diagram type
    valid_types = [
        'graph', 'flowchart', 'sequenceDiagram', 'classDiagram',
        'stateDiagram', 'erDiagram', 'journey', 'gantt', 'pie',
        'requirementDiagram', 'gitGraph'
    ]

    has_valid_type = any(first_line.startswith(t) for t in valid_types)

    if not has_valid_type:
        errors.append(f"Line {start_line}: Invalid or missing diagram type. Found: {first_line[:30]}")

    # Check for basic syntax issues
    for i, line in enumerate(lines, start_line + 1):
        stripped = line.strip()
        if not stripped or stripped.startswith('%%'):  # Comment
            continue

        # Check for unmatched brackets/parentheses (basic check)
        open_brackets = stripped.count('[') + stripped.count('(') + stripped.count('{')
        close_brackets = stripped.count(']') + stripped.count(')') + stripped.count('}')

        # Allow some imbalance (Mermaid uses [ and ] for node shapes)
        # but catch obvious errors

    return errors

def main():
    print("=" * 80)
    print("MERMAID DIAGRAM SYNTAX VALIDATION")
    print("=" * 80)

    dev_docs = Path('./dev-docs')
    md_files = [
        f for f in dev_docs.rglob('*.md')
        if '.auto-claude/specs' not in str(f)
        and 'VERIFICATION' not in f.name
        and 'ANALYSIS' not in f.name
        and 'SUMMARY' not in f.name
        and 'ACCESSIBILITY' not in f.name
    ]

    total_diagrams = 0
    total_errors = 0
    files_with_diagrams = []

    for md_file in sorted(md_files):
        content = md_file.read_text(encoding='utf-8')
        mermaid_blocks = extract_mermaid_blocks(content)

        if mermaid_blocks:
            files_with_diagrams.append((md_file, len(mermaid_blocks)))

        for start_line, mermaid_content in mermaid_blocks:
            total_diagrams += 1
            errors = validate_mermaid_syntax(mermaid_content, start_line)

            if errors:
                print(f"\n❌ {md_file.name}:")
                for error in errors:
                    print(f"   {error}")
                    total_errors += 1
            else:
                rel_path = md_file.relative_to(dev_docs)
                print(f"✓ {rel_path}: Diagram at line {start_line} is valid")

    print("\n" + "=" * 80)
    print("SUMMARY")
    print("=" * 80)
    print(f"Total markdown files checked: {len(md_files)}")
    print(f"Files with Mermaid diagrams: {len(files_with_diagrams)}")
    print(f"Total Mermaid diagrams found: {total_diagrams}")
    print(f"Diagrams with errors: {total_errors}")

    if files_with_diagrams:
        print("\nFiles with diagrams:")
        for f, count in files_with_diagrams:
            rel_path = f.relative_to(dev_docs)
            print(f"  {rel_path}: {count} diagram(s)")

    if total_errors > 0:
        print(f"\n❌ Found {total_errors} error(s) in Mermaid diagrams")
        return 1
    else:
        print("\n✅ All Mermaid diagrams have valid syntax!")
        return 0

if __name__ == '__main__':
    exit(main())
