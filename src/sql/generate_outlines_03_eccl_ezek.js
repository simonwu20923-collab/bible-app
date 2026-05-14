#!/usr/bin/env node
// generate_outlines_03_eccl_ezek.js
// Books 21-30: Ecclesiastes through Ezekiel
// Usage: node generate_outlines_03_eccl_ezek.js >> bible_data_outlines.sql

'use strict';

function esc(s) { return (s || '').replace(/'/g, "''"); }

function parseRef(ref) {
  if (!ref || ref === '-' || ref === '') return [null, null];
  const m = ref.match(/^(\d+)(?::(\d+))?$/);
  if (!m) return [null, null];
  return [+m[1], m[2] !== undefined ? +m[2] : null];
}

const ROMANS = new Set([
  'I','II','III','IV','V','VI','VII','VIII','IX','X',
  'XI','XII','XIII','XIV','XV','XVI','XVII','XVIII','XIX','XX'
]);

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
    return `('${abbr}','en',${r.level},'${esc(r.prefix)}','${esc(r.title)}',` +
           `${nv(sc)},${nv(sv)},${nv(ec)},${nv(ev)},${i + 1})`;
  });
  return [
    `DELETE FROM bible_outlines WHERE book_abbr = '${abbr}' AND lang = 'en';`,
    `INSERT INTO bible_outlines (book_abbr,lang,level,prefix,title,start_chapter,start_verse,end_chapter,end_verse,sort_order) VALUES`,
    vals.join(',\n') + ';',
    ''
  ].join('\n');
}

// â”€â”€ book data â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

const ECCL = `
I.|The opening word|1:1
II.|The writer's experiments|1:12
A.|In wisdom and knowledge|1:12
B.|In pleasure|2:1
C.|In being a wise man or a fool|2:12
D.|In fate under God's sovereignty|3:1
E.|In ranks and classes in human society|3:16
F.|In contacting God|5:1
G.|In sundry illustrations|5:8
III.|The writer's searching and testing|7:1
A.|Words of wisdom|7:1
B.|Advice to young men|11:9
C.|The sad portrait of man's old age|12:2
IV.|The concluding word|12:13
`;

const SONG = `
I.|Drawn to pursue Christ for satisfaction|1:2
A.|Attracted to run after Christ|1:2
B.|Fellowshipping with Christ resulting in entering into the church life|1:4
C.|Transformed by the remaking of the Spirit|1:9
D.|Satisfied with the rest and enjoyment in Christ|1:16
II.|Called to be delivered from the self through the oneness with the cross|2:8
A.|By Christ's resurrection power through His fellowship|2:8
B.|Entreated and encouraged|2:10
C.|Called to be in oneness with the cross|2:14
D.|The lover's rejection and failure|2:16
E.|The lover's waking up and recovery|3:2
F.|Christ's charge to the meddling believers|3:5
III.|Called to live in ascension as the new creation in resurrection|3:6
A.|The new creation|3:6
1.|By the lover's complete union with Christ|3:6
2.|The beauty of the lover, the bride, as the new creation|4:1
3.|Her deeper pursuit|4:6
B.|Called to live in ascension|4:7
1.|His calling|4:7
2.|Her silent answer|4:9
3.|His private enjoyment of her|4:10
C.|Living a life of love|4:16
1.|The answer of the bride|4:16
2.|The answer of the Beloved|5:1
IV.|Called more strongly to live within the veil through the cross after resurrection|5:2
A.|The stronger call of the cross after resurrection and her failure|5:2
1.|The Beloved's calling|5:2
2.|Her refusal|5:3
3.|Her opening of the door|5:4
4.|The Beloved's hiding|5:6
5.|Her being wounded|5:7
6.|Her seeking help from the common believers|5:8
7.|The first question asked of her|5:9
8.|Her impression of her Beloved|5:10
9.|The second question asked of her|6:1
10.|Her reply|6:2
B.|A life within the veil|6:4
1.|The Beloved's praise|6:4
2.|The lover's work|6:11
3.|The lover's progress and victory|6:12
V.|Sharing in the work of the Lord|7:1
A.|Equipped as a worker in the work of the Lord|7:1
1.|The Spirit's review of the virtues of the lover|7:1
2.|The Beloved's inserted words of praise|7:6
B.|Working together with her Beloved|7:9
VI.|Hoping to be raptured|8:1
A.|Groaning for her flesh|8:1
B.|Hoping to be saved from her groaning for the flesh, indicating her hope to be raptured|8:2
C.|Before the rapture|8:5
`;

