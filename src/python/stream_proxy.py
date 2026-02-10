import argparse
import asyncio
import shutil
import sys
import tempfile
from pathlib import Path
from typing import List
import json
import subprocess
import mimetypes

# Explicitly register HLS MIME types for mobile compatibility
mimetypes.add_type('application/vnd.apple.mpegurl', '.m3u8')
mimetypes.add_type('video/MP2T', '.ts')

import time


from aiohttp import web

# Global idle timeout manager
class IdleTimeout:
    def __init__(self, timeout_seconds: int, stop_event: asyncio.Event):
        self.timeout_seconds = timeout_seconds
        self.stop_event = stop_event
        self.last_activity = time.time()
        self._task = None

    def update(self):
        self.last_activity = time.time()

    async def start(self):
        print(f"Stats: Idle timeout set to {self.timeout_seconds}s")
        while not self.stop_event.is_set():
            if time.time() - self.last_activity > self.timeout_seconds:
                print(f"⚠️ Idle timeout reached ({self.timeout_seconds}s), shutting down...")
                self.stop_event.set()
                break
            await asyncio.sleep(5)

# HTML Template with robust Audio Selector injection
HTML_TEMPLATE = """
<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Universal Streaming Proxy</title>
    <link rel="stylesheet" href="https://cdn.plyr.io/3.7.8/plyr.css" />
    <style>
      :root {{
        --plyr-color-main: #3b82f6;
        --plyr-video-background: #000;
        --plyr-menu-background: #1e293b;
        --plyr-menu-color: #e2e8f0;
      }}
      body {{
        font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
        margin: 0;
        padding: 0;
        background: #0f172a;
        color: #e2e8f0;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        min-height: 100vh;
      }}
      .container {{
        width: 100%;
        max-width: 1200px;
        padding: 1rem;
        box-sizing: border-box;
      }}
      .video-wrapper {{
        background: #000;
        border-radius: 16px;
        overflow: hidden;
        box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5);
        aspect-ratio: 16/9;
        width: 100%;
        position: relative;
      }}
      video {{
        width: 100%;
        height: 100%;
      }}
      .info {{
        margin-top: 1.5rem;
        text-align: center;
        color: #94a3b8;
        font-size: 0.9rem;
      }}
      code {{
        background: rgba(148, 163, 184, 0.1);
        padding: 0.2rem 0.4rem;
        border-radius: 4px;
      }}
      /* Custom Audio Selector in Control Bar */
      .plyr__audio-control {{
        margin-left: 10px;
        position: relative;
        display: flex;
        align-items: center;
      }}
      .plyr__audio-select {{
        background: transparent;
        color: #fff;
        border: none;
        font-size: 14px;
        font-weight: 500;
        cursor: pointer;
        padding: 5px;
        opacity: 0.8;
        transition: opacity 0.3s;
        appearance: none; /* Remove default arrow */
        -webkit-appearance: none;
      }}
      .plyr__audio-select:hover {{
        opacity: 1;
        color: var(--plyr-color-main, #3b82f6);
      }}
      .plyr__audio-select:focus {{
        outline: none;
      }}
      /* No custom CSS needed as we reuse Plyr classes */
    </style>
  </head>
  <body>
    <div class="container">
      <div class="video-wrapper">
        <video id="player" controls crossorigin playsinline>
          <source src="{playlist_url}" type="application/vnd.apple.mpegurl" />
        </video>
      </div>

      <div class="info">
        <p>Source: <code>{source_url}</code></p>
        {gpu_status}
      </div>
    </div>

    <script src="https://cdn.plyr.io/3.7.8/plyr.js"></script>
    <script src="https://cdn.jsdelivr.net/npm/hls.js@latest"></script>
    <script>
      document.addEventListener('DOMContentLoaded', () => {{
        const source = "{playlist_url}";
        const video = document.querySelector('#player');
        
        // Initialize Plyr
        const player = new Plyr(video, {{
          controls: [
            'play-large', 'restart', 'rewind', 'play', 'fast-forward',
            'progress', 'current-time', 'duration', 'mute', 'volume',
            'captions', 'settings', 'pip', 'airplay', 'fullscreen',
          ],
          settings: ['captions', 'quality', 'speed'],
          seekTime: 10,
          keyboard: {{ focused: true, global: true }},
        }});

        // Initialize HLS
        if (Hls.isSupported()) {{
          const hls = new Hls();
          hls.loadSource(source);
          hls.attachMedia(video);
          window.hls = hls;
          
          // Handle Audio Tracks
          hls.on(Hls.Events.MANIFEST_PARSED, () => {{
            const tracks = hls.audioTracks;
            console.log("Audio tracks found:", tracks);

            // Persistent check loop
            setInterval(() => {{
               const tracks = hls.audioTracks;
               if (!tracks || tracks.length < 1) return;

               const menu = document.querySelector('.plyr__menu');
               if (!menu) return;

               // Check if already injected
               if (document.getElementById('plyr-audio-menu')) return;

               // Find the Home pane (contains the "Speed" button)
               // We look for a button that contains a span with text "Speed"
               const allButtons = Array.from(menu.querySelectorAll('button'));
               const speedBtn = allButtons.find(btn => {{
                   const span = btn.querySelector('span');
                   return span && span.textContent.trim() === 'Speed';
               }});

               if (!speedBtn) return; // Speed menu not ready yet

               const homeContent = speedBtn.parentElement;
               if (!homeContent) return;

               console.log("Injecting Audio menu (persistent check)...");

               // 1. Create the Main Menu Button
               const audioBtn = document.createElement('button');
               audioBtn.type = 'button';
               audioBtn.className = 'plyr__control plyr__control--forward';
               audioBtn.role = 'menuitem';
               audioBtn.setAttribute('aria-haspopup', 'true');
               audioBtn.innerHTML = `
                   <span>Audio</span>
                   <span class="plyr__menu__value">Default</span>
               `;
               
               // Insert after Speed
               if (speedBtn.nextSibling) {{
                   homeContent.insertBefore(audioBtn, speedBtn.nextSibling);
               }} else {{
                   homeContent.appendChild(audioBtn);
               }}

               // 2. Create the Sub-menu Container
               const audioPane = document.createElement('div');
               audioPane.id = 'plyr-audio-menu';
               audioPane.className = 'plyr__menu__container';
               audioPane.hidden = true;
               audioPane.innerHTML = `
                   <div class="plyr__control--back">
                       <button type="button" class="plyr__control plyr__control--back">
                           <span>Settings</span>
                           <span class="plyr__sr-only">Go back to previous menu</span>
                       </button>
                       <span class="plyr__menu__label">Audio</span>
                   </div>
                   <div class="plyr__menu__content"></div>
               `;
               
               const contentDiv = audioPane.querySelector('.plyr__menu__content');
               
               // 3. Populate Audio Tracks
               tracks.forEach((track, index) => {{
                   const button = document.createElement('button');
                   button.type = 'button';
                   button.className = 'plyr__control';
                   button.role = 'menuitemradio';
                   const langMap = {{
                       'hin': 'Hindi', 'eng': 'English', 'kan': 'Kannada', 'tel': 'Telugu',
                       'tam': 'Tamil', 'mal': 'Malayalam', 'spa': 'Spanish', 'fre': 'French',
                       'ger': 'German', 'ita': 'Italian', 'jpn': 'Japanese', 'kor': 'Korean',
                       'chi': 'Chinese', 'rus': 'Russian', 'und': 'Unknown'
                   }};
                   const langName = langMap[track.lang] || track.lang;
                   const label = langName || track.name || `Audio ${{index + 1}}`;
                   button.innerHTML = `
                       <span>${{label}}</span>
                   `;
                   
                   button.addEventListener('click', () => {{
                       hls.audioTrack = index;
                       updateAudioUI(index);
                       showHome();
                   }});
                   
                   contentDiv.appendChild(button);
               }});
               
               menu.appendChild(audioPane);

               // 4. Navigation Logic
               const homePane = homeContent.closest('.plyr__menu__container');
               
               const showAudio = () => {{
                   homePane.hidden = true;
                   audioPane.hidden = false;
               }};
               
               const showHome = () => {{
                   audioPane.hidden = true;
                   homePane.hidden = false;
               }};
               
               audioBtn.addEventListener('click', showAudio);
               audioPane.querySelector('.plyr__control--back').addEventListener('click', showHome);
               
               // 5. UI Update Helper
               const updateAudioUI = (trackId) => {{
                   const buttons = contentDiv.querySelectorAll('button');
                   buttons.forEach((btn, idx) => {{
                       if (idx === trackId) {{
                           btn.setAttribute('aria-checked', 'true');
                           btn.classList.add('plyr__control--pressed');
                       }} else {{
                           btn.setAttribute('aria-checked', 'false');
                           btn.classList.remove('plyr__control--pressed');
                       }}
                   }});
                   
                   const trackName = tracks[trackId].name || `Audio ${{trackId + 1}}`;
                   const valueSpan = audioBtn.querySelector('.plyr__menu__value');
                   if (valueSpan) valueSpan.textContent = trackName;
               }};
               
               // Initial State
               updateAudioUI(hls.audioTrack);
               
               // Listen for external changes
               hls.on(Hls.Events.AUDIO_TRACK_SWITCHED, (event, data) => {{
                   updateAudioUI(data.id);
               }});

            }}, 1000); // Check every second
          }});

          // Handle captions
          player.on('languagechange', () => {{
            setTimeout(() => hls.subtitleTrack = player.currentTrack, 50);
          }});

        }} else if (video.canPlayType('application/vnd.apple.mpegurl')) {{
          video.src = source;
        }}
      }});
    </script>
  </body>
</html>
"""

