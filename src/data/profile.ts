/**
 * Single source of truth for the portfolio.
 *
 * Images: every item below accepts an optional `image` string. Drop a file in
 * `public/` (e.g. `public/media/school.jpg`) and set `image: "/media/school.jpg"`.
 * While `image` is undefined the UI renders a labelled placeholder frame instead,
 * so the layout never breaks while the real assets are being collected.
 */

export const profile = {
  name: "Priyanshu Bisht",
  brand: "priyanshubishtme",
  headline: "Hi, I'm Priyanshu",
  tagline:
    "Nineteen, a builder and creator, curious about tech, people, ideas and life.",
  location: "Rudrapur, Uttarakhand, India",
  age: 19,
  email: "priyanshubisht.me@gmail.com",
  resume: "/resume.pdf",
  notesIntro: "A place to share ideas and have meaningful conversations.",
  notesOutro:
    "Want to talk about this? Book a session or send me an email.",
  /** Hero portrait. Replace with a real photo path when available, e.g. "/media/portrait.jpg". */
  portrait: undefined,
  portraitCaption: "Portrait · replace with your photo",
} as const;

export type Scene = {
  id: string;
  stop: string;
  period: string;
  title: string;
  body: string;
  note?: string;
  image?: string;
};

/** Stops along the 3D bus journey, in the order the bus reaches them. */
export const journeyScenes: Scene[] = [
  {
    id: "school-days",
    stop: "01",
    period: "2022 — 2024",
    title: "School days",
    body: "Computer science was the first subject where I could build instead of memorise. Classes 11 and 12 pulled me in completely — by the end I knew I wanted to make things, not just study them.",
    note: "Jaycees Public School",
  },
  {
    id: "first-hackathon",
    stop: "02",
    period: "The first attempt",
    title: "A beginning, not an end",
    body: "My first hackathon ended with a project that didn't work the way we planned. It taught me more than any course: shipping something imperfect beats not shipping at all.",
    note: "First hackathon",
  },
  {
    id: "first-expression",
    stop: "03",
    period: "The stage",
    title: "Learning to speak",
    body: "For a long time I stayed quiet in rooms full of people. Walking on stage to introduce myself — unprepared and unsure — changed that. Still building the habit, one event at a time.",
    note: "First public expression",
  },
  {
    id: "budget-lens",
    stop: "04",
    period: "2026",
    title: "Eight minutes",
    body: "Eight minutes of presentation and a sharper Q&A round earned us first prize. Proof that preparation and a clear point of view hold up under pressure.",
    note: "Budget Lens · First prize",
  },
  {
    id: "things-that-work",
    stop: "05",
    period: "Building",
    title: "Things that work",
    body: "AshaPure, a MERN dairy platform I owned end to end — 18 routes, 25 endpoints, roles, subscriptions, rewards. And Arena, a reinforcement-learning agent learning to drive with tabular SARSA on a highway.",
    note: "Two builds, two worlds",
  },
  {
    id: "today",
    stop: "06",
    period: "2026 — Present",
    title: "Software Engineer Intern",
    body: "At ElvoraGo I build client-focused web solutions across frontend, backend, APIs and databases, and lead client outreach from first requirement to delivery.",
    note: "ElvoraGo",
  },
  {
    id: "what-drives-me",
    stop: "07",
    period: "Always",
    title: "What drives me",
    body: "Building things that work, learning in public, and helping the people a step behind me. I don't have it all figured out — nobody does at nineteen — but I'd rather try and adjust than wait for certainty.",
    note: "The story so far",
  },
];

export type RouteStop = {
  id: string;
  kind: "Education" | "Experience";
  title: string;
  place: string;
  period: string;
  grade?: string;
  points: string[];
};

/** Dot-bus route: every education and experience stop, in chronological order. */
export const routeStops: RouteStop[] = [
  {
    id: "jaycees",
    kind: "Education",
    title: "Intermediate · Senior Secondary",
    place: "Jaycees Public School",
    period: "May 2022 — May 2024",
    grade: "86%",
    points: [
      "Where coding became something I could actually build with.",
    ],
  },
  {
    id: "gehu",
    kind: "Education",
    title: "BCA in AI & Data Science",
    place: "Graphic Era Hill University",
    period: "Jul 2024 — Jul 2027",
    grade: "CGPA 9.48",
    points: [
      "Studying AI and data science alongside full-stack product work.",
      "Hackathons, coding contests and design sprints across the university circuit.",
    ],
  },
  {
    id: "elvorago",
    kind: "Experience",
    title: "Software Engineer Intern",
    place: "ElvoraGo",
    period: "Sep 2026 — Present",
    points: [
      "Develop client-focused web solutions across frontend, backend, APIs and databases — turning requirements into functional, scalable work.",
      "Lead client outreach and networking: prospecting, requirement gathering, project coordination and delivery.",
    ],
  },
];

