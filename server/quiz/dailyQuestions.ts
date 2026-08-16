import type { PrivateSeedQuestion } from "./engine";

/**
 * Twenty questions provide the exact required 40/25/20/15 content mix:
 * 8 culture, 5 CommunityCut, 4 ZTVLIVE, and 3 general questions.
 * Correct answers are server-only and are never serialized to browser clients.
 */
export const QUESTION_BANK: PrivateSeedQuestion[] = [
  {
    category: "culture",
    difficulty: "easy",
    prompt: "Which instrument is traditionally played using 88 keys?",
    options: ["Guitar", "Piano", "Trumpet", "Violin"],
    correctOption: "B",
  },
  {
    category: "culture",
    difficulty: "medium",
    prompt: "What is the primary purpose of a movie or series trailer?",
    options: ["To reveal every plot point", "To promote interest in the full release", "To replace the full episode", "To publish credits only"],
    correctOption: "B",
  },
  {
    category: "culture",
    difficulty: "medium",
    prompt: "Which production role is responsible for the visual look of a filmed scene?",
    options: ["Director of photography", "Catering lead", "Ticket manager", "Publicist"],
    correctOption: "A",
  },
  {
    category: "culture",
    difficulty: "easy",
    prompt: "A concert encore is best described as what?",
    options: ["The opening act", "An additional performance requested after the main set", "A rehearsal only", "A ticket refund"],
    correctOption: "B",
  },
  {
    category: "culture",
    difficulty: "easy",
    prompt: "What does a music playlist curate?",
    options: ["A sequence of songs or videos", "A camera lens", "A studio lease", "A haircut schedule"],
    correctOption: "A",
  },
  {
    category: "culture",
    difficulty: "medium",
    prompt: "Which format is commonly released as a series of recorded conversations or stories?",
    options: ["Podcast", "Invoice", "Storyboard", "Press pass"],
    correctOption: "A",
  },
  {
    category: "culture",
    difficulty: "medium",
    prompt: "What most helps audiences recognize a recurring show from week to week?",
    options: ["A consistent visual and editorial identity", "A different title every episode", "No host introduction", "Removing all descriptions"],
    correctOption: "A",
  },
  {
    category: "culture",
    difficulty: "hard",
    prompt: "What does a documentary primarily explore?",
    options: ["Only fictional worlds", "Real people, issues, or events", "A product catalog", "A silent rehearsal"],
    correctOption: "B",
  },
  {
    category: "communitycut",
    difficulty: "easy",
    prompt: "What is an essential sanitation practice for shared grooming tools?",
    options: ["Store them without cleaning", "Clean and disinfect between clients", "Use the same towel all day", "Skip maintenance"],
    correctOption: "B",
  },
  {
    category: "communitycut",
    difficulty: "medium",
    prompt: "What helps a grooming or beauty professional earn repeat bookings?",
    options: ["Unclear availability", "Reliable service and easy rebooking", "No booking confirmation", "Avoiding follow-up"],
    correctOption: "B",
  },
  {
    category: "communitycut",
    difficulty: "medium",
    prompt: "What should a beauty professional include in a strong visual portfolio?",
    options: ["Only blank images", "Clear examples of finished work", "Unrelated stock photos", "No client-service details"],
    correctOption: "B",
  },
  {
    category: "communitycut",
    difficulty: "hard",
    prompt: "What is the best first step before starting a personalized grooming service?",
    options: ["Skip the client conversation", "Confirm the client’s goals in a consultation", "Use the same plan for everyone", "Avoid discussing maintenance"],
    correctOption: "B",
  },
  {
    category: "communitycut",
    difficulty: "medium",
    prompt: "Before turning a chair into a content studio, what should a creator plan?",
    options: ["A simple shot list and consent process", "No lighting or camera angle", "Only a new business card", "A random soundtrack"],
    correctOption: "A",
  },
  {
    category: "ztvlive",
    difficulty: "easy",
    prompt: "What revenue share does ZTVLIVE promote for creators from day one?",
    options: ["30%", "50%", "70%", "100%"],
    correctOption: "C",
  },
  {
    category: "ztvlive",
    difficulty: "easy",
    prompt: "Which ZTVLIVE area is designed to help viewers find available shows and episodes?",
    options: ["The library", "The parking lot", "The invoice desk", "The microphone cabinet"],
    correctOption: "A",
  },
  {
    category: "ztvlive",
    difficulty: "medium",
    prompt: "What is a core reason a creator would use a streaming platform profile?",
    options: ["To make their work harder to find", "To present shows and build an audience", "To hide all episode information", "To remove their own brand"],
    correctOption: "B",
  },
  {
    category: "ztvlive",
    difficulty: "medium",
    prompt: "What does a premium streaming membership commonly add for viewers?",
    options: ["Fewer viewing choices by default", "Exclusive or ad-free viewing benefits", "No access to their account", "A required physical ticket"],
    correctOption: "B",
  },
  {
    category: "general",
    difficulty: "easy",
    prompt: "How many hours are in one day?",
    options: ["12", "18", "24", "36"],
    correctOption: "C",
  },
  {
    category: "general",
    difficulty: "easy",
    prompt: "Which planet is known as the Blue Planet?",
    options: ["Earth", "Mars", "Venus", "Mercury"],
    correctOption: "A",
  },
  {
    category: "general",
    difficulty: "medium",
    prompt: "What is the chemical symbol for oxygen?",
    options: ["Ox", "O", "Og", "On"],
    correctOption: "B",
  },
  {
    category: "culture",
    difficulty: "easy",
    prompt: "Which device is used to capture moving images for a video production?",
    options: ["Camera", "Calculator", "Stapler", "Compass"],
    correctOption: "A",
  },
  {
    category: "culture",
    difficulty: "medium",
    prompt: "What is a screenplay used for?",
    options: ["Planning dialogue and scenes for a production", "Mixing hair color", "Printing concert tickets", "Creating an email list"],
    correctOption: "A",
  },
  {
    category: "culture",
    difficulty: "easy",
    prompt: "What does a curator do for a cultural exhibit or collection?",
    options: ["Selects and organizes work", "Repairs every camera", "Sells only tickets", "Writes weather reports"],
    correctOption: "A",
  },
  {
    category: "culture",
    difficulty: "medium",
    prompt: "What is the name for the first public showing of a new film or series?",
    options: ["Premiere", "Rehearsal", "Receipt", "Retake"],
    correctOption: "A",
  },
  {
    category: "culture",
    difficulty: "medium",
    prompt: "What does an editor commonly do after footage is recorded?",
    options: ["Organizes and shapes the final story", "Changes the venue address", "Writes a haircut menu", "Creates a shipping label"],
    correctOption: "A",
  },
  {
    category: "culture",
    difficulty: "easy",
    prompt: "What does a host typically do in a weekly talk format?",
    options: ["Guides the audience through the conversation", "Repairs stage wiring", "Ships prize packages", "Runs an airport"],
    correctOption: "A",
  },
  {
    category: "culture",
    difficulty: "hard",
    prompt: "What is a call sheet used for on a production?",
    options: ["Sharing the schedule and production details", "Selling streaming plans", "Creating a hairstyle", "Submitting a tax form"],
    correctOption: "A",
  },
  {
    category: "culture",
    difficulty: "medium",
    prompt: "Why is a consistent release schedule helpful for a series?",
    options: ["It helps audiences know when to return", "It prevents anyone from watching", "It removes creator credits", "It guarantees no editing"],
    correctOption: "A",
  },
  {
    category: "communitycut",
    difficulty: "easy",
    prompt: "Why should a client’s consent be confirmed before filming a service?",
    options: ["It respects privacy and sets clear expectations", "It makes the service slower", "It removes the need for lighting", "It replaces booking"],
    correctOption: "A",
  },
  {
    category: "communitycut",
    difficulty: "medium",
    prompt: "What is a useful topic for a client aftercare message?",
    options: ["How to maintain the finished style", "An unrelated movie spoiler", "The price of gasoline", "A blank response"],
    correctOption: "A",
  },
  {
    category: "communitycut",
    difficulty: "medium",
    prompt: "What makes a booking page more useful to clients?",
    options: ["Clear service details and available times", "Hidden prices and no contact option", "A different business name each day", "No confirmation step"],
    correctOption: "A",
  },
  {
    category: "communitycut",
    difficulty: "hard",
    prompt: "What can help a grooming professional keep their brand consistent online?",
    options: ["Using a clear visual style and regular voice", "Posting without any plan", "Removing all work samples", "Avoiding client information"],
    correctOption: "A",
  },
  {
    category: "communitycut",
    difficulty: "medium",
    prompt: "What does a strong appointment confirmation reduce?",
    options: ["Client uncertainty and missed details", "The need for sanitation", "The quality of lighting", "The availability of payment options"],
    correctOption: "A",
  },
  {
    category: "ztvlive",
    difficulty: "easy",
    prompt: "What is a viewer most likely to find on a show page?",
    options: ["Episode information and a way to watch", "A vehicle registration form", "Only a blank screen", "A grocery list"],
    correctOption: "A",
  },
  {
    category: "ztvlive",
    difficulty: "medium",
    prompt: "What does a creator profile help establish on a streaming platform?",
    options: ["Discoverability and a clear connection to the creator’s work", "A replacement for every episode", "A guaranteed prize payment", "An empty library"],
    correctOption: "A",
  },
  {
    category: "ztvlive",
    difficulty: "medium",
    prompt: "Why is a show thumbnail important on ZTVLIVE?",
    options: ["It gives viewers a quick, recognizable entry point", "It replaces the episode audio", "It prevents search visibility", "It sets the prize cutoff"],
    correctOption: "A",
  },
  {
    category: "ztvlive",
    difficulty: "hard",
    prompt: "What does an episode description help a viewer understand?",
    options: ["What the episode is about before playing it", "How to repair a camera", "Who won a future prize", "The viewer’s password"],
    correctOption: "A",
  },
  {
    category: "general",
    difficulty: "easy",
    prompt: "How many days are in a standard week?",
    options: ["5", "6", "7", "8"],
    correctOption: "C",
  },
  {
    category: "general",
    difficulty: "easy",
    prompt: "What is H2O commonly known as?",
    options: ["Water", "Oxygen", "Salt", "Carbon dioxide"],
    correctOption: "A",
  },
  {
    category: "general",
    difficulty: "medium",
    prompt: "Which number comes immediately after 99?",
    options: ["98", "100", "101", "109"],
    correctOption: "B",
  },
];

