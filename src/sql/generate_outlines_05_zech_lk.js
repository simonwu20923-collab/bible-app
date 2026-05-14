// generate_outlines_05_zech_lk.js
// Books 38-42: Zech, Mal, Mt, Mk, Lk
// Run: node generate_outlines_05_zech_lk.js >> bible_data_outlines.sql

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

// â”€â”€ Zechariah â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
const ZECH = `
I.|The introductory word|1:1
II.|The visions of consolation and promise|1:7
A.|The vision of a man as the Angel of Jehovah riding on a red horse and standing among the myrtle trees|1:7
B.|The vision of the four horns and the four craftsmen|1:18
C.|The vision of a man with a measuring line in His hand|2:2
D.|The vision of Joshua the high priest perfected, established, and strengthened by the Angel of Jehovah with Zerubbabel the governor of Judah|3:1
E.|The vision of the lampstand of gold and two olive trees|4:1
F.|The vision of the flying scroll|5:1
G.|The vision of the ephah vessel|5:5
H.|The vision of the four chariots|6:1
2|I.|The concluding word to confirm the eight visions by the crowning of Joshua as a type of Christ|6:9
III.|The advice to Israel to turn from the vanity of their ritualistic religion of a godly life, and the desire of Jehovah to restore Israel|7:1
IV.|The prophecies of encouragement centered on Christ|9:1
A.|The prophecy concerning the nations around Judah in relation to Israel|9:1
1.|Concerning the destruction carried out on the nations around Judah by Alexander the Great|9:1
2.|The Lord protecting Jerusalem with its temple as His house|9:8
3.|Christ temporarily welcomed as the King into Jerusalem in a lowly form|9:9
4.|Concerning the victory of the Jewish Maccabean heroes over Antiochus Epiphanes|9:11
B.|The prophecy concerning the Lord's loving visitation to Israel|10:1
C.|The prophecy concerning the living of Israel under the oppression of the Roman Empire|11:1
1.|The destruction carried out in the neighborhood of Israel by the Roman Empire|11:1
2.|The children of Israel falling into their neighbor's hand and into the hand of their neighbor's king|11:4
3.|Jehovah (as Jesus) shepherding the afflicted of the flock of Israel|11:7
4.|The Messiah, as the proper Shepherd of Israel, detested, attacked, rejected, and sold for the price of a slave|11:12
5.|The children of Israel left to the foolish and worthless shepherds|11:15
D.|The prophecy concerning Israel's destiny in the great war of Armageddon, in their household salvation, and in the millennium|12:1
1.|In the great war of Armageddon|12:1
2.|The divine provision and the sovereign preparation for the household salvation of Israel|13:1
a.|The divine provision of a Redeemer with His redemption|13:1
b.|The sovereign preparation of a people to receive the Redeemer with His redemption|13:7
3.|In the millennium|14:1
`;

// â”€â”€ Malachi â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
const MAL = `
I.|The introductory word|1:1
II.|Jehovah's love for Jacob|1:2
III.|Jehovah's dealing with the sons of Levi|1:6
A.|The degradation of the priests|1:6
B.|The priests' breaking of Jehovah's commandment and their corrupting of Jehovah's covenant|2:1
C.|The treachery of Judah (actually the priests) and their profaneness toward Jehovah|2:10
D.|Jehovah's hatred of the treachery of man (mainly referring to the priests) toward his wife|2:13
E.|To refine and purify the priests by His coming as the messenger of Jehovah|3:1
IV.|Jehovah's dealing with the sons of Jacob|3:5
A.|Jehovah's judgment by His drawing near|3:5
B.|Jehovah's advice to the sons of Jacob|3:7
C.|Jehovah's encouragement to those who fear Him and serve Him|3:13
1.|The words of some of the sons of Jacob being strongly against Jehovah|3:13
2.|The word of encouragement by Jehovah|3:16
D.|Jehovah's warning by the day of Jehovah|4:1
`;

