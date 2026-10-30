import { useCallback, useEffect, useReducer, useRef, useState } from 'react';
import * as tasksApi from '../api/tasks';
import { isCancelled, normalizeError } from '../api/errors';
import { flags } from '../perf/flags';

const initialState = { items: [], total: 0, loading: true, error: null, mutationError: null };

function reducer(state, action) {
  switch (action.type) {
    case 'load':
      return { ...state, loading: true, error: null };
    case 'loaded':
      return { ...state, loading: false, items: action.page.items, total: action.page.total };
    case 'failed':
      return { ...state, loading: false, error: action.error };
    case 'add':
      return { ...state, items: [action.task, ...state.items], total: state.total + 1 };
    case 'replace':
      return { ...state, items: state.items.map((task) => (task.id === action.id ? action.task : task)) };
    case 'remove':
      return { ...state, items: state.items.filter((task) => task.id !== action.id), total: state.total - 1 };
    case 'restore': {
      const items = [...state.items];
      items.splice(Math.min(action.index, items.length), 0, action.task);
      return { ...state, items, total: state.total + 1 };
    }
    case 'mutationFailed':
      return { ...state, mutationError: action.error };
    case 'dismissMutationError':
      return { ...state, mutationError: null };
    default:
      return state;
  }
}

/**
 * Загрузка страницы задач + мутации.
 * При flags.optimistic интерфейс меняется сразу, запрос идёт «в фоне», а при
 * ошибке изменение откатывается; иначе интерфейс ждёт ответа сервера.
 */
export function useTasksList({ q, status, limit, offset }) {
  const [state, dispatch] = useReducer(reducer, initialState);
  const [reloadKey, setReloadKey] = useState(0);
  const itemsRef = useRef(state.items);
  const tempId = useRef(0);
  itemsRef.current = state.items;

  useEffect(() => {
    const controller = new AbortController();
    dispatch({ type: 'load' });
    tasksApi
      .listTasks({ q, status, limit, offset }, controller.signal)
      .then((page) => dispatch({ type: 'loaded', page }))
      .catch((error) => {
        if (!isCancelled(error)) {
          dispatch({ type: 'failed', error: normalizeError(error) });
        }
      });
    return () => controller.abort(); // устаревший запрос отменяется, ответы не «перегоняют» друг друга
  }, [q, status, limit, offset, reloadKey]);

  const reload = useCallback(() => setReloadKey((key) => key + 1), []);
  const fail = useCallback((error) => dispatch({ type: 'mutationFailed', error: normalizeError(error) }), []);

  const create = useCallback(
    async (title) => {
      const payload = { title };
      if (!flags.optimistic) {
        try {
          dispatch({ type: 'add', task: await tasksApi.createTask(payload) });
        } catch (error) {
          fail(error);
        }
        return;
      }
      tempId.current += 1;
      const id = `tmp-${tempId.current}`;
      const draft = { id, title, notes: '', status: 'inbox', dueDate: null, contextId: null, pending: true };
      dispatch({ type: 'add', task: draft });
      try {
        dispatch({ type: 'replace', id, task: await tasksApi.createTask(payload) });
      } catch (error) {
        dispatch({ type: 'remove', id });
        fail(error);
      }
    },
    [fail],
  );

  const remove = useCallback(
    async (id) => {
      const index = itemsRef.current.findIndex((task) => task.id === id);
      const task = itemsRef.current[index];
      if (!task) return;
      if (flags.optimistic) dispatch({ type: 'remove', id });
      try {
        await tasksApi.deleteTask(id);
        if (!flags.optimistic) dispatch({ type: 'remove', id });
      } catch (error) {
        if (flags.optimistic) dispatch({ type: 'restore', index, task });
        fail(error);
      }
    },
    [fail],
  );

  const toggleDone = useCallback(
    async (id) => {
      const task = itemsRef.current.find((item) => item.id === id);
      if (!task) return;
      const nextStatus = task.status === 'done' ? 'inbox' : 'done';
      if (flags.optimistic) dispatch({ type: 'replace', id, task: { ...task, status: nextStatus } });
      try {
        const saved = await tasksApi.patchTask(id, { status: nextStatus });
        dispatch({ type: 'replace', id, task: saved });
      } catch (error) {
        if (flags.optimistic) dispatch({ type: 'replace', id, task });
        fail(error);
      }
    },
    [fail],
  );

  const dismissMutationError = useCallback(() => dispatch({ type: 'dismissMutationError' }), []);

  return { ...state, reload, create, remove, toggleDone, dismissMutationError };
}
