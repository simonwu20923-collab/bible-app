// generate_outlines_06_jn_2co.js
// Books 43-47: Jn, Acts, Rm, 1Co, 2Co
// Run: node generate_outlines_06_jn_2co.js >> bible_data_outlines.sql

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

// â”€â”€ John â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
const JN = `
I.|The Eternal Word incarnated coming to bring God into man|1:1
A.|Introduction to life and building|1:1
1.|The Word in eternity past, who was God, through creation coming as life and light to bring forth the children of God|1:1
2.|The Word becoming flesh, with grace in fullness and with reality, to declare God in the only begotten Son of God|1:14
3.|Jesus as the Lamb of God, with the Holy Spirit as the dove, making the believers stones for the building of the house of God with the Son of Man|1:19
B.|Life's principle and life's purpose|2:1
1.|Life's principle — to change death into life|2:1
2.|Life's purpose — to build the house of God|2:12
C.|Life meeting the need of man's every case|2:23
1.|The need of the moral — life's regenerating|2:23
2.|The need of the immoral — life's satisfying|4:1
3.|The need of the dying — life's healing|4:43
4.|The need of the impotent — life's enlivening|5:1
5.|The need of the hungry — life's feeding|6:1
6.|The need of the thirsty — life's quenching|7:1
7.|The need of those under the bondage of sin — life's setting free|7:53
8.|The need of the blind in religion — life's sight and life's shepherding|9:1
9.|The need of the dead — life's resurrecting|11:1
D.|Life's issue and multiplication|12:1
1.|Life's issue — a house of feasting (a miniature of the church life)|12:1
2.|Life's multiplication for the church through death and resurrection|12:12
3.|Religion's unbelief and blindness|12:36
4.|Life's declaration to the unbelieving religion|12:44
E.|Life's washing in love to maintain fellowship|13:1
1.|Washing by the Lord Himself|13:1
2.|Washing by one another among the believers|13:12
3.|Washed, but not in the fellowship|13:18
4.|Washed and willing to remain in the fellowship, but failing|13:31
II.|Jesus crucified and Christ resurrected going to prepare the way to bring man into God, and as the Spirit coming to abide and live in the believers for the building of God's habitation|14:1
A.|Life's indwelling — for the building of God's habitation|14:1
1.|The dispensing of the Triune God — for the producing of His abode|14:1
2.|The organism of the Triune God in the divine dispensing|15:1
3.|The work of the Spirit consummating in the mingling of divinity with humanity|16:5
B.|Life's prayer|17:1
1.|The Son to be glorified that the Father may be glorified|17:1
2.|The believers to be built up into one|17:6
3.|The Father to be shown righteous in loving the Son and His believers|17:25
C.|Life's process through death and resurrection for multiplication|18:1
1.|Delivering Himself in voluntary boldness to be processed|18:1
2.|Examined in His dignity by mankind|18:12
3.|Sentenced in man's injustice by blind religion with dark politics|18:38
4.|Tested in God's sovereignty by death|19:17
5.|Issuing in blood and water|19:31
6.|Resting in human honor|19:38
7.|Resurrecting in divine glory|20:1
D.|Life in resurrection|20:14
1.|Appearing to the seekers and ascending to the Father|20:14
2.|Coming as the Spirit to be breathed into the believers|20:19
3.|Meeting with the believers|20:26
4.|Moving and living with the believers|21:1
5.|Working and walking with the believers|21:15
`;

