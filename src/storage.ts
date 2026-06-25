const STORAGE_KEY_PREFIX = "mind-dork-inv-";
const INVESTIGATIONS_LIST_KEY = "mind-dork-investigations";

export type Investigation = {
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
  encrypted: boolean;
};

export type StoredGraph = {
  nodes: unknown[];
  edges: unknown[];
  viewport?: { x: number; y: number; zoom: number };
};

export function getInvestigations(): Investigation[] {
  const raw = localStorage.getItem(INVESTIGATIONS_LIST_KEY);
  return raw ? JSON.parse(raw) : [];
}

export function saveInvestigationList(list: Investigation[]) {
  localStorage.setItem(INVESTIGATIONS_LIST_KEY, JSON.stringify(list));
}

export function saveInvestigationData(id: string, data: string, encrypted: boolean) {
  localStorage.setItem(STORAGE_KEY_PREFIX + id, data);
  const list = getInvestigations();
  const index = list.findIndex(i => i.id === id);
  const now = new Date().toISOString();
  if (index >= 0) {
    list[index].updatedAt = now;
    list[index].encrypted = encrypted;
  }
  saveInvestigationList(list);
}

export function loadInvestigationData(id: string): string | null {
  return localStorage.getItem(STORAGE_KEY_PREFIX + id);
}

export function deleteInvestigation(id: string) {
  localStorage.removeItem(STORAGE_KEY_PREFIX + id);
  const list = getInvestigations().filter(i => i.id !== id);
  saveInvestigationList(list);
}

export function createInvestigation(name: string): Investigation {
  const now = new Date().toISOString();
  const inv: Investigation = {
    id: crypto.randomUUID(),
    name: name || "Nowe śledztwo",
    createdAt: now,
    updatedAt: now,
    encrypted: false
  };
  const list = getInvestigations();
  list.push(inv);
  saveInvestigationList(list);
  return inv;
}

export function renameInvestigation(id: string, newName: string) {
  const list = getInvestigations();
  const inv = list.find(i => i.id === id);
  if (inv) {
    inv.name = newName;
    inv.updatedAt = new Date().toISOString();
    saveInvestigationList(list);
  }
}

function bufToB64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = "";
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunk));
  }
  return btoa(binary);
}

function b64ToBuf(b64: string): ArrayBuffer {
  const binary = atob(b64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes.buffer;
}

async function deriveKey(password: string, salt: Uint8Array): Promise<CryptoKey> {
  const enc = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey(
    "raw",
    enc.encode(password),
    "PBKDF2",
    false,
    ["deriveKey"],
  );
  return crypto.subtle.deriveKey(
    { name: "PBKDF2", salt, iterations: 310000, hash: "SHA-256" },
    keyMaterial,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"],
  );
}

export async function encryptGraph(
  password: string,
  payload: StoredGraph,
): Promise<string> {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const key = await deriveKey(password, salt);
  const plaintext = new TextEncoder().encode(JSON.stringify(payload));
  const ciphertext = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, plaintext);
  const bundle = {
    v: 1,
    salt: bufToB64(salt.buffer),
    iv: bufToB64(iv.buffer),
    data: bufToB64(ciphertext),
  };
  return JSON.stringify(bundle);
}

export async function decryptGraph(password: string, blob: string): Promise<StoredGraph> {
  const bundle = JSON.parse(blob) as { v: number; salt: string; iv: string; data: string };
  if (bundle.v !== 1) throw new Error("Nieobsługiwana wersja zapisu.");
  const salt = new Uint8Array(b64ToBuf(bundle.salt));
  const iv = new Uint8Array(b64ToBuf(bundle.iv));
  const data = b64ToBuf(bundle.data);
  const key = await deriveKey(password, salt);
  const plainBuf = await crypto.subtle.decrypt({ name: "AES-GCM", iv }, key, data);
  return JSON.parse(new TextDecoder().decode(plainBuf)) as StoredGraph;
}
