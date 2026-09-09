#include <stdio.h>
#include <stdlib.h>
#include <unistd.h>

void win() {
    printf("\n[+] Target Compromised! Spawning Flag Extraction:\n");
    FILE *f = fopen("/flag.txt", "r");
    if (f == NULL) {
        printf("CCCTF{development_only_example_bof}\n");
        exit(0);
    }
    char flag[128];
    fgets(flag, sizeof(flag), f);
    printf("%s\n", flag);
    fclose(f);
    exit(0);
}

void vuln() {
    char buffer[64];
    printf("Enter military authorization payload: ");
    fflush(stdout);
    // Unbounded input read - Buffer Overflow vulnerability
    gets(buffer);
    printf("Payload received. Processing...\n");
}

int main() {
    setvbuf(stdout, NULL, _IONBF, 0);
    setvbuf(stdin, NULL, _IONBF, 0);

    printf("=========================================\n");
    printf(" Cyber Crew Security Terminal v1.0\n");
    printf("=========================================\n");

    vuln();

    printf("Exiting cleanly.\n");
    return 0;
}
