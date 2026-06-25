const USERS_KEY = "dorking-tool-users";
const SESSION_KEY = "dorking-tool-session";

export type User = {
  username: string;
  passwordHash: string; // Simplified for this demo
};

export function register(username: string, password: string): { success: boolean; message: string } {
  const usersRaw = localStorage.getItem(USERS_KEY);
  const users: User[] = usersRaw ? JSON.parse(usersRaw) : [];

  if (users.find((u) => u.username === username)) {
    return { success: false, message: "Użytkownik już istnieje." };
  }

  users.push({ username, passwordHash: password }); // In real app, hash this
  localStorage.setItem(USERS_KEY, JSON.stringify(users));
  return { success: true, message: "Zarejestrowano pomyślnie." };
}

export function login(username: string, password: string): { success: boolean; user?: string; message: string } {
  const usersRaw = localStorage.getItem(USERS_KEY);
  const users: User[] = usersRaw ? JSON.parse(usersRaw) : [];

  const user = users.find((u) => u.username === username && u.passwordHash === password);
  if (user) {
    localStorage.setItem(SESSION_KEY, username);
    return { success: true, user: username, message: "Zalogowano." };
  }

  return { success: false, message: "Błędny login lub hasło." };
}

export function getSessionUser(): string | null {
  return localStorage.getItem(SESSION_KEY);
}

export function logout(): void {
  localStorage.removeItem(SESSION_KEY);
}