# Headers to mimic a browser and avoid 403 Forbidden
HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
    "Accept": "*/*",
    "Referer": "https://hdhub4u.rehab/",
    "Origin": "https://hdhub4u.rehab",
    "Connection": "keep-alive",
    "Sec-Fetch-Dest": "video",
    "Sec-Fetch-Mode": "no-cors",
    "Sec-Fetch-Site": "cross-site",
    "Pragma": "no-cache",
    "Cache-Control": "no-cache",
}

def get_video_metadata(source_url: str) -> dict:
    """
    Probes the source URL to find audio tracks and duration.
    Returns a dict: {'tracks': [...], 'duration': 1234.5}
    """
    # Format headers for ffprobe/ffmpeg
    headers_str = "".join(f"{k}: {v}\r\n" for k, v in HEADERS.items())
    
    # Validation
    if not source_url.startswith("http"):
         print(f"Warning: Skipping ffprobe for non-http URL: {source_url}")
         return {"tracks": [{"index": 0, "lang": "und", "title": "Unknown"}], "duration": None}

    cmd = [
        "ffprobe",
        "-v", "quiet",
        "-print_format", "json",
        "-headers", headers_str,
        "-analyzeduration", "1000000",
        "-probesize", "1000000",
        "-show_entries", "format=duration:stream=index,codec_type,tags:stream_tags=language,title,handler_name",
        source_url
    ]
    
    # Log the command (excluding sensitive headers if any)
    print(f"DEBUG: Running ffprobe on {source_url[:60]}...")
    
    try:
        # Use a slightly shorter timeout for the probe to avoid hanging the proxy startup too long
        result = subprocess.run(cmd, capture_output=True, text=True, timeout=20)
        
        if result.returncode != 0:
            print(f"Warning: ffprobe returned exit code {result.returncode}")
            if result.stderr:
                print(f"ffprobe stderr: {result.stderr.strip()[:200]}")
            return {"tracks": [{"index": 0, "lang": "und", "title": "Unknown"}], "duration": None}
        
        if not result.stdout.strip():
            print("Warning: ffprobe returned empty stdout")
            return {"tracks": [{"index": 0, "lang": "und", "title": "Unknown"}], "duration": None}

        data = json.loads(result.stdout)
        format_info = data.get("format", {})
        duration = format_info.get("duration")
        if duration:
            try:
                duration = float(duration)
            except (ValueError, TypeError):
                duration = None
            
        streams = data.get("streams", [])
        
        tracks = []
        for s in streams:
            if s.get("codec_type") != "audio":
                 continue
            tags = s.get("tags", {})
            # Try to get a meaningful name
            lang = tags.get("language", "und")
            title = tags.get("title") or tags.get("handler_name") or lang
            
            tracks.append({
                "index": s.get("index"),
                "lang": lang,
                "title": title
            })
            
        return {
            "tracks": tracks if tracks else [{"index": 0, "lang": "und", "title": "Unknown"}],
            "duration": duration
        }

    except subprocess.TimeoutExpired:
        print("Warning: ffprobe timed out after 20 seconds")
        return {"tracks": [{"index": 0, "lang": "und", "title": "Unknown"}], "duration": None}
    except Exception as e:
        print(f"Warning: Internal error during ffprobe: {str(e)}")
        return {"tracks": [{"index": 0, "lang": "und", "title": "Unknown"}], "duration": None}


