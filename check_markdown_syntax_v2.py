#!/usr/bin/env python3
"""
Markdown Syntax Validator (v2)
Checks for common markdown syntax errors in documentation files.
Properly handles code blocks to avoid false positives.
"""

import re
import sys
from pathlib import Path
from typing import List, Tuple

class MarkdownValidator:
    def __init__(self, file_path: str):
        self.file_path = file_path
        self.content = Path(file_path).read_text(encoding='utf-8')
        self.lines = self.content.split('\n')
        self.errors: List[Tuple[int, str, str]] = []

        # Track code block regions
        self.code_block_lines = set()
        self._identify_code_blocks()

    def _identify_code_blocks(self):
        """Identify all lines that are inside code blocks."""
        in_code_block = False

        for i, line in enumerate(self.lines):
            if re.match(r'^```|^~~~', line.strip()):
                in_code_block = not in_code_block

            if in_code_block:
                self.code_block_lines.add(i)

    def is_in_code_block(self, line_num: int) -> bool:
        """Check if a line number (0-indexed) is inside a code block."""
        return line_num in self.code_block_lines

    def validate(self) -> bool:
        """Run all validation checks. Returns True if valid, False if errors found."""
        self.check_code_blocks()
        self.check_tables()
        self.check_links()
        self.check_mermaid_blocks()
        self.check_headings()
        return len(self.errors) == 0

    def check_code_blocks(self):
        """Check for unclosed code blocks."""
        in_code_block = False
        code_block_start_line = None

        for i, line in enumerate(self.lines, 1):
            # Check for code fence (``` or ~~~)
            if re.match(r'^```|^~~~', line.strip()):
                if not in_code_block:
                    in_code_block = True
                    code_block_start_line = i
                else:
                    in_code_block = False
                    code_block_start_line = None

        if in_code_block:
            self.errors.append((
                code_block_start_line,
                "Unclosed code block",
                f"Code block starting at line {code_block_start_line} is not closed"
            ))

    def check_tables(self):
        """Check for malformed tables."""
        for i, line in enumerate(self.lines, 1):
            # Skip lines in code blocks
            if self.is_in_code_block(i - 1):
                continue

            stripped = line.strip()

            # Check if line looks like a table row (has pipes and looks like a table)
            if '|' in stripped and stripped.count('|') >= 2:
                # Check if this is an actual table row (not ASCII art or code)
                # Table rows should have consistent structure

                # Skip lines that are clearly not tables (ASCII diagrams in code)
                if re.match(r'^\s*\|[\s\|+-]+$', stripped):
                    # This is likely ASCII art (just pipes, spaces, and connectors)
                    continue

                # Real table rows should start and end with |
                if '|' in stripped:
                    parts = [p.strip() for p in stripped.split('|')]
                    # If it starts with |, first part will be empty
                    # If it ends with |, last part will be empty

                    # Check if it's a separator row (| --- | --- |)
                    if re.match(r'^\|[\s:-]*\|[\s|:-]*\|$', stripped):
                        continue  # Separator rows are fine

                    # For data rows, check basic structure
                    # Must start with | and end with |
                    if not (stripped.startswith('|') and stripped.endswith('|')):
                        # Only flag if it clearly looks like a table row
                        if stripped.count('|') >= 3:  # At least 3 pipes means likely a table
                            self.errors.append((
                                i,
                                "Malformed table row",
                                f"Table row should start and end with |: {stripped[:50]}"
                            ))

    def check_links(self):
        """Check for malformed markdown links (only outside code blocks)."""
        for i, line in enumerate(self.lines, 1):
            # Skip lines in code blocks
            if self.is_in_code_block(i - 1):
                continue

            # Look for markdown link pattern: [text](url)
            # But need to handle edge cases

            # Find all [ that might start links
            pos = 0
            while True:
                bracket_start = line.find('[', pos)
                if bracket_start == -1:
                    break

                # Find matching ]
                bracket_end = line.find(']', bracket_start)
                if bracket_end == -1:
                    # Unclosed bracket - but only flag if it looks like a link attempt
                    # (not just random bracket in text)
                    rest_of_line = line[bracket_start:bracket_start+30]
                    # Check if there's text that looks like link text
                    if len(rest_of_line) > 3 and not rest_of_line[1:].startswith('['):
                        self.errors.append((
                            i,
                            "Unclosed link bracket",
                            f"Possible unclosed bracket at position {bracket_start}: {rest_of_line}..."
                        ))
                    break

                pos = bracket_end + 1

    def check_mermaid_blocks(self):
        """Check for malformed Mermaid diagram blocks."""
        in_code_block = False
        in_mermaid = False
        mermaid_start = None

        for i, line in enumerate(self.lines, 1):
            stripped = line.strip()

            if stripped.startswith('```'):
                if not in_code_block:
                    in_code_block = True
                    # Check if this is a Mermaid block
                    if 'mermaid' in stripped:
                        in_mermaid = True
                        mermaid_start = i
                else:
                    in_code_block = False
                    if in_mermaid:
                        in_mermaid = False
                        mermaid_start = None

        if in_mermaid:
            self.errors.append((
                mermaid_start,
                "Unclosed Mermaid block",
                f"Mermaid diagram starting at line {mermaid_start} is not closed"
            ))

    def check_headings(self):
        """Check for heading syntax issues."""
        for i, line in enumerate(self.lines, 1):
            # Skip code blocks
            if self.is_in_code_block(i - 1):
                continue

            # Check for headings
            if line.strip().startswith('#'):
                heading_match = re.match(r'^(#{1,6})\s+(.+)$', line.strip())
                if not heading_match:
                    # Check if heading has no space after #
                    if re.match(r'^#{1,6}[^\s#]', line.strip()):
                        self.errors.append((
                            i,
                            "Invalid heading syntax",
                            f"Heading must have a space after # symbols: {line.strip()[:50]}"
                        ))

    def print_errors(self):
        """Print all errors found."""
        if not self.errors:
            print(f"✓ {self.file_path}: No syntax errors found")
            return

        print(f"\n✗ {self.file_path}: Found {len(self.errors)} error(s)")
        for line_num, error_type, description in sorted(self.errors):
            print(f"  Line {line_num}: {error_type}")
            print(f"    {description}")


