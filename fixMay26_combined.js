// fixMay26_combined.js
// Applies all 3 text fixes for May 26 "1 King 22:51~2 King 2:18":
//   1. Spanish verse refs: "1 King 1:x" / "1 King 2:x" → "2 King 1:x" / "2 King 2:x"
//   2. Traditional Chinese: append 王下 1:1 ~ 2:18 text
//   3. Simplified Chinese:  append 王下 1:1 ~ 2:18 text
//
// Run:       node fixMay26_combined.js --key YOUR_KEY   (dry run)
// Apply fix: node fixMay26_combined.js --key YOUR_KEY --fix

const https = require('https');

const SUPABASE_URL = 'https://lsvhmvkhernimxmzcyak.supabase.co';
const TARGET_DATE  = '2026-05-26';

const keyArgIdx = process.argv.indexOf('--key');
const SUPABASE_KEY = keyArgIdx !== -1 ? process.argv[keyArgIdx + 1] : null;
const DRY_RUN = !process.argv.includes('--fix');

if (!SUPABASE_KEY) {
  console.error('Usage: node fixMay26_combined.js --key YOUR_KEY [--fix]');
  process.exit(1);
}

// ── Hardcoded 2 Kings 1:1-2:18 text (provided by user) ───────────────────────

// Convert from "chap:verse\ttext" format to "王下 chap:verse text" format
function buildChineseLines(rawLines, bookAbbr) {
  return rawLines
    .filter(l => l.trim())
    .map(l => {
      const tab = l.indexOf('\t');
      if (tab === -1) return null;
      const ref  = l.slice(0, tab).trim();   // e.g. "1:1"
      const text = l.slice(tab + 1).trim();  // verse text
      return `${bookAbbr} ${ref} ${text}`;
    })
    .filter(Boolean)
    .join('\n');
}

