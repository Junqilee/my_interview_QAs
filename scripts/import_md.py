#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
面试问答系统 - 题库清理 + Markdown 导入脚本

功能：
  1. cleanup(): 删除当前「运筹优化」与「智驾仿真」的低质量题目
       - seed-from-notes.json 中移除 operations_optimization
       - scenario.json 中移除 scn-d* / scn-o*（保留 scn-a* 智驾/Agent 场景）
       - driving-seed.json 置空 []
  2. import_supply_chain(): 解析供应链基础概念问答集.md -> supply-chain.json
  3. import_agent(): 解析 我的AI-Agent问答集/* -> agent-theory.json

解析规则（同时兼容三种标题风格）：
  - ## Q1：xxx  /  ## 补充 Q：xxx          (Agent 01 章风格)
  - ## 1. xxx  /  ### 1. xxx              (Agent 03/11/12/13 章 & 供应链风格)
  - ### Q：xxx（答疑式，无编号）            (各章「来自答疑 / 延伸 Q-A」段)

增强抽取：
  - 自动从 **加粗** 抽取关键词，从 **一句话/结论：...** 抽取一句话解释
  - 抽取「面试追问 / 高频追问 / 追问应对」下的 bullet 列表 -> followUps
  - 抽取首个非 mermaid 代码块 -> code 字段，并从正文剥离避免重复
"""
import re
import json
import os
import glob
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DATA = os.path.join(ROOT, "src", "data")
TODAY = "2026-09-26"

SUPPLY_MD = r"C:\00 Personal\06 秋招面试准备\01 京东TGT-大模型与强化学习驱动的库存调度优化研究\供应链基础概念问答集.md"
AGENT_DIR = r"C:\00 Personal\03 Agent基础概念学习\我的AI-Agent问答集"
OPS_DIR = r"C:\00 Personal\06 秋招面试准备\运筹优化八股题库"

SKIP_PREFIX = (
    "结论", "一句话", "核心", "第一性", "关系", "收口", "记忆", "关键",
    "补充", "定义", "名词", "定位", "状态", "说明", "读法", "目标",
    "经验法则", "数学", "串讲", "本质", "小例子", "记忆例子", "对照",
    "详解",
)

HEADING = re.compile(r"^(#{2,3})\s+(.*?)\s*$")
QPAT = re.compile(r"^(?:Q(\d+)|补充\s*Q|(\d+)\.\s+(?!\d)|Q\s*[:：])\s*(.*)$")


def extract_keywords(text):
    cands = re.findall(r"\*\*(.+?)\*\*", text)
    kws, seen = [], set()
    ascii_re = re.compile(r"[A-Za-z]")
    for c in cands:
        c = c.strip().strip("：:").strip()
        if not c:
            continue
        if c[:2] in SKIP_PREFIX or c.startswith(SKIP_PREFIX):
            continue
        m = re.match(r"^([^（(]+?)[（(]", c)
        term = m.group(1).strip() if m else c
        term = term.strip("：: \"'．.。")
        if not term or len(term) > 22:
            continue
        has_ascii = bool(ascii_re.search(term))
        if has_ascii:
            ok = len(term) <= 14
        else:
            ok = 2 <= len(term) <= 5
        if not ok:
            continue
        if term in seen:
            continue
        seen.add(term)
        kws.append(term)
        if len(kws) >= 8:
            break
    return kws


def extract_explanation(text):
    m = re.search(r"\*\*(一句话|结论|补充解释|详解)[：:]\s*([\s\S]*?)\*\*", text)
    if m:
        return m.group(2).strip()
    return ""


def extract_followups(body):
    """收集「追问」标记行之后的 bullet 列表作为 followUps，并从正文移除该段。"""
    lines = body.split("\n")
    follow = []
    out = []
    i = 0
    n = len(lines)
    while i < n:
        line = lines[i]
        stripped = line.strip()
        if "追问" in stripped and not stripped.startswith("#") and stripped:
            j = i + 1
            while j < n:
                bl = lines[j].strip()
                if bl == "":
                    j += 1
                    continue
                if bl.startswith(("- ", "* ", "• ")):
                    txt = bl[2:].strip()
                    if txt:
                        follow.append(txt)
                    j += 1
                else:
                    break
            i = j
            continue
        out.append(line)
        i += 1
    return follow, "\n".join(out).strip()


def extract_code(body):
    """抽取首个非 mermaid 代码块 -> {language, content}，并正文剥离该块。"""
    blocks = list(re.finditer(r"```(\w*)\n(.*?)```", body, flags=re.S))
    for m in blocks:
        lang = (m.group(1) or "python").lower()
        if lang in ("mermaid",):
            continue
        content = m.group(2).rstrip("\n")
        new_body = (body[: m.start()] + body[m.end():]).strip()
        new_body = re.sub(r"\n{3,}", "\n\n", new_body)
        return {"language": lang or "python", "content": content}, new_body
    return None, body


def parse_questions(md, source_label, direction, qtype, tag, source_file=None):
    lines = md.split("\n")
    headings = []
    for i, ln in enumerate(lines):
        m = HEADING.match(ln)
        if m:
            headings.append((i, len(m.group(1)), m.group(2).strip()))
    qheads = [h for h in headings if QPAT.match(h[2])]
    out = []
    ext = 0
    for idx, (i, level, head) in enumerate(qheads):
        start = i + 1
        end = qheads[idx + 1][0] if idx + 1 < len(qheads) else len(lines)
        body = "\n".join(lines[start:end])
        body = re.sub(r"^---+\s*$", "", body, flags=re.M)
        body = re.sub(r"\n{3,}", "\n\n", body).strip()
        expl = extract_explanation(body)
        if expl:
            stripped = re.sub(r"\*\*(一句话|结论|补充解释|详解)[：:][\s\S]*?\*\*\n?", "", body, count=1)
            if len(stripped.strip()) >= 10:
                body = stripped.strip()
        follow, body = extract_followups(body)
        code, body = extract_code(body)
        # 关键词行（如「关键词：图解法, 可行域」）优先，并从正文剥离，避免混入答案
        kw_m = re.search(r"^\s*关键词[：:]\s*(.+)$", body, flags=re.M)
        kw_line = []
        if kw_m:
            raw = kw_m.group(1)
            kw_line = [t.strip(" ，,、。“”\"'（）()（）") for t in re.split(r"[，,、\s]+", raw) if t.strip()]
            body = re.sub(r"^\s*关键词[：:].*$", "", body, flags=re.M).strip()
        kws = extract_keywords(body)
        seen = set()
        merged = []
        for k in kw_line + kws:
            if k and k not in seen and 1 <= len(k) <= 20:
                seen.add(k)
                merged.append(k)
        kws = merged[:10]
        m = QPAT.match(head)
        if m.group(1):  # Q\d
            qtext = re.sub(r"^Q\d+[.\：:]\s*", "", head).strip()
            qid = f"{source_label}-q{m.group(1)}"
        elif head.startswith("补充"):
            qtext = re.sub(r"^补充\s*Q[.\：:]\s*", "", head).strip()
            qid = f"{source_label}-sup"
        elif m.group(2):  # integer numbered
            qtext = re.sub(r"^\d+[.\：:]\s*", "", head).strip()
            qid = f"{source_label}-{level}-{m.group(2)}"
        else:  # Q： 答疑式（无编号）
            qtext = re.sub(r"^Q\s*[:：]\s*", "", head).strip()
            qtext = re.sub(r"追问[：:].*$", "", qtext).strip()
            ext += 1
            qid = f"{source_label}-ext{ext}"
        if not qtext:
            continue
        # 标题内联的「追问：…」抽取为 followUp（如 12/13 章的 ## Q2：...（追问：不用会怎样？））
        mz = re.search(r"追问[：:]\s*(.+?)[）)]\s*$", qtext)
        if mz:
            fu_text = mz.group(1).strip()
            if fu_text:
                follow.append(fu_text)
            qtext = re.sub(r"[（(]\s*追问[：:].*$", "", qtext).strip()
        out.append({
            "id": qid,
            "direction": direction,
            "questionType": qtype,
            "question": qtext,
            "keywords": kws,
            "answer": body,
            "explanation": expl,
            "code": code,
            "followUps": follow,
            "difficulty": 3,
            "orderPath": [source_label],
            "tags": [tag],
            "source": {"type": "knowledge_note", "section": source_label, "file": source_file},
            "status": "approved",
            "version": 1,
            "updatedAt": TODAY,
        })
    return out


# ----------------------------- 1. 清理 -----------------------------
def cleanup():
    print("=== 清理低质量题目 ===")
    p = os.path.join(DATA, "seed-from-notes.json")
    bank = json.load(open(p, encoding="utf-8"))
    before = len(bank)
    kept = [q for q in bank if q.get("direction") != "operations_optimization"]
    removed = before - len(kept)
    json.dump(kept, open(p, "w", encoding="utf-8"), ensure_ascii=False, indent=1)
    print(f"  seed-from-notes.json: {before} -> {len(kept)} (移除 ops {removed})")

    p = os.path.join(DATA, "scenario.json")
    sc = json.load(open(p, encoding="utf-8"))
    before = len(sc)
    kept = [q for q in sc if not (q["id"].startswith("scn-d") or q["id"].startswith("scn-o"))]
    json.dump(kept, open(p, "w", encoding="utf-8"), ensure_ascii=False, indent=1)
    print(f"  scenario.json: {before} -> {len(kept)} (移除 driving/ops 场景 {before - len(kept)})")

    p = os.path.join(DATA, "driving-seed.json")
    json.dump([], open(p, "w", encoding="utf-8"), ensure_ascii=False, indent=1)
    print(f"  driving-seed.json -> [] (清空智驾手写题)")


# ----------------------------- 2. 供应链导入 -----------------------------
def import_supply_chain():
    print("=== 导入供应链基础概念问答集 ===")
    md = open(SUPPLY_MD, encoding="utf-8").read()
    qs = parse_questions(
        md,
        source_label="supply-chain",
        direction="supply_chain",
        qtype="theory",
        tag="供应链基础",
        source_file=os.path.basename(SUPPLY_MD),
    )
    out = os.path.join(DATA, "supply-chain.json")
    json.dump(qs, open(out, "w", encoding="utf-8"), ensure_ascii=False, indent=1)
    print(f"  生成 {len(qs)} 题 -> supply-chain.json")
    for q in qs[:3]:
        print(f"    [{q['id']}] {q['question'][:40]} | 关键词 {q['keywords'][:5]}")


# ----------------------------- 3. Agent 八股导入 -----------------------------
def import_agent():
    print("=== 导入 我的AI-Agent问答集 ===")
    files = sorted(glob.glob(os.path.join(AGENT_DIR, "??-*.md")))
    all_q = []
    for f in files:
        name = os.path.basename(f)
        if name == "00-索引与说明.md":
            continue
        label = os.path.splitext(name)[0]          # 01-基础概念
        tag = re.sub(r"^\d+-", "", os.path.splitext(name)[0])  # 基础概念 / 强化学习 / ...
        md = open(f, encoding="utf-8").read()
        qs = parse_questions(
            md,
            source_label="agent-" + label,
            direction="agent_llm_application",
            qtype="theory",
            tag=tag,
            source_file=name,
        )
        if qs:
            print(f"  {name}: {len(qs)} 题 (含 {sum(1 for x in qs if x['id'].endswith('-sup') or '-ext' in x['id'])} 答疑/补充)")
            all_q.extend(qs)
    out = os.path.join(DATA, "agent-theory.json")
    json.dump(all_q, open(out, "w", encoding="utf-8"), ensure_ascii=False, indent=1)
    print(f"  合计生成 {len(all_q)} 题 -> agent-theory.json")
    with_code = sum(1 for x in all_q if x.get("code"))
    with_fu = sum(1 for x in all_q if x.get("followUps"))
    print(f"    其中含代码 {with_code} 题，含追问 {with_fu} 题")


# ----------------------------- 4. 运筹优化八股导入 -----------------------------
def import_ops():
    print("=== 导入 运筹优化八股题库 ===")
    files = sorted(glob.glob(os.path.join(OPS_DIR, "??-*.md")))
    all_q = []
    for f in files:
        name = os.path.basename(f)
        m = re.match(r"^(\d+)-(.+)\.md$", name)
        if not m:
            continue
        mod_no = m.group(1)
        tag = m.group(2)  # 中文模块名，如「线性规划与对偶」
        label = "ops" + mod_no
        md = open(f, encoding="utf-8").read()
        qs = parse_questions(
            md,
            source_label=label,
            direction="operations_optimization",
            qtype="theory",
            tag=tag,
            source_file=name,
        )
        # 重新编排 orderPath（模块序+题序）与难度梯度（2,2,3,3,4,4…）
        for i, q in enumerate(qs):
            q["orderPath"] = [mod_no, str(i + 1)]
            q["difficulty"] = 2 + min(2, i // 2)
        if qs:
            print(f"  {name}: {len(qs)} 题 (tag={tag})")
            all_q.extend(qs)
    out = os.path.join(DATA, "ops-theory.json")
    json.dump(all_q, open(out, "w", encoding="utf-8"), ensure_ascii=False, indent=1)
    print(f"  合计生成 {len(all_q)} 题 -> ops-theory.json")
    with_code = sum(1 for x in all_q if x.get("code"))
    with_fu = sum(1 for x in all_q if x.get("followUps"))
    print(f"    其中含代码 {with_code} 题，含追问 {with_fu} 题")


if __name__ == "__main__":
    args = set(sys.argv[1:])
    if not args or "all" in args:
        cleanup()
        print()
        import_supply_chain()
        print()
        import_agent()
    else:
        if "clean" in args:
            cleanup()
        if "supply" in args:
            import_supply_chain()
        if "agent" in args:
            import_agent()
        if "ops" in args:
            import_ops()
    print("\n完成。")
