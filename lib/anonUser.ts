import crypto from "crypto";

const ANONYMOUS_ADJECTIVES = [
  "Mystic",
  "Shadow",
  "Silent",
  "Quantum",
  "Phantom",
  "Stealth",
  "Cosmic",
  "Lunar",
  "Solar",
  "Neon",
  "Cipher",
  "Zenith",
  "Crimson",
  "Nebula",
  "Aura",
  "Echo",
];

const ANONYMOUS_NOUNS = [
  "Badger",
  "Falcon",
  "Panther",
  "Owl",
  "Raven",
  "Fox",
  "Wolf",
  "Otter",
  "Phoenix",
  "Hawk",
  "Lynx",
  "Dragon",
  "Viper",
  "Sparrow",
  "Tiger",
  "Ghost",
];

/**
 * Generate a friendly, fun, deterministic persona from an anonymous UUID
 * e.g. "Phantom Owl #8F2A"
 */
export function getAnonymousPersona(anonUserId: string): {
  name: string;
  tag: string;
  badgeColor: string;
  avatarSeed: string;
} {
  if (!anonUserId) {
    return {
      name: "Anonymous Student",
      tag: "#0000",
      badgeColor: "#6C1C74",
      avatarSeed: "anon",
    };
  }

  // Derive simple numeric hashes from the UUID
  let num = 0;
  for (let i = 0; i < anonUserId.length; i++) {
    num = (num << 5) - num + anonUserId.charCodeAt(i);
    num |= 0;
  }
  const positive = Math.abs(num);

  const adj = ANONYMOUS_ADJECTIVES[positive % ANONYMOUS_ADJECTIVES.length];
  const noun = ANONYMOUS_NOUNS[(positive >> 4) % ANONYMOUS_NOUNS.length];
  const cleanId = anonUserId.replace(/^usr_/, "");
  const tag = `#${(cleanId.slice(0, 4) || "74A1").toUpperCase()}`;

  // Palette centered around #6C1C74 and high-contrast complementary shades
  const colors = [
    "#6C1C74", // Rich Purple
    "#8B2A94",
    "#4A1250",
    "#9D31A8",
    "#55125E",
    "#7D2187",
    "#A338AE",
  ];
  const badgeColor = colors[positive % colors.length];

  return {
    name: `${adj} ${noun}`,
    tag,
    badgeColor,
    avatarSeed: anonUserId.slice(-6),
  };
}

/**
 * Generate a Voter Hash that uniquely binds a vote to an anonymous user session
 * without storing or exposing their IP or client secret.
 */
export function generateVoterHash(anonUserId: string, clientIp: string = ""): string {
  const salt = process.env.RATE_LIMIT_SALT || "superior_connection_voter_salt";
  const payload = `${anonUserId}:${clientIp.trim()}:${salt}`;
  return crypto.createHash("sha256").update(payload).digest("hex");
}
