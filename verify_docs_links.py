#!/usr/bin/env python3
"""
Verify all internal links in developer documentation.

Checks:
1. All links in dev-docs/README.md point to existing files
2. Cross-references between docs work
3. No broken markdown syntax
"""

import os
import re
from pathlib import Path
from typing import List, Tuple, Set

def extract_markdown_links(content: str, base_path: Path) -> List[Tuple[str, str, int]]:
    """
    Extract markdown links from content.

    Returns list of (link_text, link_path, line_number) tuples.
    """
    links = []
    # Match [text](path) pattern
    pattern = r'\[([^\]]+)\]\(([^)]+)\)'

    for line_num, line in enumerate(content.split('\n'), 1):
        matches = re.finditer(pattern, line)
        for match in matches:
            text = match.group(1)
            path = match.group(2)

            # Skip external links (http/https) and anchors
            if path.startswith('http://') or path.startswith('https://'):
                continue

            # Skip mailto links
            if path.startswith('mailto:'):
                continue

            links.append((text, path, line_num))

    return links

def check_link_exists(link_path: str, source_file: Path, dev_docs_root: Path) -> Tuple[bool, str]:
    """
    Check if a link path points to an existing file.

    Returns (exists, resolved_path) tuple.
    """
    # Remove anchor fragments
    path_without_anchor = link_path.split('#')[0]

    # Skip empty paths (pure anchors like #quick-start)
    if not path_without_anchor:
        return (True, "anchor-only")

    # Resolve relative path from source file's directory
    source_dir = source_file.parent

    # Handle .. paths (parent directory references)
    if path_without_anchor.startswith('../'):
        # Relative to source file
        resolved = source_dir / path_without_anchor
    elif path_without_anchor.startswith('./'):
        # Relative to source file
        resolved = source_dir / path_without_anchor
    else:
        # Assume relative to source file
        resolved = source_dir / path_without_anchor

    # Normalize path
    resolved = resolved.resolve()

    exists = resolved.exists()
    return (exists, str(resolved))

def check_markdown_syntax(content: str, file_path: Path) -> List[str]:
    """Check for common markdown syntax errors."""
    errors = []

    # Check for unclosed code blocks
    code_block_count = content.count('```')
    if code_block_count % 2 != 0:
        errors.append(f"Unclosed code block (found {code_block_count} ``` markers, should be even)")

    # Check for malformed tables (rows with different column counts)
    in_table = False
    in_code_block = False
    table_col_count = None
    for line_num, line in enumerate(content.split('\n'), 1):
        # Track code block state
        if line.strip().startswith('```'):
            in_code_block = not in_code_block
            continue

        # Skip lines inside code blocks
        if in_code_block:
            continue

        if '|' in line:
            cols = len([c for c in line.split('|') if c.strip()])
            if not in_table:
                in_table = True
                table_col_count = cols
            elif cols != table_col_count and not re.match(r'^\s*\|[\s:-]+\|', line):
                # Separator line (|---|---) is allowed to differ
                errors.append(f"Line {line_num}: Table row has {cols} columns, expected {table_col_count}")
        elif in_table and line.strip() == '':
            in_table = False
            table_col_count = None

    return errors

def main():
    """Main verification function."""
    dev_docs_root = Path('./dev-docs')

    if not dev_docs_root.exists():
        print("❌ Error: dev-docs/ directory not found")
        return False

    print("🔍 Verifying Developer Documentation Links\n")
    print("=" * 60)

    # Find all markdown files
    md_files = list(dev_docs_root.rglob('*.md'))
    print(f"\n📄 Found {len(md_files)} markdown files\n")

    all_links: List[Tuple[Path, str, str, int]] = []
    broken_links = []
    syntax_errors = []

    # Extract all links from all files
    for md_file in sorted(md_files):
        rel_path = md_file.relative_to(Path('.'))
        print(f"Checking: {rel_path}")

        try:
            content = md_file.read_text(encoding='utf-8')
        except Exception as e:
            print(f"  ❌ Error reading file: {e}")
            continue

        # Check syntax
        file_syntax_errors = check_markdown_syntax(content, md_file)
        if file_syntax_errors:
            syntax_errors.append((rel_path, file_syntax_errors))
            for error in file_syntax_errors:
                print(f"  ⚠️  Syntax: {error}")

        # Extract and check links
        links = extract_markdown_links(content, dev_docs_root)
        for text, link, line_num in links:
            all_links.append((md_file, text, link, line_num))

            # Check if link target exists
            exists, resolved = check_link_exists(link, md_file, dev_docs_root)
            if not exists and resolved != "anchor-only":
                broken_links.append((rel_path, text, link, line_num, resolved))
                print(f"  ❌ Line {line_num}: Broken link [{text}]({link})")

    print("\n" + "=" * 60)
    print(f"\n📊 Summary:")
    print(f"  • Total files checked: {len(md_files)}")
    print(f"  • Total internal links: {len([l for l in all_links if not l[2].startswith('http')])}")
    print(f"  • Broken links: {len(broken_links)}")
    print(f"  • Syntax errors: {sum(len(e[1]) for e in syntax_errors)}")

    if broken_links:
        print(f"\n❌ BROKEN LINKS FOUND:")
        for file, text, link, line_num, resolved in broken_links:
            print(f"  {file}:{line_num}")
            print(f"    Link: [{text}]({link})")
            print(f"    Resolved to: {resolved}")
            print()

    if syntax_errors:
        print(f"\n⚠️  SYNTAX ERRORS FOUND:")
        for file, errors in syntax_errors:
            print(f"  {file}:")
            for error in errors:
                print(f"    • {error}")
            print()

    # Check README.md table of contents completeness
    print("\n📋 Checking Table of Contents Completeness...")
    readme_path = dev_docs_root / 'README.md'
    readme_content = readme_path.read_text(encoding='utf-8')

    expected_files = [
        './setup.md',
        './architecture.md',
        './frontend/README.md',
        './frontend/architecture.md',
        './frontend/components.md',
        './frontend/state-management.md',
        './frontend/electron-ipc.md',
        './backend/README.md',
        './backend/architecture.md',
        './backend/agents.md',
        './backend/memory.md',
        './backend/security.md',
        './backend/integrations.md',
        './testing.md',
        './workflows.md'
    ]

    toc_links = [link[1] for link in extract_markdown_links(readme_content, dev_docs_root) if not link[1].startswith('http') and link[1] != '#quick-start']

    missing_from_toc = []
    for expected in expected_files:
        if expected not in toc_links:
            missing_from_toc.append(expected)

    if missing_from_toc:
        print(f"  ⚠️  Files missing from TOC: {', '.join(missing_from_toc)}")
    else:
        print(f"  ✅ All documentation files are linked in TOC")

    # Final result
    print("\n" + "=" * 60)
    if not broken_links and not syntax_errors and not missing_from_toc:
        print("\n✅ ALL CHECKS PASSED!")
        print("   • All internal links are valid")
        print("   • No markdown syntax errors")
        print("   • Table of contents is complete")
        return True
    else:
        print("\n❌ VERIFICATION FAILED")
        if broken_links:
            print(f"   • Fix {len(broken_links)} broken link(s)")
        if syntax_errors:
            print(f"   • Fix {sum(len(e[1]) for e in syntax_errors)} syntax error(s)")
        if missing_from_toc:
            print(f"   • Add {len(missing_from_toc)} file(s) to TOC")
        return False

if __name__ == '__main__':
    success = main()
    exit(0 if success else 1)
