# 借一下 · YouBike 即時看板

[開啟線上看板](https://choulinc.github.io/SWP03/SWP06/) · 純 HTML、CSS、JavaScript，無建置步驟，無後端。

串接[臺北市政府資料開放平台](https://data.taipei/dataset/detail?id=c6bc8aed-557d-41d5-bfb1-8da24f78f2fb)的 YouBike2.0 臺北市公共自行車即時資訊 API，把近 1,800 個站點的即時可借車輛／可還空位整理成可搜尋、可篩選的卡片看板。

## 功能

- **全市總覽**：納入站點數、營運中站點數、可借車輛與可還空位總數。
- **搜尋**：依站名或地址即時篩選（含去抖動，輸入時不卡頓）。
- **篩選**：依 13 個行政區篩選，或隱藏目前暫停營運的站點。
- **排序**：可借車輛多到少／少到多（找快沒車的站）、可還空位多到少、站名筆畫。
- **每張卡片**顯示站名、行政區、地址、可借／可還的視覺化進度條（車輛稀少時變色提醒）、該站資料的實際回報時間，以及一鍵開啟 Google 地圖的連結。
- **載入與錯誤處理**：首次載入顯示骨架畫面；若 API 逾時或失敗，顯示明確錯誤訊息與「重試」按鈕，並說明這不代表站點真的沒資料；若是自動更新失敗，會保留上一次成功取得的資料並標示「可能非最新」。
- **自動更新**：每 60 秒重新抓取一次，並顯示倒數計時；也可手動按「立即重新整理」。
- **深色模式**：可切換並記住偏好（存於瀏覽器 LocalStorage，私密瀏覽模式下會自動退回系統預設，不影響使用）。

## 資料來源與更新頻率

- API：`https://tcgbusfs.blob.core.windows.net/dotapp/youbike/v2/youbike_immediate.json`
- 來源資料集頁面：[data.taipei - YouBike2.0臺北市公共自行車即時資訊](https://data.taipei/dataset/detail?id=c6bc8aed-557d-41d5-bfb1-8da24f78f2fb)
- 授權：[政府資料開放授權條款](https://data.taipei/datatermsofuse)
- 來源資料本身約每 1 分鐘更新一次；本頁每 60 秒重新抓取，每張卡片另外顯示該站資料的實際回報時間，兩者可能略有落差。

## 本機使用

直接開啟 `index.html`，或在專案目錄執行：

```sh
python3 -m http.server 8000
```

再開啟 `http://localhost:8000`。

## 部署

網站位於 `choulinc/SWP03` 儲存庫的 `SWP06/` 子目錄。推送到 `main` 後，由 SWP03 的 `.github/workflows/deploy.yml` 自動部署到 GitHub Pages。

本專案為課堂練習作品，與臺北市政府或 YouBike 營運單位無關，資料正確性請以官方 App／網站為準。
