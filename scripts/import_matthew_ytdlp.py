#!/usr/bin/env python3
"""
Import all Good Tech Cheap YouTube videos into ZTVLIVE
using yt-dlp (no API key needed).
Creator: Matthew Brown (userId 180001)
"""
import subprocess
import json
import os
import sys
import mysql.connector
from datetime import datetime

CHANNEL_URL = "https://www.youtube.com/@GoodTechCheap/videos"
CREATOR_ID = 180001
CREATOR_NAME = "Matthew Brown"

def categorize(title: str, description: str) -> str:
    text = (title + " " + description).lower()
    gaming_kw = ["gaming", "game", "battlefield", "diablo", "gameplay", "multiplayer",
                 "xbox", "playstation", "ps5", "nintendo", "steam", "fortnite", "warzone",
                 "esports", "fps", "rpg", "mmo", "shooter"]
    tech_kw = ["unboxing", "tech", "gadget", "review", "camera", "monitor", "laptop",
               "phone", "smart", "charger", "battery", "drone", "robot", "vacuum",
               "speaker", "headphone", "earbuds", "keyboard", "mouse", "printer",
               "security", "doorbell", "air purifier", "dehumidifier", "conditioner"]
    if any(k in text for k in gaming_kw):
        return "gaming"
    if any(k in text for k in tech_kw):
        return "tech"
    return "tech"  # Default for Good Tech Cheap

def parse_duration(seconds) -> str:
    """Convert seconds to ISO 8601 duration string."""
    if not seconds:
        return ""
    try:
        s = int(seconds)
        h, rem = divmod(s, 3600)
        m, sec = divmod(rem, 60)
        if h:
            return f"PT{h}H{m}M{sec}S"
        elif m:
            return f"PT{m}M{sec}S"
        else:
            return f"PT{sec}S"
    except:
        return ""

def fetch_all_videos():
    """Use yt-dlp to fetch all video metadata from the channel."""
    print(f"Fetching all videos from {CHANNEL_URL}...")
    print("This may take a minute for 475 videos...")
    
    cmd = [
        "yt-dlp",
        "--flat-playlist",
        "--dump-json",
        "--no-warnings",
        "--quiet",
        CHANNEL_URL
    ]
    
    result = subprocess.run(cmd, capture_output=True, text=True, timeout=300)
    
    videos = []
    for line in result.stdout.strip().split('\n'):
        if not line.strip():
            continue
        try:
            data = json.loads(line)
            vid_id = data.get('id', '')
            if not vid_id:
                continue
            
            title = data.get('title', '') or f'Video {vid_id}'
            description = data.get('description', '') or ''
            thumbnail = data.get('thumbnail', '') or f'https://img.youtube.com/vi/{vid_id}/mqdefault.jpg'
            published = data.get('upload_date', '')
            duration = data.get('duration')
            view_count = data.get('view_count') or 0
            like_count = data.get('like_count') or 0
            
            # Convert upload_date (YYYYMMDD) to datetime
            pub_dt = None
            if published and len(published) == 8:
                try:
                    pub_dt = datetime.strptime(published, '%Y%m%d')
                except:
                    pub_dt = datetime.now()
            else:
                pub_dt = datetime.now()
            
            videos.append({
                'youtubeId': vid_id,
                'title': title[:255],
                'description': description[:65535],
                'thumbnailUrl': thumbnail,
                'category': categorize(title, description),
                'duration': parse_duration(duration),
                'viewCount': int(view_count),
                'likeCount': int(like_count),
                'publishedAt': pub_dt,
            })
        except json.JSONDecodeError:
            continue
        except Exception as e:
            print(f"  Warning: {e}")
            continue
    
    print(f"✓ Found {len(videos)} videos")
    return videos

def main():
    print("=== Good Tech Cheap Video Import (yt-dlp) ===")
    print(f"Creator: {CREATOR_NAME} (id: {CREATOR_ID})")
    
    # Fetch all videos
    videos = fetch_all_videos()
    if not videos:
        print("ERROR: No videos fetched. Exiting.")
        sys.exit(1)
    
    # Connect to database
    db_url = os.environ.get('DATABASE_URL', '')
    if not db_url:
        print("ERROR: DATABASE_URL not set")
        sys.exit(1)
    
    # Parse mysql://user:pass@host:port/dbname?ssl=...
    import re
    from urllib.parse import urlparse, unquote
    parsed = urlparse(db_url)
    user = parsed.username
    password = unquote(parsed.password or '')
    host = parsed.hostname
    port = parsed.port or 3306
    database = parsed.path.lstrip('/')
    # Strip any query params from database name
    database = database.split('?')[0]
    
    conn = mysql.connector.connect(
        host=host,
        port=int(port),
        user=user,
        password=password,
        database=database,
        ssl_disabled=False,
        ssl_verify_cert=False,
    )
    cursor = conn.cursor()
    
    # Get existing YouTube IDs for Matthew to avoid duplicates
    cursor.execute("SELECT youtubeId FROM videos WHERE creatorId = %s", (CREATOR_ID,))
    existing_ids = set(row[0] for row in cursor.fetchall())
    print(f"Existing videos for Matthew: {len(existing_ids)}")
    
    # Filter new videos
    new_videos = [v for v in videos if v['youtubeId'] not in existing_ids]
    print(f"New videos to import: {len(new_videos)}")
    
    if not new_videos:
        print("All videos already imported!")
        cursor.close()
        conn.close()
        return
    
    # Insert in batches
    imported = 0
    errors = 0
    
    insert_sql = """
        INSERT INTO videos 
        (youtubeId, title, description, thumbnailUrl, category, viewCount, likeCount, 
         duration, creatorName, creatorId, isFeatured, isLive, status, publishedAt)
        VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, FALSE, FALSE, 'approved', %s)
    """
    
    for i, video in enumerate(new_videos):
        try:
            cursor.execute(insert_sql, (
                video['youtubeId'],
                video['title'],
                video['description'],
                video['thumbnailUrl'],
                video['category'],
                video['viewCount'],
                video['likeCount'],
                video['duration'],
                CREATOR_NAME,
                CREATOR_ID,
                video['publishedAt'],
            ))
            imported += 1
            if imported % 50 == 0:
                conn.commit()
                print(f"  Progress: {imported}/{len(new_videos)} imported...")
        except mysql.connector.IntegrityError:
            pass  # Duplicate, skip silently
        except Exception as e:
            print(f"  Error on {video['youtubeId']}: {e}")
            errors += 1
    
    conn.commit()
    cursor.close()
    conn.close()
    
    print(f"\n=== Import Complete ===")
    print(f"✓ Imported: {imported} new videos")
    print(f"✗ Errors: {errors}")
    print(f"Total Matthew videos now: {len(existing_ids) + imported}")

if __name__ == '__main__':
    main()
