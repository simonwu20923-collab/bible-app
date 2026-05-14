// generate_outlines_07_gal_phm.js
// Books 48-57: Gal, Eph, Phil, Col, 1Th, 2Th, 1Ti, 2Ti, Tit, Phm
// Run: node generate_outlines_07_gal_phm.js >> bible_data_outlines.sql

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

// â”€â”€ Galatians â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// NOTE: III.I uses explicit level 2 to avoid mistaken Roman numeral inference
const GAL = `
I.|Introduction — the will of God to rescue us out of the evil religious age|1:1
II.|The revelation of the apostle's gospel|1:6
A.|God's Son versus man's religion|1:6
B.|Christ replacing the law|2:11
C.|The Spirit by faith in Christ versus the flesh by works of law|3:1
1.|The Spirit being the blessing of the promise by faith in Christ|3:1
2.|The law being the custodian of the heirs of the promise|3:15
3.|The Spirit of sonship replacing the custody of the law|4:1
4.|Christ needing to be formed in the heirs of promise|4:8
5.|The children born according to the Spirit versus the children born according to the flesh|4:21
III.|The walk of God's children|5:1
A.|Not entangled by the yoke of slavery under law|5:1
B.|Not separated from Christ|5:2
C.|Not indulging the flesh but serving through love|5:13
D.|Walking by the Spirit, not by the flesh|5:16
E.|Restoring the fallen one in a spirit of meekness|6:1
F.|Completely fulfilling the law of Christ|6:2
G.|Sowing not unto the flesh but unto the Spirit|6:7
H.|Having been crucified to the religious world to live a new creation|6:11
2|I.|Bearing the brands of Jesus|6:17
IV.|Conclusion — the grace of our Lord Jesus Christ being with our spirit|6:18
`;

// â”€â”€ Ephesians â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
const EPH = `
I.|Introduction|1:1
II.|The blessings and position received by the church in Christ|1:3
A.|God's blessings to the church|1:3
1.|The Father's selection and predestination, speaking forth God's eternal purpose|1:3
2.|The Son's redemption, speaking forth the accomplishment of God's eternal purpose|1:7
3.|The Spirit's sealing and pledging, speaking forth the application of God's accomplished purpose|1:13
B.|The apostle's prayer for the church regarding revelation|1:15
1.|His thanks for the church|1:15
2.|His supplication for the church that the saints may see|1:17
a.|The hope of God's calling|1:17
b.|The glory of God's inheritance in the saints|1:18
c.|God's power toward us|1:19
d.|The church — the Body, the fullness of Christ|1:22
C.|The producing and building of the church|2:1
1.|The producing of the church|2:1
2.|The building of the church|2:11
D.|The stewardship of the grace and the revelation of the mystery concerning the church|3:1
1.|The stewardship|3:1
2.|The revelation of the mystery|3:3
E.|The apostle's prayer for the church regarding experience|3:14
1.|That the saints may be strengthened into the inner man|3:14
2.|That Christ may make His home in the saints' hearts|3:17
3.|That the saints may apprehend the dimensions of Christ|3:17
4.|That the saints may know the love of Christ|3:19
5.|That the saints may be filled unto the fullness of God|3:19
F.|The apostle's praise to God for His glory in the church and in Christ|3:20
III.|The living and responsibility needed for the church in the Holy Spirit|4:1
A.|The living and responsibility needed in the Body of Christ|4:1
1.|The keeping of the oneness of the Spirit|4:1
2.|The functioning of the gifts and the growth and building up of the Body of Christ|4:7
B.|The living needed in the daily walk|4:17
1.|Basic principles|4:17
2.|The details of this living|4:25
C.|The living needed in ethical relationships|5:22
1.|Between wife and husband|5:22
a.|(A type of the church and Christ)|5:23
2.|Between children and parents|6:1
3.|Between slaves and masters|6:5
D.|The warfare required for dealing with the spiritual enemy|6:10
IV.|Conclusion|6:21
A.|Recommendation|6:21
B.|Blessing|6:23
`;

// â”€â”€ Philippians â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
const PHIL = `
I.|Introduction|1:1
II.|Living Christ to magnify Him|1:3
A.|Fellowship for the furtherance of the gospel|1:3
B.|Magnifying Christ by living Him|1:19
C.|Striving along with the gospel with one soul|1:27
III.|Taking Christ as the pattern and holding Him forth|2:1
A.|Joined in soul, thinking the one thing|2:1
B.|Taking Christ as the pattern|2:5
C.|Working out our salvation to hold forth Christ|2:12
D.|A drink offering upon the sacrifice of faith|2:17
E.|The apostle's concern for the believers|2:19
IV.|Pursuing Christ to gain Him|3:1
A.|Serving by the Spirit and not trusting in the flesh|3:1
B.|Counting all things loss on account of Christ|3:7
C.|Gaining Christ by pursuing Him|3:12
D.|Awaiting Christ for the transfiguration of the body|3:17
V.|Having Christ as the secret of sufficiency|4:1
A.|Thinking the same thing and rejoicing in the Lord|4:1
B.|Excellent characteristics in living|4:5
C.|The believers' fellowship with the apostle and the apostle's secret of sufficiency|4:10
VI.|Conclusion|4:21
`;

