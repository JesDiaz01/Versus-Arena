// Each tier is { name, desc }. The wheel renders only the short name (via
// tierNames); desc is shown under the landed result and in the scorecard.

export function tierNames(items) {
  return items.map(function(i) { return i.name; });
}

export function tierDesc(items, name) {
  for (var i = 0; i < items.length; i++) {
    if (items[i].name === name) return items[i].desc;
  }
  return "";
}

// Ordered low to high; index = ranking.
export const STRENGTH_TIERS = [
  { name: "Low Hypoverse level",           desc: "The faintest reaches of lower-dimensional existence." },
  { name: "Hypoverse level",               desc: "Power bound to lower-dimensional space." },
  { name: "High Hypoverse level",          desc: "The peak of lower-dimensional power." },
  { name: "Below Average Human level",     desc: "Weaker than an ordinary person." },
  { name: "Human level",                   desc: "An ordinary person's strength." },
  { name: "Athlete level",                 desc: "A trained athlete's strength." },
  { name: "Street level",                  desc: "Can overpower several people at once." },
  { name: "Wall level",                    desc: "Can break through a wall." },
  { name: "Small Building level",          desc: "Can destroy a small house." },
  { name: "Building level",                desc: "Can destroy a building." },
  { name: "Large Building level",          desc: "Can destroy a skyscraper." },
  { name: "City Block level",              desc: "Can level a city block." },
  { name: "Multi-City Block level",        desc: "Can level several city blocks." },
  { name: "Small Town level",              desc: "Can destroy a small town." },
  { name: "Town level",                    desc: "Can destroy a town." },
  { name: "Large Town level",              desc: "Can destroy a large town." },
  { name: "Small City level",              desc: "Can destroy a small city." },
  { name: "City level",                    desc: "Can destroy a city." },
  { name: "Mountain level",                desc: "Can destroy a mountain." },
  { name: "Large Mountain level",          desc: "Can destroy a huge mountain." },
  { name: "Island level",                  desc: "Can destroy an island." },
  { name: "Large Island level",            desc: "Can destroy a large island." },
  { name: "Small Country level",           desc: "Can destroy a small country." },
  { name: "Country level",                 desc: "Can destroy a country." },
  { name: "Large Country level",           desc: "Can destroy a large country." },
  { name: "Continent level",               desc: "Can destroy a continent." },
  { name: "Multi-Continent level",         desc: "Can destroy multiple continents." },
  { name: "Moon level",                    desc: "Can destroy a moon." },
  { name: "Small Planet level",            desc: "Can destroy a small planet." },
  { name: "Planet level",                  desc: "Can destroy a planet." },
  { name: "Large Planet level",            desc: "Can destroy a giant planet." },
  { name: "Brown Dwarf level",             desc: "Can destroy a brown dwarf." },
  { name: "Small Star level",              desc: "Can destroy a small star." },
  { name: "Star level",                    desc: "Can destroy a star." },
  { name: "Large Star level",              desc: "Can destroy a giant star." },
  { name: "Solar System level",            desc: "Can destroy a solar system." },
  { name: "Multi-Solar System level",      desc: "Can destroy multiple star systems." },
  { name: "Galaxy level",                  desc: "Can destroy a galaxy." },
  { name: "Multi-Galaxy level",            desc: "Can destroy multiple galaxies." },
  { name: "Universe level",                desc: "Can destroy a universe." },
  { name: "High Universe level",           desc: "Can destroy a universe of infinite size." },
  { name: "Universe level+",               desc: "Can destroy a universe across all of space and time." },
  { name: "Low Multiverse level",          desc: "Can affect up to a thousand universes." },
  { name: "Multiverse level",              desc: "Can affect thousands of universes." },
  { name: "Multiverse level+",             desc: "Can affect infinitely many universes." },
  { name: "Low Complex Multiverse level",  desc: "Operates across 5 to 6 spatial dimensions." },
  { name: "Complex Multiverse level",      desc: "Operates across 7 to 11 dimensions." },
  { name: "High Complex Multiverse level", desc: "Operates across 12 or more dimensions." },
  { name: "Hyperverse level",              desc: "Surpasses any finite number of dimensions." },
  { name: "High Hyperverse level",         desc: "Spans infinitely many dimensions at once." },
  { name: "Low Outerverse level",          desc: "Acts beyond the concept of dimensions entirely." },
  { name: "Outerverse level",              desc: "Stands above all dimensional space as a whole." },
  { name: "Outerverse level+",             desc: "Towers countless steps above the dimensionless." },
  { name: "High Outerverse level",         desc: "Sits at the top of the beyond-dimensional hierarchy." },
  { name: "Inapplicable",                  desc: "So far beyond measure the scale no longer applies." }
];

