import random
import yt_dlp

from api import (
    YTDLP_SEARCH_OPTS,
    clean_title,
    format_duration
)

QUERY = [
    "radiohead okcomputer",
    "Joji Nectar",
    "the weeknd My dear Melancholy"
]

MAX_DURATION = 240


def trending(limit: int = 5) -> list[dict]:
    q = random.choice(QUERY)+" song"

    query = f"ytsearch20:{q} official music video"

    with yt_dlp.YoutubeDL(YTDLP_SEARCH_OPTS) as ydl:
        info = ydl.extract_info(query, download=False)

        if not info or "entries" not in info:
            return []

        results = []
        seen = set()

        for entry in info["entries"]:
            if not entry:
                continue

            video_id = entry.get("id")

            if not video_id or video_id in seen:
                continue

            duration = entry.get("duration")

            if not duration or duration > MAX_DURATION:
                continue


            seen.add(video_id)

            results.append({
                "id": video_id,
                "title": clean_title(entry.get("title", "")),
                "channel": entry.get("channel") or entry.get("uploader"),
                "thumb": f"https://i.ytimg.com/vi/{video_id}/hqdefault.jpg",
                "duration": format_duration(duration),
            })

            if len(results) >= limit:
                break

        return results