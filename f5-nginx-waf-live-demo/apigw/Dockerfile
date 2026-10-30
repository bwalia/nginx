FROM python:3.12-slim
WORKDIR /demo
COPY gateway.py .
# lab + features mounted at runtime from compose volumes
EXPOSE 8083
ENV PORT=8083
CMD ["python", "gateway.py"]
