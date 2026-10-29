# SWP08 · 召喚師 — Teachable Machine 互動遊戲

用 [Teachable Machine](https://teachablemachine.withgoogle.com) 訓練的圖片分類模型（Cat / Dog 兩類）
已直接嵌入這個靜態網頁（`script.js` 中的 `DEFAULT_MODEL_URL`），開啟網頁即自動載入、
透過攝影機即時辨識畫面並觸發主題色、表情符號與音效變化，不需要額外設定。

## 怎麼玩 / 怎麼操作

1. 開啟網頁（模型會自動載入，不用手動貼網址）。
2. 允許瀏覽器使用攝影機權限。
3. 對著鏡頭展示貓或狗的圖片 / 玩偶（或任何符合訓練類別的畫面）。
4. 右側面板會即時顯示：
   - 目前信心分數最高的類別與百分比
   - 所有類別的信心分數長條圖
5. 當任一類別的信心分數 ≥ 70% 時，畫面會：
   - 切換成對應的背景主題色（依類別名稱自動分配固定色系，同一類別永遠對應同一主題）
   - 中央彈出表情符號動畫
   - 播放一段提示音效（不同類別音調不同）
   - 下方訊息框顯示偵測結果文字說明

## 訓練模型（至少 2 個類別）

本專案已訓練好 Cat / Dog 兩個類別並把分享連結寫進 `script.js`（`DEFAULT_MODEL_URL`）。
若要換成自己的模型：

1. 前往 https://teachablemachine.withgoogle.com → 「Get Started」→「Image Project」。
2. 建立至少 2 個 Class，每個類別用攝影機錄製或上傳數十張範例影像。
3. 按「Train Model」完成訓練，可在右側預覽視窗即時測試辨識效果。
4. 按「Export Model」→ 選擇「Upload (shareable link)」→「Upload my model」，
   取得形如 `https://teachablemachine.withgoogle.com/models/xxxxxxxxx/` 的網址。
5. 修改 `script.js` 開頭的 `DEFAULT_MODEL_URL` 為這個網址，重新部署即可；
   也可以點右上角齒輪圖示，在設定面板暫時貼上另一個網址做測試（只存在瀏覽器 localStorage，不影響部署版本）。

> 訓練與推論過程皆在瀏覽器內完成（TensorFlow.js），你的攝影機畫面不會上傳到任何伺服器；
> 唯一上傳到 Google 的是你在「Export Model」步驟主動儲存的模型本身。

## 技術

- [TensorFlow.js](https://www.tensorflow.org/js) + [@teachablemachine/image](https://github.com/googlecreativelab/teachablemachine-community)
- 全部純前端（HTML / CSS / JavaScript），無需後端伺服器
- 音效使用 Web Audio API 即時合成，無需外部音檔

## 部署到 GitHub Pages

1. 將本資料夾（`SWP08/`）推送到 GitHub repository。
2. 進入 repository 的 Settings → Pages。
3. Source 選擇你的分支（例如 `main`）與資料夾，若整個 repo 根目錄即為此專案，選擇 `/ (root)`；
   若是像本專案位於子資料夾，建議另建一個只含 `SWP08` 內容的 repo，或將 Pages 來源設為該路徑。
4. 儲存後，等待數分鐘，即可透過 GitHub 提供的網址（`https://<帳號>.github.io/<repo>/`）開啟遊戲。
5. 開啟後需使用 HTTPS（GitHub Pages 預設即為 HTTPS）瀏覽器才能啟用攝影機權限。
