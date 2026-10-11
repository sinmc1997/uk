# 數據代理設定（Cloudflare Worker，免費）

Yahoo Finance 唔俾網頁直接讀取數據（CORS），免費公開代理亦已經全部失效，
所以「抓取數據、K 線圖、自選清單、更新持倉現價」要經你自己嘅 Cloudflare Worker 讀取。

- 費用：免費（每日 10 萬次請求，自己用一世都用唔晒）
- 時間：大約 5–10 分鐘
- 安全：`worker.js` 只會轉發去 Yahoo / Stooq，亦只接受 `https://sinmc1997.github.io` 呼叫，其他人攞到網址都用唔到

## 步驟

1. 去 <https://dash.cloudflare.com/sign-up> 用 email 註冊（唔使信用卡），驗證 email 後登入。
2. 左邊選單揀 **Compute (Workers) → Workers & Pages**（舊版介面直接叫 **Workers & Pages**）。
   第一次用可能會叫你揀一個 `workers.dev` 子網域名，隨便改一個就得。
3. 撳 **Create** → 揀 **Start with Hello World!**（或者 **Create Worker**）。
4. 名改做 `uk-proxy`（叫咩都得），撳 **Deploy**。
5. Deploy 完撳 **Edit code**：
   - 將左邊編輯器入面嘅代碼 **全部刪除**
   - 打開 [worker.js 原始碼](https://raw.githubusercontent.com/sinmc1997/uk/main/cloudflare-worker/worker.js)，全選複製，貼入去
   - 撳右上角 **Deploy**
6. 複製 Worker 網址，例如 `https://uk-proxy.你的名.workers.dev`。
   （喺瀏覽器直接打開佢，見到 `{"ok":true,...}` 就代表成功。）
7. 打開 <https://sinmc1997.github.io/uk/> → 正推分頁「🔌 數據來源設定」→ 貼上網址 → **儲存並測試**，
   見到「✓ 代理正常，Yahoo 數據讀到」就完成。
8. 撳 **複製手機設定連結**，將條連結傳去手機打開一次，手機就會自動設定好（每部裝置/瀏覽器設定一次）。

## 常見問題

| 情況 | 原因 / 解決 |
| --- | --- |
| 測試顯示「連唔到代理：HTTP 404」 | 網址打錯，或者 Worker 未 Deploy |
| 「origin not allowed」 | 你喺其他網址用緊個 app，喺 `worker.js` 嘅 `ALLOWED_ORIGINS` 加入嗰個網址再 Deploy |
| 「讀唔到 Yahoo 數據：HTTP 429」 | Yahoo 暫時限流，過幾分鐘再試；Worker 已自動快取 60 秒同埋轉試 query2 |
| 想睇用量 | Cloudflare 後台 → Workers & Pages → uk-proxy → Metrics |
