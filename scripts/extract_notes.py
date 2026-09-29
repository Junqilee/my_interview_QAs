#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
从个人笔记中抽取面试种子题 -> src/data/seed-from-notes.json
只读取，不修改原始笔记。所有题目 status=approved（第一轮即用）。
运行: python scripts/extract_notes.py
"""
import re, json, os, hashlib
from datetime import date

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, "src", "data", "seed-from-notes.json")
TODAY = date.today().isoformat()

SOURCES = {
    "weilai": r"C:/00 Personal/03 Agent基础概念学习/蔚来实习校招100题.md",
    "nexent_03b": r"C:/01 work/nexent/My notes/面试准备-memory和智能体评测/03b-大厂Agent校招模拟面试100题-渐进追问版.md",
    "meituan": r"C:/00 Personal/06 秋招面试准备/07 美团-运筹优化算法/美团运筹优化算法_面试准备问题集.md",
    "xiecheng": r"C:/00 Personal/03 Agent基础概念学习/携程Agent开发工程师_一面问答集.md",
    "daji": r"C:/00 Personal/03 Agent基础概念学习/大疆面试问答集.md",
    "agent_qa_dir": r"C:/00 Personal/03 Agent基础概念学习/我的AI-Agent问答集",
}

questions = []
seen_hash = set()


def add(q):
    if not q.get("question") or not q.get("answer"):
        return
    if len(q["answer"]) < 15:
        return
    h = hashlib.md5((q["question"] + q["answer"][:40]).encode("utf-8")).hexdigest()
    if h in seen_hash:
        return
    seen_hash.add(h)
    q.setdefault("title", "")
    q.setdefault("followUps", [])
    q.setdefault("tags", [])
    q.setdefault("orderPath", [])
    q.setdefault("explanation", "")
    q.setdefault("difficulty", 3)
    if q.get("code") is None:
        q.pop("code", None)
    q["status"] = "approved"
    q["version"] = 1
    q["updatedAt"] = TODAY
    if "id" not in q:
        q["id"] = "seed-" + h[:10]
    questions.append(q)


def split_q(text, pattern):
    ms = list(re.finditer(pattern, text, re.M))
    out = []
    for i, m in enumerate(ms):
        start = m.start()
        end = ms[i + 1].start() if i + 1 < len(ms) else len(text)
        out.append((m, text[start:end]))
    return out


def derive_keywords(text, n=5):
    text = re.sub(r"\s+", " ", text).strip()
    # 取前几个关键短语：按中文/英文 token 粗略切
    chunks = re.split(r"[，。；;、,.]+", text)
    kws = []
    for c in chunks:
        c = c.strip()
        if 2 <= len(c) <= 20:
            kws.append(c)
        if len(kws) >= n:
            break
    return kws[:n] if kws else [text[:20]]


# ---------------- 蔚来100题 ----------------
def parse_weilai(path):
    txt = open(path, encoding="utf-8").read()
    for m, body in split_q(txt, r"^###\s*Q(\d+)\.\s*(.+)$"):
        num = int(m.group(1))
        qtext = m.group(2).strip()
        ti = re.search(r"\*\*题意\*\*[:：]\s*(.*?)(?=\n\*\*回答|\Z)", body, re.S)
        ans = re.search(r"\*\*回答\*\*[:：]\s*(.*?)(?=\n\*\*代码来源|\n###|\Z)", body, re.S)
        code = re.search(r"\*\*代码来源\*\*[:：]\s*(.*?)(?=\n###|\Z)", body, re.S)
        if not ans:
            continue
        answer = ans.group(1).strip()
        keywords = [x.strip() for x in ti.group(1).split("；")[:5]] if ti else derive_keywords(answer)
        if num <= 70:
            qtype, stype, op = "project_drill", "project_note", ["蔚来RCA", f"Q{num}"]
        elif num <= 90:
            qtype, stype, op = "theory", "knowledge_note", ["蔚来八股", f"Q{num}"]
        else:
            qtype, stype, op = "scenario", "scenario_seed", ["蔚来开放", f"Q{num}"]
        expl = ("代码来源：" + code.group(1).strip()) if code else ""
        add({
            "id": f"weilai-q{num}",
            "direction": "agent_llm_application",
            "questionType": qtype,
            "question": qtext,
            "keywords": keywords,
            "answer": answer,
            "explanation": expl,
            "tags": ["蔚来", "RCA"],
            "orderPath": op,
            "source": {"type": stype, "file": "蔚来实习校招100题.md", "section": f"Q{num}"},
        })


# ---------------- nexent 03b 渐进追问 ----------------
def parse_nexent03b(path):
    txt = open(path, encoding="utf-8").read()
    # 补充问题
    supp = re.split(r"\n#\s*阶段一", txt)[0]
    for m in re.finditer(r"Q[：:]\s*(.*?)\nA[：:]\s*(.*?)(?=\nQ[：:]|\n#|\Z)", supp, re.S):
        q, a = m.group(1).strip(), m.group(2).strip()
        add({
            "direction": "agent_llm_application",
            "questionType": "project_drill",
            "question": q,
            "keywords": derive_keywords(a),
            "answer": a,
            "explanation": "",
            "tags": ["Nexent", "框架选型"],
            "orderPath": ["Nexent补充问题"],
            "source": {"type": "project_note", "file": "03b-大厂Agent校招模拟面试100题-渐进追问版.md", "section": "补充问题"},
        })
    # 阶段 Q
    for m, body in split_q(txt, r"^###\s*Q(\d+)[（(]面试官[）)][：:]?\s*(.+)$"):
        num = int(m.group(1)); qtext = m.group(2).strip()
        ans = re.search(r"\*\*答\*\*[:：]\s*(.*?)(?=\n\*\*追问|\n###|\n#|\Z)", body, re.S)
        if not ans:
            continue
        follow = re.search(r"\*\*追问\*\*[:：]\s*(.*?)(?=\n###|\n#|\Z)", body, re.S)
        fus = []
        if follow:
            fus = [x.strip(" -") for x in re.findall(r"^\s*[-*]\s*(.+)$", follow.group(1), re.M)]
        add({
            "id": f"nexent-q{num}",
            "direction": "agent_llm_application",
            "questionType": "project_drill",
            "question": qtext,
            "keywords": derive_keywords(ans.group(1)),
            "answer": ans.group(1).strip(),
            "explanation": "",
            "followUps": fus,
            "tags": ["Nexent", "Memory", "评测"],
            "orderPath": ["Nexent渐进追问", f"Q{num}"],
            "source": {"type": "project_note", "file": "03b-...渐进追问版.md", "section": f"Q{num}"},
        })


# ---------------- 美团运筹 ----------------
def parse_meituan(path):
    txt = open(path, encoding="utf-8").read()
    # 第3节 背景迁移场景题
    for m, body in split_q(txt, r"^###\s*Q(\d+)\.\s*(.+)$"):
        ans = re.search(r"\*\*答\*\*[:：]\s*(.*?)(?=\n###|\n##|\Z)", body, re.S)
        if not ans:
            continue
        add({
            "direction": "operations_optimization",
            "questionType": "scenario",
            "question": m.group(2).strip(),
            "keywords": derive_keywords(ans.group(1)),
            "answer": ans.group(1).strip(),
            "explanation": "把你的运筹/物流经历用「美团即时配送」岗位语言重新讲一遍。",
            "tags": ["美团", "运筹", "迁移"],
            "orderPath": ["美团场景题", f"Q{m.group(1)}"],
            "source": {"type": "knowledge_note", "file": "美团运筹优化算法_面试准备问题集.md", "section": f"Q{m.group(1)}"},
        })
    # 第4节 必背关键词表 -> 八股
    for row in re.findall(r"^\|\s*([^|\n]+?)\s*\|\s*([^|\n]+?)\s*\|\s*([^|\n]+?)\s*\|\s*$", txt, re.M):
        zh, en, desc = [x.strip() for x in row]
        if zh in ("中文", "") or set(zh) <= set("-: "):
            continue
        if not desc or len(desc) < 4:
            continue
        add({
            "direction": "operations_optimization",
            "questionType": "theory",
            "question": f"请解释「{zh}」（{en}）是什么、一句话怎么记？",
            "keywords": [zh, en],
            "answer": desc,
            "explanation": "运筹八股速记词条，临场中英对照不出戏。",
            "tags": ["运筹", "八股"],
            "orderPath": ["运筹关键词", zh],
            "source": {"type": "knowledge_note", "file": "美团运筹优化算法_面试准备问题集.md", "section": "必背关键词"},
        })


# ---------------- 携程 / 大疆 真实面试 ----------------
def _add_real(q, a, company, direction, section, fname):
    a = re.sub(r"\s+", " ", a).strip()
    if len(a) < 8:
        return
    add({
        "direction": direction,
        "questionType": "real_interview",
        "question": q.strip(),
        "keywords": derive_keywords(a),
        "answer": a,
        "explanation": "真实面试真题，复盘后补充自己的回答与追问。",
        "tags": [company, "真题"],
        "orderPath": [f"{company}真题", section],
        "source": {"type": "real_interview", "file": fname, "interviewCompany": company},
    })


def parse_real(path, company, direction):
    fname = os.path.basename(path)
    txt = open(path, encoding="utf-8").read()
    if company == "携程":
        # 形如 `1. **问题** → 答案` 的真题列表（集中在 ## 2.x 一面题区）
        for region in re.split(r"\n##\s", txt):
            if not region.startswith("2."):
                continue
            for m in re.finditer(r"^\d+\.\s*\*\*(.+?)\*\*\s*→\s*(.+)$", region, re.M):
                _add_real(m.group(1), m.group(2), company, direction, "一面真题", fname)
    elif company == "大疆":
        # ### Q1. 问题 + 正文；### 5.x 业务拆解案例题
        for pat in [r"^###\s*Q\d+\.\s*(.+)$", r"^###\s*5\.\d+\s*(.+)$"]:
            for m, body in split_q(txt, pat):
                content = body[len(m.group(0)):]
                ans = re.split(r"\n#{2,3}\s", content)[0]
                ans = re.sub(r"\n{2,}", "\n", ans).strip()
                _add_real(m.group(1), ans, company, direction, "高频题", fname)


# ---------------- 我的AI-Agent问答集 八股 ----------------
def parse_agent_qa(d):
    if not os.path.isdir(d):
        return
    for fn in sorted(os.listdir(d)):
        if not fn.endswith(".md") or fn.startswith("00-"):
            continue
        txt = open(os.path.join(d, fn), encoding="utf-8").read()
        for m, body in split_q(txt, r"^###\s*Q(\d+)[．.]\s*(.+)$"):
            ans = re.search(r"^\s*(.+?)(?=\n###|\n##|\Z)", body[m.end()-body[:m.start()].rfind("\n")-0:], re.S)
            # 简单取标题后第一段非空文本
            seg = body[m.end():]
            seg = re.split(r"\n#{2,4}\s|\n###\s", seg)[0]
            ans_text = re.sub(r"^\s*#{1,6}\s.*$", "", seg, flags=re.M).strip()
            ans_text = re.sub(r"\n{2,}", "\n", ans_text)
            if len(ans_text) < 20:
                continue
            add({
                "direction": "agent_llm_application",
                "questionType": "theory",
                "question": m.group(2).strip(),
                "keywords": derive_keywords(ans_text),
                "answer": ans_text,
                "explanation": "",
                "tags": ["Agent", "八股", fn.replace(".md", "")],
                "orderPath": ["Agent问答集", fn.replace(".md", ""), f"Q{m.group(1)}"],
                "source": {"type": "knowledge_note", "file": "我的AI-Agent问答集/" + fn},
            })


if __name__ == "__main__":
    parse_weilai(SOURCES["weilai"])
    parse_nexent03b(SOURCES["nexent_03b"])
    parse_meituan(SOURCES["meituan"])
    parse_real(SOURCES["xiecheng"], "携程", "agent_llm_application")
    parse_real(SOURCES["daji"], "大疆", "operations_optimization")
    parse_agent_qa(SOURCES["agent_qa_dir"])

    os.makedirs(os.path.dirname(OUT), exist_ok=True)
    with open(OUT, "w", encoding="utf-8") as f:
        json.dump(questions, f, ensure_ascii=False, indent=2)
    print(f"共抽取 {len(questions)} 道题 -> {OUT}")
    from collections import Counter
    print("按方向:", Counter(q["direction"] for q in questions))
    print("按类型:", Counter(q["questionType"] for q in questions))
