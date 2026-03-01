#!/usr/bin/env python3
"""
Refactors Next.js API route files to use the new simplified auth pattern.

Old pattern:
    await bootstrapAuth();
    const user = await getAuthenticatedUser(request);
    if (!user) {
      throw new HttpError(401, "Unauthorized");
    }

New pattern:
    const userId = getUserIdFromRequest(request);
    if (!userId) {
      throw new HttpError(401, "Unauthorized");
    }
"""

import os
import re
from pathlib import Path

API_DIR = Path("/Users/kaiot/Documents/plainwarden/src/app/api")

SKIP_ROUTES = {
    "auth/login/route.ts",
    "auth/register/route.ts",
    "auth/logout/route.ts",
    "setup/run/route.ts",
    "setup/recover/route.ts",
    "setup/state/route.ts",
    "cron/reminders/route.ts",
    "health/route.ts",
}

SPECIAL_CASES = {
    "stream/route.ts",
    "agent/route.ts",
    "auth/me/route.ts",
}


def get_relative_route(path: Path) -> str:
    return str(path.relative_to(API_DIR))


def replace_auth_import(content: str, is_special: bool) -> tuple[str, bool]:
    """
    Update the import from @/lib/server/auth.
    Removes bootstrapAuth and getAuthenticatedUser, adds getUserIdFromRequest.
    For special cases also adds findUserById from @/lib/server/users-db.
    Returns (new_content, changed).
    """
    changed = False

    # Match import line that contains bootstrapAuth and/or getAuthenticatedUser
    # Handle various orderings and spacing inside the braces
    import_pattern = re.compile(
        r'import\s*\{([^}]*(?:bootstrapAuth|getAuthenticatedUser)[^}]*)\}\s*from\s*["\']@/lib/server/auth["\'];?'
    )

    match = import_pattern.search(content)
    if not match:
        return content, changed

    original_import = match.group(0)
    names_str = match.group(1)

    # Split existing names
    names = [n.strip() for n in names_str.split(",") if n.strip()]

    # Remove old names
    names = [n for n in names if n not in ("bootstrapAuth", "getAuthenticatedUser")]

    # Add new name if not already present
    if "getUserIdFromRequest" not in names:
        names.append("getUserIdFromRequest")

    if not names:
        new_import = ""
    else:
        new_import = "import { " + ", ".join(names) + ' } from "@/lib/server/auth";'

    new_content = content.replace(original_import, new_import)
    changed = new_content != content

    if is_special:
        # Check if findUserById import from json-db already exists
        if "findUserById" not in new_content:
            # Insert after the auth import line
            find_user_import = 'import { findUserById } from "@/lib/server/json-db";'
            # Find position after the auth import line
            auth_import_end = new_content.find(new_import) + len(new_import)
            insert_pos = new_content.find("\n", auth_import_end)
            if insert_pos != -1:
                new_content = (
                    new_content[: insert_pos + 1]
                    + find_user_import
                    + "\n"
                    + new_content[insert_pos + 1 :]
                )
            else:
                new_content += "\n" + find_user_import
            changed = True

    return new_content, changed


def replace_auth_block(content: str, is_special: bool) -> tuple[str, bool]:
    """
    Replace the old 4-line auth check with the new pattern.
    Handles variations with optional blank line between bootstrapAuth and getAuthenticatedUser.
    """

    # We try a few variants of the old pattern (indentation may vary).
    # Each tuple: (search_string, uses_return_json)
    # uses_return_json=True → replacement uses return NextResponse.json instead of throw HttpError
    variants = [
        # (search_string, uses_return_json)
        (
            '  await bootstrapAuth();\n\n  const user = await getAuthenticatedUser(request);\n  if (!user) {\n    throw new HttpError(401, "Unauthorized");\n  }',
            False,
        ),
        (
            '  await bootstrapAuth();\n  const user = await getAuthenticatedUser(request);\n  if (!user) {\n    throw new HttpError(401, "Unauthorized");\n  }',
            False,
        ),
        (
            '    await bootstrapAuth();\n\n    const user = await getAuthenticatedUser(request);\n    if (!user) {\n      throw new HttpError(401, "Unauthorized");\n    }',
            False,
        ),
        (
            '    await bootstrapAuth();\n    const user = await getAuthenticatedUser(request);\n    if (!user) {\n      throw new HttpError(401, "Unauthorized");\n    }',
            False,
        ),
        # Single-line if (no braces) — used by kanban routes
        (
            '    await bootstrapAuth();\n    const user = await getAuthenticatedUser(request);\n    if (!user) throw new HttpError(401, "Unauthorized");',
            False,
        ),
        (
            '  await bootstrapAuth();\n  const user = await getAuthenticatedUser(request);\n  if (!user) throw new HttpError(401, "Unauthorized");',
            False,
        ),
        # Return-based pattern — used by acme routes (return json instead of throw)
        (
            '    await bootstrapAuth();\n\n    const user = await getAuthenticatedUser(request);\n    if (!user) {\n      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });\n    }',
            True,
        ),
        (
            '    await bootstrapAuth();\n    const user = await getAuthenticatedUser(request);\n    if (!user) {\n      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });\n    }',
            True,
        ),
    ]

    for old_block, uses_return_json in variants:
        if old_block not in content:
            continue

        # Detect indentation from the old block
        indent = "  " if old_block.startswith("  await") and not old_block.startswith("    await") else "    "
        inner = indent + "  "

        if not is_special:
            if uses_return_json:
                new_block = (
                    f'{indent}const userId = getUserIdFromRequest(request);\n'
                    f'{indent}if (!userId) {{\n'
                    f'{inner}return NextResponse.json({{ message: "Unauthorized" }}, {{ status: 401 }});\n'
                    f'{indent}}}'
                )
            else:
                new_block = (
                    f'{indent}const userId = getUserIdFromRequest(request);\n'
                    f'{indent}if (!userId) {{\n'
                    f'{inner}throw new HttpError(401, "Unauthorized");\n'
                    f'{indent}}}'
                )
        else:
            new_block = (
                f'{indent}const userId = getUserIdFromRequest(request);\n'
                f'{indent}if (!userId) {{\n'
                f'{inner}throw new HttpError(401, "Unauthorized");\n'
                f'{indent}}}\n'
                f'{indent}const user = await findUserById(userId);\n'
                f'{indent}if (!user) {{\n'
                f'{inner}throw new HttpError(401, "Unauthorized");\n'
                f'{indent}}}'
            )

        new_content = content.replace(old_block, new_block)
        if new_content != content:
            return new_content, True

    return content, False


