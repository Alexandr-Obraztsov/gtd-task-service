// Access-токен живёт только в памяти модуля: не попадает в localStorage/sessionStorage
// и недоступен через XSS-чтение хранилища. После перезагрузки страницы он
// восстанавливается запросом /auth/refresh по httpOnly-cookie.
let accessToken = null;

export function getAccessToken() {
  return accessToken;
}

export function setAccessToken(token) {
  accessToken = token;
}

export function clearAccessToken() {
  accessToken = null;
}
