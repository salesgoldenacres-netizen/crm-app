import os
import re
from pathlib import Path

SRC_DIR = Path("telecaller-app/src")

def audit_files():
    output_lines = []
    output_lines.append("=== Theme Mismatch and Hardcoded Backgrounds Audit ===")
    
    # Regex to find bg-slate-X, bg-gray-X, bg-indigo-X, bg-white, bg-black etc.
    # We want to check if they are preceded by "dark:" or not.
    bg_pattern = re.compile(r'\b(bg-(slate|gray|indigo|zinc|neutral|stone|rose|red|emerald|green|amber|yellow|white|black|transparent|none|inherit)-\d+(?:/\d+)?|\bbg-(white|black|transparent|none|inherit))\b')
    
    total_files = 0
    files_with_mismatches = 0
    total_mismatches = 0
    
    for root, dirs, files in os.walk(SRC_DIR):
        for file in files:
            if file.endswith((".tsx", ".ts", ".jsx", ".js")):
                file_path = Path(root) / file
                total_files += 1
                try:
                    content = file_path.read_text(encoding="utf-8")
                except Exception as e:
                    output_lines.append(f"Error reading file {file_path}: {e}")
                    continue
                
                has_theme_toggle = "ThemeToggle" in content or "useThemeStore" in content
                
                lines = content.splitlines()
                mismatches = []
                for idx, line in enumerate(lines, 1):
                    for match in bg_pattern.finditer(line):
                        bg_class = match.group(1)
                        match_start = match.start(1)
                        
                        # Check if "dark:" is right before the class
                        prefix = line[max(0, match_start-15):match_start]
                        if "dark:" not in prefix and "hover:" not in prefix and "focus:" not in prefix:
                            # Also check if it's dynamic JavaScript template literal (e.g. theme === 'dark' ? 'bg-slate-900' : 'bg-white')
                            # If the line contains dynamic theme check, it might be fine, but let's log it anyway.
                            mismatches.append((idx, bg_class, line.strip()))
                            
                if mismatches:
                    files_with_mismatches += 1
                    total_mismatches += len(mismatches)
                    output_lines.append(f"\nFile: {file_path.relative_to(SRC_DIR)} (Has ThemeToggle: {has_theme_toggle})")
                    for line_num, bg_class, line_content in mismatches:
                        # Clean line_content of non-ascii characters for display if needed, but since it's writing to UTF-8 file it's fine
                        output_lines.append(f"  Line {line_num}: Found '{bg_class}' without 'dark:' prefix")
                        output_lines.append(f"    Code: {line_content[:150]}")
                        
    output_lines.append(f"\n=== Summary ===")
    output_lines.append(f"Total JSX Files Checked: {total_files}")
    output_lines.append(f"Files with Hardcoded Backgrounds: {files_with_mismatches}")
    output_lines.append(f"Total Hardcoded Background Instances: {total_mismatches}")
    
    # Write to UTF-8 file
    Path("theme_audit_results.txt").write_text("\n".join(output_lines), encoding="utf-8")
    print(f"Audit completed successfully! Saved results to theme_audit_results.txt. Found {total_mismatches} hardcoded background classes across {files_with_mismatches} files.")

if __name__ == "__main__":
    audit_files()
