const { scrubEvent } = require('../../src/utils/sentry');

describe('utils/sentry scrubEvent', () => {
  test('удаляет токены, cookie и тело запроса из события', () => {
    const event = scrubEvent({
      request: {
        headers: { Authorization: 'Bearer secret', Cookie: 'refresh=secret', 'User-Agent': 'jest' },
        cookies: { refresh: 'secret' },
        data: { password: 'secret' },
      },
      user: { id: '7', email: 'a@b.c', ip_address: '1.2.3.4' },
    });
    expect(event.request.headers).toEqual({ 'User-Agent': 'jest' });
    expect(event.request.cookies).toBeUndefined();
    expect(event.request.data).toBeUndefined();
    expect(event.user).toEqual({ id: '7' });
  });

  test('не падает на событии без request и user', () => {
    expect(scrubEvent({ message: 'x' })).toEqual({ message: 'x' });
  });
});
