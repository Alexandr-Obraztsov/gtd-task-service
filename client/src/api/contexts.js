import { http } from './http';

export async function listContexts(signal) {
  const { data } = await http.get('/contexts', { params: { limit: 100 }, signal });
  return data.items;
}
