# -*- coding: utf-8 -*-
"""Выполняет сценарии КР1 против запущенного API и рисует панели «запрос/ответ»."""
import json
import os
import random
import re
import string
import urllib.error
import urllib.request

from PIL import Image, ImageDraw, ImageFont

BASE = "http://localhost:3000"
OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "img")
os.makedirs(OUT, exist_ok=True)

MONO = "/System/Library/Fonts/Menlo.ttc"
SANS = "/System/Library/Fonts/Helvetica.ttc"
W = 1560
PAD = 30


def font(path, size, bold=False):
    idx = 1 if bold else 0
    try:
        return ImageFont.truetype(path, size, index=idx)
    except Exception:
        return ImageFont.truetype(path, size)


F_MONO = font(MONO, 26)
F_LABEL = font(SANS, 24, bold=True)
F_METHOD = font(SANS, 30, bold=True)
F_STATUS = font(SANS, 28, bold=True)

COL_KEY = (163, 21, 120)
COL_STR = (0, 80, 170)
COL_NUM = (0, 130, 70)
COL_PLAIN = (40, 40, 40)
METHOD_COLORS = {"GET": (20, 130, 70), "POST": (190, 110, 0), "PUT": (20, 100, 190),
                 "PATCH": (120, 70, 170), "DELETE": (200, 40, 40)}


def call(method, path, body=None, token=None, headers=None):
    data = json.dumps(body).encode() if body is not None else None
    req = urllib.request.Request(BASE + path, data=data, method=method)
    if body is not None:
        req.add_header("Content-Type", "application/json")
    if token:
        req.add_header("Authorization", "Bearer " + token)
    for k, v in (headers or {}).items():
        req.add_header(k, v)
    try:
        resp = urllib.request.urlopen(req)
    except urllib.error.HTTPError as e:
        resp = e
    raw = resp.read().decode()
    try:
        parsed = json.loads(raw) if raw else None
    except ValueError:
        parsed = raw
    return resp.status, parsed, resp.reason


def mask(obj, keys=("accessToken", "refreshToken", "token")):
    if isinstance(obj, dict):
        return {k: (v[:22] + "…" if k in keys and isinstance(v, str) else mask(v, keys))
                for k, v in obj.items()}
    if isinstance(obj, list):
        return [mask(v, keys) for v in obj]
    return obj


def json_lines(obj):
    return json.dumps(obj, ensure_ascii=False, indent=2).split("\n")


def color_line(line):
    m = re.match(r'^(\s*)("(?:[^"\\]|\\.)*")(:\s*)(.*)$', line)
    if m:
        indent, key, colon, rest = m.groups()
        return [(indent, COL_PLAIN), (key, COL_KEY), (colon, COL_PLAIN)] + color_value(rest)
    return color_value(line)


def color_value(text):
    stripped = text.rstrip(",")
    comma = text[len(stripped):]
    lead = stripped[:len(stripped) - len(stripped.lstrip())]
    core = stripped.lstrip()
    if core.startswith('"'):
        col = COL_STR
    elif re.match(r"^-?\d", core) or core in ("true", "false", "null"):
        col = COL_NUM
    else:
        col = COL_PLAIN
    return [(lead, COL_PLAIN), (core, col), (comma, COL_PLAIN)]


def wrap_long(lines, limit=78):
    out = []
    for ln in lines:
        while len(ln) > limit:
            cut = ln.rfind(" ", 0, limit)
            if cut <= 0:
                cut = limit
            out.append(ln[:cut])
            ln = " " * (len(ln) - len(ln.lstrip()) + 2) + ln[cut:].lstrip()
        out.append(ln)
    return out


