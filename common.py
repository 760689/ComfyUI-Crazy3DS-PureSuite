import os
import sys
import json
import subprocess
import folder_paths
from server import PromptServer
from aiohttp import web

# 全局共享路径配置文件
CONFIG_FILE = os.path.join(os.path.dirname(__file__), "paths_config.json")

def load_global_paths():
    """从磁盘读取全局持久化路径"""
    if os.path.exists(CONFIG_FILE):
        try:
            with open(CONFIG_FILE, "r", encoding="utf-8") as f:
                data = json.load(f)
                if isinstance(data, list) and len(data) > 0:
                    return data
        except Exception:
            pass
    return ["output/Crazy3DS_Saves"]

def save_global_paths(paths):
    """全局路径持久化到磁盘"""
    try:
        with open(CONFIG_FILE, "w", encoding="utf-8") as f:
            json.dump(paths, f, ensure_ascii=False, indent=2)
        return True
    except Exception:
        return False

def calculate_aspect_ratio(w, h):
    """画幅比例自适应计算"""
    if h == 0: return "--"
    r = w / h
    standards = [
        (1.0, "1:1"),
        (16/9, "16:9"), (9/16, "9:16"),
        (4/3, "4:3"), (3/4, "3:4"),
        (3/2, "3:2"), (2/3, "2:3"),
        (2.35, "2.35:1"), (1/2.35, "1:2.35"),
        (4/5, "4:5"), (5/4, "5:4")
    ]
    for std_val, label in standards:
        if abs(r - std_val) / std_val < 0.035:
            return label
    return f"1:{h/w:.2f}" if w < h else f"{w/h:.2f}:1"

# =====================================================================
# 公共后端 API：路径获取/保存、系统资源管理器唤起
# =====================================================================
try:
    routes = PromptServer.instance.routes

    if not any(r.path == "/crazy3ds/get_paths" for r in routes):
        @routes.get("/crazy3ds/get_paths")
        async def get_paths_handler(request):
            return web.json_response({"paths": load_global_paths()})

    if not any(r.path == "/crazy3ds/save_paths" for r in routes):
        @routes.post("/crazy3ds/save_paths")
        async def save_paths_handler(request):
            try:
                data = await request.json()
                paths = data.get("paths", [])
                if isinstance(paths, list) and len(paths) > 0:
                    save_global_paths(paths)
                    return web.json_response({"success": True})
                return web.json_response({"success": False, "message": "无效路径格式"}, status=400)
            except Exception as e:
                return web.json_response({"success": False, "message": str(e)}, status=500)

    if not any(r.path == "/crazy3ds/open_folder" for r in routes):
        @routes.post("/crazy3ds/open_folder")
        async def open_folder_handler(request):
            try:
                data = await request.json()
                target_path = data.get("target_path", "").strip()
                base_out = folder_paths.get_output_directory()
                if not target_path:
                    target_path = base_out
                elif not os.path.isabs(target_path):
                    target_path = os.path.join(base_out, target_path)

                os.makedirs(target_path, exist_ok=True)

                if os.name == "nt":
                    os.startfile(target_path)
                elif sys.platform == "darwin":
                    subprocess.Popen(["open", target_path])
                else:
                    subprocess.Popen(["xdg-open", target_path])

                return web.json_response({"success": True})
            except Exception as e:
                return web.json_response({"success": False, "message": str(e)}, status=500)
except Exception:
    pass