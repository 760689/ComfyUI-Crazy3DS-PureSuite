import torch
import torch.nn.functional as F

class AnyType(str):
    def __ne__(self, __value: object) -> bool:
        return False

any_type = AnyType("*")

def resize_tensor_aspect(tensor_img, mode, param_val):
    if mode == "原图" or tensor_img is None:
        return tensor_img

    t = tensor_img.permute(0, 3, 1, 2)
    _, _, h, w = t.shape

    if mode == "最长边":
        target_max = max(16, int(round(param_val)))
        scale = target_max / max(h, w)
    elif mode == "总像素":
        mult = max(0.01, float(param_val))
        scale = mult ** 0.5
    else:
        scale = 1.0

    new_w = max(16, int(round(w * scale)))
    new_h = max(16, int(round(h * scale)))

    if new_w == w and new_h == h:
        return tensor_img

    resized = F.interpolate(t, size=(new_h, new_w), mode="bicubic", align_corners=False)
    return torch.clamp(resized.permute(0, 2, 3, 1), 0.0, 1.0)

class Crazy3DS_ImageUnpack:
    """
    Crazy3DS 图像多路解包分发器
    """
    @classmethod
    def INPUT_TYPES(s):
        return {
            "required": {
                "images": ("IMAGE",),
                "active_limit": ("INT", {"default": 2, "min": 1, "max": 9, "step": 1}),
                "empty_behavior": (["Blank 占位", "None 直通"], {"default": "Blank 占位"}),
                "scale_mode": (["原图", "最长边", "总像素"], {"default": "原图"}),
                "scale_value": ("FLOAT", {"default": 720.0, "min": 0.01, "max": 8192.0, "step": 0.1, "display": "number"}),
            }
        }

    INPUT_IS_LIST = True

    # 固定前3个为核心参数，后9个为动态图像插槽
    RETURN_TYPES = (
        "INT", "INT", "INT",
        any_type, any_type, any_type, any_type, any_type, any_type, any_type, any_type, any_type
    )
    RETURN_NAMES = (
        "active_count", "width", "height",
        "img_1", "img_2", "img_3", "img_4", "img_5", "img_6", "img_7", "img_8", "img_9"
    )
    FUNCTION = "dispatch"
    CATEGORY = "Crazy3DS/IO"

    def dispatch(self, images, active_limit=[2], empty_behavior=["Blank 占位"], scale_mode=["原图"], scale_value=[720.0]):
        limit = int(active_limit[0] if isinstance(active_limit, list) else active_limit)
        limit = max(1, min(9, limit))
        behavior = str(empty_behavior[0] if isinstance(empty_behavior, list) else empty_behavior)
        s_mode = str(scale_mode[0] if isinstance(scale_mode, list) else scale_mode)
        s_val = float(scale_value[0] if isinstance(scale_value, list) else scale_value)

        tensor_list = []
        if isinstance(images, list):
            for item in images:
                if isinstance(item, torch.Tensor):
                    if item.ndim == 4:
                        tensor_list.extend(torch.chunk(item, item.shape[0], dim=0))
                    elif item.ndim == 3:
                        tensor_list.append(item.unsqueeze(0))
        elif isinstance(images, torch.Tensor):
            if images.ndim == 4:
                tensor_list = list(torch.chunk(images, images.shape[0], dim=0))
            else:
                tensor_list = [images.unsqueeze(0)]

        total_input = len(tensor_list)
        real_pass = min(total_input, limit)

        processed = []
        for i in range(real_pass):
            processed.append(resize_tensor_aspect(tensor_list[i], s_mode, s_val))

        if real_pass > 0 and processed[-1] is not None:
            blank_tensor = torch.zeros_like(processed[-1])
        else:
            blank_tensor = torch.zeros((1, 512, 512, 3), dtype=torch.float32)

        if real_pass > 0 and processed[0] is not None:
            out_h = int(processed[0].shape[1])
            out_w = int(processed[0].shape[2])
        elif total_input > 0 and tensor_list[0] is not None:
            out_h = int(tensor_list[0].shape[1])
            out_w = int(tensor_list[0].shape[2])
        else:
            out_w, out_h = 512, 512

        out_w = int((out_w // 16) * 16)
        out_h = int((out_h // 16) * 16)

        img_results = []
        active_flags = []
        for i in range(limit):
            if i < real_pass:
                img_results.append(processed[i])
                active_flags.append(1)
            else:
                active_flags.append(0)
                if "None" in behavior:
                    img_results.append(None)
                else:
                    img_results.append(blank_tensor)

        out_count = int(real_pass)

        # 前端有几个输出端口，这里精确返回几个，严密匹配当前 active_limit
        return {
            "ui": {
                "active_count": [out_count],
                "active_mask": [active_flags]
            },
            "result": tuple([out_count, out_w, out_h] + img_results)
        }