def main():
    # Find all markdown files
    dev_docs_path = Path('./dev-docs')
    if not dev_docs_path.exists():
        print("Error: dev-docs directory not found")
        sys.exit(1)

    md_files = list(dev_docs_path.rglob('*.md'))

    # Exclude verification reports (they're temporary)
    exclude_patterns = [
        'VERIFICATION_REPORT',
        'SUMMARY.md',
        'ANALYSIS.md',
        'ACCESSIBILITY_REPORT',
        'ACCESSIBILITY_MANUAL',
        'qa_report.md',
        'QA_FIX_REQUEST.md',
        'spec.md',
        'implementation_plan.json'
    ]

    md_files = [
        f for f in md_files
        if not any(pattern in str(f) for pattern in exclude_patterns)
        and '.auto-claude/specs' not in str(f)
    ]

    total_errors = 0
    files_with_errors = []

    print("=" * 80)
    print("MARKDOWN SYNTAX VALIDATION (v2)")
    print("=" * 80)

    for md_file in sorted(md_files):
        validator = MarkdownValidator(str(md_file))
        is_valid = validator.validate()

        if not is_valid:
            validator.print_errors()
            total_errors += len(validator.errors)
            files_with_errors.append(str(md_file))
        else:
            validator.print_errors()

    print("\n" + "=" * 80)
    print("SUMMARY")
    print("=" * 80)
    print(f"Total files checked: {len(md_files)}")
    print(f"Files with errors: {len(files_with_errors)}")
    print(f"Total errors found: {total_errors}")

    if total_errors > 0:
        print("\nFiles with errors:")
        for f in files_with_errors:
            print(f"  - {f}")
        sys.exit(1)
    else:
        print("\n✓ All markdown files are valid!")
        sys.exit(0)


if __name__ == '__main__':
    main()
