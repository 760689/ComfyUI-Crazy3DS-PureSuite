import { app } from "../../scripts/app.js";
import { api } from "../../scripts/api.js";

const STYLE_ID = "c3ds-loader-unified-style";
if (!document.getElementById(STYLE_ID)) {
    const styleEl = document.createElement("style");
    styleEl.id = STYLE_ID;
    styleEl.innerHTML = `
        .c3ds-card.c3ds-missing-disabled, .c3ds-list-row.c3ds-missing-disabled { cursor: not-allowed; }
        .c3ds-flow-scroll-wrap { display: none; align-items: center; gap: 4px; overflow-x: auto; scrollbar-width: none; flex: 1; min-width: 0; white-space: nowrap; margin: 0 4px; }
        .c3ds-flow-scroll-wrap::-webkit-scrollbar { display: none; }
        .c3ds-flow-scroll-wrap > * { flex-shrink: 0; white-space: nowrap; }
        .c3ds-root { width: 100%; height: 100%; min-height: 0; display: flex; flex-direction: column; gap: 4px; box-sizing: border-box; position: relative; user-select: none; overflow: hidden; font-family: -apple-system, BlinkMacSystemFont, sans-serif; pointer-events: none; }
        .c3ds-root > * { pointer-events: auto; }
        .c3ds-bar { width: 100%; height: 26px; display: flex; gap: 4px; box-sizing: border-box; flex-shrink: 0; background: #1e1e1e; border: 1px solid #383838; }
        .c3ds-tab { flex: 1; height: 100%; display: flex; align-items: center; justify-content: center; cursor: pointer; font-size: 11px; transition: all 0.15s ease; color: #888; border: 1px solid #383838; background: #1e1e1e; }
        .c3ds-tab.active { background: #7b3737; color: #fff; border-color: #944444; font-weight: bold; }
        .c3ds-path-val { width: 100%; height: 100%; display: flex; align-items: center; justify-content: space-between; padding: 0 6px 0 10px; color: #b35050; font-size: 11.5px; font-weight: 600; box-sizing: border-box; }
        .c3ds-dropdown { display: none; position: absolute; top: 100%; left: 0; right: 0; margin-top: 2px; background: #181818; border: 1px solid #444; max-height: 240px; overflow-y: auto; z-index: 99999; box-shadow: 0 8px 24px rgba(0,0,0,0.9); pointer-events: auto; }
        .c3ds-dropdown-item { display: flex; align-items: center; justify-content: space-between; padding: 6px 10px; font-size: 11.5px; color: #bbb; cursor: pointer; border-bottom: 1px solid #242424; }
        .c3ds-dropdown-item:hover { background: #2b2b2b; color: #fff; }
        
        .c3ds-view-main { width: 100%; flex: 1; min-height: 0; background: #242424; border: 1px solid #2e2e2e; position: relative; overflow: hidden; box-sizing: border-box; display: flex; flex-direction: column; transition: background-color 0.15s ease; }
        
        /* 画廊网格模式 */
        .c3ds-gallery-scroll { width: 100%; flex: 1; min-height: 0; padding: 4px; overflow-y: auto; box-sizing: border-box; }
        .c3ds-gallery-scroll.mode-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(76px, 1fr)); grid-auto-rows: 76px; gap: 4px; align-content: start; }
        .c3ds-card { width: 100%; height: 76px; background: #181818; border: 1px solid #383838; position: relative; cursor: pointer; overflow: hidden; box-sizing: border-box; border-radius: 2px; }
        .c3ds-card img { width: 100%; height: 100%; object-fit: cover; display: block; }
        
        .c3ds-card.selected { border: 2px solid #c53030; box-shadow: inset 0 0 0 1px #c53030; }
        .c3ds-card.selected::after {
            content: "";
            position: absolute;
            bottom: 0;
            right: 0;
            width: 0;
            height: 0;
            border-style: solid;
            border-width: 0 0 17px 17px;
            border-color: transparent transparent #c53030 transparent;
            z-index: 4;
            pointer-events: none;
        }
        .c3ds-card.selected::before {
            content: "✓";
            position: absolute;
            bottom: -1px;
            right: 1px;
            font-size: 8px;
            color: #ffffff;
            font-weight: 900;
            z-index: 5;
            pointer-events: none;
            line-height: 1;
        }
        .c3ds-card.checked { border: 2px solid #22c55e; }
        .c3ds-card.marked-del { border: 2px solid #ef4444; }

        /* 画廊紧凑列表模式 */
        .c3ds-gallery-scroll.mode-list { display: flex; flex-direction: column; gap: 2px; }
        .c3ds-list-row { width: 100%; height: 26px; background: #181818; border: 1px solid #303030; display: flex; align-items: center; padding: 0 4px 0 6px; box-sizing: border-box; cursor: pointer; border-radius: 2px; gap: 6px; flex-shrink: 0; transition: background 0.12s ease; }
        .c3ds-list-row:hover { background: #232323; border-color: #484848; }
        .c3ds-list-row.selected { border: 1.5px solid #c53030; background: #2b1818; }
        .c3ds-list-row.checked { border: 1.5px solid #22c55e; background: #182818; }
        .c3ds-list-row.marked-del { border: 1.5px solid #ef4444; background: #2d1818; }
        .c3ds-list-thumb { width: 20px; height: 20px; object-fit: cover; border-radius: 2px; flex-shrink: 0; background: #111; }
        .c3ds-list-name { flex: 1; min-width: 0; font-size: 11px; color: #ccc; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; display: block; }
        .c3ds-list-row.selected .c3ds-list-name { color: #fff; font-weight: 600; }
        .c3ds-list-specs { font-size: 9.5px; color: #666; white-space: nowrap; flex-shrink: 0; margin-right: 4px; }
        
        .c3ds-brick { width: 100%; height: 76px; border: 1px dashed #555; background: #151515; display: flex; flex-direction: column; align-items: center; justify-content: center; cursor: pointer; border-radius: 2px; color: #888; font-size: 9.5px; gap: 2px; }
        .c3ds-brick:hover { border-color: #7b3737; color: #e5b9b9; background: #1e1818; }
        .c3ds-brick-list { width: 100%; height: 24px; border: 1px dashed #444; background: #151515; display: flex; align-items: center; justify-content: center; cursor: pointer; border-radius: 2px; color: #888; font-size: 10px; gap: 4px; flex-shrink: 0; }
        .c3ds-brick-list:hover { border-color: #7b3737; color: #e5b9b9; background: #1e1818; }

        .c3ds-handle { position: absolute; width: 7px; height: 7px; background: #fff; border: 1px solid #48bb78; box-sizing: border-box; }
        
        /* 底部 HUD */
        .c3ds-hud { width: 100%; height: 18px; min-height: 18px; background: transparent; border-top: none; display: flex; align-items: center; justify-content: space-between; gap: 6px; padding: 0 4px; margin-top: -2px; margin-bottom: 6px; box-sizing: border-box; flex-shrink: 0; font-size: 6px; line-height: 1; z-index: 10; }
        .c3ds-hud-info { display: flex; align-items: center; flex-wrap: nowrap; gap: 6px; flex: 1; min-width: 0; overflow: hidden; }
        .c3ds-hud-title { color: #888; font-size: 9px; line-height: 1; font-weight: normal; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; flex: 1; min-width: 0; }
        .c3ds-hud-specs { color: #888; font-size: 9px; line-height: 1; white-space: nowrap; flex-shrink: 0; }
        .c3ds-hud-count { color: #888; font-size: 9px; line-height: 1; flex-shrink: 0; margin-left: auto; white-space: nowrap; font-weight: normal; }
        
        .c3ds-float-btn-group { position: absolute; top: 8px; right: 8px; display: none; gap: 4px; z-index: 30; }
        .c3ds-float-btn { padding: 1.5px 5px; font-size: 8.5px; font-weight: 600; border-radius: 2px; cursor: pointer; backdrop-filter: blur(8px); border: none; box-shadow: 0 2px 6px rgba(0,0,0,0.5); line-height: 1.25; }
        .c3ds-float-save { background: rgba(34, 197, 94, 0.38); color: #e6fffa; border: 1px solid rgba(34, 197, 94, 0.45); }
        .c3ds-float-save:hover { background: rgba(34, 197, 94, 0.85); color: #fff; }
        .c3ds-float-reset { background: rgba(245, 158, 11, 0.38); color: #fffbeb; border: 1px solid rgba(245, 158, 11, 0.45); }
        .c3ds-float-reset:hover { background: rgba(245, 158, 11, 0.85); color: #fff; }
        .c3ds-float-cancel { background: rgba(75, 85, 99, 0.38); color: #f3f4f6; border: 1px solid rgba(156, 163, 175, 0.45); }
        .c3ds-float-cancel:hover { background: rgba(75, 85, 99, 0.85); color: #fff; }

        .c3ds-direct-toggle { font-size: 10px; padding: 2px 5px; border-radius: 2px; cursor: pointer; border: 1px solid #444; background: #222; color: #888; font-weight: 600; line-height: 1.25; transition: all 0.15s ease; flex-shrink: 0; }
        .c3ds-direct-toggle:hover { border-color: #666; color: #ccc; }
        .c3ds-direct-toggle.active { background: #7b2c2c; border-color: #e53e3e; color: #ffffff; box-shadow: 0 0 6px rgba(229, 62, 62, 0.4); }

        .c3ds-direct-overlay { position: absolute; inset: 0; background: rgba(14, 14, 14, 0.95); backdrop-filter: blur(8px); z-index: 9000; display: none; flex-direction: column; align-items: center; justify-content: center; gap: 7px; box-sizing: border-box; text-align: center; pointer-events: auto; }
        .c3ds-privacy-overlay { position: absolute; inset: 0; background: #131313; border: 1px solid #2c2c2c; border-radius: 4px; box-sizing: border-box; z-index: 9999; display: none; flex-direction: column; align-items: center; justify-content: center; pointer-events: auto; }

        .c3ds-view-toggle-btn { width: 16px; height: 16px; display: flex; align-items: center; justify-content: center; cursor: pointer; border-radius: 2px; background: transparent; border: none; transition: all 0.15s ease; }
        .c3ds-view-toggle-btn:hover { background: transparent; }
        .c3ds-view-toggle-btn.active { background: transparent; }
        .c3ds-view-toggle-btn svg { width: 12px; height: 12px; fill: #555; transition: fill 0.15s ease; }
        .c3ds-view-toggle-btn:hover svg { fill: #aaa; }
        .c3ds-view-toggle-btn.active svg { fill: #e58b8b; }

        /* 顶部右侧流转模式胶囊 */
        .c3ds-top-flow-btn { font-size: 9.5px; padding: 1.5px 5px; cursor: pointer; border-radius: 2px; white-space: nowrap; flex-shrink: 0; transition: all 0.15s ease; user-select: none; line-height: 1.25; background: #7b3737; color: #fff; border: 1px solid #944444; }
        
        /* 缩减至 2/3 大小的 10px×10px 防误触删除按键 */
        .c3ds-single-del { position: absolute; top: 2px; left: 2px; width: 10px; height: 10px; background: rgba(0,0,0,0.8); color: #999; display: flex; align-items: center; justify-content: center; font-size: 9px; line-height: 1; border-radius: 2px; z-index: 3; cursor: pointer; }
        .c3ds-single-del:hover { background: #b91c1c; color: #fff; }
    `;
    document.head.appendChild(styleEl);
}

const STORAGE_LOAD_KEY = "Crazy3DS_Global_Load_Paths";
const STORAGE_LOAD_IDX_KEY = "Crazy3DS_Global_Load_Selected_Idx";
const IMAGE_META_CACHE = {};

function getGlobalLoadPaths() {
    try {
        const raw = localStorage.getItem(STORAGE_LOAD_KEY);
        if (raw) {
            const p = JSON.parse(raw);
            if (Array.isArray(p) && p.length > 0) return p.slice(0, 19);
        }
    } catch (e) {}
    return ["input"];
}

function setGlobalLoadPaths(paths, selectedIdx) {
    const clean = paths.slice(0, 19);
    try {
        localStorage.setItem(STORAGE_LOAD_KEY, JSON.stringify(clean));
        if (typeof selectedIdx === "number") localStorage.setItem(STORAGE_LOAD_IDX_KEY, String(selectedIdx));
    } catch (e) {}
    api.fetchApi("/crazy3ds/save_load_paths", {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ paths: clean })
    }).catch(() => {});
}

function syncNodeGalleryColor(node) {
    if (!node.c3dsBars) return;
    const targetColor = node.bgcolor || (window.LiteGraph && LiteGraph.NODE_DEFAULT_BGCOLOR) || "#353535";
    if (node._c3ds_applied_bg === targetColor) return;
    node._c3ds_applied_bg = targetColor;

    if (node.c3dsBars.viewMain) {
        node.c3dsBars.viewMain.style.backgroundColor = targetColor;
        node.c3dsBars.viewMain.style.borderColor = targetColor;
    }
    if (node.c3dsBars.focusContainer) {
        node.c3dsBars.focusContainer.style.backgroundColor = targetColor;
    }
    if (node.c3dsBars.focusImgWrap) {
        node.c3dsBars.focusImgWrap.style.backgroundColor = targetColor;
    }
    if (node.c3dsBars.barHud) {
        node.c3dsBars.barHud.style.backgroundColor = 'transparent';
    }
}

function updateDomDimensions(node) {
    if (!node.c3dsDomWidget || !node.c3dsDomWidget.element) return;
    const widgetY = (node.c3dsDomWidget && typeof node.c3dsDomWidget.y === "number" && node.c3dsDomWidget.y > 10) ? node.c3dsDomWidget.y : 32;
    const nodeW = node.size ? node.size[0] : 360;
    const nodeH = node.size ? node.size[1] : 330;

    const w = Math.max(200, nodeW - 10);
    const h = Math.max(80, nodeH - widgetY - 6);

    const el = node.c3dsDomWidget.element;
    el.style.width = w + "px";
    el.style.height = h + "px";
    el.style.maxHeight = h + "px";
    el.style.marginLeft = "-5px";

    if (el.parentElement) {
        el.parentElement.style.pointerEvents = "none";
        el.parentElement.style.overflow = "hidden";
        el.parentElement.style.maxHeight = h + "px";
        el.parentElement.style.height = h + "px";
    }
    if (node.c3dsUpdateOverlays) {
        node.c3dsUpdateOverlays();
    }
}

