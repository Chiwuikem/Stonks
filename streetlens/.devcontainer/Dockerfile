# Dev container with Java 21 + Python 3.11 + Maven
FROM mcr.microsoft.com/devcontainers/java:1-21-bullseye

# Install Python 3.11 and pip
RUN apt-get update &&     apt-get install -y python3 python3-pip python3-venv &&     ln -s /usr/bin/python3 /usr/bin/python &&     pip3 install --no-cache-dir --upgrade pip

# Maven is preinstalled in the base image