// â”€â”€ Acts â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
const ACTS = `
I.|Introduction|1:1
II.|The preparation|1:3
A.|Christ's preparation|1:3
1.|Speaking to the disciples the things concerning the kingdom of God|1:3
2.|Charging them to wait for the baptism in the Holy Spirit|1:4
B.|Christ's ascension|1:9
C.|The disciples' preparation|1:12
1.|Persevering in prayer|1:12
2.|Choosing Matthias|1:15
III.|The propagation|2:1
A.|In the Jewish land through the ministry of Peter's company|2:1
1.|The Jewish believers' baptism in the Holy Spirit|2:1
2.|Peter's first message to the Jews|2:14
3.|The beginning of the church life|2:42
4.|Peter's second message to the Jews|3:1
5.|The beginning of the persecution by the Jewish religionists|4:1
6.|The continuation of the church life|4:32
7.|The signs and wonders done through the apostles|5:12
8.|The continuation of the persecution by the Jewish religionists|5:17
9.|The appointment of seven deacons|6:1
10.|The growth of the word and the multiplication of the disciples|6:7
11.|The increase of the persecution by the Jewish religionists|6:8
12.|The preaching by Philip|8:4
13.|The conversion of Saul|9:1
14.|The building up and multiplication of the church|9:31
15.|The spreading of Peter's ministry|9:32
16.|The spreading to the Gentiles|10:1
17.|The spreading to Phoenicia, Cyprus, and Antioch|11:19
18.|The communication between the church in Antioch and the saints in Judea|11:27
19.|The persecution by the Roman politician|12:1
20.|The growth and multiplication of the word|12:24
B.|In the Gentile lands through the ministry of Paul's company|12:25
1.|The initiation|12:25
2.|Set apart and sent by the Holy Spirit|13:1
3.|The first journey|13:4
4.|The trouble concerning circumcision|15:1
5.|The problem of Barnabas|15:35
6.|The second journey|15:40
7.|The third journey|18:23
8.|The negative influence of Judaism|21:18
9.|The ultimate persecution of the Jews|21:27
10.|The fourth journey|27:1
`;

// â”€â”€ Romans â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
const RM = `
I.|Introduction — the gospel of God|1:1
A.|Promised in the Holy Scriptures|1:1
B.|Concerning Christ|1:3
C.|Received by the called ones|1:5
D.|Proclaimed with eagerness and partaken of by faith|1:8
E.|The power of God's salvation|1:16
II.|Condemnation|1:18
A.|On mankind generally|1:18
B.|On the self-righteous particularly|2:1
C.|On the religious specifically|2:17
D.|On all the world totally|3:9
III.|Justification|3:21
A.|The definition|3:21
B.|The example|4:1
C.|The result|5:1
IV.|Sanctification|5:12
A.|The gift in Christ surpassing the heritage in Adam|5:12
B.|Identification with Christ|6:1
1.|Identified|6:1
2.|Knowing|6:6
3.|Reckoning|6:11
4.|Presenting|6:12
C.|Bondage in the flesh by the indwelling sin|7:1
1.|Two husbands|7:1
2.|Three laws|7:7
D.|Freedom in the Spirit by the indwelling Christ|8:1
1.|The law of the Spirit of life|8:1
2.|The indwelling Christ|8:7
V.|Glorification|8:14
A.|Heirs of glory|8:14
B.|Heirs conformed|8:28
C.|Heirs inseparable from God's love|8:31
VI.|Selection|9:1
A.|God's selection, our destiny|9:1
1.|Of God who calls|9:1
2.|Of God's mercy|9:14
3.|Of God's sovereignty|9:19
4.|Through the righteousness which is out of faith|9:30
5.|Through Christ|10:4
a.|Christ, the end of the law|10:4
b.|Christ, incarnated and resurrected|10:5
c.|Christ, who is near|10:8
d.|Christ, believed in and called upon|10:9
e.|Christ, proclaimed and heard|10:14
f.|Christ, received or rejected|10:16
B.|The economy in God's selection|11:1
1.|A remnant reserved by grace|11:1
2.|The Gentiles saved through Israel's stumbling|11:11
3.|Israel restored through the Gentiles' receiving mercy|11:23
C.|The praise for God's selection|11:33
VII.|Transformation|12:1
A.|In practicing the Body life|12:1
1.|By the presenting of our bodies|12:1
2.|By the renewing of the mind|12:2
3.|By the exercising of the gifts|12:4
4.|By the living of a life of the highest virtues|12:9
B.|In being subject to authorities|13:1
C.|In practicing love|13:8
D.|In waging the warfare|13:11
E.|In receiving the believers|14:1
1.|According to God's receiving|14:1
2.|In the light of the judgment seat|14:10
3.|In the principle of love|14:13
4.|For the kingdom life|14:16
5.|According to Christ|15:1
VIII.|Conclusion — the consummation of the gospel|15:14
A.|The Gentiles offered|15:14
B.|The communication between the Gentile and Jewish saints|15:25
C.|The concern between the churches|16:1
D.|The concluding praise|16:25
`;

