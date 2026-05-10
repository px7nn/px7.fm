import  yt_dlp
from    api     import YTDLP_STREAM_OPTS

def stream(id: str) -> str:
    url = f"https://www.youtube.com/watch?v={id}"
    with yt_dlp.YoutubeDL(YTDLP_STREAM_OPTS) as ydl:
        info = ydl.extract_info(url, download=False)
        if not info:
            return None
        return info.get("url")
