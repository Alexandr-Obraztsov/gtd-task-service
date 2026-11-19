import { http } from './http';

// Пустые параметры (q: '', status: '') не отправляются на сервер.
function compact(params) {
  return Object.fromEntries(Object.entries(params).filter(([, value]) => value !== '' && value != null));
}

export async function listTasks({ q, status, limit, offset }, signal) {
  const { data } = await http.get('/tasks', { params: compact({ q, status, limit, offset }), signal });
  return data;
}

export async function listDueReminders(signal) {
  const { data } = await http.get('/tasks/reminders/due', { params: { limit: 5 }, signal });
  return data;
}

export async function getTask(id, signal) {
  const { data } = await http.get(`/tasks/${id}`, { signal });
  return data;
}

export async function createTask(payload) {
  const { data } = await http.post('/tasks', payload);
  return data;
}

// Полная замена задачи (PUT): не переданные поля сервер сбрасывает к значениям по умолчанию.
export async function replaceTask(id, payload) {
  const { data } = await http.put(`/tasks/${id}`, payload);
  return data;
}

export async function patchTask(id, changes) {
  const { data } = await http.patch(`/tasks/${id}`, changes);
  return data;
}

export async function deleteTask(id) {
  await http.delete(`/tasks/${id}`);
}