async def detect_gpu_encoder() -> tuple[str, str, str, List[str]]:
    """
    Detects available hardware encoders and decoders.
    Returns: (encoder_name, preset, extra_args, hw_accel_args)
    """
    print("Checking for GPU acceleration support...")
    
    try:
        # Check encoders available in the current ffmpeg build
        proc = await asyncio.create_subprocess_exec(
            "ffmpeg", "-hide_banner", "-encoders",
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.PIPE
        )
        stdout, _ = await proc.communicate()
        output = stdout.decode(errors="ignore")
        
        if "h264_nvenc" in output:
            print("✓ NVIDIA GPU detected (h264_nvenc + cuda)")
            # Use CUDA for both decoding and encoding
            return "h264_nvenc", "p1", "-rc cbr -2pass 0", ["-hwaccel", "cuda", "-hwaccel_output_format", "cuda"]
            
        if "h264_amf" in output:
            print("✓ AMD GPU detected (h264_amf + dxva2)")
            # Use DXVA2 for decoding (common on Windows for AMD)
            return "h264_amf", "balanced", "-rc vbr_latency", ["-hwaccel", "dxva2"]
            
        if "h264_qsv" in output:
            print("✓ Intel GPU detected (h264_qsv)")
            # QSV decoding and encoding
            return "h264_qsv", "balanced", "-global_quality 23", ["-hwaccel", "qsv", "-hwaccel_output_format", "qsv"]
            
    except Exception as e:
        print(f"Warning: GPU detection failed ({e}), falling back to CPU.")
        
    print("! No GPU encoder detected, using CPU (libx264)")
    return "libx264", "veryfast", "-tune zerolatency", []


