export interface User {
  id: string;
  name: string;
  firstName: string;
  lastName: string;
  email: string;
  username: string;
  avatarUrl: string;
  position: string;
  department: string;
  roles: string[];
  permissions: string[];
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface LoginResponse {
  user: User;
  token: string;
}
