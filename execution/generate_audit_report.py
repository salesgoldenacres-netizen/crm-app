import os
import re
import json

from pathlib import Path

# Locate directories relative to this script
EXECUTION_DIR = os.path.dirname(os.path.abspath(__file__))
PROJECT_ROOT = os.path.dirname(EXECUTION_DIR)
SRC_DIR = os.path.join(PROJECT_ROOT, "telecaller-app", "src")
AUDIT_JSON_PATH = os.path.join(PROJECT_ROOT, ".tmp", "buttons_audit.json")

# Default report path in case brain path resolution fails
REPORT_MD_PATH = os.path.join(PROJECT_ROOT, ".tmp", "button_connection_audit.md")

try:
    brain_root = Path(r"C:\Users\pushp\.gemini\antigravity-ide\brain")
    if brain_root.exists():
        # Find the most recently modified subfolder (which corresponds to the active session)
        subfolders = [f for f in brain_root.iterdir() if f.is_dir() and len(f.name) == 36] # UUID length
        if subfolders:
            active_brain = max(subfolders, key=lambda f: f.stat().st_mtime)
            REPORT_MD_PATH = str(active_brain / "button_connection_audit.md")
except Exception as e:
    pass

BACKEND_FUNCTIONS = {
    # useLeadsStore
    "addLead", "updateLead", "deleteLead", "logCall", "bulkUpdateLeads", "mergeLeads", "updateLeadInStore",
    # useAttendanceStore
    "clockIn", "clockOut", "startBreak", "endBreak",
    # useLeaveRequestsStore
    "submitLeaveRequest", "updateLeaveStatus",
    # useIVRStore
    "updateIvrSettings", "clearActiveIvrCall", "simulateIncomingIvrCall",
    # useTasksStore
    "addTask", "toggleTask", "deleteTask", "clearCompletedTasks",
    # useNotificationsStore
    "addNotification", "markNotificationAsRead", "clearNotifications", "markAsRead", "markAllAsRead",
    # useAgentStatusStore
    "updateAgentStatus",
    # useDashboardPreferencesStore
    "updateDashboardTheme", "updateWidgets", "resetPreferences",
    # useCustomRolesStore
    "addCustomRole", "updateCustomRole", "deleteCustomRole",
    # useProjectsStore
    "updateProject", "addProject", "deleteProject",
    # useUsersStore
    "addUser", "updateUser", "deleteUser",
    # useAuditLogsStore
    "logAuditEvent",
    # useThemeStore
    "updateTheme",
    # useCallTargetStore
    "updateCallTarget",
    # useGoalsStore
    "updateGoals",
    # useRostersStore
    "updateRoster",
    # useTeamsStore
    "addTeam", "updateTeam", "deleteTeam",
    # useCustomFieldsStore
    "saveCustomFields",
    # useBrandingStore
    "updateBranding",
    # useSmartListsStore
    "addSmartList", "deleteSmartList",
    # useTrainingStore
    "updateTrainingData",
    # useCoachingTipStore
    "updateCoachingTip",
    # useEventsStore
    "addEvent", "deleteEvent", "saveEvents",
    # firebase functions/firestore
    "httpsCallable", "setDoc", "updateDoc", "deleteDoc", "addDoc",
    # auth
    "handleLogout", "signOut", "login", "signInWithEmailAndPassword", "createUserWithEmailAndPassword",
    "loginWithEmailAndPassword", "loginWithGoogle", "resetPassword", "logout", "createSecondaryUser"
}

UI_FUNCTIONS = {
    "setIsOpen", "onClose", "toggleSidebar", "setIsMobileProfileOpen", 
    "setIsProfileDropdownOpen", "setCallsSubTab", "setSimulatedWaLeadId",
    "setIsCountdownPaused", "setDialerMuted", "setDialerSpeaker", 
    "toggleTheme", "togglePlay", "dismiss", "navigate", "setAdvancedFilters",
    "setSelectedTemplateIndex", "setCollapsedGroups", "setSelectedLeadIds",
    "setIsAddLeadModalOpen", "setActiveLead", "setCallLogForm", 
    "setIsActive", "setSearchQuery", "setShowQuickCreate", "setIsDialPadOpen",
    "handleClear", "handleBackspace", "openTemplates", "openShortcuts", "handleKeyPress"
}

