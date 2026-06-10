const TERRESTRIAL = [
  "Wall", "Street", "Small Building", "Building", "Large Building",
  "Small City Block", "City Block", "Multi-City Block",
  "Small Town", "Town", "Large Town",
  "Small City", "City", "Large City",
  "Mountain", "Large Mountain",
  "Island", "Large Island",
  "Small Country", "Country", "Large Country",
  "Continental", "Multi-Continental"
];

const COSMIC = [
  "Small Moon", "Moon",
  "Small Planet", "Planet", "Large Planet",
  "Dwarf Star", "Small Star", "Star",
  "Solar System", "Multi-Solar System",
  "Galaxy", "Multi-Galaxy", "Universe"
];

export const STRENGTH_TIERS = [
  "Below Average Human",
  "Human",
  "Peak Human",
  ...TERRESTRIAL,
  ...COSMIC.flatMap((t) => ["Low " + t, t, "High " + t])
];

export const SPEED_TIERS = [
  "Below Average Human", "Average Human", "Athletic Human", "Peak Human",
  "Superhuman", "Subsonic", "Subsonic+", "Transonic",
  "Supersonic", "Supersonic+", "Hypersonic", "Hypersonic+",
  "High Hypersonic", "High Hypersonic+",
  "Massively Hypersonic", "Massively Hypersonic+",
  "Sub-Relativistic", "Sub-Relativistic+",
  "Relativistic", "Relativistic+",
  "Speed of Light", "FTL", "FTL+",
  "Massively FTL", "Massively FTL+", "Infinite", "Immeasurable"
];

export const IQ_TIERS = [
  "Below Average", "Average", "Above Average", "Gifted",
  "Genius", "Extraordinary Genius", "Supergenius", "Supreme Intellect"
];

export const FIGHTING_TIERS = [
  "Bad", "Average", "Decent", "Good", "Incredible",
  "Superhuman", "Supreme", "Transcendent", "Godly", "Absolute"
];

export const DURABILITY_TIERS = STRENGTH_TIERS;

export const CATEGORIES = [
  { key: "strength",   title: "Strength",       items: STRENGTH_TIERS   },
  { key: "speed",      title: "Speed",           items: SPEED_TIERS      },
  { key: "iq",         title: "IQ",              items: IQ_TIERS         },
  { key: "fighting",   title: "Fighting Skill",  items: FIGHTING_TIERS   },
  { key: "durability", title: "Durability",       items: DURABILITY_TIERS }
];

// Every value below must exactly match a string in the corresponding tiers array.
// These are placeholders for testing and are not real scaling claims - edit freely.
export const GOKU = {
  version:    "Goku",
  strength:   "Universe",
  speed:      "FTL+",
  iq:         "Above Average",
  fighting:   "Godly",
  durability: "Universe"
};

// Hand-tunable verdict thresholds.
const DOMINANT_EDGE_COUNT   = 3;    // categories above Goku needed for a dominant win
const NARROW_LOSS_CLOSENESS = 0.85; // closeness at or above this is a narrow loss
const SOLID_LOSS_CLOSENESS  = 0.55; // closeness at or above this is a solid loss

export function decideOutcome(results) {
  var shortfalls = [];
  var edges = [];
  var ratioSum = 0;
  CATEGORIES.forEach(function(cat) {
    var fighterIdx = cat.items.indexOf(results[cat.key]);
    var gokuIdx    = cat.items.indexOf(GOKU[cat.key]);
    if (fighterIdx < gokuIdx)      shortfalls.push(cat.title);
    else if (fighterIdx > gokuIdx) edges.push(cat.title);
    // Closeness is the average per-stat ratio to Goku's index, so each stat
    // weighs equally even though the tier ladders have different lengths.
    ratioSum += Math.min(1, fighterIdx / Math.max(1, gokuIdx));
  });
  var closeness = ratioSum / CATEGORIES.length;

  var bucket;
  if (shortfalls.length === 0 && edges.length > 0) {
    bucket = edges.length >= DOMINANT_EDGE_COUNT ? "DOMINANT_WIN" : "NARROW_WIN";
  } else if (shortfalls.length === 0 && edges.length === 0) {
    bucket = "DRAW";
  } else {
    bucket = closeness >= NARROW_LOSS_CLOSENESS ? "NARROW_LOSS"
           : closeness >= SOLID_LOSS_CLOSENESS  ? "SOLID_LOSS"
           : "CRUSHED";
  }
  return { bucket: bucket, shortfalls: shortfalls, edges: edges, closeness: closeness };
}

export const FLAVOR_TEXT = {
  DOMINANT_WIN: [
    "A total stomp. Somebody check on Goku.",
    "They did not beat Goku, they dismantled him. Every column, theirs.",
    "{strength} output past the ceiling, and that was just the opening statement.",
    "Goku has fought gods. He has never fought this. A wipeout.",
    "{speed} movement Goku could not track and {fighting} technique he could not solve.",
    "The scorecard reads like a coronation. A new name sits at the top."
  ],
  NARROW_WIN: [
    "They squeaked it out. Goku finally met the wall, and it barely held.",
    "By the thinnest of margins, the impossible just happened.",
    "{fighting} skill found the one opening Goku could not close. What a finish.",
    "It went the distance and then some. The upset lands by a single tier.",
    "{strength} power, just enough of it, exactly when it mattered. Goku falls.",
    "At {speed}, they stayed one half-step ahead all night. That half-step won it."
  ],
  DRAW: [
    "Dead even. Run it back, because nobody is settling this today.",
    "Tier for tier, blow for blow, a perfect stalemate.",
    "Matched at {strength} and {speed}. Neither side blinks.",
    "The judges checked every column twice. Identical. Unbelievable.",
    "{fighting} skill on both sides of the ring. A mirror match for the ages.",
    "Two fighters, one ceiling. Nobody goes home with the belt."
  ],
  NARROW_LOSS: [
    "Inches. That is all that separated this fighter from the upset of the century.",
    "They matched Goku blow for blow until the very last exchange. So close it hurts.",
    "{fighting} skill nearly closed the deal. One step short of dethroning a legend.",
    "A razor-thin decision. One more tier anywhere and we are telling a different story.",
    "{strength} power against Goku and they almost pulled it off. Almost.",
    "At {speed}, they came within inches. The arena may never be this loud again."
  ],
  SOLID_LOSS: [
    "A real fighter, a real effort, and still a clear win for Goku.",
    "{fighting} technique kept them in the exchanges, but the gaps were too wide to hide.",
    "They pushed Goku to actually work. The judges still only needed one card.",
    "{strength} power landed some real shots. Goku absorbed them and answered harder.",
    "Respectable in every round, winning in none of them.",
    "At {speed} they made Goku chase. Catching him is a different sport."
  ],
  CRUSHED: [
    "Not even close. Goku barely had to warm up.",
    "{strength}-level power is a fine party trick. It is not a Goku answer.",
    "They walked in at {speed} and the fight was over before they crossed the ring.",
    "Heart of a champion, stats of a sparring dummy. They did not belong in this ring.",
    "Total mismatch from the opening bell. The crowd winced.",
    "{durability}-tier durability just means the loss took a little longer."
  ]
};

export function fillTemplate(line, values) {
  return line
    .replace(/\{strength\}/g,   values.strength   || "")
    .replace(/\{speed\}/g,      values.speed      || "")
    .replace(/\{iq\}/g,         values.iq         || "")
    .replace(/\{fighting\}/g,   values.fighting   || "")
    .replace(/\{durability\}/g, values.durability || "");
}
