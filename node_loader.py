import os
import io
import json
import asyncio
import ctypes
from ctypes import wintypes
import hashlib
import numpy as np
from PIL import Image, ImageOps
import torch
import folder_paths
from server import PromptServer
from aiohttp import web

LOAD_CONFIG_FILE = os.path.join(os.path.dirname(__file__), "load_paths_config.json")
THUMB_CACHE = {}
PREVIEW_CACHE = {}
VALID_EXTENSIONS = {'.png', '.jpg', '.jpeg', '.webp', '.bmp', '.tiff', '.tif'}

def load_global_load_paths():
    if os.path.exists(LOAD_CONFIG_FILE):
        try:
            with open(LOAD_CONFIG_FILE, "r", encoding="utf-8") as f:
                data = json.load(f)
                if isinstance(data, list) and len(data) > 0:
                    return data[:19]
        except Exception:
            pass
    return ["input"]

def save_global_load_paths(paths):
    try:
        clean = paths[:19] if isinstance(paths, list) else ["input"]
        with open(LOAD_CONFIG_FILE, "w", encoding="utf-8") as f:
            json.dump(clean, f, ensure_ascii=False, indent=2)
        return True
    except Exception:
        return False

def choose_system_files_win32(initial_dir=""):
    if os.name != "nt":
        return None, []

    orig_cwd = os.getcwd()
    try:
        class OPENFILENAMEW(ctypes.Structure):
            _fields_ = [
                ("lStructSize", wintypes.DWORD),
                ("hwndOwner", wintypes.HWND),
                ("hInstance", wintypes.HINSTANCE),
                ("lpstrFilter", wintypes.LPCWSTR),
                ("lpstrCustomFilter", wintypes.LPWSTR),
                ("nMaxCustFilter", wintypes.DWORD),
                ("nFilterIndex", wintypes.DWORD),
                ("lpstrFile", wintypes.LPWSTR),
                ("nMaxFile", wintypes.DWORD),
                ("lpstrFileTitle", wintypes.LPWSTR),
                ("nMaxFileTitle", wintypes.DWORD),
                ("lpstrInitialDir", wintypes.LPCWSTR),
                ("lpstrTitle", wintypes.LPCWSTR),
                ("Flags", wintypes.DWORD),
                ("nFileOffset", wintypes.WORD),
                ("nFileExtension", wintypes.WORD),
                ("lpstrDefExt", wintypes.LPCWSTR),
                ("lCustData", wintypes.LPARAM),
                ("lpfnHook", ctypes.c_void_p),
                ("lpTemplateName", wintypes.LPCWSTR),
                ("pvReserved", ctypes.c_void_p),
                ("dwReserved", wintypes.DWORD),
                ("FlagsEx", wintypes.DWORD)
            ]

        buffer = ctypes.create_unicode_buffer(131072)
        ofn = OPENFILENAMEW()
        ofn.lStructSize = ctypes.sizeof(OPENFILENAMEW)
        ofn.hwndOwner = ctypes.windll.user32.GetForegroundWindow()
        ofn.lpstrFilter = "图像文件 (*.jpg;*.png;*.webp;*.bmp;*.tiff)\0*.jpg;*.jpeg;*.png;*.webp;*.bmp;*.tiff;*.tif\0所有文件 (*.*)\0*.*\0\0"
        ofn.lpstrFile = ctypes.cast(buffer, wintypes.LPWSTR)
        ofn.nMaxFile = 131072
        if initial_dir and os.path.exists(initial_dir):
            ofn.lpstrInitialDir = os.path.normpath(initial_dir)
        ofn.lpstrTitle = "Crazy3DS - 选择素材图片 (支持跨目录多选追加)"
        # 0x00000008: OFN_NOCHANGEDIR (彻底杜绝系统底层将 Python 工作目录锁定在 U 盘)
        # 0x00000200: OFN_ALLOWMULTISELECT | 0x00080000: OFN_EXPLORER | 0x00001000: OFN_FILEMUSTEXIST | 0x00000800: OFN_PATHMUSTEXIST
        ofn.Flags = 0x00000200 | 0x00080000 | 0x00001000 | 0x00000800 | 0x00000008

        if ctypes.windll.comdlg32.GetOpenFileNameW(ctypes.byref(ofn)):
            raw = buffer[:]
            parts = [p for p in raw.split('\x00') if p]
            if len(parts) == 1:
                return os.path.normpath(os.path.dirname(parts[0])), [os.path.basename(parts[0])]
            elif len(parts) > 1:
                return os.path.normpath(parts[0]), parts[1:]
    except Exception as e:
        print(f"[Crazy3DS_LoadImage] Dialog Error: {e}")
    finally:
        try:
            os.chdir(orig_cwd)
        except Exception:
            pass

    return None, []

