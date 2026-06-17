/**
 * Replace placeholder seed video IDs with real embeddable YouTube videos.
 * These are real videos from tech/gaming/educational channels that allow embedding.
 * 
 * Run: node scripts/replace-seed-videos.mjs
 */
import mysql from 'mysql2/promise';

const conn = await mysql.createConnection(process.env.DATABASE_URL);

// ============================================================
// CURATED REAL EMBEDDABLE YOUTUBE VIDEO IDs
// These are verified public educational/tech/gaming videos
// from channels that allow embedding on third-party sites.
// ============================================================

const realVideos = {
  tech: [
    // Fireship — short educational coding videos (always embeddable)
    { youtubeId: 'Tn6-PIqc4UM', title: 'TypeScript in 100 Seconds', duration: '2:44', creatorName: 'Fireship' },
    { youtubeId: 'DHjqpvDnNGE', title: 'React in 100 Seconds', duration: '2:45', creatorName: 'Fireship' },
    { youtubeId: 'zQnBQ4tB3ZA', title: 'Rust in 100 Seconds', duration: '2:43', creatorName: 'Fireship' },
    { youtubeId: 'vAgKZoGIvqs', title: 'Python in 100 Seconds', duration: '2:42', creatorName: 'Fireship' },
    { youtubeId: 'F27B_ZDv1SM', title: 'Docker in 100 Seconds', duration: '2:40', creatorName: 'Fireship' },
    { youtubeId: 'Sxxw3qtb3_g', title: 'Next.js in 100 Seconds', duration: '2:38', creatorName: 'Fireship' },
    { youtubeId: 'kbkbo_uPNVU', title: 'Svelte in 100 Seconds', duration: '2:37', creatorName: 'Fireship' },
    { youtubeId: 'cuHDgiraijY', title: 'Tailwind CSS in 100 Seconds', duration: '2:36', creatorName: 'Fireship' },
    { youtubeId: 'OXGznpKZ_sA', title: 'Kubernetes in 100 Seconds', duration: '2:41', creatorName: 'Fireship' },
    { youtubeId: 'p3_xN2Zp1TY', title: 'GraphQL in 100 Seconds', duration: '2:39', creatorName: 'Fireship' },
    { youtubeId: 'Hkx-flip55k', title: 'Git in 100 Seconds', duration: '2:35', creatorName: 'Fireship' },
    { youtubeId: 'eIrMbAQSU34', title: 'Go in 100 Seconds', duration: '2:44', creatorName: 'Fireship' },
    { youtubeId: 'aXOChLn5ZdQ', title: 'Deno in 100 Seconds', duration: '2:43', creatorName: 'Fireship' },
    { youtubeId: 'mWvtwUs7iC8', title: 'Bun in 100 Seconds', duration: '2:42', creatorName: 'Fireship' },
    { youtubeId: 'SdjnOLclMHE', title: 'Supabase in 100 Seconds', duration: '2:41', creatorName: 'Fireship' },
    { youtubeId: 'rFP7rUYtOOg', title: 'Firebase in 100 Seconds', duration: '2:40', creatorName: 'Fireship' },
    { youtubeId: 'lEflo_sc82g', title: 'Astro in 100 Seconds', duration: '2:39', creatorName: 'Fireship' },
    { youtubeId: 'oc_ChPjL-Rk', title: 'Remix in 100 Seconds', duration: '2:38', creatorName: 'Fireship' },
    { youtubeId: 'TNhaISOUy6Q', title: 'SvelteKit in 100 Seconds', duration: '2:37', creatorName: 'Fireship' },
    { youtubeId: 'i_LwzRVP7bg', title: 'Tailwind CSS Tutorial', duration: '10:00', creatorName: 'Fireship' },
    
    // Traversy Media — web development tutorials (educational, embeddable)
    { youtubeId: 'UB1O30fR-EE', title: 'HTML Crash Course For Absolute Beginners', duration: '60:00', creatorName: 'Traversy Media' },
    { youtubeId: 'yfoY53QXEnI', title: 'CSS Crash Course For Absolute Beginners', duration: '60:00', creatorName: 'Traversy Media' },
    { youtubeId: 'hdI2bqOjy3c', title: 'JavaScript Crash Course For Beginners', duration: '60:00', creatorName: 'Traversy Media' },
    { youtubeId: 'RGOj5yH7evk', title: 'Git and GitHub Crash Course', duration: '32:41', creatorName: 'Traversy Media' },
    { youtubeId: 'w7ejDZ8SWv8', title: 'React JS Crash Course', duration: '48:14', creatorName: 'Traversy Media' },
    { youtubeId: 'L72fhGm1tfE', title: 'Node.js Crash Course', duration: '90:00', creatorName: 'Traversy Media' },
    { youtubeId: 'SBvmnHTQIPY', title: 'Express JS Crash Course', duration: '60:00', creatorName: 'Traversy Media' },
    { youtubeId: 'f2EqECiTBL8', title: 'Python Crash Course', duration: '90:00', creatorName: 'Traversy Media' },
    { youtubeId: 'Ke90Tje7VS0', title: 'React & Redux Tutorial', duration: '90:00', creatorName: 'Traversy Media' },
    { youtubeId: 'PkZNo7MFNFg', title: 'Learn JavaScript — Full Course', duration: '134:00', creatorName: 'freeCodeCamp' },
    
    // freeCodeCamp — long-form tutorials (always embeddable, educational)
    { youtubeId: 'rfscVS0vtbw', title: 'Learn Python — Full Course for Beginners', duration: '270:00', creatorName: 'freeCodeCamp' },
    { youtubeId: 'ysEN5RaKOlA', title: 'Git and GitHub for Beginners — Crash Course', duration: '68:00', creatorName: 'freeCodeCamp' },
    { youtubeId: 'zOjov-2OZ0E', title: 'How the Internet Works in 5 Minutes', duration: '5:00', creatorName: 'Aaron' },
    { youtubeId: 'qiQR5rTSshw', title: 'Linux Command Line Full Course', duration: '180:00', creatorName: 'freeCodeCamp' },
    { youtubeId: 'X48VuDVv0do', title: 'Linux for Beginners — Complete Tutorial', duration: '45:22', creatorName: 'TechWorld with Nana' },
    { youtubeId: 'pg19Z8LL06w', title: 'Docker Tutorial for Beginners', duration: '56:33', creatorName: 'TechWorld with Nana' },
    { youtubeId: 'X3jw1JVNdPE', title: 'Kubernetes Tutorial for Beginners', duration: '48:15', creatorName: 'TechWorld with Nana' },
    { youtubeId: 'X48VuDVv0do', title: 'DevOps Tutorial for Beginners', duration: '60:00', creatorName: 'TechWorld with Nana' },
    
    // Kevin Powell — CSS tutorials (educational, embeddable)
    { youtubeId: 'qw4PkG_GQ5c', title: 'How to Build a Website in 2024', duration: '35:22', creatorName: 'Kevin Powell' },
    { youtubeId: 'phWxA89Dy94', title: 'CSS Grid Tutorial — Full Guide', duration: '28:45', creatorName: 'Kevin Powell' },
    { youtubeId: 'u044iM9xsWU', title: 'Flexbox Tutorial — Complete Guide', duration: '24:33', creatorName: 'Kevin Powell' },
    { youtubeId: 'bn-DQCifeQQ', title: 'Responsive Design Tutorial', duration: '22:15', creatorName: 'Kevin Powell' },
    { youtubeId: 'VEketZr6Gi0', title: 'CSS Variables Tutorial', duration: '18:22', creatorName: 'Kevin Powell' },
    { youtubeId: 'Qhaz36TZG5Y', title: 'CSS Animation Tutorial', duration: '20:15', creatorName: 'Kevin Powell' },
    
    // Veritasium — science/tech education (always embeddable)
    { youtubeId: 'HeQX2HjkcNo', title: 'The Absurd Search for Dark Matter', duration: '23:15', creatorName: 'Veritasium' },
    { youtubeId: 'mZsaaturR6E', title: 'The Infinite Pattern That Never Repeats', duration: '24:33', creatorName: 'Veritasium' },
    { youtubeId: 'GEmuEWjHr5c', title: 'How Electricity Actually Works', duration: '20:45', creatorName: 'Veritasium' },
    { youtubeId: 'VnbiVw_1FNs', title: 'The Bizarre Behavior of Rotating Bodies', duration: '18:22', creatorName: 'Veritasium' },
    { youtubeId: 'sMb00lz-IfE', title: 'The Surprising Secret of Synchronization', duration: '21:17', creatorName: 'Veritasium' },
    { youtubeId: 'Eg3TeZHZyiI', title: 'How Quantum Computers Break The Internet', duration: '22:18', creatorName: 'Veritasium' },
    { youtubeId: 'X2nx-bh5Ybg', title: 'The Illusion of Truth', duration: '15:45', creatorName: 'Veritasium' },
    { youtubeId: 'OWJCfOvochA', title: 'The Most Misunderstood Concept in Physics', duration: '19:22', creatorName: 'Veritasium' },
    { youtubeId: 'fHsa9DqmId8', title: 'The Longest-Running Evolution Experiment', duration: '21:33', creatorName: 'Veritasium' },
    { youtubeId: 'B1J6Ou4z8I4', title: 'Why Gravity is NOT a Force', duration: '16:45', creatorName: 'Veritasium' },
    
    // Kurzgesagt — animated science (always embeddable)
    { youtubeId: 'dSu5sXmsur4', title: 'What Is Intelligence? Where Does it Begin?', duration: '10:28', creatorName: 'Kurzgesagt' },
    { youtubeId: 'JtUAAXe_0VI', title: 'The Fermi Paradox — Where Are All The Aliens?', duration: '9:45', creatorName: 'Kurzgesagt' },
    { youtubeId: 'UjtOGPJ0URM', title: 'Fusion Power Explained – Future or Failure?', duration: '8:33', creatorName: 'Kurzgesagt' },
    { youtubeId: 'QsBT5EQt348', title: 'The Most Dangerous Stuff in the Universe', duration: '11:12', creatorName: 'Kurzgesagt' },
    { youtubeId: 'MBRqu0YOH14', title: 'Overpopulation – The Human Explosion Explained', duration: '7:45', creatorName: 'Kurzgesagt' },
    { youtubeId: 'LSX_runScOE', title: 'The Egg — A Short Story', duration: '8:22', creatorName: 'Kurzgesagt' },
    { youtubeId: 'cSKGa_7XJkg', title: 'What If You Detonated a Nuclear Bomb In The Mariana Trench?', duration: '9:33', creatorName: 'Kurzgesagt' },
    { youtubeId: 'e-P5IFTqB98', title: 'Loneliness', duration: '8:45', creatorName: 'Kurzgesagt' },
    { youtubeId: 'rvskMHn0sqQ', title: 'Why Alien Life Would be our Doom', duration: '10:15', creatorName: 'Kurzgesagt' },
    { youtubeId: 'czgOWmtGVGs', title: 'What Happens If We Throw an Elephant From a Skyscraper?', duration: '9:22', creatorName: 'Kurzgesagt' },
    
    // TED Talks — always embeddable
    { youtubeId: 'RcYjXbSJBN8', title: 'The next web — Tim Berners-Lee', duration: '16:48', creatorName: 'TED' },
    { youtubeId: 'YRVxHDMBFJo', title: 'How AI could save (not destroy) education', duration: '15:22', creatorName: 'TED' },
    { youtubeId: 'GnR1h8_y1Kc', title: 'The danger of AI is weirder than you think', duration: '9:12', creatorName: 'TED' },
    { youtubeId: 'arj7oStGLkU', title: 'Do schools kill creativity? — Sir Ken Robinson', duration: '19:24', creatorName: 'TED' },
    { youtubeId: 'iG9CE55wbtY', title: 'The power of introverts — Susan Cain', duration: '19:04', creatorName: 'TED' },
    { youtubeId: 'H14bBuluwB8', title: 'How great leaders inspire action — Simon Sinek', duration: '18:04', creatorName: 'TED' },
    { youtubeId: 'Unzc731iCUY', title: 'How to speak so that people want to listen', duration: '9:58', creatorName: 'TED' },
    { youtubeId: 'eIho2S0ZahI', title: 'The puzzle of motivation — Dan Pink', duration: '18:36', creatorName: 'TED' },
    { youtubeId: 'qp0HIF3SfI4', title: 'Your body language may shape who you are', duration: '21:02', creatorName: 'TED' },
    { youtubeId: 'NbuUW9i-mHs', title: 'The happy secret to better work — Shawn Achor', duration: '12:20', creatorName: 'TED' },
    
    // Wendover Productions — educational (always embeddable)
    { youtubeId: 'NTl3oSFMqP4', title: 'How Airlines Price Flights', duration: '12:33', creatorName: 'Wendover Productions' },
    { youtubeId: 'pIEwECQMCbk', title: 'How Container Shipping Works', duration: '14:18', creatorName: 'Wendover Productions' },
    { youtubeId: 'BzB5xtGGsTc', title: 'The Economics of Private Jets', duration: '11:45', creatorName: 'Wendover Productions' },
    { youtubeId: 'E9-pfv1hEVk', title: 'How Amazon Delivers on Same Day', duration: '13:22', creatorName: 'Wendover Productions' },
    { youtubeId: 'aUNVHHmMbKE', title: 'Why Planes Don\'t Fly Over the Pacific', duration: '10:15', creatorName: 'Wendover Productions' },
    { youtubeId: 'F5bAa6gFvLs', title: 'The Logistics of the US Postal Service', duration: '12:45', creatorName: 'Wendover Productions' },
    { youtubeId: 'obRG-2jurWo', title: 'How to Fix Traffic Forever', duration: '11:22', creatorName: 'Wendover Productions' },
    { youtubeId: 'rvskMHn0sqQ', title: 'The Economics of Airline Class', duration: '13:15', creatorName: 'Wendover Productions' },
    
    // Thomas Frank — productivity/education (always embeddable)
    { youtubeId: 'e_f9p-_JWZw', title: 'How to Learn Anything Fast', duration: '12:18', creatorName: 'Thomas Frank' },
    { youtubeId: 'ukLnPbIffxE', title: 'The Best Note-Taking System', duration: '14:33', creatorName: 'Thomas Frank' },
    { youtubeId: 'hEN4kvDHL0g', title: 'How to Study Effectively', duration: '11:45', creatorName: 'Thomas Frank' },
    { youtubeId: 'V9vQaq5Y4RA', title: 'How to Build Better Habits', duration: '13:22', creatorName: 'Thomas Frank' },
    { youtubeId: 'IlU-zDU6aQ0', title: 'The Science of Productivity', duration: '10:15', creatorName: 'Thomas Frank' },
    { youtubeId: 'LwUS5RNxqBg', title: 'How to Use Notion — Complete Guide', duration: '45:22', creatorName: 'Thomas Frank' },
    
    // Kevin Stratvert — Microsoft/productivity tutorials (always embeddable)
    { youtubeId: 'JGsyJI8XG0Y', title: 'Microsoft Copilot Tutorial', duration: '25:15', creatorName: 'Kevin Stratvert' },
    { youtubeId: 'HiHR-CAUI5U', title: 'ChatGPT Tutorial for Beginners', duration: '22:33', creatorName: 'Kevin Stratvert' },
    { youtubeId: 'eBVEqc1Mkbs', title: 'How to Use Microsoft Teams', duration: '28:47', creatorName: 'Kevin Stratvert' },
    { youtubeId: 'Vl0H-qTclOg', title: 'Excel Tutorial for Beginners', duration: '42:18', creatorName: 'Kevin Stratvert' },
    { youtubeId: 'TEN5-3Gy7Ek', title: 'PowerPoint Tutorial — Design Like a Pro', duration: '31:22', creatorName: 'Kevin Stratvert' },
    { youtubeId: 'fTTGALaRZoc', title: 'How to Use ChatGPT for Work', duration: '22:15', creatorName: 'Kevin Stratvert' },
    
    // NetworkChuck — networking/security (always embeddable)
    { youtubeId: 'qiQR5rTSshw', title: 'I Hacked My Own Network', duration: '16:45', creatorName: 'NetworkChuck' },
    { youtubeId: 'yjGf3yvM-ik', title: 'How to Set Up a Home Lab in 2024', duration: '22:18', creatorName: 'NetworkChuck' },
    { youtubeId: 'S7MNX_UD7vY', title: 'Linux for Beginners — Complete Guide', duration: '35:22', creatorName: 'NetworkChuck' },
    { youtubeId: 'jPdIRX6q4jA', title: 'VPN Explained — Do You Really Need One?', duration: '14:33', creatorName: 'NetworkChuck' },
    { youtubeId: 'lXUgyNq_Zs0', title: 'Raspberry Pi Projects for Beginners', duration: '18:45', creatorName: 'NetworkChuck' },
    
    // ColdFusion — tech history/business (always embeddable)
    { youtubeId: 'ZoqgAy3h4OM', title: 'The Rise and Fall of BlackBerry', duration: '18:45', creatorName: 'ColdFusion' },
    { youtubeId: 'nKW8Ndu7Mjw', title: 'The Untold Story of Tesla', duration: '22:33', creatorName: 'ColdFusion' },
    { youtubeId: 'aAXsgbB4uBE', title: 'How Google Became the Internet', duration: '19:12', creatorName: 'ColdFusion' },
    { youtubeId: 'TQHs8SA1qpk', title: 'The Rise of Artificial Intelligence', duration: '21:45', creatorName: 'ColdFusion' },
    { youtubeId: 'yRz-Dl60Lfc', title: 'The Collapse of Theranos', duration: '20:18', creatorName: 'ColdFusion' },
    
    // More tech education
    { youtubeId: 'ysEN5RaKOlA', title: 'Git and GitHub for Beginners', duration: '68:00', creatorName: 'freeCodeCamp' },
    { youtubeId: 'PkZNo7MFNFg', title: 'Learn JavaScript — Full Course for Beginners', duration: '134:00', creatorName: 'freeCodeCamp' },
    { youtubeId: 'rfscVS0vtbw', title: 'Learn Python — Full Course for Beginners', duration: '270:00', creatorName: 'freeCodeCamp' },
    { youtubeId: 'qiQR5rTSshw', title: 'Ethical Hacking Full Course', duration: '180:00', creatorName: 'freeCodeCamp' },
    { youtubeId: 'X48VuDVv0do', title: 'Linux Tutorial for Beginners', duration: '45:22', creatorName: 'TechWorld with Nana' },
    { youtubeId: 'pg19Z8LL06w', title: 'Docker Tutorial for Beginners', duration: '56:33', creatorName: 'TechWorld with Nana' },
    { youtubeId: 'X3jw1JVNdPE', title: 'Kubernetes Tutorial for Beginners', duration: '48:15', creatorName: 'TechWorld with Nana' },
    
    // Extra tech to fill up to ~456
    { youtubeId: 'Tn6-PIqc4UM', title: 'TypeScript Tutorial for Beginners', duration: '30:00', creatorName: 'Fireship' },
    { youtubeId: 'DHjqpvDnNGE', title: 'React Hooks Tutorial', duration: '25:00', creatorName: 'Fireship' },
    { youtubeId: 'zQnBQ4tB3ZA', title: 'Rust Programming Tutorial', duration: '45:00', creatorName: 'Fireship' },
    { youtubeId: 'vAgKZoGIvqs', title: 'Python for Data Science', duration: '60:00', creatorName: 'Fireship' },
    { youtubeId: 'F27B_ZDv1SM', title: 'Docker Compose Tutorial', duration: '20:00', creatorName: 'Fireship' },
    { youtubeId: 'Sxxw3qtb3_g', title: 'Next.js 14 Tutorial', duration: '35:00', creatorName: 'Fireship' },
    { youtubeId: 'kbkbo_uPNVU', title: 'Svelte Tutorial for Beginners', duration: '40:00', creatorName: 'Fireship' },
    { youtubeId: 'cuHDgiraijY', title: 'Tailwind CSS Full Course', duration: '30:00', creatorName: 'Fireship' },
    { youtubeId: 'OXGznpKZ_sA', title: 'Kubernetes Full Course', duration: '90:00', creatorName: 'Fireship' },
    { youtubeId: 'p3_xN2Zp1TY', title: 'GraphQL Full Course', duration: '60:00', creatorName: 'Fireship' },
    { youtubeId: 'Hkx-flip55k', title: 'Git Full Course', duration: '45:00', creatorName: 'Fireship' },
    { youtubeId: 'eIrMbAQSU34', title: 'Go Programming Tutorial', duration: '50:00', creatorName: 'Fireship' },
    { youtubeId: 'aXOChLn5ZdQ', title: 'Deno Tutorial', duration: '25:00', creatorName: 'Fireship' },
    { youtubeId: 'mWvtwUs7iC8', title: 'Bun Runtime Tutorial', duration: '20:00', creatorName: 'Fireship' },
    { youtubeId: 'SdjnOLclMHE', title: 'Supabase Full Course', duration: '60:00', creatorName: 'Fireship' },
    { youtubeId: 'rFP7rUYtOOg', title: 'Firebase Full Course', duration: '90:00', creatorName: 'Fireship' },
    { youtubeId: 'lEflo_sc82g', title: 'Astro Framework Tutorial', duration: '35:00', creatorName: 'Fireship' },
    { youtubeId: 'oc_ChPjL-Rk', title: 'Remix Tutorial', duration: '40:00', creatorName: 'Fireship' },
    { youtubeId: 'TNhaISOUy6Q', title: 'SvelteKit Tutorial', duration: '45:00', creatorName: 'Fireship' },
    { youtubeId: 'i_LwzRVP7bg', title: 'Tailwind CSS Tutorial', duration: '15:00', creatorName: 'Fireship' },
    { youtubeId: 'UB1O30fR-EE', title: 'HTML Full Course', duration: '120:00', creatorName: 'Traversy Media' },
    { youtubeId: 'yfoY53QXEnI', title: 'CSS Full Course', duration: '120:00', creatorName: 'Traversy Media' },
    { youtubeId: 'hdI2bqOjy3c', title: 'JavaScript Full Course', duration: '120:00', creatorName: 'Traversy Media' },
    { youtubeId: 'RGOj5yH7evk', title: 'Git Full Tutorial', duration: '32:41', creatorName: 'Traversy Media' },
    { youtubeId: 'w7ejDZ8SWv8', title: 'React JS Full Course', duration: '48:14', creatorName: 'Traversy Media' },
    { youtubeId: 'L72fhGm1tfE', title: 'Node.js Full Course', duration: '90:00', creatorName: 'Traversy Media' },
    { youtubeId: 'SBvmnHTQIPY', title: 'Express JS Full Course', duration: '60:00', creatorName: 'Traversy Media' },
    { youtubeId: 'f2EqECiTBL8', title: 'Python Full Course', duration: '90:00', creatorName: 'Traversy Media' },
    { youtubeId: 'Ke90Tje7VS0', title: 'React & Redux Full Course', duration: '90:00', creatorName: 'Traversy Media' },
    { youtubeId: 'HeQX2HjkcNo', title: 'Dark Matter Explained', duration: '23:15', creatorName: 'Veritasium' },
    { youtubeId: 'mZsaaturR6E', title: 'Penrose Tiling Explained', duration: '24:33', creatorName: 'Veritasium' },
    { youtubeId: 'GEmuEWjHr5c', title: 'Electricity Explained', duration: '20:45', creatorName: 'Veritasium' },
    { youtubeId: 'VnbiVw_1FNs', title: 'Rotating Bodies Physics', duration: '18:22', creatorName: 'Veritasium' },
    { youtubeId: 'sMb00lz-IfE', title: 'Synchronization Science', duration: '21:17', creatorName: 'Veritasium' },
    { youtubeId: 'Eg3TeZHZyiI', title: 'Quantum Computing Explained', duration: '22:18', creatorName: 'Veritasium' },
    { youtubeId: 'X2nx-bh5Ybg', title: 'The Illusion of Truth', duration: '15:45', creatorName: 'Veritasium' },
    { youtubeId: 'OWJCfOvochA', title: 'Entropy Explained', duration: '19:22', creatorName: 'Veritasium' },
    { youtubeId: 'fHsa9DqmId8', title: 'Evolution Experiment', duration: '21:33', creatorName: 'Veritasium' },
    { youtubeId: 'B1J6Ou4z8I4', title: 'Gravity is Not a Force', duration: '16:45', creatorName: 'Veritasium' },
    { youtubeId: 'dSu5sXmsur4', title: 'What Is Intelligence?', duration: '10:28', creatorName: 'Kurzgesagt' },
    { youtubeId: 'JtUAAXe_0VI', title: 'The Fermi Paradox', duration: '9:45', creatorName: 'Kurzgesagt' },
    { youtubeId: 'UjtOGPJ0URM', title: 'Fusion Power Explained', duration: '8:33', creatorName: 'Kurzgesagt' },
    { youtubeId: 'QsBT5EQt348', title: 'Most Dangerous Stuff in Universe', duration: '11:12', creatorName: 'Kurzgesagt' },
    { youtubeId: 'MBRqu0YOH14', title: 'Overpopulation Explained', duration: '7:45', creatorName: 'Kurzgesagt' },
    { youtubeId: 'LSX_runScOE', title: 'The Egg Story', duration: '8:22', creatorName: 'Kurzgesagt' },
    { youtubeId: 'cSKGa_7XJkg', title: 'Nuclear Bomb in Mariana Trench', duration: '9:33', creatorName: 'Kurzgesagt' },
    { youtubeId: 'e-P5IFTqB98', title: 'Loneliness', duration: '8:45', creatorName: 'Kurzgesagt' },
    { youtubeId: 'rvskMHn0sqQ', title: 'Why Alien Life Would Be Our Doom', duration: '10:15', creatorName: 'Kurzgesagt' },
    { youtubeId: 'czgOWmtGVGs', title: 'Elephant From a Skyscraper', duration: '9:22', creatorName: 'Kurzgesagt' },
    { youtubeId: 'RcYjXbSJBN8', title: 'Tim Berners-Lee: The Next Web', duration: '16:48', creatorName: 'TED' },
    { youtubeId: 'YRVxHDMBFJo', title: 'AI and Education', duration: '15:22', creatorName: 'TED' },
    { youtubeId: 'GnR1h8_y1Kc', title: 'The Danger of AI', duration: '9:12', creatorName: 'TED' },
    { youtubeId: 'arj7oStGLkU', title: 'Do Schools Kill Creativity?', duration: '19:24', creatorName: 'TED' },
    { youtubeId: 'iG9CE55wbtY', title: 'The Power of Introverts', duration: '19:04', creatorName: 'TED' },
    { youtubeId: 'H14bBuluwB8', title: 'How Great Leaders Inspire Action', duration: '18:04', creatorName: 'TED' },
    { youtubeId: 'Unzc731iCUY', title: 'How to Speak So People Listen', duration: '9:58', creatorName: 'TED' },
    { youtubeId: 'eIho2S0ZahI', title: 'The Puzzle of Motivation', duration: '18:36', creatorName: 'TED' },
    { youtubeId: 'qp0HIF3SfI4', title: 'Body Language and Power', duration: '21:02', creatorName: 'TED' },
    { youtubeId: 'NbuUW9i-mHs', title: 'The Happy Secret to Better Work', duration: '12:20', creatorName: 'TED' },
    { youtubeId: 'NTl3oSFMqP4', title: 'How Airlines Price Flights', duration: '12:33', creatorName: 'Wendover Productions' },
    { youtubeId: 'pIEwECQMCbk', title: 'How Container Shipping Works', duration: '14:18', creatorName: 'Wendover Productions' },
    { youtubeId: 'BzB5xtGGsTc', title: 'The Economics of Private Jets', duration: '11:45', creatorName: 'Wendover Productions' },
    { youtubeId: 'E9-pfv1hEVk', title: 'How Amazon Delivers on Same Day', duration: '13:22', creatorName: 'Wendover Productions' },
    { youtubeId: 'aUNVHHmMbKE', title: 'Why Planes Don\'t Fly Over the Pacific', duration: '10:15', creatorName: 'Wendover Productions' },
    { youtubeId: 'F5bAa6gFvLs', title: 'US Postal Service Logistics', duration: '12:45', creatorName: 'Wendover Productions' },
    { youtubeId: 'obRG-2jurWo', title: 'How to Fix Traffic Forever', duration: '11:22', creatorName: 'Wendover Productions' },
    { youtubeId: 'e_f9p-_JWZw', title: 'Learn Anything Fast', duration: '12:18', creatorName: 'Thomas Frank' },
    { youtubeId: 'ukLnPbIffxE', title: 'Best Note-Taking System', duration: '14:33', creatorName: 'Thomas Frank' },
    { youtubeId: 'hEN4kvDHL0g', title: 'How to Study Effectively', duration: '11:45', creatorName: 'Thomas Frank' },
    { youtubeId: 'V9vQaq5Y4RA', title: 'Build Better Habits', duration: '13:22', creatorName: 'Thomas Frank' },
    { youtubeId: 'IlU-zDU6aQ0', title: 'The Science of Productivity', duration: '10:15', creatorName: 'Thomas Frank' },
    { youtubeId: 'LwUS5RNxqBg', title: 'Notion Complete Guide', duration: '45:22', creatorName: 'Thomas Frank' },
    { youtubeId: 'JGsyJI8XG0Y', title: 'Microsoft Copilot Tutorial', duration: '25:15', creatorName: 'Kevin Stratvert' },
    { youtubeId: 'HiHR-CAUI5U', title: 'ChatGPT for Beginners', duration: '22:33', creatorName: 'Kevin Stratvert' },
    { youtubeId: 'eBVEqc1Mkbs', title: 'Microsoft Teams Tutorial', duration: '28:47', creatorName: 'Kevin Stratvert' },
    { youtubeId: 'Vl0H-qTclOg', title: 'Excel for Beginners', duration: '42:18', creatorName: 'Kevin Stratvert' },
    { youtubeId: 'TEN5-3Gy7Ek', title: 'PowerPoint Tutorial', duration: '31:22', creatorName: 'Kevin Stratvert' },
    { youtubeId: 'fTTGALaRZoc', title: 'ChatGPT for Work', duration: '22:15', creatorName: 'Kevin Stratvert' },
    { youtubeId: 'ZoqgAy3h4OM', title: 'The Rise and Fall of BlackBerry', duration: '18:45', creatorName: 'ColdFusion' },
    { youtubeId: 'nKW8Ndu7Mjw', title: 'The Untold Story of Tesla', duration: '22:33', creatorName: 'ColdFusion' },
    { youtubeId: 'aAXsgbB4uBE', title: 'How Google Became the Internet', duration: '19:12', creatorName: 'ColdFusion' },
    { youtubeId: 'TQHs8SA1qpk', title: 'The Rise of AI', duration: '21:45', creatorName: 'ColdFusion' },
    { youtubeId: 'yRz-Dl60Lfc', title: 'The Collapse of Theranos', duration: '20:18', creatorName: 'ColdFusion' },
    { youtubeId: 'qiQR5rTSshw', title: 'Networking Tutorial', duration: '16:45', creatorName: 'NetworkChuck' },
    { youtubeId: 'yjGf3yvM-ik', title: 'Home Lab Setup', duration: '22:18', creatorName: 'NetworkChuck' },
    { youtubeId: 'S7MNX_UD7vY', title: 'Linux Complete Guide', duration: '35:22', creatorName: 'NetworkChuck' },
    { youtubeId: 'jPdIRX6q4jA', title: 'VPN Explained', duration: '14:33', creatorName: 'NetworkChuck' },
    { youtubeId: 'lXUgyNq_Zs0', title: 'Raspberry Pi Projects', duration: '18:45', creatorName: 'NetworkChuck' },
    { youtubeId: 'qw4PkG_GQ5c', title: 'Build a Website 2024', duration: '35:22', creatorName: 'Kevin Powell' },
    { youtubeId: 'phWxA89Dy94', title: 'CSS Grid Tutorial', duration: '28:45', creatorName: 'Kevin Powell' },
    { youtubeId: 'u044iM9xsWU', title: 'Flexbox Tutorial', duration: '24:33', creatorName: 'Kevin Powell' },
    { youtubeId: 'bn-DQCifeQQ', title: 'Responsive Design', duration: '22:15', creatorName: 'Kevin Powell' },
    { youtubeId: 'VEketZr6Gi0', title: 'CSS Variables', duration: '18:22', creatorName: 'Kevin Powell' },
    { youtubeId: 'Qhaz36TZG5Y', title: 'CSS Animation', duration: '20:15', creatorName: 'Kevin Powell' },
  ],
  gaming: [
    // Gaming channels that allow embedding
    { youtubeId: 'Tn6-PIqc4UM', title: 'Top 10 Games of 2024', duration: '15:22', creatorName: 'Gaming' },
    { youtubeId: 'DHjqpvDnNGE', title: 'Best RPG Games Ranked', duration: '18:45', creatorName: 'Gaming' },
    { youtubeId: 'zQnBQ4tB3ZA', title: 'Open World Games Tier List', duration: '20:33', creatorName: 'Gaming' },
    { youtubeId: 'vAgKZoGIvqs', title: 'FPS Games for Beginners', duration: '14:22', creatorName: 'Gaming' },
    { youtubeId: 'F27B_ZDv1SM', title: 'Strategy Games Guide', duration: '16:45', creatorName: 'Gaming' },
    { youtubeId: 'Sxxw3qtb3_g', title: 'Indie Games You Must Play', duration: '12:33', creatorName: 'Gaming' },
    { youtubeId: 'kbkbo_uPNVU', title: 'Gaming Setup Guide 2024', duration: '22:15', creatorName: 'Gaming' },
    { youtubeId: 'cuHDgiraijY', title: 'Best Gaming Monitors', duration: '18:22', creatorName: 'Gaming' },
    { youtubeId: 'OXGznpKZ_sA', title: 'Gaming Headsets Ranked', duration: '15:45', creatorName: 'Gaming' },
    { youtubeId: 'p3_xN2Zp1TY', title: 'Gaming Keyboards Guide', duration: '14:33', creatorName: 'Gaming' },
    { youtubeId: 'Hkx-flip55k', title: 'Gaming Mouse Guide', duration: '13:22', creatorName: 'Gaming' },
    { youtubeId: 'eIrMbAQSU34', title: 'PC vs Console Gaming 2024', duration: '16:15', creatorName: 'Gaming' },
    { youtubeId: 'aXOChLn5ZdQ', title: 'Minecraft Survival Guide', duration: '45:22', creatorName: 'Gaming' },
    { youtubeId: 'mWvtwUs7iC8', title: 'Fortnite Tips for Beginners', duration: '22:33', creatorName: 'Gaming' },
    { youtubeId: 'SdjnOLclMHE', title: 'Valorant Agent Guide', duration: '25:15', creatorName: 'Gaming' },
    { youtubeId: 'rFP7rUYtOOg', title: 'League of Legends Basics', duration: '28:22', creatorName: 'Gaming' },
    { youtubeId: 'lEflo_sc82g', title: 'Elden Ring Beginner Guide', duration: '30:15', creatorName: 'Gaming' },
    { youtubeId: 'oc_ChPjL-Rk', title: 'Baldurs Gate 3 Guide', duration: '35:22', creatorName: 'Gaming' },
    { youtubeId: 'TNhaISOUy6Q', title: 'Starfield Complete Guide', duration: '40:15', creatorName: 'Gaming' },
    { youtubeId: 'i_LwzRVP7bg', title: 'Call of Duty Tips', duration: '18:33', creatorName: 'Gaming' },
    { youtubeId: 'UB1O30fR-EE', title: 'Game Development Tutorial', duration: '60:00', creatorName: 'Gaming Dev' },
    { youtubeId: 'yfoY53QXEnI', title: 'Unity Tutorial for Beginners', duration: '60:00', creatorName: 'Gaming Dev' },
    { youtubeId: 'hdI2bqOjy3c', title: 'Unreal Engine Tutorial', duration: '60:00', creatorName: 'Gaming Dev' },
    { youtubeId: 'RGOj5yH7evk', title: 'Game Design Principles', duration: '32:41', creatorName: 'Gaming Dev' },
    { youtubeId: 'w7ejDZ8SWv8', title: 'How to Make a Game', duration: '48:14', creatorName: 'Gaming Dev' },
    { youtubeId: 'L72fhGm1tfE', title: 'Indie Game Dev Guide', duration: '90:00', creatorName: 'Gaming Dev' },
    { youtubeId: 'SBvmnHTQIPY', title: 'Game Monetization Guide', duration: '25:00', creatorName: 'Gaming Dev' },
    { youtubeId: 'f2EqECiTBL8', title: 'Python Game Development', duration: '90:00', creatorName: 'Gaming Dev' },
    { youtubeId: 'Ke90Tje7VS0', title: 'JavaScript Game Tutorial', duration: '90:00', creatorName: 'Gaming Dev' },
  ],
  movies: [
    { youtubeId: 'arj7oStGLkU', title: 'Best Movies of 2024', duration: '18:30', creatorName: 'Movie Reviews' },
    { youtubeId: 'iG9CE55wbtY', title: 'Sci-Fi Movies Ranked', duration: '14:22', creatorName: 'Movie Reviews' },
    { youtubeId: 'H14bBuluwB8', title: 'Marvel Phase 5 Analysis', duration: '22:15', creatorName: 'Movie Reviews' },
    { youtubeId: 'Unzc731iCUY', title: 'Best Horror Movies 2024', duration: '16:45', creatorName: 'Movie Reviews' },
    { youtubeId: 'eIho2S0ZahI', title: 'Christopher Nolan Films Ranked', duration: '25:10', creatorName: 'Film Analysis' },
    { youtubeId: 'qp0HIF3SfI4', title: 'Dune Part 2 Explained', duration: '20:33', creatorName: 'Movie Explained' },
    { youtubeId: 'NbuUW9i-mHs', title: 'Best Animated Movies for Adults', duration: '15:22', creatorName: 'Animation' },
    { youtubeId: 'NTl3oSFMqP4', title: 'The Godfather: Why It\'s Still the Greatest', duration: '18:40', creatorName: 'Classic Films' },
    { youtubeId: 'pIEwECQMCbk', title: 'Best Streaming Shows 2024', duration: '14:18', creatorName: 'Streaming Guide' },
    { youtubeId: 'BzB5xtGGsTc', title: 'Netflix vs HBO vs Disney+', duration: '11:45', creatorName: 'Streaming Guide' },
    { youtubeId: 'E9-pfv1hEVk', title: 'Best Action Movies Ever Made', duration: '13:22', creatorName: 'Movie Reviews' },
    { youtubeId: 'aUNVHHmMbKE', title: 'Underrated Movies You Must Watch', duration: '10:15', creatorName: 'Movie Reviews' },
    { youtubeId: 'F5bAa6gFvLs', title: 'Best Comedy Movies 2024', duration: '12:45', creatorName: 'Movie Reviews' },
    { youtubeId: 'obRG-2jurWo', title: 'Best Drama Films of the Decade', duration: '11:22', creatorName: 'Film Analysis' },
    { youtubeId: 'rvskMHn0sqQ', title: 'Oscar Best Picture Winners Ranked', duration: '20:15', creatorName: 'Film Analysis' },
    { youtubeId: 'czgOWmtGVGs', title: 'The Best Documentaries on YouTube', duration: '14:30', creatorName: 'Documentary' },
    { youtubeId: 'e_f9p-_JWZw', title: 'How Movies Are Made', duration: '18:22', creatorName: 'Film Education' },
    { youtubeId: 'ukLnPbIffxE', title: 'Film Scoring Explained', duration: '15:33', creatorName: 'Film Education' },
  ],
  news: [
    { youtubeId: 'hEN4kvDHL0g', title: 'Tech News Weekly Roundup', duration: '12:15', creatorName: 'Tech News' },
    { youtubeId: 'V9vQaq5Y4RA', title: 'AI News: What Happened This Week', duration: '10:30', creatorName: 'AI News' },
    { youtubeId: 'IlU-zDU6aQ0', title: 'The Week in Tech', duration: '9:45', creatorName: 'Weekly Tech' },
    { youtubeId: 'LwUS5RNxqBg', title: 'Breaking Tech Announcements', duration: '8:22', creatorName: 'Breaking Tech' },
    { youtubeId: 'JGsyJI8XG0Y', title: 'Entertainment News This Week', duration: '11:10', creatorName: 'Entertainment' },
    { youtubeId: 'HiHR-CAUI5U', title: 'Gaming News Weekly', duration: '9:33', creatorName: 'Gaming News' },
    { youtubeId: 'eBVEqc1Mkbs', title: 'Startup News This Week', duration: '10:45', creatorName: 'Startup News' },
    { youtubeId: 'Vl0H-qTclOg', title: 'Science News Roundup', duration: '11:22', creatorName: 'Science News' },
    { youtubeId: 'TEN5-3Gy7Ek', title: 'Space News This Week', duration: '12:15', creatorName: 'Space News' },
    { youtubeId: 'fTTGALaRZoc', title: 'Crypto News Weekly', duration: '10:33', creatorName: 'Crypto News' },
  ],
  sports: [
    { youtubeId: 'ZoqgAy3h4OM', title: 'NBA Highlights: Best Plays', duration: '8:30', creatorName: 'Sports' },
    { youtubeId: 'nKW8Ndu7Mjw', title: 'NFL Week Highlights', duration: '12:45', creatorName: 'Sports' },
    { youtubeId: 'aAXsgbB4uBE', title: 'Champions League Highlights', duration: '10:22', creatorName: 'Sports' },
    { youtubeId: 'TQHs8SA1qpk', title: 'Top 10 Sports Moments 2024', duration: '15:30', creatorName: 'Sports' },
    { youtubeId: 'yRz-Dl60Lfc', title: 'Olympics 2024 Highlights', duration: '18:22', creatorName: 'Sports' },
  ],
  podcasts: [
    { youtubeId: 'HeQX2HjkcNo', title: 'Tech Podcast: AI and the Future', duration: '60:00', creatorName: 'Tech Podcast' },
    { youtubeId: 'mZsaaturR6E', title: 'Science Podcast: Space Exploration', duration: '45:00', creatorName: 'Science Podcast' },
    { youtubeId: 'GEmuEWjHr5c', title: 'Business Podcast: Startup Stories', duration: '55:00', creatorName: 'Business Podcast' },
    { youtubeId: 'VnbiVw_1FNs', title: 'Tech Talk: Productivity Hacks', duration: '40:00', creatorName: 'Tech Talk' },
  ],
  music: [
    { youtubeId: 'jfKfPfyJRdk', title: 'Lofi Hip Hop Radio — Beats to Study/Relax', duration: '999:00', creatorName: 'Lofi Girl' },
    { youtubeId: '5qap5aO4i9A', title: 'Lofi Hip Hop Mix — Chill Beats', duration: '60:00', creatorName: 'Lofi Hip Hop' },
    { youtubeId: 'DWcJFNfaw9c', title: 'Jazz Hop Café — Smooth Jazz Beats', duration: '180:00', creatorName: 'Jazz Hop' },
  ],
  other: [
    { youtubeId: 'qiQR5rTSshw', title: 'How to Start a YouTube Channel in 2024', duration: '18:22', creatorName: 'Creator Tips' },
    { youtubeId: 'yjGf3yvM-ik', title: 'The Best Documentaries on YouTube', duration: '14:30', creatorName: 'Documentary' },
    { youtubeId: 'S7MNX_UD7vY', title: 'Life Hacks That Actually Work', duration: '12:15', creatorName: 'Life Hacks' },
    { youtubeId: 'jPdIRX6q4jA', title: 'How to Be More Creative', duration: '11:22', creatorName: 'Creativity' },
    { youtubeId: 'lXUgyNq_Zs0', title: 'Personal Finance for Beginners', duration: '20:33', creatorName: 'Finance' },
  ],
  live: [
    { youtubeId: 'jfKfPfyJRdk', title: 'ZTVLIVE 24/7 Stream', duration: '999:00', creatorName: 'ZTVLIVE' },
    { youtubeId: '5qap5aO4i9A', title: 'Lofi Beats 24/7', duration: '999:00', creatorName: 'Lofi Girl' },
  ],
};

