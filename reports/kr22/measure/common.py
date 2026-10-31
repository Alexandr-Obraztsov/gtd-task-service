"""Общие функции скриптов замеров КР №2 (Playwright + логи API)."""
import json
import pathlib
import sys

ROOT = pathlib.Path(__file__).resolve().parents[3]
OUT = pathlib.Path(__file__).resolve().parents[1] / 'measurements'
OUT.mkdir(exist_ok=True)
LOG_DIR = ROOT / 'logs'

DEV = 'http://localhost:5173'
API = 'http://localhost:3101'


def login(page, base, email='user@gtd.local', password='User#Pass123'):
    page.goto(f'{base}/login')
    page.fill('input[type=email]', email)
    page.fill('input[type=password]', password)
    page.click('button[type=submit]')
    page.wait_for_url('**/tasks')
    page.wait_for_selector('.task-item')


def api_log_file():
    return sorted(LOG_DIR.glob('app-*.log'))[-1]


def api_log_len():
    return len(api_log_file().read_text(encoding='utf-8').splitlines())


def api_log_since(start):
    """Строки http-журнала API, появившиеся после строки start."""
    lines = api_log_file().read_text(encoding='utf-8').splitlines()[start:]
    entries = []
    for line in lines:
        try:
            item = json.loads(line)
        except ValueError:
            continue
        if item.get('message') == 'http':
            entries.append(item)
    return entries


def save(name, data):
    path = OUT / name
    path.write_text(json.dumps(data, ensure_ascii=False, indent=2), encoding='utf-8')
    print(f'saved {path}', file=sys.stderr)