def choose_folder_win32(initial_dir=""):
    if os.name != "nt":
        return None
    orig_cwd = os.getcwd()
    try:
        shell32 = ctypes.windll.shell32
        ole32 = ctypes.windll.ole32

        class BROWSEINFOW(ctypes.Structure):
            _fields_ = [
                ("hwndOwner", wintypes.HWND),
                ("pidlRoot", ctypes.c_void_p),
                ("pszDisplayName", wintypes.LPWSTR),
                ("lpszTitle", wintypes.LPCWSTR),
                ("ulFlags", wintypes.UINT),
                ("lpfn", ctypes.c_void_p),
                ("lParam", wintypes.LPARAM),
                ("iImage", ctypes.c_int)
            ]

        BIF_RETURNONLYFSDIRS = 0x00000001
        BIF_NEWDIALOGSTYLE = 0x00000040
        BIF_EDITBOX = 0x00000010

        shell32.SHBrowseForFolderW.restype = ctypes.c_void_p
        shell32.SHBrowseForFolderW.argtypes = [ctypes.POINTER(BROWSEINFOW)]
        shell32.SHGetPathFromIDListW.restype = wintypes.BOOL
        shell32.SHGetPathFromIDListW.argtypes = [ctypes.c_void_p, wintypes.LPWSTR]
        ole32.CoTaskMemFree.restype = None
        ole32.CoTaskMemFree.argtypes = [ctypes.c_void_p]

        buffer = ctypes.create_unicode_buffer(1024)
        bi = BROWSEINFOW()
        bi.hwndOwner = ctypes.windll.user32.GetForegroundWindow()
        bi.pszDisplayName = ctypes.cast(buffer, wintypes.LPWSTR)
        bi.lpszTitle = "Crazy3DS - 选择自定义素材路径目录"
        bi.ulFlags = BIF_RETURNONLYFSDIRS | BIF_NEWDIALOGSTYLE | BIF_EDITBOX

        pidl = shell32.SHBrowseForFolderW(ctypes.byref(bi))
        if pidl:
            path_buf = ctypes.create_unicode_buffer(32768)
            success = shell32.SHGetPathFromIDListW(pidl, path_buf)
            ole32.CoTaskMemFree(pidl)
            if success and path_buf.value:
                res = path_buf.value
                if os.path.exists(res):
                    return os.path.normpath(res)
    except Exception as e:
        print(f"[Crazy3DS_LoadImage] Folder Dialog Error: {e}")
    finally:
        try:
            os.chdir(orig_cwd)
        except Exception:
            pass

    # 后备机制：PowerShell
    try:
        import subprocess
        ps_cmd = (
            "[System.Reflection.Assembly]::LoadWithPartialName('System.windows.forms') | Out-Null; "
            "$f = New-Object System.Windows.Forms.FolderBrowserDialog; "
            "$f.Description = 'Crazy3DS - 选择自定义素材路径目录'; "
            "$f.ShowNewFolderButton = $true; "
            "if($f.ShowDialog() -eq [System.Windows.Forms.DialogResult]::OK){ Write-Output $f.SelectedPath }"
        )
        res = subprocess.check_output(["powershell", "-NoProfile", "-NonInteractive", "-Command", ps_cmd], text=True, timeout=60).strip()
        if res and os.path.exists(res):
            return os.path.normpath(res)
    except Exception as pe:
        print(f"[Crazy3DS_LoadImage] PowerShell fallback error: {pe}")
    finally:
        try:
            os.chdir(orig_cwd)
        except Exception:
            pass

    return None

