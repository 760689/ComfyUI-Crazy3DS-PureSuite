import { app } from "../../scripts/app.js";
import { api } from "../../scripts/api.js";

const STORAGE_KEY = "Crazy3DS_Global_Save_Paths";
const STORAGE_IDX_KEY = "Crazy3DS_Global_Selected_Idx";
const STORAGE_COLLAPSE_MAP = "Crazy3DS_Node_Collapse_Map";
const DELTA_CONTROL_HEIGHT = 258;

// =========================================================
// 1. 全局持久化管理中心
// =========================================================
function getGlobalPaths() {
    try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (raw) {
            const parsed = JSON.parse(raw);
            if (Array.isArray(parsed) && parsed.length > 0) return parsed;
        }
    } catch (e) {}
    return ["output/Crazy3DS_Saves"];
}

function getGlobalIdx(pathsLen) {
    try {
        const raw = localStorage.getItem(STORAGE_IDX_KEY);
        if (raw !== null) {
            const idx = parseInt(raw);
            if (!isNaN(idx) && idx >= 0 && idx < pathsLen) return idx;
        }
    } catch (e) {}
    return 0;
}

function setGlobalPaths(paths, selectedIdx) {
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(paths));
        if (typeof selectedIdx === "number") {
            localStorage.setItem(STORAGE_IDX_KEY, String(selectedIdx));
        }
    } catch (e) {}

    api.fetchApi("/crazy3ds/save_paths", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ paths: paths })
    }).catch(() => {});

    syncAllCrazyNodesOnCanvas();
}

function getNodeCollapseState(nodeId) {
    try {
        const map = JSON.parse(localStorage.getItem(STORAGE_COLLAPSE_MAP) || "{}");
        return map[String(nodeId)];
    } catch (e) { return undefined; }
}

function setNodeCollapseState(nodeId, state) {
    try {
        const map = JSON.parse(localStorage.getItem(STORAGE_COLLAPSE_MAP) || "{}");
        map[String(nodeId)] = !!state;
        localStorage.setItem(STORAGE_COLLAPSE_MAP, JSON.stringify(map));
    } catch (e) {}
}

function syncAllCrazyNodesOnCanvas() {
    if (!app.graph || !app.graph._nodes) return;
    const paths = getGlobalPaths();
    const idx = getGlobalIdx(paths.length);

    for (const node of app.graph._nodes) {
        if (node.comfyClass === "Crazy3DS_SaveImage") {
            node.properties = node.properties || {};
            node.properties.paths_list = paths;
            node.properties.selected_idx = idx;

            const targetW = node.widgets?.find(w => w.name === "target_path");
            if (targetW) {
                targetW.value = paths[idx] || "output/Crazy3DS_Saves";
            }

            if (node.updatePanelUI) {
                node.updatePanelUI();
            }

            node.setDirtyCanvas(true, true);
        }
    }
}

(async function initGlobalConfig() {
    try {
        const res = await api.fetchApi("/crazy3ds/get_paths");
        const data = await res.json();
        if (data && Array.isArray(data.paths) && data.paths.length > 0) {
            const local = localStorage.getItem(STORAGE_KEY);
            if (!local) {
                localStorage.setItem(STORAGE_KEY, JSON.stringify(data.paths));
                syncAllCrazyNodesOnCanvas();
            }
        }
    } catch (e) {}
})();

// =========================================================
// 2. 原生控件映射与折叠总控
// =========================================================
function getWidgetNativeType(name) {
    if (!name) return "text";
    if (name === "format") return "combo";
    if (name.startsWith("filename")) return "customtext";
    if (name.startsWith("quality")) return "number";
    return "toggle";
}

function applyCollapseParams(node, isCollapsed, isInitialLoad = false) {
    node.isCollapsedParams = isCollapsed;
    node.properties = node.properties || {};
    node.properties.is_collapsed_params = isCollapsed;
    setNodeCollapseState(node.id, isCollapsed);

    const nativeParamNames = [
        "format", "filename", "quality", "anti_fingerprint",
        "save_workflow", "enable_preview", "enable_save"
    ];

    if (node.widgets) {
        for (const w of node.widgets) {
            const isTarget = nativeParamNames.some(p => w.name === p || (w.name && w.name.startsWith(p)));
            if (!isTarget) continue;

            if (!w._c3ds_real_type && w.type !== "hidden") {
                w._c3ds_real_type = w.type;
            }

            if (isCollapsed) {
                w.type = "hidden";
                w.hidden = true;
                if (w.computeSize && w.computeSize()[1] <= 0) delete w.computeSize;
            } else {
                w.type = w._c3ds_real_type || getWidgetNativeType(w.name);
                w.hidden = false;
                if (w.computeSize && w.computeSize()[1] <= 0) delete w.computeSize;
            }
        }
    }

    if (node.c3dsBars) {
        const displayVal = isCollapsed ? "none" : "flex";
        node.c3dsBars.barSave.style.display = displayVal;
        node.c3dsBars.barTarget.style.display = displayVal;
        node.c3dsBars.barOpen.style.display = displayVal;
        node.c3dsBars.barHud.style.display = "flex";
    }

    if (node.c3dsDomWidget) {
        node.c3dsDomWidget.computeSize = (width) => [width || (node.size ? node.size[0] : 360), isCollapsed ? 28 : 118];
    }

    const minH = node.computeSize()[1];
    if (!isInitialLoad) {
        if (isCollapsed) {
            node.setSize([node.size[0], Math.max(minH, node.size[1] - DELTA_CONTROL_HEIGHT)]);
        } else {
            node.setSize([node.size[0], Math.max(minH, node.size[1] + DELTA_CONTROL_HEIGHT)]);
        }
    } else {
        if (node.size[1] < minH) node.setSize([node.size[0], minH]);
    }

    node.setDirtyCanvas(true, true);
}

function toggleCollapseParams(node) {
    applyCollapseParams(node, !node.isCollapsedParams, false);
}

// 格式化时间与文件名
function formatFileNamePattern(pattern, dateObj, idx, totalCount) {
    if (!pattern || !pattern.trim()) return "";
    const d = dateObj instanceof Date ? dateObj : new Date();
    let res = pattern.trim();
    const pad = (n) => String(n).padStart(2, '0');
    res = res.replace(/%Y/g, d.getFullYear());
    res = res.replace(/%m/g, pad(d.getMonth() + 1));
    res = res.replace(/%d/g, pad(d.getDate()));
    res = res.replace(/%H/g, pad(d.getHours()));
    res = res.replace(/%M/g, pad(d.getMinutes()));
    res = res.replace(/%S/g, pad(d.getSeconds()));
    if (typeof idx === "number" && totalCount > 1) {
        res = `${res}_${String(idx + 1).padStart(3, '0')}`;
    }
    return res;
}

