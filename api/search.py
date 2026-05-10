import  yt_dlp
from    api     import QUERY_POSTFIX, YTDLP_SEARCH_OPTS
from    api     import clean_title, format_duration

def search(query: str, limit: int) -> list[dict]:
    if not query:
        return []
    
    query = f"ytsearch{limit}:{query}{QUERY_POSTFIX}"
    with yt_dlp.YoutubeDL(YTDLP_SEARCH_OPTS) as ydl:
        info = ydl.extract_info(query, download=False)

        if not info or "entries" not in info:
            return []
        
        results = []

        for entry in info['entries']:
            if not entry: continue

            results.append({
                'id':       entry.get('id'),
                'title':    clean_title(entry.get('title', '')),
                'channel':  entry.get("channel") or entry.get("uploader"),
                'thumb':    f"https://i.ytimg.com/vi/{entry.get('id')}/hqdefault.jpg",
                'duration': format_duration(entry.get('duration'))
            })

        return results