const RAW_ZH = `1:1	亞哈死後，摩押背叛以色列。
1:2	一日，亞哈謝從撒瑪利亞王宮樓上的窗戶掉下來，就病了；於是差遣使者，說，你們去問以革倫的神巴力西卜，我這病能好不能好。
1:3	但耶和華的使者對提斯比人以利亞說，你起來，上去迎著撒瑪利亞王的使者，對他們說，你們去問以革倫神巴力西卜，豈因以色列中沒有神麼？
1:4	所以耶和華如此說，你必不下你所上的床，必定要死。以利亞就去了。
1:5	使者回來見王，王問他們說，你們為甚麼回來？
1:6	使者對他說，有一個人上來迎著我們，對我們說，去罷，你們回去見差你們來的王，對他說，耶和華如此說，你差人去問以革倫神巴力西卜，豈因以色列中沒有神麼？所以你必不下你所上的床，必定要死。
1:7	王問他們說，那上來迎著你們，告訴你們這話的，是怎樣的人？
1:8	他們說，他身穿毛衣，腰束皮帶。王說，這是提斯比人以利亞。
1:9	於是王差遣一個五十夫長，帶著他那五十人去見以利亞。他上到以利亞那裏，以利亞正坐在山頂上。五十夫長對他說，神人哪，王說，你下來！
1:10	以利亞回答五十夫長說，我若是神人，願火從天上降下來，燒滅你和你那五十人。於是有火從天上降下來，燒滅五十夫長和他那五十人。
1:11	王又差遣另一個五十夫長，帶著他那五十人去見以利亞。五十夫長對以利亞說，神人哪，王如此說，你快快下來。
1:12	以利亞回答他們說，我若是神人，願火從天上降下來，燒滅你和你那五十人。於是神的火從天上降下來，燒滅五十夫長和他那五十人。
1:13	王又差遣第三個五十夫長，帶著他那五十人去。這五十夫長上去，一來到就雙膝跪在以利亞面前，懇求他說，神人哪，願我的性命和你這五十個僕人的性命，在你眼中看為寶貴。
1:14	已經有火從天上降下來，燒滅先前那兩個五十夫長，和他們各自帶的五十人；現在願我的性命在你眼中看為寶貴。
1:15	耶和華的使者對以利亞說，你同著他下去，不要怕他。以利亞就起來，同著他下去見王。
1:16	以利亞對王說，耶和華如此說，你差人去問以革倫神巴力西卜，豈因以色列中沒有神可以求祂的話麼？所以你必不下你所上的床，必定要死。
1:17	亞哈謝果然死了，正如以利亞所說耶和華的話。因他沒有兒子，他兄弟約蘭接替他作王，正在猶大王約沙法的兒子約蘭第二年。
1:18	亞哈謝其餘所行的事，豈不都寫在以色列諸王記上麼？
2:1	耶和華要用旋風接以利亞升天的時候，以利亞與以利沙從吉甲前行。
2:2	以利亞對以利沙說，你留在這裏，因耶和華已差遣我到伯特利去。以利沙說，我指著永活的耶和華和你的性命起誓，我必不離開你。於是二人下到伯特利。
2:3	在伯特利的申言者門徒出來見以利沙，對他說，耶和華今日要將你的師傅提上去離開你，你知道麼？他說，我也知道，你們不要作聲。
2:4	以利亞對他說，以利沙，你留在這裏，因耶和華已差遣我往耶利哥去。以利沙說，我指著永活的耶和華和你的性命起誓，我必不離開你。於是二人到了耶利哥。
2:5	在耶利哥的申言者門徒就近以利沙，對他說，耶和華今日要將你的師傅提上去離開你，你知道麼？他說，我也知道，你們不要作聲。
2:6	以利亞對以利沙說，你留在這裏，因耶和華已差遣我往約但河去。以利沙說，我指著永活的耶和華和你的性命起誓，我必不離開你。於是二人繼續前行。
2:7	申言者的門徒中有五十人也去了，遠遠的站在他們對面；二人在約但河邊站住。
2:8	以利亞將自己的外衣捲起來擊打河水，水就左右分開，二人走乾地而過。
2:9	過去之後，以利亞對以利沙說，我被接去離開你以前，該為你作甚麼，你只管求我。以利沙說，願你的靈加倍的臨到我。
2:10	以利亞說，你所求的是件難事。雖然如此，我被接去離開你的時候，你若看見我，事就必這樣為你成就；不然，必不成就。
2:11	他們正走著說話，忽有火車火馬將二人隔開，以利亞就乘旋風升天去了。
2:12	以利沙看見，就呼叫說，我父阿，我父阿，以色列的戰車馬兵阿！於是不再看見他了。以利沙拿著自己的衣服，撕為兩片。
2:13	他拾起以利亞身上掉下來的外衣，回去站在約但河岸邊。
2:14	他拿著以利亞身上掉下來的外衣擊打河水，說，耶和華以利亞的神在那裏呢？擊打河水之後，水也左右分開，以利沙就過去了。
2:15	在耶利哥的申言者門徒從對面看見他，就說，以利亞的靈停在以利沙身上了。他們就來迎接他，在他面前俯伏於地，
2:16	對他說，你的僕人們這裏有五十個壯士，求你讓他們去尋找你師傅，恐怕耶和華的靈將他提起來，投在某山某谷。以利沙說，你們不必打發人去。
2:17	他們再三催促，直到他不好意思推辭，他就說，你們打發人去罷。他們便打發五十人去，尋找了三天，也沒有找著。
2:18	他們回到以利沙那裏，那時以利沙還留在耶利哥；他對他們說，我豈沒有告訴你們不必去麼？`;

