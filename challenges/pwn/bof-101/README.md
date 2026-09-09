# Buffer Overflow 101

## Challenge Overview
* **Category**: Binary Exploitation (Pwn)
* **Difficulty**: Medium
* **Points**: 500 (Base) -> 150 (Min)
* **Author**: Cyber Crew Club

## Description
A classic 64-bit Linux ELF binary with disabled stack canaries and an executable stack.
Connect to the challenge target, overwrite the instruction pointer, and redirect execution to the `win()` function.

Target Endpoint: `nc pwn01.ctf.cybercrew.online 1337` or local `nc localhost 1337`

## Flag Format
`CCCTF{...}`
