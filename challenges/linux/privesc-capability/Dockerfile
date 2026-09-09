FROM debian:bookworm-slim

RUN apt-get update && apt-get install -y --no-install-recommends \
    openssh-server \
    python3 \
    libcap2-bin \
    sudo \
    && rm -rf /var/lib/apt/lists/*

# Create operative user
RUN useradd -m -s /bin/bash operative && \
    echo "operative:cybercrew" | chpasswd

# Setup target flag readable ONLY by root
RUN echo "CCCTF{development_only_example_linux_caps}" > /root/flag.txt && \
    chmod 400 /root/flag.txt

# Grant python3 cap_setuid capability (Educational vulnerability)
RUN setcap cap_setuid+ep /usr/bin/python3.11

# Configure SSH
RUN mkdir /var/run/sshd && \
    echo "PermitRootLogin no" >> /etc/ssh/sshd_config && \
    echo "PasswordAuthentication yes" >> /etc/ssh/sshd_config

EXPOSE 22

CMD ["/usr/sbin/sshd", "-D"]
