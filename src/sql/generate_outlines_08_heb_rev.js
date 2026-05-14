// generate_outlines_08_heb_rev.js
// Books 58-66: Heb, Jas, 1Pe, 2Pe, 1Jn, 2Jn, 3Jn, Jude, Rev
// Run: node generate_outlines_08_heb_rev.js >> bible_data_outlines.sql

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

// â”€â”€ Hebrews â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
const HEB = `
I.|Introduction — God speaking in the Son|1:1
II.|The superiority of Christ|1:4
A.|Superior to the angels|1:4
1.|As the Son of God — as God|1:4
2.|As the Son of Man — as man|2:5
B.|Superior to Moses — as an Apostle worthy of more glory and honor|3:1
1.|(The Second Warning — Do Not Come Short of the Promised Rest)|3:7
C.|Superior to Aaron|4:14
1.|A High Priest according to the order of Melchisedec|4:14
a.|(The Third Warning — Be Brought On to Maturity)|5:11
2.|A High Priest, perpetual, great, living, and able to save to the uttermost|7:1
D.|Christ's new covenant superior to the old|8:1
1.|A better covenant of better promises with a more excellent ministry|8:1
2.|Better sacrifices and better blood with the greater and more perfect tabernacle|9:1
a.|(The Fourth Warning — Come Forward to the Holy of Holies and Do Not Shrink Back to Judaism)|10:19
III.|The unique way of faith|11:1
A.|The definition of faith|11:1
B.|The witnesses of faith|11:2
1.|(The Fifth Warning — Run the Race and Do Not Fall Away from Grace)|12:1
IV.|Virtues for the church life|13:1
A.|Six practical items|13:1
B.|Experiences of Christ|13:8
C.|Another four items needed|13:16
V.|Conclusion|13:20
`;

// â”€â”€ James â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// NOTE: II.I uses explicit level 2 to avoid Roman numeral inference
const JAS = `
I.|Introduction — to the twelve tribes in dispersion|1:1
II.|Practical virtues of Christian perfection|1:2
A.|Enduring trials by faith|1:2
B.|Resisting temptation as God-born ones|1:13
C.|Living a God-fearing life by the implanted word according to the perfect law of freedom|1:19
D.|Having no respect of persons among the brothers|2:1
E.|Being justified by works in relations with the believers|2:14
F.|Bridling the tongue|3:1
G.|Behaving in wisdom|3:13
H.|Dealing with pleasures, the world, and the devil|4:1
2|I.|Not speaking against the brothers|4:11
J.|Confiding not in self-will but in the Lord|4:13
1.|(Warning to the Rich)|5:1
K.|Awaiting the Lord's coming with long-suffering|5:7
L.|Speaking honestly without swearing|5:12
M.|Healthy practices in the church life|5:13
`;

// â”€â”€ 1 Peter â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
const PE1 = `
I.|Introduction — to the sojourning believers under the operation of the Triune God|1:1
II.|The full salvation of the Triune God and its issues|1:3
A.|The Father's regeneration — unto a living hope, an inheritance kept in the heavens and ready to be revealed at the last time|1:3
B.|The Spirit's application — through the prophets' prophesying and the apostles' preaching|1:10
C.|Christ's redemption — unto a holy life by the holy nature and unto brotherly love through purification by the sanctifying truth, based on regeneration by the incorruptible seed through the living word of God|1:13
III.|Growth in life and its results|2:1
A.|Growing by feeding on the milk of the word unto full salvation|2:1
B.|Transformed unto the building up of a spiritual house for God's dwelling, a holy priesthood for God's service|2:4
C.|To tell out the virtues of the calling One|2:9
IV.|The Christian life and its sufferings|2:11
A.|A life in an excellent manner toward all men in all concerns|2:11
1.|As sojourners among the Gentiles|2:11
2.|Toward human institutions|2:13
3.|Servants toward masters|2:18
4.|The model of Christ|2:21
5.|In marriage life|3:1
6.|In common life|3:8
B.|Suffering for righteousness by the will of God as Christ did|3:14
C.|Arming themselves with the mind of Christ for suffering|4:1
D.|As good stewards of the varied grace of God|4:7
E.|Rejoicing in sharing the sufferings of Christ|4:12
V.|The elders' shepherding and its reward|5:1
A.|The shepherding patterns|5:1
B.|The Chief Shepherd's reward|5:4
VI.|The mighty hand of God and its goal|5:5
A.|Humbled under God's mighty hand|5:5
B.|Perfected and grounded by the God of all grace|5:10
VII.|Conclusion|5:12
A.|The testimony of the true grace of God|5:12
B.|Greetings|5:13
`;