// 前端向上递归解析原文件名
function resolveUpstreamNameInJS(node, activeIdx) {
    if (!app.graph || !node.inputs) return "";
    const imgInput = node.inputs.find(i => i.name === "images" || i.type === "IMAGE");
    if (!imgInput || imgInput.link === null || imgInput.link === undefined) return "";
    const link = app.graph.links[imgInput.link];
    if (!link) return "";

    const visited = new Set();
    const queue = [link.origin_id];

    while (queue.length > 0) {
        const nid = queue.shift();
        if (visited.has(nid)) continue;
        visited.add(nid);
        const upNode = app.graph.getNodeById(nid);
        if (!upNode) continue;

        if (upNode.comfyClass?.includes("LoadImage") || upNode.type?.includes("LoadImage")) {
            const selW = upNode.widgets?.find(w => w.name === "selected_files");
            if (selW && selW.value) {
                try {
                    const items = typeof selW.value === "string" ? JSON.parse(selW.value) : selW.value;
                    if (Array.isArray(items) && items.length > 0) {
                        const it = (typeof activeIdx === "number" && items[activeIdx]) ? items[activeIdx] : items[0];
                        const nm = it?.edited_name || it?.name || (typeof it === "string" ? it : "");
                        if (nm) return nm.replace(/\.[^/.]+$/, "");
                    }
                } catch(e) {}
            }
            const fileW = upNode.widgets?.find(w => w.name === "image" || w.name === "filename" || w.name === "file");
            if (fileW && fileW.value) {
                const raw = String(fileW.value).replace(/\\/g, '/').split('/').pop() || "";
                if (raw) return raw.replace(/\.[^/.]+$/, "");
            }
        }

        if (upNode.inputs) {
            for (const inp of upNode.inputs) {
                if (inp.link !== null && inp.link !== undefined) {
                    const l = app.graph.links[inp.link];
                    if (l && !visited.has(l.origin_id)) {
                        queue.push(l.origin_id);
                    }
                }
            }
        }
    }
    return "";
}

// 规范规格字符串，统一计数格式
function cleanAndFormatSpecs(rawSpecs, curIdx, totalCount) {
    if (!rawSpecs) return "";
    let s = rawSpecs.trim();
    let prev = "";
    while (prev !== s) {
        prev = s;
        s = s.replace(/(\s*\[[^\]]*\]+|\s*P\]+|\s*\d+P)\s*$/g, "").trim();
    }
    if (typeof curIdx === "number" && totalCount > 1) {
        return `${s}   [${curIdx + 1}/${totalCount}P]`;
    } else if (totalCount > 1 && (curIdx === null || curIdx === undefined)) {
        return `${s}   [${totalCount}P]`;
    } else if (totalCount === 1 || curIdx === 0) {
        return `${s}   [1/1P]`;
    }
    return s;
}

// 状态栏 HUD 刷新
function refreshNodeHudText(node) {
    if (!node.hudTitleElement || !node.hudSpecsElement) return;

    let targetText = "";
    const activeIdx = (typeof node.imageIndex === "number" && node.imageIndex >= 0) ? node.imageIndex : node.c3dsActiveImgIdx;

    if (typeof activeIdx === "number" && activeIdx >= 0 && node.c3dsItemsHud && node.c3dsItemsHud[activeIdx]) {
        targetText = node.c3dsItemsHud[activeIdx];
    } else if (node.c3dsOverallHud) {
        targetText = node.c3dsOverallHud;
    } else if (node.properties?.c3ds_cached_hud) {
        targetText = node.properties.c3ds_cached_hud;
    }

    if (!targetText) targetText = "等待生成...";

    if (targetText.includes("等待生成") || targetText.includes("正在保存") || targetText.includes("失败") || targetText.includes("异常") || targetText.includes("关闭")) {
        node.hudTitleElement.innerText = targetText;
        node.hudTitleElement.title = `【当前状态】${targetText}`;
        node.hudSpecsElement.innerText = "";
        return;
    }

    const totalCount = (node.imgs && node.imgs.length) ? node.imgs.length : (node.c3dsItemsHud ? node.c3dsItemsHud.length : 1);

    let namePart = "";
    let specsPart = targetText;

    if (targetText.includes(" · ")) {
        const splitIdx = targetText.indexOf(" · ");
        namePart = targetText.substring(0, splitIdx).trim();
        specsPart = targetText.substring(splitIdx + 3).trim();
    }

    if (!namePart) {
        const fnWidget = node.widgets?.find(w => w.name === "filename" || w.name?.startsWith("filename"));
        const fnVal = fnWidget?.value ? String(fnWidget.value).trim() : "";
        if (fnVal) {
            namePart = formatFileNamePattern(fnVal, node._c3ds_exec_time, activeIdx, totalCount);
        } else {
            namePart = resolveUpstreamNameInJS(node, activeIdx);
        }
    }

    if (!namePart) {
        namePart = formatFileNamePattern("Crazy3DS_%Y%m%d_%H%M%S", node._c3ds_exec_time, activeIdx, totalCount);
    }

    const finalSpecs = cleanAndFormatSpecs(specsPart, (typeof activeIdx === "number" && activeIdx >= 0) ? activeIdx : null, totalCount);

    node.hudTitleElement.innerText = namePart;
    node.hudTitleElement.title = `【图像命名】${namePart}`;
    node.hudSpecsElement.innerText = finalSpecs;
    node.hudSpecsElement.title = `【图像规格】${finalSpecs.trim()}`;
    if (node.barHudElement) {
        node.barHudElement.title = `【当前输出信息】${namePart}   ${finalSpecs}`;
    }
}

// 获取各原生参数 Widget 的专属悬停提示
function getNativeWidgetTooltip(wName) {
    if (!wName) return "";
    if (wName.startsWith("format")) {
        return "【导出格式】选择输出图像的编码格式（PNG / JPG / WEBP 等）";
    }
    if (wName.startsWith("filename")) {
        return "【保存命名】支持 %Y%m%d_%H%M%S 时间变量，留空则自动继承上游原文件名";
    }
    if (wName.startsWith("quality")) {
        return "【画质压缩比】仅对 JPG / WEBP 生效，100 为最高质量导出";
    }
    if (wName.startsWith("anti_fingerprint")) {
        return "【破除画面暗水印】剥离生成模型特征签名及不可见防伪水印";
    }
    if (wName.startsWith("save_workflow")) {
        return "【保存工作流】是否将当前 ComfyUI 画布连线信息嵌入图像元数据";
    }
    if (wName.startsWith("enable_preview")) {
        return "【启用预览】关闭后不再传输画面到浏览器前端，大幅节省显存与内存";
    }
    if (wName.startsWith("enable_save")) {
        return "【自动保存/仅预览】开启后每次运行自动落盘；关闭后仅供预览，需手动点击保存";
    }
    return "";
}