def build_ffmpeg_command(
    source_url: str,
    output_dir: Path,
    segment_duration: int,
    video_bitrate: str,
    audio_bitrate: str,
    encoder: str,
    encoder_preset: str,
    encoder_opts: str,
    hw_accel_args: List[str],
    audio_tracks: List[dict],
) -> List[str]:
    # Master playlist name (what the browser loads)
    master_playlist_name = "stream.m3u8"
    
    # Use relative paths for ffmpeg to avoid Windows path issues
    # The process will be run with cwd=output_dir
    variant_playlist_pattern = "stream_%v.m3u8"
    segment_pattern = "segment_%v_%05d.ts"
    
    # Format headers for ffmpeg
    headers_str = "".join(f"{k}: {v}\r\n" for k, v in HEADERS.items())

    cmd = [
        "ffmpeg",
        "-y",
        "-loglevel", "info",
    ]

    # Only add headers if input is HTTP(S)
    if source_url.startswith("http"):
        cmd.extend(["-headers", headers_str])

    # Add hardware acceleration args (before input)
    if hw_accel_args:
        cmd.extend(hw_accel_args)

    cmd.extend([
        "-i", source_url,
        "-map", "0:v:0", # Always map first video
    ])

    # Map all detected audio tracks
    var_map_parts = ["v:0,agroup:audio,default:yes"]
    
    if audio_tracks:
        for i, track in enumerate(audio_tracks):
            cmd.extend(["-map", f"0:a:{i}"])
            
            # Set metadata for the stream
            lang = track.get("lang", "und")
            title = track.get("title", "")
            
            # Note: For HLS, setting language metadata on the stream is usually enough
            # for the player to pick it up in the manifest.
            cmd.extend([f"-metadata:s:a:{i}", f"language={lang}"])
            
            # Ensure unique NAME for HLS manifest (required by spec)
            # Combine title and language, or just use language if title is generic/missing
            base_name = title if title else f"Audio {i+1}"
            unique_name = f"{base_name} - {lang}" if lang != "und" else f"{base_name} {i+1}"
            
            # Sanitize for ffmpeg argument
            safe_name = unique_name.replace(",", "").replace(" ", "_").replace(":", "")
            
            if title:
                cmd.extend([f"-metadata:s:a:{i}", f"title={unique_name}"])
            
            var_map_parts.append(f"a:{i},agroup:audio,language:{lang},name:{safe_name}")
    else:
        # Fallback
        cmd.extend(["-map", "0:a:0"])
        var_map_parts.append("a:0,agroup:audio")

    var_stream_map = " ".join(var_map_parts)

    cmd.extend([
        "-c:v", encoder,
        "-preset", encoder_preset,
    ])

    # Add encoder specific options
    if encoder_opts:
        cmd.extend(encoder_opts.split())
        
    # Use relative path for output, relying on CWD
    playlist_path = "stream.m3u8"
    
    cmd.extend([
        "-b:v", video_bitrate,
        "-c:a", "aac",
        "-b:a", audio_bitrate,
        "-ac", "2",
        
        "-f", "hls",
        "-hls_time", str(segment_duration),
        "-hls_list_size", "0", 
        
        
        # Output the playlist (absolute path)
        playlist_path,
    ])
    
    return cmd