function setupLoaderPanel(node) {
    const hideWidgets = ["target_path", "folder_direct", "mode", "multi_flow", "selected_index", "selected_files", "queue_index", "filename"];
    if (node.widgets) {
        for (const w of node.widgets) {
            if (hideWidgets.includes(w.name)) {
                w.type = "hidden";
                w.hidden = true;
                w.computeSize = () => [0, -4];
            }
        }
    }

    const loadPaths = getGlobalLoadPaths();
    node.properties = node.properties || {};
    node.properties.load_paths = loadPaths;
    node.properties.selected_idx = (typeof node.properties.c3ds_path_idx === "number") ? node.properties.c3ds_path_idx : 0;
    node.properties.folder_direct = !!node.properties.folder_direct;
    node.properties.c3ds_mode = node.properties.c3ds_mode || "Single";
    node.properties.c3ds_flow = node.properties.c3ds_flow || "List";
    node.properties.order_assign_mode = node.properties.order_assign_mode || "fixed";
    node.properties.pool = node.properties.c3ds_pool || [];
    node.properties.batch_checked_ids = [];
    node.properties.slot_map = node.properties.slot_map || {};
    node.properties.batch_remove_ids = [];
    node.properties.privacy_mode = !!node.properties.c3ds_privacy_mode;
    node.properties.gallery_view_mode = node.properties.gallery_view_mode || "grid";
    node.properties.is_focus_view = false;
    node.isCroppingActive = false;
    node.isBatchRemoveMode = false;

    const getWidget = (name) => node.widgets?.find(w => w.name === name);

    node.properties.c3ds_preview_idx = (typeof node.properties.c3ds_preview_idx === "number") 
        ? node.properties.c3ds_preview_idx 
        : (getWidget("selected_index")?.value || 0);

    node._preview_focus_idx = node.properties.c3ds_preview_idx;
    node._last_active_idx = node.properties.c3ds_preview_idx;

    const getActiveItem = () => {
        const pool = node.properties.pool || [];
        const curIdx = Math.max(0, Math.min(getWidget("selected_index")?.value || 0, pool.length - 1));
        return pool[curIdx] || null;
    };

    const getFocusItem = () => {
        const pool = node.properties.pool || [];
        if (!pool.length) return null;
        if (node.properties.is_focus_view && typeof node._preview_focus_idx === "number") {
            const fIdx = Math.max(0, Math.min(node._preview_focus_idx, pool.length - 1));
            return pool[fIdx] || null;
        }
        if (node.properties.c3ds_mode === "Multi" && typeof node._last_active_idx === "number") {
            const aIdx = Math.max(0, Math.min(node._last_active_idx, pool.length - 1));
            return pool[aIdx] || pool[0] || null;
        }
        return getActiveItem();
    };

    const getEffectiveOrderMap = () => {
        const isFixed = (node.properties.order_assign_mode !== "fill");
        const checkedList = node.properties.batch_checked_ids || [];
        const map = new Map();

        if (isFixed) {
            const slotMap = node.properties.slot_map || {};
            checkedList.forEach(id => {
                if (typeof slotMap[id] === "number") {
                    map.set(id, slotMap[id]);
                }
            });
        } else {
            checkedList.forEach((id, idx) => {
                map.set(id, idx + 1);
            });
        }
        return map;
    };

    const syncWidgetValues = () => {
        const pool = node.properties.pool || [];
        const curItem = getActiveItem();

        const list = node.properties.load_paths;
        const pIdx = Math.max(0, Math.min(node.properties.selected_idx, list.length - 1));
        const curPath = list[pIdx] || "input";

        const targetW = getWidget("target_path");
        if (targetW) {
            if (node.properties.folder_direct) {
                targetW.value = curPath;
            } else {
                targetW.value = curItem ? (curItem.edited_path || curItem.path || curPath) : curPath;
            }
        }

        const fdW = getWidget("folder_direct");
        if (fdW) fdW.value = !!node.properties.folder_direct;

        const modeW = getWidget("mode");
        if (modeW) modeW.value = (node.properties.c3ds_mode === "Multi") ? "Multi \u591a\u56fe\u6a21\u5f0f" : "Single \u5355\u56fe\u6a21\u5f0f";

        const flowW = getWidget("multi_flow");
        if (flowW) flowW.value = (node.properties.c3ds_flow === "Batch") ? "Batch \u6279\u91cf\u5408\u5e76" : "List \u5217\u8868\u6a21\u5f0f";

        node.properties.c3ds_pool = pool;
        node.properties.c3ds_selected_idx = getWidget("selected_index")?.value || 0;
        node.properties.c3ds_path_idx = node.properties.selected_idx || 0;
        node.properties.c3ds_privacy_mode = !!node.properties.privacy_mode;
        node.properties.c3ds_batch_checked_ids = [...(node.properties.batch_checked_ids || [])];

        const selFilesW = getWidget("selected_files");
        if (selFilesW) {
            if (node.properties.c3ds_mode === "Multi") {
                const orderMap = getEffectiveOrderMap();
                const itemMap = new Map(pool.map(it => [it.id, it]));
                const sortedPairs = Array.from(orderMap.entries()).sort((a, b) => a[1] - b[1]);
                const batchItems = sortedPairs.map(([id]) => itemMap.get(id)).filter(Boolean);
                selFilesW.value = JSON.stringify(batchItems.length ? batchItems : (curItem ? [curItem] : []));
            } else {
                selFilesW.value = JSON.stringify(curItem ? [curItem] : []);
            }
        }

        const fnW = getWidget("filename");
        if (fnW && curItem) {
            const n = curItem.edited_name || curItem.name || "";
            fnW.value = n.substring(0, n.lastIndexOf('.')) || n;
        }
    };

    const root = document.createElement("div");
    root.className = "c3ds-root";

    root.addEventListener("wheel", (e) => {
        if (dropdownMenu.style.display === "block" && dropdownMenu.contains(e.target)) return;

        if (galleryScroll.contains(e.target) && !node.properties.is_focus_view) {
            const isScrollable = galleryScroll.scrollHeight > galleryScroll.clientHeight;
            if (isScrollable) {
                const atTop = galleryScroll.scrollTop <= 1;
                const atBottom = Math.ceil(galleryScroll.scrollTop + galleryScroll.clientHeight) >= (galleryScroll.scrollHeight - 1);
                if ((e.deltaY < 0 && !atTop) || (e.deltaY > 0 && !atBottom)) {
                    return;
                }
            }
        }

        e.preventDefault(); 
        e.stopPropagation();
        if (app.canvas && app.canvas.processMouseWheel) {
            app.canvas.processMouseWheel(e);
        }
    }, { passive: false });

    root.addEventListener("pointerdown", (e) => {
        if (e.button === 1 || e.button === 2 || e.spaceKey) {
            if (app.canvas && app.canvas.processMouseDown) app.canvas.processMouseDown(e);
            return;
        }
        
        if (e.button === 0) {
            if (e.target === root || e.target === viewMain || e.target === galleryScroll) {
                if (app.canvas && app.canvas.processMouseDown) {
                    app.canvas.processMouseDown(e);
                }
            }
        }
    });

    // ========================================================
    // 第 1 行：路径选择与目录直出
    // ========================================================
    const barTarget = document.createElement("div");
    barTarget.className = "c3ds-bar";
    barTarget.style.position = "relative";
    barTarget.innerHTML = `
        <div class="c3ds-path-val">
            <div id="c3dsPathClickArea" style="display:flex;align-items:center;flex:1;min-width:0;cursor:pointer;gap:5px;" title="点击切换历史路径">
                <span id="c3dsPathText" style="overflow:hidden;text-overflow:ellipsis;white-space:nowrap;flex:1;"></span>
                <span style="font-size:11px;color:#a84b4b;flex-shrink:0;">▾</span>
            </div>
            <button id="btnFolderDirect" class="c3ds-direct-toggle" type="button" title="开启后：当前目录文件夹全量输出">目录直出: 关</button>
        </div>
        <div class="c3ds-dropdown"></div>
    `;

    const pathText = barTarget.querySelector("#c3dsPathText");
    const pathClickArea = barTarget.querySelector("#c3dsPathClickArea");
    const dropdownMenu = barTarget.querySelector(".c3ds-dropdown");
    const btnFolderDirect = barTarget.querySelector("#btnFolderDirect");

    const updateOverlayUI = () => {
        const isPrivacy = !!node.properties.privacy_mode;
        const isDirect = !!node.properties.folder_direct;

        btnFolderDirect.innerText = isDirect ? "目录直出: 开" : "目录直出: 关";
        btnFolderDirect.classList.toggle("active", isDirect);

        if (isPrivacy) {
            privacyOverlay.style.display = "flex";
            directOverlay.style.display = "none";
        } else if (isDirect) {
            privacyOverlay.style.display = "none";
            directOverlay.style.display = "flex";
        } else {
            privacyOverlay.style.display = "none";
            directOverlay.style.display = "none";
        }

        updateHudText();
    };
    node.c3dsUpdateOverlays = updateOverlayUI;

    btnFolderDirect.onclick = (e) => {
        e.stopPropagation();
        node.properties.folder_direct = !node.properties.folder_direct;
        if (node.properties.folder_direct && node.properties.is_focus_view) {
            switchViewMode(false);
        }
        updateOverlayUI();
        syncWidgetValues();
        node.setDirtyCanvas(true, true);
    };

    const invokeFileSelector = async (dirToOpen) => {
        try {
            const res = await api.fetchApi("/crazy3ds/choose_files", {
                method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ initial_path: dirToOpen || "" })
            });
            const ret = await res.json();
            if (ret.success && ret.folder && ret.files?.length > 0) {
                const chosen = ret.folder;
                let fresh = (node.properties.load_paths || getGlobalLoadPaths()).filter(p => p.toLowerCase() !== chosen.toLowerCase());
                fresh.unshift(chosen);
                fresh = fresh.slice(0, 19);
                node.properties.load_paths = fresh;
                node.properties.selected_idx = 0;
                node.properties.c3ds_path_idx = 0;
                setGlobalLoadPaths(fresh, 0);

                const pool = node.properties.pool || [];
                const exist = new Set(pool.map(it => `${it.path}/${it.name}`.toLowerCase()));

                for (const f of ret.files) {
                    const key = `${chosen}/${f}`.toLowerCase();
                    if (!exist.has(key)) {
                        pool.push({
                            id: "c3ds_" + Date.now() + "_" + Math.random().toString(36).substr(2, 6),
                            path: chosen, name: f, edited_path: null, edited_name: null, crop: null, crop_ratio: "原图", rot: 0, flip_h: false, flip_v: false
                        });
                        exist.add(key);
                    }
                }
                node.properties.pool = pool;

                syncWidgetValues();
                renderDropdown();
                renderGallery();
                updateFocusImage();
                updateHudText();
                node.setDirtyCanvas(true, true);
            }
        } catch (err) {
            console.error(err);
        }
    };

    const invokeFolderSelector = async () => {
        try {
            const curPaths = node.properties.load_paths || getGlobalLoadPaths();
            const initP = curPaths[node.properties.selected_idx || 0] || "";
            const res = await api.fetchApi("/crazy3ds/choose_folder", {
                method: "POST", headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ initial_path: initP })
            });
            const ret = await res.json();
            if (ret.success && ret.folder) {
                const chosen = ret.folder;
                let fresh = (node.properties.load_paths || getGlobalLoadPaths()).filter(p => p.toLowerCase() !== chosen.toLowerCase());
                fresh.unshift(chosen);
                fresh = fresh.slice(0, 19);
                node.properties.load_paths = fresh;
                node.properties.selected_idx = 0;
                node.properties.c3ds_path_idx = 0;
                setGlobalLoadPaths(fresh, 0);

                syncWidgetValues();
                renderDropdown();
                updateHudText();
                node.setDirtyCanvas(true, true);
            }
        } catch (err) {
            console.error("Choose folder error:", err);
        }
    };

    pathClickArea.onclick = (e) => {
        e.stopPropagation();
        const isOpen = dropdownMenu.style.display === "block";
        dropdownMenu.style.display = isOpen ? "none" : "block";
        if (!isOpen) renderDropdown();
    };

    window.addEventListener("pointerdown", (e) => {
        if (dropdownMenu.style.display === "block" && !barTarget.contains(e.target)) {
            dropdownMenu.style.display = "none";
        }
    }, true);

    const renderDropdown = () => {
        const list = node.properties.load_paths || getGlobalLoadPaths();
        const idx = Math.max(0, Math.min(node.properties.selected_idx, list.length - 1));
        pathText.innerText = `[${idx + 1}] ${list[idx] || "input"}`;
        dropdownMenu.innerHTML = "";

        const addCustomItem = document.createElement("div");
        addCustomItem.className = "c3ds-dropdown-item";
        addCustomItem.title = "打开本地资源管理器选择自定义文件夹路径";
        addCustomItem.style.cssText = "background:#221e1e;border-bottom:1px solid #443;color:#e5b9b9;font-weight:600;display:flex;align-items:center;justify-content:center;gap:6px;padding:7px 10px;";
        addCustomItem.innerHTML = `<span>➕</span><span>浏览选择自定义路径文件夹...</span>`;
        addCustomItem.onclick = async (e) => {
            e.stopPropagation();
            dropdownMenu.style.display = "none";
            await invokeFolderSelector();
        };
        dropdownMenu.appendChild(addCustomItem);

        list.forEach((p, i) => {
            const isCur = i === idx;
            const item = document.createElement("div");
            item.className = "c3ds-dropdown-item";
            item.title = `切换至路径：${p}`;
            if (isCur) item.style.background = "#264";
            item.innerHTML = `
                <span style="flex-shrink:0;color:${isCur ? '#fff' : '#888'};margin-right:6px;font-family:monospace;font-size:11px;">[${i + 1}]</span>
                <span style="overflow:hidden;text-overflow:ellipsis;white-space:nowrap;flex:1;min-width:0;direction:rtl;text-align:left;" title="${p}"><bdo dir="ltr">${p}</bdo></span>
                ${list.length > 1 ? '<span class="c3ds-del-path" style="color:#888;font-size:14px;padding:0 4px;margin-left:6px;flex-shrink:0;" title="从此列表中移除该路径记录">×</span>' : ''}
            `;

            const del = item.querySelector(".c3ds-del-path");
            if (del) {
                del.onclick = (e) => {
                    e.stopPropagation();
                    const fresh = (node.properties.load_paths || getGlobalLoadPaths()).filter((_, i2) => i2 !== i);
                    const newIdx = Math.max(0, idx - (i <= idx ? 1 : 0));
                    node.properties.load_paths = fresh;
                    node.properties.selected_idx = newIdx;
                    node.properties.c3ds_path_idx = newIdx;
                    setGlobalLoadPaths(fresh, newIdx);
                    syncWidgetValues();
                    renderDropdown();
                    node.setDirtyCanvas(true, true);
                };
            }

            item.onclick = (e) => {
                if (e.target.innerText === "×") return;
                e.stopPropagation();
                dropdownMenu.style.display = "none";
                node.properties.selected_idx = i;
                node.properties.c3ds_path_idx = i;
                setGlobalLoadPaths(list, i);
                syncWidgetValues();
                renderDropdown();
                node.setDirtyCanvas(true, true);
            };
            dropdownMenu.appendChild(item);
        });
    };

    // ========================================================
    // 第 2 行：打开素材路径 (2/3) + 转到去路 (1/3)
    // ========================================================
    const barOpen = document.createElement("div");
    barOpen.className = "c3ds-bar";
    barOpen.style.cssText = "height:26px;display:flex;gap:4px;box-sizing:border-box;background:transparent;border:none;margin:0;padding:0;";

    const btnOpenFolder = document.createElement("div");
    btnOpenFolder.title = "【打开路径】在系统资源管理器中直接打开当前选中的素材文件夹";
    btnOpenFolder.style.cssText = "flex:2;height:100%;background:#1e1e1e;border:1px solid #383838;display:flex;align-items:center;justify-content:center;cursor:pointer;color:#ddd;font-size:11.5px;box-sizing:border-box;border-radius:2px;transition:all 0.15s ease;";
    btnOpenFolder.innerText = "打开路径文件夹";
    btnOpenFolder.onmouseenter = () => { btnOpenFolder.style.background = "#282828"; btnOpenFolder.style.borderColor = "#555"; };
    btnOpenFolder.onmouseleave = () => { btnOpenFolder.style.background = "#1e1e1e"; btnOpenFolder.style.borderColor = "#383838"; };
    btnOpenFolder.onclick = async (e) => {
        if (e) e.stopPropagation();
        const p = (node.properties.load_paths || getGlobalLoadPaths())[node.properties.selected_idx || 0];
        try {
            const res = await api.fetchApi("/crazy3ds/open_folder", {
                method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ target_path: p })
            });
            const ret = await res.json();
            if (ret && ret.success) {
                btnOpenFolder.innerText = "已打开文件夹";
                btnOpenFolder.style.color = "#48bb78";
                setTimeout(() => { btnOpenFolder.innerText = "打开路径文件夹"; btnOpenFolder.style.color = "#ddd"; }, 1200);
            } else if (ret && ret.message) {
                btnOpenFolder.innerText = "打开失败";
                btnOpenFolder.style.color = "#ef4444";
                setTimeout(() => { btnOpenFolder.innerText = "打开路径文件夹"; btnOpenFolder.style.color = "#ddd"; }, 1200);
            }
        } catch (err) {
            btnOpenFolder.innerText = "请求异常";
            btnOpenFolder.style.color = "#ef4444";
            setTimeout(() => { btnOpenFolder.innerText = "打开路径文件夹"; btnOpenFolder.style.color = "#ddd"; }, 1200);
        }
    };

    const btnGoDst = document.createElement("div");
    btnGoDst.title = "【转到去路】一键获取下游最后一个激活的图片保存节点当前设置的存储目录";
    btnGoDst.style.cssText = "flex:1;height:100%;background:#1e1e1e;border:1px solid #383838;display:flex;align-items:center;justify-content:center;cursor:pointer;color:#ddd;font-size:11.5px;box-sizing:border-box;border-radius:2px;transition:all 0.15s ease;";
    btnGoDst.innerText = "转到去路";
    btnGoDst.onmouseenter = () => { btnGoDst.style.background = "#282828"; btnGoDst.style.borderColor = "#7b3737"; btnGoDst.style.color = "#fca5a5"; };
    btnGoDst.onmouseleave = () => { btnGoDst.style.background = "#1e1e1e"; btnGoDst.style.borderColor = "#383838"; btnGoDst.style.color = "#ddd"; };
    btnGoDst.onclick = (e) => {
        if (e) e.stopPropagation();
        if (!app.graph || !app.graph._nodes) return;

        const activeSavers = app.graph._nodes.filter(n => {
            const isSaver = n.comfyClass === "Crazy3DS_SaveImage" || (n.type && n.type.includes("SaveImage"));
            const isInactive = n.mode === 2 || n.mode === 4 || (n.flags && n.flags.collapsed);
            return isSaver && !isInactive;
        });

        if (!activeSavers.length) {
            btnGoDst.innerText = "未发现去路";
            btnGoDst.style.color = "#ef4444";
            setTimeout(() => { btnGoDst.innerText = "转到去路"; btnGoDst.style.color = "#ddd"; }, 1200);
            return;
        }

        const lastSaver = activeSavers[activeSavers.length - 1];
        let dstPath = "";
        if (lastSaver.properties?.paths_list && lastSaver.properties.paths_list.length > 0) {
            const sIdx = Math.max(0, Math.min(lastSaver.properties.selected_idx || 0, lastSaver.properties.paths_list.length - 1));
            dstPath = lastSaver.properties.paths_list[sIdx];
        }
        if (!dstPath) {
            const tw = lastSaver.widgets?.find(w => w.name === "target_path");
            if (tw && tw.value) dstPath = String(tw.value);
        }

        if (dstPath && dstPath.trim()) {
            dstPath = dstPath.trim();
            let fresh = (node.properties.load_paths || getGlobalLoadPaths()).filter(p => p.toLowerCase() !== dstPath.toLowerCase());
            fresh.unshift(dstPath);
            fresh = fresh.slice(0, 19);
            node.properties.load_paths = fresh;
            node.properties.selected_idx = 0;
            node.properties.c3ds_path_idx = 0;
            setGlobalLoadPaths(fresh, 0);

            syncWidgetValues();
            renderDropdown();
            updateHudText();
            node.setDirtyCanvas(true, true);

            btnGoDst.innerText = "已获取去路";
            btnGoDst.style.color = "#48bb78";
            setTimeout(() => { btnGoDst.innerText = "转到去路"; btnGoDst.style.color = "#ddd"; }, 1200);
        } else {
            btnGoDst.innerText = "去路路径空";
            btnGoDst.style.color = "#f59e0b";
            setTimeout(() => { btnGoDst.innerText = "转到去路"; btnGoDst.style.color = "#ddd"; }, 1200);
        }
    };

    barOpen.appendChild(btnOpenFolder);
    barOpen.appendChild(btnGoDst);

    // ========================================================
    // 第 3 行：单图 / 多图 模式切换
    // ========================================================
    const barMode = document.createElement("div");
    barMode.style.cssText = "width:100%;height:26px;display:flex;gap:4px;box-sizing:border-box;flex-shrink:0;";
    barMode.innerHTML = `
        <div class="c3ds-tab active" data-mode="Single" title="单图模式：仅输出当前选中的单张图片">🔘 单图模式</div>
        <div class="c3ds-tab" data-mode="Multi" title="多图模式：按顺序输出画廊中勾选的全部图片">📦 多图模式</div>
    `;

    const tabBtns = barMode.querySelectorAll(".c3ds-tab");
    tabBtns.forEach(btn => {
        btn.onclick = (e) => {
            if (e) e.stopPropagation();
            node.properties.c3ds_mode = btn.dataset.mode;
            node.isBatchRemoveMode = false;
            if (node.properties.c3ds_mode === "Multi" && !node.properties.c3ds_flow) {
                node.properties.c3ds_flow = "List";
            }
            updateModeUI();
            syncWidgetValues();
            updateCardSelectionState();
            updateHudText();
            node.setDirtyCanvas(true, true);
        };
    });

    const updateModeUI = () => {
        const isMulti = (node.properties.c3ds_mode === "Multi");
        tabBtns.forEach(b => b.classList.toggle("active", b.dataset.mode === node.properties.c3ds_mode));
        btnFlowWrap.style.display = isMulti ? "flex" : "none";
        if (btnSelectAll) btnSelectAll.style.display = isMulti ? "inline-block" : "none";
        if (btnDeselectAll) btnDeselectAll.style.display = isMulti ? "inline-block" : "none";
        if (btnOrderMode) btnOrderMode.style.display = isMulti ? "inline-block" : "none";
        updateFlowBtnUI();
        updateOrderModeBtnUI();
        updateHudText();
    };

    // ========================================================
    // 第 4 行：画廊主体与大图编辑
    // ========================================================
    const viewMain = document.createElement("div");
    viewMain.className = "c3ds-view-main";

    const galleryViewWrap = document.createElement("div");
    galleryViewWrap.style.cssText = "width:100%;height:100%;display:flex;flex-direction:column;min-height:0;overflow:hidden;background:transparent;";

    const galleryTopBar = document.createElement("div");
    galleryTopBar.style.cssText = "width:100%;height:24px;background:#181818;border-bottom:1px solid #262626;display:flex;align-items:center;justify-content:space-between;padding:0 5px;box-sizing:border-box;flex-shrink:0;user-select:none;";
    galleryTopBar.innerHTML = `
        <div style="display:flex;align-items:center;gap:4px;flex:1;min-width:0;">
            <div id="viewModeToggleGroup" style="display:flex;align-items:center;gap:2px;background:transparent;border:none;padding:0;flex-shrink:0;" title="切换画廊显示模式">
                <div id="btnModeGrid" class="c3ds-view-toggle-btn active" title="缩略图网格视图">
                    <svg viewBox="0 0 16 16"><rect x="1" y="1" width="6" height="6" rx="1"/><rect x="9" y="1" width="6" height="6" rx="1"/><rect x="1" y="9" width="6" height="6" rx="1"/><rect x="9" y="9" width="6" height="6" rx="1"/></svg>
                </div>
                <div id="btnModeList" class="c3ds-view-toggle-btn" title="紧凑文件列表视图">
                    <svg viewBox="0 0 16 16"><rect x="1" y="2" width="14" height="2.5" rx="0.5"/><rect x="1" y="6.75" width="14" height="2.5" rx="0.5"/><rect x="1" y="11.5" width="14" height="2.5" rx="0.5"/></svg>
                </div>
                <div id="btnRefreshGallery" class="c3ds-view-toggle-btn" title="重新检测并刷新画廊文件（支持外接U盘/硬盘热重载）">
                    <svg viewBox="0 0 16 16"><path d="M13.65 2.35A7.958 7.958 0 0 0 8 0a8 8 0 1 0 8 8h-2a6 6 0 1 1-1.76-4.24L10 6h6V0l-2.35 2.35z"/></svg>
                </div>
            </div>
            <div style="display:flex;align-items:center;gap:3px;flex-shrink:0;margin-left:10px;">
                <span id="btnSelectAll" style="display:none;font-size:9.5px;color:#777;cursor:pointer;padding:1px 2px;border-radius:2px;background:transparent;border:none;white-space:nowrap;flex-shrink:0;transition:all 0.15s ease;" title="全选当前画廊全部图片">全选</span>
                <span id="btnDeselectAll" style="display:none;font-size:9.5px;color:#777;cursor:pointer;padding:1px 2px;border-radius:2px;background:transparent;border:none;white-space:nowrap;flex-shrink:0;transition:all 0.15s ease;" title="取消当前全部勾选">脱选</span>
                <span id="btnOrderMode" style="display:none;font-size:9.5px;cursor:pointer;padding:1px 2px;border-radius:2px;background:transparent;border:none;white-space:nowrap;flex-shrink:0;transition:all 0.15s ease;">固定序号</span>
                <div id="btnClearGallery" style="font-size:9.5px;color:#777;cursor:pointer;padding:1px 2px;border-radius:2px;white-space:nowrap;flex-shrink:0;transition:all 0.15s ease;" title="清空当前画廊内的全部图片">清空</div>
            </div>
        </div>
        <div id="btnFlowWrap" style="display:none;align-items:center;flex-shrink:0;margin-left:auto;">
            <button id="btnToggleFlow" type="button" class="c3ds-top-flow-btn">List 列表</button>
        </div>
    `;

    const btnFlowWrap = galleryTopBar.querySelector("#btnFlowWrap");
    const btnToggleFlow = galleryTopBar.querySelector("#btnToggleFlow");
    const btnOrderMode = galleryTopBar.querySelector("#btnOrderMode");
    const btnModeGrid = galleryTopBar.querySelector("#btnModeGrid");
    const btnModeList = galleryTopBar.querySelector("#btnModeList");
    const btnRefreshGallery = galleryTopBar.querySelector("#btnRefreshGallery");
    const btnSelectAll = galleryTopBar.querySelector("#btnSelectAll");
    const btnDeselectAll = galleryTopBar.querySelector("#btnDeselectAll");

    const updateFlowBtnUI = () => {
        const isBatch = (node.properties.c3ds_flow === "Batch");
        btnToggleFlow.innerText = isBatch ? "批量合并" : "List 列表";
        btnToggleFlow.title = isBatch
            ? "【流转模式: 批量合并】点击切换为 List 列表模式\n当前：将所有勾选图片合并为单批次张量 (Batch Tensor) 一次性输出"
            : "【流转模式: List 列表】点击切换为批量合并模式\n当前：按序号一张一张分别输出到下游节点执行";
    };

    btnToggleFlow.onclick = (e) => {
        e.stopPropagation();
        node.properties.c3ds_flow = (node.properties.c3ds_flow === "Batch") ? "List" : "Batch";
        updateFlowBtnUI();
        syncWidgetValues();
        updateHudText();
        node.setDirtyCanvas(true, true);
    };

    const updateOrderModeBtnUI = () => {
        const isFixed = (node.properties.order_assign_mode !== "fill");
        btnOrderMode.innerText = isFixed ? "固定序号" : "补位序号";
        btnOrderMode.style.color = isFixed ? "#e58b8b" : "#86efac";
        btnOrderMode.title = isFixed
            ? "【当前：固定序号】点击切换为 补位序号\n特性：退选某图后该位次空出，其余编号不动；新点选图自动填补最小空缺，完美保护下游 1~9 端口固定连线！"
            : "【当前：补位序号】点击切换为 固定序号\n特性：退选某图后后续编号自动向前平移补齐（自愈），适合纯列表序列排队任务。";
    };

    btnOrderMode.onmouseenter = () => { btnOrderMode.style.background = "#241f1f"; };
    btnOrderMode.onmouseleave = () => { btnOrderMode.style.background = "transparent"; };

    btnOrderMode.onclick = (e) => {
        e.stopPropagation();
        const cur = node.properties.order_assign_mode || "fixed";
        node.properties.order_assign_mode = (cur === "fixed") ? "fill" : "fixed";

        if (node.properties.order_assign_mode === "fixed") {
            const list = node.properties.batch_checked_ids || [];
            node.properties.slot_map = {};
            list.forEach((id, idx) => {
                node.properties.slot_map[id] = idx + 1;
            });
        }
        updateOrderModeBtnUI();
        syncWidgetValues();
        updateCardSelectionState();
        node.setDirtyCanvas(true, true);
    };

    if (btnRefreshGallery) {
        btnRefreshGallery.onclick = (e) => {
            e.stopPropagation();
            const pool = node.properties.pool || [];
            pool.forEach(it => {
                delete it._missing;
                const p = it.edited_path || it.path;
                const n = it.edited_name || it.name;
                delete IMAGE_META_CACHE[`${p}/${n}`];
            });
            renderGallery();
            updateFocusImage();
            updateHudText();
            node.setDirtyCanvas(true, true);
        };
    }

    if (btnSelectAll) {
        btnSelectAll.onmouseenter = () => { btnSelectAll.style.color = "#e5b9b9"; btnSelectAll.style.background = "#221c1c"; };
        btnSelectAll.onmouseleave = () => { btnSelectAll.style.color = "#777"; btnSelectAll.style.background = "transparent"; };
        btnSelectAll.onclick = (e) => {
            e.stopPropagation();
            const pool = node.properties.pool || [];
            const validItems = pool.filter(it => !it._missing);
            const validIds = validItems.map(it => it.id);
            const currentChecked = node.properties.batch_checked_ids || [];

            const isAllSelected = validIds.length > 0 && validIds.every(id => currentChecked.includes(id));
            if (isAllSelected) {
                if (node._c3ds_before_select_all !== undefined) {
                    node.properties.batch_checked_ids = [...node._c3ds_before_select_all];
                } else {
                    node.properties.batch_checked_ids = [];
                }
            } else {
                node._c3ds_before_select_all = [...currentChecked];
                node.properties.batch_checked_ids = [...validIds];
            }

            node.properties.slot_map = {};
            node.properties.batch_checked_ids.forEach((id, idx) => {
                node.properties.slot_map[id] = idx + 1;
            });

            syncWidgetValues();
            updateCardSelectionState();
            updateHudText();
            node.setDirtyCanvas(true, true);
        };
    }

    if (btnDeselectAll) {
        btnDeselectAll.onmouseenter = () => { btnDeselectAll.style.color = "#e5b9b9"; btnDeselectAll.style.background = "#221c1c"; };
        btnDeselectAll.onmouseleave = () => { btnDeselectAll.style.color = "#777"; btnDeselectAll.style.background = "transparent"; };
        btnDeselectAll.onclick = (e) => {
            e.stopPropagation();
            const currentChecked = node.properties.batch_checked_ids || [];

            if (currentChecked.length === 0) {
                if (node._c3ds_before_deselect_all && node._c3ds_before_deselect_all.length > 0) {
                    node.properties.batch_checked_ids = [...node._c3ds_before_deselect_all];
                    node.properties.slot_map = {};
                    node.properties.batch_checked_ids.forEach((id, idx) => {
                        node.properties.slot_map[id] = idx + 1;
                    });
                    node._c3ds_before_deselect_all = null;
                }
            } else {
                node._c3ds_before_deselect_all = [...currentChecked];
                node.properties.batch_checked_ids = [];
                node.properties.slot_map = {};
            }

            syncWidgetValues();
            updateCardSelectionState();
            updateHudText();
            node.setDirtyCanvas(true, true);
        };
    }

    const updateViewModeUI = () => {
        const isList = (node.properties.gallery_view_mode === "list");
        btnModeGrid.classList.toggle("active", !isList);
        btnModeList.classList.toggle("active", isList);
        galleryScroll.classList.toggle("mode-grid", !isList);
        galleryScroll.classList.toggle("mode-list", isList);
    };

    btnModeGrid.onclick = (e) => {
        e.stopPropagation();
        if (node.properties.gallery_view_mode === "grid") return;
        node.properties.gallery_view_mode = "grid";
        updateViewModeUI();
        renderGallery();
    };

    btnModeList.onclick = (e) => {
        e.stopPropagation();
        if (node.properties.gallery_view_mode === "list") return;
        node.properties.gallery_view_mode = "list";
        updateViewModeUI();
        renderGallery();
    };

    const confirmClearModal = document.createElement("div");
    confirmClearModal.style.cssText = "position:absolute;inset:0;background:rgba(18,18,18,0.95);backdrop-filter:blur(6px);z-index:9999;display:none;align-items:center;justify-content:center;flex-direction:column;gap:10px;box-sizing:border-box;pointer-events:auto;";
    confirmClearModal.innerHTML = `
        <div style="font-size:22px;line-height:1;">🗑</div>
        <div style="font-size:12px;color:#fca5a5;font-weight:600;letter-spacing:0.5px;">确定清空画廊中的全部图片吗？</div>
        <div style="font-size:10px;color:#888;">此操作将移除素材池中的所有图片引用</div>
        <div style="display:flex;gap:10px;margin-top:4px;">
            <button id="btnConfirmClearYes" type="button" style="background:#b91c1c;color:#fff;border:none;padding:3px 12px;cursor:pointer;font-size:11px;border-radius:2px;font-weight:600;transition:background 0.15s ease;" title="确认清空全部图片">确认清空</button>
            <button id="btnConfirmClearNo" type="button" style="background:#2a2a2a;color:#ccc;border:1px solid #444;padding:3px 12px;cursor:pointer;font-size:11px;border-radius:2px;transition:all 0.15s ease;" title="取消操作">取消</button>
        </div>
    `;

    const btnClearGallery = galleryTopBar.querySelector("#btnClearGallery");
    btnClearGallery.onmouseenter = () => { btnClearGallery.style.color = "#f87171"; btnClearGallery.style.background = "#2a2222"; };
    btnClearGallery.onmouseleave = () => { btnClearGallery.style.color = "#777"; btnClearGallery.style.background = "transparent"; };
    btnClearGallery.onclick = (e) => {
        e.stopPropagation();
        const pool = node.properties.pool || [];
        if (pool.length === 0) return;
        confirmClearModal.style.display = "flex";
    };

    confirmClearModal.querySelector("#btnConfirmClearNo").onclick = (e) => {
        e.stopPropagation();
        confirmClearModal.style.display = "none";
    };

    confirmClearModal.querySelector("#btnConfirmClearYes").onclick = (e) => {
        e.stopPropagation();
        confirmClearModal.style.display = "none";
        node.properties.pool = [];
        node.properties.batch_checked_ids = [];
        node.properties.slot_map = {};
        node.properties.batch_remove_ids = [];
        node.isBatchRemoveMode = false;
        node._last_active_idx = 0;
        node._preview_focus_idx = 0;
        node.properties.c3ds_preview_idx = 0;
        const selW = getWidget("selected_index");
        if (selW) selW.value = 0;
        syncWidgetValues();
        renderGallery();
        updateFocusImage();
        updateHudText();
        node.setDirtyCanvas(true, true);
    };

    galleryViewWrap.appendChild(galleryTopBar);
    galleryViewWrap.appendChild(confirmClearModal);

    const galleryScroll = document.createElement("div");
    galleryScroll.className = "c3ds-gallery-scroll mode-grid";
    galleryViewWrap.appendChild(galleryScroll);

    const batchRemoveBar = document.createElement("div");
    batchRemoveBar.style.cssText = "width:100%;height:24px;background:#1a1414;border-top:1px solid #3d2424;display:none;align-items:center;justify-content:space-between;padding:0 8px;box-sizing:border-box;flex-shrink:0;user-select:none;";
    batchRemoveBar.innerHTML = `
        <span id="batchRemText" style="font-size:10px;color:#e58b8b;font-weight:500;">已选 0 张待移除</span>
        <div style="display:flex;gap:5px;">
            <button id="btnRemOk" type="button" style="background:#7b2c2c;color:#fff;border:1px solid #944444;padding:1.5px 7px;cursor:pointer;font-size:9.5px;border-radius:2px;font-weight:500;transition:all 0.15s ease;" title="确认移除所有已选中的待删除图片">确认移除</button>
            <button id="btnRemCancel" type="button" style="background:transparent;color:#888;border:1px solid #3d3d3d;padding:1.5px 6px;cursor:pointer;font-size:9.5px;border-radius:2px;transition:all 0.15s ease;" title="退出批量移除模式">取消</button>
        </div>
    `;
    galleryViewWrap.appendChild(batchRemoveBar);

    const btnRemOkEl = batchRemoveBar.querySelector("#btnRemOk");
    btnRemOkEl.onmouseenter = () => { btnRemOkEl.style.background = "#8f3434"; btnRemOkEl.style.borderColor = "#a84b4b"; };
    btnRemOkEl.onmouseleave = () => { btnRemOkEl.style.background = "#7b2c2c"; btnRemOkEl.style.borderColor = "#944444"; };

    const btnRemCancelEl = batchRemoveBar.querySelector("#btnRemCancel");
    btnRemCancelEl.onmouseenter = () => { btnRemCancelEl.style.color = "#ddd"; btnRemCancelEl.style.borderColor = "#555"; btnRemCancelEl.style.background = "#262626"; };
    btnRemCancelEl.onmouseleave = () => { btnRemCancelEl.style.color = "#888"; btnRemCancelEl.style.borderColor = "#3d3d3d"; btnRemCancelEl.style.background = "transparent"; };

    btnRemOkEl.onclick = (e) => {
        e.stopPropagation();
        const rem = new Set(node.properties.batch_remove_ids || []);
        node.properties.pool = (node.properties.pool || []).filter(it => !rem.has(it.id));
        node.properties.batch_checked_ids = (node.properties.batch_checked_ids || []).filter(id => !rem.has(id));
        if (node.properties.slot_map) {
            rem.forEach(id => delete node.properties.slot_map[id]);
        }
        node.properties.batch_remove_ids = [];
        node.isBatchRemoveMode = false;
        batchRemoveBar.style.display = "none";
        node._last_active_idx = 0;
        node._preview_focus_idx = 0;
        node.properties.c3ds_preview_idx = 0;
        syncWidgetValues();
        renderGallery();
        updateFocusImage();
        updateHudText();
        node.setDirtyCanvas(true, true);
    };

    batchRemoveBar.querySelector("#btnRemCancel").onclick = (e) => {
        e.stopPropagation();
        node.isBatchRemoveMode = false;
        node.properties.batch_remove_ids = [];
        batchRemoveBar.style.display = "none";
        updateCardSelectionState();
    };

    const focusContainer = document.createElement("div");
    focusContainer.style.cssText = "width:100%;height:100%;display:none;position:relative;flex-direction:column;background:#242424;overflow:hidden;transition:background-color 0.15s ease;";

    const focusImgWrap = document.createElement("div");
    focusImgWrap.style.cssText = "width:100%;flex:1;min-height:0;position:relative;display:flex;align-items:center;justify-content:center;overflow:hidden;background:#242424;transition:background-color 0.15s ease;";

    const floatBtnGroup = document.createElement("div");
    floatBtnGroup.className = "c3ds-float-btn-group";
    floatBtnGroup.innerHTML = `
        <button id="btnFloatSave" class="c3ds-float-btn c3ds-float-save" title="保存修改并生成副本图像">✔ 保存副本</button>
        <button id="btnFloatReset" class="c3ds-float-btn c3ds-float-reset" title="撤销还原所有编辑修改">↺ 还原</button>
        <button id="btnFloatCancel" class="c3ds-float-btn c3ds-float-cancel" title="退出编辑并放弃所有未保存修改">✕ 取消</button>
    `;
    focusImgWrap.appendChild(floatBtnGroup);

    const btnFloatSave = floatBtnGroup.querySelector("#btnFloatSave");
    const btnFloatReset = floatBtnGroup.querySelector("#btnFloatReset");
    const btnFloatCancel = floatBtnGroup.querySelector("#btnFloatCancel");

    const innerStage = document.createElement("div");
    innerStage.style.cssText = "position:relative;display:flex;align-items:center;justify-content:center;box-sizing:border-box;user-select:none;flex-shrink:0;";

    const stageCanvas = document.createElement("canvas");
    stageCanvas.style.cssText = "display:block;width:100%;height:100%;user-select:none;cursor:pointer;";
    stageCanvas.title = "双击大图返回画廊";
    innerStage.appendChild(stageCanvas);

    const cropOverlay = document.createElement("div");
    cropOverlay.style.cssText = "position:absolute;inset:0;display:none;pointer-events:none;box-sizing:border-box;";
    cropOverlay.innerHTML = `
        <div id="c3dsCropBox" style="position:absolute;border:1px dashed #48bb78;box-shadow:0 0 0 9999px rgba(0,0,0,0.68);box-sizing:border-box;cursor:move;pointer-events:auto;">
            <div style="position:absolute;top:33.3%;left:0;right:0;border-top:1px dotted rgba(255,255,255,0.45);pointer-events:none;"></div>
            <div style="position:absolute;top:66.6%;left:0;right:0;border-top:1px dotted rgba(255,255,255,0.45);pointer-events:none;"></div>
            <div style="position:absolute;left:33.3%;top:0;bottom:0;border-left:1px dotted rgba(255,255,255,0.45);pointer-events:none;"></div>
            <div style="position:absolute;left:66.6%;top:0;bottom:0;border-left:1px dotted rgba(255,255,255,0.45);pointer-events:none;"></div>
            <div class="c3ds-handle" data-dir="nw" style="left:-4px;top:-4px;cursor:nwse-resize;"></div>
            <div class="c3ds-handle" data-dir="ne" style="right:-4px;top:-4px;cursor:nesw-resize;"></div>
            <div class="c3ds-handle" data-dir="se" style="right:-4px;bottom:-4px;cursor:nwse-resize;"></div>
            <div class="c3ds-handle" data-dir="sw" style="left:-4px;bottom:-4px;cursor:nesw-resize;"></div>
            <div class="c3ds-handle" data-dir="n" style="left:50%;margin-left:-4px;top:-4px;cursor:ns-resize;"></div>
            <div class="c3ds-handle" data-dir="s" style="left:50%;margin-left:-4px;bottom:-4px;cursor:ns-resize;"></div>
            <div class="c3ds-handle" data-dir="w" style="top:50%;margin-top:-4px;left:-4px;cursor:ew-resize;"></div>
            <div class="c3ds-handle" data-dir="e" style="top:50%;margin-top:-4px;right:-4px;cursor:ew-resize;"></div>
        </div>
    `;
    innerStage.appendChild(cropOverlay);
    focusImgWrap.appendChild(innerStage);
    const cropBoxEl = cropOverlay.querySelector("#c3dsCropBox");

    const arrowLeft = document.createElement("div");
    arrowLeft.innerText = "◀";
    arrowLeft.title = "切换至上一张图片";
    arrowLeft.style.cssText = "position:absolute;left:4px;top:50%;transform:translateY(-50%);background:rgba(0,0,0,0.65);color:#fff;width:24px;height:42px;display:flex;align-items:center;justify-content:center;cursor:pointer;opacity:0.6;z-index:15;font-size:13px;";
    arrowLeft.onclick = (e) => { e.stopPropagation(); stepImage(-1); };

    const arrowRight = document.createElement("div");
    arrowRight.innerText = "▶";
    arrowRight.title = "切换至下一张图片";
    arrowRight.style.cssText = "position:absolute;right:4px;top:50%;transform:translateY(-50%);background:rgba(0,0,0,0.65);color:#fff;width:24px;height:42px;display:flex;align-items:center;justify-content:center;cursor:pointer;opacity:0.6;z-index:15;font-size:13px;";
    arrowRight.onclick = (e) => { e.stopPropagation(); stepImage(1); };

    focusImgWrap.appendChild(arrowLeft);
    focusImgWrap.appendChild(arrowRight);
    focusContainer.appendChild(focusImgWrap);

    stageCanvas.ondblclick = (e) => {
        e.stopPropagation();
        if (node.isCroppingActive) return;
        switchViewMode(false);
    };

    const barTools = document.createElement("div");
    barTools.style.cssText = "width:100%;height:26px;min-height:26px;background:rgba(18, 18, 18, 0.95);border-top:1px solid #282828;display:flex;align-items:center;justify-content:space-between;padding:0 8px;box-sizing:border-box;flex-shrink:0;z-index:12;";
    barTools.innerHTML = `
        <span id="btnFocusBack" style="cursor:pointer;display:inline-flex;align-items:center;justify-content:center;padding:2px 4px;border-radius:2px;flex-shrink:0;transition:all 0.15s ease;" title="返回画廊模式">
            <svg viewBox="0 0 16 16" style="width:13px;height:13px;fill:#e5b9b9;"><path d="M4.5 3.5a.5.5 0 0 1 .5.5v2.5a.5.5 0 0 0 .5.5h6.5a2.5 2.5 0 0 1 2.5 2.5v2.5a.5.5 0 0 1-1 0V9a1.5 1.5 0 0 0-1.5-1.5H5.5a.5.5 0 0 0-.5.5V10.5a.5.5 0 0 1-.854.354l-3-3a.5.5 0 0 1 0-.708l3-3a.5.5 0 0 1 .854.354z"/></svg>
        </span>
        <div id="ratioWrap" style="display:flex;align-items:center;gap:2px;overflow-x:auto;scrollbar-width:none;flex:1;min-width:0;margin:0 4px;"></div>
        <div style="display:flex;align-items:center;gap:6px;font-size:9.5px;color:#888;flex-shrink:0;">
            <span id="btnRot" style="cursor:pointer;transition:color 0.15s ease;" title="连续顺时针旋转 90 度">↺ 90°</span>
            <span id="btnFlipH" style="cursor:pointer;transition:color 0.15s ease;" title="水平翻转">⇄ 镜像</span>
        </div>
    `;

    const btnBackEl = barTools.querySelector("#btnFocusBack");
    btnBackEl.onmouseenter = () => { btnBackEl.style.background = "#2a2020"; };
    btnBackEl.onmouseleave = () => { btnBackEl.style.background = "transparent"; };

    const btnRotEl = barTools.querySelector("#btnRot");
    btnRotEl.onmouseenter = () => { btnRotEl.style.color = "#ccc"; };
    btnRotEl.onmouseleave = () => { btnRotEl.style.color = "#888"; };

    const btnFlipEl = barTools.querySelector("#btnFlipH");
    btnFlipEl.onmouseenter = () => { btnFlipEl.style.color = "#ccc"; };
    btnFlipEl.onmouseleave = () => { btnFlipEl.style.color = "#888"; };

    btnBackEl.onclick = () => {
        const it = getFocusItem();
        if (it) {
            it.rot = 0; it.flip_h = false; it.flip_v = false; it.crop = null; it.crop_ratio = "原图";
        }
        tempCropBox = null;
        node.isCroppingActive = false;
        cropOverlay.style.display = "none";
        floatBtnGroup.style.display = "none";
        switchViewMode(false);
    };

    const ratioWrap = barTools.querySelector("#ratioWrap");
    const ratios = ["原图", "自由", "1:1", "3:4", "4:3", "16:9", "9:16"];
    const ratioBtns = [];
    ratios.forEach(r => {
        const span = document.createElement("span");
        span.innerText = r;
        span.dataset.ratio = r;
        span.title = `按 ${r} 比例进入裁剪模式`;
        span.style.cssText = "font-size:9px;padding:1px 3px;cursor:pointer;color:#888;border-radius:2px;white-space:nowrap;flex-shrink:0;";
        span.onclick = (e) => {
            e.stopPropagation();
            selectCropRatio(r);
        };
        ratioWrap.appendChild(span);
        ratioBtns.push(span);
    });

    const btnRot = barTools.querySelector("#btnRot");
    const btnFlipH = barTools.querySelector("#btnFlipH");

    btnRot.onclick = () => {
        const it = getFocusItem();
        if (!it) return;
        it.rot = ((it.rot || 0) + 90) % 360;
        renderCanvasStage();
        floatBtnGroup.style.display = "flex";
    };

    btnFlipH.onclick = () => {
        const it = getFocusItem();
        if (!it) return;
        it.flip_h = !it.flip_h;
        renderCanvasStage();
        floatBtnGroup.style.display = "flex";
    };

    btnFloatSave.onclick = async () => {
        const it = getFocusItem();
        if (!it) return;

        btnFloatSave.innerText = "保存中...";
        try {
            const res = await api.fetchApi("/crazy3ds/save_edit", {
                method: "POST", headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    path: it.path, name: it.name, crop: it.crop, rot: it.rot || 0, flip_h: !!it.flip_h, flip_v: !!it.flip_v
                })
            });
            const data = await res.json();
            if (data.success) {
                it.rot = 0;
                it.flip_h = false;
                it.flip_v = false;
                it.crop = null;
                it.crop_ratio = "原图";

                const pool = node.properties.pool || [];
                const newCopyItem = {
                    id: "c3ds_" + Date.now() + "_" + Math.random().toString(36).substr(2, 6),
                    path: data.edited_path,
                    name: data.edited_name,
                    edited_path: null,
                    edited_name: null,
                    crop: null,
                    crop_ratio: "原图",
                    rot: 0,
                    flip_h: false,
                    flip_v: false
                };

                const curIdx = pool.findIndex(p => p.id === it.id);
                if (curIdx >= 0) {
                    pool.splice(curIdx + 1, 0, newCopyItem);
                    node._preview_focus_idx = curIdx + 1;
                    node._last_active_idx = curIdx + 1;
                    node.properties.c3ds_preview_idx = curIdx + 1;
                    if (node.properties.c3ds_mode !== "Multi") {
                        const selW = getWidget("selected_index");
                        if (selW) selW.value = curIdx + 1;
                    }
                } else {
                    pool.push(newCopyItem);
                    node._preview_focus_idx = pool.length - 1;
                    node._last_active_idx = pool.length - 1;
                    node.properties.c3ds_preview_idx = pool.length - 1;
                    if (node.properties.c3ds_mode !== "Multi") {
                        const selW = getWidget("selected_index");
                        if (selW) selW.value = pool.length - 1;
                    }
                }

                tempCropBox = null;
                node.isCroppingActive = false;
                cropOverlay.style.display = "none";
                floatBtnGroup.style.display = "none";

                syncWidgetValues();
                updateFocusImage();
                renderGallery();
                updateHudText();
                node.setDirtyCanvas(true, true);
            }
        } catch (err) {
            console.error("Save edit failed:", err);
        } finally {
            btnFloatSave.innerText = "✔ 保存副本";
        }
    };

    btnFloatReset.onclick = () => {
        const it = getFocusItem();
        if (!it) return;
        it.rot = 0; it.flip_h = false; it.flip_v = false; it.crop = null; it.crop_ratio = "原图";
        tempCropBox = null;
        node.isCroppingActive = false;
        cropOverlay.style.display = "none";
        floatBtnGroup.style.display = "none";
        renderCanvasStage();
        updateHudText();
        node.setDirtyCanvas(true, true);
    };

    btnFloatCancel.onclick = () => {
        const it = getFocusItem();
        if (!it) return;
        it.rot = 0; it.flip_h = false; it.flip_v = false; it.crop = null; it.crop_ratio = "原图";
        tempCropBox = null;
        node.isCroppingActive = false;
        cropOverlay.style.display = "none";
        floatBtnGroup.style.display = "none";
        renderCanvasStage();
        updateHudText();
        node.setDirtyCanvas(true, true);
    };

    focusContainer.appendChild(barTools);
    viewMain.appendChild(galleryViewWrap);
    viewMain.appendChild(focusContainer);

    const directOverlay = document.createElement("div");
    directOverlay.className = "c3ds-direct-overlay";
    directOverlay.innerHTML = `
        <div style="font-size:26px;line-height:1;">🔒</div>
        <div style="font-size:12px;font-weight:bold;color:#fca5a5;letter-spacing:0.5px;">目录直出已接管</div>
        <div style="font-size:10px;color:#888;max-width:85%;line-height:1.4;">当前目录全量图片正直接从 images 端口输出<br>画廊选图与编辑已自动挂起</div>
        <button id="btnExitDirect" type="button" style="margin-top:6px;background:#242424;border:1px solid #444;color:#bbb;font-size:10.5px;padding:3px 10px;border-radius:2px;cursor:pointer;" title="退出目录直出，恢复画廊选图模式">✕ 恢复画廊选图模式</button>
    `;
    directOverlay.querySelector("#btnExitDirect").onclick = (e) => {
        e.stopPropagation();
        btnFolderDirect.click();
    };

    const privacyOverlay = document.createElement("div");
    privacyOverlay.className = "c3ds-privacy-overlay";
    privacyOverlay.innerHTML = `
        <div style="font-size:30px;line-height:1;margin-bottom:6px;">🙈</div>
        <div style="font-size:12.5px;font-weight:bold;color:#fca5a5;letter-spacing:0.5px;">屏幕防窥保护中</div>
        <div style="font-size:9.5px;color:#777;margin-top:4px;">（后台计算不受影响）</div>
    `;

    viewMain.appendChild(directOverlay);
    viewMain.appendChild(privacyOverlay);

    // ========================================================
    // 第 5 行：底部状态栏 HUD
    // ========================================================
    const barHud = document.createElement("div");
    barHud.className = "c3ds-hud";
    barHud.title = "状态信息：显示当前图片的名称、分辨率、体积及所在队列位置";
    barHud.innerHTML = `
        <div class="c3ds-hud-info">
            <span id="c3dsHudTitle" class="c3ds-hud-title">画廊当前未载入图片</span>
            <span id="c3dsHudSpecs" class="c3ds-hud-specs"></span>
        </div>
        <span id="c3dsHudCount" class="c3ds-hud-count">[0/0P]</span>
    `;
    const hudTitle = barHud.querySelector("#c3dsHudTitle");
    const hudSpecs = barHud.querySelector("#c3dsHudSpecs");
    const hudCount = barHud.querySelector("#c3dsHudCount");

    const updateHudText = () => {
        if (node.properties.folder_direct) {
            hudTitle.innerText = "整目录全量直出已接管";
            hudSpecs.innerText = "· images 统一输出目录全部素材";
            hudCount.innerText = "[直出]";
            return;
        }

        const pool = node.properties.pool || [];
        const total = pool.length;
        if (total === 0) {
            hudTitle.innerText = "画廊当前未载入图片";
            hudSpecs.innerText = "";
            hudCount.innerText = "0/0P";
            return;
        }

        const it = getFocusItem();
        const fname = it ? (it.edited_name || it.name) : "";
        const isMulti = (node.properties.c3ds_mode === "Multi");

        let curNum = 1;
        if (node.properties.is_focus_view && typeof node._preview_focus_idx === "number") {
            curNum = node._preview_focus_idx + 1;
        } else if (isMulti && typeof node._last_active_idx === "number") {
            curNum = node._last_active_idx + 1;
        } else {
            curNum = (getWidget("selected_index")?.value || 0) + 1;
        }

        hudTitle.innerText = fname;
        hudTitle.title = fname;

        if (isMulti) {
            if (node.properties.is_focus_view) {
                hudCount.innerText = `[查看 ${curNum}/${total}P]`;
            } else {
                const count = (node.properties.batch_checked_ids || []).length;
                const flowTag = (node.properties.c3ds_flow === "Batch") ? "批次" : "列表";
                hudCount.innerText = `[${flowTag} ${count}/${total}P]`;
            }
        } else {
            hudCount.innerText = `[${curNum}/${total}P]`;
        }

        if (!it) return;

        if (it._missing) {
            hudSpecs.innerText = "文件已丢失";
            return;
        }

        const targetP = it.edited_path || it.path;
        const targetN = it.edited_name || it.name;
        const cacheKey = `${targetP}/${targetN}`;

        // 优先快速显示旧缓存规格，但绝不终止向后端的真实探活
        if (IMAGE_META_CACHE[cacheKey]) {
            const m = IMAGE_META_CACHE[cacheKey];
            if (m.failed) {
                hudSpecs.innerText = "文件已丢失";
            } else {
                hudSpecs.innerText = `· ${m.width}×${m.height} · ${m.size} · ${m.format}`;
            }
        } else {
            hudSpecs.innerText = `· 读取中...`;
        }

        // 精准恢复自动感知：每次聚焦或检测均向后端轻量探活，文件被删立刻捕获 404
        api.fetchApi(`/crazy3ds/get_image_info?path=${encodeURIComponent(targetP)}&name=${encodeURIComponent(targetN)}&t=${Date.now()}`)
            .then(r => r.json())
            .then(d => {
                if (d.success) {
                    IMAGE_META_CACHE[cacheKey] = d;
                    const cur = getFocusItem();
                    if (cur && (cur.edited_name || cur.name) === targetN) {
                        hudSpecs.innerText = `· ${d.width}×${d.height} · ${d.size} · ${d.format}`;
                    }
                } else {
                    IMAGE_META_CACHE[cacheKey] = { failed: true };
                    it._missing = true;
                    updateCardSelectionState();
                    const cur = getFocusItem();
                    if (cur && (cur.edited_name || cur.name) === targetN) {
                        hudSpecs.innerText = "文件已丢失";
                    }
                }
            })
            .catch(() => {
                IMAGE_META_CACHE[cacheKey] = { failed: true };
                it._missing = true;
                updateCardSelectionState();
                hudSpecs.innerText = "文件已丢失";
            });
    };

    root.appendChild(barTarget);
    root.appendChild(barOpen);
    root.appendChild(barMode);
    root.appendChild(viewMain);
    root.appendChild(barHud);

    node.c3dsBars = { barTarget, barOpen, barMode, viewMain, barHud, focusContainer, focusImgWrap, galleryViewWrap, barTools, innerStage, directOverlay, privacyOverlay };

    let originalRawImage = null;

    const fitStageToContainer = () => {
        if (!originalRawImage) return;
        const it = getFocusItem();
        if (!it) return;

        const rot = it.rot || 0;
        const isRot90 = (rot === 90 || rot === 270);
        const srcW = isRot90 ? originalRawImage.height : originalRawImage.width;
        const srcH = isRot90 ? originalRawImage.width : originalRawImage.height;

        const availW = focusImgWrap.clientWidth;
        const availH = focusImgWrap.clientHeight;
        if (availW <= 4 || availH <= 4) return;

        const scale = Math.min(availW / srcW, availH / srcH);
        const displayW = Math.max(1, Math.round(srcW * scale));
        const displayH = Math.max(1, Math.round(srcH * scale));

        innerStage.style.width = displayW + "px";
        innerStage.style.height = displayH + "px";

        if (node.isCroppingActive && tempCropBox) {
            positionCropOverlay();
        }
    };

    const resizeObserver = new ResizeObserver(() => {
        fitStageToContainer();
    });
    resizeObserver.observe(focusImgWrap);

    const updateFocusImage = () => {
        const it = getFocusItem();
        if (!it) {
            stageCanvas.width = 10; stageCanvas.height = 10;
            return;
        }
        const img = new Image();
        img.crossOrigin = "anonymous";
        const loadP = it.edited_path || it.path;
        const loadN = it.edited_name || it.name;
        img.src = `/crazy3ds/get_preview?path=${encodeURIComponent(loadP)}&name=${encodeURIComponent(loadN)}&t=${Date.now()}`;
        img.onload = () => {
            originalRawImage = img;
            renderCanvasStage();
            updateHudText();
        };
    };

    const renderCanvasStage = () => {
        if (!originalRawImage) return;
        const it = getFocusItem();
        if (!it) return;

        const rot = it.rot || 0;
        const isRot90 = (rot === 90 || rot === 270);
        let srcW = isRot90 ? originalRawImage.height : originalRawImage.width;
        let srcH = isRot90 ? originalRawImage.width : originalRawImage.height;

        stageCanvas.width = srcW;
        stageCanvas.height = srcH;
        const ctx = stageCanvas.getContext("2d");
        ctx.clearRect(0, 0, srcW, srcH);

        ctx.save();
        ctx.translate(srcW / 2, srcH / 2);
        if (rot !== 0) ctx.rotate((rot * Math.PI) / 180);
        if (it.flip_h || it.flip_v) ctx.scale(it.flip_h ? -1 : 1, it.flip_v ? -1 : 1);
        ctx.drawImage(originalRawImage, -originalRawImage.width / 2, -originalRawImage.height / 2);
        ctx.restore();

        fitStageToContainer();

        const curRatio = it.crop_ratio || "原图";
        ratioBtns.forEach(b => {
            const act = (curRatio === b.dataset.ratio);
            b.style.color = act ? "#fff" : "#888";
            b.style.background = act ? "#7b3737" : "transparent";
        });

        const hasUnsavedChanges = (node.isCroppingActive && tempCropBox !== null) || (it.rot !== 0) || it.flip_h || it.flip_v;
        floatBtnGroup.style.display = hasUnsavedChanges ? "flex" : "none";
    };

    let tempCropBox = null;
    let selectedRatioStr = "原图";

    const selectCropRatio = (r) => {
        const it = getFocusItem();
        if (!it || !originalRawImage) return;

        selectedRatioStr = r;
        it.crop_ratio = r;

        if (r === "原图") {
            it.crop = null;
            tempCropBox = null;
            node.isCroppingActive = false;
            cropOverlay.style.display = "none";
            renderCanvasStage();
            return;
        }

        node.isCroppingActive = true;

        const rot = it.rot || 0;
        const isRot90 = (rot === 90 || rot === 270);
        const imgW = isRot90 ? originalRawImage.height : originalRawImage.width;
        const imgH = isRot90 ? originalRawImage.width : originalRawImage.height;
        const canvasR = imgW / imgH;

        let cx = 0.1, cy = 0.1, cw = 0.8, ch = 0.8;
        if (r !== "自由") {
            const parts = r.split(":").map(Number);
            const targetR = parts[0] / parts[1];
            const K = targetR / canvasR;
            if (K <= 1) {
                cw = K * 0.85; ch = 0.85;
            } else {
                ch = (1 / K) * 0.85; cw = 0.85;
            }
            cx = (1 - cw) / 2;
            cy = (1 - ch) / 2;
        }

        tempCropBox = [cx, cy, cw, ch];
        it.crop = [...tempCropBox];
        renderCanvasStage();
        positionCropOverlay();
        floatBtnGroup.style.display = "flex";
    };

    const positionCropOverlay = () => {
        if (!tempCropBox) return;
        cropOverlay.style.display = "block";
        cropBoxEl.style.left = (tempCropBox[0] * 100) + "%";
        cropBoxEl.style.top = (tempCropBox[1] * 100) + "%";
        cropBoxEl.style.width = (tempCropBox[2] * 100) + "%";
        cropBoxEl.style.height = (tempCropBox[3] * 100) + "%";
    };

    let dragDir = null;
    let startX = 0, startY = 0, initBox = null;

    cropBoxEl.addEventListener("pointerdown", (e) => {
        if (e.button !== 0) return;
        e.stopPropagation(); e.preventDefault();

        dragDir = e.target.dataset.dir || "move";
        startX = e.clientX; startY = e.clientY;
        initBox = [...tempCropBox];

        const onMove = (ev) => {
            if (!dragDir || !initBox) return;
            const rect = innerStage.getBoundingClientRect();
            if (rect.width <= 0 || rect.height <= 0) return;

            const dx = (ev.clientX - startX) / rect.width;
            const dy = (ev.clientY - startY) / rect.height;

            let [cx, cy, cw, ch] = initBox;

            if (dragDir === "move") {
                cx = Math.max(0, Math.min(1 - cw, cx + dx));
                cy = Math.max(0, Math.min(1 - ch, cy + dy));
            } else if (selectedRatioStr === "自由") {
                if (dragDir.includes("e")) cw = Math.max(0.05, Math.min(1 - cx, cw + dx));
                if (dragDir.includes("s")) ch = Math.max(0.05, Math.min(1 - cy, ch + dy));
                if (dragDir.includes("w")) {
                    const nw = Math.max(0.05, cw - dx);
                    if (cx + (cw - nw) >= 0) { cx += (cw - nw); cw = nw; }
                }
                if (dragDir.includes("n")) {
                    const nh = Math.max(0.05, ch - dy);
                    if (cy + (ch - nh) >= 0) { cy += (ch - nh); ch = nh; }
                }
            } else {
                const rot = (getFocusItem()?.rot || 0);
                const isRot90 = (rot === 90 || rot === 270);
                const imgW = isRot90 ? originalRawImage.height : originalRawImage.width;
                const imgH = isRot90 ? originalRawImage.width : originalRawImage.height;
                const canvasR = imgW / imgH;
                const parts = selectedRatioStr.split(":").map(Number);
                const targetR = parts[0] / parts[1];
                const K = targetR / canvasR;

                if (dragDir === "se" || dragDir === "e" || dragDir === "s") {
                    let nw = Math.max(0.05, Math.min(1 - cx, cw + dx));
                    let nh = nw / K;
                    if (cy + nh > 1) { nh = 1 - cy; nw = nh * K; }
                    cw = nw; ch = nh;
                } else if (dragDir === "nw") {
                    let nw = Math.max(0.05, Math.min(cx + cw, cw - dx));
                    let nh = nw / K;
                    if (cy + (ch - nh) < 0) { nh = cy + ch; nw = nh * K; }
                    cx += (cw - nw);
                    cy += (ch - nh);
                    cw = nw; ch = nh;
                } else if (dragDir === "ne" || dragDir === "n") {
                    let nw = Math.max(0.05, Math.min(1 - cx, cw + dx));
                    let nh = nw / K;
                    if (cy + (ch - nh) < 0) { nh = cy + ch; nw = nh * K; }
                    cy += (ch - nh);
                    cw = nw; ch = nh;
                } else if (dragDir === "sw" || dragDir === "w") {
                    let nw = Math.max(0.05, Math.min(cx + cw, cw - dx));
                    let nh = nw / K;
                    if (cy + nh > 1) { nh = 1 - cy; nw = nh * K; }
                    cx += (cw - nw);
                    cw = nw; ch = nh;
                }
            }

            tempCropBox = [cx, cy, cw, ch];
            const it = getFocusItem();
            if (it) it.crop = [...tempCropBox];
            positionCropOverlay();
        };

        const onUp = () => {
            dragDir = null; initBox = null;
            window.removeEventListener("pointermove", onMove);
            window.removeEventListener("pointerup", onUp);
        };

        window.addEventListener("pointermove", onMove);
        window.addEventListener("pointerup", onUp);
    });

    const switchViewMode = (toFocus) => {
        node.properties.is_focus_view = toFocus;
        if (toFocus) {
            galleryViewWrap.style.display = "none";
            focusContainer.style.display = "flex";
            updateFocusImage();
        } else {
            focusContainer.style.display = "none";
            galleryViewWrap.style.display = "flex";
            updateCardSelectionState();
        }
        syncWidgetValues();
        updateHudText();
        node.setDirtyCanvas(true, true);
    };
    node.c3dsSwitchViewMode = switchViewMode;

    const updateCardSelectionState = () => {
        const curIdx = getWidget("selected_index")?.value || 0;
        const isMulti = (node.properties.c3ds_mode === "Multi");
        const isRemoving = !!node.isBatchRemoveMode;
        const orderMap = getEffectiveOrderMap();
        const removeSet = new Set(node.properties.batch_remove_ids || []);
        const isList = (node.properties.gallery_view_mode === "list");

        if (isList) {
            const rows = galleryScroll.querySelectorAll(".c3ds-list-row");
            rows.forEach((row, idx) => {
                const it = (node.properties.pool || [])[idx];
                if (!it) return;

                const isCur = idx === curIdx;
                const orderNum = orderMap.get(it.id);
                const isChecked = orderNum !== undefined;
                const isMarkedDel = removeSet.has(it.id);

                const isMissing = !!it._missing;
                row.classList.toggle("selected", !isMulti && isCur && !isMissing);
                row.classList.toggle("checked", isMulti && isChecked && !isMissing);
                row.classList.toggle("marked-del", isRemoving && isMarkedDel);
                row.classList.toggle("c3ds-missing-disabled", isMissing && !isRemoving);
                row.style.opacity = (isMissing && !isRemoving) ? "0.65" : ((isMulti && !isChecked && !isRemoving) ? "0.6" : "1");

                const missingEl = row.querySelector(".c3ds-list-missing-tag");
                if (missingEl) {
                    missingEl.style.display = isMissing ? "inline-block" : "none";
                }

                const badge = row.querySelector(".c3ds-check-badge-list");
                if (badge) {
                    if (isRemoving) {
                        badge.style.display = "flex";
                        badge.style.color = isMarkedDel ? "#ef4444" : "#666";
                        badge.innerText = isMarkedDel ? "✕" : "○";
                    } else if (isMulti && !isMissing) {
                        badge.style.display = "flex";
                        badge.style.color = isChecked ? "#22c55e" : "#666";
                        badge.innerText = isChecked ? (orderNum > 99 ? ".." : String(orderNum)) : "○";
                    } else {
                        badge.style.display = "none";
                    }
                }
            });
        } else {
            const cards = galleryScroll.querySelectorAll(".c3ds-card");
            cards.forEach((card, idx) => {
                const it = (node.properties.pool || [])[idx];
                if (!it) return;

                const isCur = idx === curIdx;
                const orderNum = orderMap.get(it.id);
                const isChecked = orderNum !== undefined;
                const isMarkedDel = removeSet.has(it.id);

                const isMissing = !!it._missing;
                card.classList.toggle("selected", !isMulti && isCur && !isMissing);
                card.classList.toggle("checked", isMulti && isChecked && !isMissing);
                card.classList.toggle("marked-del", isRemoving && isMarkedDel);
                card.classList.toggle("c3ds-missing-disabled", isMissing && !isRemoving);
                card.style.opacity = (isMissing && !isRemoving) ? "0.65" : ((isMulti && !isChecked && !isRemoving) ? "0.55" : "1");

                const missingMark = card.querySelector(".c3ds-missing-mark");
                if (missingMark) {
                    missingMark.style.display = isMissing ? "flex" : "none";
                }

                const badge = card.querySelector(".c3ds-check-badge");
                if (badge) {
                    if (isRemoving) {
                        badge.style.display = "flex";
                        badge.style.background = isMarkedDel ? "#ef4444" : "rgba(0,0,0,0.7)";
                        badge.style.borderColor = isMarkedDel ? "#ef4444" : "#888";
                        badge.innerText = isMarkedDel ? "✕" : "";
                    } else if (isMulti && !isMissing) {
                        badge.style.display = "flex";
                        badge.style.background = isChecked ? "#22c55e" : "rgba(0,0,0,0.7)";
                        badge.style.borderColor = isChecked ? "#22c55e" : "#888";
                        badge.innerText = isChecked ? (orderNum > 99 ? ".." : String(orderNum)) : "";
                    } else {
                        badge.style.display = "none";
                    }
                }
            });
        }
    };

    const handleMultiItemToggle = (itemId) => {
        const isFixed = (node.properties.order_assign_mode !== "fill");
        let checkedList = [...(node.properties.batch_checked_ids || [])];
        node.properties.slot_map = node.properties.slot_map || {};

        const existIdx = checkedList.indexOf(itemId);

        if (existIdx >= 0) {
            checkedList.splice(existIdx, 1);
            delete node.properties.slot_map[itemId];
        } else {
            checkedList.push(itemId);
            if (isFixed) {
                const occupiedNumbers = new Set(Object.values(node.properties.slot_map));
                let candidate = 1;
                while (occupiedNumbers.has(candidate)) {
                    candidate++;
                }
                node.properties.slot_map[itemId] = candidate;
            }
        }

        node.properties.batch_checked_ids = checkedList;
    };

    const renderGallery = () => {
        galleryScroll.innerHTML = "";
        const pool = node.properties.pool || [];
        const curIdx = getWidget("selected_index")?.value || 0;
        const isMulti = (node.properties.c3ds_mode === "Multi");
        const isRemoving = !!node.isBatchRemoveMode;
        const isList = (node.properties.gallery_view_mode === "list");

        const orderMap = getEffectiveOrderMap();

        updateViewModeUI();

        if (isList) {
            pool.forEach((it, i) => {
                const row = document.createElement("div");
                row.className = "c3ds-list-row";
                const isCur = i === curIdx;
                const orderNum = orderMap.get(it.id);
                const isChecked = orderNum !== undefined;
                const isMarkedDel = (node.properties.batch_remove_ids || []).includes(it.id);

                if (isRemoving && isMarkedDel) row.classList.add("marked-del");
                else if (isMulti && isChecked) row.classList.add("checked");
                else if (!isMulti && isCur) row.classList.add("selected");

                if (isMulti && !isChecked && !isRemoving) row.style.opacity = "0.6";

                const readP = it.edited_path || it.path;
                const readN = it.edited_name || it.name;
                row.title = `${readN}\n路径: ${readP}\n单击：选择/切换此图\n双击：进入大图编辑模式`;

                const cacheKey = `${readP}/${readN}`;
                const meta = IMAGE_META_CACHE[cacheKey];
                const metaStr = meta ? `${meta.width}×${meta.height}` : "";

                const listBadgeText = isRemoving ? (isMarkedDel ? '✕' : '○') : (isChecked ? (orderNum > 99 ? '..' : String(orderNum)) : '○');

                row.innerHTML = `
                    <div class="c3ds-check-badge-list" style="font-size:11px;font-weight:bold;color:${isRemoving ? (isMarkedDel ? '#ef4444' : '#666') : (isChecked ? '#22c55e' : '#666')};display:${(isRemoving || isMulti) ? 'flex' : 'none'};width:14px;align-items:center;justify-content:center;flex-shrink:0;">${listBadgeText}</div>
                    <img class="c3ds-list-thumb" src="/crazy3ds/get_thumb?path=${encodeURIComponent(readP)}&name=${encodeURIComponent(readN)}" onerror="this.style.display='none';this.nextElementSibling.style.display='inline-block';" />
                    <span class="c3ds-list-missing-tag" style="display:${it._missing ? 'inline-block' : 'none'};background:#7b2c2c;color:#fca5a5;font-size:8.5px;padding:0 3px;border-radius:2px;flex-shrink:0;">丢失</span>
                    <span class="c3ds-list-name">[${i + 1}] ${readN}</span>
                    <span class="c3ds-list-specs">${metaStr}</span>
                    ${it.name.includes('_c3ds_edit') ? `<span style="background:#48bb78;color:#000;font-size:8px;font-weight:bold;padding:0 3px;border-radius:2px;flex-shrink:0;">副本</span>` : ''}
                    <div class="c3ds-single-del-list" style="color:#777;padding:0 4px;font-size:12px;display:${isRemoving ? 'none' : 'flex'};align-items:center;justify-content:center;flex-shrink:0;cursor:pointer;" title="从画廊中移除此项">×</div>
                `;

                const rowImg = row.querySelector("img");
                if (rowImg) {
                    rowImg.addEventListener("error", () => {
                        it._missing = true;
                        node.properties.batch_checked_ids = (node.properties.batch_checked_ids || []).filter(id => id !== it.id);
                        if (node.properties.slot_map) delete node.properties.slot_map[it.id];
                        updateCardSelectionState();
                        syncWidgetValues();
                        updateHudText();
                    });
                }

                const singleDelList = row.querySelector(".c3ds-single-del-list");
                if (singleDelList) {
                    singleDelList.onmouseenter = () => singleDelList.style.color = "#ef4444";
                    singleDelList.onmouseleave = () => singleDelList.style.color = "#777";
                    singleDelList.onclick = (e) => {
                        e.stopPropagation();
                        node.properties.pool = pool.filter(item => item.id !== it.id);
                        node.properties.batch_checked_ids = (node.properties.batch_checked_ids || []).filter(id => id !== it.id);
                        if (node.properties.slot_map) delete node.properties.slot_map[it.id];
                        node._last_active_idx = 0;
                        syncWidgetValues();
                        renderGallery();
                        updateFocusImage();
                        updateHudText();
                        node.setDirtyCanvas(true, true);
                    };
                }

                row.onclick = (e) => {
                    e.stopPropagation();
                    if (it._missing && !node.isBatchRemoveMode) return;
                    if (node.isBatchRemoveMode) {
                        let set = new Set(node.properties.batch_remove_ids || []);
                        if (set.has(it.id)) set.delete(it.id);
                        else set.add(it.id);
                        node.properties.batch_remove_ids = Array.from(set);
                        batchRemoveBar.querySelector("#batchRemText").innerText = `已选 ${set.size} 张待移除`;
                        updateCardSelectionState();
                        return;
                    }

                    const isMultiNow = (node.properties.c3ds_mode === "Multi");
                    node._last_active_idx = i;

                    if (!isMultiNow) {
                        const selW = getWidget("selected_index");
                        if (selW) selW.value = i;
                    } else {
                        handleMultiItemToggle(it.id);
                    }

                    syncWidgetValues();
                    updateCardSelectionState();
                    updateFocusImage();
                    updateHudText();
                    node.setDirtyCanvas(true, true);
                };

                row.ondblclick = (e) => {
                    e.stopPropagation();
                    if (it._missing || node.isBatchRemoveMode) return;
                    node._preview_focus_idx = i;
                    node._last_active_idx = i;
                    node.properties.c3ds_preview_idx = i;
                    if (node.properties.c3ds_mode !== "Multi") {
                        const selW = getWidget("selected_index");
                        if (selW) selW.value = i;
                        syncWidgetValues();
                    }
                    switchViewMode(true);
                };

                galleryScroll.appendChild(row);
            });

            const addRow = document.createElement("div");
            addRow.className = "c3ds-brick-list";
            addRow.title = "点击唤出系统窗口追加新图片";
            addRow.innerHTML = `<span>➕</span><span>追加图片文件...</span>`;
            addRow.onclick = (e) => {
                e.stopPropagation();
                invokeFileSelector((node.properties.load_paths || getGlobalLoadPaths())[node.properties.selected_idx || 0] || "");
            };
            galleryScroll.appendChild(addRow);

            if (pool.length > 0) {
                const remRow = document.createElement("div");
                remRow.className = "c3ds-brick-list";
                remRow.title = "开启批量挑图删除模式";
                remRow.innerHTML = `<span>➖</span><span>批量移除模式</span>`;
                remRow.onclick = (e) => {
                    e.stopPropagation();
                    node.isBatchRemoveMode = !node.isBatchRemoveMode;
                    node.properties.batch_remove_ids = [];
                    batchRemoveBar.style.display = node.isBatchRemoveMode ? "flex" : "none";
                    batchRemoveBar.querySelector("#batchRemText").innerText = `已选 0 张待移除`;
                    updateCardSelectionState();
                };
                galleryScroll.appendChild(remRow);
            }

        } else {
            pool.forEach((it, i) => {
                const card = document.createElement("div");
                card.className = "c3ds-card";
                const isCur = i === curIdx;
                const orderNum = orderMap.get(it.id);
                const isChecked = orderNum !== undefined;
                const isMarkedDel = (node.properties.batch_remove_ids || []).includes(it.id);

                if (isRemoving && isMarkedDel) card.classList.add("marked-del");
                else if (isMulti && isChecked) card.classList.add("checked");
                else if (!isMulti && isCur) card.classList.add("selected");

                if (isMulti && !isChecked && !isRemoving) card.style.opacity = "0.55";

                const readP = it.edited_path || it.path;
                const readN = it.edited_name || it.name;
                card.title = `${readN}\n路径: ${readP}\n单击：选择/切换此图\n双击：进入大图编辑模式`;

                const gridBadgeText = isRemoving ? (isMarkedDel ? '✕' : '') : (isChecked ? (orderNum > 99 ? '..' : String(orderNum)) : '');

                card.innerHTML = `
                    <img src="/crazy3ds/get_thumb?path=${encodeURIComponent(readP)}&name=${encodeURIComponent(readN)}" onerror="this.style.display='none';this.nextElementSibling.style.display='flex';this.closest('.c3ds-card').classList.add('c3ds-item-missing');" />
                    <div class="c3ds-missing-mark" style="position:absolute;inset:0;display:${it._missing ? 'flex' : 'none'};flex-direction:column;align-items:center;justify-content:center;background:rgba(28,16,16,0.92);pointer-events:none;gap:3px;z-index:1;"><span style="font-size:15px;line-height:1;">⚠️</span><span style="font-size:9px;color:#fca5a5;font-weight:bold;letter-spacing:0.5px;">文件已丢失</span></div>
                    <div class="c3ds-check-badge" style="position:absolute;top:2px;right:2px;width:15px;height:15px;border-radius:50%;background:${isRemoving ? (isMarkedDel ? '#ef4444' : 'rgba(0,0,0,0.7)') : (isChecked ? '#22c55e' : 'rgba(0,0,0,0.7)')};border:1px solid ${isRemoving ? (isMarkedDel ? '#ef4444' : '#888') : (isChecked ? '#22c55e' : '#888')};display:${(isRemoving || isMulti) ? 'flex' : 'none'};align-items:center;justify-content:center;color:#fff;font-size:9px;font-weight:bold;z-index:2;line-height:1;">${gridBadgeText}</div>
                    <div class="c3ds-single-del" style="display:${isRemoving ? 'none' : 'flex'};" title="从画廊中移除此图片">×</div>
                    ${it.name.includes('_c3ds_edit') ? `<div style="position:absolute;bottom:2px;left:2px;background:#48bb78;color:#000;font-size:8px;font-weight:bold;padding:0 3px;border-radius:2px;z-index:2;">副本</div>` : ''}
                `;

                const cardImg = card.querySelector("img");
                if (cardImg) {
                    cardImg.addEventListener("error", () => {
                        it._missing = true;
                        node.properties.batch_checked_ids = (node.properties.batch_checked_ids || []).filter(id => id !== it.id);
                        if (node.properties.slot_map) delete node.properties.slot_map[it.id];
                        updateCardSelectionState();
                        syncWidgetValues();
                        updateHudText();
                    });
                }

                const singleDel = card.querySelector(".c3ds-single-del");
                if (singleDel) {
                    singleDel.onclick = (e) => {
                        e.stopPropagation();
                        node.properties.pool = pool.filter(item => item.id !== it.id);
                        node.properties.batch_checked_ids = (node.properties.batch_checked_ids || []).filter(id => id !== it.id);
                        if (node.properties.slot_map) delete node.properties.slot_map[it.id];
                        node._last_active_idx = 0;
                        syncWidgetValues();
                        renderGallery();
                        updateFocusImage();
                        updateHudText();
                        node.setDirtyCanvas(true, true);
                    };
                }

                card.onclick = (e) => {
                    e.stopPropagation();
                    if (it._missing && !node.isBatchRemoveMode) return;
                    if (node.isBatchRemoveMode) {
                        let set = new Set(node.properties.batch_remove_ids || []);
                        if (set.has(it.id)) set.delete(it.id);
                        else set.add(it.id);
                        node.properties.batch_remove_ids = Array.from(set);
                        batchRemoveBar.querySelector("#batchRemText").innerText = `已选 ${set.size} 张待移除`;
                        updateCardSelectionState();
                        return;
                    }

                    const isMultiNow = (node.properties.c3ds_mode === "Multi");
                    node._last_active_idx = i;

                    if (!isMultiNow) {
                        const selW = getWidget("selected_index");
                        if (selW) selW.value = i;
                    } else {
                        handleMultiItemToggle(it.id);
                    }

                    syncWidgetValues();
                    updateCardSelectionState();
                    updateFocusImage();
                    updateHudText();
                    node.setDirtyCanvas(true, true);
                };

                card.ondblclick = (e) => {
                    e.stopPropagation();
                    if (it._missing || node.isBatchRemoveMode) return;
                    node._preview_focus_idx = i;
                    node._last_active_idx = i;
                    node.properties.c3ds_preview_idx = i;
                    if (node.properties.c3ds_mode !== "Multi") {
                        const selW = getWidget("selected_index");
                        if (selW) selW.value = i;
                        syncWidgetValues();
                    }
                    switchViewMode(true);
                };

                galleryScroll.appendChild(card);
            });

            const addBrick = document.createElement("div");
            addBrick.className = "c3ds-brick";
            addBrick.title = "点击唤出[第一栏中选定路径]的系统窗口追加新图片";
            addBrick.innerHTML = `<span style="font-size:16px;line-height:1;">+</span><span>追加图片</span>`;
            addBrick.onclick = (e) => {
                e.stopPropagation();
                invokeFileSelector((node.properties.load_paths || getGlobalLoadPaths())[node.properties.selected_idx || 0] || "");
            };
            galleryScroll.appendChild(addBrick);

            if (pool.length > 0) {
                const remBrick = document.createElement("div");
                remBrick.className = "c3ds-brick";
                remBrick.title = "开启批量挑图删除模式";
                remBrick.innerHTML = `<span style="font-size:16px;line-height:1;">-</span><span>批量移除</span>`;
                remBrick.onclick = (e) => {
                    e.stopPropagation();
                    node.isBatchRemoveMode = !node.isBatchRemoveMode;
                    node.properties.batch_remove_ids = [];
                    batchRemoveBar.style.display = node.isBatchRemoveMode ? "flex" : "none";
                    batchRemoveBar.querySelector("#batchRemText").innerText = `已选 0 张待移除`;
                    updateCardSelectionState();
                };
                galleryScroll.appendChild(remBrick);
            }
        }
    };

    const stepImage = (delta) => {
        const pool = node.properties.pool || [];
        if (!pool.length) return;

        if (node.properties.is_focus_view) {
            let base = (typeof node._preview_focus_idx === "number") ? node._preview_focus_idx : (getWidget("selected_index")?.value || 0);
            let nextIdx = (base + delta) % pool.length;
            if (nextIdx < 0) nextIdx = pool.length - 1;
            node._preview_focus_idx = nextIdx;
            node._last_active_idx = nextIdx;
            node.properties.c3ds_preview_idx = nextIdx;

            if (node.properties.c3ds_mode !== "Multi") {
                const selW = getWidget("selected_index");
                if (selW) selW.value = nextIdx;
                syncWidgetValues();
            }
        } else {
            const curIdx = getWidget("selected_index")?.value || 0;
            let nextIdx = (curIdx + delta) % pool.length;
            if (nextIdx < 0) nextIdx = pool.length - 1;
            node._last_active_idx = nextIdx;

            const selW = getWidget("selected_index");
            if (selW) selW.value = nextIdx;
            syncWidgetValues();
            updateCardSelectionState();
        }

        updateFocusImage();
        updateHudText();
        node.setDirtyCanvas(true, true);
    };

    const domWidget = node.addDOMWidget("c3ds_loader_panel", "control_panel", root, {
        serialize: false,
        hideOnZoom: false
    });
    node.c3dsDomWidget = domWidget;

    domWidget.computeSize = () => [0, -4];

    node.c3dsRefreshAll = () => {
        renderDropdown();
        updateModeUI();
        updateOverlayUI();
        syncWidgetValues();
        renderGallery();
        updateFocusImage();
        updateHudText();
    };

    node.c3dsRefreshAll();
    syncNodeGalleryColor(node);
    setTimeout(() => updateDomDimensions(node), 10);
}

