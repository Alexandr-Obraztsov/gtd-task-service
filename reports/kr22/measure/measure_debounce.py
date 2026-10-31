"""Замер 1. Число запросов поиска при наборе слова: без debounce и с debounce 400 мс.

Запуск: vite dev (5173) и API (3101) должны быть запущены.
"""
import statistics
import time
from urllib.parse import unquote

from playwright.sync_api import sync_playwright

from common import DEV, api_log_len, api_log_since, login, save

WORD = 'позвонить'
DELAY_MS = 100  # интервал между нажатиями клавиш (≈10 символов/с)
RUNS = 5


def run_once(browser, debounce):
    context = browser.new_context()
    page = context.new_page()
    login(page, DEV)
    suffix = '' if debounce else '?debounce=0'
    page.goto(f'{DEV}/tasks{suffix}')
    page.wait_for_selector('.task-item')
    page.wait_for_load_state('networkidle')

    sent, finished, failed = [], [], []
    page.on('request', lambda r: sent.append(r) if '/tasks?' in r.url and 'q=' in r.url else None)
    page.on('requestfinished', lambda r: finished.append(r) if '/tasks?' in r.url and 'q=' in r.url else None)
    page.on('requestfailed', lambda r: failed.append(r) if '/tasks?' in r.url and 'q=' in r.url else None)

    log_start = api_log_len()
    page.evaluate('window.__perf.resetStats()')
    t0 = time.time()
    page.locator('input[type=search]').press_sequentially(WORD, delay=DELAY_MS)
    page.wait_for_timeout(1500)
    page.wait_for_load_state('networkidle')
    elapsed = time.time() - t0

    server_entries = [e for e in api_log_since(log_start) if 'q=' in e.get('path', '')]
    result = {
        'debounce': debounce,
        'browser_requests_sent': len(sent),
        'browser_requests_finished': len(finished),
        'browser_requests_cancelled': len(failed),
        'axios_tracker_requests': sum(1 for r in page.evaluate('window.__perf.stats.requests') if 'q=' in r['url']),
        'server_get_requests': sum(1 for e in server_entries if e['method'] == 'GET'),
        'server_preflight_requests': sum(1 for e in server_entries if e['method'] == 'OPTIONS'),
        'queries': [unquote(r.url.split('q=')[1].split('&')[0]) for r in sent],
        'final_total_text': page.inner_text('.total'),
        'elapsed_s': round(elapsed, 2),
    }
    context.close()
    return result


def main():
    runs = {'without_debounce': [], 'with_debounce': []}
    with sync_playwright() as p:
        browser = p.chromium.launch()
        for _ in range(RUNS):
            runs['without_debounce'].append(run_once(browser, False))
            runs['with_debounce'].append(run_once(browser, True))
        browser.close()
    summary = {
        'scenario': f'ввод слова «{WORD}» ({len(WORD)} символов), пауза между нажатиями {DELAY_MS} мс, затем ожидание 1.5 с',
        'runs_per_mode': RUNS,
        'runs': runs,
        'median_server_get_requests': {k: statistics.median(r['server_get_requests'] for r in v) for k, v in runs.items()},
        'median_browser_requests': {k: statistics.median(r['browser_requests_sent'] for r in v) for k, v in runs.items()},
    }
    save('debounce.json', summary)
    print(summary['median_browser_requests'], summary['median_server_get_requests'])


main()
