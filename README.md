# IGSaver

Download public Instagram reels in HD. Paste a reel link and save the video to your phone or computer, with no login, no app and no watermark.

**Live site:** https://instasnap-1nw4.onrender.com/

## Features

- Paste a reel link and press **Download**. A preview card with the playable video appears once it has been fetched.
- **Desktop:** the video downloads to your normal Downloads folder.
- **Mobile:** the phone's share sheet opens, so the video can be saved straight to Photos/Gallery ("Save Video" on iPhone). This needs the site to be served over https.
- Works with public reels only. Private accounts are not supported.

## Running locally

Requires Python 3.10+.

```
pip install -r requirements.txt
python server.py
```

Then open http://localhost:5173. Press `Ctrl + C` in the terminal to stop the server.

Opening `index.html` directly won't work: the page needs `server.py` running to fetch videos.

## Deployment

The site is deployed on [Render](https://render.com) at https://instasnap-1nw4.onrender.com/ as a Python web service, configured in [`render.yaml`](render.yaml):

- **Build:** `pip install -r requirements.txt`
- **Start:** `python server.py`
- **Port:** taken from the `PORT` environment variable that Render sets

To deploy, create a new Blueprint on Render from this repository. Render picks up `render.yaml` automatically and redeploys on every push to `main`.

## Project structure

| File | Purpose |
| --- | --- |
| `index.html` | Page layout and content |
| `style.css` | Styles |
| `script.js` | Fetching, preview, and saving logic |
| `server.py` | Serves the site and the `/api/download` endpoint, which uses [yt-dlp](https://github.com/yt-dlp/yt-dlp) to fetch the reel |
| `assets/` | Logo |
| `render.yaml` | Render deployment config |

## Disclaimer

IGSaver is not affiliated with Instagram or Meta. Only download content you have the right to use.
