export function readStorageValue(storage, key, fallback = null) {
  if (!storage || !key) return fallback;

  try {
    const value = storage.getItem(key);
    return value ?? fallback;
  } catch {
    return fallback;
  }
}

export function writeStorageValue(storage, key, value) {
  if (!storage || !key) return false;

  try {
    storage.setItem(key, value);
    return true;
  } catch {
    return false;
  }
}

export function readStorageJson(storage, key, fallback) {
  const rawValue = readStorageValue(storage, key, null);
  if (rawValue == null) return fallback;

  try {
    return JSON.parse(rawValue);
  } catch {
    return fallback;
  }
}
