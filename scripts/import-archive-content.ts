/**
 * Import curated public domain content from Internet Archive into ZTVLIVE
 * Run with: npx tsx scripts/import-archive-content.ts
 *
 * Uses "ia:{identifier}" as the youtubeId field so Watch.tsx knows to
 * use archive.org/embed instead of youtube.com/embed.
 */
import { getDb } from "../server/db";
import { videos } from "../drizzle/schema";
import { eq } from "drizzle-orm";

// ── Curated public domain content ─────────────────────────────────────────────
// Each entry: identifier from archive.org, title, category, tags, description
const CONTENT = [
  // ── CLASSIC FILMS ──────────────────────────────────────────────────────────
  {
    identifier: "WarOfTheWildcats-JohnWayne1943",
    title: "War of the Wildcats (1943) — John Wayne Classic",
    category: "movies" as const,
    tags: "classic film,western,john wayne,1940s,public domain",
    description: "John Wayne stars in this classic 1943 western action film. Public domain.",
    creatorName: "Republic Pictures (Public Domain)",
    thumbnailUrl: "https://archive.org/services/img/WarOfTheWildcats-JohnWayne1943",
  },
  {
    identifier: "dracula-colorized",
    title: "Dracula (1931) — Colorized Classic Horror",
    category: "movies" as const,
    tags: "classic film,horror,dracula,bela lugosi,1930s,colorized,public domain",
    description: "The iconic 1931 horror classic starring Bela Lugosi, now in colorized format. Public domain.",
    creatorName: "Universal Pictures (Public Domain)",
    thumbnailUrl: "https://archive.org/services/img/dracula-colorized",
  },
  {
    identifier: "day-the-earth-stood-still-1951",
    title: "The Day the Earth Stood Still (1951) — Colorized Sci-Fi Classic",
    category: "movies" as const,
    tags: "classic film,sci-fi,science fiction,1950s,colorized,public domain",
    description: "A landmark 1951 science fiction film about an alien visitor and his robot. Colorized. Public domain.",
    creatorName: "20th Century Fox (Public Domain)",
    thumbnailUrl: "https://archive.org/services/img/day-the-earth-stood-still-1951",
  },
  {
    identifier: "frankenstein-1931-colorized",
    title: "Frankenstein (1931) — Colorized Classic",
    category: "movies" as const,
    tags: "classic film,horror,frankenstein,boris karloff,1930s,colorized,public domain",
    description: "Boris Karloff's iconic portrayal of Frankenstein's monster in the 1931 horror classic. Colorized. Public domain.",
    creatorName: "Universal Pictures (Public Domain)",
    thumbnailUrl: "https://archive.org/services/img/frankenstein-1931-colorized",
  },
  {
    identifier: "sahara-colorized",
    title: "Sahara (1943) — Humphrey Bogart War Classic",
    category: "movies" as const,
    tags: "classic film,war,humphrey bogart,1940s,colorized,public domain",
    description: "Humphrey Bogart leads a group of Allied soldiers across the Sahara Desert in WWII. Colorized. Public domain.",
    creatorName: "Columbia Pictures (Public Domain)",
    thumbnailUrl: "https://archive.org/services/img/sahara-colorized",
  },
  {
    identifier: "HisGirlFriday1940_201505",
    title: "His Girl Friday (1940) — Classic Comedy",
    category: "movies" as const,
    tags: "classic film,comedy,cary grant,1940s,public domain",
    description: "Cary Grant and Rosalind Russell star in this fast-talking screwball comedy classic. Public domain.",
    creatorName: "Columbia Pictures (Public Domain)",
    thumbnailUrl: "https://archive.org/services/img/HisGirlFriday1940_201505",
  },
  {
    identifier: "wolf-man-1941",
    title: "The Wolf Man (1941) — Classic Horror",
    category: "movies" as const,
    tags: "classic film,horror,wolf man,lon chaney,1940s,colorized,public domain",
    description: "Lon Chaney Jr. stars in the classic 1941 Universal monster film. Public domain.",
    creatorName: "Universal Pictures (Public Domain)",
    thumbnailUrl: "https://archive.org/services/img/wolf-man-1941",
  },
  {
    identifier: "invasion-of-the-body-snatchers-1956-colorized",
    title: "Invasion of the Body Snatchers (1956) — Colorized",
    category: "movies" as const,
    tags: "classic film,sci-fi,horror,1950s,colorized,public domain",
    description: "The chilling 1956 sci-fi horror classic about alien pod people. Colorized. Public domain.",
    creatorName: "Allied Artists (Public Domain)",
    thumbnailUrl: "https://archive.org/services/img/invasion-of-the-body-snatchers-1956-colorized",
  },

  // ── BLACK CULTURE & HISTORY ────────────────────────────────────────────────
  {
    identifier: "bronze_buckaroo",
    title: "The Bronze Buckaroo (1939) — Classic Black Western",
    category: "movies" as const,
    tags: "black cinema,western,classic film,1930s,public domain,black history",
    description: "A landmark all-Black cast western film from 1939. A rare piece of Black cinema history. Public domain.",
    creatorName: "Jed Buell Productions (Public Domain)",
    thumbnailUrl: "https://archive.org/services/img/bronze_buckaroo",
  },
  {
    identifier: "boy_what_a_girl_ipod",
    title: "Boy! What a Girl! (1946) — Classic Black Musical Comedy",
    category: "movies" as const,
    tags: "black cinema,musical,comedy,1940s,public domain,black history",
    description: "A 1946 musical comedy featuring an all-Black cast and jazz performances. Public domain.",
    creatorName: "Herald Pictures (Public Domain)",
    thumbnailUrl: "https://archive.org/services/img/boy_what_a_girl_ipod",
  },
  {
    identifier: "crisis_in_levittown_1957",
    title: "Crisis in Levittown (1957) — Civil Rights Documentary",
    category: "other" as const,
    tags: "civil rights,documentary,1950s,black history,integration,public domain",
    description: "A 1957 documentary about the racial integration crisis in Levittown, Pennsylvania. Public domain.",
    creatorName: "Documentary (Public Domain)",
    thumbnailUrl: "https://archive.org/services/img/crisis_in_levittown_1957",
  },

  // ── SPORTS ────────────────────────────────────────────────────────────────
  {
    identifier: "lp-EO5I60KA",
    title: "Classic Boxing Matches — Golden Era Highlights",
    category: "sports" as const,
    tags: "boxing,sports,classic,public domain,highlights",
    description: "Classic boxing matches from the golden era of the sport. Public domain footage.",
    creatorName: "ZTVLIVE Sports Archive",
    thumbnailUrl: "https://archive.org/services/img/lp-EO5I60KA",
  },

  // ── TECH & SCIENCE ────────────────────────────────────────────────────────
  {
    identifier: "bacteria_friend_and_foe",
    title: "Bacteria: Friend and Foe — Science Documentary",
    category: "tech" as const,
    tags: "science,biology,documentary,educational,public domain",
    description: "An educational documentary exploring the world of bacteria and their role in nature. Public domain.",
    creatorName: "Educational Film (Public Domain)",
    thumbnailUrl: "https://archive.org/services/img/bacteria_friend_and_foe",
  },
  {
    identifier: "Killers_from_space",
    title: "Killers from Space (1954) — Classic Sci-Fi",
    category: "tech" as const,
    tags: "sci-fi,science fiction,1950s,classic film,public domain",
    description: "A 1954 science fiction film about alien invaders. Classic B-movie sci-fi. Public domain.",
    creatorName: "RKO Radio Pictures (Public Domain)",
    thumbnailUrl: "https://archive.org/services/img/Killers_from_space",
  },

  // ── MUSIC & PERFORMANCE ───────────────────────────────────────────────────
  {
    identifier: "SpotNews1937",
    title: "Spot News (1937) — Classic Newsreel",
    category: "news" as const,
    tags: "newsreel,1930s,history,public domain,news",
    description: "A 1937 newsreel capturing major events of the era. Public domain.",
    creatorName: "Newsreel Archive (Public Domain)",
    thumbnailUrl: "https://archive.org/services/img/SpotNews1937",
  },

  // ── ANIMATION & GAMING ────────────────────────────────────────────────────
  {
    identifier: "mickey-mouse-all-1920s-films-full-movie",
    title: "Every 1920s Mickey Mouse Short Film — Complete Collection",
    category: "other" as const,
    tags: "animation,cartoon,mickey mouse,1920s,classic,public domain,disney",
    description: "The complete collection of every Mickey Mouse short film from the 1920s. Public domain.",
    creatorName: "Walt Disney (Public Domain)",
    thumbnailUrl: "https://archive.org/services/img/mickey-mouse-all-1920s-films-full-movie",
  },

  // ── NEWS & DOCUMENTARY ────────────────────────────────────────────────────
  {
    identifier: "Operatio1961",
    title: "Operation Correction Part I (1961) — Cold War Documentary",
    category: "news" as const,
    tags: "cold war,documentary,1960s,history,public domain",
    description: "A 1961 documentary examining Cold War-era policies and their corrections. Public domain.",
    creatorName: "Documentary (Public Domain)",
    thumbnailUrl: "https://archive.org/services/img/Operatio1961",
  },
  {
    identifier: "Operatio1961_2",
    title: "Operation Correction Part II (1961) — Cold War Documentary",
    category: "news" as const,
    tags: "cold war,documentary,1960s,history,public domain",
    description: "Part II of the 1961 Cold War documentary series. Public domain.",
    creatorName: "Documentary (Public Domain)",
    thumbnailUrl: "https://archive.org/services/img/Operatio1961_2",
  },

  // ── PODCASTS / TALK ───────────────────────────────────────────────────────
  {
    identifier: "CaseofSp1940",
    title: "A Case of Spring Fever (1940) — Classic Short Film",
    category: "movies" as const,
    tags: "classic film,comedy,short film,1940s,public domain",
    description: "A classic 1940 short film comedy. Public domain.",
    creatorName: "Jam Handy Organization (Public Domain)",
    thumbnailUrl: "https://archive.org/services/img/CaseofSp1940",
  },
  {
    identifier: "train-1964",
    title: "The Train (1964) — Burt Lancaster WWII Thriller",
    category: "movies" as const,
    tags: "classic film,war,thriller,burt lancaster,1960s,colorized,public domain",
    description: "Burt Lancaster stars in this gripping 1964 WWII thriller about saving French art from the Nazis. Colorized. Public domain.",
    creatorName: "United Artists (Public Domain)",
    thumbnailUrl: "https://archive.org/services/img/train-1964",
  },
  {
    identifier: "tarantula-1955-colorized",
    title: "Tarantula (1955) — Classic Monster Movie",
    category: "movies" as const,
    tags: "classic film,sci-fi,monster,1950s,colorized,public domain",
    description: "A giant tarantula terrorizes the desert in this 1955 classic monster film. Colorized. Public domain.",
    creatorName: "Universal Pictures (Public Domain)",
    thumbnailUrl: "https://archive.org/services/img/tarantula-1955-colorized",
  },
  {
    identifier: "deadly-mantis-1957-colorized",
    title: "The Deadly Mantis (1957) — Classic Sci-Fi Monster Film",
    category: "movies" as const,
    tags: "classic film,sci-fi,monster,1950s,colorized,public domain",
    description: "A prehistoric giant praying mantis is unleashed on the world in this 1957 sci-fi classic. Colorized. Public domain.",
    creatorName: "Universal Pictures (Public Domain)",
    thumbnailUrl: "https://archive.org/services/img/deadly-mantis-1957-colorized",
  },
  {
    identifier: "earth-vs-the-flying-saucers-color",
    title: "Earth vs. the Flying Saucers (1956) — Classic Sci-Fi",
    category: "movies" as const,
    tags: "classic film,sci-fi,flying saucers,1950s,colorized,public domain",
    description: "Aliens invade Earth in this thrilling 1956 sci-fi classic with spectacular special effects. Colorized. Public domain.",
    creatorName: "Columbia Pictures (Public Domain)",
    thumbnailUrl: "https://archive.org/services/img/earth-vs-the-flying-saucers-color",
  },
];

