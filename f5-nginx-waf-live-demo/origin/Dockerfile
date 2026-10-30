FROM python:3.12-slim

WORKDIR /app
COPY app.py .

RUN mkdir -p /srv/statements \
    && printf 'Welcome to Acme Pay. Your statement is ready.\n' > /srv/statements/welcome.txt

ENV PORT=8080
ENV STMT_DIR=/srv/statements
EXPOSE 8080
CMD ["python", "app.py"]
