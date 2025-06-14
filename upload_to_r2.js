require('dotenv').config();
const { S3Client, PutObjectCommand } = require("@aws-sdk/client-s3");
const fs = require('fs');

const {
  R2_ACCESS_KEY_ID,
  R2_SECRET_ACCESS_KEY,
  R2_BUCKET,
  R2_ENDPOINT
} = process.env;
console.log("R2_BUCKET=", process.env.R2_BUCKET);

// 1. 建立 S3 連線 (指向 Cloudflare R2)
const s3 = new S3Client({
  region: "auto",
  endpoint: R2_ENDPOINT,
  credentials: {
    accessKeyId: R2_ACCESS_KEY_ID,
    secretAccessKey: R2_SECRET_ACCESS_KEY
  }
});

// 2. 準備要上傳的檔案
const filePath = './guild_union_rank.json';
const fileContent = fs.readFileSync(filePath);

async function uploadJson() {
  try {
    const putCmd = new PutObjectCommand({
      Bucket: R2_BUCKET,
      Key: "guild_union_rank.json", // 上傳到 R2 的名稱
      Body: fileContent,
      ContentType: "application/json"
    });
    await s3.send(putCmd);
    console.log("✅ 上傳到 R2 成功！");
  } catch (err) {
    console.error("❌ 上傳失敗", err);
  }
}

module.exports = uploadJson;