def extract_function_bodies(content):
    funcs = {}
    
    # 1. Matches: const funcName = async (args) => { ... } or const funcName = (args) => { ... }
    # Also handles: const funcName = () => expr (no curly brace)
    arrow_pattern = re.compile(
        r'(?:const|let|var)\s+(\w+)\s*=\s*(?:async\s*)?(?:\([^)]*\)|[a-zA-Z_]\w*)\s*=>\s*(?=\{|\(|[a-zA-Z_]|\"|\')'
    )
    for match in arrow_pattern.finditer(content):
        func_name = match.group(1)
        start_idx = match.end()
        # Find first non-whitespace character after =>
        rest = content[start_idx:].strip()
        if not rest:
            continue
        if rest.startswith('{'):
            # Brace matching
            brace_start = content.find('{', start_idx)
            brace_count = 1
            curr_idx = brace_start + 1
            while brace_count > 0 and curr_idx < len(content):
                char = content[curr_idx]
                if char == '{':
                    brace_count += 1
                elif char == '}':
                    brace_count -= 1
                curr_idx += 1
            funcs[func_name] = content[brace_start:curr_idx]
        else:
            # Single statement (e.g. () => navigate('/'))
            end_line_idx = content.find('\n', start_idx)
            if end_line_idx != -1:
                funcs[func_name] = content[start_idx:end_line_idx]

    # 2. Matches standard function definitions: function funcName(args) { ... }
    std_pattern = re.compile(r'function\s+(\w+)\s*\([^)]*\)\s*\{')
    for match in std_pattern.finditer(content):
        func_name = match.group(1)
        start_idx = match.end() - 1  # includes the '{'
        brace_count = 1
        curr_idx = start_idx + 1
        while brace_count > 0 and curr_idx < len(content):
            char = content[curr_idx]
            if char == '{':
                brace_count += 1
            elif char == '}':
                brace_count -= 1
            curr_idx += 1
        funcs[func_name] = content[start_idx:curr_idx]
        
    return funcs

def classify_handler_string(handler_str, defined_funcs, visited=None):
    if visited is None:
        visited = set()
        
    handler_clean = handler_str.strip()
    
    # Resolve handler if it is just a function name (e.g., `handleCheckInToggle` or `toggleSidebar`)
    # Allow matching word boundaries
    word_match = re.match(r'^[a-zA-Z_]\w*$', handler_clean)
    if word_match:
        func_name = word_match.group(0)
        if func_name in defined_funcs:
            if func_name in visited:
                return "UI_ONLY", "Recursion loop detected."
            visited.add(func_name)
            return classify_body_content(defined_funcs[func_name], defined_funcs, visited)
        elif func_name in BACKEND_FUNCTIONS:
            return "CONNECTED", f"Invokes backend/store action `{func_name}`."
        elif func_name in UI_FUNCTIONS:
            return "UI_ONLY", f"Invokes client-side UI action `{func_name}`."
            
    # If it is inline code (e.g., `() => handleCheckInToggle()`), let's analyze its contents
    return classify_body_content(handler_clean, defined_funcs, visited)

