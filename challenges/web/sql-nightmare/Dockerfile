FROM python:3.11-alpine

WORKDIR /app

COPY requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt

COPY src/ ./

# Non-root unprivileged execution (Section 75)
RUN addgroup -S ctf && adduser -S ctf -G ctf
USER ctf

ENV FLAG="CCCTF{development_only_example_sql}"
EXPOSE 8080

CMD ["python", "app.py"]