const COLLAPSE_PARAM_DELTA = 90;

function applyLoaderCollapse(node, isCollapsed) {
    if (node._c3ds_resizing_internal) return;
    node._c3ds_resizing_internal = true;

    node.isCollapsedParams = isCollapsed;
    node.properties = node.properties || {};
    node.properties.is_collapsed_params = isCollapsed;

    if (node.c3dsBars) {
        const d = isCollapsed ? "none" : "flex";
        node.c3dsBars.barTarget.style.display = d;
        node.c3dsBars.barOpen.style.display = d;
        node.c3dsBars.barMode.style.display = d;
        node.c3dsBars.viewMain.style.display = "flex";
        node.c3dsBars.barHud.style.display = "flex";
    }

    const curW = node.size ? node.size[0] : 360;
    const curH = node.size ? node.size[1] : 330;

    if (isCollapsed) {
        node.setSize([curW, Math.max(160, curH - COLLAPSE_PARAM_DELTA)]);
    } else {
        node.setSize([curW, curH + COLLAPSE_PARAM_DELTA]);
    }

    updateDomDimensions(node);
    if (node.c3dsUpdateOverlays) node.c3dsUpdateOverlays();
    node.setDirtyCanvas(true, true);
    node._c3ds_resizing_internal = false;
}

