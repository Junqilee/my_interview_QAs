import React from "react";
import ReactDOM from "react-dom/client";
import { HashRouter } from "react-router-dom";
import App from "./App";
import { APP_BUILD } from "./lib/constants";
import "./index.css";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <HashRouter>
      <App />
    </HashRouter>
  </React.StrictMode>
);

// ── 版本自修复 ──────────────────────────────────────────────
// 每次 build 号变化，启动即强制注销旧 SW + 清空 Cache Storage + 硬刷新一次。
// 这样即便旧 SW 卡死、HTTP 缓存没失效，用户下一次打开也会拿到全新代码，
// 彻底终结"页脚是新版本、但卡片还跑着旧逻辑"这类矛盾现象。
const BUILD_KEY = "app_build_seen";
async function selfHealOnBuildChange() {
  let seen = "";
  try {
    seen = localStorage.getItem(BUILD_KEY) || "";
  } catch {
    seen = "";
  }
  if (seen === APP_BUILD) return; // 本版本已初始化过，跳过
  try {
    if ("serviceWorker" in navigator) {
      const regs = await navigator.serviceWorker.getRegistrations();
      await Promise.all(regs.map((r) => r.unregister()));
    }
  } catch {
    /* 忽略 */
  }
  try {
    if ("caches" in window) {
      const keys = await caches.keys();
      await Promise.all(keys.map((k) => caches.delete(k)));
    }
  } catch {
    /* 忽略 */
  }
  try {
    localStorage.setItem(BUILD_KEY, APP_BUILD);
  } catch {
    /* 忽略 */
  }
  window.location.reload(true); // 硬刷新，确保后续加载全新资源
}

if ("serviceWorker" in navigator) {
  // 先按版本号做一次性清理，再注册（带版本查询串，每次改版视为全新 SW）
  selfHealOnBuildChange().finally(() => {
    window.addEventListener("load", () => {
      const SW_URL = "./sw.js?b=7";
      navigator.serviceWorker
        .register(SW_URL, { updateViaCache: "none" })
        .then((reg) => {
          reg.update().catch(() => {});
        })
        .catch(() => {});

      let refreshing = false;
      navigator.serviceWorker.addEventListener("controllerchange", () => {
        if (refreshing) return;
        refreshing = true;
        window.location.reload();
      });
    });
  });
}
