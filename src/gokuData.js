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
// These are placeholders for testing and are not real scaling claims — edit freely.
export const GOKU = {
  version:    "True Ultra Instinct, Super Dragon Ball Heroes",
  strength:   "Universe",
  speed:      "FTL+",
  iq:         "Above Average",      // EDIT ME
  fighting:   "Godly",              // EDIT ME
  durability: "Universe"
};

export function decideOutcome(results) {
  var shortfalls = [];
  var edges = [];
  CATEGORIES.forEach(function(cat) {
    var fighterIdx = cat.items.indexOf(results[cat.key]);
    var gokuIdx    = cat.items.indexOf(GOKU[cat.key]);
    if (fighterIdx < gokuIdx)      shortfalls.push(cat.title);
    else if (fighterIdx > gokuIdx) edges.push(cat.title);
  });
  var result = shortfalls.length === 0 && edges.length > 0 ? "WIN"
             : shortfalls.length === 0 && edges.length === 0 ? "DRAW"
             : "LOSS";
  return { result: result, shortfalls: shortfalls, edges: edges };
}

export const FLAVOR_TEXT = {
  WIN: [
    "At {strength} and {speed}, this fighter clears every bar {version} sets. Not close.",
    "{fighting} technique and {iq} intellect land above {version} across the board. Goku falls.",
    "Moving at {speed} with {strength} output puts them past {version}. The verdict is clear.",
    "A {fighting} fighter at {iq} IQ operating at {speed} — this is exactly what beating Goku looks like.",
    "{strength}, {speed}, {iq}, {fighting} — each clears the ceiling. {version} has no answer."
  ],
  DRAW: [
    "Matched at {strength} and {speed} — the same coordinates as {version}. Neither side breaks.",
    "{fighting} skill and {iq} IQ land exactly even with {version}. A perfect stalemate.",
    "At {speed} and {fighting}, this fighter ties {version} precisely. No winner from this one.",
    "{strength} power, {iq} intellect — dead even with {version} in every column.",
    "Tier for tier: {strength}, {speed}, {fighting}, {iq}. {version} and this fighter are the same."
  ],
  LOSS: [
    "The {strength} and {speed} are real, but not across the board. {version} finds the gap.",
    "Strong in spots — {strength}, {fighting} — but the shortfall stats hand the win to {version}.",
    "{iq} IQ and {fighting} skill keep this competitive. The gaps elsewhere seal the result.",
    "At {speed} and {strength}, there is something here. Just not enough to outlast {version}.",
    "{version} exploits the missing tiers. A {fighting} fighter at {strength} still falls short."
  ]
};

export function fillTemplate(line, values) {
  return line
    .replace(/\{version\}/g,  values.version  || "")
    .replace(/\{strength\}/g, values.strength || "")
    .replace(/\{speed\}/g,    values.speed    || "")
    .replace(/\{iq\}/g,       values.iq       || "")
    .replace(/\{fighting\}/g, values.fighting || "");
}
