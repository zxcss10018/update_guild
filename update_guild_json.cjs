const cron = require('node-cron');
console.log("==== 公會角色資料自動更新腳本啟動 ====");
const fs = require('fs');
const path = require('path');
const fetch = require('node-fetch');
const { parse } = require('csv-parse/sync');
const AWS = require('aws-sdk');

// 你的 CSV 路徑
const csvFile = path.join(__dirname, './feng-zhi-zhong.csv');
// 輸出 JSON 路徑
const outputFile = path.join(__dirname, './guild_union_rank.json');

// ==== Cloudflare R2 設定 ====（這裡填入你的資訊）
const r2 = new AWS.S3({
  endpoint: 'https://e3471837b4c40ed2bc211028c1896020.r2.cloudflarestorage.com',
  accessKeyId: '57e8e05cd149ff0ce744df5e728c5e2c',
  secretAccessKey: '819bd2e5ad026f7b89ef1a0a33c3ee22467102a9ee616b7e4e313164639cca4f',
  signatureVersion: 'v4',
  region: 'auto'
});
const R2_BUCKET = 'guild-data'; // 例如 'guild-data'
const R2_KEY = 'guild_union_rank.json'; // 上傳到 R2 的檔名

function uploadJson() {
  const data = fs.readFileSync(outputFile);
  return r2.putObject({
    Bucket: R2_BUCKET,
    Key: R2_KEY,
    Body: data,
    ContentType: 'application/json'
  }).promise();
}

// 設定 headers/cookie
const COMMON_HEADERS = {
  'accept': 'application/json, text/plain, */*',
  'accept-language': 'zh-TW,zh;q=0.9,en-US;q=0.8,en;q=0.7',
  'content-type': 'application/json;charset=UTF-8',
  'origin': 'https://tw-event.beanfun.com',
  'referer': 'https://tw-event.beanfun.com/MapleStory/UnionWebRank/Index.aspx',
  'sec-ch-ua': '"Google Chrome";v="137", "Chromium";v="137", "Not/A)Brand";v="24"',
  'sec-ch-ua-mobile': '?0',
  'sec-ch-ua-platform': 'Windows',
  'sec-fetch-dest': 'empty',
  'sec-fetch-mode': 'cors',
  'sec-fetch-site': 'same-origin',
  'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Safari/537.36',
  'priority': 'u=1, i'
};
const COMMON_COOKIES = '_tracingid_v1.4.0=b9b9848d644da5042e72af142f4816a9; web_tracing_id=b9b9848d644da5042e72af142f4816a9; _tracingid_v1.4.0=b9b9848d644da5042e72af142f4816a9; web_tracing_id=b9b9848d644da5042e72af142f4816a9; _gcl_au=1.1.315336908.1748930312; __BWtransf=c1748930312416xa550e9e1d; __BWtransf=c1748930312416xa550e9e1d; __BWfp=c1748930312416xa550e9e1d; __BWfp=c1748930312416xa550e9e1d; _fbp=fb.1.1748930312440.292371661951431629; _gcl_aw=GCL.1748957889.Cj0KCQjwuvrBBhDcARIsAKRrkjdanMWyIfF8u6FSd-OTW13cozKIaYK6C5L6GwVLdLvWGCnptf4xWPwaAnKzEALw_wcB; _gcl_gs=2.1.k1$i1748957888$u43690169; __gads=ID=6a8b008609cd6a05:T=1749453053:RT=1749453053:S=ALNI_MbjEG0q4l3LIAwiFQ2n7Oms8mEL3Q; __gpi=UID=0000112618acff9b:T=1749453053:RT=1749453053:S=ALNI_MZSBRbbMP7ynDWw_0OkmTgXG-D7XQ; __eoi=ID=0cdbc02737e71673:T=1749453053:RT=1749453053:S=AA-AfjY1RjxI7o99Ni8HyfabpFm-; web_tracing_session={%22id%22:%22YhHG2GiCaeIWKU9GkKfxf%22%2C%22prevId%22:null%2C%22index%22:0%2C%22eventIdx%22:0%2C%22createTime%22:1749453054824%2C%22updateTime%22:1749453054824%2C%22searchTerm%22:null}; bfUID=CB238DC04B5A09E66E278483C64D3209AAC973815FCED4412E0C9A28798B0546; _ga_L5FN8ZEFZL=GS2.2.s1749453051$o2$g1$t1749453344$j58$l0$h0; _ga=GA1.1.1333735273.1748919696; _ga_VTGW9357FR=GS2.1.s1749453051$o3$g1$t1749453456$j60$l0$h0; ASP.NET_SessionId=yfhzm1gc3mkd4yqhlshcojej; _ga_SST23BLT4E=GS2.1.s1749782296$o2$g1$t1749782340$j16$l0$h0; _ga_QSNXNKYG2S=GS2.1.s1749828816$o11$g1$t1749828872$j4$l0$h0; __BW_716-13P0446C0MCFJ2R=1749828816.1749828872'; // 複製瀏覽器的 cookie

async function getMembersFromCSV() {
  const content = fs.readFileSync(csvFile, 'utf-8');
  const records = parse(content, { columns: true, skip_empty_lines: true });
  const keys = Object.keys(records[0]);
  const memberNames = records.map((row) => row[keys[0]].trim());
  console.log('keys:', keys);
  console.log('memberNames:', memberNames);
  return memberNames;
}

async function updateGuildInfo() {
  const members = await getMembersFromCSV();
  const results = [];
  for (const name of members) {
    try {
      const resp = await fetch('https://tw-event.beanfun.com/MapleStory/api/UnionWebRank/GetRank', {
        method: 'POST',
        headers: {
          ...COMMON_HEADERS,
          'cookie': COMMON_COOKIES,
        },
        body: JSON.stringify({
          RankType: 1,
          GameWorldId: -1,
          CharacterName: name,
        }),
      });
      const json = await resp.json();
      console.log(`[${name}] 回應資料：`, json);
      const detail = json.Data;
      let imageUrl = "";
      if (detail.CharacterLookUrl) {
        imageUrl = detail.CharacterLookUrl;
      } else if (detail.CharacterLookCipherText) {
        imageUrl = `https://tw-avatar-maplestory.beanfun.com/Character/${detail.CharacterLookCipherText}.png`;
      }

      results.push({
        CharacterName: name,
        UnionLevel: detail.UnionLevel,
        JobName: detail.JobName,
        UnionTotalLevel: detail.UnionTotalLevel,
        ImageUrl: imageUrl
      });
    } catch (e) {
      //console.error(`[錯誤] ${name} 查詢失敗：`, e);
    }
  }
  fs.writeFileSync(outputFile, JSON.stringify(results, null, 2), 'utf-8');
  console.log(`更新完成，${results.length} 筆成員資料`);

  // ======= 新增：上傳到 R2 =======
  uploadJson()
    .then(() => {
      console.log('JSON 已成功上傳到 R2！');
    })
    .catch((err) => {
      console.error('上傳 R2 失敗:', err);
    });
}

// 設定每  30分鐘  跑一次
cron.schedule('*/30 * * * *', updateGuildInfo);
// 啟動時先跑一次
updateGuildInfo();