def replace_user_id(content: str, is_special: bool) -> tuple[str, bool]:
    """
    Replace user.id with userId in non-special cases.
    For special cases, user.id stays as-is (full user object is available).
    """
    if is_special:
        return content, False

    new_content = content.replace("user.id", "userId")
    changed = new_content != content
    return new_content, changed


def process_file(path: Path, is_special: bool) -> bool:
    """Process a single route file. Returns True if modified."""
    content = path.read_text(encoding="utf-8")
    original = content

    # Check if old pattern exists at all
    if "bootstrapAuth" not in content and "getAuthenticatedUser" not in content:
        return False

    content, _ = replace_auth_import(content, is_special)
    content, block_changed = replace_auth_block(content, is_special)

    if not block_changed:
        # Try a regex-based fallback for unusual spacing/indentation
        pattern = re.compile(
            r'(?P<indent>[ \t]*)await bootstrapAuth\(\);\n'
            r'(?:\n)?'
            r'(?P=indent)const user = await getAuthenticatedUser\(request\);\n'
            r'(?P=indent)if \(!user\) \{\n'
            r'(?P=indent)[ \t]+throw new HttpError\(401, "Unauthorized"\);\n'
            r'(?P=indent)\}'
        )
        # Replace all matches iteratively (re.sub with backreferences is complex)
        while True:
            m = pattern.search(content)
            if not m:
                break
            indent = m.group("indent")
            inner = indent + "  "
            if not is_special:
                new_block = (
                    f'{indent}const userId = getUserIdFromRequest(request);\n'
                    f'{indent}if (!userId) {{\n'
                    f'{inner}throw new HttpError(401, "Unauthorized");\n'
                    f'{indent}}}'
                )
            else:
                new_block = (
                    f'{indent}const userId = getUserIdFromRequest(request);\n'
                    f'{indent}if (!userId) {{\n'
                    f'{inner}throw new HttpError(401, "Unauthorized");\n'
                    f'{indent}}}\n'
                    f'{indent}const user = await findUserById(userId);\n'
                    f'{indent}if (!user) {{\n'
                    f'{inner}throw new HttpError(401, "Unauthorized");\n'
                    f'{indent}}}'
                )
            content = content[: m.start()] + new_block + content[m.end() :]

    content, _ = replace_user_id(content, is_special)

    if content != original:
        path.write_text(content, encoding="utf-8")
        return True

    return False


def main():
    if not API_DIR.exists():
        print(f"ERROR: API directory not found: {API_DIR}")
        return

    route_files = list(API_DIR.rglob("route.ts"))
    route_files.sort()

    modified = []
    skipped = []
    unchanged = []

    for path in route_files:
        rel = get_relative_route(path)

        if rel in SKIP_ROUTES:
            skipped.append(rel)
            continue

        is_special = rel in SPECIAL_CASES

        try:
            was_modified = process_file(path, is_special)
        except Exception as e:
            print(f"  ERROR processing {rel}: {e}")
            continue

        if was_modified:
            tag = " [SPECIAL]" if is_special else ""
            modified.append(rel)
            print(f"  MODIFIED{tag}: {rel}")
        else:
            unchanged.append(rel)

    print()
    print(f"Summary:")
    print(f"  Modified : {len(modified)}")
    print(f"  Unchanged: {len(unchanged)}")
    print(f"  Skipped  : {len(skipped)}")

    if unchanged:
        print()
        print("Unchanged files (pattern not found or already up to date):")
        for r in unchanged:
            print(f"  - {r}")


if __name__ == "__main__":
    main()