const RAW_SC = `1:1	亚哈死后，摩押背叛以色列。
1:2	一日，亚哈谢从撒玛利亚王宫楼上的窗户掉下来，就病了；于是差遣使者，说，你们去问以革伦的神巴力西卜，我这病能好不能好。
1:3	但耶和华的使者对提斯比人以利亚说，你起来，上去迎着撒玛利亚王的使者，对他们说，你们去问以革伦神巴力西卜，岂因以色列中没有神么？
1:4	所以耶和华如此说，你必不下你所上的床，必定要死。以利亚就去了。
1:5	使者回来见王，王问他们说，你们为甚么回来？
1:6	使者对他说，有一个人上来迎着我们，对我们说，去罢，你们回去见差你们来的王，对他说，耶和华如此说，你差人去问以革伦神巴力西卜，岂因以色列中没有神么？所以你必不下你所上的床，必定要死。
1:7	王问他们说，那上来迎着你们，告诉你们这话的，是怎样的人？
1:8	他们说，他身穿毛衣，腰束皮带。王说，这是提斯比人以利亚。
1:9	于是王差遣一个五十夫长，带着他那五十人去见以利亚。他上到以利亚那裏，以利亚正坐在山顶上。五十夫长对他说，神人哪，王说，你下来！
1:10	以利亚回答五十夫长说，我若是神人，愿火从天上降下来，烧灭你和你那五十人。于是有火从天上降下来，烧灭五十夫长和他那五十人。
1:11	王又差遣另一个五十夫长，带着他那五十人去见以利亚。五十夫长对以利亚说，神人哪，王如此说，你快快下来。
1:12	以利亚回答他们说，我若是神人，愿火从天上降下来，烧灭你和你那五十人。于是神的火从天上降下来，烧灭五十夫长和他那五十人。
1:13	王又差遣第三个五十夫长，带着他那五十人去。这五十夫长上去，一来到就双膝跪在以利亚面前，恳求他说，神人哪，愿我的性命和你这五十个仆人的性命，在你眼中看为宝贵。
1:14	已经有火从天上降下来，烧灭先前那两个五十夫长，和他们各自带的五十人；现在愿我的性命在你眼中看为宝贵。
1:15	耶和华的使者对以利亚说，你同着他下去，不要怕他。以利亚就起来，同着他下去见王。
1:16	以利亚对王说，耶和华如此说，你差人去问以革伦神巴力西卜，岂因以色列中没有神可以求他的话么？所以你必不下你所上的床，必定要死。
1:17	亚哈谢果然死了，正如以利亚所说耶和华的话。因他没有儿子，他兄弟约兰接替他作王，正在犹大王约沙法的儿子约兰第二年。
1:18	亚哈谢其余所行的事，岂不都写在以色列诸王记上么？
2:1	耶和华要用旋风接以利亚升天的时候，以利亚与以利沙从吉甲前行。
2:2	以利亚对以利沙说，你留在这裏，因耶和华已差遣我到伯特利去。以利沙说，我指着永活的耶和华和你的性命起誓，我必不离开你。于是二人下到伯特利。
2:3	在伯特利的申言者门徒出来见以利沙，对他说，耶和华今日要将你的师傅提上去离开你，你知道么？他说，我也知道，你们不要作声。
2:4	以利亚对他说，以利沙，你留在这裏，因耶和华已差遣我往耶利哥去。以利沙说，我指着永活的耶和华和你的性命起誓，我必不离开你。于是二人到了耶利哥。
2:5	在耶利哥的申言者门徒就近以利沙，对他说，耶和华今日要将你的师傅提上去离开你，你知道么？他说，我也知道，你们不要作声。
2:6	以利亚对以利沙说，你留在这裏，因耶和华已差遣我往约但河去。以利沙说，我指着永活的耶和华和你的性命起誓，我必不离开你。于是二人继续前行。
2:7	申言者的门徒中有五十人也去了，远远的站在他们对面；二人在约但河边站住。
2:8	以利亚将自己的外衣卷起来击打河水，水就左右分开，二人走干地而过。
2:9	过去之后，以利亚对以利沙说，我被接去离开你以前，该为你作甚么，你只管求我。以利沙说，愿你的灵加倍的临到我。
2:10	以利亚说，你所求的是件难事。虽然如此，我被接去离开你的时候，你若看见我，事就必这样为你成就；不然，必不成就。
2:11	他们正走着说话，忽有火车火马将二人隔开，以利亚就乘旋风升天去了。
2:12	以利沙看见，就呼叫说，我父阿，我父阿，以色列的战车马兵阿！于是不再看见他了。以利沙拿着自己的衣服，撕为两片。
2:13	他拾起以利亚身上掉下来的外衣，回去站在约但河岸边。
2:14	他拿着以利亚身上掉下来的外衣击打河水，说，耶和华以利亚的神在那裏呢？击打河水之后，水也左右分开，以利沙就过去了。
2:15	在耶利哥的申言者门徒从对面看见他，就说，以利亚的灵停在以利沙身上了。他们就来迎接他，在他面前俯伏于地，
2:16	对他说，你的仆人们这裏有五十个壮士，求你让他们去寻找你师傅，恐怕耶和华的灵将他提起来，投在某山某谷。以利沙说，你们不必打发人去。
2:17	他们再三催促，直到他不好意思推辞，他就说，你们打发人去罢。他们便打发五十人去，寻找了三天，也没有找着。
2:18	他们回到以利沙那裏，那时以利沙还留在耶利哥；他对他们说，我岂没有告诉你们不必去么？`;

// ── helpers ───────────────────────────────────────────────────────────────────

function supabaseGet(path) {
  return new Promise((resolve, reject) => {
    https.get(`${SUPABASE_URL}/rest/v1/${path}`, {
      headers: { 'apikey': SUPABASE_KEY, 'Authorization': `Bearer ${SUPABASE_KEY}` },
    }, res => {
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => resolve(JSON.parse(data)));
    }).on('error', reject);
  });
}