const ISA = `
I.|The salvation of Jehovah to His beloved people and the nations|1:1
A.|Jehovah the Father's complaint against His children Israel, His chastisement and loving exhortation|1:1
1.|The restoration of the nation of Israel|2:2
2.|Jehovah's humiliating judgment on the haughty nations|2:7
3.|The ushering in of the God-man, Christ, issuing in Israel's restoration|4:2
B.|The vision of Christ in glory|6:1
C.|Christ's warning commission to Isaiah|6:8
D.|God's dealing with the unbelief of Ahaz the king of Judah|7:1
E.|Christ as Immanuel|8:9
F.|The unveiling of Christ as the great light and wonderful One|9:1
1.|The unveiling of Christ as the great light|9:1
2.|The unveiling of Christ as the wonderful One|9:6
3.|Jehovah's chastisement on the kingdom of Israel|9:8
4.|Jehovah's judgment on Assyria|10:5
G.|The restoration brought in through Christ|11:1
H.|The salvation enjoyed by Jehovah's beloved people|12:1
II.|The judgment of Jehovah upon the nations unveiling Satan's oneness with nations|13:1
A.|The judgment of Jehovah — to destroy Babylon|13:1
1.|The unveiling of Satan's kingdom of darkness behind the nations|14:12
B.|The judgment of Jehovah — to break Assyria|14:24
C.|The judgment of Jehovah — to destroy Philistia|14:28
D.|The judgment of Jehovah — to devastate Moab|15:1
E.|The judgment of Jehovah — to ruin Damascus|17:1
F.|The judgment of Jehovah — to strike Egypt|19:1
G.|The judgment of Jehovah — to take Egypt into captivity|20:1
H.|The judgment of Jehovah — to destroy Babylon for its idols|21:1
I.|Jehovah to have no judgment on Dumah|21:11
J.|The judgment of Jehovah — to desolate Arabia|21:13
K.|The judgment of Jehovah — to trample down Jerusalem|22:1
1.|Christ as a Father to Jerusalem and a peg in a sure place|22:20
L.|The judgment of Jehovah — to destroy Tyre|23:1
III.|Jehovah's dealing with His beloved Israel issuing in revival and restoration|24:1
A.|Jehovah's reaction to Israel's degradation and the nations' action|24:1
B.|Jehovah's punishment on Ephraim's drunkards issuing in restoration|28:1
C.|Jehovah's judgment on the hypocrisy of Jerusalem's worshippers|29:1
D.|Jehovah's dealing with Israel's reliance on Egypt|30:1
E.|Jehovah's destruction of the nations for Christ to be the King|32:1
IV.|An example of seeking after Jehovah and trusting in Him|36:1
A.|Hezekiah's seeking after Jehovah for his situation|36:1
B.|Hezekiah's seeking after Jehovah for his health|38:1
C.|Hezekiah's failure in the enjoyment of the peaceful situation|39:1
V.|The Servant of Jehovah and the salvation brought in by Him|40:1
A.|Jehovah's word of comfort to Israel|40:1
B.|Christ as the Servant of Jehovah|41:1
1.|As typified by Cyrus and by Israel|41:1
2.|As a covenant for the people and a light for the nations|42:1
3.|As typified by Cyrus to be Jehovah's shepherd|43:1
a.|Jehovah's word of comfort and encouragement to Israel|43:1
b.|Jehovah's word of shepherding to His servant Israel|44:1
c.|A servant and a witness of Jehovah|45:1
4.|As typified by Cyrus to release Jehovah's captives|46:1
5.|As typified by Isaiah the prophet of Jehovah|49:1
a.|The three persons of the servant of Jehovah|49:1
b.|The blessed return of the captives|49:9
c.|How Jehovah treasures Zion|49:14
d.|Jehovah lifting up His hand to the nations|49:22
e.|The reason for Zion's being forsaken|50:1
f.|The instruction the servant of Jehovah received|50:4
g.|He who fears Jehovah and hears His servant's voice has light|50:10
6.|In relation to Jehovah's loving dealing with His beloved Israel|51:1
a.|Jehovah's calling of Israel|51:1
b.|Jehovah's righteousness and salvation for Israel|51:4
c.|Jehovah's arm for Israel|51:9
d.|Jehovah's encouragement to Jerusalem|51:17
e.|Jehovah's encouragement to Zion|52:1
f.|Jehovah's good news for Zion and Jerusalem|52:7
g.|Jehovah's charge to Israel to depart from Babylon|52:11
7.|The prosperity of Christ as the Servant of Jehovah|52:13
8.|Christ's dynamic redemption through vicarious death and resurrection|53:1
a.|His dynamic redemption through vicarious death and resurrection|53:1
b.|His being the covenant for Israel's security|54:1
9.|Christ being an eternal covenant to Israel|55:1
a.|Christ being the center of divine provisions to Israel|55:1
b.|Seeking Jehovah and returning to Him and His word|55:6
c.|Preserving justice and doing righteousness for prosperity|56:1
d.|The rebuking of the blind watchmen and self-seeking shepherds|56:9
10.|The evil condition and need of the wicked of the house of Jacob|57:1
a.|It being better for the righteous to die|57:1
b.|The evils of the wicked of the house of Jacob|57:3
c.|The wicked not remembering Jehovah and not fearing Him|57:11
d.|Jehovah's blessing to him who takes refuge in Him|57:13
e.|The hypocrisy of the house of Jacob|58:1
f.|The instruction of Jehovah to the house of Jacob|58:9
11.|As the Redeemer to save Jacob from sins and become Israel's light forever|59:1
a.|Jehovah's hand not being so short that it cannot save|59:1
b.|The sins and iniquities of Jacob|59:3
c.|The issue of Jacob's sins and iniquities|59:9
d.|The saving of Jehovah's arm toward Jacob|59:15
e.|Christ becoming Israel's light and glory forever|60:1
12.|The ministry of the Anointed of Jehovah, Christ|61:1
a.|The ministry of the Anointed of Jehovah|61:1
b.|The restoration of Israel|61:4
13.|The second coming of Christ, bringing in restoration of all things|64:1
`;

