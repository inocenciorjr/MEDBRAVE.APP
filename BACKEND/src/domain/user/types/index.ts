export interface LoginCredentials {
  email: string;
  password: string;
}

export interface CreateUserData {
  email: string;
  password: string;
  display_name: string;
  user_role?: string;
  username_slug?: string;
}

export interface UpdateUserData {
  email?: string;
  display_name?: string;
  username_slug?: string;
  user_role?: string;
}