function supabasePatch(path, body) {
  return new Promise((resolve, reject) => {
    const payload = JSON.stringify(body);
    const req = https.request(`${SUPABASE_URL}/rest/v1/${path}`, {
      method: 'PATCH',
      headers: {
        'apikey': SUPABASE_KEY,
        'Authorization': `Bearer ${SUPABASE_KEY}`,
        'Content-Type': 'application/json',
        'Prefer': 'return=representation',
      },
    }, res => {
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => resolve({ status: res.statusCode, body: data }));
    });
    req.on('error', reject);
    req.write(payload);
    req.end();
  });
}

function fixSpanishText(text) {
  if (!text) return null;
  let fixed = text;
  fixed = fixed.replace(/\b1 King (1:\d+)/g, '2 King $1');
  fixed = fixed.replace(/\b1 King (2:\d+)/g, '2 King $1');
  fixed = fixed.replace(/\b1K (1:\d+)/g, '2K $1');
  fixed = fixed.replace(/\b1K (2:\d+)/g, '2K $1');
  return fixed === text ? null : fixed;
}

// ── main ─────────────────────────────────────────────────────────────────────

async function main() {
  console.log(DRY_RUN ? '🔍 DRY RUN\n' : '✏️  FIX MODE\n');

  // Build the 2 Kings Chinese text blocks
  const append2KingsZh = buildChineseLines(RAW_ZH.split('\n'), '王下');
  const append2KingsSc = buildChineseLines(RAW_SC.split('\n'), '王下');

  console.log(`Traditional Chinese 2 Kings lines: ${append2KingsZh.split('\n').length}`);
  console.log('First 2:', append2KingsZh.split('\n').slice(0, 2).join('\n'));
  console.log('Last  2:', append2KingsZh.split('\n').slice(-2).join('\n'));

  console.log(`\nSimplified Chinese 2 Kings lines: ${append2KingsSc.split('\n').length}`);
  console.log('First 2:', append2KingsSc.split('\n').slice(0, 2).join('\n'));

  // Fetch existing data
  console.log('\nFetching May 26 from Supabase...');
  const [row] = await supabaseGet(
    `verses?select=ot_text_es,ot_text_zh,ot_text_sc&date=eq.${TARGET_DATE}`
  );
  if (!row) { console.error('Row not found'); process.exit(1); }

  // Fix 1: Spanish
  console.log('\n=== Fix 1: Spanish ===');
  const fixedEs = fixSpanishText(row.ot_text_es);
  if (fixedEs) {
    const count = (row.ot_text_es.match(/\b1 King [12]:/g) || []).length;
    console.log(`✅ Will fix ${count} wrong verse refs`);
  } else {
    console.log('No Spanish changes needed');
  }

  // Fix 2: Traditional Chinese
  console.log('\n=== Fix 2: Traditional Chinese ===');
  const existingZhLines = (row.ot_text_zh || '').split('\n').filter(l => l.trim()).length;
  console.log(`Currently stored: ${existingZhLines} lines (only 1 Kings portion)`);
  const newZhText = (row.ot_text_zh || '').trimEnd() + '\n' + append2KingsZh;
  console.log(`After fix: ${newZhText.split('\n').filter(l => l.trim()).length} lines`);

  // Fix 3: Simplified Chinese
  console.log('\n=== Fix 3: Simplified Chinese ===');
  const existingScLines = (row.ot_text_sc || '').split('\n').filter(l => l.trim()).length;
  console.log(`Currently stored: ${existingScLines} lines (only 1 Kings portion)`);
  const newScText = (row.ot_text_sc || '').trimEnd() + '\n' + append2KingsSc;
  console.log(`After fix: ${newScText.split('\n').filter(l => l.trim()).length} lines`);

  if (DRY_RUN) {
    console.log('\n✅ Dry run complete. Everything looks good. Run with --fix to apply.');
    return;
  }

  // Build patch
  const patch = { ot_text_zh: newZhText, ot_text_sc: newScText };
  if (fixedEs) patch.ot_text_es = fixedEs;

  console.log(`\nPatching columns: ${Object.keys(patch).join(', ')}`);
  const result = await supabasePatch(`verses?date=eq.${TARGET_DATE}`, patch);
  if (result.status === 200 || result.status === 204) {
    console.log('✅ All 3 fixes applied to May 26!');
    console.log('  - Spanish: "2 King 1:x" and "2 King 2:x" verse refs corrected');
    console.log('  - Traditional Chinese: 2 Kings 1:1-2:18 appended (36 verses)');
    console.log('  - Simplified Chinese: 2 Kings 1:1-2:18 appended (36 verses)');
  } else {
    console.error('❌ Patch failed:', result.status, result.body);
  }
}

main().catch(console.error);