export const SPEED_TIERS = [
  { name: "Below Average Human",   desc: "Slower than an ordinary person." },
  { name: "Average Human",         desc: "An ordinary person's speed." },
  { name: "Athletic Human",        desc: "A trained athlete's speed." },
  { name: "Peak Human",            desc: "The fastest a human can move." },
  { name: "Superhuman",            desc: "Faster than any human could be." },
  { name: "Subsonic",              desc: "Slower than sound, but barely." },
  { name: "Subsonic+",             desc: "Approaching the speed of sound." },
  { name: "Transonic",             desc: "Right around the sound barrier." },
  { name: "Supersonic",            desc: "Faster than sound." },
  { name: "Supersonic+",           desc: "Several times the speed of sound." },
  { name: "Hypersonic",            desc: "Five or more times the speed of sound." },
  { name: "Hypersonic+",           desc: "Ten or more times the speed of sound." },
  { name: "High Hypersonic",       desc: "Twenty-five or more times the speed of sound." },
  { name: "High Hypersonic+",      desc: "Fifty or more times the speed of sound." },
  { name: "Massively Hypersonic",  desc: "A hundred or more times the speed of sound." },
  { name: "Massively Hypersonic+", desc: "Hundreds of times the speed of sound." },
  { name: "Sub-Relativistic",      desc: "A noticeable fraction of light speed." },
  { name: "Sub-Relativistic+",     desc: "Over a tenth of light speed." },
  { name: "Relativistic",          desc: "A large fraction of light speed." },
  { name: "Relativistic+",         desc: "Over half the speed of light." },
  { name: "Speed of Light",        desc: "As fast as light itself." },
  { name: "FTL",                   desc: "Faster than light." },
  { name: "FTL+",                  desc: "Many times faster than light." },
  { name: "Massively FTL",         desc: "Thousands of times faster than light." },
  { name: "Massively FTL+",        desc: "Beyond all measurable light speed." },
  { name: "Infinite",              desc: "Moves without any limit of speed." },
  { name: "Immeasurable",          desc: "Beyond the concept of speed entirely." }
];

export const IQ_TIERS = [
  { name: "Below Average",        desc: "Slower to reason than most people." },
  { name: "Average",              desc: "An ordinary person's intelligence." },
  { name: "Above Average",        desc: "Sharper than most people." },
  { name: "Gifted",               desc: "Notably brilliant." },
  { name: "Genius",               desc: "Among the smartest people alive." },
  { name: "Extraordinary Genius", desc: "A once-in-a-generation mind." },
  { name: "Supergenius",          desc: "Intellect far beyond any human." },
  { name: "Supreme Intellect",    desc: "Near-omniscient understanding." }
];

export const FIGHTING_TIERS = [
  { name: "Bad",          desc: "Little to no combat ability." },
  { name: "Average",      desc: "Can hold their own in a basic fight." },
  { name: "Decent",       desc: "Competent, with real training." },
  { name: "Good",         desc: "A skilled and capable fighter." },
  { name: "Incredible",   desc: "A master of combat." },
  { name: "Superhuman",   desc: "Skill beyond human limits." },
  { name: "Supreme",      desc: "Among the greatest fighters to ever live." },
  { name: "Transcendent", desc: "Combat skill bordering on the divine." },
  { name: "Godly",        desc: "Flawless, godlike mastery of battle." },
  { name: "Absolute",     desc: "Perfect, unbeatable technique." }
];

// Array order is the ranking for v1 (Below Average lowest, Inapplicable highest).
// This ordering is intentional and hand-tunable.
export const STAMINA_TIERS = [
  { name: "Below Average", desc: "Exhausted by mild exertion, disabled by basic injuries." },
  { name: "Average",       desc: "Typical human stamina and pain tolerance." },
  { name: "Athletic",      desc: "Above average human stamina and pain tolerance." },
  { name: "Peak Human",    desc: "Pushes to the limit of any normal human's stamina." },
  { name: "Superhuman",    desc: "Fights for long periods, through great pain and grievous injury." },
  { name: "Godly",         desc: "Endures punishment far beyond any mortal, fighting on through devastating harm, though not truly without end." },
  { name: "Infinite",      desc: "Inexhaustible energy, can fight indefinitely." },
  { name: "Inapplicable",  desc: "Exists beyond quantitative and qualitative distinction." }
];

