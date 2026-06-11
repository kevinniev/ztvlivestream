// Get API keys from running server env (already injected)
const HEYGEN_KEY = process.env.HEYGEN_API_KEY;
const ZOE_LOOK_ID = "15b69dc9e9bd487baa0b1c3e22692724";
const ZOE_BACKGROUND = "https://files.manuscdn.com/user_upload_by_module/session_file/310519663672855435/uXXFxkEtmpvafnjs.png";
const VOICE_ZOE = "16a09e4706f74997ba4ed05ea11470f6";

const script = `Hey, hey, hey — welcome back to The Rundown with Zoe, your weekly dose of what's really happening in Black culture, sports, and community. I'm Zoe, and today is June 10th, 2026. Let's get into it.

First up — the San Antonio Spurs are GOING to the NBA Finals! After years of rebuilding, the Spurs have punched their ticket to the championship. San Antonio is electric right now, and the whole city is showing out. This is a moment for the culture — we love to see it. Keep your eyes on the Spurs, because they are not playing games this season.

Next — if you're in the Phoenix metro area, mark your calendars. Downtown Tempe is throwing a massive Juneteenth Block Party, and it is going to be everything. Local artists, community vendors, food, music — this is the kind of event that reminds us why community matters. Juneteenth is not just a holiday, it's a celebration of freedom, resilience, and Black excellence. If you can make it out, please do. Support your community.

That's your rundown for today. I'm Zoe — like, comment, subscribe, and share this with somebody who needs to stay informed. Catch you next time on ZTVLIVE.`;

const title = "The Rundown w/ Zoe | Spurs NBA Finals & Juneteenth Tempe | June 10, 2026";

const prompt = `Create a professional broadcast video for ZTVLIVE — a premium Black entertainment streaming platform.

Avatar: Use avatar look ID ${ZOE_LOOK_ID}
Voice ID: ${VOICE_ZOE}
Background: Use this ZTVLIVE branded set image as the background: ${ZOE_BACKGROUND}
Orientation: landscape (1280x720)

Script (spoken word only):
${script}

Production style:
- Premium broadcast TV quality — smooth, steady camera movements
- Full-body avatar visible (not just talking head or face crop)
- Natural, expressive gestures and body language
- ZTVLIVE lower-third text overlay at the bottom
- Cinematic lighting on the set
- Energy: confident, warm, culturally fluent Black entertainment host
- Do NOT use the word "AI" anywhere in the video

Title: ${title}`;

if (!HEYGEN_KEY) { console.error("No HEYGEN_API_KEY in env"); process.exit(1); }

console.log("Submitting to HeyGen Video Agent...");
const response = await fetch("https://api.heygen.com/v3/video-agents", {
  method: "POST",
  headers: { "X-Api-Key": HEYGEN_KEY, "Content-Type": "application/json" },
  body: JSON.stringify({ prompt, mode: "generate", avatarId: ZOE_LOOK_ID, orientation: "landscape" }),
});

const text = await response.text();
console.log("Status:", response.status);
console.log("Response:", text);