const JER = `
I.|Jeremiah's call and commission|1:1|1:9
A.|Introduction|1:1
B.|Jeremiah's call|1:4
C.|Jeremiah's commission|1:9
II.|Israel's sin against Jehovah and Jehovah's punishment upon Israel|2:1|22:9
A.|Israel's two evils — forsaking Jehovah and hewing out broken cisterns|2:1
B.|Israel's return or Jehovah's correction for her apostasy|3:6|4:3
1.|Israel the wife's apostasy|3:6
2.|Israel the wife's return|3:12
3.|Jehovah the Husband's correction|4:3
C.|Jehovah's complaint against Judah's wickednesses in detail|5:1
D.|Jehovah's determination in correcting the wife|6:1
E.|Judah's hypocritical worship to Jehovah|7:1
F.|Judah's breaking of Jehovah's covenant|11:1
G.|Jehovah's punishment with drought|14:1|15:9
H.|Jehovah's further commission to Jeremiah|15:10
I.|Jehovah's statement of Judah's sins|16:10
J.|Jehovah as the Potter and Israel as the pottery|18:1|20:18
K.|Jehovah's condemnation of the kings of Judah|21:1
L.|Jehovah's condemnation of the prophets of Judah|23:9
M.|Judah's captivity|24:1|25:38
N.|Judah's reaction to Jeremiah|26:1
O.|Jeremiah's genuine prophecies versus false prophecies|27:1|29:32
P.|Jehovah's promise concerning restoration of Israel|30:1|33:26
Q.|Israel's stubbornness and Jeremiah's firmness|34:1|45:5
III.|Jehovah's punishment upon nations involved with God's elect|46:1|51:64
IV.|A supplement to the history of captivity|52:1|52:34
`;

