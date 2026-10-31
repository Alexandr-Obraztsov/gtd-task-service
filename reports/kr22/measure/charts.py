"""Диаграммы для отчёта строятся только по файлам из ../measurements (реальные замеры)."""
import json
import pathlib

import matplotlib

matplotlib.use('Agg')
import matplotlib.pyplot as plt

M = pathlib.Path(__file__).resolve().parents[1] / 'measurements'
IMG = pathlib.Path(__file__).resolve().parents[1] / 'img'
plt.rcParams.update({'font.family': 'Helvetica', 'font.size': 11})
BEFORE, AFTER = '#c92a2a', '#2b8a3e'


def bars(ax, title, labels, before, after, unit):
    x = range(len(labels))
    w = 0.38
    b1 = ax.bar([i - w / 2 for i in x], before, w, color=BEFORE, label='до')
    b2 = ax.bar([i + w / 2 for i in x], after, w, color=AFTER, label='после')
    ax.bar_label(b1, padding=2)
    ax.bar_label(b2, padding=2)
    ax.set_xticks(list(x), labels)
    ax.set_title(title, fontsize=11)
    ax.set_ylabel(unit)
    ax.legend(frameon=False)
    ax.spines[['top', 'right']].set_visible(False)


def save(fig, name):
    fig.tight_layout()
    fig.savefig(IMG / name, dpi=200)
    plt.close(fig)


d = json.loads((M / 'debounce.json').read_text(encoding='utf-8'))
first_off = d['runs']['without_debounce'][0]
fig, ax = plt.subplots(figsize=(6.2, 3.2))
bars(ax, 'Запросов GET /tasks?q= при вводе «позвонить» (медиана 5 прогонов)', ['поиск'],
     [d['median_browser_requests']['without_debounce']], [d['median_browser_requests']['with_debounce']], 'запросов')
save(fig, 'chartDebounce.png')

m = json.loads((M / 'memo.json').read_text(encoding='utf-8'))['median']
fig, axes = plt.subplots(1, 2, figsize=(8, 3.3))
names = ['type_in_quick_add', 'type_in_search']
labels = ['ввод в «Быстро добавить»', 'ввод в поиск']
bars(axes[0], 'Рендеров TaskItem', labels,
     [int(m['without_memo'][n]['renders']) for n in names], [int(m['with_memo'][n]['renders']) for n in names], 'рендеров')
bars(axes[1], 'Время коммитов Profiler', labels,
     [m['without_memo'][n]['duration'] for n in names], [m['with_memo'][n]['duration'] for n in names], 'мс')
save(fig, 'chartMemo.png')

o = json.loads((M / 'optimistic.json').read_text(encoding='utf-8'))['median_ms']
fig, ax = plt.subplots(figsize=(6.2, 3.2))
bars(ax, 'Время до изменения интерфейса (задержка сети 300 мс)', ['создание', 'отметка', 'удаление'],
     [o['without_optimistic'][k] for k in ('create_ms', 'toggle_ms', 'delete_ms')],
     [o['with_optimistic'][k] for k in ('create_ms', 'toggle_ms', 'delete_ms')], 'мс')
save(fig, 'chartOptimistic.png')
print('ok')
