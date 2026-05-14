// generate_outlines_04_hos_hag.js
// Books 28-37: Hos, Joel, Amos, Obad, Jonah, Mic, Nah, Hab, Zeph, Hag
// Run: node generate_outlines_04_hos_hag.js >> bible_data_outlines.sql

function esc(s) { return (s || '').replace(/'/g, "''"); }

function parseRef(ref) {
  if (!ref || ref === '-' || ref === '') return [null, null];
  const m = ref.match(/^(\d+)(?::(\d+))?$/);
  if (!m) return [null, null];
  return [+m[1], m[2] !== undefined ? +m[2] : null];
}

const ROMANS = new Set(['I','II','III','IV','V','VI','VII','VIII','IX','X',
  'XI','XII','XIII','XIV','XV','XVI','XVII','XVIII','XIX','XX']);

function inferLevel(p) {
  p = p.trim();
  const stripped = p.replace(/[.)]$/, '');
  if (stripped.includes('.')) return stripped.split('.').length;
  if (ROMANS.has(stripped)) return 1;
  if (/^[A-Z]/.test(stripped)) return 2;
  if (p.endsWith(')') && /^\d/.test(stripped)) return 5;
  if (p.endsWith(')') && /^[a-z]/.test(stripped)) return 6;
  if (/^\d/.test(stripped)) return 3;
  if (/^[a-z]/.test(stripped)) return 4;
  return 1;
}

function parseLine(line) {
  const parts = line.split('|');
  if (/^\d+$/.test(parts[0].trim())) {
    return { level: +parts[0], prefix: parts[1], title: parts[2],
             startRef: parts[3] || '', endRef: parts[4] || '' };
  }
  return { level: inferLevel(parts[0]), prefix: parts[0], title: parts[1],
           startRef: parts[2] || '', endRef: parts[3] || '' };
}

function bookSQL(abbr, lines) {
  const rows = lines.trim().split('\n').map(parseLine);
  const vals = rows.map((r, i) => {
    const [sc, sv] = parseRef(r.startRef);
    const [ec, ev] = parseRef(r.endRef);
    const nv = v => v !== null ? v : 'NULL';
    return `('${abbr}','en',${r.level},'${esc(r.prefix)}','${esc(r.title)}',`+
           `${nv(sc)},${nv(sv)},${nv(ec)},${nv(ev)},${i + 1})`;
  });
  return [`DELETE FROM bible_outlines WHERE book_abbr = '${abbr}' AND lang = 'en';`,
    `INSERT INTO bible_outlines (book_abbr,lang,level,prefix,title,start_chapter,start_verse,end_chapter,end_verse,sort_order) VALUES`,
    vals.join(',\n') + ';', ''].join('\n');
}

// â”€â”€ Hosea â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
const HOS = `
I.|The introductory word|1:1
II.|A wife of harlotries|1:2
A.|The prophet Hosea taking a wife of harlotries|1:2
B.|Promise of restoration|1:10
C.|The harlotries of the wife of the prophet Hosea|2:2
D.|Jehovah's restoration of the adulterous and apostate Israel|2:14
E.|The confirmation of God's faithful restoration of Israel|3:1
III.|A people of apostasy|4:1
A.|The sins of Israel and the punishments of Jehovah|4:1
1.|Concerning the people in general|4:1
2.|Concerning the priests|4:4
3.|Concerning fornication, wine, and harlotries|4:11
4.|Concerning Israel's stubbornness|4:15
5.|Mainly concerning the priests, the house of the king, and the princes|5:1
B.|The return of the apostate people|5:15
C.|The sins of Israel in forsaking Jehovah|7:1
D.|Jehovah's punishments on Israel because of their forsaking of Him|8:1
E.|The idolatry of Israel against Jehovah and the punishments of Jehovah upon Israel|9:1
F.|Jehovah's unchanging love subduing Israel's stubborn unchastity|11:1
IV.|The restoration of Israel|14:1
`;

// â”€â”€ Joel â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
const JOEL = `
I.|The introductory word|1:1
II.|The plague of the locusts (the nations)|1:2
III.|The turn of Jehovah to His elect, Israel|2:12
IV.|The judgment of Christ upon the nations — the judgment upon the living|3:1
V.|The victory of Christ over the nations and His reign among Israel|3:16
`;

// â”€â”€ Amos â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
const AMOS = `
I.|The introductory word|1:1
II.|Jehovah's judgments on the surrounding nations|1:3
A.|On Damascus|1:3
B.|On Gaza|1:6
C.|On Tyre|1:9
D.|On Edom|1:11
E.|On Ammon|1:13
F.|On Moab|2:1
III.|Jehovah's judgments on Judah and Israel|2:4
A.|On Judah|2:4
B.|On Israel|2:6
IV.|Jehovah's contending with the house of Jacob|3:1
A.|Jehovah's three reproofs to Israel|3:1
1.|The first reproof|3:1
2.|The second reproof|4:1
3.|The third reproof|5:1
B.|The plagues of the five signs seen by Amos|6:1
1.|The introduction|6:1
2.|The plague of the first sign — locusts|7:1
3.|The plague of the second sign — fire|7:4
4.|The plague of the third sign — plumb line|7:7
5.|The frustration of Amaziah|7:10
6.|The plague of the fourth sign — summer fruit|8:1
7.|The plague of the fifth sign — Lord standing upon the altar|9:1
V.|The restoration of the house of Israel|9:11
`;

// â”€â”€ Obadiah â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
const OBAD = `
I.|The introductory word|1:1
II.|Jehovah's dealing with Edom|1:1
III.|The evils of Edom|1:10
IV.|The day of Jehovah upon all the nations|1:15
V.|The issue of Jehovah's dealing|1:17
`;

// â”€â”€ Jonah â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
const JONAH = `
I.|The introductory word|1:1
II.|Jonah's fleeing from Jehovah's commission|1:2
III.|Jonah's repenting|2:1
IV.|Jonah's preaching|3:1
V.|Jonah's prejudice|4:1
`;

// â”€â”€ Micah â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
const MIC = `
I.|The introductory word|1:1
II.|Jehovah's reproof on Israel|1:2
III.|Jehovah's comfort to Israel|2:12
IV.|Jehovah's contention with Israel|6:1
A.|Taking the past history as a base|6:1
B.|Aspiring after Israel's genuine worship and sincere service|6:6
C.|Stating the cause and effect—Israel's sins and Jehovah's punishment|6:9
V.|The prophet's observation and expectation|7:1
A.|His observation of discouragement|7:1
B.|His expectation of encouragement|7:7
`;

// â”€â”€ Nahum â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
const NAH = `
I.|The introductory word|1:1
II.|Jehovah as the majestic Judge|1:2
III.|Jehovah's judgment on Nineveh|1:8
A.|The verdict concerning Nineveh's destruction and the promise of comfort to Judah|1:8
B.|A vision of the destruction of Nineveh|2:1
C.|The devastation of the people of Nineveh|3:1
D.|The miserable end of the king of Assyria|3:18
`;

// â”€â”€ Habakkuk â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
const HAB = `
I.|The introductory word|1:1
II.|The first dialogue between the prophet and Jehovah|1:2
A.|The prophet's inquiring of Jehovah|1:2
B.|Jehovah's answer to the prophet|1:5
III.|The second dialogue between the prophet and Jehovah|1:12
A.|The prophet's inquiring of Jehovah|1:12
B.|Jehovah's answer to the prophet|2:1
1.|Five woes to the Chaldeans|2:5
IV.|The prophet's song to Jehovah in prayer, lauding, and trusting in Him|3:1
A.|In prayer|3:1
B.|In lauding|3:3
C.|In trusting in Jehovah|3:16
`;

// â”€â”€ Zephaniah â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
const ZEPH = `
I.|The introductory word|1:1
II.|Jehovah's judgment|1:2
A.|On Israel|1:2
B.|On the nations|2:4
1.|On the Philistines|2:4
2.|On Moab and Ammon|2:8
3.|On the Cushites|2:12
4.|On Assyria|2:13
C.|On Israel|3:1
D.|On all the nations|3:8
III.|Jehovah's salvation|3:9
A.|To the Gentiles|3:9
B.|To Israel|3:10
`;

// â”€â”€ Haggai â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
const HAG = `
I.|The introductory word|1:1
II.|Jehovah's rebuke and charge concerning the delay of the building of His house|1:2|1:11
A.|Jehovah's rebuke|1:2|1:6
B.|Jehovah's charge|1:7|1:8
C.|Jehovah's further rebuke|1:9|1:11
D.|The people's response|1:12
III.|The prophecy concerning the house of Jehovah in the millennium and the promise concerning the Messiah in the coming kingdom|2:1|2:23
A.|The prophecy concerning the house of Jehovah in the millennium|2:1|2:9
B.|The people's uncleanness and Jehovah's dealing with them and then blessing them|2:10|2:19
C.|The promise concerning the Messiah (typified by Zerubbabel) in the coming kingdom|2:20|2:23
`;

process.stdout.write(bookSQL('Hos',  HOS));
process.stdout.write(bookSQL('Joel', JOEL));
process.stdout.write(bookSQL('Amos', AMOS));
process.stdout.write(bookSQL('Obad', OBAD));
process.stdout.write(bookSQL('Jonah',JONAH));
process.stdout.write(bookSQL('Mic',  MIC));
process.stdout.write(bookSQL('Nah',  NAH));
process.stdout.write(bookSQL('Hab',  HAB));
process.stdout.write(bookSQL('Zeph', ZEPH));
process.stdout.write(bookSQL('Hag',  HAG));

