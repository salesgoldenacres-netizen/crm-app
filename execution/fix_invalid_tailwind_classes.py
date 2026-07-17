import os
import re

# Standard Tailwind colors
TAILWIND_COLORS = [
    'slate', 'gray', 'zinc', 'neutral', 'stone', 
    'red', 'orange', 'amber', 'yellow', 'lime', 
    'green', 'emerald', 'teal', 'cyan', 'sky', 
    'blue', 'indigo', 'violet', 'purple', 'fuchsia', 
    'pink', 'rose'
]

# Mapping of invalid color weights to valid ones
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

def fix_file(file_path):
    try:
        with open(file_path, 'r', encoding='utf-8') as f:
            content = f.read()
            
        modified_content = content
        replacements_made = 0
        
        # We look for: (color)-(invalid_weight)
        # We need to make sure we don't accidentally match part of another word
        for color in TAILWIND_COLORS:
            for invalid_w, valid_w in WEIGHT_MAP.items():
                pattern = r'\b' + color + '-' + invalid_w + r'\b'
                # Find all matches
                matches = re.findall(pattern, modified_content)
                if matches:
                    modified_content = re.sub(pattern, f"{color}-{valid_w}", modified_content)
                    replacements_made += len(matches)
                    
        if replacements_made > 0:
            with open(file_path, 'w', encoding='utf-8') as f:
                f.write(modified_content)
            return replacements_made
    except Exception as e:
        print(f"Error processing {file_path}: {e}")
    return 0

def main():
    src_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', 'telecaller-app', 'src'))
    print(f"Fixing directory: {src_dir}")
    
    total_replaced = 0
    modified_files_count = 0
    
    for root, dirs, files in os.walk(src_dir):
        for file in files:
            if file.endswith(('.jsx', '.js', '.css', '.tsx', '.ts')):
                file_path = os.path.join(root, file)
                replaced = fix_file(file_path)
                if replaced > 0:
                    rel_path = os.path.relpath(file_path, src_dir).replace('\\', '/')
                    print(f"[Fixed] src/{rel_path}: Replaced {replaced} invalid class occurrences")
                    total_replaced += replaced
                    modified_files_count += 1
                    
    print(f"\nReplacement complete. Modified {modified_files_count} files, replacing {total_replaced} classes.")

if __name__ == '__main__':
    main()
