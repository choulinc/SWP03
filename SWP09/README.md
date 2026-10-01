# SWP09 · 英文聽讀 APP

使用瀏覽器內建 Web Speech API（`SpeechSynthesis` 朗讀 + `SpeechRecognition` 語音辨識），
做成英文單字／片語跟讀練習網頁：點擊播放正確發音、按下錄音鍵跟讀，自動比對發音是否正確並統計正確率。

## 功能

- 提供一份英文單字／片語清單（`apple`、`how are you` 等），點擊清單項目可切換練習目標
- 點擊 🔊 按鈕，使用 `SpeechSynthesis` 朗讀目前單字／片語的正確發音
- 按下 🎤 錄音鍵，使用 `SpeechRecognition` 將使用者的跟讀語音轉成文字
- 自動比對辨識結果與正確答案（忽略大小寫、標點、多餘空白），顯示「念對 ✅ / 念錯 ❌」
- 頂部統計列即時顯示：已練習次數、念對次數、正確率
- 單字清單上會標記每個單字目前是「✔ 念對」或「✘ 念錯」，方便追蹤弱點單字

## 使用方式

1. 開啟網頁（建議使用桌機版 **Google Chrome**，相容性最佳）。
2. 點擊 🔊 聽正確發音。
3. 按下「🎤 按下開始跟讀」，瀏覽器會要求麥克風權限，允許後開始念出該單字／片語。
4. 再按一次按鈕（或等待辨識完成）停止錄音，畫面會顯示你念出的內容與比對結果。
5. 按「下一個 ▶」或直接點選清單中的其他單字繼續練習。
6. 可隨時按「重設統計」清空目前的練習紀錄。

## 技術

- 純前端 HTML / CSS / JavaScript，無任何框架或後端
- `SpeechSynthesisUtterance`：設定 `lang = "en-US"` 朗讀英文發音
- `SpeechRecognition`（或 `webkitSpeechRecognition`）：設定 `lang = "en-US"`，`maxAlternatives` 取多個候選結果以提高比對成功率
- 比對邏輯：將辨識文字與目標文字正規化（轉小寫、去除標點與多餘空白）後比較

## 瀏覽器相容性注意事項

- `SpeechRecognition` 目前僅在 Chrome / Edge（Chromium 核心）等瀏覽器有較完整支援，Safari / Firefox 可能不支援或行為不同。
- 需要 HTTPS（或 `localhost`）環境才能使用麥克風，GitHub Pages 預設即為 HTTPS。

## 部署到 GitHub Pages

1. 將本資料夾（`SWP09/`）推送到 GitHub repository。
2. 進入 repository 的 Settings → Pages。
3. Source 選擇你的分支（例如 `main`），資料夾選擇 `/ (root)`（若整個 repo 根目錄即為此專案）；
   若此專案位於子資料夾（如本 monorepo 中的 `SWP09/`），建議另建一個只含 `SWP09` 內容的 repo，
   或使用 GitHub Pages 的 `docs/` 路徑設定對應。
4. 儲存後等待數分鐘，即可透過 `https://<帳號>.github.io/<repo>/` 開啟使用。