// â”€â”€ 1 Corinthians â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
const CO1 = `
I.|Introduction — the initial gifts and the participation in Christ|1:1
II.|Dealing with divisions|1:10
A.|Christ and His cross, the unique solution to all problems in the church|1:10
1.|Christ not divided|1:10
2.|Christ crucified, God's power and God's wisdom|1:18
3.|Christ, our wisdom: righteousness, sanctification, and redemption|1:26
B.|Christ crucified, the center of the apostle's ministry|2:1
1.|The way of the apostle's ministry|2:1
2.|God's wisdom in a mystery — Christ as the deep things of God|2:6
3.|Interpreting spiritual things with spiritual words to spiritual men|2:11
C.|The church, God's cultivated land and God's building|3:1
1.|Growth in life needed|3:1
2.|Built with transformed materials, not with natural things|3:10
3.|All things for the church and the church for Christ|3:18
D.|Stewards of the mysteries of God|4:1
1.|Faithful servants of Christ|4:1
2.|A spectacle both to angels and to men|4:6
3.|The offscouring of the world and the scum of all things|4:10
4.|The begetting father|4:14
III.|Dealing with an evil brother|5:1
A.|The evil one judged|5:1
B.|Keeping the Feast of Unleavened Bread|5:6
C.|Removing the evil one from the church|5:9
IV.|Dealing with lawsuits among believers|6:1
A.|The judgment of the church|6:1
B.|Those not qualified to inherit the kingdom of God|6:9
V.|Dealing with the abuse of freedom|6:12
A.|A basic principle|6:12
B.|The use of the body|6:13
VI.|Dealing with marriage life|7:1
A.|Concerning the gift not to marry|7:1
B.|Concerning the unmarried and the widows|7:8
C.|Concerning the married|7:10
D.|Remaining in the status of one's calling|7:17
E.|Concerning keeping virginity|7:25
F.|Concerning remarriage|7:39
VII.|Dealing with the eating of things sacrificed to idols|8:1
A.|An inadvisable eating|8:1
1.|Not according to love, which builds up|8:1
2.|Idols being nothing|8:4
3.|Food not commending us to God|8:8
4.|Stumbling weak brothers|8:9
B.|The apostle's vindication|9:1
1.|His qualifications|9:1
2.|His rights|9:4
3.|His faithfulness|9:16
4.|His endeavor|9:24
C.|The type of Israel|10:1
1.|Baptized unto Moses|10:1
2.|Eating the same spiritual food and drinking the same spiritual drink|10:3
3.|Most of them strewn along in the wilderness|10:5
D.|Keeping the Lord's table from idolatry|10:14
1.|The fellowship of the Lord's blood and body|10:14
2.|The separation of the Lord's table from the demons' table|10:19
E.|The proper eating|10:23
1.|Building up others, seeking their advantage|10:23
2.|To the glory of God|10:31
3.|Imitating the apostle|11:1
VIII.|Dealing with head covering|11:2
A.|The headship in the universe|11:2
B.|The head covering|11:4
C.|The reasons|11:7
D.|No contention|11:16
IX.|Dealing with the Lord's supper|11:17
A.|The rebuking of the disorder|11:17
B.|The review of the definition|11:23
C.|The need of proving and discerning|11:27
D.|The discipline of the Lord|11:30
X.|Dealing with the gifts|12:1
A.|The governing principle|12:1
B.|The manifestation of the Spirit|12:4
C.|One Body with many members|12:12
1.|The constitution of the Body|12:12
2.|The indispensability of the members|12:14
3.|The blending together of the members|12:23
D.|The placing of the gifts|12:28
E.|The excellent way for exercising the gifts|13:1
1.|The need of love|13:1
2.|The definition of love|13:4
3.|The excelling of love|13:8
F.|The excelling of prophesying|14:1
1.|Building up the church more|14:1
2.|Convicting people more|14:20
G.|Functioning in the church|14:26
1.|Concerning each one|14:26
2.|Concerning speaking in tongues|14:27
3.|Concerning prophesying|14:29
4.|Concerning women|14:33
5.|Conclusion|14:39
XI.|Dealing with the matter of resurrection|15:1
A.|Christ's resurrection|15:1
1.|Preached|15:1
2.|Witnessed|15:5
B.|The rebuttal to "No resurrection"|15:12
C.|The history of resurrection|15:20
D.|The moral influence of resurrection|15:29
E.|The definition of resurrection|15:35
1.|The body of resurrection|15:35
2.|A spiritual body|15:45
F.|The victory of resurrection|15:50
1.|Incorruption over corruption|15:50
2.|Life over death|15:54
3.|A motive for the work of the Lord|15:58
XII.|Dealing with the collection of the gift|16:1
A.|The apostle's direction|16:1
B.|The apostle's desire|16:4
XIII.|Conclusion|16:10
A.|Intimate charges|16:10
B.|Greetings and warning|16:19
`;

