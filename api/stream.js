'use strict';

// ═══════════════════════════════════════════════════════════════════════════════
// PARSER
// ═══════════════════════════════════════════════════════════════════════════════

const RESOLUTION_MAP = [
  { re: /\b(2160p?|4k|uhd|3840x2160)\b/i,  short: '4K',    full: '2160p', rank: 4 },
  { re: /\b(1080p?|1920x1080)\b/i,         short: '1080p', full: '1080p', rank: 3 },
  { re: /\b(720p?|1280x720)\b/i,           short: '720p',  full: '720p',  rank: 2 },
  { re: /\b(480p?|848x480|854x480)\b/i,    short: '480p',  full: '480p',  rank: 1 },
  { re: /\b(360p?|640x360)\b/i,            short: '360p',  full: '360p',  rank: 0 },
];

const QUALITY_MAP = [
  { re: /\bremux\b/i,                                      label: 'BluRay Remux',  rank: 10 },
  { re: /\biso\b|\bbdmv\b/i,                               label: 'Full ISO/BDMV', rank: 9  },
  { re: /\bblu[-\s]?ray\b/i,                               label: 'BluRay',        rank: 8  },
  { re: /\bbd[-\s]?rip\b|\bbr[-\s]?rip\b|\bbdencode\b|\bmoozzi2\b|\bvcb-studio\b|\bbeatrice-raws\b|\bsnow-raws\b|\breinforce\b/i,   label: 'BD-RIP/Encode', rank: 7  },
  { re: /\bweb[-\s]?dl\b|\bweb\b|\bsubsplease\b|\berai-raws\b|\bhorriblesubs\b|\bjudas\b|\bember\b|\bpuya\b|\bslyfox\b/i,                        label: 'WEB-DL',        rank: 6  },
  { re: /\bweb[-\s]?rip\b/i,                               label: 'WEBRip',        rank: 5  },
  { re: /\bhdtv\b/i,                                       label: 'HDTV',          rank: 4  },
  { re: /\bdvd[-\s]?rip\b/i,                               label: 'DVDRip',        rank: 3  },
  { re: /\bscr\b|\bscreener\b/i,                           label: 'SCR',           rank: 2  },
  { re: /\bcam\b|\bts\b|\bhdcam\b/i,                       label: 'CAM/TS',        rank: 1  },
];

const HDR_MAP = [
  { re: /\bdolby[-\s]?vision\b|\bDV\b(?!D)/i, label: 'Dolby Vision', hdrRank: 5 },
  { re: /\bhdr10\+|\bhdr10plus\b/i,            label: 'HDR10+',       hdrRank: 4 },
  { re: /\bhdr10\b/i,                          label: 'HDR10',        hdrRank: 3 },
  { re: /\bhlg\b/i,                            label: 'HLG',          hdrRank: 2 },
  { re: /\bhdr\b/i,                            label: 'HDR',          hdrRank: 1 },
];

const CODEC_MAP = [
  { re: /\bav1\b/i,                        label: 'AV1',  bonus: 30 },
  { re: /\bhevc\b|\bh\.?265\b|\bx265\b/i, label: 'x265', bonus: 20 },
  { re: /\bavc\b|\bh\.?264\b|\bx264\b/i,  label: 'x264', bonus: 10 },
  { re: /\bvp9\b/i,                        label: 'VP9',  bonus: 8  },
  { re: /\bxvid\b/i,                       label: 'XviD', bonus: 2  },
  { re: /\bdivx\b/i,                       label: 'DivX', bonus: 2  },
];

const AUDIO_MAP = [
  { re: /\btruehd\b/i,                       label: 'TrueHD'    },
  { re: /\batmos\b/i,                         label: 'Atmos'     },
  { re: /\bdts[-\s]?hd[-\s]?ma\b/i,         label: 'DTS-HD MA' },
  { re: /\bdts[-\s]?hd\b/i,                 label: 'DTS-HD'    },
  { re: /\bdts[-\s]?x\b/i,                  label: 'DTS:X'     },
  { re: /\bdts\b/i,                          label: 'DTS'       },
  { re: /\bdd\+\b|\beac3\b|\bddplus\b/i,    label: 'DD+'       },
  { re: /\bac3\b|\bdolby[-\s]?digital\b/i,  label: 'DD'        },
  { re: /\baac\b/i,                          label: 'AAC'       },
  { re: /\bpcm\b/i,                          label: 'PCM'       },
  { re: /\bflac\b/i,                         label: 'FLAC'      },
  { re: /\bmp3\b/i,                          label: 'MP3'       },
];

const CHANNEL_MAP = [
  { re: /\b7\.1\b/,   label: '7.1'  },
  { re: /\b5\.1\b/,   label: '5.1'  },
  { re: /\b2\.0\b/,   label: '2.0'  },
  { re: /\bmono\b/i,  label: 'Mono' },
];

