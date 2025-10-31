import axios from 'axios';
import '../services/api'; // 绑定axios默认配置与拦截器

export type AuthUser = { id: string; email: string };

// 错误类型定义
export interface AuthError {
  code: string;
  message: string;
  details?: any;
}

const USERS_KEY = 'auth.users';
// 移除本地存储中的令牌使用，改为内存/后端 Cookie
// 保留用户信息的轻量本地缓存以支持离线模式
const USER_KEY = 'auth.user';

// 简单的内存令牌与用户存储（会话级）
declare global {
  interface Window {
    __AUTH_TOKEN__?: string;
    __AUTH_USER__?: AuthUser | null;
  }
}

const setMemoryToken = (token?: string) => {
  if (token) {
    window.__AUTH_TOKEN__ = token;
  } else {
    delete window.__AUTH_TOKEN__;
  }
};

const setMemoryUser = (user?: AuthUser | null) => {
  if (user) {
    window.__AUTH_USER__ = user;
  } else {
    window.__AUTH_USER__ = null;
  }
};

const encode = (s: string) => {
  try {
    return btoa(unescape(encodeURIComponent(s)));
  } catch {
    return btoa(s);
  }
};

const readUsers = (): Record<string, { password: string; createdAt: number }> => {
  try {
    return JSON.parse(localStorage.getItem(USERS_KEY) || '{}');
  } catch {
    return {};
  }
};

const writeUsers = (users: Record<string, { password: string; createdAt: number }>) => {
  localStorage.setItem(USERS_KEY, JSON.stringify(users));
};

// 处理API错误
const handleApiError = (error: any): never => {
  if (error.response?.data) {
    const errorData = error.response.data;
    if (errorData.code && errorData.message) {
      // 新的错误格式 {code, message, details}
      throw new Error(errorData.message);
    }
  }
  throw new Error(error.message || '网络错误');
};

// 检查是否为axios错误
const isAxiosError = (error: any): error is { response?: { status: number; data: any } } => {
  return error && typeof error === 'object' && 'response' in error;
};

export async function signUp(email: string, password: string): Promise<AuthUser> {
  const key = (email || '').trim().toLowerCase();
  if (!key) throw new Error('请输入有效邮箱');
  try {
    // 使用新的API端点
    const res = await axios.post('/api/auth/register', { email: key, password }, { timeout: 3000 });
    const token = res?.data?.token || res?.data?.access_token;
    const user: AuthUser = res?.data?.user || { id: key, email: key };
    // 存入会话内存令牌与用户信息；令牌通过 withCredentials 以 Cookie 为主
    if (token) {
      setMemoryToken(token);
      try { localStorage.setItem('access_token', token); } catch {}
      const rt = res?.data?.refresh_token; try { if (rt) localStorage.setItem('refresh_token', rt); } catch {}
    }
    setMemoryUser(user);
    // 为离线场景保留用户本地缓存（不包含令牌）
    localStorage.setItem(USER_KEY, JSON.stringify(user));
    return user;
  } catch (err) {
    try {
      handleApiError(err);
      // 这行不会执行，因为handleApiError总是抛出错误
      throw new Error('未知错误');
    } catch (apiError) {
      // 如果是已知的API错误，直接抛出
      if (isAxiosError(err) && (err.response?.status === 400 || err.response?.status === 409)) {
        throw apiError;
      }
      // 后端未实现或离线时，回退到本地Mock
      const users = readUsers();
      if (users[key]) throw new Error('该邮箱已注册');
      users[key] = { password: encode(password), createdAt: Date.now() };
      writeUsers(users);
      const user: AuthUser = { id: key, email: key };
      // 离线回退：令牌仅存在于内存，用户信息写入本地缓存以支持后续流程
      setMemoryToken(`local:${key}`);
      setMemoryUser(user);
      localStorage.setItem(USER_KEY, JSON.stringify(user));
      return user;
    }
  }
}