def safe_read_image(path):
    """通过纯内存缓冲加载图片，读完二进制流立即释放磁盘句柄，绝不占用/锁定外置设备与 U 盘"""
    with open(path, "rb") as f:
        data = f.read()
    bio = io.BytesIO(data)
    img = Image.open(bio)
    img.load()
    return img

def process_single_image(img_path, crop_data=None, rotation=0, flip_h=False, flip_v=False):
    img = safe_read_image(img_path)
    img = ImageOps.exif_transpose(img)
    if flip_h: img = img.transpose(Image.FLIP_LEFT_RIGHT)
    if flip_v: img = img.transpose(Image.FLIP_TOP_BOTTOM)
    if rotation in (90, 180, 270):
        img = img.rotate(-rotation, expand=True)

    if crop_data and len(crop_data) == 4:
        iw, ih = img.size
        cx, cy, cw, ch = crop_data
        left = max(0, int(cx * iw))
        top = max(0, int(cy * ih))
        right = min(iw, int((cx + cw) * iw))
        bottom = min(ih, int((cy + ch) * ih))
        if right > left and bottom > top:
            img = img.crop((left, top, right, bottom))
    return img

def image_to_tensor_and_mask(img):
    if "A" in img.getbands():
        mask = np.array(img.getchannel("A")).astype(np.float32) / 255.0
        mask = 1.0 - mask
    else:
        mask = np.zeros((img.height, img.width), dtype=np.float32)

    if img.mode != "RGB":
        rgb_img = Image.new("RGB", img.size, (255, 255, 255))
        if "A" in img.getbands():
            rgb_img.paste(img, mask=img.getchannel("A"))
        else:
            rgb_img.paste(img)
        img = rgb_img

    img_np = np.array(img).astype(np.float32) / 255.0
    return torch.from_numpy(img_np)[None,], torch.from_numpy(mask)[None,]

def load_entire_directory_as_list(dir_path):
    p = os.path.normpath(dir_path.strip()) if dir_path else ""
    if p and not os.path.isabs(p):
        p = os.path.join(folder_paths.get_output_directory(), p)

    if not p or not os.path.isdir(p):
        blank = Image.new("RGB", (512, 512), (32, 32, 32))
        t_img, t_mask = image_to_tensor_and_mask(blank)
        return [t_img], [t_mask]

    try:
        files = [f for f in os.listdir(p) if os.path.splitext(f)[1].lower() in VALID_EXTENSIONS]
        files.sort()
    except Exception:
        files = []

    if not files:
        blank = Image.new("RGB", (512, 512), (32, 32, 32))
        t_img, t_mask = image_to_tensor_and_mask(blank)
        return [t_img], [t_mask]

    img_tensors, mask_tensors = [], []
    for f in files:
        full_p = os.path.join(p, f)
        try:
            im = safe_read_image(full_p)
            im = ImageOps.exif_transpose(im)
            t_im, t_m = image_to_tensor_and_mask(im)
            img_tensors.append(t_im)
            mask_tensors.append(t_m)
        except Exception:
            continue

    if not img_tensors:
        blank = Image.new("RGB", (512, 512), (32, 32, 32))
        t_img, t_mask = image_to_tensor_and_mask(blank)
        return [t_img], [t_mask]

    return img_tensors, mask_tensors

