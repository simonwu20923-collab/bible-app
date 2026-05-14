#!/usr/bin/env node
// generate_outlines_02_1kgs_prov.js
// Books 11-20: 1 Kings through Proverbs
// Usage: node generate_outlines_02_1kgs_prov.js >> bible_data_outlines.sql

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

// Supports explicit level: "N|prefix|title|startRef[|endRef]"
function parseLine(line) {
  const parts = line.split('|');
  if (/^\d+$/.test(parts[0].trim())) {
    return {
      level: +parts[0],
      prefix: parts[1],
      title: parts[2],
      startRef: parts[3] || '',
      endRef: parts[4] || ''
    };
  }
  return {
    level: inferLevel(parts[0]),
    prefix: parts[0],
    title: parts[1],
    startRef: parts[2] || '',
    endRef: parts[3] || ''
  };
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

const KGS1 = `
I.|The old age and decease of David|1:1|2:10
A.|Being old and fading away|1:1
B.|Making Solomon the successor to his throne|1:5
C.|Giving the final charge to Solomon as successor|2:1
D.|Ceasing in his life on earth|2:10
II.|The reign of the kings|2:12
A.|The reign of Solomon|2:12|11:41
1.|Ending rebellion factors for kingdom establishment|2:12
2.|Marrying Egypt's king's daughter|3:1
3.|Seeking God|3:2
4.|Seeking wisdom|3:5
5.|Judging two harlots' quarrel case|3:16
6.|Governmental administration organization|4:1
7.|Prosperity under God's blessing|4:20
8.|Building temple and palaces|6:1|8:65
a.|The temple|6:1
b.|Palaces built with God's dwelling|7:1
c.|Hiram, Solomon's workman|7:13
d.|Two bronze pillars|7:15
e.|Bronze sea with ten lavers|7:23
f.|Hiram's work for Solomon|7:40
g.|Temple vessels|7:48
h.|Temple dedication|8:1|8:65
9.|Solomon's highest glory among nations|9:1|10:14
a.|Jehovah's acceptance and promise|9:1
b.|Alliance with Hiram|9:10
c.|Building further cities|9:15
d.|Yearly offerings|9:25
e.|Navy building with Hiram|9:26
f.|Queen of Sheba's visit|10:1
g.|Hiram's fleet bringing precious goods|10:11
h.|Enriched with tribute and tariff|10:14
10.|Israel's tragic history|11:1|11:41
a.|Solomon's fall|11:1
b.|God's chastisement|11:9
c.|Solomon's decease|11:41
B.|Rehoboam and Jeroboam reigns|11:43|16:27
1.|Rehoboam continuing reign|11:43
2.|Rehoboam suffering kingdom division|12:1
3.|Jeroboam's apostasy|12:25
4.|God's judgment on Bethel altar|13:1
5.|Jeroboam's further apostasy|13:33
6.|Ahijah's prophecy on Jeroboam|14:1
7.|Jeroboam's reign ending in God's punishment|14:19
8.|Rehoboam enthroned over Judah|14:21
9.|Rehoboam defeated by Egypt's king|14:25
10.|Rehoboam fighting Jeroboam continually|14:29
C.|Abijam's reign over Judah|14:31
D.|Asa's reign over Judah|15:8
E.|Nadab's reign over Israel|15:25
F.|Baasha's reign over Israel|15:32
G.|Elah's reign over Israel|16:8
H.|Zimri's reign over Israel|16:15
I.|Omri's reign over Israel|16:21
J.|Ahab's reign over Israel|16:28|22:40
1.|Beginning to reign|16:28
2.|Doing evil beyond predecessors|16:30
3.|Jericho rebuilding bringing prophesied curse|16:34
4.|God's dealing through Elijah|17:1|19:19
a.|Shutting heavens from rain|17:1
b.|Opening heavens to rain|18:1|18:46
c.|Elijah threatened by Jezebel|19:1
5.|Jehovah's commission to Elijah|19:9
6.|Elijah finding Elisha|19:19
7.|Dealing with Ben-hadad of Syria|20:1
8.|Taking Naboth's vineyard by force|21:1
9.|Ahab's miserable ending|22:1|22:40
K.|Jehoshaphat's reign over Judah|22:41
L.|Ahaziah's reign over Israel|22:51
`;

// Note: 2 Kings continues the "II. The reign of the kings" section from 1 Kings
// Letters M onward are sub-items (level 2). The "II." at the top is a section
// header repeating context. The second "II." (after HH) = double-letter, forced level 2.
const KGS2 = `
II.|The reign of the kings (continued from 1 Kings)|2:1
M.|The rapture of Elijah|2:1
N.|Elisha's ministry of grace|2:19
1.|Healing the bad water of Jericho|2:19
2.|Cursing the mocking boys|2:23
3.|Calling the things not being as being|4:1
4.|Resurrecting the dead|4:18
5.|Nullifying the poison of the wild gourds with flour|4:38
6.|Healing leprosy|5:1
7.|Causing the ax head to float by means of a wooden stick|6:1
O.|The reign of Jehoram over Israel|3:1
1.|Fighting against the king of Moab|3:1
2.|Ben-hadad the king of Syria waging war against Israel|6:8
3.|Ben-hadad the king of Syria besieging Samaria|6:24
4.|Elisha telling of a seven-year famine ordered by God|8:1
5.|Elisha's friendly contact with Ben-hadad the king of Syria|8:7
P.|The reign of Jehoram over Judah|8:16
Q.|The reign of Ahaziah over Judah|8:24
R.|The reign of Jehu over Israel|9:1
S.|The illegitimate reign of Athaliah over Judah|11:1
T.|The reign of Joash (Jehoash) over Judah|11:17
U.|The reign of Jehoahaz over Israel|13:1
V.|The reign of Jehoash (Joash) over Israel|13:9
W.|The reign of Amaziah over Judah|14:1
X.|The reign of Jeroboam over Israel|14:23
Y.|The reign of Azariah (Uzziah) over Judah|15:1
Z.|The reign of Zechariah over Israel|15:8
AA.|The reign of Shallum over Israel|15:13
BB.|The reign of Menahem over Israel|15:16
CC.|The reign of Pekahiah over Israel|15:22
DD.|The reign of Pekah over Israel|15:27
EE.|The reign of Jotham over Judah|15:32
FF.|The reign of Ahaz over Judah|15:38
GG.|The reign of Hoshea over Israel|17:1
HH.|The reign of Hezekiah over Judah|18:1
1.|Hezekiah's prosperity|18:1
2.|The invasion of the Assyrians|18:9
a.|The invasion under Shalmaneser the king of Assyria|18:9
b.|The attacking and challenging of Sennacherib the king of Assyria|18:13
3.|The healing of Jehovah|20:1
4.|The failure of Hezekiah|20:12
5.|Hezekiah bringing water into the city and his end|20:20
2|II.|The reign of Manasseh|20:21
JJ.|The reign of Amon|21:18
KK.|The reign of Josiah|21:26
LL.|The reign of Jehoahaz|23:30
MM.|The beginning of the reign of Jehoiakim|23:34
NN.|The reign of Jehoiachin|24:6
OO.|Nebuchadnezzar the king of Babylon besieging Jerusalem|24:10
PP.|The reign of Zedekiah|24:17
QQ.|The fall of Jerusalem and the carrying away of Judah into exile|25:1
RR.|The governing of Gedeliah|25:22
`;

const CHR1 = `
I.|The genealogy from Adam to the twelve tribes of Israel|1:1
A.|The genealogy from Adam to Abraham|1:1
B.|The genealogy of Abraham|1:28
C.|The genealogy of Esau|1:35
D.|The genealogy of Israel|2:1
1.|The sons of Israel|2:1
2.|The genealogy of Judah|2:3
3.|The genealogy of Simeon|4:24
4.|The genealogy of Reuben|5:1
5.|The genealogy of Gad|5:11
6.|An insertion concerning the children of Reuben, the Gadites, and the half-tribe of Manasseh|5:18
7.|The genealogy of Levi|6:1
8.|The genealogy of Issachar|7:1
9.|The genealogy of Benjamin|7:6
10.|The genealogy of Naphtali|7:13
11.|The genealogy of Manasseh|7:14
12.|The genealogy of Ephraim|7:20
13.|The genealogy of Asher|7:30
14.|The genealogy of the returned children of Israel|9:1
15.|The genealogy of the house of Saul|9:35
II.|The history concerning the kings over all Israel|10:1
A.|Saul's end|10:1
B.|The reign of David|11:1
1.|Crowned and established as king|11:1
2.|His mighty men|11:10
3.|Taking care of the habitation of the Ark of God|13:1
4.|Wanting to build a house for God|17:1
5.|His conquests|18:1
a.|Over the Philistines, Moab, Zobah, Syria, and Edom|18:1
b.|Over Ammon and Syria|19:1
c.|Over the Philistines|20:4
6.|His last sin|21:1
7.|His preparations for the building of the temple of God|22:2
8.|His arrangement of the order of the services of the priests and the Levites|23:1
a.|Making Solomon his son king over Israel|23:1
b.|The divisions of the services of the Levites|23:2
c.|The ordering of the priests in twenty-four divisions|24:1
d.|The rest of the Levites casting lots for their duty|24:20
e.|Setting apart some of the sons of Asaph, Heman, and Jeduthun into twenty-four divisions for singing|25:1
f.|The divisions of the doorkeepers|26:1
g.|Assigning some of the Levites to keep the treasures of the house of God and of the dedicated gifts|26:20
h.|Appointing some of the Levites to the outward duties over Israel, as officers and judges|26:29
9.|The officers in the administration of David's government|27:1
a.|The officers who served the king|27:1
b.|The captains who ruled over the twelve tribes and the house of Aaron|27:16
c.|The officers over the king's treasures and the overseers of the king's property|27:25
d.|David's counselors, teachers, friends, and the captain of his army|27:32
10.|Assembling all the leaders of Israel at Jerusalem|28:1
a.|His address to the assembly|28:1
b.|Charging Solomon his son to serve God and to build the temple of God|28:9
c.|His preparation for the building of the temple of God stirring up the leaders of Israel to willingly offer their gifts|29:1
d.|His blessing to Jehovah in the sight of all the assembly|29:10
e.|The reaction of all the assembly|29:20
11.|Ceasing his life on earth|29:26
`;

const CHR2 = `
II.|The history concerning the kings over all Israel (continued)|1:1
A.|Saul's end|
B.|The reign of David|
C.|The reign of Solomon|1:1|9:29
1.|Seeking for wisdom|1:1
2.|His prosperity under the rich blessing of God|1:13
3.|Building the temple of God as well as his own palaces|3:1|7:10
a.|The temple|3:1
b.|The two bronze pillars|3:15
c.|The bronze altar|4:1
d.|The bronze sea with the ten bronze lavers|4:2
e.|The vessels of the temple|4:7
f.|The courts|4:9
g.|Huram's work for Solomon|4:11
h.|The dedication of the temple|5:2|7:3
1)|The tabernacle being merged with the temple|5:2
2)|Solomon's blessing and declaration to the people|6:1
3)|Solomon's prayer|6:12
4)|The glory of Jehovah filling the house|7:1
5)|Solomon and the people offering sacrifices|7:4
6)|Solomon and his people holding a feast for fourteen days|7:8
4.|The highest peak of his glory among the nations|7:11|9:28
5.|His decease after reigning forty years|9:29
III.|The history concerning the kings of Judah|9:31|36:23
A.|The reign of Rehoboam|9:31|12:15
B.|The reign of Abijah|12:16
C.|The reign of Asa|14:1
D.|The reign of Jehoshaphat|17:1
E.|The reign of Jehoram|21:6
F.|The reign of Ahaziah|22:1
G.|The illegitimate reign of Athaliah|22:10
H.|The reign of Joash|23:16
I.|The reign of Amaziah|24:27
J.|The reign of Uzziah|26:1
K.|The reign of Jotham|26:23
L.|The reign of Ahaz|27:9
M.|The reign of Hezekiah|28:27|32:26
N.|The reign of Manasseh|32:33
O.|The reign of Amon|33:20
P.|The reign of Josiah|33:25
Q.|The reign of Jehoahaz|36:1
R.|The reign of Jehoiakim|36:4
S.|Nebuchadnezzar carrying vessels to Babylon|36:6
T.|The reign of Jehoiachin|36:8
U.|The reign of Zedekiah|36:10
V.|The deportation to Babylon|36:14|36:23
`;

const EZRA = `
I.|The return of the captivity under the kingly leadership of Zerubbabel|1:1
A.|The decree of Cyrus the king of Persia|1:1
B.|The response of the heads of the fathers' houses of Judah and Benjamin, the priests, and the Levites|1:5
C.|The cooperation of King Cyrus|1:7
D.|The number of the returned captives|2:1
E.|The willing offering for the house of Jehovah|2:68
F.|The rebuilding of the altar of God|3:1
G.|The rebuilding of the house of God|3:6
H.|The frustration|4:1
I.|The rebuilding work continuing through the encouragement and help of the prophecies of Haggai and Zechariah|5:1
J.|The confirmation of the decree of Darius the king of Persia|5:3
K.|The completion of the rebuilding of the house of God|6:13
L.|The dedication of the rebuilt house of God|6:16
M.|The keeping of the Passover by the children of the captivity|6:19
II.|The return of the captivity under the priestly leadership of Ezra|7:1
A.|The return of the captivity under Ezra|7:1
1.|The beginning of the return through the request of Ezra to the king|7:1
2.|The decree of Artaxerxes the king of Persia to Ezra|7:11
3.|The genealogical enrollment of those who returned from captivity|8:1
4.|Ezra's proclamation of a fast before they left Babylon|8:21
5.|Ezra's provision for the offerings for the house of God|8:24
6.|The journey and arrival of the returned captivity|8:31
7.|The offerings to God by the returned captivity|8:35
8.|The returned captivity's delivery of the king's decrees to the king's satraps and to the governors beyond the River|8:36
B.|The purification of the returned captives from the defilement of foreign wives|9:1
1.|Initiated by the officials of the returned captives|9:1
2.|Ezra's reaction|9:3
3.|The congregation's reaction|10:1
4.|The final decision|10:6
`;

const NEH = `
I.|The rebuilding of the city of Jerusalem under Nehemiah|1:1
A.|The report of the condition of Jerusalem|1:1
B.|Nehemiah's prayer by fasting|1:4
C.|The king's favor in giving permission to Nehemiah|2:1
D.|Nehemiah's journey to Jerusalem and his personal observation|2:9
E.|The rebuilding of the wall of Jerusalem|2:17
F.|A record of the building of the wall|3:1
G.|The frustration of the enemy|4:1
H.|The settlement of the interior problem|5:1
1.|The people's complaint concerning the nobles' and rulers' imposing interest|5:1
2.|Nehemiah's rebuke and resolution|5:6
3.|Nehemiah's good example|5:14
I.|The further frustration of the enemy|6:1
J.|The completion of the building|6:15
K.|Enrolling the returned captives for population increase|7:5
II.|The reconstitution of the nation of God's elect|8:1
A.|The renewing of the covenant under Ezra|8:1
1.|Coming back to God by returning to His law and word|8:1
2.|Making confession and firm covenant with God|9:1
B.|The reforming of the nation|11:1
1.|The arrangement of dwellings and appointment of officers|11:1
2.|A record of the priests and Levites|12:1
3.|The dedication of the rebuilt wall|12:27
4.|Appointment of services and supply of priests' and Levites' needs|12:44
5.|The clearance exercised on Israel as God's elect|13:1
6.|Nehemiah appointing duties for wood offering and firstfruits|13:30
`;

const ESTH = `
I.|The secret care of the hiding God for His oppressed elect in their dispersion as seen in Esther|1:1
A.|Establishing a top king in the Gentile world|1:1
B.|Causing the king to depose his queen|1:3
C.|Raising up a Jewish orphan virgin to be crowned as queen|2:1
II.|The open salvation accomplished by the hiding God in secrecy for His persecuted elect in their captivity as seen in Mordecai|3:1
A.|Haman's plot to destroy all the Jews in Medo-Persia|3:1
B.|Mordecai's confrontation of Haman's plot through Esther's close and intimate contact with the king|4:1
C.|The open, triumphant victory of the Jews over their enemies — the open salvation of their hiding God|8:3
`;

const JOB = `
I.|Introduction|1:1|2:7
A.|Job the man|1:1
B.|A council held in heaven concerning Job|1:6
C.|Satan attacking Job, and Job suffering trials in the matter of his possessions and children|1:12
D.|A council held again in heaven concerning Job|2:1
E.|Satan attacking Job, and Job suffering the trial in his body|2:7
II.|The debates between Job and his three friends|2:11|31:40
A.|The coming and consoling of Job's three friends|2:11
B.|Job's cursing of the day of his birth|3:1
C.|The first round of debates|4:1|11:20
D.|The second round of debates|12:1|20:29
E.|The third round of debates|21:1|31:40
III.|Elihu's answer to Job|32:2|37:24
A.|His first correction and refutation of Job|32:2
B.|His second correction and refutation of Job|34:1
C.|His third correction and refutation of Job|35:1
D.|His final word to Job|36:1
IV.|The dialogue between God and Job|38:1|42:6
A.|Jehovah answering Job out of the whirlwind|38:1
B.|God appearing to Job with the divine unveilings|38:4|40:14
C.|Job gaining God in his personal experience and abhorring himself|42:1
V.|Jehovah's dealing with the three friends of Job|42:7
VI.|Job's end|42:10
`;

// Psalms: 5 books — use explicit level 1 for "Book N" prefixes
const PS = `
1|Book One|Indicating that God's intention is to turn the seeking saints from the law to Christ that they may enjoy the house of God — the church|1|41
1|Book Two|Indicating that the saints experience God and His house and city through the suffering, exalted, and reigning Christ|42|72
1|Book Three|Indicating that the saints, in their experiences, realize that the house and the city of God can be preserved and maintained only with Christ properly appreciated and exalted|73|89
1|Book Four|Indicating that the saints, being joined to Christ, are one with God so that He can recover His title over the earth through Christ in His house and city|90|106
1|Book Five|Indicating that the house and the city of God become the praise, safety, and desire of the saints, and that Christ comes to reign over the whole earth through the house and the city of God|107|150
`;

const PROV = `
I.|The collection of Solomon|1:1
A.|The principles for man to live a proper human life|1:1
B.|A contrast between doing righteousness in wisdom and doing wickedness in folly|10:1
C.|Admonitions and teachings|20:1
II.|The collection of Hezekiah — admonitions and teachings|25:1
III.|The word of Agur — general words of wisdom|30:1
IV.|The word of King Lemuel|31:1
`;

// â”€â”€ output â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
const books = [
  ['1Kgs', KGS1],
  ['2Kgs', KGS2],
  ['1Chr', CHR1],
  ['2Chr', CHR2],
  ['Ezra', EZRA],
  ['Neh',  NEH],
  ['Esth', ESTH],
  ['Job',  JOB],
  ['Ps',   PS],
  ['Prov', PROV],
];

console.log('-- Books 11-20: 1 Kings – Proverbs');
console.log('');

for (const [abbr, data] of books) {
  process.stdout.write(bookSQL(abbr, data));
}