export async function signIn(email: string, password: string): Promise<AuthUser> {
  const key = (email || '').trim().toLowerCase();
  try {
    // 使用新的API端点
    const res = await axios.post('/api/auth/login', { email: key, password }, { timeout: 3000 });
    const token = res?.data?.token || res?.data?.access_token;
    const user: AuthUser = res?.data?.user || { id: key, email: key };
    if (token) {
      setMemoryToken(token);
      try { localStorage.setItem('access_token', token); } catch {}
      const rt = res?.data?.refresh_token; try { if (rt) localStorage.setItem('refresh_token', rt); } catch {}
    }
    setMemoryUser(user);
    // 保留用户信息本地缓存（令牌不落盘）
    localStorage.setItem(USER_KEY, JSON.stringify(user));
    return user;
  } catch (err) {
    try {
      handleApiError(err);
      // 这行不会执行，因为handleApiError总是抛出错误
      throw new Error('未知错误');
    } catch (apiError) {
      // 如果是已知的API错误，直接抛出
      if (isAxiosError(err) && (err.response?.status === 400 || err.response?.status === 401)) {
        throw apiError;
      }
      // 后端不可用或返回错误时，允许本地离线登录：
      // 若账户不存在，则按当前输入密码自动注册（仅本地存储）。
      const users = readUsers();
      let record = users[key];
      if (!record) {
        record = { password: encode(password), createdAt: Date.now() };
        users[key] = record;
        writeUsers(users);
      }
      if (record.password !== encode(password)) throw new Error('邮箱或密码不正确');
      const user: AuthUser = { id: key, email: key };
      setMemoryToken(`local:${key}`);
      setMemoryUser(user);
      localStorage.setItem(USER_KEY, JSON.stringify(user));
      return user;
    }
  }
}

export async function signOut() {
  try { 
    // 使用新的API端点
    await axios.post('/api/auth/logout', undefined, { timeout: 3000 }); 
  } catch { /* ignore */ }
  // 清除会话令牌与用户信息
  setMemoryToken(undefined);
  setMemoryUser(null);
  // 清除离线缓存的用户信息
  localStorage.removeItem(USER_KEY);
  try { localStorage.removeItem('access_token'); localStorage.removeItem('refresh_token'); } catch {}
}

export async function getCurrentUser(): Promise<AuthUser | null> {
  // 优先返回内存中的用户会话
  if (window.__AUTH_USER__) return window.__AUTH_USER__;
  // 尝试通过后端会话获取（与 withCredentials/Cookie 配合）
  try {
    const res = await axios.get('/api/auth/me', { timeout: 3000 });
    const user: AuthUser | null = res?.data?.user || null;
    if (user) {
      setMemoryUser(user);
      localStorage.setItem(USER_KEY, JSON.stringify(user));
      return user;
    }
  } catch { /* fall through to local */ }
  try {
    const raw = localStorage.getItem(USER_KEY);
    return raw ? (JSON.parse(raw) as AuthUser) : null;
  } catch {
    return null;
  }
}

// 修改密码
export async function changePassword(currentPassword: string, newPassword: string): Promise<void> {
  try {
    // 使用新的API端点（后端：/api/auth/change-password）
    await axios.post('/api/auth/change-password', {
      current_password: currentPassword,
      new_password: newPassword
    });
  } catch (err) {
    try {
      handleApiError(err);
    } catch (apiError) {
      // 如果是已知的API错误，直接抛出
      if (isAxiosError(err) && (err.response?.status === 400 || err.response?.status === 401)) {
        throw apiError;
      }
      // 后端不可用时，更新本地存储
      const user = await getCurrentUser();
      if (!user) throw new Error('用户未登录');
      
      const users = readUsers();
      const key = user.email.toLowerCase();
      if (!users[key] || users[key].password !== encode(currentPassword)) {
        throw new Error('当前密码不正确');
      }
      users[key].password = encode(newPassword);
      writeUsers(users);
    }
  }
}

export function isAuthenticated(): boolean {
  try {
    const ls = localStorage.getItem('access_token');
    if (ls && ls.trim()) return true;
  } catch {}
  return !!window.__AUTH_TOKEN__;
}