// Ordered low to high; index = ranking.
export const RANGE_TIERS = [
  { name: "Below Standard Melee Range", desc: "0-50cm" },
  { name: "Standard Melee Range",       desc: "50cm-1m" },
  { name: "Extended Melee Range",       desc: "1-3m" },
  { name: "Several Meters",             desc: "3-10m" },
  { name: "Tens of Meters",             desc: "10-100m" },
  { name: "Hundreds of Meters",         desc: "100-1000m" },
  { name: "Kilometers",                 desc: "1-10km" },
  { name: "Tens of Kilometers",         desc: "10-100km" },
  { name: "Hundreds of Kilometers",     desc: "100-1000km" },
  { name: "Thousands of Kilometers",    desc: "1000-20037km" },
  { name: "Planetary",                  desc: "Planet-wide reach." },
  { name: "Stellar",                    desc: "Star-scale reach." },
  { name: "Interplanetary",             desc: "Reaches across a solar system." },
  { name: "Interstellar",               desc: "Reaches between star systems." },
  { name: "Galactic",                   desc: "Galaxy-wide reach." },
  { name: "Intergalactic",              desc: "Reaches between galaxies." },
  { name: "Universal",                  desc: "Strikes anywhere in the universe." },
  { name: "High Universal",             desc: "Reaches across a universe of infinite size." },
  { name: "Universal+",                 desc: "Reaches through all of space and time at once." },
  { name: "Interdimensional",           desc: "Reaches into other dimensions." },
  { name: "Low Multiversal",            desc: "Reaches up to a thousand universes." },
  { name: "Multiversal",                desc: "Reaches thousands of universes." },
  { name: "Multiversal+",               desc: "Reaches infinitely many universes." },
  { name: "Extradimensional",           desc: "Reaches outside normal space and time." },
  { name: "Low Complex Multiversal",    desc: "Reaches across 5 to 6 dimensions." },
  { name: "Complex Multiversal",        desc: "Reaches across 7 to 11 dimensions." },
  { name: "High Complex Multiversal",   desc: "Reaches across 12 or more dimensions." },
  { name: "Hyperversal",                desc: "Reaches past any finite number of dimensions." },
  { name: "High Hyperversal",           desc: "Reaches across infinitely many dimensions." },
  { name: "Low Outerversal",            desc: "Reaches beyond dimensions entirely." },
  { name: "Outerversal",                desc: "Reaches above all dimensional space." },
  { name: "Outerversal+",               desc: "Reaches countless steps beyond the dimensionless." },
  { name: "High Outerversal",           desc: "Reaches the top of the beyond-dimensional hierarchy." },
  { name: "High Outerversal+",          desc: "Reaches every logically possible world." },
  { name: "Boundless",                  desc: "Reach with no limit of any kind." }
];

// Durability intentionally mirrors Strength: same shared array, same
// descriptions, so the two ladders can never drift apart.
export const DURABILITY_TIERS = STRENGTH_TIERS;

export const CATEGORIES = [
  { key: "strength",   title: "Strength",       blurb: "How much raw power the fighter hits with.",      items: STRENGTH_TIERS   },
  { key: "durability", title: "Durability",     blurb: "How much punishment the fighter can take.",      items: DURABILITY_TIERS },
  { key: "speed",      title: "Speed",          blurb: "How fast the fighter moves and reacts.",         items: SPEED_TIERS      },
  { key: "stamina",    title: "Stamina",        blurb: "How long the fighter can keep going.",           items: STAMINA_TIERS    },
  { key: "range",      title: "Range",          blurb: "How far the fighter's attacks can reach.",       items: RANGE_TIERS      },
  { key: "iq",         title: "IQ",             blurb: "How smart the fighter is in and out of battle.", items: IQ_TIERS         },
  { key: "fighting",   title: "Fighting Skill", blurb: "How refined the fighter's technique is.",        items: FIGHTING_TIERS   }
];

// Every value below must exactly match a tier name in the corresponding list.
// These are placeholders for testing and are not real scaling claims - edit freely.
export const GOKU = {
  version:    "Goku",
  strength:   "Universe level",
  durability: "Universe level",
  speed:      "FTL+",
  stamina:    "Godly",
  range:      "Interplanetary",
  iq:         "Above Average",
  fighting:   "Godly"
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
    var names = tierNames(cat.items);
    var fighterIdx = names.indexOf(results[cat.key]);
    var gokuIdx    = names.indexOf(GOKU[cat.key]);
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
    "{strength} power is a fine party trick. It is not a Goku answer.",
    "They walked in at {speed} and the fight was over before they crossed the ring.",
    "Heart of a champion, stats of a sparring dummy. They did not belong in this ring.",
    "Total mismatch from the opening bell. The crowd winced.",
    "{durability} durability just means the loss took a little longer."
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
