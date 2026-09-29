#!/usr/bin/env python3
# 从 src/data/ops-theory.json 导出人读友好的核对版 md（与线上一一对应）。
# 用法：python gen_review_md.py
import json, os
from collections import OrderedDict

HERE = os.path.dirname(os.path.abspath(__file__))
SRC = os.path.join(HERE, "src", "data", "ops-theory.json")
OUT = os.path.join(HERE, "..", "运筹优化八股题库", "运筹优化八股题_核对版.md")

MODULE_TITLE = {
    "ops01": "线性规划与对偶", "ops02": "整数规划", "ops03": "动态规划",
    "ops04": "图与网络优化", "ops05": "启发式与元启发式", "ops06": "组合优化经典问题",
    "ops07": "排队论", "ops08": "库存与供应链优化", "ops09": "随机优化与鲁棒优化",
    "ops10": "求解器与分解算法", "ops11": "运筹与AI融合", "ops12": "建模与工程落地",
    "ops13": "手撕代码（现场写算法）", "ops14": "推导证明（博士级）",
}

data = json.load(open(SRC, encoding="utf-8"))
groups = OrderedDict()
for q in data:
    groups.setdefault(q["id"].split("-")[0], []).append(q)

def render_followup(f):
    if "答：" not in f:
        return f"  - {f.strip()}"
    q_part, rest = f.split("答：", 1)
    q_part = q_part.strip().rstrip("？?")
    ans, expl = rest, ""
    if "解释：" in rest:
        ans, expl = rest.split("解释：", 1)
    line = f"  - **问**：{q_part}？\n    - **答**：{ans.strip()}"
    if expl.strip():
        line += f"\n    - **解释**：{expl.strip()}"
    return line

L = []
L.append("# 运筹优化八股题 · 核对版（%d 题 / %d 模块）\n" % (len(data), len(groups)))
L.append("> **数据来源**：`src/data/ops-theory.json`（线上发布版本）\n")
L.append("> 本文件为人工核对用，与 App「运筹优化 / 八股知识」展示内容一一对应。\n")
L.append("> **修改意见请针对「题目 id」（如 `ops13-q2`）提出**，便于后续精准改 JSON 并重发线上。\n")
L.append("## 目录\n")
for mod in groups:
    L.append(f"- {mod} · {MODULE_TITLE.get(mod, mod)}（{len(groups[mod])} 题）")
L.append("")
for mod, qs in groups.items():
    L.append(f"\n---\n\n## {mod} · {MODULE_TITLE.get(mod, mod)}（{len(qs)} 题）\n")
    for i, q in enumerate(qs, 1):
        L.append(f"### {q['id']}　{i}. {q['question']}\n")
        L.append("**✅ 完整回答**\n")
        L.append(q["answer"].strip() + "\n")
        if q.get("explanation"):
            L.append("\n**💡 解释/思路**\n")
            L.append(q["explanation"].strip() + "\n")
        if q.get("code"):
            L.append("\n**💻 代码**\n")
            L.append(f"```{q['code'].get('language','text')}\n{q['code']['content'].rstrip()}\n```\n")
        if q.get("followUps"):
            L.append("\n**🔁 追问**\n")
            for f in q["followUps"]:
                L.append(render_followup(f))
            L.append("")
        L.append("")

open(OUT, "w", encoding="utf-8").write("\n".join(L))
print("已重导核对版 md：", os.path.normpath(OUT), "（%d 题）" % len(data))