class Crazy3DS_LoadImage:
    def __init__(self):
        self.type = "input"

    @classmethod
    def INPUT_TYPES(s):
        return {
            "required": {
                "target_path": ("STRING", {"default": "input"}),
                "folder_direct": ("BOOLEAN", {"default": False}),
                "mode": (["Single \u5355\u56fe\u6a21\u5f0f", "Multi \u591a\u56fe\u6a21\u5f0f"], {"default": "Single \u5355\u56fe\u6a21\u5f0f"}),
                "multi_flow": (["List \u5217\u8868\u6a21\u5f0f", "Batch \u6279\u91cf\u5408\u5e76"], {"default": "List \u5217\u8868\u6a21\u5f0f"}),
                "selected_index": ("INT", {"default": 0, "min": 0, "max": 999999, "step": 1}),
                "selected_files": ("STRING", {"default": "[]"}),
                "queue_index": ("INT", {"default": 0, "min": 0, "max": 999999, "step": 1}),
                "filename": ("STRING", {"default": ""}),
            },
            "hidden": {
                "unique_id": "UNIQUE_ID"
            }
        }

    RETURN_TYPES = ("IMAGE", "MASK")
    RETURN_NAMES = ("images", "mask")
    OUTPUT_IS_LIST = (True, True)
    FUNCTION = "execute"
    CATEGORY = "Crazy3DS/IO"

    @classmethod
    def IS_CHANGED(cls, target_path, folder_direct, mode, multi_flow, selected_index, selected_files, **kwargs):
        """
        像素级纯净缓存指纹计算：
        彻底忽略 target_path、filename 等辅助控件的变动，不把前端随机 ID 纳入计算。
        仅当当前实际输出图像的物理文件路径、修改时间（mtime）、裁剪或旋转镜像改变时才更新。
        在单图模式下切换历史路径或点击无关参数，只要输出的图片没变，下游反推与抽卡 100% 命中缓存！
        """
        if folder_direct:
            p = os.path.normpath(target_path.strip()) if target_path else ""
            if p and not os.path.isabs(p):
                p = os.path.join(folder_paths.get_output_directory(), p)
            if not p or not os.path.isdir(p):
                return "missing_dir"
            try:
                stats = []
                for f in sorted(os.listdir(p)):
                    if os.path.splitext(f)[1].lower() in VALID_EXTENSIONS:
                        fp = os.path.join(p, f)
                        stats.append(f"{f}_{os.path.getmtime(fp)}")
                return hashlib.md5(";".join(stats).encode("utf-8")).hexdigest()
            except Exception:
                return "error_dir"

        try:
            items = json.loads(selected_files) if (selected_files and selected_files.strip()) else []
        except Exception:
            items = []

        if not items:
            return "empty_pool"

        is_multi = str(mode).startswith("Multi")
        is_batch = str(multi_flow).startswith("Batch")

        # 准确提取当前实际输出的条目列表，忽略画廊中未被选中的多余素材
        if is_multi:
            target_items = items
        else:
            idx = min(max(0, int(selected_index)), len(items) - 1)
            target_items = [items[idx]]

        tokens = [str(is_multi), str(is_batch)]
        for it in target_items:
            if isinstance(it, dict):
                # 剥离前端生成的时间戳随机 id，只锁定实际物理文件路径
                ed_path = it.get("edited_path")
                ed_name = it.get("edited_name")
                if ed_path and ed_name:
                    full_p = os.path.normpath(os.path.join(ed_path, ed_name))
                else:
                    full_p = os.path.normpath(os.path.join(it.get("path", ""), it.get("name", "")))
                
                crop_data = str(it.get("crop"))
                rot = str(it.get("rot", 0))
                flip_h = str(it.get("flip_h", False))
                flip_v = str(it.get("flip_v", False))
            else:
                p = os.path.normpath(target_path.strip()) if target_path else ""
                if not os.path.isabs(p):
                    p = os.path.join(folder_paths.get_output_directory(), p)
                full_p = os.path.normpath(os.path.join(p, str(it)))
                crop_data, rot, flip_h, flip_v = "None", "0", "False", "False"

            mtime = os.path.getmtime(full_p) if os.path.exists(full_p) else 0
            tokens.append(f"{full_p}_{mtime}_{crop_data}_{rot}_{flip_h}_{flip_v}")

        return hashlib.md5(";".join(tokens).encode("utf-8")).hexdigest()

    def execute(self, target_path, folder_direct, mode, multi_flow, selected_index, selected_files, queue_index, filename, unique_id=None):
        if folder_direct:
            img_list, mask_list = load_entire_directory_as_list(target_path)
            return (img_list, mask_list)

        items = []
        if selected_files and selected_files.strip():
            try: items = json.loads(selected_files)
            except Exception: items = []

        if not items:
            blank = Image.new("RGB", (512, 512), (32, 32, 32))
            t_img, t_mask = image_to_tensor_and_mask(blank)
            return ([t_img], [t_mask])

        def resolve_file(it):
            if isinstance(it, dict):
                ed_path = it.get("edited_path")
                ed_name = it.get("edited_name")
                if ed_path and ed_name:
                    full_ed = os.path.normpath(os.path.join(ed_path, ed_name))
                    if os.path.isfile(full_ed): return full_ed
                return os.path.normpath(os.path.join(it.get("path", ""), it.get("name", "")))
            p = os.path.normpath(target_path.strip())
            if not os.path.isabs(p): p = os.path.join(folder_paths.get_output_directory(), p)
            return os.path.normpath(os.path.join(p, it))

        is_multi = mode.startswith("Multi")
        is_batch = multi_flow.startswith("Batch")

        if is_multi and is_batch and len(items) > 1:
            tensor_list, mask_list = [], []
            base_w, base_h = None, None

            for it in items:
                fpath = resolve_file(it)
                if not os.path.exists(fpath): continue
                crop_data = it.get("crop") if isinstance(it, dict) else None
                rot = int(it.get("rot", 0)) if isinstance(it, dict) else 0
                flip_h = bool(it.get("flip_h", False)) if isinstance(it, dict) else False
                flip_v = bool(it.get("flip_v", False)) if isinstance(it, dict) else False

                img = process_single_image(fpath, crop_data, rot, flip_h, flip_v)
                if base_w is None: base_w, base_h = img.width, img.height
                elif (img.width != base_w) or (img.height != base_h):
                    img = img.resize((base_w, base_h), Image.Resampling.BICUBIC)
                t_img, t_mask = image_to_tensor_and_mask(img)
                tensor_list.append(t_img)
                mask_list.append(t_mask)

            if tensor_list:
                cat_img = torch.cat(tensor_list, dim=0)
                cat_mask = torch.cat(mask_list, dim=0)
                return ([cat_img], [cat_mask])

        elif is_multi and not is_batch:
            tensor_list, mask_list = [], []
            for it in items:
                fpath = resolve_file(it)
                if not os.path.exists(fpath): continue
                crop_data = it.get("crop") if isinstance(it, dict) else None
                rot = int(it.get("rot", 0)) if isinstance(it, dict) else 0
                flip_h = bool(it.get("flip_h", False)) if isinstance(it, dict) else False
                flip_v = bool(it.get("flip_v", False)) if isinstance(it, dict) else False

                img = process_single_image(fpath, crop_data, rot, flip_h, flip_v)
                t_img, t_mask = image_to_tensor_and_mask(img)
                tensor_list.append(t_img)
                mask_list.append(t_mask)

            if tensor_list:
                return (tensor_list, mask_list)

        idx = min(max(0, selected_index), len(items) - 1)
        it = items[idx]
        crop_data = it.get("crop") if isinstance(it, dict) else None
        rot = int(it.get("rot", 0)) if isinstance(it, dict) else 0
        flip_h = bool(it.get("flip_h", False)) if isinstance(it, dict) else False
        flip_v = bool(it.get("flip_v", False)) if isinstance(it, dict) else False

        img = process_single_image(resolve_file(it), crop_data, rot, flip_h, flip_v)
        t_img, t_mask = image_to_tensor_and_mask(img)
        return ([t_img], [t_mask])