const DAILY_CATEGORY_COUNTS = {
  culture: 8,
  communitycut: 5,
  ztvlive: 4,
  general: 3,
} as const;

function stableDailyOffset(dayKey: string, category: string, length: number) {
  const source = `${dayKey}:${category}`;
  let hash = 0;
  for (const character of source) hash = (hash * 31 + character.charCodeAt(0)) >>> 0;
  return hash % length;
}

/**
 * Builds a new persisted daily set from a larger server-only bank. The selection
 * stays at exactly 40% culture, 25% CommunityCut, 20% ZTVLIVE, and 15% general.
 */
export function selectDailyQuestionSet(dayKey: string): PrivateSeedQuestion[] {
  const categories = Object.keys(DAILY_CATEGORY_COUNTS) as Array<keyof typeof DAILY_CATEGORY_COUNTS>;
  const selected = categories.flatMap(category => {
    const pool = QUESTION_BANK.filter(question => question.category === category);
    const offset = stableDailyOffset(dayKey, category, pool.length);
    return Array.from({ length: DAILY_CATEGORY_COUNTS[category] }, (_, index) => pool[(offset + index) % pool.length]);
  });
  const orderOffset = stableDailyOffset(dayKey, "daily-order", selected.length);
  return [...selected.slice(orderOffset), ...selected.slice(0, orderOffset)];
}
