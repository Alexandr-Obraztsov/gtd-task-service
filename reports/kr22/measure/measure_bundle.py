"""Замер 3. Route-based code splitting: объём JS и время первой отрисовки страницы входа.

Базовый вариант (все страницы импортируются статически) — http://localhost:4174,
вариант с React.lazy — http://localhost:4173. Оба — production-сборки `vite build`.
Профиль «медленная сеть»: CDP Network.emulateNetworkConditions 1.6 Мбит/с, RTT 150 мс,
плюс замедление CPU в 4 раза.
"""
import statistics

from playwright.sync_api import sync_playwright

from common import save

VARIANTS = {'without_splitting': 'http://localhost:4174', 'with_splitting': 'http://localhost:4173'}
RUNS = 7
PATH = '/login'

PROFILES = {
    'no_throttling': None,
    'slow_network_cpu4x': {
        'network': {'offline': False, 'latency': 150, 'downloadThroughput': 1.6 * 1024 * 1024 / 8,
                    'uploadThroughput': 750 * 1024 / 8},
        'cpu': 4,
    },
}


def run_once(browser, base, profile):
    context = browser.new_context()
    page = context.new_page()
    cdp = context.new_cdp_session(page)
    cdp.send('Network.enable')
    cdp.send('Network.setCacheDisabled', {'cacheDisabled': True})
    if profile:
        cdp.send('Network.emulateNetworkConditions', profile['network'])
        cdp.send('Emulation.setCPUThrottlingRate', {'rate': profile['cpu']})

    scripts = []
    page.on('requestfinished', lambda r: scripts.append(r) if r.resource_type == 'script' else None)

    page.goto(base + PATH, wait_until='load')
    page.wait_for_selector('form')
    page.wait_for_timeout(300)
    fcp = page.evaluate(
        "performance.getEntriesByName('first-contentful-paint')[0]?.startTime ?? null")
    form_visible = page.evaluate('performance.now()')
    result = {
        'js_requests': len(scripts),
        'js_files': sorted(r.url.rsplit('/', 1)[-1] for r in scripts),
        'js_transfer_bytes': sum(r.sizes()['responseBodySize'] + r.sizes()['responseHeadersSize'] for r in scripts),
        'fcp_ms': round(fcp, 1) if fcp else None,
    }
    context.close()
    return result


def main():
    out = {'path': PATH, 'runs_per_variant': RUNS, 'profiles': {}}
    with sync_playwright() as p:
        browser = p.chromium.launch()
        for profile_name, profile in PROFILES.items():
            out['profiles'][profile_name] = {}
            for variant, base in VARIANTS.items():
                runs = [run_once(browser, base, profile) for _ in range(RUNS)]
                out['profiles'][profile_name][variant] = {
                    'runs': runs,
                    'median_js_transfer_bytes': int(statistics.median(r['js_transfer_bytes'] for r in runs)),
                    'median_js_requests': statistics.median(r['js_requests'] for r in runs),
                    'median_fcp_ms': round(statistics.median(r['fcp_ms'] for r in runs), 1),
                }
        browser.close()
    save('bundle.json', out)
    for profile_name, variants in out['profiles'].items():
        for variant, data in variants.items():
            print(profile_name, variant, data['median_js_transfer_bytes'], data['median_js_requests'], data['median_fcp_ms'])


main()
