export type EntertainmentStyle =
  | "movie_news"
  | "ott_release"
  | "celebrity_interview"
  | "trailer"
  | "box_office"
  | "music_launch"
  | "award_show"
  | "tv_series";

export type EntertainmentLayout = {
  style: EntertainmentStyle;
  label: string;
  composition: string;
  lighting: string;
  mood: string;
  colorPalette: string;
  editorialStyle: string;
  mustIncludeHints: string[];
  mustAvoidHints: string[];
  frameBalance: string;
  promptTemplate: string;
};

const FRAME_BALANCE =
  "Main person ~60-70% of frame; supporting branding ~20-25%; soft background ~10-15%. Platform logos must NEVER be larger than the main person.";

const SHARED_AVOID = [
  "random paper / contract / document",
  "laptop as prop unless mentioned",
  "random microphone",
  "courtroom / scales of justice / gavel",
  "fake awards / trophies unless article is about an award",
  "invented audience crowd",
  "collage / split-screen / diptych",
  "oversized streaming logo dominating the frame",
  "Hindi / Devanagari / Tamil / Telugu / any Indic script lettering",
  "tofu boxes □□□ / empty rectangles / mojibake / red garbled subtitle bars",
  "native-script movie title — use English transliteration only",
];

export const ENTERTAINMENT_STYLES: Record<EntertainmentStyle, EntertainmentLayout> = {
  movie_news: {
    style: "movie_news",
    label: "Movie News",
    composition:
      "Large editorial portrait of lead actor left/center; movie title artwork secondary on the right; soft cinematic bokeh background; premium entertainment poster layout",
    lighting: "warm cinematic soft key light with gentle rim; premium premiere look",
    mood: "glamorous, premium, entertainment editorial",
    colorPalette: "warm golds, soft amber, deep cinematic neutrals",
    editorialStyle: "Variety / Deadline / Hollywood Reporter entertainment thumbnail",
    mustIncludeHints: ["lead actor portrait ~60-70%", "movie title branding in English letters only", "one clear entertainment story"],
    mustAvoidHints: SHARED_AVOID,
    frameBalance: FRAME_BALANCE,
    promptTemplate: `Create a premium editorial entertainment news thumbnail.
Primary subject: {{Actor}}
Supporting subject: {{Movie}}
Visual focus: Actor portrait, Movie branding in English/Latin letters only
Professional entertainment lighting, premium movie poster composition, warm cinematic colors
No fake movie scenes, no random paperwork, no fake awards, no fake audience, no generic background
CRITICAL: Never render Hindi/Tamil/Telugu/Devanagari or tofu □□□ boxes. English transliteration only for titles.
One clear entertainment story.`,
  },
  ott_release: {
    style: "ott_release",
    label: "OTT Release",
    composition:
      "Large editorial portrait of lead actor (~60-70% left/center); movie/series title branding secondary; streaming platform logo smaller than person on the right; soft cinematic background",
    lighting: "warm cinematic soft light suitable for OTT poster thumbnail",
    mood: "premium streaming release, inviting, cinematic",
    colorPalette: "warm cinematic tones with controlled platform accent color",
    editorialStyle: "IMDb News / BBC Entertainment OTT release thumbnail",
    mustIncludeHints: [
      "lead actor portrait dominant",
      "movie/series title as secondary branding in ENGLISH transliteration only",
      "platform logo natural but SMALLER than the actor",
      "streaming release cue",
    ],
    mustAvoidHints: SHARED_AVOID,
    frameBalance: FRAME_BALANCE,
    promptTemplate: `Create a premium editorial entertainment news thumbnail.
Primary subject: {{Actor}}
Supporting subject: {{Movie}}
Streaming platform: {{Platform}}
Visual focus: Actor portrait, Movie branding in English letters only, Platform logo (smaller than actor)
Professional entertainment lighting, premium movie poster composition, warm cinematic colors
No fake movie scenes, no random paperwork, no fake awards, no fake audience, no generic background
CRITICAL: Title text must be English/Latin only (example spelling: Maa Inti Bangaaram). Never Telugu, Tamil, Hindi, or Devanagari. Never tofu boxes or garbled subtitle bars.
One clear entertainment story: title starts streaming on {{Platform}}.`,
  },
  celebrity_interview: {
    style: "celebrity_interview",
    label: "Celebrity Interview",
    composition: "Close editorial portrait of celebrity (~65%); soft interview set / studio bokeh; minimal branding",
    lighting: "soft flattering interview key light",
    mood: "intimate, premium, celebrity interview",
    colorPalette: "warm neutrals and soft studio tones",
    editorialStyle: "BBC Entertainment interview thumbnail",
    mustIncludeHints: ["celebrity portrait dominant", "subtle interview atmosphere"],
    mustAvoidHints: SHARED_AVOID,
    frameBalance: FRAME_BALANCE,
    promptTemplate: `Create a premium editorial entertainment interview thumbnail.
Primary subject: {{Actor}}
Visual focus: Celebrity portrait, soft interview atmosphere
Warm professional lighting. No random props. One clear interview story.`,
  },
  trailer: {
    style: "trailer",
    label: "Trailer",
    composition: "Lead actor or key cast portrait; trailer/title treatment secondary; dynamic but uncluttered entertainment poster look",
    lighting: "dramatic yet clear cinematic lighting — still readable as a news thumbnail",
    mood: "anticipatory, cinematic trailer launch",
    colorPalette: "cinematic contrast with warm highlight accents",
    editorialStyle: "trailer launch entertainment editorial",
    mustIncludeHints: ["lead talent portrait", "title treatment", "trailer release cue"],
    mustAvoidHints: SHARED_AVOID,
    frameBalance: FRAME_BALANCE,
    promptTemplate: `Create a premium trailer-launch entertainment thumbnail.
Primary subject: {{Actor}}
Supporting subject: {{Movie}}
Visual focus: Actor portrait and title branding. No fake scenes. No random objects.`,
  },
  box_office: {
    style: "box_office",
    label: "Box Office",
    composition: "Lead actor / film branding dominant; subtle box-office success mood without fake revenue numbers",
    lighting: "bright premium premiere lighting",
    mood: "celebratory, commercial success, clean",
    colorPalette: "gold and warm cinema tones",
    editorialStyle: "box-office entertainment news thumbnail",
    mustIncludeHints: ["film/actor focus", "subtle success mood without fake numbers"],
    mustAvoidHints: [...SHARED_AVOID, "fake box-office numbers or charts with digits"],
    frameBalance: FRAME_BALANCE,
    promptTemplate: `Create a premium box-office entertainment news thumbnail.
Primary subject: {{Actor}}
Supporting subject: {{Movie}}
No fake revenue numbers. Clear who/what story.`,
  },
  music_launch: {
    style: "music_launch",
    label: "Music Launch",
    composition: "Artist portrait dominant; album/song title secondary; soft stage or studio atmosphere",
    lighting: "warm stage/studio entertainment lighting",
    mood: "musical, energetic but clean",
    colorPalette: "rich entertainment stage colors without clutter",
    editorialStyle: "music launch entertainment thumbnail",
    mustIncludeHints: ["artist portrait", "music launch cue"],
    mustAvoidHints: SHARED_AVOID,
    frameBalance: FRAME_BALANCE,
    promptTemplate: `Create a premium music-launch entertainment thumbnail.
Primary subject: {{Actor}}
Supporting subject: {{Movie}}
Artist-focused portrait layout. No random instruments unless mentioned.`,
  },
  award_show: {
    style: "award_show",
    label: "Award Show",
    composition: "Celebrity red-carpet / award-night portrait; subtle awards atmosphere only if article is about awards",
    lighting: "elegant event lighting, clear faces",
    mood: "glamorous award-night editorial",
    colorPalette: "deep blacks, gold accents, elegant neutrals",
    editorialStyle: "award show entertainment editorial",
    mustIncludeHints: ["celebrity portrait", "elegant event atmosphere"],
    mustAvoidHints: SHARED_AVOID.filter((x) => !x.includes("fake awards")),
    frameBalance: FRAME_BALANCE,
    promptTemplate: `Create a premium award-show entertainment thumbnail.
Primary subject: {{Actor}}
Elegant event portrait. Do not invent fake trophy wins.`,
  },
  tv_series: {
    style: "tv_series",
    label: "TV Series",
    composition: "Lead cast portrait; series title branding secondary; soft premium TV/OTT poster look",
    lighting: "warm cinematic series-poster lighting",
    mood: "premium series premiere",
    colorPalette: "cinematic warm neutrals",
    editorialStyle: "TV / streaming series entertainment thumbnail",
    mustIncludeHints: ["lead talent", "series title branding"],
    mustAvoidHints: SHARED_AVOID,
    frameBalance: FRAME_BALANCE,
    promptTemplate: `Create a premium TV/series entertainment thumbnail.
Primary subject: {{Actor}}
Supporting subject: {{Movie}}
Streaming platform: {{Platform}}
Clear series story. Platform logo smaller than the person.`,
  },
};

export function fillEntertainmentTemplate(
  style: EntertainmentStyle,
  vars: { actor: string; movie: string; platform: string }
): string {
  const layout = ENTERTAINMENT_STYLES[style];
  return layout.promptTemplate
    .replace(/\{\{Actor\}\}/g, vars.actor || "lead celebrity")
    .replace(/\{\{Movie\}\}/g, vars.movie || "title")
    .replace(/\{\{Platform\}\}/g, vars.platform || "streaming platform");
}

export function getEntertainmentLayout(style: EntertainmentStyle | null | undefined): EntertainmentLayout | null {
  if (!style) return null;
  return ENTERTAINMENT_STYLES[style] || null;
}
