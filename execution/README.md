# Execution Scripts

This folder contains **deterministic Python scripts** — the reliable, testable workhorses of the system.

## Philosophy
- Scripts do **one thing well** — no hidden side effects
- All credentials come from `.env` — never hardcoded
- Every script prints a clear summary at the end
- Errors are logged to `.tmp/` and/or raised with a useful message
- Scripts are safe to re-run (idempotent where possible)

## Usage Pattern
The agent reads a directive, then calls the appropriate script here with the right arguments.

## Adding a New Script
1. Create `execution/<verb>_<noun>.py`
2. Add argparse for all inputs
3. Add a corresponding directive in `directives/<verb>_<noun>.md`
4. Test it manually before the agent uses it

## Dependencies
All scripts use the shared virtual environment. Install with:
```bash
pip install -r requirements.txt
```

## Security / Phase 0 one-shots

### Scrub plaintext passwords from Firestore users
Historical `users` docs may still contain a `password` field. Auth passwords live in
Firebase Auth only — run this after deploying the client that no longer writes passwords:

```bash
# Dry-run (default)
python execution/scrub_user_passwords.py

# Apply
python execution/scrub_user_passwords.py --apply
```