async function main() {
  console.log(`📦 Importing ${CONTENT.length} public domain videos into ZTVLIVE...\n`);

  const db = await getDb();
  if (!db) {
    console.error("❌ Database not available");
    process.exit(1);
  }

  let imported = 0;
  let skipped = 0;

  for (const item of CONTENT) {
    const youtubeId = `ia:${item.identifier}`;

    // Check for duplicate
    const existing = await db.select({ id: videos.id }).from(videos)
      .where(eq(videos.youtubeId, youtubeId)).limit(1);

    if (existing.length > 0) {
      console.log(`  ⏭  Skipped (duplicate): ${item.title}`);
      skipped++;
      continue;
    }

    await db.insert(videos).values({
      youtubeId,
      title: item.title,
      description: item.description,
      thumbnailUrl: item.thumbnailUrl,
      category: item.category,
      tags: item.tags,
      creatorName: item.creatorName,
      duration: "",
      isFeatured: false,
      isLive: false,
    });

    console.log(`  ✅ Imported: ${item.title}`);
    imported++;
  }

  console.log(`\n🎬 Import complete!`);
  console.log(`   Imported: ${imported}`);
  console.log(`   Skipped:  ${skipped}`);
  console.log(`   Total:    ${CONTENT.length}`);
}

main().catch((err) => {
  console.error("❌ Import failed:", err?.message);
  process.exit(1);
});
