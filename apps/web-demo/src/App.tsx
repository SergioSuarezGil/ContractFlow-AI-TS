import { AuthProvider } from "./core/auth/AuthContext";
import { AppRouter } from "./app/AppRouter";

export function App() {
  return (
    <AuthProvider>
      <AppRouter />
    </AuthProvider>
  );
}
