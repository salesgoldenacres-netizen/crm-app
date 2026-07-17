import os
import re
import json

# Locate directories relative to this script
EXECUTION_DIR = os.path.dirname(os.path.abspath(__file__))
PROJECT_ROOT = os.path.dirname(EXECUTION_DIR)
SRC_DIR = os.path.join(PROJECT_ROOT, "telecaller-app", "src")

def find_opening_tag_end(content, start_pos):
    idx = start_pos
    brace_depth = 0
    in_quote = None
    while idx < len(content):
        char = content[idx]
        if in_quote:
            if char == in_quote:
                # check if escaped (simple check)
                if content[idx - 1] != '\\':
                    in_quote = None
        elif char in ('"', "'", '`'):
            in_quote = char
        elif char == '{':
            brace_depth += 1
        elif char == '}':
            if brace_depth > 0:
                brace_depth -= 1
        elif char == '>' and brace_depth == 0:
            return idx + 1
        idx += 1
    return len(content)

def scan_file_for_buttons(filepath):
    with open(filepath, 'r', encoding='utf-8', errors='ignore') as f:
        content = f.read()
    
    results = []
    button_pattern = re.compile(r'<[Bb]utton\b')
    for match in button_pattern.finditer(content):
        start_pos = match.start()
        line_num = content[:start_pos].count('\n') + 1
        
        end_pos = find_opening_tag_end(content, start_pos)
        tag_content = content[start_pos:end_pos]
        
        onclick_match = re.search(r'\bonClick\s*=\s*\{', tag_content)
        if onclick_match:
            brace_start = onclick_match.end() - 1
            brace_count = 1
            curr_idx = brace_start + 1
            while brace_count > 0 and curr_idx < len(tag_content):
                char = tag_content[curr_idx]
                if char == '{':
                    brace_count += 1
                elif char == '}':
                    brace_count -= 1
                curr_idx += 1
            onclick_val = tag_content[brace_start + 1 : curr_idx - 1].strip()
        else:
            onclick_val = "None or No-Op"
            
        type_match = re.search(r'\btype\s*=\s*["\']submit["\']', tag_content)
        is_submit = bool(type_match)
        
        lines = content.split('\n')
        start_line_idx = max(0, line_num - 2)
        end_line_idx = min(len(lines), line_num + 8)
        snippet = '\n'.join(lines[start_line_idx:end_line_idx])
        
        button_label = lines[line_num - 1].strip()
        
        results.append({
            "line_number": line_num,
            "label": button_label,
            "onclick": onclick_val,
            "is_submit": is_submit,
            "snippet": snippet
        })
        
    return results

def main():
    audit_results = {}
    for root, dirs, files in os.walk(SRC_DIR):
        for file in files:
            if file.endswith(('.tsx', '.ts')):
                full_path = os.path.join(root, file)
                rel_path = os.path.relpath(full_path, SRC_DIR)
                buttons = scan_file_for_buttons(full_path)
                if buttons:
                    audit_results[rel_path] = buttons
                    
    # Write results to a JSON file in the tmp directory
    output_dir = os.path.join(PROJECT_ROOT, ".tmp")
    os.makedirs(output_dir, exist_ok=True)
    output_path = os.path.join(output_dir, "buttons_audit.json")
    with open(output_path, 'w', encoding='utf-8') as f:
        json.dump(audit_results, f, indent=2)
        
    print(f"Scanned {len(audit_results)} files with buttons. Results written to {output_path}")

if __name__ == "__main__":
    main()
