import os
import json
import time
import asyncio
import ctypes
from ctypes import wintypes
from datetime import datetime
import numpy as np
from PIL import Image
import torch
import folder_paths
from server import PromptServer
from aiohttp import web

from .common import calculate_aspect_ratio, load_global_paths

def apply_image_clean(img_np):
    noise = (np.random.rand(*img_np.shape) - 0.5) * 1.2
    return np.clip(img_np + noise, 0, 255).astype(np.uint8)

def resolve_upstream_names(prompt, unique_id):
    """追溯上游全部输入图的文件名列表，支持单图、多选与整目录直出"""
    if not prompt or unique_id is None:
        return []
    cur_id = str(unique_id)
    visited = set()
    queue = [cur_id]

    while queue:
        nid = queue.pop(0)
        if nid in visited or nid not in prompt:
            continue
        visited.add(nid)

        node_info = prompt[nid]
        inputs = node_info.get("inputs", {})
        ctype = str(node_info.get("class_type", ""))

        if nid != cur_id:
            if "Crazy3DS_LoadImage" in ctype:
                # 1. 目录直出模式：精准获取该目录下所有文件的真实原名
                is_direct = inputs.get("folder_direct") in (True, 1, "true", "True")
                target_p = str(inputs.get("target_path", "")).strip()
                if is_direct and target_p:
                    if not os.path.isabs(target_p):
                        target_p = os.path.join(folder_paths.get_output_directory(), target_p)
                    if os.path.isdir(target_p):
                        valid_exts = {'.png', '.jpg', '.jpeg', '.webp', '.bmp', '.tiff', '.tif'}
                        fs = [f for f in os.listdir(target_p) if os.path.splitext(f)[1].lower() in valid_exts]
                        fs.sort()
                        if fs:
                            return [os.path.splitext(f)[0] for f in fs]

                # 2. 画廊勾选模式：精准获取勾选的每张素材原名
                sel_raw = inputs.get("selected_files")
                if sel_raw:
                    try:
                        items = json.loads(sel_raw)
                        stems = []
                        for it in items:
                            if isinstance(it, dict):
                                nm = it.get("edited_name") or it.get("name") or ""
                                if nm: stems.append(os.path.splitext(nm)[0])
                            elif isinstance(it, str) and it.strip():
                                stems.append(os.path.splitext(os.path.basename(it.strip()))[0])
                        if stems:
                            return stems
                    except Exception:
                        pass

                # 3. 单图模式：沿用单图文件名
                if inputs.get("filename"):
                    fn = str(inputs.get("filename")).strip()
                    if fn: return [fn]

            for key in ["image", "images", "file", "filename", "video", "filename_prefix"]:
                val = inputs.get(key)
                if isinstance(val, str) and val.strip():
                    base = os.path.basename(val.strip())
                    stem, _ = os.path.splitext(base)
                    if stem: return [stem]

        for _, in_val in inputs.items():
            if isinstance(in_val, list) and len(in_val) == 2:
                up_id = str(in_val[0])
                if up_id not in visited:
                    queue.append(up_id)
    return []

def choose_folder_win32(initial_dir=""):
    """纯净 Win32 文件夹选择，点击取消静默返回，绝不弹二次窗，恢复 CWD 绝不锁死设备"""
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
        bi.lpszTitle = "Crazy3DS - 选择保存路径文件夹"
        bi.ulFlags = 0x00000001 | 0x00000040 | 0x00000010

        pidl = shell32.SHBrowseForFolderW(ctypes.byref(bi))
        if pidl:
            path_buf = ctypes.create_unicode_buffer(32768)
            success = shell32.SHGetPathFromIDListW(pidl, path_buf)
            ole32.CoTaskMemFree(pidl)
            if success and path_buf.value:
                res = path_buf.value
                if os.path.exists(res):
                    return os.path.normpath(res)
    except Exception:
        pass
    finally:
        try:
            os.chdir(orig_cwd)
        except Exception:
            pass
    return None

