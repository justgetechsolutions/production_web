export function setCookie(name: string, value: string, days: number = 365): void {
  const date = new Date();
  date.setTime(date.getTime() + days * 24 * 60 * 60 * 1000);
  const expires = `expires=${date.toUTCString()}`;
  const isSecure = typeof window !== 'undefined' && window.location.protocol === 'https:';
  const sameSite = isSecure ? 'None' : 'Lax';
  const secureAttr = isSecure ? '; Secure' : '';
  document.cookie = `${encodeURIComponent(name)}=${encodeURIComponent(value)}; ${expires}; path=/; SameSite=${sameSite}${secureAttr}`;
}

export function getCookie(name: string): string | null {
  const nameEQ = encodeURIComponent(name) + '=';
  const ca = document.cookie.split(';');
  for (let i = 0; i < ca.length; i++) {
    let c = ca[i];
    while (c.charAt(0) === ' ') c = c.substring(1, c.length);
    if (c.indexOf(nameEQ) === 0) return decodeURIComponent(c.substring(nameEQ.length, c.length));
  }
  return null;
}

export function removeCookie(name: string): void {
  const isSecure = typeof window !== 'undefined' && window.location.protocol === 'https:';
  const sameSite = isSecure ? 'None' : 'Lax';
  const secureAttr = isSecure ? '; Secure' : '';
  document.cookie = `${encodeURIComponent(name)}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/; SameSite=${sameSite}${secureAttr}`;
}