try:
    routes = PromptServer.instance.routes

    if not any(r.path == "/crazy3ds/get_load_paths" for r in routes):
        @routes.get("/crazy3ds/get_load_paths")
        async def get_load_paths_handler(request):
            return web.json_response({"paths": load_global_load_paths()})

    if not any(r.path == "/crazy3ds/save_load_paths" for r in routes):
        @routes.post("/crazy3ds/save_load_paths")
        async def save_load_paths_handler(request):
            try:
                data = await request.json()
                save_global_load_paths(data.get("paths", []))
                return web.json_response({"success": True})
            except Exception as e:
                return web.json_response({"success": False, "message": str(e)}, status=500)

    if not any(r.path == "/crazy3ds/choose_files" for r in routes):
        @routes.post("/crazy3ds/choose_files")
        async def choose_files_handler(request):
            try:
                data = await request.json()
                init_p = data.get("initial_path", "").strip()
                if not init_p: init_p = folder_paths.get_input_directory()
                elif not os.path.isabs(init_p): init_p = os.path.join(folder_paths.get_output_directory(), init_p)
                init_p = os.path.abspath(init_p)

                folder, files = await asyncio.to_thread(choose_system_files_win32, init_p)
                if folder and files:
                    return web.json_response({"success": True, "folder": folder, "files": files})
                return web.json_response({"success": False, "message": "取消选择"})
            except Exception as e:
                return web.json_response({"success": False, "message": str(e)}, status=500)

    if not any(r.path == "/crazy3ds/choose_folder" for r in routes):
        @routes.post("/crazy3ds/choose_folder")
        async def choose_folder_handler(request):
            try:
                data = await request.json()
                init_p = data.get("initial_path", "").strip()
                folder = await asyncio.to_thread(choose_folder_win32, init_p)
                if folder:
                    return web.json_response({"success": True, "folder": folder})
                return web.json_response({"success": False, "message": "取消选择"})
            except Exception as e:
                return web.json_response({"success": False, "message": str(e)}, status=500)

    if not any(r.path == "/crazy3ds/open_folder" for r in routes):
        @routes.post("/crazy3ds/open_folder")
        async def open_folder_handler(request):
            try:
                data = await request.json()
                p = data.get("target_path", "").strip()
                if not p: p = folder_paths.get_input_directory()
                elif not os.path.isabs(p): p = os.path.join(folder_paths.get_output_directory(), p)
                p = os.path.normpath(p)
                if os.path.exists(p):
                    os.startfile(p)
                    return web.json_response({"success": True})
                return web.json_response({"success": False, "message": "路径不存在"}, status=404)
            except Exception as e:
                return web.json_response({"success": False, "message": str(e)}, status=500)

    if not any(r.path == "/crazy3ds/get_thumb" for r in routes):
        @routes.get("/crazy3ds/get_thumb")
        async def get_thumb_handler(request):
            target_path = request.query.get("path", "").strip()
            filename = request.query.get("name", "").strip()
            base_out = folder_paths.get_output_directory()
            if not os.path.isabs(target_path): target_path = os.path.join(base_out, target_path)

            full_path = os.path.normpath(os.path.join(target_path, filename))
            if not os.path.exists(full_path): return web.Response(status=404)

            cache_key = f"{full_path}_{os.path.getmtime(full_path)}"
            if cache_key in THUMB_CACHE:
                return web.Response(body=THUMB_CACHE[cache_key], content_type="image/jpeg")

            try:
                im = safe_read_image(full_path)
                im = ImageOps.exif_transpose(im)
                im.thumbnail((180, 180), Image.Resampling.BILINEAR)
                if im.mode != "RGB": im = im.convert("RGB")
                buf = io.BytesIO()
                im.save(buf, format="JPEG", quality=80)
                thumb_bytes = buf.getvalue()
                if len(THUMB_CACHE) > 500: THUMB_CACHE.clear()
                THUMB_CACHE[cache_key] = thumb_bytes
                return web.Response(body=thumb_bytes, content_type="image/jpeg")
            except Exception:
                return web.Response(status=500)

    if not any(r.path == "/crazy3ds/get_preview" for r in routes):
        @routes.get("/crazy3ds/get_preview")
        async def get_preview_handler(request):
            target_path = request.query.get("path", "").strip()
            filename = request.query.get("name", "").strip()
            base_out = folder_paths.get_output_directory()
            if not os.path.isabs(target_path): target_path = os.path.join(base_out, target_path)

            full_path = os.path.normpath(os.path.join(target_path, filename))
            if not os.path.exists(full_path): return web.Response(status=404)

            cache_key = f"prev_{full_path}_{os.path.getmtime(full_path)}"
            if cache_key in PREVIEW_CACHE:
                return web.Response(body=PREVIEW_CACHE[cache_key], content_type="image/jpeg")

            try:
                im = safe_read_image(full_path)
                im = ImageOps.exif_transpose(im)
                im.thumbnail((1800, 1800), Image.Resampling.BILINEAR)
                if im.mode != "RGB": im = im.convert("RGB")
                buf = io.BytesIO()
                im.save(buf, format="JPEG", quality=90)
                prev_bytes = buf.getvalue()
                if len(PREVIEW_CACHE) > 50: PREVIEW_CACHE.clear()
                PREVIEW_CACHE[cache_key] = prev_bytes
                return web.Response(body=prev_bytes, content_type="image/jpeg")
            except Exception:
                return web.Response(status=500)

    if not any(r.path == "/crazy3ds/get_image_info" for r in routes):
        @routes.get("/crazy3ds/get_image_info")
        async def get_image_info_handler(request):
            target_path = request.query.get("path", "").strip()
            filename = request.query.get("name", "").strip()
            base_out = folder_paths.get_output_directory()
            if not os.path.isabs(target_path): target_path = os.path.join(base_out, target_path)

            full_path = os.path.normpath(os.path.join(target_path, filename))
            if not os.path.exists(full_path):
                return web.json_response({"success": False, "message": "文件不存在"}, status=404)

            try:
                fsize = os.path.getsize(full_path)
                if fsize < 1024:
                    sz_str = f"{fsize} B"
                elif fsize < 1024 * 1024:
                    sz_str = f"{fsize / 1024:.1f} KB"
                else:
                    sz_str = f"{fsize / (1024 * 1024):.2f} MB"

                im = safe_read_image(full_path)
                w, h = im.size
                fmt = im.format or os.path.splitext(filename)[1].lstrip(".").upper()

                return web.json_response({
                    "success": True,
                    "width": w,
                    "height": h,
                    "size": sz_str,
                    "format": fmt
                })
            except Exception as e:
                return web.json_response({"success": False, "message": str(e)}, status=500)

    if not any(r.path == "/crazy3ds/save_edit" for r in routes):
        @routes.post("/crazy3ds/save_edit")
        async def save_edit_handler(request):
            try:
                data = await request.json()
                src_path = data.get("path", "").strip()
                src_name = data.get("name", "").strip()
                crop_box = data.get("crop")
                rotation = int(data.get("rot", 0))
                flip_h = bool(data.get("flip_h", False))
                flip_v = bool(data.get("flip_v", False))

                base_out = folder_paths.get_output_directory()
                if not os.path.isabs(src_path): src_path = os.path.join(base_out, src_path)
                full_src = os.path.normpath(os.path.join(src_path, src_name))
                if not os.path.exists(full_src):
                    return web.json_response({"success": False, "message": "原文件未找到"}, status=404)

                img = process_single_image(full_src, crop_box, rotation, flip_h, flip_v)

                stem, _ = os.path.splitext(src_name)
                while stem.endswith("_c3ds_edit"):
                    stem = stem[:-10]

                dir_name = os.path.dirname(full_src)
                derivative_name = f"{stem}_c3ds_edit.png"
                full_dst = os.path.join(dir_name, derivative_name)

                counter = 1
                while os.path.exists(full_dst):
                    derivative_name = f"{stem}_c3ds_edit_{counter}.png"
                    full_dst = os.path.join(dir_name, derivative_name)
                    counter += 1

                img.save(full_dst, format="PNG", compress_level=2)

                for k in list(PREVIEW_CACHE.keys()):
                    if derivative_name in k: del PREVIEW_CACHE[k]
                for k in list(THUMB_CACHE.keys()):
                    if derivative_name in k: del THUMB_CACHE[k]

                return web.json_response({
                    "success": True,
                    "edited_path": dir_name,
                    "edited_name": derivative_name
                })
            except Exception as e:
                return web.json_response({"success": False, "message": str(e)}, status=500)
except Exception:
    pass