def render(name, method, url, status, reason, req_headers, req_body, resp_body):
    line_h = 36
    req_lines = wrap_long(json_lines(req_body)) if req_body is not None else []
    if resp_body is None:
        resp_lines = ["(тело ответа отсутствует)"]
    elif isinstance(resp_body, str):
        resp_lines = wrap_long(resp_body.split("\n"))
    else:
        resp_lines = wrap_long(json_lines(resp_body))

    hdr_h = 100
    sec_label_h = 56
    box_pad = 22
    hdr_rows = len(req_headers)
    h = hdr_h + sec_label_h + hdr_rows * 50 + 20
    if req_lines:
        h += box_pad * 2 + len(req_lines) * line_h + 20
    h += sec_label_h + box_pad * 2 + len(resp_lines) * line_h + 30

    img = Image.new("RGB", (W, h), (255, 255, 255))
    d = ImageDraw.Draw(img)
    d.rectangle([0, 0, W - 1, h - 1], outline=(215, 215, 215), width=2)
    d.rectangle([1, 1, W - 2, hdr_h], fill=(245, 245, 245))
    d.line([0, hdr_h, W, hdr_h], fill=(220, 220, 220), width=2)
    d.text((PAD, hdr_h // 2), method, font=F_METHOD, fill=METHOD_COLORS.get(method, (80, 80, 80)), anchor="lm")
    ux0 = PAD + 160
    d.rounded_rectangle([ux0, 22, W - 220, hdr_h - 22], radius=8, fill=(255, 255, 255), outline=(210, 210, 210), width=2)
    d.text((ux0 + 22, hdr_h // 2), url, font=F_MONO, fill=(30, 30, 30), anchor="lm")
    d.rounded_rectangle([W - 200, 24, W - PAD, hdr_h - 24], radius=8, fill=(0, 102, 214))
    d.text((W - 115, hdr_h // 2), "Send", font=F_METHOD, fill=(255, 255, 255), anchor="mm")

    y = hdr_h + 18
    d.text((PAD, y + 8), "REQUEST", font=F_LABEL, fill=(110, 110, 110))
    y += sec_label_h
    for k, v in req_headers:
        d.rectangle([PAD, y, W - PAD, y + 46], outline=(220, 220, 220), fill=(250, 250, 250), width=2)
        d.line([PAD + 400, y, PAD + 400, y + 46], fill=(220, 220, 220), width=2)
        d.text((PAD + 16, y + 23), k, font=F_MONO, fill=(60, 60, 60), anchor="lm")
        d.text((PAD + 416, y + 23), v, font=F_MONO, fill=(30, 30, 30), anchor="lm")
        y += 50
    y += 12
    if req_lines:
        bh = box_pad * 2 + len(req_lines) * line_h
        d.rounded_rectangle([PAD, y, W - PAD, y + bh], radius=8, fill=(250, 250, 250), outline=(225, 225, 225), width=2)
        ty = y + box_pad
        for ln in req_lines:
            x = PAD + 22
            for text, col in color_line(ln):
                d.text((x, ty), text, font=F_MONO, fill=col)
                x += d.textlength(text, font=F_MONO)
            ty += line_h
        y += bh + 20

    d.line([0, y, W, y], fill=(225, 225, 225), width=2)
    y += 18
    d.text((PAD, y + 8), "RESPONSE", font=F_LABEL, fill=(110, 110, 110))
    ok = status < 400
    d.text((PAD + 190, y + 6), f"Status: {status} {reason}", font=F_STATUS,
           fill=(20, 130, 70) if ok else (200, 40, 40))
    y += sec_label_h
    bh = box_pad * 2 + len(resp_lines) * line_h
    d.rounded_rectangle([PAD, y, W - PAD, y + bh], radius=8, fill=(250, 250, 250), outline=(225, 225, 225), width=2)
    ty = y + box_pad
    for ln in resp_lines:
        x = PAD + 22
        for text, col in color_line(ln):
            d.text((x, ty), text, font=F_MONO, fill=col)
            x += d.textlength(text, font=F_MONO)
        ty += line_h
    img.save(os.path.join(OUT, name + ".png"))
    return status


def scenario(name, method, path, status_expected, token=None, body=None, show_body=None,
             token_label=None, resp_transform=mask):
    st, resp, reason = call(method, path, body, token)
    assert st == status_expected, (name, st, resp)
    req_headers = []
    if body is not None:
        req_headers.append(("Content-Type", "application/json"))
    if token:
        req_headers.append(("Authorization", "Bearer " + (token_label or token[:22] + "…")))
    shown_req = show_body if show_body is not None else body
    render(name, method, BASE + path, st, reason, req_headers, shown_req,
           resp_transform(resp) if resp is not None else None)
    return resp


rnd = "".join(random.choices(string.ascii_lowercase + string.digits, k=5))
email = f"student.{rnd}@example.com"
password = "Student#Pass123"

# --- аутентификация
scenario("register", "POST", "/auth/register", 201,
         body={"email": email, "password": password},
         show_body={"email": email, "password": "•" * 15})
scenario("registerDup", "POST", "/auth/register", 409,
         body={"email": email, "password": password},
         show_body={"email": email, "password": "•" * 15})
scenario("registerBad", "POST", "/auth/register", 400,
         body={"email": "not-an-email", "password": "123"},
         show_body={"email": "not-an-email", "password": "•••"})
session = scenario("login", "POST", "/auth/login", 200,
                   body={"email": email, "password": password},
                   show_body={"email": email, "password": "•" * 15})
scenario("loginBad", "POST", "/auth/login", 401,
         body={"email": email, "password": "Wrong#Pass999"},
         show_body={"email": email, "password": "•" * 13})
token = session["accessToken"]

admin = call("POST", "/auth/login", {"email": "admin@gtd.local", "password": "Admin#Pass123"})[1]
admin_token = admin["accessToken"]

# --- CRUD
scenario("noToken", "GET", "/tasks", 401)
ctx = call("POST", "/contexts", {"name": "@computer"}, token)[1]
task = scenario("createTask", "POST", "/tasks", 201, token=token,
                body={"title": "Подготовить отчёт по КР №1", "notes": "Раздел 3",
                      "status": "next", "dueDate": "2026-11-05T09:00:00Z",
                      "remindAt": "2026-11-04T18:00:00Z", "contextId": ctx["id"]})
call("POST", "/tasks", {"title": "Купить продукты", "status": "inbox"}, token)
call("POST", "/tasks", {"title": "Созвониться с деканатом", "status": "next"}, token)
tid = task["id"]
scenario("listTasks", "GET", f"/tasks?status=next&contextId={ctx['id']}", 200, token=token)
scenario("getTask", "GET", f"/tasks/{tid}", 200, token=token)
scenario("putTask", "PUT", f"/tasks/{tid}", 200, token=token,
         body={"title": "Подготовить отчёт по КР №1 (готово к сдаче)", "status": "waiting",
               "notes": "Ждём проверки"})
scenario("createBad", "POST", "/tasks", 400, token=token,
         body={"title": "", "status": "someday-maybe"})
scenario("putBad", "PUT", f"/tasks/{tid}", 400, token=token, body={"notes": "без заголовка"})
scenario("deleteUser", "DELETE", f"/tasks/{tid}", 403, token=token)
scenario("deleteAdmin", "DELETE", f"/tasks/{tid}", 204, token=admin_token,
         token_label=admin_token[:22] + "…")
scenario("getDeleted", "GET", f"/tasks/{tid}", 404, token=token)
scenario("badToken", "GET", "/tasks", 401, token="eyJhbGciOiJIUzI1NiJ9.broken.token", token_label="eyJhbGciOiJIUzI1NiJ9.broken…")
print("ok", email)