const LAM = `
I.|The first lamentation — a lamentation over the desolation of the holy city|1:1
A.|Her distressing circumstances|1:1
B.|Her entreating the sympathy of the passers-by|1:12
C.|Her prayer to Jehovah|1:20
II.|The second lamentation — a lamentation over the destruction of the holy city|2:1
A.|Jehovah the Lord's destruction of the holy city|2:1
B.|The prophet's lament|2:11
C.|Her prayer to Jehovah|2:20
III.|The third lamentation — a lamentation over the afflicted prophet identified with his punished people|3:1
A.|The prophet's (representing his people's) affliction|3:1
B.|The prophet's (representing his people's) hope|3:21
C.|The prophet's request to his people|3:40
D.|The prophet's (representing his people's) prayer to Jehovah|3:55
IV.|The fourth lamentation — a lamentation over the punished people|4:1
A.|Afflicted with the lack of food in their siege|4:1
B.|Consumed by the burning anger of Jehovah's wrath|4:11
C.|Their hope in the future|4:21
V.|The fifth lamentation — a lamentation as a prayer for the holy people as the conclusion of the fourth lamentation|5:1
`;

const EZEK = `
I.|Introduction|1:1
II.|The vision of the form of Jehovah's glory for His appearance, His movement and His governance|1:4
A.|The wind, the cloud, the fire, and the electrum|1:4
B.|The four living creatures|1:5
C.|The high and awesome wheels|1:15
D.|The expanse like the sight of awesome crystal|1:22
E.|The man on the throne|1:26
III.|God judging His people and the heathen nations as a consuming fire|2:1
A.|God's judgment of Israel in their degradation|2:1
1.|Ezekiel's call and commission|2:1
2.|The judgment on Jerusalem|4:1
3.|The judgment on the land of Israel|6:1
4.|The glory of Jehovah departing|8:1
5.|God confirming the prophecies of judgment|12:1
B.|God's judgment of the heathen nations|25:1
IV.|God recovering His people by life|33:1
V.|The vision of the holy building of God|40:1
`;

const DAN = `
I.|The issue of the degradation of God's elect — the captivity to Babylon|1:1
II.|The victory, in their captivity, of the young descendants of God's degraded elect over Satan's further devices|1:3
A.|Over the demonic diet|1:3
B.|Over the devilish blinding preventing people from seeing the great human image in Nebuchadnezzar's dream|2:1
1.|Nebuchadnezzar's marvelous dream|2:1
2.|Daniel's vision from God concerning Nebuchadnezzar's dream|2:14
a.|God's vision given to Daniel|2:14
b.|Daniel's interpretation of Nebuchadnezzar's dream|2:24
3.|Nebuchadnezzar's honoring of Daniel|2:46
C.|Over the seduction of idol worship|3:1
D.|Over the covering hindering people from seeing the ruling of the heavens|4:1
E.|Over the ignorance concerning debauchery before God and insult to His holiness|5:1
F.|Over the subtlety prohibiting faithfulness of overcomers in worship of God|6:1
III.|The visions of the overcoming Daniel|7:1
A.|Concerning the four beasts out of the Mediterranean Sea|7:1
B.|Concerning a ram and male goat with successors — Persia and Greece|8:1
C.|Concerning Israel in the seventy weeks apportioned to them|9:1
D.|Concerning the destiny of Israel|10:1
`;

// â”€â”€ output â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
const books = [
  ['Eccl', ECCL],
  ['Song', SONG],
  ['Isa',  ISA],
  ['Jer',  JER],
  ['Lam',  LAM],
  ['Ezek', EZEK],
  ['Dan',  DAN],
];

console.log('-- Books 21-27: Ecclesiastes – Daniel');
console.log('');

for (const [abbr, data] of books) {
  process.stdout.write(bookSQL(abbr, data));
}

