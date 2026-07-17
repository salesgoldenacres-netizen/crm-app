import os
import re
from pathlib import Path

PROJECT_ROOT = Path(__file__).parent.parent
SRC_DIR = PROJECT_ROOT / "telecaller-app" / "src"
INDEX_CSS_PATH = SRC_DIR / "index.css"

# Standard Tailwind colors and weights
TAILWIND_COLORS = [
    'slate', 'gray', 'zinc', 'neutral', 'stone', 
    'red', 'orange', 'amber', 'yellow', 'lime', 
    'green', 'emerald', 'teal', 'cyan', 'sky', 
    'blue', 'indigo', 'violet', 'purple', 'fuchsia', 
    'pink', 'rose'
]

STANDARD_WEIGHTS = {'50', '100', '200', '300', '400', '500', '600', '700', '800', '900', '950'}

# Build default standard colors
VALID_COLOR_WEIGHTS = set()
for color in TAILWIND_COLORS:
    for weight in STANDARD_WEIGHTS:
        VALID_COLOR_WEIGHTS.add((color, weight))

# Parse custom colors from index.css
def parse_custom_colors():
    custom_colors = set()
    if not INDEX_CSS_PATH.exists():
        print(f"[WARNING] index.css not found at {INDEX_CSS_PATH}")
        return custom_colors
    
    css_content = INDEX_CSS_PATH.read_text(encoding="utf-8")
    # Find --color-XXX: ...
    matches = re.findall(r'--color-([a-z]+)-(\d+)\b', css_content)
    for color, weight in matches:
        if color in TAILWIND_COLORS:
            custom_colors.add((color, weight))
            
    print(f"Parsed {len(custom_colors)} custom color-weight overrides from index.css")
    return custom_colors

# Safe mapping for non-standard weights
WEIGHT_MAP = {
    '55': '50',
    '105': '100',
    '150': '100',
    '155': '100',
    '205': '200',
    '250': '200',
    '303': '300',
    '305': '300',
    '350': '300',
    '355': '300',
    '405': '400',
    '450': '400',
    '455': '400',
    '505': '500',
    '550': '500',
    '555': '500',
    '650': '600',
    '655': '600',
    '705': '700',
    '750': '700',
    '755': '700',
    '805': '800',
    '850': '800',
    '855': '800',
    '905': '900',
    '955': '950'
}

def fix_content(content, valid_colors, replacements):
    # Regex to match prefix + color + weight + optional opacity
    # We match patterns like (bg|text|border|ring|divide|from|to|via)-(color)-(weight)
    # Keeping track of any optional opacity /40
    # And avoiding arbitrary classes bg-[...]
    pattern = r'\b(bg|text|border|ring|divide|from|to|via)-(' + '|'.join(TAILWIND_COLORS) + r')-(\d+)(/\d+)?\b'
    
    def replace_match(match):
        prefix = match.group(1)
        color = match.group(2)
        weight = match.group(3)
        opacity = match.group(4) or ""
        
        # Check if it's already a valid color
        if (color, weight) in valid_colors:
            return match.group(0)
        
        # Map weight if we have a mapping
        if weight in WEIGHT_MAP:
            target_weight = WEIGHT_MAP[weight]
            # Verify if target mapped version is valid
            if (color, target_weight) in valid_colors:
                replaced_class = f"{prefix}-{color}-{target_weight}{opacity}"
                original_class = match.group(0)
                replacements.append((original_class, replaced_class))
                return replaced_class
                
        # If no mapping or invalid target, return as-is (avoid blind guessing)
        return match.group(0)
        
    return re.sub(pattern, replace_match, content)

def main():
    custom_colors = parse_custom_colors()
    # Combine standard and custom colors
    ALL_VALID_COLORS = VALID_COLOR_WEIGHTS.union(custom_colors)
    
    tmp_dir = PROJECT_ROOT / ".tmp"
    tmp_dir.mkdir(exist_ok=True)
    report_path = tmp_dir / "tailwind_replacement_report.md"
    
    total_files_changed = 0
    replacement_records = {}
    
    for root, dirs, files in os.walk(SRC_DIR):
        for file in files:
            if file.endswith(('.tsx', '.ts', '.css')):
                file_path = Path(root) / file
                # Skip index.css itself so we don't mess with style tokens definition
                if file_path == INDEX_CSS_PATH:
                    continue
                    
                content = file_path.read_text(encoding="utf-8")
                replacements = []
                new_content = fix_content(content, ALL_VALID_COLORS, replacements)
                
                if replacements:
                    file_path.write_text(new_content, encoding="utf-8")
                    rel_path = file_path.relative_to(SRC_DIR).as_posix()
                    replacement_records[rel_path] = replacements
                    total_files_changed += 1
                    print(f"[FIXED] src/{rel_path}: Replaced {len(replacements)} occurrences")

    # Generate Markdown Report
    with open(report_path, "w", encoding="utf-8") as f:
        f.write("# Tailwind Utility Classes Correction Report\n\n")
        f.write(f"Modified **{total_files_changed}** files.\n\n")
        
        if replacement_records:
            f.write("## Replacements Summary\n\n")
            for rel_path, items in replacement_records.items():
                f.write(f"### `src/{rel_path}` ({len(items)} replacements)\n\n")
                f.write("| Before Class | After Class |\n")
                f.write("| --- | --- |\n")
                # Deduplicate items for presentation
                seen = set()
                for before, after in items:
                    if (before, after) not in seen:
                        f.write(f"| `{before}` | `{after}` |\n")
                        seen.add((before, after))
                f.write("\n")
        else:
            f.write("No invalid classes found or replaced.\n")
            
    print(f"\nReplacement complete. Modified {total_files_changed} files. Report written to {report_path}")

if __name__ == "__main__":
    main()