const LANG_PATTERNS = [
  { re: /\bpt[-._]?br\b|\bptbr\b|\bdublado\b|\bdubl\b|\bportuguês\b|\bportuguese\b|\bpt[-._]?pt\b|\bbra\b|\bbrasileiro\b|🇧🇷|🇵🇹/i, code: 'PT', full: 'Português' },
  { re: /\beng\b|\benglish\b|\bingles\b|🇬🇧|🇺🇸/i,               code: 'EN', full: 'English'  },
  { re: /\bspa\b|\bspanish\b|\bespa[ñn]ol\b|\bcastellano\b|\blatino\b|🇪🇸|🇲🇽/i, code: 'ES', full: 'Español' },
  { re: /\bfra\b|\bfrench\b|\bfrançais\b|🇫🇷/i,              code: 'FR', full: 'Français' },
  { re: /\bdeu\b|\bgerman\b|\bdeutsch\b|🇩🇪/i,               code: 'DE', full: 'Deutsch'  },
  { re: /\bita\b|\bitalian\b|\bitaliano\b|🇮🇹/i,             code: 'IT', full: 'Italiano' },
  { re: /\bjpn\b|\bjapanese\b|🇯🇵/i,                         code: 'JP', full: 'Japanese' },
  { re: /\bkor\b|\bkorean\b|🇰🇷/i,                           code: 'KR', full: 'Korean'   },
  { re: /\bhin\b|\bhindi\b|🇮🇳/i,                            code: 'HI', full: 'Hindi'    },
  { re: /\bchi\b|\bchinese\b|\bzho\b|\bmandarin\b|\bcantonese\b|🇨🇳/i, code: 'ZH', full: 'Chinese' },
  { re: /\brus\b|\brussian\b|🇷🇺/i,                          code: 'RU', full: 'Russian'  },
];