// â”€â”€ 2 Peter â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
const PE2 = `
I.|Introduction — to the believers, who have been allotted equally precious faith|1:1
II.|The divine provision|1:3
A.|The impartation of the divine power|1:3
1.|All things which relate to life and godliness, with the divine nature|1:3
2.|Growth and development by life unto the rich entrance into the eternal kingdom|1:5
B.|The shining of the divine truth|1:12
1.|By the glory of the apostles' witnessing|1:12
2.|By the light of the prophetic word|1:19
III.|The divine government|2:1
A.|God's judgment on the false teachers|2:1
B.|God's judgment on both angels and men|2:4
C.|The evils of the false teachers and their punishment under God's judgment|2:10
D.|God's judgment on the heretical mockers|3:1
E.|God's judgment on the heavens and the earth|3:10
F.|Expectation of the new heavens and the new earth filled with God's righteousness|3:13
G.|Preparation for the coming judgment|3:14
1.|To be found by Him in peace|3:14
2.|To be saved from destruction|3:15
IV.|Conclusion — be on guard and grow in the grace and knowledge of the Lord|3:17
`;

// â”€â”€ 1 John â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
const JN1 = `
I.|The fellowship of the divine life|1:1
A.|The manifestation of the divine life|1:1
B.|The divine fellowship|1:3
C.|The condition of the divine fellowship|1:5
1.|Confessing our sins|1:5
2.|Loving God and the brothers|2:3
II.|The teaching of the divine anointing|2:12
A.|Concerning the Divine Trinity according to the growth in life|2:12
B.|For the abiding in the Triune God|2:20
III.|The virtues of the divine birth|2:28
A.|To practice the divine righteousness|2:28
B.|To practice the divine love|3:10
1.|By the divine life (as the divine seed) and the divine Spirit|3:10
2.|By the proving of the spirits|4:1
3.|By God (as the supreme love) and the bountiful Spirit|4:7
C.|To overcome the world, death, sin, the devil, and idols|5:4
1.|By the eternal life in the Son|5:4
2.|By the life-giving petition|5:14
3.|By the true God as the eternal life|5:18
`;

// â”€â”€ 2 John â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
const JN2 = `
I.|Introduction|1:1
A.|Loving in truthfulness for the truth|1:1
B.|Grace, mercy, and peace in truth and love|1:3
II.|The walk in truth and love|1:4
A.|In truth|1:4
B.|In love|1:5
III.|Not participating in heresy|1:7
A.|The heretics|1:7
B.|Not sharing in the heretical works|1:10
IV.|Conclusion|1:12
A.|The hope for closer fellowship for more joy|1:12
B.|Greeting in the endearing care|1:13
`;

// â”€â”€ 3 John â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
const JN3 = `
I.|Introduction|1:1
A.|Loving in truthfulness|1:1
B.|Prospering in all things and in health|1:2
C.|Walking in the truth|1:3
II.|Hospitality to the traveling workers|1:5
A.|Given faithfully, in love, and in a manner worthy of God|1:5
B.|By the fellow workers in the truth|1:7
III.|Imitation not of the evil but of the good|1:9
A.|The self-exalting and domineering Diotrephes — an evil pattern|1:9
B.|The well-reported Demetrius — a good example|1:12
IV.|Conclusion|1:13
A.|The hope for closer fellowship|1:13
B.|Mutual greetings|1:14
`;