// =========================================================
// 3. 统一 DOM 控制面板
// =========================================================
function setupUnifiedControlPanel(node) {
    const targetPathWidget = node.widgets ? node.widgets.find(w => w.name === "target_path") : null;
    if (targetPathWidget) {
        targetPathWidget.type = "hidden";
        targetPathWidget.hidden = true;
        targetPathWidget.disabled = true;
        targetPathWidget.draw = function () { };
        targetPathWidget.computeSize = () => [0, -4];
    }

    const globalPaths = getGlobalPaths();
    const globalIdx = getGlobalIdx(globalPaths.length);

    node.properties = node.properties || {};
    node.properties.paths_list = globalPaths;
    node.properties.selected_idx = globalIdx;

    const syncPath = () => {
        const list = node.properties.paths_list;
        const idx = Math.max(0, Math.min(node.properties.selected_idx, list.length - 1));
        if (targetPathWidget) {
            targetPathWidget.value = list[idx] || "output/Crazy3DS_Saves";
        }
    };

    const panelWrapper = document.createElement("div");
    panelWrapper.style.cssText = "width:100%;display:flex;flex-direction:column;gap:4px;padding:0 5px;margin-top:3px;box-sizing:border-box;position:relative;user-select:none;overflow:visible;pointer-events:none;";

    panelWrapper.addEventListener("pointerdown", (e) => {
        if (e.button === 1 || e.button === 2 || e.spaceKey) {
            if (app.canvas && app.canvas.processMouseDown) app.canvas.processMouseDown(e);
        }
    });

    panelWrapper.addEventListener("wheel", (e) => {
        if (dropdownMenu.style.display !== "block") {
            if (app.canvas && app.canvas.processMouseWheel) {
                app.canvas.processMouseWheel(e);
            }
        }
    }, { passive: false });

    // 栏目 1: 一键保存
    const barSave = document.createElement("div");
    barSave.style.cssText = "width:100%;height:26px;background:#7b3737;border:1px solid #944444;display:flex;align-items:center;justify-content:space-between;padding:0 12px;box-sizing:border-box;cursor:pointer;transition:background 0.15s ease;pointer-events:auto;";
    barSave.title = "【一键保存】点击直接将当前全部预览图像写入硬盘目标路径";
    
    const saveLeftText = document.createElement("span");
    saveLeftText.innerText = "仅预览时一键保存";
    saveLeftText.title = "【手动保存】仅预览模式下有效，点击即可将当前预览图像立即保存至硬盘";
    saveLeftText.style.cssText = "font-size:11px;color:#e5b9b9;font-family:-apple-system,BlinkMacSystemFont,sans-serif;";

    const saveRightText = document.createElement("span");
    saveRightText.innerText = "保   存";
    saveRightText.title = "【执行保存】立即触发当前批次图像落盘";
    saveRightText.style.cssText = "font-size:14px;font-weight:bold;color:#ffffff;font-family:-apple-system,BlinkMacSystemFont,sans-serif;margin-right:24px;";

    barSave.appendChild(saveLeftText);
    barSave.appendChild(saveRightText);

    barSave.onmouseenter = () => { if (node.manualSaveState !== "success") barSave.style.background = "#8c3f3f"; };
    barSave.onmouseleave = () => { if (node.manualSaveState !== "success") barSave.style.background = "#7b3737"; };
    barSave.onclick = () => triggerManualSave(node, barSave, saveLeftText, saveRightText);

    // 栏目 2: 存储目标路径
    const barTarget = document.createElement("div");
    barTarget.style.cssText = "width:100%;height:26px;background:#1e1e1e;border:1px solid #383838;display:flex;align-items:center;padding:0 10px;box-sizing:border-box;cursor:pointer;position:relative;transition:border 0.15s ease;pointer-events:auto;";
    barTarget.title = "【存储目标路径】点击展开历史路径下拉列表，支持自由切换、新增和快捷移除";

    const targetLabel = document.createElement("span");
    targetLabel.innerText = "存储目标路径";
    targetLabel.title = "【存储目标路径】当前激活的保存主目录";
    targetLabel.style.cssText = "width:78px;font-size:12px;font-weight:600;color:#a84b4b;font-family:-apple-system,BlinkMacSystemFont,sans-serif;flex-shrink:0;";

    const targetValWrap = document.createElement("div");
    targetValWrap.style.cssText = "flex:1;min-width:0;display:flex;align-items:center;justify-content:space-between;margin-left:12px;overflow:hidden;";

    const targetValText = document.createElement("span");
    targetValText.style.cssText = "font-size:12px;font-weight:600;color:#b35050;font-family:-apple-system,BlinkMacSystemFont,sans-serif;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;flex:1;";

    const targetValArrow = document.createElement("span");
    targetValArrow.innerText = "▾";
    targetValArrow.title = "点击展开/收起历史路径菜单";
    targetValArrow.style.cssText = "font-size:11px;color:#a84b4b;flex-shrink:0;margin-left:6px;";

    targetValWrap.appendChild(targetValText);
    targetValWrap.appendChild(targetValArrow);
    barTarget.appendChild(targetLabel);
    barTarget.appendChild(targetValWrap);

    barTarget.onmouseenter = () => barTarget.style.borderColor = "#555";
    barTarget.onmouseleave = () => barTarget.style.borderColor = "#383838";

    const dropdownMenu = document.createElement("div");
    dropdownMenu.style.cssText = "display:none;position:absolute;top:100%;left:0;right:0;margin-top:2px;background:#181818;border:1px solid #444;max-height:220px;overflow-y:auto;z-index:99999;box-shadow:0 8px 24px rgba(0,0,0,0.9);pointer-events:auto;";
    dropdownMenu.addEventListener("wheel", (e) => e.stopPropagation(), { passive: false });
    dropdownMenu.addEventListener("pointerdown", (e) => e.stopPropagation());
    dropdownMenu.addEventListener("mousedown", (e) => e.stopPropagation());
    barTarget.appendChild(dropdownMenu);

    barTarget.addEventListener("mousedown", (e) => {
        e.stopPropagation();
        const isOpen = dropdownMenu.style.display === "block";
        dropdownMenu.style.display = isOpen ? "none" : "block";
        if (!isOpen) renderDropdownOptions();
    });

    window.addEventListener("pointerdown", (e) => {
        if (dropdownMenu.style.display === "block" && !barTarget.contains(e.target)) {
            dropdownMenu.style.display = "none";
        }
    }, true);

    // 栏目 3: 打开路径文件夹 (2/3) + 转到来路 (1/3)
    const barOpen = document.createElement("div");
    barOpen.style.cssText = "width:100%;height:26px;display:flex;gap:4px;box-sizing:border-box;pointer-events:auto;";

    const btnOpenFolder = document.createElement("div");
    btnOpenFolder.style.cssText = "flex:2;height:100%;background:#1e1e1e;border:1px solid #383838;display:flex;align-items:center;justify-content:center;cursor:pointer;box-sizing:border-box;color:#ddd;font-size:11.5px;font-family:-apple-system,BlinkMacSystemFont,sans-serif;transition:all 0.15s ease;border-radius:2px;";
    btnOpenFolder.innerText = "打开路径文件夹";
    btnOpenFolder.title = "【打开路径】在系统资源管理器中直接打开当前选中的存储目录";

    btnOpenFolder.onmouseenter = () => { btnOpenFolder.style.background = "#282828"; btnOpenFolder.style.borderColor = "#555"; };
    btnOpenFolder.onmouseleave = () => { btnOpenFolder.style.background = "#1e1e1e"; btnOpenFolder.style.borderColor = "#383838"; };
    btnOpenFolder.onclick = async () => {
        const list = node.properties.paths_list || getGlobalPaths();
        const idx = node.properties.selected_idx || 0;
        const curPath = list[idx] || "output/Crazy3DS_Saves";
        try {
            const res = await api.fetchApi("/crazy3ds/open_folder", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ target_path: curPath })
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
        } catch (e) {
            btnOpenFolder.innerText = "请求异常";
            btnOpenFolder.style.color = "#ef4444";
            setTimeout(() => { btnOpenFolder.innerText = "打开路径文件夹"; btnOpenFolder.style.color = "#ddd"; }, 1200);
        }
    };

    const btnGoSrc = document.createElement("div");
    btnGoSrc.style.cssText = "flex:1;height:100%;background:#1e1e1e;border:1px solid #383838;display:flex;align-items:center;justify-content:center;cursor:pointer;box-sizing:border-box;color:#ddd;font-size:12px;font-family:-apple-system,BlinkMacSystemFont,sans-serif;transition:all 0.15s ease;border-radius:2px;";
    btnGoSrc.innerText = "转到来路";
    btnGoSrc.title = "【转到来路】一键抓取上游图片加载器（LoadImage）当前选定的素材源文件夹";

    btnGoSrc.onmouseenter = () => { btnGoSrc.style.background = "#282828"; btnGoSrc.style.borderColor = "#7b3737"; btnGoSrc.style.color = "#fca5a5"; };
    btnGoSrc.onmouseleave = () => { btnGoSrc.style.background = "#1e1e1e"; btnGoSrc.style.borderColor = "#383838"; btnGoSrc.style.color = "#ddd"; };
    btnGoSrc.onclick = (e) => {
        if (e) e.stopPropagation();
        if (!app.graph || !app.graph._nodes) return;

        const loaderNode = app.graph._nodes.find(n => n.comfyClass === "Crazy3DS_LoadImage" || (n.type && n.type.includes("Crazy3DS_LoadImage")));
        if (!loaderNode) {
            btnGoSrc.innerText = "未发现来路";
            btnGoSrc.style.color = "#ef4444";
            setTimeout(() => { btnGoSrc.innerText = "转到来路"; btnGoSrc.style.color = "#ddd"; }, 1200);
            return;
        }

        let srcPath = "";
        if (loaderNode.properties?.load_paths && loaderNode.properties.load_paths.length > 0) {
            const lIdx = Math.max(0, Math.min(loaderNode.properties.selected_idx || 0, loaderNode.properties.load_paths.length - 1));
            srcPath = loaderNode.properties.load_paths[lIdx];
        }
        if (!srcPath) {
            const tw = loaderNode.widgets?.find(w => w.name === "target_path");
            if (tw && tw.value) srcPath = String(tw.value);
        }

        if (srcPath && srcPath.trim()) {
            srcPath = srcPath.trim();
            let fresh = getGlobalPaths().filter(p => p.toLowerCase() !== srcPath.toLowerCase());
            fresh.unshift(srcPath);
            fresh = fresh.slice(0, 19);
            setGlobalPaths(fresh, 0);
            syncPath();
            renderDropdownOptions();
            node.setDirtyCanvas(true, true);

            btnGoSrc.innerText = "已获取来路";
            btnGoSrc.style.color = "#48bb78";
            setTimeout(() => { btnGoSrc.innerText = "转到来路"; btnGoSrc.style.color = "#ddd"; }, 1200);
        } else {
            btnGoSrc.innerText = "来路路径空";
            btnGoSrc.style.color = "#f59e0b";
            setTimeout(() => { btnGoSrc.innerText = "转到来路"; btnGoSrc.style.color = "#ddd"; }, 1200);
        }
    };

    barOpen.appendChild(btnOpenFolder);
    barOpen.appendChild(btnGoSrc);

    // 栏目 4: 结构化状态栏 HUD
    const barHud = document.createElement("div");
    barHud.style.cssText = "width:100%;height:24px;background:#151515;border:1px solid #282828;display:flex;align-items:center;justify-content:space-between;padding:0 10px;box-sizing:border-box;overflow:hidden;pointer-events:auto;";
    barHud.title = "【状态栏】实时显示生成图像文件名、分辨率规格、文件体积及队列位置";

    const hudTitle = document.createElement("span");
    hudTitle.style.cssText = "font-size:10.5px;color:#bbb;font-family:-apple-system,BlinkMacSystemFont,sans-serif;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;flex:1;min-width:0;margin-right:10px;";
    hudTitle.innerText = "等待生成...";
    hudTitle.title = "【图像命名】等待生成图像";

    const hudSpecs = document.createElement("span");
    hudSpecs.style.cssText = "font-size:10.5px;color:#777;font-family:-apple-system,BlinkMacSystemFont,sans-serif;white-space:nowrap;flex-shrink:0;text-align:right;";
    hudSpecs.innerText = "";
    hudSpecs.title = "【图像规格】分辨率与批次信息";

    barHud.appendChild(hudTitle);
    barHud.appendChild(hudSpecs);

    node.hudTitleElement = hudTitle;
    node.hudSpecsElement = hudSpecs;
    node.barHudElement = barHud;

    const renderDropdownOptions = () => {
        const list = node.properties.paths_list || getGlobalPaths();
        const idx = Math.max(0, Math.min(node.properties.selected_idx ?? getGlobalIdx(list.length), list.length - 1));
        const curPath = list[idx] || list[0] || "output/Crazy3DS_Saves";

        targetValText.innerText = `[${idx + 1}] ${curPath}`;
        targetValText.title = `【当前选中保存路径】${curPath}`;
        dropdownMenu.innerHTML = "";

        const addCustomItem = document.createElement("div");
        addCustomItem.style.cssText = "background:#221e1e;border-bottom:1px solid #443;color:#e5b9b9;font-weight:600;display:flex;align-items:center;justify-content:center;gap:6px;padding:7px 10px;font-size:12px;font-family:-apple-system,BlinkMacSystemFont,sans-serif;cursor:pointer;";
        addCustomItem.title = "【添加路径】在系统资源管理器中浏览并选定新的保存文件夹";
        addCustomItem.innerHTML = `<span>➕</span><span>添加新保存路径...</span>`;
        addCustomItem.onmouseenter = () => addCustomItem.style.background = "#2e2424";
        addCustomItem.onmouseleave = () => addCustomItem.style.background = "#221e1e";
        addCustomItem.onclick = async (e) => {
            e.stopPropagation();
            dropdownMenu.style.display = "none";
            try {
                const res = await api.fetchApi("/crazy3ds/choose_folder", {
                    method: "POST", headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ initial_path: list[idx] || "" })
                });
                const ret = await res.json();
                if (ret.success && ret.folder) {
                    const newP = ret.folder;
                    let fresh = getGlobalPaths().filter(p => p.toLowerCase() !== newP.toLowerCase());
                    fresh.unshift(newP);
                    fresh = fresh.slice(0, 19);
                    setGlobalPaths(fresh, 0);
                    syncPath();
                    renderDropdownOptions();
                }
            } catch (err) {}
        };
        dropdownMenu.appendChild(addCustomItem);

        list.forEach((p, i) => {
            const isCur = i === idx;
            const item = document.createElement("div");
            item.title = `【点击切换至此路径】${p}`;
            item.style.cssText = `display:flex;align-items:center;justify-content:space-between;padding:6px 10px;font-size:12px;font-family:-apple-system,BlinkMacSystemFont,sans-serif;color:${isCur ? "#fff" : "#bbb"};background:${isCur ? "#264" : "transparent"};cursor:pointer;border-bottom:1px solid #282828;`;
            if (i === list.length - 1) item.style.borderBottom = "none";

            item.innerHTML = `
                <span style="flex-shrink:0;color:${isCur ? '#fff' : '#888'};margin-right:6px;font-family:monospace;font-size:11px;" title="路径编号">[${i + 1}]</span>
                <span style="overflow:hidden;text-overflow:ellipsis;white-space:nowrap;flex:1;min-width:0;direction:rtl;text-align:left;" title="${p}"><bdo dir="ltr">${p}</bdo></span>
                ${list.length > 1 ? '<span class="c3ds-del-path" style="color:#888;font-size:14px;padding:0 4px;margin-left:6px;line-height:1;flex-shrink:0;transition:color 0.15s;" title="【删除】从此历史列表中移除该路径记录">×</span>' : ''}
            `;

            const delBtn = item.querySelector(".c3ds-del-path");
            if (delBtn) {
                delBtn.onmouseenter = () => delBtn.style.color = "#ef4444";
                delBtn.onmouseleave = () => delBtn.style.color = "#888";
                delBtn.onclick = (e) => {
                    e.stopPropagation();
                    const fresh = getGlobalPaths().filter((_, i2) => i2 !== i);
                    const newIdx = Math.max(0, idx - (i <= idx ? 1 : 0));
                    setGlobalPaths(fresh, newIdx);
                    syncPath();
                    renderDropdownOptions();
                };
            }

            item.onmouseenter = () => { if (!isCur) { item.style.background = "#2b2b2b"; item.style.color = "#fff"; } };
            item.onmouseleave = () => { if (!isCur) { item.style.background = "transparent"; item.style.color = "#bbb"; } };
            item.onclick = (e) => {
                if (e.target.classList && e.target.classList.contains("c3ds-del-path")) return;
                e.stopPropagation();
                dropdownMenu.style.display = "none";
                node.properties.selected_idx = i;
                setGlobalPaths(list, i);
                syncPath();
            };
            dropdownMenu.appendChild(item);
        });
    };

    node.updatePanelUI = () => {
        renderDropdownOptions();
    };

    panelWrapper.appendChild(barSave);
    panelWrapper.appendChild(barTarget);
    panelWrapper.appendChild(barOpen);
    panelWrapper.appendChild(barHud);

    node.c3dsBars = { barSave, barTarget, barOpen, barHud };

    const domWidget = node.addDOMWidget("c3ds_unified_panel", "control_panel", panelWrapper, {
        serialize: false,
        hideOnZoom: false
    });
    node.c3dsDomWidget = domWidget;
    domWidget.computeSize = (width) => [width || (node.size ? node.size[0] : 360), node.isCollapsedParams ? 28 : 118];

    renderDropdownOptions();
    syncPath();
}