class Crazy3DS_SaveImage:
    NODE_CACHE = {}

    def __init__(self):
        self.output_dir = folder_paths.get_output_directory()
        self.temp_dir = folder_paths.get_temp_directory()
        self.type = "output"

    @classmethod
    def INPUT_TYPES(s):
        return {
            "required": {
                "images": ("IMAGE", ),
                "format": (["JPG", "PNG", "WEBP"], {"default": "JPG"}),
                "filename": ("STRING", {"default": "Crazy3DS_%Y%m%d_%H%M%S"}),
                "quality \u56fe\u7247\u8d28\u91cf1-100": ("INT", {"default": 100, "min": 1, "max": 100, "step": 1}),
                "anti_fingerprint \u7834\u9664\u753b\u9762\u6697\u6c34\u5370": ("BOOLEAN", {"default": False}),
                "save_workflow": ("BOOLEAN", {"default": True}),
                "enable_preview": ("BOOLEAN", {"default": True}),
                "enable_save \u81ea\u52a8\u4fdd\u5b58/\u4ec5\u9884\u89c8": ("BOOLEAN", {"default": True}),
                "target_path": ("STRING", {"default": "output/Crazy3DS_Saves"}),
            },
            "hidden": {
                "prompt": "PROMPT", 
                "extra_pnginfo": "EXTRA_PNGINFO",
                "unique_id": "UNIQUE_ID"
            }
        }

    RETURN_TYPES = ("IMAGE", )
    RETURN_NAMES = ("images", )
    FUNCTION = "execute"
    OUTPUT_NODE = True
    CATEGORY = "Crazy3DS/IO"

    @classmethod
    def save_to_disk(cls, images, format_type, filename_pattern, quality, anti_fingerprint, save_workflow, target_path, prompt=None, extra_pnginfo=None, unique_id=None, base_out=None):
        if base_out is None:
            base_out = folder_paths.get_output_directory()
        out_dir = target_path.strip() if target_path.strip() else base_out
        if not os.path.isabs(out_dir):
            out_dir = os.path.join(base_out, out_dir)
        os.makedirs(out_dir, exist_ok=True)

        ext = format_type.lower()
        if ext == "jpeg": ext = "jpg"

        frame_list = []
        if isinstance(images, (list, tuple)):
            for it in images:
                if isinstance(it, torch.Tensor):
                    if len(it.shape) == 4:
                        for b in range(it.shape[0]): frame_list.append(it[b])
                    elif len(it.shape) == 3:
                        frame_list.append(it)
        elif isinstance(images, torch.Tensor):
            if len(images.shape) == 4:
                for b in range(images.shape[0]): frame_list.append(images[b])
            elif len(images.shape) == 3:
                frame_list.append(images)

        num_frames = len(frame_list)
        saved_files = []
        total_bytes = 0
        items_hud = []
        single_bytes_list = []

        upstream_stems = resolve_upstream_names(prompt, unique_id)
        is_user_custom = bool(filename_pattern and filename_pattern.strip())

        for idx, f_tensor in enumerate(frame_list):
            h_val, w_val = f_tensor.shape[0], f_tensor.shape[1]
            r_str = calculate_aspect_ratio(w_val, h_val)

            frame_raw = 255. * f_tensor.detach().cpu().numpy()
            if anti_fingerprint:
                frame_raw = apply_image_clean(frame_raw)
            else:
                frame_raw = np.clip(frame_raw, 0, 255).astype(np.uint8)

            img = Image.fromarray(frame_raw)

            # 单对单文件名映射：留空时各自沿用各自原图名
            if is_user_custom:
                base_tmpl = datetime.now().strftime(filename_pattern.strip())
                suffix = f"_{idx + 1:03d}" if num_frames > 1 else ""
                cur_stem = f"{base_tmpl}{suffix}"
            else:
                if idx < len(upstream_stems) and upstream_stems[idx]:
                    cur_stem = upstream_stems[idx]
                elif upstream_stems:
                    cur_stem = f"{upstream_stems[0]}_{idx + 1:03d}"
                else:
                    cur_stem = datetime.now().strftime("Crazy3DS_%Y%m%d_%H%M%S")
                    if num_frames > 1:
                        cur_stem += f"_{idx + 1:03d}"

            save_file = os.path.join(out_dir, f"{cur_stem}.{ext}")
            c = 1
            while os.path.exists(save_file):
                save_file = os.path.join(out_dir, f"{cur_stem}_{c:03d}.{ext}")
                c += 1

            if ext == "png":
                from PIL.PngImagePlugin import PngInfo
                meta = PngInfo()
                if save_workflow and not anti_fingerprint:
                    if prompt: meta.add_text("prompt", json.dumps(prompt))
                    if extra_pnginfo:
                        for k, v in extra_pnginfo.items(): meta.add_text(k, json.dumps(v))
                img.save(save_file, pnginfo=meta, compress_level=1 if quality >= 95 else 4)
            elif ext == "jpg":
                img.save(save_file, quality=int(quality), subsampling=0)
            else:
                img.save(save_file, quality=int(quality), lossless=(quality == 100))

            single_bytes = os.path.getsize(save_file) if os.path.exists(save_file) else 0
            total_bytes += single_bytes
            saved_files.append(save_file)
            single_bytes_list.append(single_bytes)

            s_mb = round(single_bytes / (1024 * 1024), 2)
            s_str = f"{s_mb}M" if s_mb > 0 else "0.01M"
            items_hud.append(f"{w_val} X {h_val}   {r_str}   {format_type.upper()}   {s_str}   [\u7b2c {idx + 1}/{num_frames} \u5f20]")

        mb = round(total_bytes / (1024 * 1024), 2)
        size_str = f"{mb}M" if mb > 0 else "0.01M"

        if num_frames > 1:
            w0, h0 = frame_list[0].shape[1], frame_list[0].shape[0]
            r0 = calculate_aspect_ratio(w0, h0)
            overall_hud = f"{w0} X {h0}   {r0}   {format_type.upper()}   \u603b\u8ba1: {size_str}   \u5171 {num_frames}P"
        elif num_frames == 1:
            overall_hud = items_hud[0].replace("[第 1/1 张]", "1P")
        else:
            overall_hud = "无图像输出"

        return saved_files, total_bytes, overall_hud, items_hud, single_bytes_list

    def execute(self, images, **kwargs):
        fmt = kwargs.get("format", "JPG")
        filename = kwargs.get("filename", "")
        quality = kwargs.get("quality \u56fe\u7247\u8d28\u91cf1-100", 100)
        anti_fingerprint = kwargs.get("anti_fingerprint \u7834\u9664\u753b\u9762\u6697\u6c34\u5370", False)
        save_workflow = kwargs.get("save_workflow", True)
        enable_preview = kwargs.get("enable_preview", True)
        enable_save = kwargs.get("enable_save \u81ea\u52a8\u4fdd\u5b58/\u4ec5\u9884\u89c8", True)
        target_path = kwargs.get("target_path", "output/Crazy3DS_Saves")
        unique_id = kwargs.get("unique_id", None)
        prompt = kwargs.get("prompt", None)
        extra_pnginfo = kwargs.get("extra_pnginfo", None)

        if not isinstance(images, torch.Tensor):
            images = torch.tensor(images)
        if len(images.shape) == 3:
            images = images.unsqueeze(0)

        num_frames = images.shape[0]
        node_key = str(unique_id) if unique_id is not None else "_latest_"

        # 多图累积池：按 run 自动收集多帧，杜绝最后一张覆写
        if node_key not in Crazy3DS_SaveImage.NODE_CACHE:
            Crazy3DS_SaveImage.NODE_CACHE[node_key] = {
                "frames": [],
                "prompt": prompt,
                "extra_pnginfo": extra_pnginfo,
                "unique_id": unique_id
            }

        cache_entry = Crazy3DS_SaveImage.NODE_CACHE[node_key]
        cache_entry["prompt"] = prompt
        cache_entry["extra_pnginfo"] = extra_pnginfo
        cache_entry["unique_id"] = unique_id

        for b in range(num_frames):
            cache_entry["frames"].append(images[b])

        Crazy3DS_SaveImage.NODE_CACHE["_latest_"] = cache_entry

        upstream_stems = resolve_upstream_names(prompt, unique_id)
        is_user_custom = bool(filename and filename.strip())

        items_hud = []
        single_bytes_list = []

        if enable_save:
            _, _, hud_text, items_hud, single_bytes_list = self.save_to_disk(
                images=images,
                format_type=fmt,
                filename_pattern=filename,
                quality=quality,
                anti_fingerprint=anti_fingerprint,
                save_workflow=save_workflow,
                target_path=target_path,
                prompt=prompt,
                extra_pnginfo=extra_pnginfo,
                unique_id=unique_id,
                base_out=self.output_dir
            )
        else:
            ui_imgs_temp = []
            if enable_preview:
                for idx in range(num_frames):
                    frame_raw = np.clip(255. * images[idx].detach().cpu().numpy(), 0, 255).astype(np.uint8)
                    img = Image.fromarray(frame_raw)
                    prev_name = f"c3ds_prev_{int(time.time()*1000)}_{idx}.png"
                    p_path = os.path.join(self.temp_dir, prev_name)
                    img.save(p_path)
                    sz = os.path.getsize(p_path) if os.path.exists(p_path) else 0
                    single_bytes_list.append(sz)
                    ui_imgs_temp.append({"filename": prev_name, "subfolder": "", "type": "temp"})

            for idx in range(num_frames):
                h_val, w_val = images[idx].shape[0], images[idx].shape[1]
                r_str = calculate_aspect_ratio(w_val, h_val)
                s_sz = single_bytes_list[idx] if idx < len(single_bytes_list) else 0
                s_mb = round(s_sz / (1024 * 1024), 2)
                s_str = f"{s_mb}M" if s_mb > 0 else "0.01M"

                if not is_user_custom and idx < len(upstream_stems) and upstream_stems[idx]:
                    fn_tag = f"{upstream_stems[idx]} · "
                else:
                    fn_tag = ""

                items_hud.append(f"{fn_tag}{w_val} X {h_val}   {r_str}   {fmt.upper()}   (\u4ec5\u9884\u89c8)   {s_str}   [\u7b2c {idx + 1}/{num_frames} \u5f20]")

            tot_bytes = sum(single_bytes_list)
            tot_mb = round(tot_bytes / (1024 * 1024), 2)
            tot_str = f"{tot_mb}M" if tot_mb > 0 else "0.01M"
            w0, h0 = images[0].shape[1], images[0].shape[0]
            r0 = calculate_aspect_ratio(w0, h0)
            hud_text = f"{w0} X {h0}   {r0}   {fmt.upper()}   (\u4ec5\u9884\u89c8)   \u603b\u8ba1: {tot_str}   \u5171 {num_frames}P"

            return {
                "ui": {
                    "images": ui_imgs_temp,
                    "c3ds_hud": [hud_text],
                    "c3ds_items_hud": items_hud,
                    "c3ds_bytes": single_bytes_list
                },
                "result": (images, )
            }

        ui_imgs = []
        if enable_preview:
            for idx in range(num_frames):
                frame_raw = np.clip(255. * images[idx].detach().cpu().numpy(), 0, 255).astype(np.uint8)
                img = Image.fromarray(frame_raw)
                prev_name = f"c3ds_prev_{int(time.time()*1000)}_{idx}.png"
                img.save(os.path.join(self.temp_dir, prev_name))
                ui_imgs.append({"filename": prev_name, "subfolder": "", "type": "temp"})

            return {
                "ui": {
                    "images": ui_imgs,
                    "c3ds_hud": [hud_text],
                    "c3ds_items_hud": items_hud,
                    "c3ds_bytes": single_bytes_list
                },
                "result": (images, )
            }

        return {"ui": {"images": []}, "result": (images, )}

