CC = gcc
CFLAGS = -fno-stack-protector -z execstack -no-pie -O0

all: vuln

vuln: vuln.c
	$(CC) $(CFLAGS) vuln.c -o vuln

clean:
	rm -f vuln
