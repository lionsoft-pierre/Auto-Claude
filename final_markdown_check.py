#!/usr/bin/env python3
"""
Final comprehensive markdown check.
Validates all markdown files can be parsed without errors.
"""

import re
from pathlib import Path
from typing import List, Tuple

def check_balanced_brackets(content: str, filename: str) -> List[str]:
    """Check for balanced brackets outside of code blocks."""
    errors = []
    lines = content.split('\n')
    in_code_block = False

    for i, line in enumerate(lines, 1):
        # Track code blocks
        if line.strip().startswith('```') or line.strip().startswith('~~~'):
            in_code_block = not in_code_block
            continue

        # Skip lines inside code blocks
        if in_code_block:
            continue

        # Count brackets in markdown context (not in code)
        # Only check for markdown link patterns [text](url) or [text][ref]
        # Use a more sophisticated pattern

        # Find all potential markdown links
        pos = 0
        while pos < len(line):
            idx = line.find('[', pos)
            if idx == -1:
                break

            # Look for closing ]
            close_idx = line.find(']', idx)
            if close_idx == -1:
                # Check if this looks like a link or just a bracket in text
                # Only flag if there's substantial text after [ suggesting it's a link
                remaining = line[idx:idx+50]
                if len(remaining) > 5 and ' ' in remaining[1:]:
                    # Has text, might be a link
                    # But check if it's in inline code
                    before_backticks = line[:idx].count('`')
                    if before_backticks % 2 == 0:  # Even number means we're outside inline code
                        errors.append(f"{filename}:{i}: Possible unclosed bracket: {remaining[:30]}...")
                break

            pos = close_idx + 1

    return errors

def check_code_blocks(content: str, filename: str) -> List[str]:
    """Verify all code blocks are properly closed."""
    errors = []
    lines = content.split('\n')
    fence_count = 0
    fence_starts = []

    for i, line in enumerate(lines, 1):
        if line.strip().startswith('```') or line.strip().startswith('~~~'):
            if fence_count % 2 == 0:
                fence_starts.append(i)
            fence_count += 1

    if fence_count % 2 != 0:
        errors.append(f"{filename}: Unclosed code block (started at line {fence_starts[-1]})")

    return errors

def check_headings(content: str, filename: str) -> List[str]:
    """Check heading formatting."""
    errors = []
    lines = content.split('\n')
    in_code_block = False

    for i, line in enumerate(lines, 1):
        if line.strip().startswith('```'):
            in_code_block = not in_code_block
            continue

        if in_code_block:
            continue

        # Check for headings without space
        if line.strip().startswith('#') and len(line.strip()) > 1:
            match = re.match(r'^(#{1,6})([^\s#])', line.strip())
            if match:
                errors.append(f"{filename}:{i}: Heading missing space after #: {line.strip()[:40]}")

    return errors

def check_tables(content: str, filename: str) -> List[str]:
    """Check table formatting."""
    errors = []
    lines = content.split('\n')
    in_code_block = False

    for i, line in enumerate(lines, 1):
        if line.strip().startswith('```'):
            in_code_block = not in_code_block
            continue

        if in_code_block:
            continue

        # Check for table rows
        if '|' in line and line.strip().count('|') >= 2:
            stripped = line.strip()

            # Skip ASCII art patterns
            if re.match(r'^[\s\|+\-]+$', stripped):
                continue

            # Skip separator rows
            if re.match(r'^\|[\s:-]+\|', stripped):
                continue

            # Check if it's a proper table row
            if stripped.count('|') >= 3:  # Likely a table
                if not (stripped.startswith('|') and stripped.endswith('|')):
                    errors.append(f"{filename}:{i}: Table row should start and end with |")

    return errors

def main():
    print("=" * 80)
    print("FINAL MARKDOWN VALIDATION")
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

    all_errors = []

    for md_file in sorted(md_files):
        content = md_file.read_text(encoding='utf-8')

        # Run all checks
        all_errors.extend(check_code_blocks(content, md_file.name))
        all_errors.extend(check_headings(content, md_file.name))
        all_errors.extend(check_tables(content, md_file.name))
        all_errors.extend(check_balanced_brackets(content, md_file.name))

    if all_errors:
        print("\n❌ ERRORS FOUND:\n")
        for error in all_errors:
            print(f"  {error}")
        print(f"\nTotal errors: {len(all_errors)}")
        return 1
    else:
        print("\n✅ ALL CHECKS PASSED!")
        print(f"\nVerified {len(md_files)} markdown files:")
        for f in sorted(md_files):
            rel_path = f.relative_to(Path('./dev-docs'))
            print(f"  ✓ {rel_path}")
        print("\n✅ No markdown syntax errors found!")
        return 0

if __name__ == '__main__':
    exit(main())
