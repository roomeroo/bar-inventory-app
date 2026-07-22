// Tipo que devuelven signup y signin
export type AuthResult = {
  user: { id: string; username: string } | null
  error: string | null
}

// Tipo que devuelve getSession
export type SessionResult = {
  user: { id: string; username: string } | null
}

export interface AuthServiceI {
    signup(username: string, password: string): Promise<AuthResult>;
    signin(username: string, password: string): Promise<AuthResult>;
    signout(): Promise<{error: string | null}>;
    getSession(): Promise<SessionResult>;
    onAuthStateChange(
        callback: (user: { id: string; username: string } | null) => void
    ): () => void
}
