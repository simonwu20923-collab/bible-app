/**
 * testFHL.js - shows raw HTML from FHL so we can fix the parser
 * Run: node testFHL.js
 */
const https = require('https');

function fetchPage(url) {
  return new Promise((resolve, reject) => {
    https.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept-Language': 'zh-TW,zh;q=0.9',
      }
    }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve({ status: res.statusCode, body: data }));
    }).on('error', reject);
  });
}

async function main() {
  // Fetch Genesis chapter 1
  const url = 'https://bible.fhl.net/new/read.php?chineses=%E5%89%B5&strongflag=0&SSS=0&VERSION3=recover&TABFLAG=1&nodic=&chap=1';
  console.log('Fetching:', url);
  
  const { status, body } = await fetchPage(url);
  console.log('Status:', status);
  console.log('Body length:', body.length);
  console.log('\n--- First 3000 chars of HTML ---\n');
  console.log(body.substring(0, 3000));
  console.log('\n--- Looking for Chinese characters ---');
  
  // Find any Chinese text
  const chineseMatches = body.match(/[\u4e00-\u9fff]{3,}/g);
  if (chineseMatches) {
    console.log('Found Chinese text samples:');
    chineseMatches.slice(0, 20).forEach(m => console.log(' ', m));
  } else {
    console.log('NO Chinese characters found in response!');
  }
  
  // Save full HTML to file for inspection
  require('fs').writeFileSync('fhl_test.html', body);
  console.log('\nFull HTML saved to fhl_test.html');
}

main().catch(console.error);
