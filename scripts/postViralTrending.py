#!/usr/bin/env python3
"""Post a viral trending topic tweet for ZTVLIVE."""

import os
import sys
from requests_oauthlib import OAuth1Session

API_KEY = os.environ.get("TWITTER_API_KEY", "")
API_SECRET = os.environ.get("TWITTER_API_SECRET", "")
ACCESS_TOKEN = os.environ.get("TWITTER_ACCESS_TOKEN", "")
ACCESS_SECRET = os.environ.get("TWITTER_ACCESS_SECRET", "")

if not all([API_KEY, API_SECRET, ACCESS_TOKEN, ACCESS_SECRET]):
    print("ERROR: Missing Twitter credentials")
    sys.exit(1)

# BET Awards 2026 is THIS SUNDAY — hottest trending topic right now
tweet_text = """🔥 The 2026 #BETAwards are THIS SUNDAY, June 28 at 8/7c!

Druski is hosting. Cardi B, Jamie Foxx, John Legend & Martin Lawrence confirmed.

Culture's biggest night is almost here 👑

Who are you rooting for? Drop your predictions below 👇

Stream original Black culture content 24/7 on ZTVLIVE → ztvlivestream.com

#BETAwards2026 #ZTVLIVE #BlackExcellence #BlackEntertainment #Druski"""

oauth = OAuth1Session(API_KEY, API_SECRET, ACCESS_TOKEN, ACCESS_SECRET)
response = oauth.post(
    "https://api.twitter.com/2/tweets",
    json={"text": tweet_text}
)

if response.status_code == 201:
    data = response.json()
    tweet_id = data.get("data", {}).get("id", "unknown")
    print(f"SUCCESS: Tweet posted! ID: {tweet_id}")
    print(f"View at: https://x.com/ZTVLIVESTREAM/status/{tweet_id}")
else:
    print(f"ERROR {response.status_code}: {response.text}")
    sys.exit(1)