app.registerExtension({
    name: "Crazy3DS.PureImageLoader.Suite",
    async beforeRegisterNodeDef(nodeType, nodeData, app) {
        if (nodeData.name !== "Crazy3DS_LoadImage") return;

        const origCreated = nodeType.prototype.onNodeCreated;
        nodeType.prototype.onNodeCreated = function () {
            const r = origCreated ? origCreated.apply(this, arguments) : undefined;
            this.setSize([360, 330]);
            setupLoaderPanel(this);
            return r;
        };

        const origConfigure = nodeType.prototype.onConfigure;
        nodeType.prototype.onConfigure = function (info) {
            const r = origConfigure ? origConfigure.apply(this, arguments) : undefined;
            
            if (this.properties?.c3ds_pool) {
                this.properties.pool = [...this.properties.c3ds_pool];
            }
            if (typeof this.properties?.c3ds_selected_idx === "number") {
                const selW = this.widgets?.find(w => w.name === "selected_index");
                if (selW) selW.value = this.properties.c3ds_selected_idx;
            }
            if (typeof this.properties?.c3ds_path_idx === "number") {
                this.properties.selected_idx = this.properties.c3ds_path_idx;
            }
            if (this.properties?.c3ds_batch_checked_ids) {
                this.properties.batch_checked_ids = [...this.properties.c3ds_batch_checked_ids];
            }
            if (this.properties?.order_assign_mode) {
                this.properties.order_assign_mode = this.properties.order_assign_mode;
            }
            if (this.properties?.slot_map) {
                this.properties.slot_map = Object.assign({}, this.properties.slot_map);
            }

            if (this.properties?.c3ds_privacy_mode !== undefined) {
                this.properties.privacy_mode = !!this.properties.c3ds_privacy_mode;
            }

            if (this.properties?.folder_direct !== undefined) {
                this.properties.folder_direct = !!this.properties.folder_direct;
            }

            if (this.properties?.gallery_view_mode) {
                this.properties.gallery_view_mode = this.properties.gallery_view_mode;
            }

            if (typeof this.properties?.c3ds_preview_idx === "number") {
                this._preview_focus_idx = this.properties.c3ds_preview_idx;
                this._last_active_idx = this.properties.c3ds_preview_idx;
            }

            const savedSize = this.properties?.c3ds_custom_size || info?.size;
            if (savedSize && Array.isArray(savedSize)) {
                const targetW = Math.max(275, savedSize[0]);
                const targetH = Math.max(160, savedSize[1]);
                this.setSize([targetW, targetH]);
                this.properties = this.properties || {};
                this.properties.c3ds_custom_size = [targetW, targetH];
            } else {
                this.setSize([360, this.isCollapsedParams ? 240 : 330]);
            }

            this.isCollapsedParams = !!this.properties?.is_collapsed_params;
            if (this.c3dsBars) {
                const d = this.isCollapsedParams ? "none" : "flex";
                this.c3dsBars.barTarget.style.display = d;
                this.c3dsBars.barOpen.style.display = d;
                this.c3dsBars.barMode.style.display = d;
                this.c3dsBars.viewMain.style.display = "flex";
                this.c3dsBars.barHud.style.display = "flex";
            }

            updateDomDimensions(this);

            const shouldFocus = !!this.properties?.is_focus_view;
            if (this.c3dsSwitchViewMode) {
                this.c3dsSwitchViewMode(shouldFocus);
            }

            if (this.c3dsRefreshAll) {
                this.c3dsRefreshAll();
            }

            syncNodeGalleryColor(this);

            this.setDirtyCanvas(true, true);
            return r;
        };

        nodeType.prototype.computeSize = function () {
            return [275, this.isCollapsedParams ? 220 : 310];
        };

        const origResize = nodeType.prototype.onResize;
        nodeType.prototype.onResize = function (size) {
            if (this._c3ds_resizing_internal) {
                return origResize ? origResize.apply(this, [size]) : undefined;
            }

            size[0] = Math.max(275, size[0]);
            size[1] = Math.max(this.isCollapsedParams ? 160 : 240, size[1]);

            this.properties = this.properties || {};
            this.properties.c3ds_custom_size = [size[0], size[1]];

            const r = origResize ? origResize.apply(this, [size]) : undefined;
            updateDomDimensions(this);
            return r;
        };

        const origDrawForeground = nodeType.prototype.onDrawForeground;
        nodeType.prototype.onDrawForeground = function (ctx, canvas) {
            syncNodeGalleryColor(this);
            updateDomDimensions(this);

            if (origDrawForeground) origDrawForeground.apply(this, arguments);
            if (this.flags?.collapsed) return;

            const titleH = this.title_height || 30;
            const btnW = 20;
            const btnH = 18;
            const collapseBtnX = this.size[0] - btnW - 8;
            const collapseBtnY = -titleH + (titleH - btnH) / 2;
            const eyeBtnX = collapseBtnX - btnW - 4;
            const eyeBtnY = collapseBtnY;

            ctx.save();

            ctx.beginPath();
            if (ctx.roundRect) ctx.roundRect(eyeBtnX, eyeBtnY, btnW, btnH, 3);
            else ctx.rect(eyeBtnX, eyeBtnY, btnW, btnH);

            const isPrivacy = !!this.properties?.privacy_mode;
            ctx.fillStyle = isPrivacy ? "#7b3737" : (this._eyeHover ? "#2a2a2a" : "#1e1e1e");
            ctx.fill();
            ctx.strokeStyle = isPrivacy ? "#944444" : (this._eyeHover ? "#7b3737" : "#383838");
            ctx.lineWidth = 1;
            ctx.stroke();

            ctx.fillStyle = isPrivacy ? "#ffffff" : (this._eyeHover ? "#e5b9b9" : "#b35050");
            ctx.font = "bold 11px -apple-system, BlinkMacSystemFont, sans-serif";
            ctx.textAlign = "center"; ctx.textBaseline = "middle";
            ctx.fillText(isPrivacy ? "🙈" : "👁", eyeBtnX + btnW / 2, eyeBtnY + btnH / 2);

            ctx.beginPath();
            if (ctx.roundRect) ctx.roundRect(collapseBtnX, collapseBtnY, btnW, btnH, 3);
            else ctx.rect(collapseBtnX, collapseBtnY, btnW, btnH);

            ctx.fillStyle = this._collapseHover ? "#2a2a2a" : "#1e1e1e";
            ctx.fill();
            ctx.strokeStyle = this._collapseHover ? "#7b3737" : "#383838";
            ctx.lineWidth = 1;
            ctx.stroke();

            ctx.fillStyle = this._collapseHover ? "#e5b9b9" : "#b35050";
            ctx.font = "bold 11px -apple-system, BlinkMacSystemFont, sans-serif";
            ctx.textAlign = "center"; ctx.textBaseline = "middle";
            ctx.fillText(this.isCollapsedParams ? "▼" : "▲", collapseBtnX + btnW / 2, collapseBtnY + btnH / 2);

            ctx.restore();
        };

        const origMouseDown = nodeType.prototype.onMouseDown;
        nodeType.prototype.onMouseDown = function (e, local_pos, canvas) {
            if (this.flags?.collapsed) {
                return origMouseDown ? origMouseDown.apply(this, arguments) : undefined;
            }
            if (local_pos) {
                const titleH = this.title_height || 30;
                const btnW = 20;
                const btnH = 18;
                const collapseBtnX = this.size[0] - btnW - 8;
                const collapseBtnY = -titleH + (titleH - btnH) / 2;
                const eyeBtnX = collapseBtnX - btnW - 4;
                const eyeBtnY = collapseBtnY;

                if (local_pos[0] >= collapseBtnX - 3 && local_pos[0] <= collapseBtnX + btnW + 3 &&
                    local_pos[1] >= collapseBtnY - 3 && local_pos[1] <= collapseBtnY + btnH + 3) {
                    applyLoaderCollapse(this, !this.isCollapsedParams);
                    return true;
                }

                if (local_pos[0] >= eyeBtnX - 3 && local_pos[0] <= eyeBtnX + btnW + 3 &&
                    local_pos[1] >= eyeBtnY - 3 && local_pos[1] <= eyeBtnY + btnH + 3) {
                    this.properties = this.properties || {};
                    this.properties.privacy_mode = !this.properties.privacy_mode;
                    this.properties.c3ds_privacy_mode = this.properties.privacy_mode;
                    if (this.c3dsUpdateOverlays) this.c3dsUpdateOverlays();
                    this.setDirtyCanvas(true, true);
                    return true;
                }
            }
            return origMouseDown ? origMouseDown.apply(this, arguments) : undefined;
        };

        const origMouseMove = nodeType.prototype.onMouseMove;
        nodeType.prototype.onMouseMove = function (e, local_pos, canvas) {
            if (this.flags?.collapsed) {
                return origMouseMove ? origMouseMove.apply(this, arguments) : undefined;
            }
            if (local_pos) {
                const titleH = this.title_height || 30;
                const btnW = 20;
                const btnH = 18;
                const collapseBtnX = this.size[0] - btnW - 8;
                const collapseBtnY = -titleH + (titleH - btnH) / 2;
                const eyeBtnX = collapseBtnX - btnW - 4;
                const eyeBtnY = collapseBtnY;

                const isCollapseOver = local_pos[0] >= collapseBtnX - 2 && local_pos[0] <= collapseBtnX + btnW + 2 &&
                                       local_pos[1] >= collapseBtnY - 2 && local_pos[1] <= collapseBtnY + btnH + 2;
                const isEyeOver = local_pos[0] >= eyeBtnX - 2 && local_pos[0] <= eyeBtnX + btnW + 2 &&
                                  local_pos[1] >= eyeBtnY - 2 && local_pos[1] <= eyeBtnY + btnH + 2;

                let dirty = false;
                if (isCollapseOver !== this._collapseHover) { this._collapseHover = isCollapseOver; dirty = true; }
                if (isEyeOver !== this._eyeHover) { this._eyeHover = isEyeOver; dirty = true; }

                if (dirty) {
                    if (canvas && canvas.canvas) {
                        if (isCollapseOver) {
                            canvas.canvas.title = this.isCollapsedParams ? "展开参数面板" : "折叠参数面板（纯享画廊预览）";
                        } else if (isEyeOver) {
                            canvas.canvas.title = this.properties?.privacy_mode ? "关闭隐私遮罩" : "开启隐私防窥保护（防窥遮罩）";
                        } else {
                            canvas.canvas.title = "";
                        }
                    }
                    this.setDirtyCanvas(true, true);
                }
            }
            if (origMouseMove) return origMouseMove.apply(this, arguments);
        };

        const origMouseLeave = nodeType.prototype.onMouseLeave;
        nodeType.prototype.onMouseLeave = function () {
            let dirty = false;
            if (this._collapseHover) { this._collapseHover = false; dirty = true; }
            if (this._eyeHover) { this._eyeHover = false; dirty = true; }
            if (dirty) this.setDirtyCanvas(true, true);
            if (origMouseLeave) return origMouseLeave.apply(this, arguments);
        };
    }
});