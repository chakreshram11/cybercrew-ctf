# Broken RSA Challenge Generator
# Generates two close 512-bit prime numbers p and q susceptible to Fermat's Factorization

from sympy import nextprime
import random

def generate():
    flag = b"CCCTF{development_only_example_rsa}"
    m = int.from_bytes(flag, 'big')

    # Base random prime
    base = random.getrandbits(512)
    p = nextprime(base)
    # q is very close to p
    q = nextprime(p + random.randint(100, 50000))

    n = p * q
    e = 65537
    c = pow(m, e, n)

    print(f"n = {n}")
    print(f"e = {e}")
    print(f"c = {c}")

if __name__ == '__main__':
    generate()
