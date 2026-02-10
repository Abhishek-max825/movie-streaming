import requests

url = "https://cdn.gigabytes.live/Kantara-Chapter.1.2025.720p.HEVC.WEB-DL.Hindi.Line-Kannada.ESub.x265-HDHub4u.Ms.mkv"

configs = [
    {"name": "No Headers", "headers": {}},
    {"name": "Referer: hdhub4u.guide/", "headers": {"Referer": "https://hdhub4u.guide/"}},
    {"name": "Referer: hdhub4u.guide", "headers": {"Referer": "https://hdhub4u.guide"}},
    {"name": "UA Only", "headers": {"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36"}},
    {"name": "UA + Referer", "headers": {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
        "Referer": "https://hdhub4u.guide/"
    }},
    {"name": "UA + Referer (no slash)", "headers": {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
        "Referer": "https://hdhub4u.guide"
    }},
]

with open("probe_results.txt", "w") as f:
    f.write(f"Probing {url}...\n\n")
    for config in configs:
        try:
            res = requests.head(url, headers=config["headers"], timeout=5)
            f.write(f"[{config['name']}] Status: {res.status_code} {res.reason}\n")
            if res.status_code == 200:
                f.write("  SUCCESS!\n")
        except Exception as e:
            f.write(f"[{config['name']}] Error: {e}\n")
