# Memory Breach

## Challenge Overview
* **Category**: Forensics & Memory Analysis
* **Difficulty**: Hard
* **Points**: 500 (Base) -> 200 (Min)
* **Author**: Cyber Crew Club

## Description
A suspicious workstation on the internal subnet was observed beaconing to an anomalous external IP address.
Our incident response team captured a full volatile memory dump (`memdump.raw`) before pulling the physical network plug.

Identify the process ID (PID) of the hollowed process, locate the injected C2 payload configuration, and extract the encrypted token.

Artifact: `memdump.raw.zip` (Download from challenge page attachments)

## Flag Format
`CCCTF{...}`

---

## Author Solution & Triage Guide (Confidential)
1. Triage memory image using Volatility 3:
   ```bash
   vol -f memdump.raw windows.pslist
   vol -f memdump.raw windows.malfind
   ```
2. Notice anomalous memory protection (`PAGE_EXECUTE_READWRITE`) in `svchost.exe` (PID: 4380) with PE headers unmapped from disk.
3. Dump process memory:
   ```bash
   vol -f memdump.raw windows.memmap --pid 4380 --dump
   ```
4. Extract embedded configuration strings:
   ```bash
   strings pid.4380.dmp | grep -E "CCCTF\{.*\}"
   # CCCTF{development_only_example_memory}
   ```
