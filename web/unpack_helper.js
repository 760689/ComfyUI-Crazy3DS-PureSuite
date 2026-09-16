import { app } from "../../scripts/app.js";

app.registerExtension({
    name: "Crazy3DS.ImageUnpack.SolidClean",
    async beforeRegisterNodeDef(nodeType, nodeData) {
        if (nodeData.name !== "Crazy3DS_ImageUnpack") return;

        // 精准紧凑高度：控制最下方控件与底边距离在 8px
        const calcAccurateHeight = (node) => {
            const count = node.properties?.active_limit || 2;
            const modeW = node.widgets?.find(w => w.name === "scale_mode");
            const isOriginal = !modeW || modeW.value === "原图";

            const visibleWidgets = (node.widgets || []).filter(w => !w.hidden && w.type !== "hidden");
            const lastW = visibleWidgets[visibleWidgets.length - 1];

            if (lastW && typeof lastW.last_y === "number" && lastW.last_y > 0) {
                return Math.round(lastW.last_y + 20 + 8);
            }

            const slotsH = 30 + (count + 3) * 20;
            const widgetsCount = isOriginal ? 2 : 3;
            const widgetsH = slotsH + 10 + (widgetsCount * 24) + 8;

            return Math.max(slotsH + 20, widgetsH);
        };

        nodeType.prototype.computeSize = function () {
            const minH = calcAccurateHeight(this);
            return [160, minH];
        };

        const origOnNodeCreated = nodeType.prototype.onNodeCreated;
        nodeType.prototype.onNodeCreated = function () {
            const r = origOnNodeCreated ? origOnNodeCreated.apply(this, arguments) : undefined;

            this.properties = this.properties || {};
            this.properties.active_limit = this.properties.active_limit || 2;
            this.slotStatus = [];

            this.title = "Crazy3DS 图像分发";
            this.widgets_font_size = 8;

            // 清理可能误转入的隐藏幽灵输入槽，保证仅保留第一位 images
            if (this.inputs && this.inputs.length > 1) {
                while (this.inputs.length > 1) {
                    this.removeInput(this.inputs.length - 1);
                }
            }

            // 自由缩放宽度，高度严格贴合
            const origOnResize = this.onResize;
            this.onResize = function (size) {
                if (origOnResize) origOnResize.apply(this, arguments);
                if (size && size[0]) {
                    this.properties.custom_width = Math.round(size[0]);
                }
                this.size[1] = calcAccurateHeight(this);
            };

            const limitW = this.widgets?.find(w => w.name === "active_limit");
            if (limitW) {
                limitW.type = "hidden";
                limitW.hidden = true;
                limitW.computeSize = () => [0, 0];
            }

            const emptyW = this.widgets?.find(w => w.name === "empty_behavior");
            const modeW = this.widgets?.find(w => w.name === "scale_mode");
            const valW = this.widgets?.find(w => w.name === "scale_value");

            const applyFont8 = (w) => {
                if (!w) return;
                w.options = w.options || {};
                w.options.font_size = 8;
                w.font_size = 8;
            };
            [emptyW, modeW, valW].forEach(applyFont8);

            const tooltipMap = {
                empty_behavior: "【缺图占位模式】\n• Blank: 补充黑图防下游崩溃\n• None: 直通 Python 原生 None",
                scale_mode: "【等比缩放模式】\n• 原图: 不缩放\n• 最长边: 限定长边像素\n• 总像素: 比例缩放",
                scale_value: "【缩放参数】"
            };

            if (emptyW) emptyW.label = "占位";
            if (modeW) modeW.label = "缩放";

            this.fitTightSize = () => {
                const targetH = calcAccurateHeight(this);
                const targetW = Math.max(160, this.properties.custom_width || 165);

                if (this.size) {
                    this.size[0] = targetW;
                    this.size[1] = targetH;
                }
                this.setDirtyCanvas(true, true);
            };

            // 动态安全增减插槽（前3个固定，只增删末尾）
            this.setDynamicPortCount = (newCount) => {
                newCount = Math.max(1, Math.min(9, newCount));
                this.properties.active_limit = newCount;
                if (limitW) limitW.value = newCount;

                if (!this.outputs) this.outputs = [];
                const targetTotal = 3 + newCount;

                while (this.outputs.length > targetTotal) {
                    const removeIdx = this.outputs.length - 1;
                    const outSlot = this.outputs[removeIdx];
                    if (outSlot && outSlot.links && outSlot.links.length > 0) {
                        const linksCopy = [...outSlot.links];
                        for (const lid of linksCopy) {
                            if (this.graph) {
                                this.graph.removeLink(lid);
                            }
                        }
                    }
                    this.removeOutput(removeIdx);
                }

                while (this.outputs.length < targetTotal) {
                    const nextImgNum = this.outputs.length - 3 + 1;
                    this.addOutput(`img_${nextImgNum}`, "*");
                }

                for (let i = 3; i < this.outputs.length; i++) {
                    this.outputs[i].name = `img_${i - 2}`;
                    this.outputs[i].type = "*";
                }

                this.fitTightSize();
                this.setDirtyCanvas(true, true);
            };

            const updateScaleUI = () => {
                if (!modeW || !valW) return;
                const m = modeW.value;
                if (m === "原图") {
                    valW.type = "hidden";
                    valW.hidden = true;
                    valW.computeSize = () => [0, 0];
                } else {
                    valW.type = "number";
                    valW.hidden = false;
                    valW.computeSize = () => [140, 20];
                    applyFont8(valW);
                    if (m === "最长边") {
                        valW.label = "长边(px)";
                        valW.options.min = 64;
                        valW.options.max = 8192;
                        valW.options.step = 16;
                        valW.options.precision = 0;
                        if (valW.value < 10) valW.value = 720;
                    } else if (m === "总像素") {
                        valW.label = "倍数";
                        valW.options.min = 0.1;
                        valW.options.max = 10.0;
                        valW.options.step = 0.1;
                        valW.options.precision = 2;
                        if (valW.value > 10) valW.value = 1.0;
                    }
                }
                this.fitTightSize();
            };

            if (modeW) {
                const origCallback = modeW.callback;
                modeW.callback = (val) => {
                    if (origCallback) origCallback.apply(this, arguments);
                    updateScaleUI();
                };
            }

            // 去除原生输入框描边
            const origDrawWidget = nodeType.prototype.onDrawWidget;
            this.onDrawWidget = function (ctx, widget) {
                const origStroke = ctx.stroke;
                ctx.stroke = function () {};
                if (origDrawWidget) origDrawWidget.apply(this, arguments);
                ctx.stroke = origStroke;
            };

            // 绘制 1px 贯穿细横线、状态指示灯与增减按钮
            const origDrawForeground = nodeType.prototype.onDrawForeground;
            this.onDrawForeground = function (ctx) {
                if (origDrawForeground) origDrawForeground.apply(this, arguments);
                if (this.flags?.collapsed) return;

                ctx.save();

                // 1. 贯穿 1px 分隔细横线（两端到外框边缘，绝对垂直居中在 height 与 img_1 之间）
                if (this.outputs && this.outputs.length >= 4) {
                    const posHeight = this.getConnectionPos(false, 2);
                    const posImg1 = this.getConnectionPos(false, 3);
                    const lineY = Math.floor((posHeight[1] + posImg1[1]) / 2) - this.pos[1] + 0.5;

                    ctx.beginPath();
                    ctx.moveTo(0, lineY);
                    ctx.lineTo(this.size[0], lineY);
                    ctx.lineWidth = 1;
                    ctx.strokeStyle = "#222222";
                    ctx.stroke();
                }

                // 2. 标题栏按钮 [-] [+]
                const btnSize = 18;
                const gap = 4;
                const rightPad = 7;
                const plusX = this.size[0] - btnSize - rightPad;
                const minusX = plusX - btnSize - gap;
                const btnY = -24;

                // [-]
                ctx.beginPath();
                ctx.roundRect(minusX, btnY, btnSize, btnSize, 4);
                ctx.fillStyle = "rgba(24, 24, 24, 0.88)";
                ctx.fill();

                ctx.fillStyle = "#cccccc";
                ctx.font = "bold 13px sans-serif";
                ctx.textAlign = "center";
                ctx.textBaseline = "middle";
                ctx.fillText("-", minusX + btnSize / 2, btnY + btnSize / 2);

                // [+]
                ctx.beginPath();
                ctx.roundRect(plusX, btnY, btnSize, btnSize, 4);
                ctx.fillStyle = "rgba(24, 24, 24, 0.88)";
                ctx.fill();

                ctx.fillStyle = "#cccccc";
                ctx.font = "bold 13px sans-serif";
                ctx.fillText("+", plusX + btnSize / 2, btnY + btnSize / 2);

                // 3. 图像输出数据指示绿灯（与原生插槽完全同心）
                const count = this.properties?.active_limit || 2;
                const statusList = this.slotStatus || [];

                for (let i = 0; i < count; i++) {
                    const slotIdx = 3 + i;
                    const hasData = (statusList[i] === 1);
                    const isLinked = !!(this.outputs[slotIdx]?.links && this.outputs[slotIdx].links.length > 0);

                    if (hasData && isLinked) {
                        const pos = this.getConnectionPos(false, slotIdx);
                        const localX = pos[0] - this.pos[0];
                        const localY = pos[1] - this.pos[1];

                        ctx.beginPath();
                        ctx.arc(localX, localY, 4, 0, Math.PI * 2);
                        ctx.fillStyle = "#22c55e";
                        ctx.shadowColor = "rgba(34, 197, 94, 0.9)";
                        ctx.shadowBlur = 6;
                        ctx.fill();
                        ctx.lineWidth = 1.2;
                        ctx.strokeStyle = "#bbf7d0";
                        ctx.stroke();
                    }
                }

                ctx.restore();
            };

            // 按钮点击
            const origOnMouseDown = this.onMouseDown;
            this.onMouseDown = function (e, localPos, graphCanvas) {
                if (this.flags?.collapsed) {
                    return origOnMouseDown ? origOnMouseDown.apply(this, arguments) : undefined;
                }

                if (localPos) {
                    const clickX = localPos[0];
                    const clickY = localPos[1];
                    const count = this.properties?.active_limit || 2;

                    const btnSize = 18;
                    const gap = 4;
                    const rightPad = 7;
                    const plusX = this.size[0] - btnSize - rightPad;
                    const minusX = plusX - btnSize - gap;
                    const btnY = -24;

                    if (clickY >= btnY - 10 && clickY <= btnY + btnSize + 10) {
                        if (clickX >= minusX - 6 && clickX <= minusX + btnSize + 2) {
                            this.setDynamicPortCount(count - 1);
                            return true;
                        }
                        if (clickX >= plusX - 2 && clickX <= plusX + btnSize + 6) {
                            this.setDynamicPortCount(count + 1);
                            return true;
                        }
                    }
                }

                return origOnMouseDown ? origOnMouseDown.apply(this, arguments) : undefined;
            };

            // 悬停提示
            const origOnMouseMove = this.onMouseMove;
            this.onMouseMove = function (e, localPos, graphCanvas) {
                if (origOnMouseMove) origOnMouseMove.apply(this, arguments);
                if (this.flags?.collapsed || !localPos) return;

                const mouseX = localPos[0];
                const mouseY = localPos[1];

                const btnSize = 18;
                const gap = 4;
                const rightPad = 7;
                const plusX = this.size[0] - btnSize - rightPad;
                const minusX = plusX - btnSize - gap;
                const btnY = -24;

                if (mouseY >= btnY - 8 && mouseY <= btnY + btnSize + 8) {
                    if (mouseX >= minusX - 4 && mouseX <= minusX + btnSize + 2) {
                        graphCanvas.canvas.title = "减少图像输出端口 (-)";
                        return;
                    }
                    if (mouseX >= plusX - 2 && mouseX <= plusX + btnSize + 4) {
                        graphCanvas.canvas.title = "增加图像输出端口 (+)";
                        return;
                    }
                }

                let matchedTooltip = null;
                for (const w of this.widgets || []) {
                    if (w.hidden || w.type === "hidden" || !w.last_y) continue;
                    if (mouseY >= w.last_y && mouseY <= w.last_y + 22) {
                        matchedTooltip = tooltipMap[w.name];
                        break;
                    }
                }

                if (matchedTooltip) {
                    graphCanvas.canvas.title = matchedTooltip;
                } else if (!this.title_tooltip_set) {
                    graphCanvas.canvas.title = "";
                }
            };

            const origOnExecuted = this.onExecuted;
            this.onExecuted = function (data) {
                if (origOnExecuted) origOnExecuted.apply(this, arguments);
                if (data && data.active_mask && data.active_mask[0]) {
                    this.slotStatus = data.active_mask[0];
                    this.setDirtyCanvas(true, true);
                }
            };

            // 初始裁切多余端口，默认严格显示 2 个图片端口
            const initLimit = this.properties.active_limit || 2;
            this.setDynamicPortCount(initLimit);

            setTimeout(() => {
                if (!this.properties.custom_width) {
                    this.properties.custom_width = 165;
                }
                updateScaleUI();
                this.fitTightSize();
            }, 30);

            return r;
        };

        const origConfigure = nodeType.prototype.onConfigure;
        nodeType.prototype.onConfigure = function (info) {
            const r = origConfigure ? origConfigure.apply(this, arguments) : undefined;

            // 清除反序列化可能带入的隐藏残留输入端口
            if (this.inputs && this.inputs.length > 1) {
                while (this.inputs.length > 1) {
                    this.removeInput(this.inputs.length - 1);
                }
            }

            const limitW = this.widgets?.find(w => w.name === "active_limit");
            let targetCount = 2;
            if (this.properties?.active_limit) {
                targetCount = this.properties.active_limit;
            } else if (limitW && limitW.value) {
                targetCount = limitW.value;
            }

            if (this.setDynamicPortCount) {
                this.setDynamicPortCount(targetCount);
            }

            requestAnimationFrame(() => {
                if (this.fitTightSize) this.fitTightSize();
            });
            return r;
        };
    }
});