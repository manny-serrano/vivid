export interface AuthUser {
  id: string;
  firebaseUid: string;
  email: string;
  firstName: string;
  lastName: string;
  hasPlaidConnection: boolean;
  hasTwin: boolean;
}

export interface RegisterRequest {
  firebaseToken: string;
  firstName: string;
  lastName: string;
}

export interface LoginRequest {
  firebaseToken: string;
}

export interface AuthResponse {
  user: AuthUser;
  token: string;
}

export interface DecodedFirebaseToken {
  uid: string;
  email: string;
  email_verified: boolean;
  name?: string;
  picture?: string;
}
