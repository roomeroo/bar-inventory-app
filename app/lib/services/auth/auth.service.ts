import { supabase } from "../../supabase";

class AuthService implements AuthServiceI {
    async signup(email: string, password: string): Promise<AuthResult> {
        
    }
    signin(email: string, password: string): Promise<AuthResult> {
        throw new Error("Method not implemented.");
    }
    signout(): Promise<{ error: string | null; }> {
        throw new Error("Method not implemented.");
    }
    getSession(): Promise<SessionResult> {
        throw new Error("Method not implemented.");
    }
    onAuthStateChange(callback: (user: { id: string; email: string; } | null) => void): () => void {
        throw new Error("Method not implemented.");
    }

}