// â”€â”€ 2 Corinthians â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
const CO2 = `
I.|Introduction|1:1
A.|Greeting|1:1
B.|The comfort of God|1:3
1.|Comforted to comfort|1:3
2.|Pressed down unto despair|1:5
C.|The apostles' boasting|1:12
D.|Concerning the apostle's coming|1:15
1.|Being one with Christ|1:15
2.|The reasons for the delay|1:23
a.|To spare the Corinthians|1:23
b.|Not to come in sorrow|2:1
II.|The ministry of the new covenant|2:12
A.|Its triumph and effect|2:12
B.|Its function and competency|3:1
C.|Its glory and superiority|3:7
III.|The ministers of the new covenant|3:12
A.|Constituted by and with the Lord as the life-giving and transforming Spirit|3:12
B.|Conducting themselves for the shining of the gospel of Christ|4:1
C.|Living a crucified life for the manifestation of the resurrection life|4:7
D.|Longing to be clothed upon with the transfigured body|5:1
E.|Making it their aim to please the Lord|5:9
F.|Commissioned with the ministry of reconciliation|5:16
G.|Working together with God by an all-fitting life|6:1
1.|The work of the reconciling ministry|6:1
2.|The adequate life of the reconciling ministry|6:3
3.|A frank exhortation of the reconciling ministry|6:14
4.|The intimate concern of the apostles' ministering life|7:2
IV.|The apostle's fellowship concerning the ministry to the needy saints|8:1
A.|The grace from four parties|8:1
B.|Exercising foresight for what is honorable|8:16
C.|Giving as a blessing, not as covetousness|9:1
D.|Sowing for reaping the fruits of righteousness|9:6
V.|Paul's vindication of his apostolic authority|10:1
A.|By the way of his warring|10:1
B.|By the measure of God's rule|10:7
C.|By his jealousy for Christ|11:1
D.|By his compelled boasting|11:16
1.|Of his status, labor, and afflictions|11:16
2.|Of the Lord's vision and revelation to him|12:1
3.|Of the signs of his apostleship|12:11
E.|By the authority given to him|12:19
VI.|Conclusion|13:11
A.|Final exhortations|13:11
B.|Greeting|13:13
C.|Blessing|13:14
`;

process.stdout.write(bookSQL('Jn',   JN));
process.stdout.write(bookSQL('Acts', ACTS));
process.stdout.write(bookSQL('Rm',   RM));
process.stdout.write(bookSQL('1Co',  CO1));
process.stdout.write(bookSQL('2Co',  CO2));