export type Win = {
  id: string;
  tier: "Gold" | "Silver" | "Bronze";
  title: string;
  event: string;
  year: string;
  placing: string;
  story: string;
  image?: string;
};

/** Every win, one page each in the wins book. */
export const wins: Win[] = [
  {
    id: "codecraft-2025",
    tier: "Gold",
    title: "CodeCraft 2025",
    event: "Hack the Spring · Bhimtal",
    year: "2025",
    placing: "1st position",
    story:
      "A coding competition in the hills that we walked into to see where we stood. First position. The useful part was watching how much of it came down to reading the problem carefully before typing anything.",
  },
  {
    id: "budget-lens-2026",
    tier: "Gold",
    title: "Budget Lens 2026",
    event: "Presentation & Q&A",
    year: "2026",
    placing: "First prize",
    story:
      "Eight minutes to present, then a harder round of questions. Preparation and a clear point of view held up under pressure — first prize, and the first time I trusted my own structure on stage.",
  },
  {
    id: "design-spark-2026",
    tier: "Silver",
    title: "Design Spark 2026",
    event: "Design competition",
    year: "2026",
    placing: "Runner up",
    story:
      "A design-focused sprint. Runner up, and a reminder that restraint and clarity usually beat decoration when you have to explain an idea quickly.",
  },
  {
    id: "webathon-2",
    tier: "Silver",
    title: "Webathon 2.0",
    event: "Web build-off",
    year: "2026",
    placing: "Second runner up",
    story:
      "A build against the clock. Second runner up. Team pressure, a deadline, and a product that had to hold together until the final demo — a good rehearsal for real delivery.",
  },
  {
    id: "tech-quiz",
    tier: "Silver",
    title: "Tech Quiz",
    event: "University level · twice",
    year: "2025 — 2026",
    placing: "2nd position ×2",
    story:
      "A university-level tech quiz, two editions, second position both times. Breadth of curiosity turned out to be worth as much as depth.",
  },
  {
    id: "watch-the-code",
    tier: "Bronze",
    title: "Watch the Code",
    event: "National hackathon",
    year: "2025",
    placing: "Finalist",
    story:
      "A national hackathon final. Making the final round among teams from across the country, and coming back with a much clearer idea of what to build next time.",
  },
  {
    id: "nirvan",
    tier: "Bronze",
    title: "Nirvan",
    event: "National hackathon",
    year: "2025",
    placing: "Finalist",
    story:
      "Another national final. Same lesson as the first hackathon, only louder: an imperfect thing that ships teaches you more than a perfect thing that stays in the notebook.",
  },
  {
    id: "monthly-coding-series",
    tier: "Bronze",
    title: "Monthly Coding Series",
    event: "University-level contests · 3×",
    year: "2025 — 2026",
    placing: "Gold · Silver · Bronze",
    story:
      "Three university-level contests across the year — gold, silver and bronze. The consistency mattered more than any single result: solving under a clock is a skill you keep, not a talent you have.",
  },
];

export const footerLinks: { label: string; href: string; handle?: string }[] = [
  {
    label: "LinkedIn",
    href: "https://linkedin.com/in/priyanshubishtme",
    handle: "priyanshubishtme",
  },
  {
    label: "GitHub",
    href: "https://github.com/priyanshubishtme",
    handle: "priyanshubishtme",
  },
  {
    label: "Instagram",
    href: "https://instagram.com/priyanshubishtme",
    handle: "priyanshubishtme",
  },
  {
    label: "YouTube",
    href: "https://youtube.com/@priyanshubishtme",
    handle: "@priyanshubishtme",
  },
  {
    label: "Linktree",
    href: "https://linktr.ee/priyanshubisht.me",
    handle: "priyanshubisht.me",
  },
  { label: "Email", href: "mailto:priyanshubisht.me@gmail.com", handle: "priyanshubisht.me@gmail.com" },
  { label: "Résumé", href: "/resume.pdf", handle: "PDF" },
];

export const navLinks = [
  { label: "Journey", href: "#journey" },
  { label: "Route", href: "#route" },
  { label: "Wins", href: "#wins" },
  { label: "Contact", href: "#contact" },
];
