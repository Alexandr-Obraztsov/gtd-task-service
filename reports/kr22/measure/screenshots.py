"""Снимки реального интерфейса (Chromium через Playwright) для отчёта. Нужны vite dev и API."""
import pathlib

from playwright.sync_api import sync_playwright

from common import DEV, login

IMG = pathlib.Path(__file__).resolve().parents[1] / 'img'
IMG.mkdir(exist_ok=True)
SIZE = {'width': 1000, 'height': 700}


def shot(page, name):
    page.screenshot(path=str(IMG / f'{name}.png'))
    print('shot', name)


def main():
    with sync_playwright() as p:
        browser = p.chromium.launch()
        context = browser.new_context(viewport=SIZE, device_scale_factor=2, locale='ru-RU')
        page = context.new_page()

        # Вход: ошибка сервера
        page.goto(f'{DEV}/login')
        page.fill('input[type=email]', 'user@gtd.local')
        page.fill('input[type=password]', 'wrong-Pass1!')
        page.click('button[type=submit]')
        page.wait_for_selector('.state-error')
        shot(page, 'uiLoginError')

        login(page, DEV)
        page.wait_for_load_state('networkidle')
        shot(page, 'uiList')

        # Пустой результат поиска
        page.fill('input[type=search]', 'несуществующая')
        page.wait_for_selector('.state-empty')
        shot(page, 'uiEmpty')
        page.fill('input[type=search]', '')
        page.wait_for_selector('.task-item')

        # Детали
        page.fill('input[type=search]', 'курсовой')
        page.wait_for_selector('.task-item')
        page.click('.task-title >> nth=0')
        page.wait_for_selector('.details')
        page.wait_for_load_state('networkidle')
        shot(page, 'uiDetails')

        # Форма редактирования
        page.click('text=Редактировать')
        page.wait_for_selector('form.form')
        page.wait_for_load_state('networkidle')
        shot(page, 'uiEdit')

        # Форма создания с ошибкой валидации
        page.goto(f'{DEV}/tasks/new')
        page.wait_for_selector('form.form')
        page.select_option('select[name=status]', 'scheduled')
        page.click('button[type=submit]')
        page.wait_for_selector('.field-error')
        shot(page, 'uiFormInvalid')

        # Главная с напоминаниями
        page.goto(DEV)
        page.wait_for_selector('.task-item')
        page.wait_for_load_state('networkidle')
        shot(page, 'uiHome')

        # Состояние загрузки: ответ списка задерживается на 2.5 с
        def slow(route):
            page.wait_for_timeout(2500)
            route.continue_()

        page.route('**/tasks?*', slow)
        page.goto(f'{DEV}/tasks')
        page.wait_for_selector('.state-loading', timeout=20000)
        page.wait_for_function("document.body.innerText.includes('Загружаем задачи')", timeout=20000)
        shot(page, 'uiLoading')
        page.wait_for_selector('.task-item', timeout=30000)
        page.unroute('**/tasks?*', slow)

        # Состояние ошибки: запросы списка обрываются
        page.route('**/tasks?*', lambda route: route.abort())
        page.fill('input[type=search]', 'a')
        page.wait_for_selector('.state-error')
        shot(page, 'uiError')
        browser.close()


main()
