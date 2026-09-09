# Challenge Author Guide (Section 92)

## 1. Challenge Directory Convention
All competition challenges live inside `challenges/<category>/<challenge-slug>/`:
```text
challenges/web/sql-nightmare/
├── README.md               # Challenge briefing & metadata
├── Dockerfile              # Container build definition (if live target)
├── docker-compose.yml      # Local development compose
├── requirements.txt / src/ # Source code
└── solution/
    └── writeup.md          # Confidential staff writeup & exploit
```

---

## 2. Flag Specification
- **Format**: All flags must follow the official pattern: `CCCTF{alphanumeric_and_underscores_here}`
- **Entropy**: Ensure flags cannot be brute-forced or guessed through common wordlists.
- **Secrecy**: Production flags must NEVER be committed to the Git repository. Use `CCCTF{development_only_example_*}` for local testing.

---

## 3. Scoring Configuration
Every challenge must specify:
1. `base_points`: Initial point value (default: 500).
2. `minimum_points`: Floor value for dynamic scoring decay (default: 100).
3. `first_blood_bonus`: Pioneer solver bonus (default: 50).

---

## 4. Progressive Intelligence Hints
- Create hints in ascending order of information disclosure.
- Assign appropriate point deduction costs:
  - **Hint 1** (Recon / Methodology): 25–50 points.
  - **Hint 2** (Vulnerability Context): 50–100 points.
  - **Hint 3** (Exploitation Direction): 100–150 points.