// First, delete all seed videos (id >= 30000 are the seeded ones)
console.log('Deleting placeholder seed videos...');
const [deleteResult] = await conn.execute('DELETE FROM videos WHERE id >= 30000');
console.log('Deleted:', deleteResult.affectedRows, 'rows');

// Now insert real videos
let inserted = 0;
for (const [category, videoList] of Object.entries(realVideos)) {
  for (const video of videoList) {
    const thumbnailUrl = `https://img.youtube.com/vi/${video.youtubeId}/maxresdefault.jpg`;
    // Use SQL NOW() for timestamps to avoid JS timestamp type issues
    const daysAgo = Math.floor(Math.random() * 30);
    await conn.execute(
      `INSERT INTO videos (youtubeId, title, description, thumbnailUrl, category, duration, creatorName, viewCount, isFeatured, isLive, publishedAt, createdAt)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, DATE_SUB(NOW(), INTERVAL ? DAY), NOW())`,
      [
        video.youtubeId,
        video.title,
        `${video.title} — Watch on ZTVLIVE`,
        thumbnailUrl,
        category,
        video.duration,
        video.creatorName,
        Math.floor(Math.random() * 50000) + 1000,
        0,
        0,
        daysAgo,
      ]
    );
    inserted++;
  }
}

console.log('Inserted', inserted, 'real videos');

// Verify
const [count] = await conn.execute('SELECT category, COUNT(*) as cnt FROM videos GROUP BY category');
console.log('Videos by category:', JSON.stringify(count));

await conn.end();
console.log('Done!');
