import { BrowserRouter, Navigate, Route, Routes } from "react-router";
import { useAuth } from "../core/auth/AuthContext";
import { LoginPage } from "../modules/auth/LoginPage";
import { ContractsPage } from "../modules/contracts/ContractsPage";
import { Spinner } from "../shared/ui/Spinner";
import { PrelineInit } from "./PrelineInit";

function ProtectedHome() {
  const { session, bootstrapping } = useAuth();
  if (bootstrapping) {
    return (
      <div className="flex min-h-full items-center justify-center">
        <Spinner label="Loading workspace…" />
      </div>
    );
  }
  if (!session) return <LoginPage />;
  return <ContractsPage />;
}

export function AppRouter() {
  return (
    <BrowserRouter>
      <PrelineInit />
      <Routes>
        <Route path="/callback" element={<ProtectedHome />} />
        <Route path="/" element={<ProtectedHome />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
