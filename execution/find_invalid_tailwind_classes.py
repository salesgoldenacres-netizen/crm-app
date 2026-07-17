import os
import re

# Standard Tailwind colors and weights
TAILWIND_COLORS = [
    'slate', 'gray', 'zinc', 'neutral', 'stone', 
    'red', 'orange', 'amber', 'yellow', 'lime', 
    'green', 'emerald', 'teal', 'cyan', 'sky', 
    'blue', 'indigo', 'violet', 'purple', 'fuchsia', 
    'pink', 'rose'
]

VALID_WEIGHTS = {'50', '100', '200', '300', '400', '500', '600', '700', '800', '900', '950'}

# Regex to match Tailwind color classes: e.g. text-slate-250, bg-green-55, etc.
# Matches: color-name followed by a dash and digits (e.g. slate-250)
COLOR_WEIGHT_REGEX = re.compile(
    r'\b(?:' + '|'.join(TAILWIND_COLORS) + r')-(\d+)\b'
)

def scan_file(file_path):
    invalid_classes = []
    try:
        with open(file_path, 'r', encoding='utf-8') as f:
            for line_num, line in enumerate(f, 1):
                # Search for color-weight patterns
                matches = COLOR_WEIGHT_REGEX.findall(line)
                for weight in matches:
                    if weight not in VALID_WEIGHTS:
                        # Find the full matched class name (e.g., text-slate-250, bg-green-55)
                        # Let's extract the context around the weight
                        pattern = r'\b[a-zA-Z0-9:/\-]+-(\w+)-' + weight + r'\b'
                        full_matches = re.findall(pattern, line)
                        for col in full_matches:
                            if col in TAILWIND_COLORS:
                                # Found an invalid color weight class
                                match_str = f"{col}-{weight}"
                                invalid_classes.append((line_num, match_str, line.strip()))
    except Exception as e:
        print(f"Error reading {file_path}: {e}")
    return invalid_classes

def main():
    src_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', 'telecaller-app', 'src'))
    print(f"Scanning directory: {src_dir}")
    
    # Ensure .tmp exists
    tmp_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '.tmp'))
    os.makedirs(tmp_dir, exist_ok=True)
    report_path = os.path.join(tmp_dir, 'invalid_tailwind_classes_report.md')
    
    total_findings = 0
    with open(report_path, 'w', encoding='utf-8') as report_file:
        report_file.write("# Invalid Tailwind Classes Scan Report\n\n")
        
        for root, dirs, files in os.walk(src_dir):
            for file in files:
                if file.endswith(('.jsx', '.js', '.css', '.tsx', '.ts')):
                    file_path = os.path.join(root, file)
                    findings = scan_file(file_path)
                    if findings:
                        rel_path = os.path.relpath(file_path, src_dir).replace('\\', '/')
                        print(f"\n[!] File: src/{rel_path}")
                        report_file.write(f"## File: `src/{rel_path}`\n\n")
                        report_file.write("| Line | Found Class | Code Snippet |\n")
                        report_file.write("| --- | --- | --- |\n")
                        
                        for line_num, cls, line_content in findings:
                            safe_content = line_content[:120].encode('ascii', errors='replace').decode('ascii')
                            print(f"  Line {line_num}: Found '{cls}' in context: '{safe_content}'")
                            
                            # Clean code snippet for markdown table
                            md_snippet = line_content.replace('|', '\\|').strip()
                            report_file.write(f"| {line_num} | `{cls}` | `{md_snippet}` |\n")
                            total_findings += 1
                        report_file.write("\n")
                        
        report_file.write(f"\n## Summary\nTotal invalid Tailwind color classes found: **{total_findings}**\n")
        
    print(f"\nScan complete. Total invalid Tailwind color classes found: {total_findings}")
    print(f"Report written to: {report_path}")

if __name__ == '__main__':
    main()
