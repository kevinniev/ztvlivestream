#!/usr/bin/env python3
"""Post a tweet to @ZTVLIVESTREAM using OAuth 1.0a"""
import os
import sys
import json
import requests
from requests_oauthlib import OAuth1Session

def post_tweet(text: str) -> dict:
    api_key = os.environ["TWITTER_API_KEY"]
    api_secret = os.environ["TWITTER_API_SECRET"]
    access_token = os.environ["TWITTER_ACCESS_TOKEN"]
    access_secret = os.environ["TWITTER_ACCESS_SECRET"]

    oauth = OAuth1Session(
        api_key,
        client_secret=api_secret,
        resource_owner_key=access_token,
        resource_owner_secret=access_secret,
    )

    payload = {"text": text}
    r = oauth.post("https://api.twitter.com/2/tweets", json=payload)
    r.raise_for_status()
    return r.json()

if __name__ == "__main__":
    tweet_text = sys.argv[1] if len(sys.argv) > 1 else None
    if not tweet_text:
        print("Usage: python3 postTweet.py 'tweet text here'")
        sys.exit(1)
    result = post_tweet(tweet_text)
    print(json.dumps(result, indent=2))
