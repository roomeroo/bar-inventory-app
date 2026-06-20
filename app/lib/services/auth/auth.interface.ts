// Tipo que devuelven signIn y signUp
type AuthResult = {
  user: { id: string; email: string } | null
  error: string | null
}

// Tipo que devuelve getSession
type SessionResult = {
  user: { id: string; email: string } | null
}

interface AuthServiceI {
    signup(email: string, password: string): Promise<AuthResult>;
    signin(email: string, password: string): Promise<AuthResult>;
    signout(): Promise<{error: string | null}>;
    getSession(): Promise<SessionResult>;
    onAuthStateChange(
        callback: (user: { id: string; email: string } | null) => void
    ): () => void
}