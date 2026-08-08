FROM python:3.12-slim

# iputils-ping so the (intentionally vulnerable) command-injection endpoint
# has a real command to run -- makes the injection demo genuine, not faked.
RUN apt-get update && apt-get install -y --no-install-recommends iputils-ping \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app
COPY app.py .

# A "statements" directory the download endpoint serves from. The path-traversal
# attack escapes this directory to read /etc/passwd, proving the flaw.
RUN mkdir -p /srv/statements \
    && printf 'Welcome to Acme Bank. Your statement is ready.\n' > /srv/statements/welcome.txt

EXPOSE 8080
CMD ["python", "app.py"]
