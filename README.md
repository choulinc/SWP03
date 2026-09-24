# 辦點事 · To-Do List

使用 HTML、CSS、JavaScript 製作的靜態待辦清單。可新增、編輯、標記完成、刪除與篩選事項，並顯示完成進度、清除已完成事項；資料儲存在目前瀏覽器的 LocalStorage，重新整理後仍會保留。

## 本機使用

直接開啟 `index.html`，或在專案目錄執行：

```sh
python3 -m http.server 8000
```

再瀏覽 `http://localhost:8000`。

## GitHub Pages

此專案包含 `.github/workflows/deploy.yml`。將程式碼推送到 GitHub 儲存庫的 `main` 分支後，於儲存庫 **Settings → Pages → Build and deployment** 將 Source 設為 **GitHub Actions**，工作流程會發布網站。網站網址會顯示在該頁。

LocalStorage 只保存在使用者目前的瀏覽器與網站網址中，不會在不同裝置之間同步。
