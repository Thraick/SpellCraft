import argparse
import os
import re
import sys


DEFAULT_EXTENSIONS = [".md", ".py", ".ts"]
DEFAULT_EXCLUDE_DIRS = [".git", "node_modules", "__pycache__", ".venv", "venv", "__init__"]
WORD_PATTERN = re.compile(r"[a-zA-Z]{2,}")


def _read_file(filepath):
    try:
        with open(filepath, "r", encoding="utf-8", errors="ignore") as f:
            return f.read()
    except (OSError, PermissionError):
        return None


def _extract_from_content(content, words):
    for match in WORD_PATTERN.finditer(content):
        words.add(match.group().lower())


def extract_words(paths, extensions=None, output="words.txt", exclude_dirs=None):
    if extensions is None:
        extensions = DEFAULT_EXTENSIONS
    if exclude_dirs is None:
        exclude_dirs = DEFAULT_EXCLUDE_DIRS

    ext_set = set(extensions)
    exclude_set = set(exclude_dirs)
    words = set()
    files_read = 0

    for path in paths:
        if os.path.isfile(path):
            content = _read_file(path)
            if content is not None:
                files_read += 1
                _extract_from_content(content, words)
        elif os.path.isdir(path):
            for root, dirs, filenames in os.walk(path):
                dirs[:] = [d for d in dirs if d not in exclude_set]
                for filename in filenames:
                    ext = os.path.splitext(filename)[1].lower()
                    if ext not in ext_set:
                        continue
                    filepath = os.path.join(root, filename)
                    content = _read_file(filepath)
                    if content is None:
                        continue
                    files_read += 1
                    _extract_from_content(content, words)
        else:
            print(f"Warning: {path} not found, skipping", file=sys.stderr)

    sorted_words = sorted(words)

    with open(output, "w", encoding="utf-8") as f:
        for word in sorted_words:
            f.write(word + "\n")

    print(f"Read {files_read} files")
    print(f"Found {len(sorted_words)} unique words")
    print(f"Written to {output}")
    return sorted_words


def main():
    parser = argparse.ArgumentParser(description="Extract unique words from files and/or folders")
    parser.add_argument("paths", nargs="+", help="Files and/or folders to scan")
    parser.add_argument("--ext", nargs="+", default=None, help=f"File extensions to read in folders (default: {' '.join(DEFAULT_EXTENSIONS)})")
    parser.add_argument("--output", default="words.txt", help="Output txt file (default: words.txt)")
    parser.add_argument("--exclude", nargs="+", default=None, help=f"Directories to skip (default: {' '.join(DEFAULT_EXCLUDE_DIRS)})")
    args = parser.parse_args()

    extract_words(args.paths, extensions=args.ext, output=args.output, exclude_dirs=args.exclude)


if __name__ == "__main__":
    main()