// â”€â”€ Matthew â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
const MT = `
I.|The King's antecedents and status|1:1
A.|His genealogy and office — called Christ|1:1
B.|His origin and name — born a God-man, named Jesus, called Emmanuel|1:18
C.|His youth and growth — called a Nazarene|2:1
II.|The King's anointing|3:1
A.|Recommended|3:1
B.|Anointed|3:13
C.|Tested|4:1
III.|The King's ministry|4:12
A.|The beginning of the ministry|4:12
B.|The decree of the kingdom's constitution|5:1
C.|The continuation of the ministry|8:1
D.|The enlargement of the ministry|9:35
E.|The King's poise and attitude toward every situation|11:2
IV.|The King's being rejected|12:1
A.|The establishment of rejection|12:1
B.|The unveiling of the kingdom's mysteries|13:1
C.|The increase of rejection|13:53
D.|The path of rejection|16:13
E.|The prophecy of the kingdom|24:1
F.|The completion of rejection|26:1
V.|The King's victory|28:1
A.|Resurrected|28:1
B.|Reigning|28:16
`;

// â”€â”€ Mark â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
const MK = `
I.|The beginning of the gospel and the initiation of the Slave-Savior|1
A.|The beginning of the gospel — by the ministry of the forerunner|1:1
1.|As prophesied|1:1
2.|Preaching the baptism of repentance|1:4
3.|Introducing the Slave-Savior|1:7
B.|The initiation of the Slave-Savior|1:9
1.|Baptized|1:9
2.|Tested|1:12
II.|The ministry of the Slave-Savior for the spreading of the gospel|1:14|8:26
A.|The contents of the gospel service|1:14|5:43
1.|Proclaiming the gospel|1:14
2.|Teaching the truth|1:21
3.|Casting out demons|1:23
4.|Healing the sick|1:29
5.|Cleansing the leper|1:40
B.|The ways of carrying out the gospel service|2:1|3:6
1.|Forgiving the sins of the sick|2:1
2.|Feasting with sinners|2:13
3.|Causing His followers to be merry without fasting|2:18
4.|Caring for His followers' hunger rather than for religion's regulation|2:23
5.|Caring for the relief of the suffering one rather than for the ritual of religion|3:1
C.|Auxiliary acts of the gospel service|3:7|3:35
1.|Avoiding the crowd|3:7
2.|Appointing the apostles|3:13
3.|Not eating because of the need|3:20
4.|Binding Satan and plundering his house|3:22
5.|Denying His relatives and acknowledging only those who do the will of God|3:31
D.|Parables of the kingdom of God|4:1|4:34
1.|The parable of the sower|4:1
2.|The parable of the lamp|4:21
3.|The parable of the seed|4:26
4.|The parable of the mustard seed|4:30
E.|The move of the gospel service|4:35
1.|Calming the wind and the sea|4:35
2.|Casting out a legion of demons|5:1
3.|Healing the woman with a flow of blood and raising up a dead girl|5:21
4.|Being despised by men|6:1
5.|Sending the disciples|6:7
6.|The martyrdom of the forerunner|6:14
7.|Feeding the five thousand|6:30
8.|Walking on the sea|6:45
9.|Healing everywhere|6:53
10.|Teaching concerning the things that defile from within|7:1
11.|Casting a demon out of a Canaanite daughter|7:24
12.|Healing a deaf and dumb man|7:31
13.|Feeding the four thousand|8:1
14.|Not giving a sign to the Pharisees|8:11
15.|Warning concerning the leaven of the Pharisees and of Herod|8:14
16.|Healing a blind man in Bethsaida|8:22
17.|Unveiling His death and resurrection the first time|8:27
18.|Being transfigured on the mount|9:2
19.|Casting out a dumb spirit|9:14
20.|Unveiling His death and resurrection the second time|9:30
21.|Teaching concerning humility|9:33
22.|Teaching concerning tolerance for unity|9:38
23.|Coming to Judea|10:1
24.|Teaching against divorce|10:2
25.|Blessing little children|10:13
26.|Teaching concerning the rich and the entrance into the kingdom of God|10:17
27.|Unveiling His death and resurrection the third time|10:32
28.|Teaching concerning the way to the throne|10:35
29.|Healing Bartimaeus|10:46
III.|The preparation of the Slave-Savior for His redemptive service|11|14:31
A.|Entering into Jerusalem and lodging in Bethany|11:1
B.|Cursing the fig tree and cleansing the temple|11:12
C.|Being tested and examined|11:27|12:41
1.|By the chief priests, scribes, and elders|11:27
2.|By the Pharisees and Herodians|12:13
3.|By the Sadducees|12:18
4.|By a scribe|12:28
5.|Muzzling all the mouths|12:35
6.|Warning against the scribes|12:38
7.|Praising the poor widow|12:41
D.|Preparing the disciples for His death|13:1|14:31
1.|Telling them the things to come|13:1
2.|Being conspired against, betrayed, and loved|14:1
3.|Instituting His supper|14:12
4.|Warning the disciples|14:27
5.|Experiencing Gethsemane — charging the disciples to watch and pray|14:32
IV.|The death and resurrection of the Slave-Savior for the accomplishing of God's redemption|14:43|16:8
A.|His death|14:43|15:42
1.|Arrested|14:43
2.|Judged|14:53|15:15
a.|By the Jewish leaders, representing the Jews|14:53
b.|By the Roman governor, representing the Gentiles|15:1
3.|Crucified|15:16
4.|Buried|15:42
B.|His resurrection|16:1|16:8
1.|Discovered by three sisters|16:1
2.|Appearing to Mary|16:9
3.|Appearing to two disciples|16:12
4.|Appearing to the eleven disciples and charging them with the universal spreading of the gospel|16:14
V.|The ascension of the Slave-Savior for His exaltation|16:19
VI.|The Slave-Savior's universal spreading of the gospel through His disciples|16:20
`;