async function triggerManualSave(node, barSave, saveLeftText, saveRightText) {
    const getWidgetVal = (prefix) => {
        const w = node.widgets?.find(x => x.name === prefix || x.name.startsWith(prefix));
        return w ? w.value : undefined;
    };

    const target_path = (node.properties?.paths_list?.[node.properties?.selected_idx || 0]) || "output/Crazy3DS_Saves";

    const payload = {
        node_id: String(node.id),
        format: getWidgetVal("format") || "JPG",
        filename: getWidgetVal("filename") || "",
        quality: getWidgetVal("quality") ?? 100,
        anti_fingerprint: getWidgetVal("anti_fingerprint") ?? false,
        save_workflow: getWidgetVal("save_workflow") ?? true,
        target_path: target_path
    };

    if (node.hudTitleElement) {
        node.hudTitleElement.innerText = "正在保存中...";
        if (node.hudSpecsElement) node.hudSpecsElement.innerText = "";
    }
    node.manualSaveState = "saving";
    node.setDirtyCanvas(true, true);

    try {
        const res = await api.fetchApi("/crazy3ds/manual_save", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload)
        });
        const result = await res.json();
        if (result.success) {
            node.c3dsOverallHud = result.hud_text;
            node.c3dsItemsHud = result.items_hud || [];

            node.properties = node.properties || {};
            node.properties.c3ds_overall_hud = node.c3dsOverallHud;
            node.properties.c3ds_items_hud = node.c3dsItemsHud;
            node.properties.c3ds_cached_hud = node.c3dsOverallHud;
            refreshNodeHudText(node);

            node.manualSaveState = "success";
            if (barSave) {
                barSave.style.background = "#2e7d32";
                barSave.style.borderColor = "#4caf50";
                barSave.innerHTML = '<span style="width:100%;text-align:center;color:#ffffff;font-size:13px;font-weight:bold;font-family:-apple-system,BlinkMacSystemFont,sans-serif;">✓ 保 存 成 功 ！</span>';
            }

            setTimeout(() => {
                node.manualSaveState = null;
                if (barSave && saveLeftText && saveRightText) {
                    barSave.style.background = "#7b3737";
                    barSave.style.borderColor = "#944444";
                    barSave.innerHTML = "";
                    barSave.appendChild(saveLeftText);
                    barSave.appendChild(saveRightText);
                }
                node.setDirtyCanvas(true, true);
            }, 1800);
        } else {
            node.manualSaveState = null;
            alert(result.message || "保存失败");
            if (node.hudTitleElement) {
                node.hudTitleElement.innerText = result.message || "保存失败";
                if (node.hudSpecsElement) node.hudSpecsElement.innerText = "";
            }
        }
    } catch (err) {
        node.manualSaveState = null;
        alert("服务请求异常: " + err);
        if (node.hudTitleElement) {
            node.hudTitleElement.innerText = "保存异常";
            if (node.hudSpecsElement) node.hudSpecsElement.innerText = "";
        }
    }
    node.setDirtyCanvas(true, true);
}

