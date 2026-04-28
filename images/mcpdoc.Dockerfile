# syntax=docker/dockerfile:1
FROM python:3

RUN curl -LsSf https://astral.sh/uv/install.sh | sh

ENV PATH=/root/.local/bin:$PATH

EXPOSE 8082