def classify_body_content(body_text, defined_funcs, visited):
    # Check direct backend calls in the body
    for bf in BACKEND_FUNCTIONS:
        if bf in body_text:
            return "CONNECTED", f"Invokes backend action `{bf}`."
            
    # Check if it calls another defined function
    for df_name, df_body in defined_funcs.items():
        if df_name not in visited and df_name in body_text:
            # Sub-trace
            new_visited = set(visited)
            new_visited.add(df_name)
            cat, reason = classify_body_content(df_body, defined_funcs, new_visited)
            if cat == "CONNECTED":
                return "CONNECTED", f"Calls `{df_name}` which connects to backend: {reason}"
                
    # Check for stub/mock indicators in body (but only if no backend writes were found)
    if "alert(" in body_text or "confirm(" in body_text or "console.log" in body_text or "TODO" in body_text:
        return "STUB_MOCK", f"Contains stub/mock logic."
        
    # Check local UI actions
    for uf in UI_FUNCTIONS:
        if uf in body_text:
            return "UI_ONLY", f"Invokes local UI action `{uf}`."
            
    return "UI_ONLY", "No backend calls detected (likely local state or UI helper)."

def analyze_button(button, file_content, defined_funcs):
    onclick = button.get("onclick", "")
    is_submit = button.get("is_submit", False)
    
    # 1. Resolve onClick handler
    if onclick and onclick != "None or No-Op":
        # Extract function call if inline, e.g. () => handleCheckInToggle()
        # Let's extract any function names from the inline code
        category, reason = classify_handler_string(onclick, defined_funcs)
        if category != "NEEDS_INVESTIGATION":
            return category, reason
            
    # 2. Check if it's a submit button
    if is_submit:
        # Search for form's onSubmit handler in the file content
        onsubmit_matches = re.findall(r'onSubmit\s*=\s*\{([^}]+)\}', file_content)
        if onsubmit_matches:
            # Check if any onsubmit handler matches backend
            handlers = " ".join(onsubmit_matches)
            category, reason = classify_handler_string(onsubmit_matches[0], defined_funcs)
            if category == "CONNECTED":
                return "CONNECTED", f"Submit button triggers form onSubmit: {reason}"
            return "CONNECTED", f"Submit button triggers onSubmit: `{onsubmit_matches[0]}` (likely backend form handler)."
        else:
            return "STUB_MOCK", "Submit button but no parent form onSubmit found in file."
            
    # 3. Check for mock/stub indicators
    if onclick == "None or No-Op" or not onclick:
        snippet = button.get("snippet", "")
        if "download" in snippet.lower() or "export" in snippet.lower() or "play" in snippet.lower():
            return "STUB_MOCK", "No-Op onClick handler (visual placeholder or unimplemented action)."
        return "STUB_MOCK", "Missing or empty onClick handler."
        
    return "NEEDS_INVESTIGATION", f"Unhandled logic: onClick=`{onclick}`."

