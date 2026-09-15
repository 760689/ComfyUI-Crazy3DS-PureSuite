# 导入公共基础设施层（自动完成公共 API 挂载）
from . import common

# 导入保存节点业务类
from .node_saver import Crazy3DS_SaveImage

# 导入加载节点业务类
from .node_loader import Crazy3DS_LoadImage

NODE_CLASS_MAPPINGS = {
    "Crazy3DS_SaveImage": Crazy3DS_SaveImage,
    "Crazy3DS_LoadImage": Crazy3DS_LoadImage
}

NODE_DISPLAY_NAME_MAPPINGS = {
    "Crazy3DS_SaveImage": "Crazy3DS \u56fe\u50cf\u4fdd\u5b58\u5668 SaveImage",
    "Crazy3DS_LoadImage": "Crazy3DS \u56fe\u50cf\u52a0\u8f7d\u5668 LoadImage"
}

WEB_DIRECTORY = "./web"

__all__ = ["NODE_CLASS_MAPPINGS", "NODE_DISPLAY_NAME_MAPPINGS", "WEB_DIRECTORY"]