// â”€â”€ Jude â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
const JUDE = `
I.|Introduction — to those called, beloved, and kept|1:1
II.|Contending for the faith|1:3
III.|Heresies of the apostates|1:4
IV.|Historical examples of the Lord's judgment upon apostasy|1:5
V.|The evils of the apostates and their punishment under the Lord's judgment|1:8
VI.|Charges to the believers|1:20
A.|To build up themselves upon the most holy faith and to live in the Triune God|1:20
B.|To care for others with mercy in fear|1:22
VII.|Conclusion — praise to Him who is able to guard and set the believers before His glory|1:24
`;

// â”€â”€ Revelation â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
const REV = `
I.|Introduction — the revelation of Christ and the testimony of Jesus|1:1
II.|"The things which you have seen"|1:9
A.|Seven golden lampstands — the shining churches|1:12
B.|The Son of Man — the living Christ|1:13
C.|Seven stars — the bright messengers of the churches|1:20
III.|"The things which are" — the seven local churches|2:1
A.|The church in Ephesus — the church at the close of the initial stage|2:1
B.|The church in Smyrna — the church under persecution|2:8
C.|The church in Pergamos — the church married to the world|2:12
D.|The church in Thyatira — the church in apostasy|2:18
E.|The church in Sardis — the church in reformation|3:1
F.|The church in Philadelphia — the church in recovery|3:7
G.|The church in Laodicea — the church in degradation|3:14
IV.|"The things which are about to take place"|4:1
A.|The first section|4:1
1.|The scene around the throne in the heavens|4:1
2.|The seven seals — the mystery of God's economy|6:1
a.|The first seal: a white horse and its rider|6:1
b.|The second seal: a red horse and its rider|6:3
c.|The third seal: a black horse and its rider|6:5
d.|The fourth seal: a pale horse and its rider|6:7
e.|The fifth seal: the cry of the souls underneath the altar|6:9
f.|The sixth seal: the shaking of the earth and heaven|6:12
g.|The visions inserted between the sixth and seventh seals|7:1
1)|144,000 of the twelve tribes sealed|7:1
2)|A great multitude serving God in the heavenly temple|7:9
h.|The seventh seal: seven trumpets brought in|8:1
i.|The scene in heaven after the opening of the seventh seal|8:3
3.|The seven trumpets — the execution of God's economy|8:6
a.|The first trumpet: judgment on the earth|8:7
b.|The second trumpet: judgment on the sea|8:8
c.|The third trumpet: judgment on the rivers|8:10
d.|The fourth trumpet: judgment on the sun, moon, and stars|8:12
e.|The fifth trumpet — the first woe|8:13
f.|The sixth trumpet — the second woe|9:12
g.|The visions inserted between the sixth and seventh trumpets|10:1
1)|Christ coming to possess the earth|10:1
2)|John charged to prophesy again|10:8
3)|The temple measured and the court cast out|11:1
4)|The two witnesses — Moses and Elijah|11:3
5)|A great earthquake|11:13
h.|The seventh trumpet — the eternal kingdom of Christ|11:14
i.|The scene in heaven after the trumpeting of the seventh trumpet|11:19
B.|The second section|12:1
1.|A woman who brings forth a man-child, and a great red dragon|12:1
a.|The woman in travail|12:1
b.|The great red dragon against the woman|12:3
c.|The man-child born and caught up to God and to His throne|12:5
d.|The woman fleeing|12:6
e.|War in heaven|12:7
f.|The triumphant shout in heaven|12:10
g.|The dragon persecuting the woman|12:13
h.|The dragon making war with the rest of the woman's seed|12:17
2.|The two beasts|13:1
a.|The beast out of the sea — Antichrist|13:1
b.|The beast out of the earth — the false prophet|13:11
3.|Three reapings|14:1
a.|The firstfruits of the believers before the great tribulation|14:1
b.|The eternal gospel in the great tribulation|14:6
c.|The fall of religious Babylon in the great tribulation|14:8
d.|The warning against the worship of Antichrist|14:9
e.|The blessing of the martyrs in the great tribulation|14:13
f.|The harvest of the believers near the end of the great tribulation|14:14
g.|The gathering of the grapes (the evildoers) at the end of the great tribulation|14:17
4.|The outpouring of the seven bowls|15:1
a.|The last seven plagues|15:1
b.|The praise of the late overcomers|15:2
c.|The scene in heaven before the outpouring of the seven bowls|15:5
d.|The first bowl: a malignant sore upon the worshippers of Antichrist|16:1
e.|The second bowl: the sea becoming blood|16:3
f.|The third bowl: the rivers and springs becoming blood|16:4
g.|The fourth bowl: the sun burning men with fire|16:8
h.|The fifth bowl: the kingdom of Antichrist becoming darkened|16:10
i.|The sixth bowl: the Euphrates dried up|16:12
j.|The vision inserted between the sixth and seventh bowls: the gathering at Armageddon|16:13
k.|The seventh bowl: the greatest earthquake and the great hail|16:17
5.|Babylon the Great and her destruction|17:1
a.|The religious aspect|17:1
1)|The great harlot|17:1
2)|The interpretation of the woman and the beast|17:7
3)|The destruction of the harlot by the beast|17:16
b.|The material aspect|18:1
1)|The shout of Christ: "Babylon the Great is fallen"|18:1
2)|The call for separation: "Come out of her"|18:4
3)|Babylon's pride and destruction|18:6
4)|The weeping over Babylon|18:9
5)|The rejoicing in heaven|18:20
6)|The declaration of Babylon's absolute destruction|18:21
c.|The praise in heaven|19:1
6.|The marriage of the Lamb|19:5
a.|The praise of a great multitude|19:5
b.|The Lamb's marriage and His marriage dinner|19:7
c.|The spirit of the prophecy|19:10
7.|The war at Armageddon|19:11
a.|Christ coming to tread the great winepress|19:11
b.|A great dinner|19:17
c.|The defeat and perdition of Antichrist and the false prophet|19:19
8.|The imprisonment of Satan|20:1
a.|For one thousand years|20:1
b.|In the abyss|20:3
9.|The millennial kingdom|20:4
a.|In the best resurrection|20:4
b.|With the priesthood and the kingship for one thousand years|20:6
10.|The last rebellion|20:7
a.|The release of Satan|20:7
b.|The rebellion of the nations and their destruction|20:8
c.|Satan's perdition in the lake of fire|20:10
11.|The judgment of the great white throne|20:11
a.|Earth and heaven fleeing away|20:11
b.|The unbelieving dead being judged|20:12
c.|The demons being judged|20:13
d.|Death and Hades being cast into the lake of fire|20:14
e.|The perdition of the unbelievers and demons in the lake of fire|20:15
12.|The new heaven and the new earth|21:1
a.|The first heaven and the first earth having passed away and the sea being no more|21:1
b.|New Jerusalem coming down to the new earth|21:2
c.|The peoples on the new earth|21:3
d.|The sons of God in eternity|21:5
e.|The perished in the lake of fire|21:8
13.|New Jerusalem|21:9
a.|The bride, the wife of the Lamb|21:9
b.|The holy city|21:10
c.|Her glory and appearance|21:11
d.|Her structure and measurement|21:12
e.|The enlarged temple|21:22
f.|Her light and lamp|21:23
g.|The nations around her|21:24
14.|The river of water of life and the tree of life|22:1
a.|The river of water of life|22:1
b.|The tree of life|22:2
15.|The blessings of God's redeemed in eternity|22:3
a.|No more curse|22:3
b.|Having the throne of God and of the Lamb|22:3
c.|Serving God and the Lamb|22:3
d.|Seeing the face of God and of the Lamb|22:4
e.|The name of God and of the Lamb being on their foreheads|22:4
f.|Being under the illumination of the Lord God|22:5
g.|Reigning forever|22:5
V.|Conclusion — the Lord's last warning and the apostle's last prayer|22:6
`;

process.stdout.write(bookSQL('Heb',  HEB));
process.stdout.write(bookSQL('Jas',  JAS));
process.stdout.write(bookSQL('1Pe',  PE1));
process.stdout.write(bookSQL('2Pe',  PE2));
process.stdout.write(bookSQL('1Jn',  JN1));
process.stdout.write(bookSQL('2Jn',  JN2));
process.stdout.write(bookSQL('3Jn',  JN3));
process.stdout.write(bookSQL('Jude', JUDE));
process.stdout.write(bookSQL('Rev',  REV));

