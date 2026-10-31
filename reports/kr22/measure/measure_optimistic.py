"""Замер 4. Оптимистичное обновление: время от клика до изменения интерфейса.

Задержка сети эмулируется через CDP (Network.emulateNetworkConditions, latency 300 мс
на каждый запрос, включая preflight). Работает под admin (удаление разрешено только ему);
создаваемые тестовые задачи удаляются в том же прогоне.
Нужен vite dev (5173) и API (3101).
"""
import statistics
import time

from playwright.sync_api import sync_playwright

from common import DEV, login, save

RUNS = 5
LATENCY_MS = 300


def timed(page, action, selector, state='visible'):
    start = time.perf_counter()
    action()
    page.wait_for_selector(selector, state=state, timeout=15000)
    return round((time.perf_counter() - start) * 1000)


def run_once(browser, optimistic, index):
    context = browser.new_context()
    page = context.new_page()
    login(page, DEV, 'admin@gtd.local', 'Admin#Pass123')
    page.goto(f'{DEV}/tasks' + ('' if optimistic else '?optimistic=0'))
    page.wait_for_selector('.task-item')
    page.wait_for_load_state('networkidle')
    cdp = context.new_cdp_session(page)
    cdp.send('Network.enable')
    cdp.send('Network.emulateNetworkConditions', {
        'offline': False, 'latency': LATENCY_MS, 'downloadThroughput': -1, 'uploadThroughput': -1})

    title = f'Замер оптимистичности {int(optimistic)}-{index}-{int(time.time())}'
    row = f'.task-item:has-text("{title}")'
    page.fill('input[aria-label="Название новой задачи"]', title)
    create_ms = timed(page, lambda: page.click('button:has-text("Добавить")'), row)
    page.wait_for_selector(f'{row}:not(.is-pending)', timeout=15000)  # дождаться ответа сервера
    toggle_ms = timed(page, lambda: page.locator(row).locator('input[type=checkbox]').click(),
                      f'{row}.is-done')
    page.wait_for_timeout(1500)
    delete_ms = timed(page, lambda: page.locator(row).locator('button:has-text("Удалить")').click(),
                      row, state='detached')
    page.wait_for_timeout(1200)
    context.close()
    return {'optimistic': optimistic, 'create_ms': create_ms, 'toggle_ms': toggle_ms, 'delete_ms': delete_ms}


def main():
    runs = {'without_optimistic': [], 'with_optimistic': []}
    with sync_playwright() as p:
        browser = p.chromium.launch()
        for i in range(RUNS):
            runs['without_optimistic'].append(run_once(browser, False, i))
            runs['with_optimistic'].append(run_once(browser, True, i))
        browser.close()
    summary = {
        'emulated_latency_ms_per_request': LATENCY_MS,
        'runs_per_mode': RUNS,
        'runs': runs,
        'median_ms': {
            mode: {k: int(statistics.median(r[k] for r in v)) for k in ('create_ms', 'toggle_ms', 'delete_ms')}
            for mode, v in runs.items()
        },
    }
    save('optimistic.json', summary)
    print(summary['median_ms'])


main()
