"""Замер 2. React.memo для строки списка: число рендеров TaskItem и время коммитов (Profiler).

Нужна profiling-сборка клиента (npm run build:profiling) на http://localhost:4173
(vite preview --outDir dist-profiling) и API на 3101.
"""
import statistics

from playwright.sync_api import sync_playwright

from common import api_log_len, login, save

BASE = 'http://localhost:4173'
RUNS = 5
DELAY_MS = 100


def read_stats(page):
    return page.evaluate(
        '({renders: window.__perf.stats.renders.TaskItem || 0,'
        ' commits: window.__perf.stats.commits.count,'
        ' duration: window.__perf.stats.commits.actualDuration})'
    )


def scenario(page, selector, text):
    page.evaluate('window.__perf.resetStats()')
    page.locator(selector).press_sequentially(text, delay=DELAY_MS)
    page.wait_for_timeout(1200)
    page.wait_for_load_state('networkidle')
    return read_stats(page)


def run_once(browser, memo):
    context = browser.new_context()
    page = context.new_page()
    login(page, BASE)
    page.goto(f'{BASE}/tasks' + ('' if memo else '?memo=0'))
    page.wait_for_selector('.task-item')
    page.wait_for_load_state('networkidle')
    initial = read_stats(page)
    typing_draft = scenario(page, 'input[aria-label="Название новой задачи"]', 'Проверить')
    typing_search = scenario(page, 'input[type=search]', 'позвонить')
    context.close()
    return {'memo': memo, 'initial_mount': initial, 'type_in_quick_add': typing_draft, 'type_in_search': typing_search}


def median(runs, scenario_name, key):
    return round(statistics.median(r[scenario_name][key] for r in runs), 2)


def main():
    result = {'without_memo': [], 'with_memo': []}
    with sync_playwright() as p:
        browser = p.chromium.launch()
        for _ in range(RUNS):
            result['without_memo'].append(run_once(browser, False))
            result['with_memo'].append(run_once(browser, True))
        browser.close()
    summary = {
        'build': 'vite build --mode profiling (react-dom/profiling)',
        'scenarios': {
            'type_in_quick_add': 'ввод 9 символов в поле «Быстро добавить» при 20 строках списка',
            'type_in_search': 'ввод 9 символов в поле поиска (debounce включён) и загрузка результата',
        },
        'runs_per_mode': RUNS,
        'runs': result,
        'median': {
            mode: {
                name: {k: median(runs, name, k) for k in ('renders', 'commits', 'duration')}
                for name in ('initial_mount', 'type_in_quick_add', 'type_in_search')
            }
            for mode, runs in result.items()
        },
    }
    save('memo.json', summary)
    print(summary['median'])


main()