async def pipe_stream(stream: asyncio.StreamReader | None, prefix: str) -> None:
    if stream is None:
        return
    try:
        while True:
            line = await stream.readline()
            if not line:
                break
            print(f"[{prefix}] {line.decode(errors='ignore').rstrip()}")
    except asyncio.CancelledError:
        pass


async def wait_for_playlist(playlist_path: Path, timeout: int) -> None:
    elapsed = 0.0
    interval = 0.25
    while elapsed < timeout:
        if playlist_path.exists() and playlist_path.stat().st_size > 0:
            return
        await asyncio.sleep(interval)
        elapsed += interval
    raise TimeoutError("Timed out waiting for HLS playlist to be generated")



def create_app(hls_dir: Path, playlist_name: str, source_url: str, using_gpu: bool, idle_manager: IdleTimeout) -> web.Application:
    @web.middleware
    async def cors_middleware(request, handler):
        response = await handler(request)
        response.headers['Access-Control-Allow-Origin'] = '*'
        response.headers['Access-Control-Allow-Methods'] = 'GET, OPTIONS'
        response.headers['Access-Control-Allow-Headers'] = 'Content-Type'
        return response

    @web.middleware
    async def idle_middleware(request, handler):
        idle_manager.update()
        return await handler(request)

    app = web.Application(middlewares=[cors_middleware, idle_middleware])
    playlist_url = f"/hls/{playlist_name}"
    
    gpu_status_html = ""
    if using_gpu:
        gpu_status_html = '<p style="color: #4ade80; margin-top: 0.5rem; font-weight: bold;">🎬 GPU-accelerated streaming</p>'

    async def index(_: web.Request) -> web.Response:
        return web.Response(
            text=HTML_TEMPLATE.format(
                source_url=source_url, 
                playlist_url=playlist_url,
                gpu_status=gpu_status_html
            ),
            content_type="text/html",
        )

    async def health(_: web.Request) -> web.Response:
        return web.json_response({"status": "ok", "source": source_url, "playlist": playlist_url})

    async def shutdown(_: web.Request) -> web.Response:
        try:
            print("🛑 Shutdown requested via API...")
            async def do_stop():
                await asyncio.sleep(0.5) # Increased wait to ensure response is sent
                print("🛑 Signaling stop_event now.")
                idle_manager.stop_event.set()
            
            asyncio.create_task(do_stop())
            return web.json_response({"status": "shutting down"})
        except Exception as e:
            import traceback
            traceback.print_exc()
            return web.json_response({"status": "error", "message": str(e)}, status=500)

    async def handle_options(_: web.Request) -> web.Response:
        return web.Response(status=204, headers={
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'GET, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type, Range',
            'Access-Control-Max-Age': '86400',
        })

    app.router.add_get("/", index)
    app.router.add_get("/health", health)
    app.router.add_post("/shutdown", shutdown)
    app.router.add_route('OPTIONS', '/{tail:.*}', handle_options)
    app.router.add_static("/hls/", path=str(hls_dir), show_index=False)
    return app


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Transcode any remote video/audio URL to browser-friendly HLS for in-browser playback.",
    )
    parser.add_argument("--url", required=True, help="Remote HTTPS/HTTP media URL to relay")
    parser.add_argument("--host", default="127.0.0.1", help="Local interface to bind")
    parser.add_argument("--port", type=int, default=8000, help="Port to expose the proxy on")
    parser.add_argument(
        "--segment-duration",
        type=int,
        default=2,
        help="Target segment duration in seconds (controls latency vs. efficiency)",
    )
    parser.add_argument(
        "--video-bitrate",
        default="3500k",
        help="Target video bitrate for the HLS rendition (e.g. 2500k, 5M)",
    )
    parser.add_argument(
        "--audio-bitrate",
        default="160k",
        help="Target audio bitrate for the HLS rendition",
    )
    parser.add_argument(
        "--preset",
        default="ultrafast",
        help="x264 preset controlling CPU vs. compression efficiency",
    )
    parser.add_argument(
        "--startup-timeout",
        type=int,
        default=60,
        help="Seconds to wait for ffmpeg to emit the first playlist before aborting",
    )
    parser.add_argument(
        "--headers",
        type=str,
        default=None,
        help="JSON string of HTTP headers to use (overrides defaults)",
    )
    parser.add_argument(
        "--zip-file",
        type=str,
        default=None,
        help="Filename inside the ZIP archive to stream",
    )
    parser.add_argument(
        "--idle-timeout",
        type=int,
        default=300, # 5 minutes default
        help="Seconds of inactivity before shutting down",
    )
    return parser.parse_args()


