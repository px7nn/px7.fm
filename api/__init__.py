SEARCH_LIMIT = 10
QUERY_POSTFIX = " song"

YTDLP_BASE_OPTS = {
    "quiet":            True,
    "no_warnings":      True,
    "noplaylist":       True,
    "skip_download":    True,
    "socket_timeout":   5,
    "format":           "bestaudio/best",
}

# For extracting metadata only (fast)

YTDLP_SEARCH_OPTS = {
    **YTDLP_BASE_OPTS,
    "extract_flat":             True,
    "force_generic_extractor":  False,
}

# For getting stream URL
YTDLP_STREAM_OPTS = {
    **YTDLP_BASE_OPTS,
}

def clean_title(title):
    import re
    title = re.sub(r'\((?:official|lyrics?|audio|video|mv|hd|4k|music video|visualizer)[^)]*\)', '', title, flags=re.IGNORECASE)
    title = re.sub(r'\[(?:official|lyrics?|audio|video|mv|hd|4k|music video|visualizer)[^\]]*\]', '', title, flags=re.IGNORECASE)
    return title.strip()

def format_duration(seconds: int | float | None) -> str:
    if not seconds:
        return "?:??"
    
    seconds = int(seconds)

    minutes = seconds // 60
    secs = seconds % 60

    return f"{minutes}:{secs:02d}"

from .trending  import trending
from .search    import search
from .stream    import stream