import tokenStorage from './tokenStorage';

export const AUTH_CURRENT_KEY = 'auth_current_user';
export const AUTH_USERS_KEY = 'auth_users';

export type User = {
  id?: string;
  email: string;
  name?: string;
  firstName?: string;
  lastName?: string;
  mobile?: string;
  gender?: string;
  isGuest?: boolean;
};

function safeGet(key: string) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function safeSet(key: string, value: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // ignore write errors
  }
}

export function getUsers(): User[] {
  return safeGet(AUTH_USERS_KEY) || [];
}

export function saveUser(user: User) {
  // Normalize user (split `name` -> firstName/lastName) so stored records
  // always prefer firstName/lastName.
  const normalized = normalizeUser(user);

  const users = getUsers();
  const existing = users.find(
    (u) => u.email?.toLowerCase() === normalized.email?.toLowerCase(),
  );

  if (existing) Object.assign(existing, normalized);
  else users.push(normalized);

  safeSet(AUTH_USERS_KEY, users);


  (async () => {
    try {
      if (normalized.id) await tokenStorage.setItem("user_id", normalized.id);
      if (normalized.email) await tokenStorage.setItem("user_email", normalized.email);
      if (normalized.firstName) await tokenStorage.setItem("user_firstName", normalized.firstName);
      if (normalized.lastName) await tokenStorage.setItem("user_lastName", normalized.lastName);


      if (normalized.name) await tokenStorage.setUserName(normalized.name);
      else if (normalized.firstName) await tokenStorage.setUserName(`${normalized.firstName}${normalized.lastName ? ' ' + normalized.lastName : ''}`);

      if (normalized.mobile) await tokenStorage.setItem("user_mobile", normalized.mobile);
      if (normalized.gender) await tokenStorage.setItem("user_gender", normalized.gender);
    } catch {
      // ignore persistence errors
    }
  })();
}

function normalizeUser(u: Partial<User>): User {
  const out: User = {
    id: u.id,
    email: (u.email as string) || "",
    name: u.name,
    firstName: u.firstName,
    lastName: u.lastName,
    mobile: u.mobile,
    gender: u.gender,
    isGuest: u.isGuest,
  };

  if (!out.firstName && out.name) {
    const parts = out.name.trim().split(/\s+/);
    if (parts.length > 0) {
      out.firstName = parts.shift();
      out.lastName = parts.join(" ") || undefined;
    }
  }

  return out;
}

export function findUserByEmail(email: string): User | null {
  return getUsers().find(u => u.email === email) || null;
}

export function setCurrentUser(user: User | null) {
  if (user) {
    const normalized = normalizeUser(user);
    safeSet(AUTH_CURRENT_KEY, normalized);
    // Mirror current user into tokenStorage as best-effort async sync
    (async () => {
      try {
        if (normalized.id) await tokenStorage.setItem("user_id", normalized.id);
        if (normalized.email) await tokenStorage.setItem("user_email", normalized.email);
        if (normalized.firstName) await tokenStorage.setItem("user_firstName", normalized.firstName);
        if (normalized.lastName) await tokenStorage.setItem("user_lastName", normalized.lastName);

        if (normalized.mobile) await tokenStorage.setItem("user_mobile", normalized.mobile);
        if (normalized.gender) await tokenStorage.setItem("user_gender", normalized.gender);
      } catch {
        // ignore
      }
    })();
  } else {
    localStorage.removeItem(AUTH_CURRENT_KEY);
    // Remove mirrored keys from tokenStorage as well
    (async () => {
      try {
       await tokenStorage.removeItem('user_id');
await tokenStorage.removeItem('user_email');
await tokenStorage.removeItem('user_firstName');
await tokenStorage.removeItem('user_lastName');
await tokenStorage.removeItem('user_mobile');
await tokenStorage.removeItem('user_gender');

      } catch {
        // ignore
      }
    })();
  }

  window.dispatchEvent(new Event("auth-changed"));
}

export function getCurrentUser(): User | null {
  const user = safeGet(AUTH_CURRENT_KEY);
  console.log("getCurrentUser:", user);
  return user;
}


export async function hydrateCurrentUser(): Promise<User | null> {
  try {
    const existing = safeGet(AUTH_CURRENT_KEY);
    if (existing) return existing;

    const [id, email, firstName, lastName, mobile, gender, userName] = await Promise.all([
      tokenStorage.getItem('user_id'),
      tokenStorage.getItem('user_email'),
      tokenStorage.getItem('user_firstName'),
      tokenStorage.getItem('user_lastName'),
      tokenStorage.getItem('user_mobile'),
      tokenStorage.getItem('user_gender'),
      tokenStorage.getUserName(),
    ]);

    if (!id && !email) return null;

    const user: User = {
      id: id ?? undefined,
      email: (email ?? '') as string,
      name: userName ?? undefined,
      firstName: firstName ?? undefined,
      lastName: lastName ?? undefined,
      mobile: mobile ?? undefined,
      gender: gender ?? undefined,
    };

   
    safeSet(AUTH_CURRENT_KEY, user);

    try {
      const users = getUsers();
      const existingUser = users.find((u) => u.email?.toLowerCase() === user.email?.toLowerCase());
      if (!existingUser) {
        users.push(user);
        safeSet(AUTH_USERS_KEY, users);
      }
    } catch {
      // ignore
    }

    window.dispatchEvent(new Event('auth-changed'));
    return user;
  } catch {
    return null;
  }
}

export async function clearAuth() {
  localStorage.removeItem(AUTH_CURRENT_KEY);
  await tokenStorage.clearAll();

  window.dispatchEvent(new Event("auth-changed"));
}


export function setGuest() {
  const guest: User = { email: 'guest', isGuest: true };
  setCurrentUser(guest);
 
}
