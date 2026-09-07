from http.server import BaseHTTPRequestHandler
from pathlib import Path
from urllib.parse import parse_qs, urlparse
import json
import mimetypes
import shutil
import tempfile

import yt_dlp


class handler(BaseHTTPRequestHandler):
    def send_json(self, status, payload):
        body = json.dumps(payload).encode()
        self.send_response(status)
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def do_GET(self):
        url = parse_qs(urlparse(self.path).query).get("url", [""])[0]
        if not url.startswith(("http://", "https://")):
            self.send_json(400, {"error": "Enter a valid http(s) URL."})
            return

        temporary = Path(tempfile.mkdtemp(prefix="instasnap-"))
        try:
            options = {
                "outtmpl": str(temporary / "%(title).80s.%(ext)s"),
                "format": "best[ext=mp4]/best",
                "noplaylist": True,
                "quiet": True,
                "no_warnings": True,
                "restrictfilenames": True,
            }
            with yt_dlp.YoutubeDL(options) as downloader:
                info = downloader.extract_info(url, download=True)
                downloaded = Path(downloader.prepare_filename(info))
                if not downloaded.exists():
                    candidates = list(temporary.iterdir())
                    if not candidates:
                        raise FileNotFoundError("No media file was produced")
                    downloaded = candidates[0]

            data = downloaded.read_bytes()
            filename = downloaded.name
            self.send_response(200)
            self.send_header("Content-Type", mimetypes.guess_type(filename)[0] or "application/octet-stream")
            self.send_header("Content-Disposition", f'attachment; filename="{filename}"')
            self.send_header("Content-Length", str(len(data)))
            self.end_headers()
            self.wfile.write(data)
        except Exception as error:
            self.send_json(422, {
                "error": "Instagram could not provide this media. It may be private, login-protected, or unavailable.",
                "detail": str(error)[:180],
            })
        finally:
            shutil.rmtree(temporary, ignore_errors=True)