// â”€â”€ Luke â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
const LK = `
I.|Introduction|1:1
II.|The preparation of the Man-Savior in His humanity with His divinity|1:5
A.|His forerunner's conception|1:5
B.|His conception|1:26
C.|His forerunner's birth and youth|1:57
D.|His birth|2:1
E.|His youth|2:21
1.|Circumcised and named|2:21
2.|Presented and adored|2:22
3.|Growing and advancing|2:40
F.|His inauguration|3:1
1.|Introduced|3:1
2.|Baptized|3:21
3.|Anointed|3:22
4.|His status|3:23
5.|His test|4:1
III.|The ministry of the Man-Savior in His human virtues with His divine attributes|4:14
A.|In Galilee|4:14
1.|Proclaiming the jubilee of grace|4:14
2.|Carrying out His fourfold commission|4:31
3.|Attracting the occupied|5:1
4.|Cleansing the contaminated|5:12
5.|Healing the paralytic|5:17
6.|Calling the despised|5:27
7.|Breaking the deformed sabbatical regulation|6:1
8.|Appointing twelve apostles|6:12
9.|Teaching His disciples the highest morality|6:17
10.|Curing the dying one|7:1
11.|Showing pity to the weeping widow|7:11
12.|Strengthening His forerunner|7:18
13.|Forgiving sinners|7:36
14.|Ministered to by women|8:1
15.|Teaching with parables|8:4
16.|Identifying His real relatives|8:19
17.|Quelling the storm|8:22
18.|Casting out a legion of demons|8:26
19.|Healing a woman with a flow of blood and raising a dead girl|8:40
20.|Sending the twelve apostles to spread His ministry|9:1
21.|Feeding the five thousand|9:10
22.|Recognized as the Christ|9:18
23.|Unveiling His death and resurrection the first time|9:22
24.|Transfigured on the mount|9:27
25.|Casting a demon out of a man's son|9:37
26.|Unveiling His death the second time|9:43
27.|Teaching concerning humility and tolerance|9:46
B.|From Galilee to Jerusalem|9:51
1.|Rejected by the Samaritans|9:51
2.|Instructing people how to follow Him|9:57
3.|Appointing seventy disciples to spread His ministry|10:1
4.|Portraying Himself as the good Samaritan|10:25
5.|Received by Martha|10:38
6.|Teaching concerning prayer|11:1
7.|Rejected by the evil generation|11:14
8.|Warning not to remain in darkness|11:33
9.|Rebuking the Pharisees and lawyers|11:37
10.|Warning to beware of the Pharisees' hypocrisy|12:1
11.|Warning not to be covetous|12:13
12.|Teaching to be watchful and faithful|12:35
13.|Longing to be released through His death|12:49
14.|Teaching concerning the discernment of time|12:54
15.|Teaching concerning repentance|13:1
16.|Healing a bent-double woman on the Sabbath|13:10
17.|Teaching concerning the kingdom of God as a grain of mustard and as leaven|13:18
18.|Teaching concerning the entrance into the kingdom of God|13:22
19.|Journeying uninterruptedly toward Jerusalem|13:31
20.|Healing a man of dropsy on the Sabbath|14:1
21.|Teaching the invited and the inviting one|14:7
22.|Teaching concerning the acceptance of God's invitation|14:15
23.|Teaching how to follow the Man-Savior|14:25
24.|Unveiling the saving love of the Triune God toward sinners|15:1
a.|By the parable of a shepherd seeking a sheep|15:1
b.|By the parable of a woman seeking a coin|15:8
c.|By the parable of a father receiving his son|15:11
25.|Teaching to be prudent stewards|16:1
26.|Teaching concerning the entrance into the kingdom of God|16:14
27.|Warning the rich|16:19
28.|Teaching concerning stumbling, forgiveness, and faith|17:1
29.|Teaching concerning service|17:7
30.|Cleansing ten lepers|17:11
31.|Teaching concerning the kingdom of God and the rapture of the overcomers|17:20
32.|Teaching concerning persistent prayer|18:1
33.|Teaching concerning the entrance into the kingdom of God|18:9
a.|Humbling oneself|18:9
b.|Being like a little child|18:15
c.|Renouncing all and following the Man-Savior|18:18
34.|Unveiling His death and resurrection the third time|18:31
35.|Healing a blind man near Jericho|18:35
36.|Saving Zaccheus|19:1
37.|Teaching concerning faithfulness|19:11
IV.|The Man-Savior's presentation of Himself to death for redemption|19:28
A.|Entering into Jerusalem triumphantly|19:28
B.|Lamenting over Jerusalem|19:41
C.|Cleansing the temple and teaching in it|19:45
D.|Passing through the final examinations|20:1
1.|Of the chief priests, scribes, and elders|20:1
2.|Of the Pharisees and Herodians|20:20
3.|Of the Sadducees|20:27
4.|Muzzling all the examiners|20:39
5.|Warning against the scribes|20:45
6.|Praising the poor widow|21:1
E.|Preparing the disciples for His death|21:5
1.|Telling them of things to come|21:5
a.|The destruction of the temple|21:5
b.|The plagues between His ascension and the great tribulation|21:7
c.|The persecution of His disciples in the church age|21:12
d.|The great tribulation and His coming|21:20
e.|The disciples' redemption and the overcomers' rapture|21:28
2.|Teaching daily in the temple|21:37
3.|His opposers conspiring to kill Him and a false disciple plotting to betray Him|22:1
4.|Instituting His supper that the disciples might participate in His death|22:7
5.|Teaching the disciples concerning humility and foretelling what will happen to them|22:24
6.|Praying concerning the sufferings of His death and charging the disciples to pray|22:39
V.|The death of the Man-Savior|22:47
A.|Arrested|22:47
1.|(Denied by Peter)|22:54
B.|Judged|22:66
1.|By the Jewish Sanhedrin|22:66
2.|By the Roman rulers|23:1
C.|Crucified|23:26
1.|Suffering the persecution of men|23:26
2.|Suffering the judgment of God for sinners to accomplish a vicarious death for them|23:44
D.|Buried|23:50
VI.|The resurrection of the Man-Savior|24:1
A.|Discovered by the women|24:1
B.|Investigated and confirmed by Peter|24:12
C.|Appearing to two disciples|24:13
D.|Appearing to the apostles and those with them and commissioning them|24:36
VII.|The ascension of the Man-Savior|24:50
`;

process.stdout.write(bookSQL('Zech', ZECH));
process.stdout.write(bookSQL('Mal',  MAL));
process.stdout.write(bookSQL('Mt',   MT));
process.stdout.write(bookSQL('Mk',   MK));
process.stdout.write(bookSQL('Lk',   LK));

