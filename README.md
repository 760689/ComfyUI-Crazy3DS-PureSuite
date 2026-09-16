##  20260916更新：

### 一、🌟 新增节点：Crazy3DS 图像分发 (Image Dispatcher)
专为多图解包与下游插槽映射打造的高效分发节点，与图像加载器的「固定序号」模式形成完美联动体系：

* **动态插槽管理**：支持右上角 `+`   `-` 按钮动态自由增减 `img_1` ~ `img_N` 输出插槽。
* **信息元数据输出**：直出 `active_count`（激活数量）、`width`、`height` 尺寸信息。
* **智能占位策略**：内置「Blank 占位和 NONE 直通」模式，当对应位次退选空缺时自动以空白张量补齐，保护下游连线不中断、不报错。
* **内置规整缩放**：支持长边等比缩放规整（如手动填入 720px）和总像素倍率（如自定义2 4 6 8倍）输出，省去后置挂接多个缩放节点的繁琐连线。
<img width="900" height="500" alt="屏幕截图 2026-09-16 142432" src="https://github.com/user-attachments/assets/2405ddb4-87a7-4a92-beda-f35a965595ff" />




### 二、🚀 核心优化：Crazy3DS 图像加载器 (LoadImage)
增加多图模式下 自由选择对图片进行编号，通过鼠标点击顺序来决定选择的图片的顺序并标记数字，便于传递给下游编辑模型或多图参考模型识别。
两种模式切换，一种固定编号，选中多图后任意点击取消其中一个编号，保留其编号供换图替图。多用于后方提示词或编辑模型固定了图片和编号的绑定。
一种是取消任意一张图，编号自动在其余选中图里顺延，多用于批量单图按权重顺序往下传递。

* **序号分配模式革新**：
  * **固定序号（默认）**：退选图片时保留其原空缺位次，其余编号纹丝不动；新点选图片优先填补最小空号，与「图像分发」节点的固定插槽完美锁死。
  * **补位序号**：退选后后续项自动顺延自愈前移，专为纯列表队列流转优化。
* **流转模式二合一**：将「List 列表」与「批量合并」整合成单键快速切换胶囊，节约顶栏空间。
* **直观角标次序**：多图点选状态下，缩略图右上角动态呈现 1~99 的点选输出次序。
* **路径记忆持久化**：彻底解耦选图序号与路径选择索引，修复刷新界面后路径栏跳回历史旧路径的异常。
* **原始路径溯源**：缩略图 hover 悬停提示中新增原始绝对路径展示。
* **顶栏防误触间距**：刷新图标与全选按钮之间增加间隙，布局层次更分明。
* **删除按键微调**：单图快速移除键尺寸缩减至 2/3，降低选图操作时的误碰概率。
* **严密对称留白**：调整内部 DOM 容器计算逻辑，左右严守 5px 留白对称贴边，杜绝内容被外框裁切。

<img width="900" height="700" alt="屏幕截图 2026-09-16 141657" src="https://github.com/user-attachments/assets/e2d0bf99-cb22-46a7-a45e-bff2d0b5e098" />

↑↑↑↑  20260916更新  ↑↑↑↑
 

————————————————————————————————————————



# Crazy3DS Image Suite for ComfyUI
图片单图多图加载、预览保存二合一，厌倦了盲目保存、预览，右键存图和不停各种路径弹窗切换找图，可以试试。
看图、选图、存图，完全实用功能的集合，没有乱七八糟花里胡哨的额外功能。绝对干净隐私，放心食用。
<img width="900" height="760" alt="屏幕截图 2026-09-15 131153" src="https://github.com/user-attachments/assets/a2d425cc-ccfc-4eae-9b8b-6b38cab4fd89" />


