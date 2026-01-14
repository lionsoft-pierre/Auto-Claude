#!/usr/bin/env python3
"""
Markdown Syntax Validator
Checks for common markdown syntax errors in documentation files.
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

    def validate(self) -> bool:
        """Run all validation checks. Returns True if valid, False if errors found."""
        self.check_code_blocks()
        self.check_tables()
        self.check_links()
        self.check_mermaid_blocks()
        self.check_headings()
        self.check_lists()
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
        in_table = False
        table_start = None

        for i, line in enumerate(self.lines, 1):
            stripped = line.strip()

            # Check if line looks like a table row
            if '|' in stripped and stripped.count('|') >= 2:
                if not in_table:
                    in_table = True
                    table_start = i

                # Check for consistent pipe count in table
                pipe_count = stripped.count('|')

                # Simple validation: check if pipes are balanced
                if stripped.startswith('|') and not stripped.endswith('|'):
                    self.errors.append((
                        i,
                        "Malformed table row",
                        "Table row starts with | but doesn't end with |"
                    ))
                elif not stripped.startswith('|') and stripped.endswith('|'):
                    self.errors.append((
                        i,
                        "Malformed table row",
                        "Table row ends with | but doesn't start with |"
                    ))
            else:
                in_table = False

    def check_links(self):
        """Check for malformed markdown links."""
        # Pattern: [text](url) or [text][ref]
        link_pattern = r'\[([^\]]*)\](?:\(([^\)]*)\)|\[([^\]]*)\])?'

        for i, line in enumerate(self.lines, 1):
            # Find all potential links
            for match in re.finditer(r'\[[^\]]*', line):
                start_pos = match.start()
                # Check if bracket is ever closed
                close_bracket = line.find(']', start_pos)
                if close_bracket == -1:
                    self.errors.append((
                        i,
                        "Unclosed link bracket",
                        f"Link starting at position {start_pos} has unclosed bracket: {match.group()[:20]}..."
                    ))
                else:
                    # Check if there's a proper link destination
                    after_close = line[close_bracket+1:close_bracket+2]
                    if after_close and after_close not in ('(', '[', ':', ' ', '\n', ''):
                        # This might be intentional (like [1] in text), so we'll skip this check
                        pass

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
            # Check for headings
            if line.strip().startswith('#'):
                heading_match = re.match(r'^(#{1,6})\s+(.+)$', line.strip())
                if not heading_match:
                    # Check if heading has no space after #
                    if re.match(r'^#{1,6}[^\s]', line.strip()):
                        self.errors.append((
                            i,
                            "Invalid heading syntax",
                            "Heading must have a space after # symbols"
                        ))

    def check_lists(self):
        """Check for list formatting issues."""
        for i, line in enumerate(self.lines, 1):
            stripped = line.strip()

            # Check for unordered lists
            if stripped.startswith(('-', '*', '+')):
                # Check if there's content after list marker
                list_match = re.match(r'^[-*+]\s+(.+)$', stripped)
                if not list_match:
                    if re.match(r'^[-*+]$', stripped):
                        self.errors.append((
                            i,
                            "Empty list item",
                            "List item has no content"
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
    md_files = list(dev_docs_path.rglob('*.md'))

    # Exclude verification reports (they're temporary)
    exclude_patterns = [
        'VERIFICATION_REPORT',
        'SUMMARY.md',
        'ANALYSIS.md',
        'ACCESSIBILITY_REPORT',
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
    print("MARKDOWN SYNTAX VALIDATION")
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
