from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import parse_qs, urlparse
import mimetypes
import os
import shutil
import tempfile
import json

import yt_dlp

ROOT = Path(__file__).parent.resolve()
DOWNLOADS = ROOT / ".downloads"
DOWNLOADS.mkdir(exist_ok=True)


class Handler(BaseHTTPRequestHandler):
    def send_json(self, status, payload):
        body = json.dumps(payload).encode()
        self.send_response(status)
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def do_GET(self):
        parsed = urlparse(self.path)
        if parsed.path == "/api/download":
            self.download(parse_qs(parsed.query).get("url", [""])[0])
            return

        requested = (ROOT / parsed.path.lstrip("/")).resolve()
        if requested == ROOT / "":
            requested = ROOT / "index.html"
        if ROOT not in requested.parents and requested != ROOT:
            self.send_error(403)
            return
        if not requested.is_file():
            self.send_error(404)
            return
        content = requested.read_bytes()
        self.send_response(200)
        self.send_header("Content-Type", mimetypes.guess_type(str(requested))[0] or "application/octet-stream")
        self.send_header("Content-Length", str(len(content)))
        self.end_headers()
        self.wfile.write(content)

    def download(self, url):
        if not url.startswith(("http://", "https://")):
            self.send_json(400, {"error": "Enter a valid http(s) URL."})
            return
        temporary = Path(tempfile.mkdtemp(prefix="instasnap-", dir=DOWNLOADS))
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

            filename = downloaded.name
            target = DOWNLOADS / filename
            shutil.move(str(downloaded), str(target))
            self.send_file(target, filename)
        except Exception as error:
            self.send_json(422, {"error": "Instagram could not provide this media. It may be private, login-protected, or unavailable.", "detail": str(error)[:180]})
        finally:
            shutil.rmtree(temporary, ignore_errors=True)

    def send_file(self, path, filename):
        size = path.stat().st_size
        self.send_response(200)
        self.send_header("Content-Type", mimetypes.guess_type(filename)[0] or "application/octet-stream")
        self.send_header("Content-Disposition", f'attachment; filename="{filename}"')
        self.send_header("Content-Length", str(size))
        self.end_headers()
        with path.open("rb") as stream:
            shutil.copyfileobj(stream, self.wfile)
        try:
            path.unlink()
        except OSError:
            pass


if __name__ == "__main__":
    port = int(os.environ.get("PORT", "5173"))
    print(f"Instasnap running at http://localhost:{port}")
    ThreadingHTTPServer(("0.0.0.0", port), Handler).serve_forever()
