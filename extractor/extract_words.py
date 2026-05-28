import argparse
import os
import re
import sys


DEFAULT_EXTENSIONS = [".md", ".py", ".ts"]
DEFAULT_EXCLUDE_DIRS = [".git", "node_modules", "__pycache__", ".venv", "venv", "__init__"]
DEFAULT_MIN_LENGTH = 3
WORD_PATTERN = re.compile(r"[a-zA-Z]{2,}")
CONSECUTIVE_RE = re.compile(r"(.)\1{2,}")


def _load_dict(dict_path):
    words = set()
    with open(dict_path, "r", encoding="utf-8") as f:
        for line in f:
            w = line.strip().lower()
            if w:
                words.add(w)
    return words


def _read_file(filepath):
    try:
        with open(filepath, "r", encoding="utf-8", errors="ignore") as f:
            return f.read()
    except (OSError, PermissionError):
        return None


def is_valid_word(word, min_length, dict_set):
    if len(word) < min_length:
        return False
    if CONSECUTIVE_RE.search(word):
        return False
    if not re.search(r"[aeiouy]", word):
        return False
    if dict_set is not None and word not in dict_set:
        return False
    return True


def extract_words(paths, extensions=None, output="words.txt", exclude_dirs=None,
                  min_length=DEFAULT_MIN_LENGTH, dict_path=None):
    if extensions is None:
        extensions = DEFAULT_EXTENSIONS
    if exclude_dirs is None:
        exclude_dirs = DEFAULT_EXCLUDE_DIRS

    dict_set = None
    if dict_path:
        dict_set = _load_dict(dict_path)

    ext_set = set(extensions)
    exclude_set = set(exclude_dirs)
    raw_words = set()
    files_read = 0

    for path in paths:
        if os.path.isfile(path):
            content = _read_file(path)
            if content is not None:
                files_read += 1
                for match in WORD_PATTERN.finditer(content):
                    raw_words.add(match.group().lower())
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
                    for match in WORD_PATTERN.finditer(content):
                        raw_words.add(match.group().lower())
        else:
            print(f"Warning: {path} not found, skipping", file=sys.stderr)

    filtered = sorted(w for w in raw_words if is_valid_word(w, min_length, dict_set))

    with open(output, "w", encoding="utf-8") as f:
        for word in filtered:
            f.write(word + "\n")

    print(f"Read {files_read} files")
    print(f"Raw extracted: {len(raw_words)}")
    print(f"After filtering: {len(filtered)}")
    print(f"Written to {output}")
    return filtered


def main():
    parser = argparse.ArgumentParser(description="Extract unique words from files and/or folders")
    parser.add_argument("paths", nargs="+", help="Files and/or folders to scan")
    parser.add_argument("--ext", nargs="+", default=None, help=f"File extensions to read in folders (default: {' '.join(DEFAULT_EXTENSIONS)})")
    parser.add_argument("--output", default="words.txt", help="Output txt file (default: words.txt)")
    parser.add_argument("--exclude", nargs="+", default=None, help=f"Directories to skip (default: {' '.join(DEFAULT_EXCLUDE_DIRS)})")
    parser.add_argument("--min-length", type=int, default=DEFAULT_MIN_LENGTH, help=f"Minimum word length (default: {DEFAULT_MIN_LENGTH})")
    parser.add_argument("--dict", default=None, dest="dict_path", help="Dictionary file path (one word per line) to filter against")
    args = parser.parse_args()

    extract_words(args.paths, extensions=args.ext, output=args.output,
                  exclude_dirs=args.exclude, min_length=args.min_length,
                  dict_path=args.dict_path)


if __name__ == "__main__":
    main()