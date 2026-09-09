FROM debian:bookworm-slim

RUN apt-get update && apt-get install -y --no-install-recommends \
    gcc \
    make \
    libc6-dev \
    socat \
    && rm -rf /var/lib/apt/lists/*

RUN useradd -m -s /bin/sh ctf

WORKDIR /home/ctf

COPY src/ ./
RUN make && chmod 755 vuln

RUN echo "CCCTF{development_only_example_bof}" > /flag.txt && chmod 444 /flag.txt

USER ctf

EXPOSE 1337

CMD ["socat", "-T30", "TCP-LISTEN:1337,reuseaddr,fork", "EXEC:./vuln,pty,stderr"]
