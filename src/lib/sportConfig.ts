export interface SportConfig {
  statKeys: readonly string[];
  statLabels: Record<string, { abbrev: string; full: string }>;
  primaryStat: string;
  computedStatLabel: string;
  scoreLabel: string;
}

export const SPORT_CONFIGS: Record<string, SportConfig> = {
  Basketball: {
    statKeys: ["pts", "ast", "reb", "blk", "stl"],
    statLabels: {
      pts: { abbrev: "PTS", full: "Points" },
      ast: { abbrev: "AST", full: "Assists" },
      reb: { abbrev: "REB", full: "Rebounds" },
      blk: { abbrev: "BLK", full: "Blocks" },
      stl: { abbrev: "STL", full: "Steals" },
    },
    primaryStat: "pts",
    computedStatLabel: "PPG",
    scoreLabel: "Points",
  },
  Soccer: {
    statKeys: ["gls", "ast", "sv", "yc", "rc"],
    statLabels: {
      gls: { abbrev: "GLS", full: "Goals" },
      ast: { abbrev: "AST", full: "Assists" },
      sv:  { abbrev: "SV",  full: "Saves" },
      yc:  { abbrev: "YC",  full: "Yellow Cards" },
      rc:  { abbrev: "RC",  full: "Red Cards" },
    },
    primaryStat: "gls",
    computedStatLabel: "GPG",
    scoreLabel: "Goals",
  },
  Softball: {
    statKeys: ["h", "rbi", "hr", "r", "bb"],
    statLabels: {
      h:   { abbrev: "H",   full: "Hits" },
      rbi: { abbrev: "RBI", full: "RBIs" },
      hr:  { abbrev: "HR",  full: "Home Runs" },
      r:   { abbrev: "R",   full: "Runs" },
      bb:  { abbrev: "BB",  full: "Walks" },
    },
    primaryStat: "rbi",
    computedStatLabel: "RBIPG",
    scoreLabel: "Runs",
  },
  Football: {
    statKeys: ["td", "yds", "int", "sk", "fmb"],
    statLabels: {
      td:  { abbrev: "TD",  full: "Touchdowns" },
      yds: { abbrev: "YDS", full: "Yards" },
      int: { abbrev: "INT", full: "Interceptions" },
      sk:  { abbrev: "SK",  full: "Sacks" },
      fmb: { abbrev: "FMB", full: "Fumbles" },
    },
    primaryStat: "td",
    computedStatLabel: "TDPG",
    scoreLabel: "Points",
  },
  Volleyball: {
    statKeys: ["k", "ast", "ace", "blk", "digs"],
    statLabels: {
      k:    { abbrev: "K",    full: "Kills" },
      ast:  { abbrev: "AST",  full: "Assists" },
      ace:  { abbrev: "ACE",  full: "Aces" },
      blk:  { abbrev: "BLK",  full: "Blocks" },
      digs: { abbrev: "DIGS", full: "Digs" },
    },
    primaryStat: "k",
    computedStatLabel: "KPG",
    scoreLabel: "Points",
  },
  Hockey: {
    statKeys: ["g", "ast", "pim", "sv", "pm"],
    statLabels: {
      g:   { abbrev: "G",   full: "Goals" },
      ast: { abbrev: "AST", full: "Assists" },
      pim: { abbrev: "PIM", full: "Penalty Mins" },
      sv:  { abbrev: "SV",  full: "Saves" },
      pm:  { abbrev: "+/-", full: "Plus/Minus" },
    },
    primaryStat: "g",
    computedStatLabel: "GPG",
    scoreLabel: "Goals",
  },
};

const BASKETBALL_FALLBACK = SPORT_CONFIGS["Basketball"];

export function getSportConfig(sport: string): SportConfig {
  return SPORT_CONFIGS[sport] ?? BASKETBALL_FALLBACK;
}