// â”€â”€ Colossians â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
const COL = `
I.|Introduction|1:1
A.|The apostle's greeting|1:1
B.|The apostle's thanksgiving|1:3
II.|The preeminent and all-inclusive One, the centrality and universality of God|1:9
A.|The portion of the saints|1:9
B.|The image of God and the Firstborn both in creation and in resurrection|1:15
C.|The mystery of God's economy|1:24
D.|The mystery of God|2:1
E.|The body of all the shadows|2:8
F.|The life of the saints|3:1
G.|The constituents of the new man|3:5
III.|A living in union with Christ|3:12
A.|The arbitrating peace of Christ|3:12
B.|The indwelling word of Christ|3:16
C.|The expression of Christ in ethical relationships|3:18
D.|Praying with perseverance and walking in wisdom|4:2
IV.|Conclusion|4:7
A.|The apostle's fellowship|4:7
B.|The apostle's greeting|4:18
`;

// â”€â”€ 1 Thessalonians â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
const TH1 = `
I.|Introduction|1:1
II.|The content — a holy life for the church|1:2
A.|Its structure|1:2
B.|Its origination|1:4
C.|Its fostering|2:1
1.|The care of a nursing mother and an exhorting father|2:1
2.|The reward of such care|2:13
D.|Its establishing|3:1
1.|Encouragement for faith and love|3:1
2.|Encouragement with hope|3:13
E.|Its exhortation|4:1
1.|Sanctification versus fornication|4:1
2.|Brotherly love|4:9
3.|A becoming walk|4:11
F.|Its hope|4:13
1.|For the dead believers|4:13
2.|For the living and remaining believers|4:15
G.|Its watchfulness and soberness|5:1
1.|The day of the Lord coming like a thief|5:1
2.|The safeguard of faith, love, and hope|5:4
H.|Its cooperation|5:12
1.|The believers' cooperation — living a spiritual and holy life|5:12
2.|God's operation — sanctifying and preserving the believers|5:23
III.|Conclusion|5:25
`;

// â”€â”€ 2 Thessalonians â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
const TH2 = `
I.|Introduction|1:1
II.|The content — encouragement and correction concerning the holy life for the church|1:3
A.|Encouragement — a life worthy of the kingdom of God|1:3
B.|Correction — the misconception concerning the day of the Lord's coming|2:1
C.|Further encouragement|2:13
D.|Correction concerning those walking disorderly|3:6
III.|Conclusion|3:16
`;

// â”€â”€ 1 Timothy â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
const TI1 = `
I.|Introduction|1:1
II.|God's economy versus different teachings|1:3
III.|Faith and a good conscience needed for the keeping of the faith|1:18
IV.|Prayer for man's salvation|2:1
V.|The normal life in the church|2:8
VI.|Overseers and deacons for the church's administration|3:1
VII.|The function of the church — the house of the living God and the pillar and base of the truth|3:14
VIII.|The prediction of the decline of the church|4:1
IX.|A good minister of Christ|4:6
X.|Concerning the saints of different ages|5:1
XI.|Concerning the elders|5:17
XII.|Concerning slaves and money lovers|6:1
XIII.|A man of God|6:11
XIV.|Conclusion|6:21
`;

// â”€â”€ 2 Timothy â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
const TI2 = `
I.|Introduction|1:1
II.|The divine provisions for the inoculation — a pure conscience, unfeigned faith, the divine gift, a strong spirit, eternal grace, incorruptible life, the healthy word, and the indwelling Spirit|1:3
III.|The basic factor of the decline — forsaking the apostle and his ministry|1:15
IV.|The inoculator — a teacher, a soldier, a contender, a farmer, and a workman|2:1
V.|The spreading of the decline — like that of gangrene|2:16
VI.|The worsening of the decline — becoming grievous times of deceiving|3:1
VII.|The antidote of the inoculation — the divine word|3:14
VIII.|The incentive to the inoculator — the coming reward|4:1
IX.|The issue of the decline — loving the present age and doing many evils|4:9
X.|Conclusion|4:19
`;

// â”€â”€ Titus â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
const TIT = `
I.|Introduction|1:1
II.|Establishing the authority in the church|1:5
III.|Dealing with the influence of Judaism and Gnosticism|1:10
IV.|Bringing the saints of different ages into an orderly life|2:1
V.|Charging the slaves to behave well in the social system of slavery|2:9
VI.|Charging the saints to keep a good relationship with the government|3:1
VII.|Dealing with a factious one|3:9
VIII.|Conclusion|3:12
`;

// â”€â”€ Philemon â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
const PHM = `
I.|Introduction|1:1
II.|A slave reborn to be a brother|1:4
III.|A brother recommended for the new man's acceptance|1:17
IV.|Conclusion|1:23
`;

process.stdout.write(bookSQL('Gal',  GAL));
process.stdout.write(bookSQL('Eph',  EPH));
process.stdout.write(bookSQL('Phil', PHIL));
process.stdout.write(bookSQL('Col',  COL));
process.stdout.write(bookSQL('1Th',  TH1));
process.stdout.write(bookSQL('2Th',  TH2));
process.stdout.write(bookSQL('1Ti',  TI1));
process.stdout.write(bookSQL('2Ti',  TI2));
process.stdout.write(bookSQL('Tit',  TIT));
process.stdout.write(bookSQL('Phm',  PHM));