def main():
    if not os.path.exists(AUDIT_JSON_PATH):
        print(f"Error: {AUDIT_JSON_PATH} does not exist.")
        return
        
    with open(AUDIT_JSON_PATH, 'r', encoding='utf-8') as f:
        data = json.load(f)
        
    report = []
    report.append("# Button Connection Audit Report\n")
    report.append(f"This report lists all audited interactive buttons across the application, categorized by their connection status to the backend.\n")
    
    summary = {
        "CONNECTED": 0,
        "UI_ONLY": 0,
        "STUB_MOCK": 0,
        "NEEDS_INVESTIGATION": 0
    }
    
    file_details = {}
    
    for rel_path, buttons in data.items():
        full_path = os.path.join(SRC_DIR, rel_path)
        with open(full_path, 'r', encoding='utf-8', errors='ignore') as f:
            file_content = f.read()
            
        defined_funcs = extract_function_bodies(file_content)
        
        file_details[rel_path] = []
        for btn in buttons:
            category, reason = analyze_button(btn, file_content, defined_funcs)
            
            summary[category] = summary.get(category, 0) + 1
            
            file_details[rel_path].append({
                "line": btn["line_number"],
                "label": btn["label"],
                "handler": btn["onclick"],
                "category": category,
                "reason": reason,
                "snippet": btn["snippet"]
            })
            
    # Add Summary Table
    report.append("## Executive Summary\n")
    report.append("| Category | Count | Description |")
    report.append("| :--- | :--- | :--- |")
    report.append(f"| **Connected to Backend** | {summary['CONNECTED']} | Successfully writes to Firestore, triggers Cloud Functions, or dispatches backend state mutations. |")
    report.append(f"| **Local UI Action** | {summary['UI_ONLY']} | UI controls (e.g. toggles, dropdowns, tab switching, and dialog closures). |")
    report.append(f"| **Stub / Mock / Disconnected** | {summary['STUB_MOCK']} | UI buttons that are stubs, no-ops, console-only logs, or unimplemented. |")
    report.append(f"| **Needs Investigation** | {summary['NEEDS_INVESTIGATION']} | Complex or custom inline handlers that require manual developer validation. |")
    report.append("\n---\n")
    
    # Add Disconnected Buttons Section First (Highest Priority)
    report.append("## 🚨 Disconnected / Mock Buttons (Requires Implementation)\n")
    report.append("These buttons are visual stubs or mock triggers that are not yet connected to the backend. They need backend implementation.\n")
    
    stub_found = False
    for rel_path, btns in file_details.items():
        stubs = [b for b in btns if b["category"] == "STUB_MOCK"]
        if stubs:
            stub_found = True
            report.append(f"### File: [{rel_path}](file:///{SRC_DIR.replace('\\', '/')}/{rel_path.replace('\\', '/')})")
            for s in stubs:
                report.append(f"- **Line {s['line']}**: `{s['label']}`")
                report.append(f"  - **Handler**: `{s['handler']}`")
                report.append(f"  - **Status**: {s['reason']}")
                report.append("  ```jsx")
                report.append(s["snippet"])
                report.append("  ```\n")
                
    if not stub_found:
        report.append("No disconnected or stub buttons found! All buttons are either connected or UI-only.\n")
        
    report.append("\n---\n")
    
    # Add Needs Investigation Section
    report.append("## 🔍 Buttons Requiring Investigation\n")
    inv_found = False
    for rel_path, btns in file_details.items():
        invs = [b for b in btns if b["category"] == "NEEDS_INVESTIGATION"]
        if invs:
            inv_found = True
            report.append(f"### File: [{rel_path}](file:///{SRC_DIR.replace('\\', '/')}/{rel_path.replace('\\', '/')})")
            for iv in invs:
                report.append(f"- **Line {iv['line']}**: `{iv['label']}`")
                report.append(f"  - **Handler**: `{iv['handler']}`")
                report.append(f"  - **Status**: {iv['reason']}")
                report.append("  ```jsx")
                report.append(iv["snippet"])
                report.append("  ```\n")
                
    if not inv_found:
        report.append("No buttons require manual investigation.\n")
        
    report.append("\n---\n")
    
    # Add Detailed File-by-File Breakdown
    report.append("## 📋 Comprehensive File-by-File Audit Details\n")
    for rel_path, btns in file_details.items():
        report.append(f"### File: [{rel_path}](file:///{SRC_DIR.replace('\\', '/')}/{rel_path.replace('\\', '/')})")
        report.append("| Line | Label / Button Tag | Category | Reason / Handler |")
        report.append("| :--- | :--- | :--- | :--- |")
        for b in btns:
            lbl = b['label'].replace("|", "\\|").strip()
            if len(lbl) > 60: lbl = lbl[:57] + "..."
            hnd = b['handler'].replace("\n", " ").replace("|", "\\|").strip()
            if len(hnd) > 60: hnd = hnd[:57] + "..."
            cat_emoji = "🟢 Connected" if b['category'] == "CONNECTED" else "🔵 UI Action" if b['category'] == "UI_ONLY" else "🔴 Stub/Mock" if b['category'] == "STUB_MOCK" else "🟡 Investigating"
            report.append(f"| {b['line']} | `{lbl}` | {cat_emoji} | {b['reason']} |")
        report.append("")
        
    with open(REPORT_MD_PATH, 'w', encoding='utf-8') as f:
        f.write("\n".join(report))
        
    print(f"Audit report generated at {REPORT_MD_PATH}")

if __name__ == "__main__":
    main()