const MULTI_RE   = /\bmulti\b(?!p)|\bmultilingual\b|\bmulti[-._]?(audio|lang(uage)?)\b|\bdual[-.\s]?audio\b|\bdual\b/i;
const IS_3D_RE   = /\b3D\b|\bHSBS\b|\bFull[-.\s]?SBS\b|\bHOU\b|\b3D[-.\s]?SBS\b/i;
const EDITION_MAP = [
  { re: /\bdirector'?s?[-.\s]?cut\b/i,       label: "Director's Cut"  },
  { re: /\bextended\b/i,                      label: 'Extended'        },
  { re: /\btheatrical\b/i,                    label: 'Theatrical'      },
  { re: /\bunrated\b/i,                       label: 'Unrated'         },
  { re: /\bremastered\b/i,                    label: 'Remastered'      },
];
const SERIES_RE  = /[Ss](\d{1,2})[Ee](\d{1,2})/;
const YEAR_RE    = /\b(19[5-9]\d|20[0-3]\d)\b/;
const CACHE_TEXT_RE = [
  /\[RD[\s+✓]?\]/i, /\[AD[\s+✓]?\]/i, /\[TB[\s+✓]?\]/i, /\[PM[\s+✓]?\]/i, /\[DL[\s+✓]?\]/i,
  /\bRD\+\b/i, /\bAD\+\b/i, /\bTB\+\b/i,
  /\bcache[d]?\b/i, /⚡/, /☁️/
];

function formatSize(bytes) {
  if (!bytes || bytes <= 0) return null;
  if (bytes >= 1e12) return (bytes / 1e12).toFixed(2) + ' TB';
  if (bytes >= 1e9)  return (bytes / 1e9).toFixed(2)  + ' GB';
  if (bytes >= 1e6)  return (bytes / 1e6).toFixed(2)  + ' MB';
  return bytes + ' B';
}

function parse(streamData, type, id) {
  if (!streamData) return { infoHash: null, source: 'Unknown', _raw: {} };
  const raw = [streamData.name || '', streamData.title || '', streamData.description || ''].join('\n');

  let resolution = null, resolutionRank = -1;
  for (const r of RESOLUTION_MAP) { if (r.re.test(raw)) { resolution = r; resolutionRank = r.rank; break; } }

  let quality = null, qualityRank = -1;
  for (const q of QUALITY_MAP) { if (q.re.test(raw)) { quality = q; qualityRank = q.rank; break; } }

  let topHdr = null, topHdrRank = -1;
  const hdrTags = [];
  for (const h of HDR_MAP) {
    if (h.re.test(raw) && !hdrTags.includes(h.label)) {
      hdrTags.push(h.label);
      if (h.hdrRank > topHdrRank) { topHdr = h.label; topHdrRank = h.hdrRank; }
    }
  }
  if (hdrTags.length === 0) {
    hdrTags.push('SDR');
    topHdr = 'SDR';
    topHdrRank = 0;
  }

  let codec = null, codecBonus = 0;
  for (const c of CODEC_MAP) { if (c.re.test(raw)) { codec = c.label; codecBonus = c.bonus; break; } }

  const audioTags = [];
  for (const a of AUDIO_MAP) { if (a.re.test(raw) && !audioTags.includes(a.label)) audioTags.push(a.label); }

  let channels = null;
  for (const c of CHANNEL_MAP) { if (c.re.test(raw)) { channels = c.label; break; } }

  const ANIME_SUB_GROUPS = /\b(SubsPlease|Erai-raws|HorribleSubs|Judas|Ember|PuyaSubs?|SlyFox|Yameii|ASW|GJM|Commie|MTBB|Kawaiika|Seadex|ToonsHub|AnimeTime|Gogoanime|Kuroba|Nyaa|TokyoToshokan|Earendur|Feibanyama)\b/i;
  const ANIME_KEYWORDS = /\b(anime|crunchyroll|funimation|hidive|bilibili)\b/i;
  const IS_DUBBED = /\b(dublado|dubl|dub|dual[-.\s]?audio|dual)\b/i;
  
  const isAnime = type === 'anime' || (id && id.startsWith('kitsu:')) || ANIME_SUB_GROUPS.test(raw) || ANIME_KEYWORDS.test(raw);

  let audioRaw = raw
    .replace(/\b(subs?|subtitles?|legendas?|leg)\s*[:=]\s*[a-zA-Z0-9,\- ]+/gi, '')
    .replace(/\b(subs?|subtitles?|legendas?|leg)\s+(pt[-._]?br|ptbr|pt|en|es|fr|de|it|ru)\b/gi, '')
    .replace(/\[(pt[-._]?br|ptbr|pt|en|es|fr|de|it|ru)\s+(subs?|subtitles?|legendas?|leg)\]/gi, '')
    .replace(/\blegendado\s*pt[-._]?br\b|\blegendado\s*pt\b|\blegendado\b/gi, '')
    .replace(/\bmulti[-._]?(subs?|subtitles?)\b/gi, '');

  let isAnimeSubOnly = false;
  if (!isAnime) {
    isAnimeSubOnly = (ANIME_SUB_GROUPS.test(raw) || ANIME_KEYWORDS.test(raw)) && !IS_DUBBED.test(raw);
  }

  const langs = [];
  if (isAnimeSubOnly) {
    langs.push({ code: 'JP', full: 'Japanese' });
  } else if (isAnime) {
    const hasMultiAudio = /\bmulti[-.\s]?(audio|áudio)\b/i.test(raw);
    const hasOtherTags = /\b(dual[-.\s]?(audio|áudio)|dubbed|dub|multi[-.\s]?(subs?|subtitles?)|dubl|dublado|legendado|subs?|subtitles?)\b/i.test(raw);
    
    const STRICT_LANG_PATTERNS = [
      { re: /\bpt[-._]?br\b|\bptbr\b|\bportuguês\b|\bportuguese\b|\bpt[-._]?pt\b|\bbra\b|\bbrasileiro\b|🇧🇷|🇵🇹/i, code: 'PT', full: 'Português' },
      { re: /\beng\b|\benglish\b|\bingles\b|🇬🇧|🇺🇸/i,               code: 'EN', full: 'English'  },
      { re: /\bspa\b|\bspanish\b|\bespa[ñn]ol\b|\bcastellano\b|\blatino\b|🇪🇸|🇲🇽/i, code: 'ES', full: 'Español' },
      { re: /\bfra\b|\bfrench\b|\bfrançais\b|🇫🇷/i,              code: 'FR', full: 'Français' },
      { re: /\bdeu\b|\bgerman\b|\bdeutsch\b|🇩🇪/i,               code: 'DE', full: 'Deutsch'  },
      { re: /\bita\b|\bitalian\b|\bitaliano\b|🇮🇹/i,             code: 'IT', full: 'Italiano' },
      { re: /\bjpn\b|\bjapanese\b|🇯🇵/i,                         code: 'JP', full: 'Japanese' },
      { re: /\bkor\b|\bkorean\b|🇰🇷/i,                           code: 'KR', full: 'Korean'   },
      { re: /\bhin\b|\bhindi\b|🇮🇳/i,                            code: 'HI', full: 'Hindi'    },
      { re: /\bchi\b|\bchinese\b|\bzho\b|\bmandarin\b|\bcantonese\b|🇨🇳/i, code: 'ZH', full: 'Chinese' },
      { re: /\brus\b|\brussian\b|🇷🇺/i,                          code: 'RU', full: 'Russian'  },
      { re: /\bfas\b|\bpersian\b|\bfarsi\b|\biran|🇮🇷/i,        code: 'FA', full: 'Persian'  },
      { re: /\bara\b|\barabic\b|🇸🇦/i,                           code: 'AR', full: 'Arabic'   },
      { re: /\btur\b|\bturkish\b|\btürkçe\b|🇹🇷/i,              code: 'TR', full: 'Turkish'  },
    ];

    for (const l of STRICT_LANG_PATTERNS) {
      if (l.re.test(audioRaw)) {
        let isValid = false;
        if (hasMultiAudio) {
          isValid = true;
        } else if (!hasOtherTags) {
          isValid = true;
        }
        
        if (isValid && !langs.find(x => x.code === l.code)) {
          langs.push(l);
        }
      }
    }
    
    if (langs.length === 0) {
      langs.push({ code: 'JP', full: 'Japanese' });
    }
  } else {
    for (const l of LANG_PATTERNS) { if (l.re.test(audioRaw) && !langs.find(x => x.code === l.code)) langs.push(l); }
  }
  const isMulti = MULTI_RE.test(audioRaw);
  const is3D    = IS_3D_RE.test(raw);

  let edition = null;
  for (const e of EDITION_MAP) { if (e.re.test(raw)) { edition = e.label; break; } }

  let season = null, episode = null;
  const seMatch = SERIES_RE.exec(raw);
  if (seMatch) { season = parseInt(seMatch[1], 10); episode = parseInt(seMatch[2], 10); }

  const yearMatch = YEAR_RE.exec(raw);
  const year = yearMatch ? parseInt(yearMatch[1], 10) : null;

  let seeds = streamData.seeds || 0;
  if (!seeds) { const m = /(?:👤|👥|🌱)\s*(\d+)|(\d+)\s*seed|seeds:\s*(\d+)|seeders:\s*(\d+)|s:\s*(\d+)/i.exec(raw); if (m) seeds = parseInt(m[1] || m[2] || m[3] || m[4] || m[5], 10) || 0; }

  const sizeBytes = streamData.size || 0;
  let sizeStr = streamData.sizeFormatted || formatSize(sizeBytes) || null;
  if (!sizeStr) { const m = /([\d.]+)\s*(GB|MB|TB)/i.exec(raw); if (m) sizeStr = m[1] + ' ' + m[2].toUpperCase(); }

  const textCached = CACHE_TEXT_RE.some(re => re.test(raw));
  const isDirectUrl = streamData.url && !streamData.url.startsWith('magnet:') && !streamData.url.endsWith('.torrent');
  const isCached   = !!(streamData.cached || streamData.behaviorHints?.cached || textCached || isDirectUrl);
  const age        = streamData.age || null;

  let rawTitle = '';
  if (streamData.title) {
    const lines = streamData.title.split('\n');
    const titleLine = lines.find(l => !/^(👤|👥|🌱|💾|⚙️|⚡|\[)/.test(l.trim())) || lines[0];
    rawTitle = titleLine;
  } else if (streamData.description) {
    const lines = streamData.description.split('\n');
    const titleLine = lines.find(l => !/^(👤|👥|🌱|💾|⚙️|⚡|\[)/.test(l.trim())) || lines[0];
    rawTitle = titleLine;
  } else {
    rawTitle = streamData.name || '';
  }
  
  if (rawTitle.toLowerCase() === 'comet' && streamData.description) {
      const lines = streamData.description.split('\n');
      rawTitle = lines.find(l => !/^(👤|👥|🌱|💾|⚙️|⚡|\[)/.test(l.trim())) || lines[0];
  }

  let cleanTitle = rawTitle.replace(/\.(mkv|mp4|avi|mov|ts|m2ts|wmv|webm)$/i, '').replace(/[._]/g, ' ');
  const cutRe = /\b(19[5-9]\d|20[0-3]\d|2160p?|4k|uhd|1080p?|720p?|480p?|360p?|remux|blu.?ray|web.?dl|web.?rip|hdtv|dvdrip|hevc|x265|x264|h\.?265|h\.?264|av1|xvid)\b/i;
  const cm = cutRe.exec(cleanTitle);
  if (cm) cleanTitle = cleanTitle.slice(0, cm.index);
  
  cleanTitle = cleanTitle.replace(/[\(\[\{\-\s]+$/, '');
  cleanTitle = cleanTitle.replace(/\s+/g, ' ').trim();

  const qualityStr = quality?.label || null;
  const seedScore  = seeds > 0 ? Math.log10(seeds + 1) * 20 : 0;
  const rankScore  = resolutionRank * 1000 + qualityRank * 100 + topHdrRank * 10 + codecBonus + seedScore;

  return {
    infoHash: streamData.infoHash || null,
    source:   streamData.source   || 'Unknown',
    cleanTitle, year, season, episode,
    seasonStr:      season  != null ? `S${String(season).padStart(2,'0')}`  : null,
    episodeStr:     episode != null ? `E${String(episode).padStart(2,'0')}` : null,
    resolution:     resolution?.short    || null,
    resolutionFull: resolution?.full     || null,
    resolutionRank,
    quality: qualityStr,
    qualityLabel: quality?.label || null,
    qualityRank,
    hdr: hdrTags, topHdr, topHdrRank, is3D, edition,
    codec, codecBonus,
    audioTags, channels,
    langs,
    langCodes:  langs.map(l => l.code),
    langNames:  langs.map(l => l.full),
    langLower:  langs.map(l => l.full.toLowerCase()),
    isMulti, isCached, seeds, sizeBytes, sizeStr, age,
    message: streamData.message || null,
    rankScore,
    _raw: streamData,
  };
}

function deduplicateByInfoHash(streams) {
  const map = new Map(), noHash = [];
  for (const s of streams) {
    if (!s.infoHash) { noHash.push(s); continue; }
    const key = String(s.infoHash).toLowerCase();
    if (!map.has(key)) {
      map.set(key, s);
    } else {
      const existing = map.get(key);
      if (s.isCached && !existing.isCached) {
        map.set(key, s);
      } else if (s.isCached === existing.isCached && s.seeds > existing.seeds) {
        map.set(key, s);
      }
    }
  }
  return [...map.values(), ...noHash];
}

function renderTemplate(template, parsed) {
  const vars = {
    '{{title}}':           parsed.cleanTitle || '',
    '{{year}}':            parsed.year  ? String(parsed.year)  : '',
    '{{season}}':          parsed.seasonStr  || '',
    '{{episode}}':         parsed.episodeStr || '',
    '{{resolution}}':      parsed.resolution     || '',
    '{{resolution_full}}': parsed.resolutionFull || '',
    '{{quality}}':         parsed.quality    || '',
    '{{quality_tag}}':     parsed.qualityLabel|| '',
    '{{codec}}':           parsed.codec      || '',
    '{{hdr}}':             (parsed.hdr || []).join('+') || '',
    '{{hdr_top}}':         parsed.topHdr     || '',
    '{{edition}}':         parsed.edition    || '',
    '{{audio}}':           (parsed.audioTags || []).join(' ') || '',
    '{{channels}}':        parsed.channels   || '',
    '{{langs_upper}}':     (parsed.langCodes || []).join(' ') || (parsed.isMulti ? 'MULTI' : ''),
    '{{langs_long}}':      (parsed.langNames || []).join(', ') || (parsed.isMulti ? 'Multi' : ''),
    '{{langs_lower}}':     (parsed.langLower || []).join(', ') || (parsed.isMulti ? 'multi' : ''),
    '{{multi}}':           parsed.isMulti ? 'MULTI' : '',
    '{{source}}':          parsed.source  || '',
    '{{seeds}}':           String(parsed.seeds || 0),
    '{{size}}':            parsed.sizeStr || '',
    '{{age}}':             parsed.age     || '',
    '{{cache}}':           parsed.isCached ? '⚡' : '',
    '{{message}}':         parsed.message || '',
    '{{release_group}}':   parsed._raw?.releaseGroup || '',
    '{{raw_title}}':       parsed._raw?.title || '',
    '{{raw_description}}': parsed._raw?.description || '',
  };
  let out = template;
  for (const [token, value] of Object.entries(vars)) {
    if (!value) {
      const escapedToken = token.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const re = new RegExp(`(?:(?:[\\p{Emoji_Presentation}\\p{Extended_Pictographic}]|[A-Za-zÀ-ÿ]+:)\\s*)?${escapedToken}`, 'gu');
      out = out.replace(re, '');
    } else {
      out = out.split(token).join(value);
    }
  }
  out = out
    .replace(/\{\{[^}]+\}\}/g, '')
    .replace(/\[\s*\]/g, '')
    .replace(/\(\s*\)/g, '')
    .replace(/ {2,}/g, ' ')
    .replace(/\|\s*\|/g, '|')
    .replace(/^\s*\|\s*/gm, '')
    .replace(/\s*\|\s*$/gm, '');
  out = out.split('\n').map(l => l.trim()).filter(l => l.length > 0).join('\n');
  return out.trim();
}

// ═══════════════════════════════════════════════════════════════════════════════
// DEBRID
// ═══════════════════════════════════════════════════════════════════════════════

// ── Segurança das fontes ──
// As fontes são URLs informadas pelo usuário e buscadas pelo servidor. Para o
// servidor não virar um proxy para redes internas, só aceitamos https em hosts
// públicos, e conferimos também o IP para onde o nome resolve.
const dns = require('dns').promises;
const net = require('net');

const ALLOWED_TYPES     = ['movie', 'series'];
const MAX_SOURCES       = 10;
const MAX_REDIRECTS     = 3;
const MAX_CONFIG_LENGTH = 20000;

function isPrivateIp(ip) {
  if (net.isIPv4(ip)) {
    const [a, b] = ip.split('.').map(Number);
    return a === 0 || a === 10 || a === 127 ||
      (a === 100 && b >= 64 && b <= 127) ||
      (a === 169 && b === 254) ||
      (a === 172 && b >= 16 && b <= 31) ||
      (a === 192 && b === 168) ||
      (a === 198 && (b === 18 || b === 19)) ||
      a >= 224;
  }
  if (net.isIPv6(ip)) {
    const v = ip.toLowerCase();
    if (v === '::' || v === '::1') return true;
    const mapped = v.match(/^::ffff:(\d+\.\d+\.\d+\.\d+)$/);
    if (mapped) return isPrivateIp(mapped[1]);
    return /^f[cd]/.test(v) || /^fe[89ab]/.test(v) || v.startsWith('::ffff:');
  }
  return true;
}

async function isSafeSourceUrl(rawUrl) {
  let u;
  try { u = new URL(rawUrl); } catch { return false; }
  if (u.protocol !== 'https:' || u.username || u.password) return false;
  const host = u.hostname.replace(/^\[|\]$/g, '').toLowerCase();
  if (!host || host === 'localhost' || /\.(localhost|local|internal|lan|home|arpa)$/.test(host)) return false;
  if (net.isIP(host)) return !isPrivateIp(host);
  if (!host.includes('.')) return false;
  try {
    const addrs = await dns.lookup(host, { all: true });
    return addrs.length > 0 && addrs.every(a => !isPrivateIp(a.address));
  } catch { return false; }
}

function chunkArr(arr, n) {
  const out = [];
  for (let i = 0; i < arr.length; i += n) out.push(arr.slice(i, i + n));
  return out;
}

async function fetchT(url, opts = {}, ms = 8000) {
  const headers = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Stremio/4.4.168 Chrome/118.0.5993.118 Electron/27.0.0 Safari/537.36',
    'Accept': 'application/json',
    ...(opts.headers || {})
  };
  
  const controller = typeof AbortController !== "undefined" ? new AbortController() : null;
  const signal = controller ? controller.signal : undefined;
  
  const timeoutId = setTimeout(() => {
    if (controller) controller.abort();
  }, ms);
  
  try { 
    return await fetch(url, { ...opts, headers, signal }); 
  } finally { 
    clearTimeout(timeoutId); 
  }
}

async function checkDebridCache(debrid, hashes) {
  if (!debrid?.service || debrid.service === 'none' || !debrid?.apiKey || !hashes.length) return new Set();
  const valid  = hashes.filter(Boolean).map(h => h.toLowerCase());
  const cached = new Set();

  if (debrid.service === 'realdebrid') {
    for (const ch of chunkArr(valid, 40)) {
      try {
        const r = await fetchT(
          `https://api.real-debrid.com/rest/1.0/torrents/instantAvailability/${ch.join('/')}`,
          { headers: { Authorization: `Bearer ${debrid.apiKey}` } }
        );
        if (!r.ok) continue;
        const data = await r.json();
        for (const h of ch) { if (data[h]?.rd?.length) cached.add(h); }
      } catch (e) { console.error('[RD]', e.message); }
    }
  }

  if (debrid.service === 'alldebrid') {
    for (const ch of chunkArr(valid, 25)) {
      try {
        const qs = ch.map(h => `magnets[]=${encodeURIComponent(h)}`).join('&');
        const r  = await fetchT(
          `https://api.alldebrid.com/v4/magnet/instant?agent=AddTORR&apikey=${debrid.apiKey}&${qs}`
        );
        if (!r.ok) continue;
        const data = await r.json();
        if (data.status === 'success') {
          for (const m of data.data?.magnets || []) { if (m.instant) cached.add(m.hash?.toLowerCase()); }
        }
      } catch (e) { console.error('[AD]', e.message); }
    }
  }

  if (debrid.service === 'torbox') {
    for (const ch of chunkArr(valid, 100)) {
      try {
        const r = await fetchT(
          `https://search-api.torbox.app/torrents/checkcached?hash=${ch.join(',')}&format=object&list_files=false`,
          { headers: { Authorization: `Bearer ${debrid.apiKey}` } }
        );
        if (!r.ok) continue;
        const data = await r.json();
        if (data.success && data.data) {
          for (const [h, v] of Object.entries(data.data)) { if (v) cached.add(h.toLowerCase()); }
        }
      } catch (e) { console.error('[TB]', e.message); }
    }
  }

  return cached;
}

// ═══════════════════════════════════════════════════════════════════════════════
// DECODE CONFIG
// ═══════════════════════════════════════════════════════════════════════════════

function decodeConfig(config) {
  if (Array.isArray(config)) config = config[0];
  if (typeof config !== "string" || !config) return {};
  const b64    = config.replace(/-/g, '+').replace(/_/g, '/');
  const padded = b64 + '=='.slice(0, (4 - b64.length % 4) % 4);
  return JSON.parse(Buffer.from(padded, 'base64').toString('utf8'));
}

// ═══════════════════════════════════════════════════════════════════════════════
// ENTRY POINT
// ═══════════════════════════════════════════════════════════════════════════════

module.exports = async (req, res) => {
  try {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Headers', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.setHeader('Content-Type', 'application/json');

    if (req.method === 'OPTIONS') {
      return res.status(200).end();
    }

    let { config, type, id } = req.query || {};
    if (Array.isArray(id)) id = id[0];
    if (Array.isArray(type)) type = type[0];
    if (Array.isArray(config)) config = config[0];

    if (id && typeof id === "string") id = id.replace(/\.json$/, '');
    // a configuração (que pode levar a chave Debrid) nunca vai para o log
    console.log('[AddTORR] stream:', type, id);
    if (!ALLOWED_TYPES.includes(type) || typeof id !== 'string' || !id || id.length > 200) {
      return res.json({ streams: [] });
    }
    if (typeof config === 'string' && config.length > MAX_CONFIG_LENGTH) {
      return res.status(400).json({ streams: [] });
    }
    if (!config) {
      console.error('[AddTORR] config ausente');
      return res.json({ streams: [] });
    }

    let cfg;
    try { cfg = decodeConfig(config); }
    catch (e) {
      console.error('[AddTORR] Config decode error:', e.message);
      return res.status(400).json({ streams: [] });
    }

    console.log('[AddTORR] sources:', cfg.sources?.length, '| cacheOnly:', cfg.filters?.cacheOnly, '| debrid:', cfg.debrid?.service);

    const streams = await aggregateStreams(cfg, type, id);
    console.log('[AddTORR] streams retornados:', streams.length);
    return res.json({ streams });
  } catch (err) {
    console.error('[AddTORR] Unhandled error:', err);
    return res.status(500).json({ streams: [] });
  }
};

// ═══════════════════════════════════════════════════════════════════════════════
// AGGREGATION
// ═══════════════════════════════════════════════════════════════════════════════

async function aggregateStreams(cfg, type, id) {
  const sources        = Array.isArray(cfg.sources) ? cfg.sources.slice(0, MAX_SOURCES) : [];
  const debrid         = cfg.debrid || {};
  const modes          = cfg.modes || { auto: { enabled: true, limit: 1 }, manual: { enabled: false } };
  const filters        = cfg.filters || {};
  const guarantees     = cfg.guarantees || {};
  const limits         = cfg.limits || {};
  const priority       = Array.isArray(cfg.priority) ? cfg.priority : ['quality', 'language', 'seeds'];
  const preferredLangs = Array.isArray(cfg.preferredLangs) ? cfg.preferredLangs : [];
  const template       = cfg.template || {};
  const includeOriginalLang = !!cfg.includeOriginalLang;

  if (!sources.length) return [];

  const results = await Promise.allSettled(
    sources.map(src => fetchSource(src, type, id))
  );

  const rawStreams = [];
  results.forEach((r, i) => {
    if (r.status === 'fulfilled' && Array.isArray(r.value)) {
      for (const s of r.value) {
        if (s) rawStreams.push({ ...s, source: sources[i]?.name || 'Unknown' });
      }
    }
  });

  if (!rawStreams.length) return [];

  let parsed = rawStreams.map(s => parse(s, type, id));
  parsed = deduplicateByInfoHash(parsed);

  const hashes    = parsed.filter(p => p.infoHash).map(p => String(p.infoHash).toLowerCase());
  const cachedSet = await checkDebridCache(debrid, hashes);
  if (cachedSet.size > 0) {
    parsed = parsed.map(p => ({
      ...p,
      isCached: p.isCached || (p.infoHash ? cachedSet.has(String(p.infoHash).toLowerCase()) : false),
    }));
  }

  let normal = applyFilters(parsed, filters);
  normal = sortByPriority(normal, priority, preferredLangs);
  normal = applySmartLimit(normal, limits, filters, preferredLangs);

  let finalStreams = [];
  
  const guaranteed = buildGuarantees(parsed, guarantees, modes.auto?.enabled ? normal : [], preferredLangs, filters);
  const originalLink = buildOriginalLink(parsed, includeOriginalLang, filters);
  
  const guaranteedHashes = new Set([
    ...guaranteed.map(g => g.p.infoHash),
    ...(originalLink ? [originalLink.p.infoHash] : [])
  ].filter(Boolean));

  const filteredNormal = normal.filter(p => !guaranteedHashes.has(p.infoHash));
  
  finalStreams = [
    ...(originalLink ? [originalLink] : []),
    ...(modes.manual?.enabled ? guaranteed : []),
    ...(modes.auto?.enabled ? filteredNormal.map(p => ({ p, tag: modes.auto.tag || null })) : []),
  ];

  const line1 = template.line1 || '{{resolution_full}}{{cache}}';
  const line2 = template.line2 || '{{quality}} | {{hdr}}\n{{audio}} {{channels}}\n({{seeds}}) | {{size}} | {{langs_upper}}';

  function format(p, tag) {
    const name = renderTemplate(line1, p) || p._raw?.name || 'Stream';
    const title = renderTemplate(line2, p) || p._raw?.title || '';
    const out  = {
      name:          tag ? `${tag} ${name}` : name,
      title:         title,
      behaviorHints: {},
    };
    if (p.infoHash)                          out.infoHash    = p.infoHash;
    if (p._raw?.fileIdx != null)             out.fileIdx     = p._raw.fileIdx;
    if (p._raw?.url)                         out.url         = p._raw.url;
    if (p._raw?.externalUrl)                 out.externalUrl = p._raw.externalUrl;
    if (p._raw?.description)                 out.description = p._raw.description;
    if (p._raw?.subtitles)                   out.subtitles   = p._raw.subtitles;
    if (p._raw?.behaviorHints) {
      out.behaviorHints = { ...p._raw.behaviorHints };
    }
    if (Object.keys(out.behaviorHints).length === 0) delete out.behaviorHints;
    return out;
  }

  const all = finalStreams.map(item => format(item.p, item.tag));

  const seen = new Set();
  return all.filter(s => {
    if (!s.infoHash) return true;
    if (seen.has(s.infoHash)) return false;
    seen.add(s.infoHash);
    return true;
  });
}

// ─── FETCH SOURCE ─────────────────────────────────────────────────────────────
async function fetchSource(source, type, id) {
  if (!source || typeof source.url !== 'string' || !source.url) return [];
  const base = source.url.replace(/\/manifest\.json\/?$/, '').replace(/\/$/, '');
  const encodedId = encodeURIComponent(id);
  let url = `${base}/stream/${type}/${encodedId}.json`;
  try {
    // Redirecionamentos são seguidos à mão para validar cada destino.
    let r;
    for (let hop = 0; ; hop++) {
      if (!(await isSafeSourceUrl(url))) {
        console.error(`[Fetch] fonte recusada (só https público é aceito)`);
        return [];
      }
      r = await fetchT(url, { redirect: 'manual' }, 8000);
      if (r.status < 300 || r.status >= 400) break;
      const location = r.headers.get('location');
      if (!location || hop >= MAX_REDIRECTS) return [];
      url = new URL(location, url).toString();
    }
    if (!r.ok) { console.error(`[Fetch] fonte respondeu HTTP ${r.status}`); return []; }
    const data = await r.json();
    return Array.isArray(data.streams) ? data.streams : [];
  } catch (e) {
    console.error(`[Fetch] falha ao buscar fonte: ${e.message}`);
    return [];
  }
}

// ─── HELPERS ──────────────────────────────────────────────────────────────────
function getLangScore(stream, preferredLangs) {
  if (!preferredLangs?.length) return 0;
  const nonMulti = preferredLangs.filter(l => l !== 'MULTI');
  if (nonMulti.length && nonMulti.some(l => stream.langCodes?.includes(l))) return 2;
  if (preferredLangs.includes('MULTI') && stream.isMulti) return 1;
  return 0;
}

function sortByPriority(streams, priority, preferredLangs) {
  return [...streams].sort((a, b) => {
    for (const crit of priority) {
      let d = 0;
      if (crit === 'quality')  d = (b.resolutionRank - a.resolutionRank) || (b.qualityRank - a.qualityRank) || (b.topHdrRank - a.topHdrRank);
      if (crit === 'language') d = getLangScore(b, preferredLangs) - getLangScore(a, preferredLangs);
      if (crit === 'seeds')    d = b.seeds - a.seeds;
      if (d !== 0) return d;
    }
    return 0;
  });
}

function applyFilters(streams, filters) {
  return streams.filter(p => {
    if (filters.cacheOnly && !p.isCached)  return false;
    if (filters.no3D      && p.is3D)       return false;
    if (filters.maxSizeGB > 0 && p.sizeBytes > filters.maxSizeGB * 1e9) return false;
    if (filters.minSeeds  > 0 && !p.isCached && p.seeds < filters.minSeeds) return false;
    if (filters.resolutions?.length && !filters.resolutions.includes(p.resolution)) return false;
    if (filters.hdr?.length && (!p.hdr || !p.hdr.some(h => filters.hdr.includes(h)))) return false;
    if (filters.codecs?.length && (!p.codec || !filters.codecs.includes(p.codec))) return false;
    if (filters.audioCodecs?.length && (!p.audioTags || !p.audioTags.some(a => filters.audioCodecs.includes(a)))) return false;
    if (filters.langs?.length && filters.strictLang) {
      const hasSpecificLang = p.langCodes && p.langCodes.some(c => filters.langs.includes(c));
      const hasMulti = filters.langs.includes('MULTI') && p.isMulti;
      if (!hasSpecificLang && !hasMulti) return false;
    }
    return true;
  });
}

function applySmartLimit(streams, limits, filters, preferredLangs) {
  let limit = 1;
  if (limits?.autoLimit) {
    limit = parseInt(limits.autoLimit, 10);
  } else if (limits?.mode && !isNaN(parseInt(limits.mode, 10))) {
    limit = parseInt(limits.mode, 10);
  }

  if (isNaN(limit) || limit <= 0) limit = 1;

  if (limit === 1) {
    return streams.length ? [streams[0]] : [];
  }

  const byRes = {};
  for (const s of streams) {
    const k = s.resolution || 'unknown';
    if (!byRes[k]) byRes[k] = [];
    if (byRes[k].length < limit) byRes[k].push(s);
  }
  return Object.entries(byRes)
    .sort(([, a], [, b]) => (b[0]?.resolutionRank ?? -1) - (a[0]?.resolutionRank ?? -1))
    .flatMap(([, v]) => v);
}

function buildGuarantees(all, guarantees, normalStreams, preferredLangs, filters) {
  const resultMap = new Map(); 
  const noHashMap = new Map(); 

  const addStreams = (pool, count, tag) => {
    let added = 0;
    for (const p of pool) {
      if (added >= count) break;
      
      const key = p.infoHash ? p.infoHash : p._raw.title || p.cleanTitle;
      const map = p.infoHash ? resultMap : noHashMap;

      if (map.has(key)) {
        const existing = map.get(key);
        if (!existing.tags.includes(tag)) {
          existing.tags.push(tag);
        }
        added++;
      } else {
        map.set(key, { p, tags: [tag] });
        added++;
      }
    }
  };

  const passesBasic = (p) => {
    if (filters.no3D && p.is3D) return false;
    if (filters.maxSizeGB > 0 && p.sizeBytes > filters.maxSizeGB * 1e9) return false;
    if (filters.resolutions?.length && !filters.resolutions.includes(p.resolution)) return false;
    if (filters.hdr?.length && (!p.hdr || !p.hdr.some(h => filters.hdr.includes(h)))) return false;
    if (filters.codecs?.length && (!p.codec || !filters.codecs.includes(p.codec))) return false;
    if (filters.audioCodecs?.length && (!p.audioTags || !p.audioTags.some(a => filters.audioCodecs.includes(a)))) return false;
    if (filters.langs?.length && filters.strictLang) {
      const hasSpecificLang = p.langCodes && p.langCodes.some(c => filters.langs.includes(c));
      const hasMulti = filters.langs.includes('MULTI') && p.isMulti;
      if (!hasSpecificLang && !hasMulti) return false;
    }
    return true;
  };

  const passesStrict = (p) => {
    if (filters.cacheOnly && !p.isCached) return false;
    if (filters.minSeeds > 0 && !p.isCached && p.seeds < filters.minSeeds) return false;
    return true;
  };

  if (guarantees.quality?.enabled) {
    const pool = [...all]
      .filter(p => passesBasic(p) && passesStrict(p))
      .sort((a, b) => {
        return (b.resolutionRank - a.resolutionRank) ||
               (b.qualityRank - a.qualityRank) ||
               (b.topHdrRank - a.topHdrRank) ||
               (b.seeds - a.seeds) ||
               (getLangScore(b, preferredLangs) - getLangScore(a, preferredLangs));
      });
    const count = (guarantees.quality.backups || 0) + 1;
    const tag   = guarantees.quality.tag || '💎';
    addStreams(pool, count, tag);
  }

  if (guarantees.language?.enabled && preferredLangs.length) {
    const pool = [...all]
      .filter(p => passesBasic(p) && getLangScore(p, preferredLangs) > 0)
      .sort((a, b) => {
        const aStrict = passesStrict(a) ? 1 : 0;
        const bStrict = passesStrict(b) ? 1 : 0;
        
        if (guarantees.language.cacheOnly) {
          if (a.isCached && !b.isCached) return -1;
          if (!a.isCached && b.isCached) return 1;
          if (!a.isCached && !b.isCached) return 0; 
        } else {
          if (aStrict !== bStrict) return bStrict - aStrict;
        }
        
        const langDiff = getLangScore(b, preferredLangs) - getLangScore(a, preferredLangs);
        if (langDiff !== 0) return langDiff;

        const cacheDiff = (b.isCached ? 1 : 0) - (a.isCached ? 1 : 0);
        if (cacheDiff !== 0) return cacheDiff;

        if (guarantees.language.priority === 'seeds_res') {
          return (b.seeds - a.seeds) || (b.resolutionRank - a.resolutionRank);
        } else {
          return (b.resolutionRank - a.resolutionRank) || (b.seeds - a.seeds);
        }
      });
      
    const finalPool = guarantees.language.cacheOnly ? pool.filter(p => p.isCached) : pool;

    const count = (guarantees.language.backups || 0) + 1;
    const tag   = guarantees.language.tag || '📌';
    addStreams(finalPool, count, tag);
  }

  if (guarantees.speed?.enabled) {
    const cond = guarantees.speed.conditionalSeeds || 0;
    const maxNormal = normalStreams.length ? Math.max(...normalStreams.map(s => s.seeds)) : 0;
    
    if (cond === 0 || maxNormal < cond) {
      const pool = [...all]
        .filter(p => passesBasic(p) && passesStrict(p))
        .sort((a, b) => {
          return (b.seeds - a.seeds) ||
                 (b.resolutionRank - a.resolutionRank);
        });
      const count = (guarantees.speed.backups || 0) + 1;
      const tag   = guarantees.speed.tag || '🚀';
      addStreams(pool, count, tag);
    }
  }

  const out = [];
  for (const v of resultMap.values()) out.push({ p: v.p, tag: v.tags.join('') });
  for (const v of noHashMap.values()) out.push({ p: v.p, tag: v.tags.join('') });
  return out;
}

function buildOriginalLink(all, includeOriginalLang, filters) {
  if (!includeOriginalLang) return null;
  const pool = [...all].filter(p => {
    if (filters.cacheOnly && !p.isCached) return false;
    if (filters.minSeeds > 0 && !p.isCached && p.seeds < filters.minSeeds) return false;
    return p.langCodes && (p.langCodes.includes('EN') || p.langCodes.includes('JP'));
  }).sort((a, b) => (b.resolutionRank - a.resolutionRank) || (b.seeds - a.seeds));
  
  if (pool.length > 0) {
    return { p: pool[0], tag: '🌐' };
  }
  return null;
}
