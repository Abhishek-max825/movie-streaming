# 🎬 Movies Streaming

A comprehensive media streaming solution featuring a **Modern Next.js Web Interface**, a **robust Node.js CLI**, and a **Python-based Streaming Proxy**. This project allows you to search for movies/series, extract high-quality streaming links, and play them directly in your browser or via a media player, supporting features like cloud transcoding, range requests, and ZIP archive streaming.

## ✨ Features

- **Modern Web UI**: A Netflix-inspired, responsive web application built with [Next.js](https://nextjs.org/).
- **Hybrid Architecture**: Combines the I/O speed of Node.js for scraping with the processing power of Python for stream handling.
- **Interactive CLI**: A terminal-based interface for quick searching and streaming without a browser.
- **Universal Streaming Proxy**: A local Python proxy that handles:
    - **Bypassing Headers**: Handles `Referer`, `User-Agent`, and Cookie-based protections.
    - **HLS/m3u8 Support**: Transcodes and proxies streams for compatibility.
    - **ZIP Streaming**: Streams individual files directly from remote ZIP archives without downloading the entire archive.
    - **GPU Acceleration**: Supports NVENC (NVIDIA), QSV (Intel), and AMF (AMD) for transcoding.
- **Docker Support**: Ready-to-deploy Docker container setup.

## ✅ Prerequisites

Ensure you have the following installed:

1.  **Node.js**: v18 or higher (Required for Next.js Frontend).
2.  **Python**: v3.10 or higher.
3.  **FFmpeg**:
    *   **Windows**: Download from [gyan.dev](https://www.gyan.dev/ffmpeg/builds/), extract, and add the `bin` folder to your System PATH.
    *   **Linux/Mac**: Install via package manager (e.g., `sudo apt install ffmpeg` or `brew install ffmpeg`).
    *   **Verification**: Run `ffmpeg -version`. If this fails, the app **will not work**.

## 🚀 Installation

### 1. Backend & CLI Setup (Root)
Install the core dependencies for the CLI and Python proxy.

```bash
# Install Node.js dependencies
npm install

# Install Python dependencies
pip install -r requirements.txt

# Build the TypeScript backend
npm run build
```

### 2. Frontend Setup (Web UI)
Install the dependencies for the web application.

```bash
cd frontend
npm install
# Return to root
cd ..
```

## 🎮 Running the Application

You can run the application in two modes: as a modern **Web App** or as a **CLI tool**.

### Option 1: Modern Web Application (Recommended)
The web interface provides a rich visual experience with search, trending lists, and an integrated video player.

```bash
cd frontend
npm run dev
```

*   Open [http://localhost:3000](http://localhost:3000) in your browser.
*   **Search** for movies or series.
*   **Click** to view details and available qualities.
*   **Play** directly in the browser.

### Option 2: Interactive CLI
A fast, keyboard-driven interface for quick access.

```bash
npm start
```

*   Follow the on-screen prompts to search and select content.
*   The CLI will automatically launch the streaming proxy and provide a playback URL.

---

## 🛠️ Manual Usage (Advanced Proxy)

You can run the Python streaming proxy independently if you already have a media URL.

### Standard Stream
```bash
python src/python/stream_proxy.py --url "https://example.com/video.mp4"
```

### Streaming from a ZIP Archive
To stream a specific file from a remote ZIP:

1.  **List files**:
    ```bash
    python src/python/zip_helper.py list --url "https://remote.com/series.zip"
    ```
2.  **Stream file**:
    ```bash
    python src/python/stream_proxy.py --url "https://remote.com/series.zip" --zip-file "episode_1.mkv"
    ```

### Proxy Arguments
| Argument | Description | Default |
| :--- | :--- | :--- |
| `--url` | **Required**. Remote media URL. | - |
| `--zip-file` | Internal filename (if URL is a ZIP). | `None` |
| `--port` | Proxy port. | `8000` |
| `--video-bitrate` | Target video bitrate. | `3500k` |
| `--headers` | JSON string of custom headers. | `None` |

---

## 📂 Project Structure

- **`frontend/`**: Next.js Web Application.
- **`src/node/`**: TypeScript backend logic (scrapers, CLI).
- **`src/python/`**: Python helper scripts (stream proxy, transcoding).
- **`tools/`**: Utility scripts.
- **`docker/`**: Container configuration.

## 🐳 Docker Usage

Run the entire stack in a container:

```bash
cd docker
docker-compose up --build
```

## ❓ Troubleshooting

*   **`ffmpeg not found`**: Add FFmpeg `bin` folder to your System PATH.
*   **`Port 8000 busy`**: The app will automatically try the next available port.
*   **`Proxy failed to start`**: Check the console output for Python errors. Ensure `pip install -r requirements.txt` was run.
