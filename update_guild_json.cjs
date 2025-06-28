const cron = require('node-cron');
console.log("==== 公會角色資料自動更新腳本啟動 ====");
const fs = require('fs');
const path = require('path');
const fetch = require('node-fetch');
const { parse } = require('csv-parse/sync');
const uploadJson = require('./upload_to_r2');

// 你的 CSV 路徑
const csvFile = path.join(__dirname, './feng-zhi-zhong.csv');
// 輸出 JSON 路徑
const outputFile = path.join(__dirname, './guild_union_rank.json');

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

const COMMON_COOKIES = process.env.COMMON_COOKIES;; // 複製瀏覽器的 cookie

async function getMembersFromCSV() {
  const content = fs.readFileSync(csvFile, 'utf-8');
  const records = parse(content, { columns: true, skip_empty_lines: true });
  const keys = Object.keys(records[0]);
  const memberNames = records.map((row) => row[keys[0]].trim());
  //console.log('keys:', keys);
  //console.log('memberNames:', memberNames);
  return memberNames;
}

async function updateGuildInfo() {
  const members = await getMembersFromCSV();
  const results = [];
  for (const name of members) {
    try {
      const resp = await fetch('https://tw-event.beanfun.com/MapleStory/api/UnionWebRank/FindRank', {
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
  await uploadJson();
}

// 設定每天4點  跑一次
cron.schedule('0 4 * * *', updateGuildInfo);
// 啟動時先跑一次
updateGuildInfo();