app.registerExtension({
    name: "Crazy3DS.PureImageSaver.FinalPixelPerfectClean",
    async beforeRegisterNodeDef(nodeType, nodeData, app) {
        if (nodeData.name !== "Crazy3DS_SaveImage") return;

        const origCreated = nodeType.prototype.onNodeCreated;
        nodeType.prototype.onNodeCreated = function () {
            const r = origCreated ? origCreated.apply(this, arguments) : undefined;
            const savedState = this.properties?.is_collapsed_params ?? getNodeCollapseState(this.id);
            this.isCollapsedParams = !!savedState;

            this.properties = this.properties || {};
            this.properties.privacy_mode = !!this.properties.privacy_mode;

            if (this.properties?.c3ds_overall_hud) this.c3dsOverallHud = this.properties.c3ds_overall_hud;
            if (this.properties?.c3ds_items_hud) this.c3dsItemsHud = this.properties.c3ds_items_hud;
            if (typeof this.properties?.c3ds_active_img_idx === "number") {
                this.imageIndex = this.properties.c3ds_active_img_idx;
                this.c3dsActiveImgIdx = this.properties.c3ds_active_img_idx;
            }

            setupUnifiedControlPanel(this);
            if (this.isCollapsedParams) applyCollapseParams(this, true, true);
            return r;
        };

        const origConfigure = nodeType.prototype.onConfigure;
        nodeType.prototype.onConfigure = function (info) {
            const r = origConfigure ? origConfigure.apply(this, arguments) : undefined;
            const savedState = this.properties?.is_collapsed_params ?? getNodeCollapseState(this.id);
            applyCollapseParams(this, !!savedState, true);

            this.properties = this.properties || {};
            this.properties.privacy_mode = !!this.properties.privacy_mode;

            if (this.properties.privacy_mode && this.imgs && this.imgs.length) {
                this._c3ds_backup_imgs = this.imgs;
                this.imgs = null;
            }

            if (this.properties?.c3ds_overall_hud) this.c3dsOverallHud = this.properties.c3ds_overall_hud;
            if (this.properties?.c3ds_items_hud) this.c3dsItemsHud = this.properties.c3ds_items_hud;
            if (typeof this.properties?.c3ds_active_img_idx === "number") {
                this.imageIndex = this.properties.c3ds_active_img_idx;
                this.c3dsActiveImgIdx = this.properties.c3ds_active_img_idx;
                this._c3ds_needs_restore_idx = this.properties.c3ds_active_img_idx;
            }
            refreshNodeHudText(this);
            return r;
        };

        const origDrawForeground = nodeType.prototype.onDrawForeground;
        nodeType.prototype.onDrawForeground = function (ctx, canvas) {
            if (this.properties?.privacy_mode && this.imgs && this.imgs.length) {
                this._c3ds_backup_imgs = this.imgs;
                this.imgs = null;
            }

            if (origDrawForeground) origDrawForeground.apply(this, arguments);
            if (this.flags?.collapsed) return;

            if (typeof this._c3ds_needs_restore_idx === "number") {
                if (this.imgs && this.imgs.length > this._c3ds_needs_restore_idx) {
                    this.imageIndex = this._c3ds_needs_restore_idx;
                    this.c3dsActiveImgIdx = this._c3ds_needs_restore_idx;
                    delete this._c3ds_needs_restore_idx;
                    refreshNodeHudText(this);
                }
            }

            const curIdx = (typeof this.imageIndex === "number" && this.imageIndex >= 0) ? this.imageIndex : null;
            if (curIdx !== this._c3ds_last_detected_idx) {
                this._c3ds_last_detected_idx = curIdx;
                this.c3dsActiveImgIdx = curIdx;
                this.properties = this.properties || {};
                this.properties.c3ds_active_img_idx = curIdx;
                refreshNodeHudText(this);
            }

            const titleH = this.title_height || 30;
            const btnW = 20;
            const btnH = 18;
            const collapseBtnX = this.size[0] - btnW - 8;
            const collapseBtnY = -titleH + (titleH - btnH) / 2;
            const saveBtnX = collapseBtnX - btnW - 4;
            const saveBtnY = collapseBtnY;
            const eyeBtnX = saveBtnX - btnW - 4;
            const eyeBtnY = collapseBtnY;

            ctx.save();

            // 绘制 [👁/🙈] 隐私防窥按钮
            ctx.beginPath();
            if (ctx.roundRect) ctx.roundRect(eyeBtnX, eyeBtnY, btnW, btnH, 3);
            else ctx.rect(eyeBtnX, eyeBtnY, btnW, btnH);

            const isPrivacy = !!this.properties?.privacy_mode;
            ctx.fillStyle = isPrivacy ? "#7b3737" : (this._eyeBtnHover ? "#2a2a2a" : "#1e1e1e");
            ctx.fill();
            ctx.strokeStyle = isPrivacy ? "#944444" : (this._eyeBtnHover ? "#7b3737" : "#383838");
            ctx.lineWidth = 1;
            ctx.stroke();

            ctx.fillStyle = isPrivacy ? "#ffffff" : (this._eyeBtnHover ? "#e5b9b9" : "#b35050");
            ctx.font = "bold 11px -apple-system, BlinkMacSystemFont, sans-serif";
            ctx.textAlign = "center";
            ctx.textBaseline = "middle";
            ctx.fillText(isPrivacy ? "🙈" : "👁", eyeBtnX + btnW / 2, eyeBtnY + btnH / 2);

            // 绘制 [存] 按钮
            ctx.beginPath();
            if (ctx.roundRect) ctx.roundRect(saveBtnX, saveBtnY, btnW, btnH, 3);
            else ctx.rect(saveBtnX, saveBtnY, btnW, btnH);

            const isSaveSuccess = this.manualSaveState === "success";
            const isSaving = this.manualSaveState === "saving";

            ctx.fillStyle = isSaveSuccess ? "#2e7d32" : (this._saveBtnHover ? "#2a2a2a" : "#1e1e1e");
            ctx.fill();
            ctx.strokeStyle = isSaveSuccess ? "#4caf50" : (this._saveBtnHover ? "#7b3737" : "#383838");
            ctx.lineWidth = 1;
            ctx.stroke();

            ctx.fillStyle = isSaveSuccess ? "#ffffff" : (this._saveBtnHover ? "#e5b9b9" : "#b35050");
            ctx.font = "bold 11px -apple-system, BlinkMacSystemFont, sans-serif";
            ctx.textAlign = "center";
            ctx.textBaseline = "middle";

            let saveText = "存";
            if (isSaveSuccess) saveText = "✓";
            else if (isSaving) saveText = "...";
            ctx.fillText(saveText, saveBtnX + btnW / 2, saveBtnY + btnH / 2);

            // 绘制 [▲/▼] 折叠按钮
            ctx.beginPath();
            if (ctx.roundRect) ctx.roundRect(collapseBtnX, collapseBtnY, btnW, btnH, 3);
            else ctx.rect(collapseBtnX, collapseBtnY, btnW, btnH);

            ctx.fillStyle = this._collapseBtnHover ? "#2a2a2a" : "#1e1e1e";
            ctx.fill();
            ctx.strokeStyle = this._collapseBtnHover ? "#7b3737" : "#383838";
            ctx.lineWidth = 1;
            ctx.stroke();

            ctx.fillStyle = this._collapseBtnHover ? "#e5b9b9" : "#b35050";
            ctx.font = "bold 11px -apple-system, BlinkMacSystemFont, sans-serif";
            ctx.textAlign = "center";
            ctx.textBaseline = "middle";
            ctx.fillText(this.isCollapsedParams ? "▼" : "▲", collapseBtnX + btnW / 2, collapseBtnY + btnH / 2);

            // 防窥视口卡片
            if (this.properties?.privacy_mode) {
                const maskX = 6;
                const panelH = this.isCollapsedParams ? 28 : 118;
                let maskY = (this.c3dsDomWidget && typeof this.c3dsDomWidget.y === "number" && this.c3dsDomWidget.y > 0)
                    ? (this.c3dsDomWidget.y + panelH + 6)
                    : (this.isCollapsedParams ? 40 : 266);

                const maskW = Math.max(60, this.size[0] - 12);
                const maskH = Math.max(0, this.size[1] - maskY - 6);

                if (maskH > 24) {
                    ctx.beginPath();
                    if (ctx.roundRect) ctx.roundRect(maskX, maskY, maskW, maskH, 3);
                    else ctx.rect(maskX, maskY, maskW, maskH);

                    ctx.fillStyle = "#131313";
                    ctx.fill();
                    ctx.strokeStyle = "#2c2c2c";
                    ctx.lineWidth = 1;
                    ctx.stroke();

                    const centerX = maskX + maskW / 2;
                    const centerY = maskY + maskH / 2;

                    ctx.fillStyle = "#ffffff";
                    ctx.font = "30px -apple-system, BlinkMacSystemFont, sans-serif";
                    ctx.textAlign = "center";
                    ctx.textBaseline = "middle";
                    ctx.fillText("🙈", centerX, centerY - 18);

                    ctx.fillStyle = "#fca5a5";
                    ctx.font = "bold 12.5px -apple-system, BlinkMacSystemFont, sans-serif";
                    ctx.fillText("屏幕防窥保护中", centerX, centerY + 18);

                    ctx.fillStyle = "#777777";
                    ctx.font = "9.5px -apple-system, BlinkMacSystemFont, sans-serif";
                    ctx.fillText("（后台保存与推理不受影响）", centerX, centerY + 34);
                }
            }

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
                const saveBtnX = collapseBtnX - btnW - 4;
                const saveBtnY = collapseBtnY;
                const eyeBtnX = saveBtnX - btnW - 4;
                const eyeBtnY = collapseBtnY;

                if (local_pos[0] >= collapseBtnX - 3 && local_pos[0] <= collapseBtnX + btnW + 3 &&
                    local_pos[1] >= collapseBtnY - 3 && local_pos[1] <= collapseBtnY + btnH + 3) {
                    toggleCollapseParams(this);
                    return true;
                }

                if (local_pos[0] >= saveBtnX - 3 && local_pos[0] <= saveBtnX + btnW + 3 &&
                    local_pos[1] >= saveBtnY - 3 && local_pos[1] <= saveBtnY + btnH + 3) {
                    const bSave = this.c3dsBars?.barSave;
                    const sLeft = bSave?.children?.[0];
                    const sRight = bSave?.children?.[1];
                    triggerManualSave(this, bSave, sLeft, sRight);
                    return true;
                }

                if (local_pos[0] >= eyeBtnX - 3 && local_pos[0] <= eyeBtnX + btnW + 3 &&
                    local_pos[1] >= eyeBtnY - 3 && local_pos[1] <= eyeBtnY + btnH + 3) {
                    this.properties = this.properties || {};
                    this.properties.privacy_mode = !this.properties.privacy_mode;

                    if (this.properties.privacy_mode) {
                        if (this.imgs && this.imgs.length) {
                            this._c3ds_backup_imgs = this.imgs;
                            this.imgs = null;
                        }
                    } else {
                        if (this._c3ds_backup_imgs) {
                            this.imgs = this._c3ds_backup_imgs;
                        }
                    }

                    this.setDirtyCanvas(true, true);
                    return true;
                }

                if (this.properties?.privacy_mode) {
                    const panelH = this.isCollapsedParams ? 28 : 118;
                    const maskY = (this.c3dsDomWidget && typeof this.c3dsDomWidget.y === "number" && this.c3dsDomWidget.y > 0)
                        ? (this.c3dsDomWidget.y + panelH + 6)
                        : (this.isCollapsedParams ? 40 : 266);
                    if (local_pos[1] >= maskY) return true;
                }
            }
            return origMouseDown ? origMouseDown.apply(this, arguments) : undefined;
        };

        const origMouseUp = nodeType.prototype.onMouseUp;
        nodeType.prototype.onMouseUp = function (e, local_pos, canvas) {
            const r = origMouseUp ? origMouseUp.apply(this, arguments) : undefined;
            setTimeout(() => refreshNodeHudText(this), 30);
            return r;
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
                const saveBtnX = collapseBtnX - btnW - 4;
                const saveBtnY = collapseBtnY;
                const eyeBtnX = saveBtnX - btnW - 4;
                const eyeBtnY = collapseBtnY;

                const isCollapseOver = local_pos[0] >= collapseBtnX - 2 && local_pos[0] <= collapseBtnX + btnW + 2 &&
                                       local_pos[1] >= collapseBtnY - 2 && local_pos[1] <= collapseBtnY + btnH + 2;
                const isSaveOver = local_pos[0] >= saveBtnX - 2 && local_pos[0] <= saveBtnX + btnW + 2 &&
                                   local_pos[1] >= saveBtnY - 2 && local_pos[1] <= saveBtnY + btnH + 2;
                const isEyeOver = local_pos[0] >= eyeBtnX - 2 && local_pos[0] <= eyeBtnX + btnW + 2 &&
                                  local_pos[1] >= eyeBtnY - 2 && local_pos[1] <= eyeBtnY + btnH + 2;

                let dirty = false;
                if (isCollapseOver !== this._collapseBtnHover) { this._collapseBtnHover = isCollapseOver; dirty = true; }
                if (isSaveOver !== this._saveBtnHover) { this._saveBtnHover = isSaveOver; dirty = true; }
                if (isEyeOver !== this._eyeBtnHover) { this._eyeBtnHover = isEyeOver; dirty = true; }

                if (dirty) {
                    if (canvas && canvas.canvas) {
                        if (isCollapseOver) {
                            canvas.canvas.title = this.isCollapsedParams ? "【展开面板】显示保存参数与高级配置" : "【折叠面板】纯享大图预览模式";
                        } else if (isSaveOver) {
                            canvas.canvas.title = "【一键保存】快速将当前全部预览图像写入硬盘目标路径";
                        } else if (isEyeOver) {
                            canvas.canvas.title = this.properties?.privacy_mode ? "【退出防窥】恢复图像预览" : "【防窥保护】遮蔽图像视口（后台保存与推理不受影响）";
                        } else {
                            canvas.canvas.title = "";
                        }
                    }
                    this.setDirtyCanvas(true, true);
                } else if (!isCollapseOver && !isSaveOver && !isEyeOver) {
                    // 坐标命中匹配：动态检测并呈现 7 个原生参数 Widget 的专属悬停提示
                    if (!this.isCollapsedParams && this.widgets && canvas && canvas.canvas) {
                        let matchedTooltip = "";
                        const mx = local_pos[0];
                        const my = local_pos[1];
                        const marginX = 10;
                        const wWidth = this.size[0] - marginX * 2;

                        for (const w of this.widgets) {
                            if (w.hidden || w.type === "hidden") continue;
                            const wy = w.last_y !== undefined ? w.last_y : w.y;
                            const wh = (w.computeSize ? w.computeSize(wWidth)[1] : 20) || 20;

                            if (wy !== undefined && mx >= marginX && mx <= marginX + wWidth && my >= wy && my <= wy + wh) {
                                matchedTooltip = getNativeWidgetTooltip(w.name);
                                break;
                            }
                        }

                        if (matchedTooltip) {
                            canvas.canvas.title = matchedTooltip;
                        } else if (canvas.canvas.title && !canvas.canvas.title.startsWith("【")) {
                            canvas.canvas.title = "";
                        }
                    }
                }
            }
            if (origMouseMove) return origMouseMove.apply(this, arguments);
        };

        const origMouseLeave = nodeType.prototype.onMouseLeave;
        nodeType.prototype.onMouseLeave = function () {
            let dirty = false;
            if (this._collapseBtnHover) { this._collapseBtnHover = false; dirty = true; }
            if (this._saveBtnHover) { this._saveBtnHover = false; dirty = true; }
            if (this._eyeBtnHover) { this._eyeBtnHover = false; dirty = true; }
            if (dirty) this.setDirtyCanvas(true, true);
            if (origMouseLeave) return origMouseLeave.apply(this, arguments);
        };

        const origExec = nodeType.prototype.onExecuted;
        nodeType.prototype.onExecuted = function (msg) {
            if (origExec) origExec.apply(this, arguments);

            const previewSwitch = this.widgets.find(w => w.name && w.name.startsWith("enable_preview"));
            if (!previewSwitch?.value || !msg?.c3ds_hud) {
                if (this.hudTitleElement) {
                    this.hudTitleElement.innerText = "预览已关闭";
                    this.hudTitleElement.title = "【当前状态】预览已关闭";
                    if (this.hudSpecsElement) this.hudSpecsElement.innerText = "";
                }
                this.imgs = [];
                this._c3ds_backup_imgs = null;
                this.c3dsOverallHud = "";
                this.c3dsItemsHud = [];
                this.c3dsActiveImgIdx = null;
                this.properties = this.properties || {};
                this.properties.c3ds_overall_hud = "";
                this.properties.c3ds_items_hud = [];
                this.properties.c3ds_cached_hud = "预览已关闭";
                this.properties.c3ds_active_img_idx = null;
                this.setSize([this.size[0], this.computeSize()[1]]);
            } else {
                if (this.properties?.privacy_mode) {
                    if (this.imgs && this.imgs.length) {
                        this._c3ds_backup_imgs = this.imgs;
                        this.imgs = null;
                    }
                }

                this._c3ds_exec_time = new Date();
                this.c3dsOverallHud = msg.c3ds_hud ? msg.c3ds_hud[0] : "";
                this.c3dsItemsHud = msg.c3ds_items_hud ? [...msg.c3ds_items_hud] : [];

                this.c3dsActiveImgIdx = null;
                this.properties = this.properties || {};
                this.properties.c3ds_overall_hud = this.c3dsOverallHud;
                this.properties.c3ds_items_hud = this.c3dsItemsHud;
                this.properties.c3ds_cached_hud = this.c3dsOverallHud;
                this.properties.c3ds_active_img_idx = null;
                refreshNodeHudText(this);
            }
            this.setDirtyCanvas(true, true);
        };
    }
});