[English](#english) | [中文说明](#chinese)

---

<a name="english"></a>
## English Documentation

### 💡 Core Advantages & Highlights
Compared to standard ComfyUI `LoadImage` / `SaveImage` nodes or generic gallery extensions:
* **True Workflow Interoperability**: Offers **Go to Destination** on the Loader and **Go to Source** on the Saver to sync paths between nodes in a single click, eliminating tedious directory re-typing.
* **Built-in Non-Destructive Editing**: Double-click any loaded image to crop (fixed or freeform ratios), rotate, or flip directly on canvas, outputting standalone copies without altering your raw source files.
* **Integrated Privacy Protection**: Hardware-accelerated privacy masking on both nodes conceals sensitive image previews during presentations or public screen-sharing without stopping backend execution.
* **Batch Concatenation & Sequential Iteration**: Native support for list looping (sequential single-image queues) and batch tensor concatenation (single-step tensor stack) directly from the gallery UI.
* **Safe External Drive Handling**: Automatic missing-file detection prevents 404 infinite network probe loops, allowing clean recovery with a hot-reload refresh button when re-plugging USB or external hard drives.

---

### 📦 Nodes & Features

#### 1. Crazy3DS Image Loader (`Crazy3DS_LoadImage`)

* **Path Management & Output**:
  * **Path Bookmarks**: Stores up to 19 recent local folders in a dropdown menu, with options to add custom directories via the native system file dialog or remove existing bookmarks.
  * **Directory Direct Output**: When enabled, bypasses the gallery and streams all images in the selected folder directly through the `images` output port.
  * **Open Path Folder**: Instantly launches the currently selected folder in Windows Explorer.
  * **Go to Destination**: Automatically locates downstream SaveImage nodes on the canvas and matches the loader's path to the saver's active destination folder.
* **Output Modes**:
  * **Single Mode**: Outputs only the actively selected target image.
  * **Multi Mode**: Allows multi-selection of gallery images with two execution channels:
    * **List Mode**: Outputs selected images sequentially across successive queue executions.
    * **Batch Mode**: Stacks all checked images into a unified batch tensor for one-shot execution.
  * **Select All / Deselect**: Supports state rollback—clicking 'Select All' a second time returns to your previous customized selection.
* **Gallery & Integrated Image Editor**:
  * **Dual Display Modes**: Toggle between high-density Thumbnail Grid and Compact File List views.
  * **Canvas Editor**: Double-click an image to access cropping tools (Original, Freeform, 1:1, 3:4, 4:3, 16:9, 9:16), 90° clockwise rotation, and horizontal mirroring.
  * **Save Copy**: Saves edited adjustments as a non-destructive local image copy (`_c3ds_edit`) and adds it directly to the gallery pool.
  * **Hot-Reload / Refresh**: Re-detects disk contents, re-caches dimensions and metadata, and safely clears missing-file error states.
* **Bottom Status HUD**:
  * Displays file name, resolution, file size, format, and current index in a unified layout.
  * Detects unreadable or missing files and clearly flags them as `File Missing`, halting redundant background network calls.

#### 2. Crazy3DS Image Saver (`Crazy3DS_SaveImage`)

* **Saving Workflows**:
  * **One-Click Manual Save**: Explicitly commits current preview tensors to the target storage folder on demand, accompanied by visual confirmation.
  * **Automatic Save / Preview Only**: Toggle whether every run commits directly to disk or remains in frontend preview only.
* **Path Management**:
  * **Path Bookmarks**: Dropdown menu for rapid switching, adding, and deleting custom destination folders.
  * **Go to Source**: Reads active folders from upstream Crazy3DS Loader nodes and imports them to the saver's path history.
  * **Open Path Folder**: Opens the current destination folder in Windows Explorer.
* **Export Controls & Safety**:
  * **Format**: Supports export to PNG, JPG, and WEBP formats.
  * **Save Workflow**: Toggles whether ComfyUI node link metadata is written into output files.
  * **Quality**: Controls compression quality (1-100) for JPG and WEBP formats.
  * **Anti-Fingerprint**: Strips invisible metadata signatures and generator fingerprints from exported images.
  * **Enable Preview**: Disables frontend preview rendering to save system RAM and VRAM during heavy queue runs.

#### 3. Privacy Shield Mode (`🙈`)
* Accessible on the title bar of both nodes.
* **Loader**: Masks the gallery display area with a solid opaque shield, allowing workflow modifications while hiding image contents.
* **Saver**: Disables canvas preview buffers completely; downstream image generation and disk saving continue unaffected in the background.

---

<a name="chinese"></a>
## 中文说明文档

### 💡 核心优势与同类对比
相比 ComfyUI 原生 `LoadImage` / `SaveImage` 以及常规画廊节点：
* **工作流首尾联通**：加载节点支持“转到去路”，保存节点支持“转到来路”，一键同步首尾节点目录，免除反复手动复制粘贴路径。
* **原生无损大图编辑**：无需额外串联图片裁剪节点，双击即可在画板上进行任意比例裁剪、旋转与镜像，并直接生成本地副本参与工作流。
* **双节点专属防窥体系**：加载端与保存端均自带全局隐私防窥开关，录屏、演示或公共场所使用时一键遮蔽敏感图面，后台生成与保存完全不受影响。
* **多图流道自由调度**：画廊勾选后可自由切换单图循环逐张输出（List 模式）或打包为 Tensor 批量合并输出（Batch 模式）。
* **外接驱动器热插拔稳健机制**：拔掉 U 盘或移动硬盘后自动阻断死循环网络探测，插回后支持一键刷新热重载，避免界面卡顿报错。

---

### 📦 节点功能与使用说明

#### 1. Crazy3DS 图像加载器 (`Crazy3DS_LoadImage`)

* **路径管理与输出机制**：
  * **历史路径下拉框**：记忆最近使用的 19 组本地目录，支持从系统资源管理器选择新文件夹或快捷移除历史记录。
  * **目录直出**：开启后跳过画廊选图，将当前目录内的全部图片直接通过 `images` 端口全量输出给下游工作流。
  * **打开路径文件夹**：在系统资源管理器中直接定位并打开当前素材文件夹。
  * **转到去路**：自动识别画布下游激活的保存节点，将加载路径快速切换至保存节点当前的存储路径。
* **输出模式**：
  * **单图模式**：输出当前画廊中高亮选中的单张图片。
  * **多图模式**：允许在画廊中勾选多张素材并选择流道：
    * **List 模式**：每次队列执行按顺序依次输出一张图片。
    * **Batch 模式**：将所有已勾选的图片打包为单个批次 Tensor 一次性输出。
  * **全选与脱选**：支持状态回跳记忆，全选状态下再次点击全选可恢复至全选前的自定义勾选组合。
* **画廊管理与画布大图编辑**：
  * **视图切换**：支持大缩略图网格视图与紧凑文件列表视图自由切换。
  * **画布编辑器**：双击任意图片即可进入编辑视口，支持原图、自由比例以及 1:1、3:4、4:3、16:9、9:16 固定比例拉伸裁剪，支持 90° 顺时针旋转与水平镜像翻转。
  * **保存副本**：编辑确认后点击“保存副本”，自动生成无损新文件（带 `_c3ds_edit` 后缀）并实时插入画廊素材池。
  * **刷新画廊**：重新扫描磁盘文件夹，更新素材列表与分辨率参数，安全清除失效文件的丢失标记。
* **底部状态栏 (HUD)**：
  * 实时显示当前选中素材的名称、分辨率、体积、格式与队列位置。
  * 具备文件丢失感知：当检测到图片被移动或拔出时，明确提示“文件已丢失”，自动阻断网络重复探测。

#### 2. Crazy3DS 图像保存器 (`Crazy3DS_SaveImage`)

* **保存与落盘机制**：
  * **一键保存**：在仅预览模式下，点击顶部保存条直接将当前预览张量即时写入硬盘。
  * **自动保存/仅预览**：自由切换每次生成是否自动落盘；关闭后仅供画面预览，避免硬盘堆积无用废片。
* **存储路径配置**：
  * **保存路径书签**：下拉列表记录常用存储目录，支持快捷新增和删除。
  * **转到来路**：一键抓取画布上游 Crazy3DS 加载节点的素材路径，将其同步为当前保存路径。
  * **打开路径文件夹**：在系统资源管理器中打开当前保存目录。
* **输出参数与安全特性**：
  * **format (格式)**：支持 PNG、JPG、WEBP 格式保存。
  * **quality (画质)**：控制 JPG / WEBP 导出的画质压缩比（1-100）。
  * **save_workflow (保存工作流)**：控制是否将当前 ComfyUI 画布连线信息嵌入图像元数据。
  * **anti_fingerprint (破除画面暗水印)**：剔除生成模型在底层嵌入的不可见签名标签与特征水印。
  * **enable_preview (启用预览)**：关闭后停止向前台传输图像画面，大队列跑图时可有效释放前端内存与显存。

#### 3. 屏幕防窥保护模式 (`🙈`)
* 点击任意节点右上角的“眼睛”按钮即可启用防窥保护。
* **加载器防窥**：在画廊素材视口覆盖高对比防窥卡片，保护素材不被旁人窥视，但不影响节点参数设置。
* **保存器防窥**：直接清空前端预览画面缓冲区，生成过程与文件正常落盘完全不受干扰。

<img width="900" height="760" alt="屏幕截图 2026-09-15 131203" src="https://github.com/user-attachments/assets/fbe77322-a1ca-4640-b65d-ab7cc41ce3d6" />
<img width="900" height="760" alt="屏幕截图 2026-09-15 131319" src="https://github.com/user-attachments/assets/bc0b0ade-bc18-4162-9734-f6df6b359524" />
<img width="900" height="700" alt="屏幕截图 2026-09-15 131350" src="https://github.com/user-attachments/assets/c9d34b99-d47e-490c-8194-89e9ca4b0a49" />
<img width="900" height="700" alt="屏幕截图 2026-09-15 131401" src="https://github.com/user-attachments/assets/19b11f22-8078-4e08-a80e-4fdcc7f47c74" />

