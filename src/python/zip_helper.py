import argparse
import json
import sys
import zipfile
import io
import requests

class RemoteFile:
    def __init__(self, url):
        self.url = url
        self.offset = 0
        self._size = self._get_size()

    def _get_size(self):
        response = requests.head(self.url)
        return int(response.headers.get('content-length', 0))

    def size(self):
        return self._size

    def seekable(self):
        return True

    def seek(self, offset, whence=0):
        if whence == 0:
            self.offset = offset
        elif whence == 1:
            self.offset += offset
        elif whence == 2:
            self.offset = self._size + offset
        return self.offset

    def tell(self):
        return self.offset

    def read(self, size=-1):
        if size == -1:
            end = self._size - 1
        else:
            end = self.offset + size - 1

        if end >= self._size:
            end = self._size - 1

        if self.offset > end:
            return b""

        headers = {'Range': f'bytes={self.offset}-{end}'}
        response = requests.get(self.url, headers=headers)
        data = response.content
        self.offset += len(data)
        return data

    def close(self):
        pass

def list_files(url):
    try:
        remote_file = RemoteFile(url)
        with zipfile.ZipFile(remote_file) as zf:
            file_list = zf.namelist()
            # Filter for video files
            video_extensions = ('.mkv', '.mp4', '.avi', '.mov', '.flv', '.wmv')
            video_files = [f for f in file_list if f.lower().endswith(video_extensions)]
            print(json.dumps(video_files))
    except Exception as e:
        print(json.dumps({"error": str(e)}))
        sys.exit(1)

def stream_file(url, filename):
    try:
        remote_file = RemoteFile(url)
        with zipfile.ZipFile(remote_file) as zf:
            with zf.open(filename) as source:
                while True:
                    chunk = source.read(64 * 1024)
                    if not chunk:
                        break
                    sys.stdout.buffer.write(chunk)
                    sys.stdout.buffer.flush()
    except Exception as e:
        print(f"Error streaming file: {e}", file=sys.stderr)
        sys.exit(1)

def main():
    parser = argparse.ArgumentParser(description="Remote ZIP Helper")
    subparsers = parser.add_subparsers(dest="command", required=True)

    list_parser = subparsers.add_parser("list", help="List files in remote ZIP")
    list_parser.add_argument("--url", required=True, help="URL of the remote ZIP")

    stream_parser = subparsers.add_parser("stream", help="Stream a file from remote ZIP")
    stream_parser.add_argument("--url", required=True, help="URL of the remote ZIP")
    stream_parser.add_argument("--file", required=True, help="Filename inside the ZIP to stream")

    args = parser.parse_args()

    if args.command == "list":
        list_files(args.url)
    elif args.command == "stream":
        stream_file(args.url, args.file)

if __name__ == "__main__":
    main()
