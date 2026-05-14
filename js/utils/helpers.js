export function sanitizeHTML(value) {
  if (!value) {
    return "";
  }

  const map = {
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#x27;",
    "/": "&#x2F;",
  };

  return String(value).replace(/[&<>"'/]/g, (match) => map[match]);
}

export function generateMockJWT(email) {
  const header = btoa(JSON.stringify({ alg: "HS256", typ: "JWT" }));
  const payload = btoa(JSON.stringify({ email, exp: Date.now() + 86_400_000 }));
  const signature = "simulacao_assinatura_pbkdf2_segura";
  return `${header}.${payload}.${signature}`;
}

export function capitalize(value) {
  if (!value) {
    return "";
  }
  return value.charAt(0).toUpperCase() + value.slice(1);
}

export function uniqueCaseInsensitive(values) {
  const map = new Map();
  values.forEach((value) => {
    const normalized = value.trim();
    if (!normalized) {
      return;
    }
    const key = normalized.toLowerCase();
    if (!map.has(key)) {
      map.set(key, capitalize(normalized));
    }
  });
  return [...map.values()].sort((a, b) => a.localeCompare(b));
}

export function readCheckedValues(selector) {
  return [...document.querySelectorAll(selector)]
    .filter((element) => element.checked)
    .map((element) => sanitizeHTML(element.value));
}
