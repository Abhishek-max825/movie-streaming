# Docker Instructions

This project is containerized to ensure consistent execution across different systems.

## Prerequisites
- [Docker Desktop](https://www.docker.com/products/docker-desktop/) installed.

## Build the Image
Run this command in the project root directory:

```bash
docker build -t movies-streaming .
```

## Running the Application

### 1. Run the Streaming Proxy
To start the proxy server (replace `YOUR_URL` with the actual HLS URL):

```bash
docker run -p 8000:8000 movies-streaming python stream_proxy.py --url "YOUR_URL" --host 0.0.0.0
```
Access the player at: `http://localhost:8000/`

### 2. Run the Scraper/Test
To run the TypeScript scraper or tests:

```bash
docker run -it movies-streaming npm test
```

### 3. Interactive Shell
To explore the container environment:

```bash
docker run -it movies-streaming bash
```
