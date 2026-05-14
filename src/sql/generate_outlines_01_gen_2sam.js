#!/usr/bin/env node
// generate_outlines_01_gen_2sam.js
// Books 1-10: Genesis through 2 Samuel
// Usage: node generate_outlines_01_gen_2sam.js >> bible_data_outlines.sql

'use strict';

// â”€â”€ helpers â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
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
  // compound prefix: II.A  II.A.1  II.A.1.a
  if (stripped.includes('.')) return stripped.split('.').length;
  if (ROMANS.has(stripped)) return 1;
  if (/^[A-Z]/.test(stripped)) return 2;          // A-Z, AA, BB …
  if (p.endsWith(')') && /^\d/.test(stripped)) return 5;
  if (p.endsWith(')') && /^[a-z]/.test(stripped)) return 6;
  if (/^\d/.test(stripped)) return 3;
  if (/^[a-z]/.test(stripped)) return 4;
  return 1;
}

// Data line format: "PREFIX|TITLE|START_REF[|END_REF]"
// START_REF / END_REF: "ch:v" or "ch" or empty
function parseLine(line) {
  const parts = line.split('|');
  const prefix   = parts[0];
  const title    = parts[1];
  const startRef = parts[2] || '';
  const endRef   = parts[3] || '';
  return { level: inferLevel(prefix), prefix, title, startRef, endRef };
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

const GEN = `
I.|God's creation|1:1
A.|God's desire and purpose|1:1
1.|God's original creation|1:1
2.|Judgment and corruption|1:2
3.|God's restoration and further creation|1:2
a.|The Spirit, the word, and the light coming, the first day|1:2
b.|The waters under the expanse separated from the waters above|1:6
c.|The earth separated from the seas and plant life generated|1:9
d.|The light-bearers appearing, the fourth day|1:14
e.|Living creatures in water and air generated, the fifth day|1:20
f.|Living creatures on earth generated, the sixth day|1:24
1)|The animals of the earth|1:24
2)|Man|1:26
a)|The conference of the Godhead|1:26
b)|Created by God male and female|1:27
c)|Blessed by God to be fruitful|1:28
3)|Man and all other living creatures satisfied by God's provision|1:29
4)|Everything being very good to God|1:31
g.|God resting in satisfaction, the seventh day|2:1
B.|God's procedures to fulfill His purpose|2:4
1.|The background — no rain, no man, no life in field|2:4
2.|Creating man as a vessel to contain God as life|2:7
3.|Having man receive God as life|2:8
a.|Placing man in front of the tree of life|2:8
b.|Putting man in the garden with its river|2:10
c.|Allowing man to have free choice|2:16
4.|Working God into man as life to be His complement|2:18
a.|Man, typifying God, needing to have a complement|2:18
b.|Man gaining a complement in and by life|2:21
II.|Man's fall through Satan's corruption|3:1
A.|The first fall — from God's presence to man's conscience|3:1
1.|The serpent's temptation and man's first fall|3:1
2.|God dealing with man's first fall|3:8
a.|Seeking man|3:8
b.|Judging the serpent|3:14
c.|The promise regarding the seed of the woman|3:15
d.|Disciplining man through suffering|3:16
e.|Redemption anticipated|3:20
f.|Closing the way to the tree of life|3:22
B.|The second fall — from man's conscience to others' control|4:1
1.|The background|4:1
2.|Man's presumption, anger, murder, lying, and arrogance|4:3
3.|God's dealing with man's second fall|4:10
4.|Man producing a culture without God|4:16
5.|The way to escape man's second fall|4:25
C.|The generations of the saved revealing the ultimate issue|5:1
1.|The ultimate issue of man's fall — death|5:1
2.|The way to escape death — walking with God|5:22
3.|The family of salvation finding comfort and rest|5:28
D.|The third fall — from others' control to human government|6:1
1.|The evil spirits mingling with man|6:1
2.|God dealing with man's third fall|6:5
3.|The way of salvation from the third fall|6:8
a.|Walking with God|6:8
b.|Building the ark|6:11
1)|Receiving the revelation|6:11
2)|Preparing the ark|6:22
3)|Entering the ark and being shut in by Jehovah|7:1
c.|Saved through water|7:17
E.|Life in resurrection|8:4
1.|The ark resting upon the mountains|8:4
2.|The raven being sent forth|8:6
3.|The dove being sent forth|8:8
4.|Going forth from the ark in resurrection|8:13
5.|Making burnt offerings to Jehovah on an altar|8:20
6.|Fulfilling God's purpose to express and represent Him|9:1
7.|Living under God's covenant|9:8
a.|No more judgment through death's waters|9:8
b.|The rainbow as the sign of God's faithfulness|9:12
8.|The failure of the leader and deputy authority|9:18
a.|Caused by the success of his work|9:18
b.|Ham exposing the failure, and Shem and Japheth covering it|9:22
c.|Ham's son receiving the curse, blessing for others|9:25
9.|The nations issuing forth with Babel as the consummation|10:1
F.|The fourth fall — from human government to rebellion|11:1
1.|Building a city and tower to rebel against God|11:1
2.|God dealing with man's fourth fall|11:5
G.|The generations from man's salvation through water|11:10
III.|Jehovah's calling|12:1
A.|The first aspect — the experience of Abraham|12:1
1.|God's calling|12:1
2.|Living by faith|12:7
a.|A life of the altar and the tent|12:7
b.|The trial of the called|12:9
1)|Famine|12:9
2)|The brother's striving|13:5
c.|The victory of the called|14:1
1)|The brother being captured|14:1
2)|Fighting for the brother|14:13
3)|Ministered to by Melchizedek|14:18
4)|Overcoming the temptation of earthly substance|14:21
3.|Knowing grace for the fulfillment of God's purpose|15:1
a.|God's covenant with Abraham|15:1
1)|Concerning the seed|15:1
2)|Concerning the land|15:7
b.|The two women — an allegory|16:1
c.|God's covenant confirmed with circumcision|17:1
d.|The birth of Isaac promised|17:15
4.|Living in fellowship with God|18:1
a.|Communion with God on the human level|18:1
b.|A glorious intercession|18:23
c.|The negative record of Lot|19:1
1)|A defeated righteous man and a pillar of salt|19:1
2)|The seed by incest|19:30
d.|A hidden weakness and a shameful intercession|20:1
e.|The birth and growth of Isaac|21:1
f.|Hagar and Ishmael cast out|21:9
g.|Two wells — two sources of living|21:15
h.|The offering up of Isaac|22:1
i.|The death and burial of Sarah|23:1
j.|The marriage of Isaac|24:1
5.|Having no maturity in life|25:1
B.|The second aspect — the experience of Isaac|25:19
1.|Gaining twin sons|25:19
2.|Living in the natural life like Jacob|25:27
3.|Inheriting the promise given to his father|26:1
4.|Having natural weakness like Abraham|26:6
5.|Reaping a hundredfold and becoming great|26:12
6.|Finding wells in many places|26:15
7.|God confirming His promise at Beer-sheba|26:23
8.|Not having much maturity in life|27:1
C.|The third aspect — the experience of Jacob (with Joseph)|25:22
1.|Being dealt with|25:22
a.|Being chosen to be born second|25:22
b.|Being forced to leave the loving mother and father's home|25:29
1)|Supplanting the birthright|25:29
2)|Supplanting the father's blessing|27:5
3)|Being instructed by his mother to go away|27:42
4)|Being blessed and sent away by his father|28:1
c.|The dream at Bethel|28:10
d.|Being led in God's sovereignty to meet Rachel and Laban|29:1
e.|Being cheated by Laban to marry Laban's two daughters|29:15
f.|The competition, envy, and wrestling between Jacob's wives|29:31
g.|Being squeezed by Laban and tricking him|30:25
h.|Fleeing from Laban and being pursued by him|31:17
i.|Fearing Esau|32:1
2.|Being broken|32:22
a.|Wrestling with God|32:22
b.|Being welcomed by Esau|33:1
c.|Returning to Canaan but only to Shechem|33:17
d.|Still needing the dealing in his circumstances|34:1
3.|Being transformed|35:1
a.|Being reminded by God at Bethel|35:1
b.|Deeper and more personal dealings|35:16
1)|The death of Rachel|35:16
2)|The birthright being changed through defilement|35:21
c.|Entering into full fellowship|35:27
d.|Released from the tie with his father|35:28
e.|(The descendents of Esau)|36:1
4.|Being matured|37:1
a.|The process of maturity — dealings in the last stage|37:1
1)|Being robbed of the treasure of his heart (Joseph)|37:1
2)|Being stricken with famine and forced to send sons to Egypt|42:1
3)|Having his second son, Simeon, detained in Egypt|42:29
4)|Being stricken with severe famine and sending Benjamin|43:1
b.|The manifestation of maturity|45:25
1)|Assigning no blame at hearing that Joseph was still alive|45:25
2)|Offering sacrifices to God at Beer-sheba|46:1
3)|Meeting Joseph again|46:5
4)|Blessing people all the time|47:1
a)|Blessing Pharaoh|47:1
b)|Blessing Joseph's sons|47:28
c)|Blessing his own sons|49:1
5)|Departing in an excellent way|49:29
5.|The reigning aspect of the matured Israel as seen in Joseph|37:2
a.|Being a shepherd and the father's beloved|37:2
b.|Viewing his people as sheaves of life and as stars of light|37:5
c.|Ministering to his brothers according to the father's will|37:12
d.|Living as a sheaf of life|37:18
e.|Living as a star of light|38:1
1)|His brother Judah indulging in lust|38:1
2)|Overcoming lust and shining in darkness|39:1
f.|Being delivered into the prison of death|39:13
g.|Being resurrected from the prison of death|41:14
h.|Being enthroned with authority and receiving glory and gifts|41:40
i.|Becoming the savior of the world, the sustainer of life|41:45
j.|Supplying people with food|41:47
k.|Being recognized by the children of Israel|42:6
1)|Being wise in dealing with his brothers and showing them love|42:6
2)|Testing his brothers further|43:15
3)|Revealing his exaltation and glory to his repentant brothers|45:1
4)|His brothers participating in the enjoyment of his reign|45:16
l.|Reigning|47:11
`;

const EXO = `
I.|Enslaved|1:1
II.|Redeemed and saved|2:1
A.|Preparation of the savior|2:1
B.|God's calling of the prepared one|3:1
C.|Three subjective signs of being called and sent by God|4:1
D.|The male help and the female help to the called one|4:10
E.|God's demand and Pharaoh's resistance|5:1
1.|The first conflict between Jehovah and Pharaoh for the release of Israel|5:1
2.|God's further training of Moses|6:1
3.|The second conflict, exposing the true nature of Egyptian living|7:8
4.|The third conflict: The first plague — blood|7:15
5.|The fourth conflict: The second plague — frogs|8:1
6.|The fifth conflict: The third plague — lice|8:16
7.|The sixth conflict: The fourth plague — flies|8:20
8.|The seventh conflict: The fifth plague — pestilence|9:1
9.|The eighth conflict: The sixth plague — boils|9:8
10.|The ninth conflict: The seventh plague — hail|9:13
11.|The tenth conflict: The eighth plague — locusts|10:1
12.|The eleventh conflict: The ninth plague — darkness|10:21
13.|The twelfth and final conflict: The tenth plague — the slaughter of the firstborn|11:1
a.|Jehovah's sovereignty|11:1
b.|The Passover|12:1
c.|Israel's exodus from Egypt|12:37
F.|Pharaoh's last struggle and Israel's crossing of the Red Sea|14:1
G.|The praising of the saved ones|15:1
1.|The song of Moses|15:1
2.|The song of Miriam|15:20
III.|Led|15:22
A.|Israel's experience at Marah and Elim|15:22
B.|The experience of manna — the heavenly diet|16:1
C.|The living water out of the smitten rock|17:1
D.|The defeat of Amalek|17:8
E.|A portrait of the kingdom|18:1
IV.|Receiving revelation|19:1
A.|Brought into the presence of God and into the knowledge of Him|19:1
B.|The testimony of God (the law) revealing God to His people|20:1
C.|The negative aspect of the law|20:18
D.|The statutes of the law concerning the worship of God|20:22
E.|The first ordinance of the law concerning man's relationship with others|21:1
F.|Sundry ordinances of the law|21:7
G.|The Angel of Jehovah for His people to take possession of the promised land|23:20
H.|The enactment of the covenant|24:1
I.|The vision of God|24:9
J.|Moses' stay with God under His glory|24:12
K.|The vision of the tabernacle and its furniture|25:1
1.|Concerning the materials and the pattern|25:1
2.|The Ark of Testimony with the expiatory cover|25:10
3.|The table of the bread of the Presence|25:23
4.|The lampstand|25:31
5.|The covering of the tabernacle|26:1
6.|The boards of the tabernacle|26:15
7.|The veil within the tabernacle|26:31
8.|The screen for the entrance of the tent|26:36
9.|The altar of burnt offering|27:1
10.|The court of the tabernacle|27:9
11.|The lighting of the lamps|27:20
12.|The garments for the priesthood|28:1
13.|The sanctification of Aaron and his sons to be the priests|29:1
14.|The golden incense altar|30:1
15.|The expiation silver|30:11
16.|The laver of bronze|30:17
17.|The holy anointing oil|30:22
18.|The incense|30:34
L.|The workers of the tabernacle, the furniture, and the priestly garments|31:1
M.|The Sabbath in relation to the building work of the tabernacle|31:12
N.|The breaking of the law|31:18
O.|The dealing with the idol and the idolaters|32:7
P.|A companion of God|32:30
Q.|Moses' stay with God|34:1
V.|Building the tabernacle|35:1
A.|The making of the tabernacle with its furniture and the garments for the priests|35:1
1.|A word concerning the Sabbath|35:1
2.|The offering of the materials and the preparing of the workers|35:4
3.|The curtains and coverings of the tabernacle|36:8
4.|The boards of the tabernacle|36:20
5.|The veil within the tabernacle|36:35
6.|The screen for the entrance of the tent|36:37
7.|The Ark of the Testimony|37:1
8.|The table of the bread of the Presence|37:10
9.|The golden lampstand|37:17
10.|The altar of incense|37:25
11.|The holy anointing oil and the pure incense|37:29
12.|The altar of burnt offerings|38:1
13.|The laver of bronze|38:8
14.|The court of the tabernacle|38:9
15.|Counting the offered materials|38:21
16.|Making the garments for the priests|39:1
B.|The work of the tabernacle presented to, examined by, and blessed by Moses|39:32
C.|The erecting of the tabernacle|40:1
1.|The commandments of the Lord to Moses concerning the raising up of the tabernacle|40:1
2.|The erection of the tabernacle|40:17
3.|The glory of the Lord filling the tabernacle|40:34
4.|Moving with God's dwelling place|40:36
`;

const LEV = `
I.|Ordinances concerning offerings|1:1|7:11
A.|The burnt offering|1:1
B.|The meal offering|2:1
C.|The peace offering|3:1
D.|The sin offering|4:1
E.|The trespass offering|5:1
F.|The law of the burnt offering|6:8
G.|The law of the meal offering|6:14
H.|The law of the sin offering|6:24
I.|The law of the trespass offering|7:1
J.|The law of the peace offering|7:11
II.|Ordinances concerning service|8:1|10:12
A.|The consecration of Aaron and his sons|8:1
B.|The initiation of the priestly service|9:1
C.|The issue of the priestly service|9:22
D.|The lesson and regulations for priests|10:1|10:12
1.|The lesson of Nadab and Abihu|10:1
2.|Regulations for the priests|10:12
III.|Ordinances concerning living|11:1|22:17
A.|Discernment in diet|11:1
B.|Uncleanness in human birth|12:1
C.|Uncleanness from leprosy|13:1
D.|The cleansing of the leper|14:1
E.|The leprosy in a house|14:33
F.|The cleansing of bodily discharges|15:1
G.|The expiation|16:1
H.|Taking care of sacrifices and blood|17:1
I.|The holy living of the holy people|18:1
J.|The holy living for the priesthood|21:1
K.|Disqualifications from priesthood|21:16
L.|Holiness in enjoying holy things|22:1
M.|The acceptable way to offer vows|22:17
IV.|Ordinances concerning feasts|23:1|23:33
A.|The weekly feasts — the Sabbath|23:1
B.|The annual feasts|23:4|23:33
1.|The Feast of Passover|23:4
2.|The Feast of Unleavened Bread|23:6
3.|The Feast of Firstfruits|23:9
4.|The Feast of Pentecost|23:15
5.|The Feast of Blowing of Trumpets|23:23
6.|The Feast of Expiation|23:26
7.|The Feast of Tabernacles|23:33
V.|Other ordinances and warnings|24:1|27:26
A.|The lampstand and bread arrangements|24:1
B.|The death judgment for blasphemy|24:10
C.|The sabbatical years|25:1|25:18
1.|The Sabbath year|25:1
2.|The jubilee|25:8
3.|Regulations regarding sabbatical years|25:18
D.|The word of warning|26:1|26:40
1.|Idols, Sabbath, and sanctuary reverence|26:1
2.|The blessings upon those who obey|26:3
3.|The chastisements upon disobedience|26:14
4.|Repentance and God's remembrance|26:40
E.|Devotions for a vow|27:1|27:26
1.|The devotion of a person to God|27:1
2.|The devotion of an animal to God|27:9
3.|The devotion of a house|27:14
4.|The devotion of a field|27:16
5.|The regulations for devotion|27:26
`;

const NUM = `
I.|Being formed into an army|1:1
A.|Being numbered|1:1
1.|By the families and their leaders according to age|1:1
2.|The Levites not numbered among the army|1:47
B.|Encamping in array|2:1
C.|The holy service|3:1
D.|Dealing with defilement|5:1
1.|The corporate dealing|5:1
2.|The individual dealing|5:5
3.|Dealing with a wife over whom her husband was jealous|5:11
E.|To be sanctified — to be a Nazarite|6:1
F.|Being blessed by God|6:22
G.|Offerings by the twelve tribes for the worship of God|7:1
H.|Lighting the lamps|8:1
I.|The presenting of the Levites|8:5
1.|Cleansing them first|8:5
2.|Presenting them to God|8:9
3.|The age for the service of the Levites|8:23
J.|Keeping the passover|9:1
II.|Journeying|9:15
A.|The guidance|9:15
1.|By the cloud|9:15
2.|By the two trumpets|10:1
B.|Setting out|10:11
1.|The guidance of the cloud|10:11
2.|The sequence of the setting out|10:14
3.|Trusting in man|10:29
4.|The leading of the Ark|10:33
C.|Failures|11:1
1.|Murmuring evil|11:1
2.|Lusting|11:4
3.|Slandering|12:1
4.|Not believing in God|13:1
a.|God commanding Moses to send twelve men to spy out the land of Canaan|13:1
b.|The twelve men going up and spying out the land|13:21
c.|The twelve men returning|13:25
d.|God's abhorring of the people of Israel|14:11
5.|Transgressing the word of God|14:39
D.|Ordinances|15:1
1.|Concerning the offerings|15:1
2.|Concerning the breaking of the Sabbath|15:32
3.|Concerning the people's dress|15:37
E.|Rebellion — a more serious failure|16:1
1.|The cause of the rebellion and the reaction of Moses|16:1
2.|God's judgment|16:19
3.|God's vindication|17:1
F.|The Levitical service and the Aaronic priesthood, with their reward|18:1
1.|The Levitical service and the Aaronic priesthood|18:1
2.|The reward|18:8
a.|To Aaron and his sons as the priests|18:8
b.|To the Levites as the serving ones in the Tent of Meeting|18:21
G.|The water for impurity|19:1
H.|Further failures|20:1
1.|The result of Miriam's failure|20:1
2.|Contending for water|20:2
3.|The result of Aaron's failure|20:23
4.|Speaking against God and Moses|21:4
I.|Further journeying|20:14
1.|From Kadesh to Mount Hor|20:14
2.|Arriving at the top of Pisgah|21:10
J.|The stations of the journey|33:1
III.|Fighting|21:1
A.|Defeating the king of Arad|21:1
B.|Defeating Sihon the king of the Amorites|21:21
C.|Defeating Og the king of Bashan|21:33
D.|The harassment by Balak and Balaam|22:1
1.|Balak's evil intention|22:1
2.|Balaam's prophesying in parables|22:41
a.|The first parable|22:41
b.|The second parable|23:13
c.|The third parable|23:27
d.|The fourth parable|24:14
3.|Israel's fall in fornication and idolatry|25:1
E.|The renumbering of the people|26:1
F.|The statute of judgment for the women's inheriting of the land|27:1
1.|The request of the daughters of Zelophehad|27:1
2.|God's statute of judgment|27:5
G.|The death of Moses, and his successor|27:12
1.|The death of Moses|27:12
2.|The successor of Moses|27:15
H.|The statutes|28:1
1.|Concerning the offerings|28:1
a.|The offerings by fire, God's satisfying fragrance|28:1
b.|A continual burnt offering for every day|28:3
c.|A burnt offering for every Sabbath|28:9
d.|A burnt offering for the beginning of every month|28:11
e.|A burnt offering following the Passover|28:16
f.|A burnt offering for the Feast of Weeks|28:26
g.|A burnt offering for the Day of the Blowing of Trumpets|29:1
h.|A burnt offering for the Day of Expiation|29:7
i.|A burnt offering for the Feast of Tabernacles|29:12
j.|All the offerings for every day, for every Sabbath, for the beginning of every month, and for all the yearly feasts|29:39
2.|Concerning vows|30:1
I.|Overcoming the Midianites|31:1
1.|The commandment of Jehovah to avenge the sons of Israel on the Midianites|31:1
2.|The strategy of Moses|31:3
3.|The victory of the Israelites over the Midianites|31:7
4.|The purging and purification of the captives and the spoil|31:13
5.|The distribution of the plunder, both of man and of cattle|31:25
6.|The offering to Jehovah by the officers of the army|31:48
J.|The prearrangement of the distribution of the good land|32:1
1.|Concerning the land east of the Jordan|32:1
a.|The request of the two tribes, Reuben and Gad|32:1
b.|The rebuking and warning of Moses|32:6
c.|The promise of the two tribes|32:16
d.|The permission of Moses|32:20
2.|The statutes for inheriting the good land|33:50
3.|The boundaries of the good land and its distributors|34:1
a.|The boundaries of the good land|34:1
b.|The distributors of the good land|34:16
4.|The cities given to the Levites and the cities of refuge|35:1
a.|The cities given to the Levites|35:1
b.|The cities of refuge|35:9
5.|A further statute concerning the females among Israel inheriting the good land|36:1
`;

const DEUT = `
I.|The review of the past|1:1
A.|The journey from the mount of God to the entry of the Holy Land|1:1
B.|God's charge to the children of Israel to enter the good land|1:5
C.|The appointing of offices|1:9
D.|The failure at Kadesh-barnea|1:19
E.|The wandering from Kadesh-barnea to the crossing over of the brook Zered|2:1
F.|The defeating of King Sihon and King Og, and the taking possession of their lands east of Jordan|2:24
G.|Moses prohibited from entering the good land and Joshua assigned to lead the people|3:23
H.|Moses' hearty advice to the children of Israel|4:1
I.|Moses setting apart three cities of refuge east of Jordan|4:41
II.|The rehearsal of the law|4:44
A.|The rehearsing of the Ten Commandments|4:44
B.|The general advice and warnings|5:32
1.|Keeping the commandments, statutes, and ordinances of God|5:32
2.|Loving Jehovah their God, and keeping, teaching, and writing His words|6:4
3.|Remembering Jehovah, fearing Him, serving Him, and not going after other gods|6:10
4.|Not testing Jehovah their God, diligently keeping His commandments|6:16
5.|Telling their sons about the significance of the testimonies, statutes, and ordinances|6:20
6.|Dealing with all the nations around them|7:1
7.|Knowing Jehovah their God|7:9
8.|Not being afraid of the nations but remembering what Jehovah their God did and will do|7:16
9.|Remembering why Jehovah humbled and tested them in the wilderness|8:1
10.|Keeping the commandments of Jehovah their God in order to be brought into a good land|8:6
11.|Not forgetting Jehovah their God|8:11
12.|Knowing that Jehovah their God will drive out the nations from before them|9:1
13.|Moses' rehearsing the story of the rebellion of the children of Israel at the mount of God|9:8
14.|Moses' charging the children of Israel concerning nine matters|10:12
15.|Loving Jehovah their God as witnesses of what He had done|11:1
16.|The children of Israel to receive blessings by keeping Moses' words of advice and warning|11:8
17.|Moses' setting a blessing and a curse before the children of Israel|11:26
18.|Moses' charging the children of Israel concerning the way to worship God|12:1
19.|Moses' charging the children of Israel concerning the apostasy|13:1
C.|The rehearsing of the general statutes and ordinances|14:1
1.|Concerning being Jehovah's personal treasure|14:1
2.|Concerning the holy diet|14:3
3.|Concerning the worship of God|14:22
a.|By giving the tithes of all the produce of both their cattle and their crop|14:22
b.|By offering the firstborn males of the herd and of the flock|15:19
c.|By keeping the three main annual festivals|16:1
d.|By not having any mixture of idolatry|16:21
e.|By not sacrificing anything to Jehovah in which there is a blemish|17:1
f.|By stoning to death those who transgressed God's covenant and served other gods|17:2
g.|By keeping a vow to Jehovah|23:21
h.|By offering some of the first of all the fruit of the good land|26:1
4.|Concerning aid to the needy|14:28
a.|The aid by the tithes at the end of every three years|14:28
b.|The release at the end of every seven years|15:1
c.|The lending to the poor brothers|15:7
d.|The freeing of a Hebrew male servant or a female servant|15:12
e.|Taking care of an escaped slave|23:15
f.|Not making a brother pay interest|23:19
g.|Taking a handmill or an upper millstone as a pledge|24:6
h.|Concerning taking a pledge from the borrower|24:10
i.|Concerning the wages given to the poor hired servant|24:14
j.|In remembering the need of a sojourner, an orphan, or a widow|24:17
5.|Concerning the government among the people|16:18
a.|The appointing of judges and officers|16:18
b.|The ordinance concerning a complicated civil suit|17:8
c.|The setting of a king over the people|17:14
d.|The ordinance concerning any iniquity or any sin|19:15
e.|The ordinance concerning one who murders a man|21:1
f.|The ordinance concerning a stubborn and rebellious son|21:18
g.|The hanging of a criminal on a tree|21:22
h.|The ordinances concerning matters related to marriage|22:13
i.|The ordinance concerning divorce|24:1
j.|The ordinance concerning kidnapping|24:7
k.|The ordinances concerning fathers and their children|24:16
l.|The ordinance concerning a dispute brought before the children of Israel|25:1
m.|The ordinance concerning a brother who is not willing to do the duty of a husband's brother|25:5
n.|The ordinance concerning a wife who helps a fighting husband immorally|25:11
o.|The ordinance concerning weights and measures|25:13
6.|Concerning the supply of the Levitical priests and the whole tribe of Levi|18:1
7.|Concerning the prohibitions against contacting evil spirits or the spirits of the dead|18:9
8.|Concerning Jehovah God's raising up of a prophet (the coming Christ) like Moses|18:15
9.|Concerning the false prophet|18:20
10.|Concerning the setting apart of the cities of refuge|19:1
11.|Concerning the moving of the neighbor's boundary marker|19:14
12.|Concerning the children of Israel going forth into battle against their enemies|20:1
13.|Concerning marrying a beautiful woman among the captives|21:10
14.|Concerning the right of the firstborn son|21:15
15.|Concerning taking care of others' interests|22:1
16.|Concerning mixtures of any kind|22:5
17.|Sparing the producing animals|22:6
18.|Concerning the losing of the right to enter the congregation of Jehovah|23:1
19.|Concerning keeping the camp clean|23:9
20.|Concerning a harlot and a dog|23:17
21.|Concerning the neighbor's produce|23:24
22.|Concerning a man taking a new wife|24:5
23.|Concerning a case of leprosy|24:8
24.|Not forgetting to blot out the memory of Amalek|25:17
25.|A concluding word|26:16
III.|A warning|27:1
A.|Moses, with the elders of Israel, commanding the people to keep the whole commandment|27:1
B.|The blessings that would overtake them for their diligence in listening to Jehovah|28:1
C.|The curses that would overtake them for their failing to listen to Jehovah|28:15
IV.|The enactment of the covenant|29:1
A.|The introductory word|29:1
1.|Based upon the experiences of the past|29:1
2.|The objects and the purpose of the enactment of the covenant|29:9
B.|The contents of the covenant|29:18
C.|The concluding word|30:11
V.|The final exhortations and charges|31:1
A.|Moses' exhortation to the people|31:1
B.|Moses' exhortation to Joshua|31:7
C.|Moses' exhortation to the priests, the sons of Levi, and the elders of Israel|31:9
D.|Jehovah's command to Moses to write a song|31:14
E.|Moses' completion of the writing and his charges to the Levites and to all the elders|31:24
VI.|The song of Moses|31:30
A.|The contents of the song|31:30
B.|The word of Moses and Joshua to the people|32:44
VII.|The death of Moses, and his successor|32:48
A.|The death of Moses|32:48
B.|The successor of Moses|34:9
VIII.|The blessing of Moses|33:1
A.|The introductory word|33:1
B.|The blessing|33:6
C.|The concluding word|33:26
`;

const JOSH = `
I.|Entering into the good land|1:1
A.|God's commission|1:1
1.|God's charge, promise, and encouragement to Joshua|1:1
2.|Joshua's charge to the people|1:10
3.|The people's response to Joshua|1:16
B.|Spying out the land|2:1
1.|Joshua's sending of the two spies|2:1
2.|Jehovah's providing of Rahab the harlot|2:1
3.|The two spies' return and report|2:23
C.|Crossing the river Jordan|3:1
D.|Preparation before the attack|5:1
1.|The reaction of the kings of the Amorites and the Canaanites|5:1
2.|The circumcision of the new Israel|5:2
3.|The keeping of the Passover|5:10
4.|The eating of the produce of the promised land|5:11
5.|The vision seen by Joshua|5:13
II.|Taking possession of the good land|6:1
A.|The destruction of Jericho|6:1
B.|The destruction of Ai|7:1
1.|The defeat at Ai|7:1
2.|The victory over Ai|8:1
3.|Joshua's recording and reading of the law to the people of Israel|8:30
C.|The saving of Gibeon|9:1
D.|The destruction of all the rest of the nations|10:1
1.|The destruction of Jerusalem, Hebron, Jarmuth, Lachish, and Eglon|10:1
2.|The destruction of the thirty-one kings of the thirty-one nations|10:28
III.|Allotting the good land|13:1
A.|The land remaining to be possessed|13:1
B.|The land east of the Jordan allotted to the two and a half tribes by Moses|13:8
C.|No land allotted to the tribe of Levi|14:3
D.|The land allotted to the tribe of Judah|14:6
E.|The land allotted to the tribe of Joseph|16:1
1.|From Jericho to Bethel and to the sea|16:1
2.|The land allotted to the children of Ephraim, the second son of Joseph|16:5
3.|The land allotted to Manasseh, the firstborn of Joseph|17:1
F.|The land to be allotted to the rest of the seven tribes|18:1
1.|Joshua's preparations for allotting and dividing the land unto the seven tribes|18:1
2.|The land allotted to the tribe of Benjamin|18:11
3.|The land allotted to the tribe of Simeon|19:1
4.|The land allotted to the tribe of Zebulun|19:10
5.|The land allotted to the tribe of Issachar|19:17
6.|The land allotted to the tribe of Asher|19:24
7.|The land allotted to the tribe of Naphtali|19:32
8.|The land allotted to the tribe of Dan|19:40
9.|The inheritance given to Joshua|19:49
G.|The cities of refuge|20:1
1.|For the manslayer who kills a person by mistake and unwittingly|20:1
2.|Three in Canaan, west of the Jordan|20:7
3.|Three in the land east of the Jordan|20:8
H.|The cities with their pasture lands allotted to the Levites|21:1
1.|Claimed by them at Shiloh and given to them by lot|21:1
2.|To the children of Aaron, one of the families of the Kohathites|21:8
3.|To the rest of the children of Kohath|21:20
4.|To the children of Gershon|21:27
5.|To the children of Merari|21:34
I.|The fulfillment of Jehovah's promise to the fathers of Israel|21:43
J.|The return of the tribes of Reuben, Gad, and the half-tribe of Manasseh|22:1
IV.|Joshua's departure|23:1
A.|Joshua's parting word to the elders, heads, judges, and officers of Israel|23:1
B.|Joshua's parting word to all the tribes of Israel|24:1
`;

const JUDG = `
I.|Israel's trusting in God|1:1
A.|Judah's boldness and victory|1:1
B.|The house of Joseph going up to fight against Bethel|1:22
C.|Some defects|1:27
D.|The admonition of the Angel of Jehovah|2:1
II.|Israel's forsaking of God|2:6
A.|The reason for Israel's forsaking of God|2:6
B.|The cycle of the miserable history of Israel's forsaking of God|2:11
C.|Jehovah's testing of Israel|2:21
D.|The first cycle, through Othniel|3:7
E.|The second cycle, through Ehud and Shamgar|3:11
F.|The third cycle, through Deborah|4:1
1.|The song of Deborah and Barak|5:1
G.|The fourth cycle, through Gideon|6:1
H.|The fifth cycle, through Abimelech, Tola, and Jair|8:33
I.|The sixth cycle, through Jephthah, Ibzan, Elon, and Abdon|10:6
J.|The seventh cycle, through Samson|13:1
III.|Israel's becoming corrupted|17:1
A.|The abominable chaos in their worship|17:1
B.|The sodomitical corruption in their morality|19:1
1.|The story of corruption|19:1
2.|The spreading of this story throughout Israel's territory|19:27
C.|The terrible slaughter among their tribes|20:1
`;

const RUTH = `
I.|Elimelech's swerving from the rest in God's economy|1:1
II.|Naomi's returning to the rest in God's economy|1:3
III.|Ruth's choosing for her goal|1:8
IV.|Ruth's exercising of her right|2:1
V.|Ruth's seeking for her rest|3:1
VI.|Ruth's reward for God's economy|4:1
`;

const SAM1 = `
I.|The history concerning Samuel|1:1
A.|His origin and birth|1:1
B.|His youth|1:21
C.|His relationship with the stale and waning Aaronic priesthood|2:12
1.|Observing the deterioration of the degraded Aaronic priesthood|2:12
2.|Realizing God's severe judgment on the house of Eli|2:27
3.|Knowing the misfortune of the Ark of God under the superstition of the degraded and rotten Aaronic priesthood|4:1
4.|Serving as a priest and as a judge over Israel|7:3
D.|The ending of Samuel's ministry|8:1
II.|The history concerning Saul|9:1
A.|Saul's origin|9:1
B.|God's anointing Saul as king|9:3
C.|Saul's conquest of the Ammonites|11:1
D.|Samuel's reminder to Israel|11:14
E.|Saul's conquest of the Philistines|13:1
F.|Saul's disobedience in his conquest of the Amalekites|15:1
III.|The history concerning David|16:1
A.|Prepared by God to be a man according to the heart of God|16:1
1.|Chosen by God|16:1
2.|Trained by God in humility|16:11
3.|Anointed|16:12
4.|Tested and approved in trusting God and defeating Goliath|17:1
5.|Persecuted and tried by Saul|18:1
a.|Jonathan's love of David|18:1
b.|Saul's envy of David|18:6
c.|Saul's device to kill David|18:10
d.|David's being supplied with the holy bread of the Presence and with the sword of Goliath by the priest Ahimelech|21:1
e.|David's fleeing from Saul and going to Achish the king of Gath|21:10
f.|David's staying in the cave of Adullam, in Mizpeh of Moab, and in the forest of Hereth of Judah|22:1
g.|Saul's killing Ahimelech the priest and his family because of David|22:6
h.|David's defeating the Philistines and staying in Keilah|23:1
i.|David's remaining in the wilderness of Ziph|23:13
j.|David's remaining in the strongholds of En-gedi|23:29
k.|Saul's falling into the hand of David but David not killing him|24:3
l.|Samuel's death|25:1
m.|David's dealing with Nabal and Abigail|25:2
n.|Jehovah's delivering Saul into the hand of David but David not killing him|26:1
o.|David's escaping to and staying in the land of the Philistines|27:1
p.|Saul's tragic ending pretold by Samuel|28:3
q.|David's being sovereignly kept away by God from joining the Philistines' camp to fight against Israel|29:1
r.|David's conquering the Amalekites and capturing their captives|30:1
s.|Saul's end|31:1
`;

const SAM2 = `
III.|The history concerning David (continued)|1:1
A.|David's reaction to the news of Saul's death|1:1
B.|Crowned by the people to be the king for the kingdom of God on the earth|2:1
1.|Crowned by the people|2:1
a.|Crowned by the tribe of Judah|2:1
b.|Crowned by all the other tribes|5:1
c.|Established by God as king with his kingdom exalted for the sake of God's people Israel|5:6
2.|David's care for God's habitation on the earth|6:1
a.|Taking care of the habitation of the Ark of God|6:1
b.|Wanting to build a house for God|7:1
3.|David's conquest over his enemies for the strengthening of his kingdom|8:1
a.|David's conquests over the Philistines, Moab, Zobah, Syria, and Edom|8:1
b.|David's reign in justice and righteousness|8:15
c.|David's showing kindness to Mephibosheth the son of Jonathan|9:1
d.|David's conquests over Ammon and Syria|10:1
4.|David's indulging sin|11:1
5.|God's punishing condemnation|12:1
6.|God's punishing judgment on David|12:15
a.|The death of the child born of Uriah's wife|12:15
b.|The birth of Solomon|12:24
c.|David's conquest over the children of Ammon|12:26
d.|The incest of Amnon the son of David with his sister Tamar|13:1
e.|The murder of Amnon by Absalom the son of David|13:23
f.|Joab's device to bring Absalom back|14:1
g.|Absalom's beauty and his children|14:25
h.|Absalom's seeking to see his father David|14:28
i.|Absalom's revolt|15:1
j.|The peaceful settlements in David's kingdom after Absalom's revolt|19:8
k.|The rebellion of Sheba|20:1
l.|The re-establishment of the kingdom of David|20:23
7.|The last stage of David's kingship|21:1
a.|David's taking care of the famine for the people|21:1
b.|David's conquest over the Philistines|21:15
c.|David's thanking and praising to God in a song|22:1
d.|David's last words|23:1
e.|David's mighty men|23:8
f.|David's last sin|24:1
`;

// â”€â”€ output â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
const books = [
  ['Gen',  GEN],
  ['Exo',  EXO],
  ['Lev',  LEV],
  ['Num',  NUM],
  ['Deut', DEUT],
  ['Josh', JOSH],
  ['Judg', JUDG],
  ['Ruth', RUTH],
  ['1Sam', SAM1],
  ['2Sam', SAM2],
];

console.log('-- ============================================================');
console.log('-- Bible Outlines: Genesis – 2 Samuel (books 1-10)');
console.log('-- Source: bibleread.online (Recovery Version)');
console.log('-- Generated: ' + new Date().toISOString().slice(0,10));
console.log('-- ============================================================');
console.log('');

for (const [abbr, data] of books) {
  process.stdout.write(bookSQL(abbr, data));
}