async def run_proxy(args: argparse.Namespace) -> None:
    temp_dir = Path(tempfile.mkdtemp(prefix="hls_proxy_"))
    playlist_name = "stream.m3u8"
    playlist_path = temp_dir / playlist_name
    ffmpeg_proc: asyncio.subprocess.Process | None = None
    proxy_proc: web.AppRunner | None = None
    log_tasks: list[asyncio.Task] = []
    runner: web.AppRunner | None = None

    try:
        # Trim whitespace from URL to prevent ffmpeg errors
        args.url = args.url.strip()

        # Update HEADERS based on args or URL
        if args.headers:
            try:
                custom_headers = json.loads(args.headers)
                HEADERS.update(custom_headers)
            except json.JSONDecodeError:
                print("Warning: Invalid JSON in --headers, ignoring.")
        else:
            # Default behavior: no default referer for generic URLs
            pass

        # Probe for audio tracks and duration
        audio_tracks = []
        detected_duration = None
        if not args.zip_file:
            print("Probing source for metadata...")
            metadata = get_video_metadata(args.url)
            audio_tracks = metadata["tracks"]
            detected_duration = metadata["duration"]
            print(f"Found {len(audio_tracks)} audio track(s):")
            for t in audio_tracks:
                print(f" - Track {t['index']}: {t.get('title', 'Unknown')} ({t.get('lang', 'und')})")
            if detected_duration:
                print(f"Detected duration: {detected_duration}s")
        else:
            print("Streaming from ZIP, skipping metadata probe (using default mapping).")

        # Detect GPU encoder
        encoder, encoder_preset, encoder_opts, hw_accel_args = await detect_gpu_encoder()
        
        # Override preset if user provided one and we are on CPU, 
        # but for GPU we stick to optimized defaults unless we want to allow override.
        # The requirements say "Use p1 for NVENC", etc. so we respect the detection.
        # However, if the user explicitly passed --preset, we might want to respect it for CPU.
        if encoder == "libx264" and args.preset != "veryfast":
             encoder_preset = args.preset

        ffmpeg_source = args.url
        if args.zip_file:
            ffmpeg_source = "pipe:0"

        cmd = build_ffmpeg_command(
            source_url=ffmpeg_source,
            output_dir=temp_dir,
            segment_duration=args.segment_duration,
            video_bitrate=args.video_bitrate,
            audio_bitrate=args.audio_bitrate,
            encoder=encoder,
            encoder_preset=encoder_preset,
            encoder_opts=encoder_opts,
            hw_accel_args=hw_accel_args,
            audio_tracks=audio_tracks,
        )

        print("Launching ffmpeg to transcode into HLS...")

        zip_proc = None
        if args.zip_file:
            # Launch zip_helper to stream to stdout using standard subprocess to get a pipeable file handle
            zip_cmd = [
                sys.executable, "src/python/zip_helper.py", "stream",
                "--url", args.url,
                "--file", args.zip_file
            ]
            print(f"Zip helper command: {' '.join(zip_cmd)}")
            # Use subprocess.Popen to get a real file object for stdout
            zip_proc = subprocess.Popen(
                zip_cmd,
                stdout=subprocess.PIPE,
                stderr=subprocess.PIPE
            )
            
            try:
                ffmpeg_proc = await asyncio.create_subprocess_exec(
                    *cmd,
                    stdin=zip_proc.stdout,
                    stdout=asyncio.subprocess.PIPE,
                    stderr=asyncio.subprocess.PIPE,
                    cwd=str(temp_dir)
                )
            except FileNotFoundError as exc:
                raise RuntimeError(
                    "ffmpeg binary not found. Install it and ensure it is available on PATH."
                ) from exc
        else:
            try:
                ffmpeg_proc = await asyncio.create_subprocess_exec(
                    *cmd,
                    stdout=asyncio.subprocess.PIPE,
                    stderr=asyncio.subprocess.PIPE,
                    cwd=str(temp_dir)
                )
            except FileNotFoundError as exc:
                raise RuntimeError(
                    "ffmpeg binary not found. Install it and ensure it is available on PATH."
                ) from exc

        log_tasks = [
            asyncio.create_task(pipe_stream(ffmpeg_proc.stdout, "ffmpeg")),
            asyncio.create_task(pipe_stream(ffmpeg_proc.stderr, "ffmpeg")),
        ]

        # Wait for playlist, but also check if ffmpeg fails early
        elapsed = 0.0
        interval = 0.1
        playlist_ready = False
        print(f"Waiting for playlist generation (timeout: {args.startup_timeout}s)...")
        
        while elapsed < args.startup_timeout:
            if ffmpeg_proc.returncode is not None:
                # Process exited early
                raise RuntimeError(f"ffmpeg exited early with code {ffmpeg_proc.returncode}. Check logs for details.")
            
            if playlist_path.exists() and playlist_path.stat().st_size > 0:
                playlist_ready = True
                print("Playlist generated successfully!")
                break
            
            if elapsed > 0 and int(elapsed) % 5 == 0:
                 print(f"Still waiting... ({int(elapsed)}s)")

            await asyncio.sleep(interval)
            elapsed += interval
        
        if not playlist_ready:
             raise TimeoutError(f"Timed out after {args.startup_timeout}s waiting for HLS playlist. Check your network connection or the URL.")

        stop_event = asyncio.Event()
        idle_manager = IdleTimeout(args.idle_timeout, stop_event)
        
        app = create_app(temp_dir, playlist_name, args.url, using_gpu=(encoder != "libx264"), idle_manager=idle_manager)
        runner = web.AppRunner(app)
        await runner.setup()
        # Try to bind to the requested port, or find the next available one
        retries = 500
        for i in range(retries):
            try:
                site = web.TCPSite(runner, host=args.host, port=args.port + i)
                await site.start()
                # Update args.port to the actual bound port
                args.port = args.port + i
                break
            except OSError as e:
                # Check for common port errors:
                # 13: EACCES (Permission denied)
                # 48: EADDRINUSE (Address already in use - Mac/Linux)
                # 98: EADDRINUSE (Address already in use - Linux)
                # 10013: WSAEACCES (Permission denied - Windows)
                # 10048: WSAEADDRINUSE (Address already in use - Windows)
                if e.errno in {13, 48, 98, 10013, 10048}:
                    print(f"Port {args.port + i} is busy or restricted, trying {args.port + i + 1}...")
                    if i == retries - 1:
                        raise RuntimeError(f"Could not find an available port starting from {args.port}") from e
                else:
                    raise

        display_host = "127.0.0.1" if args.host in {"0.0.0.0", "::"} else args.host
        print("================ Universal Streaming Proxy ================")
        print(f"Remote source : {args.url}")
        print(f"Browser player : http://{display_host}:{args.port}/")
        print(f"Raw playlist   : http://{display_host}:{args.port}/hls/{playlist_name}")
        
        # KEY CHANGE: Machine-readable output for the parent process
        print(json.dumps({
            "event": "bound",
            "port": args.port,
            "url": f"http://{display_host}:{args.port}/",
            "hls": f"http://{display_host}:{args.port}/hls/{playlist_name}",
            "duration": detected_duration
        }), flush=True)

        print("Press Ctrl+C to stop.")

        # stop_event is created earlier now
        
        # Start idle monitor
        asyncio.create_task(idle_manager.start())

        async def monitor_ffmpeg() -> None:
            if ffmpeg_proc is None:
                return
            returncode = await ffmpeg_proc.wait()
            if returncode == 0:
                print("ffmpeg exited cleanly (source ended).")
            else:
                print(f"ffmpeg exited with code {returncode}.")
            stop_event.set()

        monitor_task = asyncio.create_task(monitor_ffmpeg())

        try:
            while not stop_event.is_set():
                await asyncio.sleep(1)
            print("🚀 Proxy loop exiting (stop_event set)...")
        except (KeyboardInterrupt, asyncio.CancelledError):
            print("💥 Stopping proxy (Interrupt/Cancel)...")
            stop_event.set()
        finally:
            monitor_task.cancel()
    finally:
        if proxy_proc:
            print(f"[CLEANUP] Cleaning up resources for port {args.port}...")
        if ffmpeg_proc and ffmpeg_proc.returncode is None:
            ffmpeg_proc.terminate()
            try:
                await asyncio.wait_for(ffmpeg_proc.wait(), timeout=5)
            except asyncio.TimeoutError:
                ffmpeg_proc.kill()
                await ffmpeg_proc.wait()
        
        if zip_proc:
            if zip_proc.returncode is None:
                zip_proc.terminate()
                try:
                    zip_proc.wait(timeout=5)
                except subprocess.TimeoutExpired:
                    zip_proc.kill()
                    zip_proc.wait()

        for task in log_tasks:
            task.cancel()

        if runner is not None:
            await runner.cleanup()

        shutil.rmtree(temp_dir, ignore_errors=True)
        print(f"[Done] Proxy on port {args.port} has fully exited.")


def main() -> None:
    args = parse_args()
    try:
        asyncio.run(run_proxy(args))
    except RuntimeError as exc:
        print(f"Error: {exc}", file=sys.stderr)
        sys.exit(1)


if __name__ == "__main__":
    main()
