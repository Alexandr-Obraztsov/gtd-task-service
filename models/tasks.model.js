let tasks = [
  {
    id: 1,
    title: 'Позвонить в деканат',
    context: '@calls',
    status: 'next',
    dueDate: '2026-09-18',
    reminderAt: '2026-09-18T09:00:00',
    notes: 'Уточнить сроки пересдачи',
    createdAt: '2026-09-15T10:00:00.000Z',
  },
  {
    id: 2,
    title: 'Купить продукты',
    context: '@errands',
    status: 'inbox',
    dueDate: null,
    reminderAt: null,
    notes: '',
    createdAt: '2026-09-15T10:05:00.000Z',
  },
  {
    id: 3,
    title: 'Сверстать отчёт по лабораторной',
    context: '@computer',
    status: 'waiting',
    dueDate: '2026-09-20',
    reminderAt: '2026-09-19T18:00:00',
    notes: 'Ждём скриншоты из Postman',
    createdAt: '2026-09-15T10:10:00.000Z',
  },
];

let nextId = 4;

function getAll() {
  return tasks;
}

function getById(id) {
  return tasks.find((task) => task.id === id);
}

function create(data) {
  const task = {
    id: nextId++,
    title: data.title,
    context: data.context,
    status: data.status || 'inbox',
    dueDate: data.dueDate || null,
    reminderAt: data.reminderAt || null,
    notes: data.notes || '',
    createdAt: new Date().toISOString(),
  };
  tasks.push(task);
  return task;
}

function update(id, data) {
  const index = tasks.findIndex((task) => task.id === id);
  if (index === -1) return null;

  const updated = {
    ...tasks[index],
    title: data.title,
    context: data.context,
    status: data.status,
    dueDate: data.dueDate ?? null,
    reminderAt: data.reminderAt ?? null,
    notes: data.notes ?? '',
  };
  tasks[index] = updated;
  return updated;
}

function remove(id) {
  const index = tasks.findIndex((task) => task.id === id);
  if (index === -1) return false;
  tasks.splice(index, 1);
  return true;
}

module.exports = { getAll, getById, create, update, remove };