try:
    if hasattr(PromptServer.instance, "send_sync") and not getattr(PromptServer.instance, "_c3ds_hooked", False):
        _orig_send_sync = PromptServer.instance.send_sync
        def _c3ds_send_sync_wrapper(event, data=None, sid=None):
            if event == "execution_start":
                Crazy3DS_SaveImage.NODE_CACHE.clear()
            return _orig_send_sync(event, data=data, sid=sid)
        PromptServer.instance.send_sync = _c3ds_send_sync_wrapper
        PromptServer.instance._c3ds_hooked = True
except Exception:
    pass

try:
    routes = PromptServer.instance.routes

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

    if not any(r.path == "/crazy3ds/manual_save" for r in routes):
        @routes.post("/crazy3ds/manual_save")
        async def manual_save_handler(request):
            try:
                data = await request.json()
                node_id = str(data.get("node_id")) if data.get("node_id") else None

                cache = None
                if node_id and node_id in Crazy3DS_SaveImage.NODE_CACHE:
                    cache = Crazy3DS_SaveImage.NODE_CACHE[node_id]
                if not cache:
                    cache = Crazy3DS_SaveImage.NODE_CACHE.get("_latest_")
                if not cache and Crazy3DS_SaveImage.NODE_CACHE:
                    cache = next(iter(Crazy3DS_SaveImage.NODE_CACHE.values()))

                if not cache or not cache.get("frames"):
                    return web.json_response({
                        "success": False, 
                        "message": "\u672a\u627e\u5230\u5f53\u524d\u8282\u70b9\u7684\u56fe\u50cf\u7f13\u5b58\uff0c\u8bf7\u5148\u6267\u884c\u4e00\u6b21\u751f\u6210\uff01"
                    })

                target_imgs = cache["frames"]

                saved_files, _, hud_text, items_hud, bytes_list = Crazy3DS_SaveImage.save_to_disk(
                    images=target_imgs,
                    format_type=data.get("format", "JPG"),
                    filename_pattern=data.get("filename", ""),
                    quality=int(data.get("quality", 100)),
                    anti_fingerprint=bool(data.get("anti_fingerprint", False)),
                    save_workflow=bool(data.get("save_workflow", True)),
                    target_path=data.get("target_path", "output/Crazy3DS_Saves"),
                    prompt=cache.get("prompt"),
                    extra_pnginfo=cache.get("extra_pnginfo"),
                    unique_id=cache.get("unique_id"),
                    base_out=folder_paths.get_output_directory()
                )

                return web.json_response({
                    "success": True,
                    "hud_text": hud_text,
                    "items_hud": items_hud,
                    "bytes_list": bytes_list,
                    "message": f"\u6210\u529f\u4fdd\u5b58 {len(saved_files)} \u5f20\u56fe\u7247\uff01"
                })
            except Exception as e:
                return web.json_response({"success": False, "message": f"\u4fdd\u5b58\u51fa\u9519: {str(e)}"}, status=500)
except Exception:
    pass
