// src/App.tsx
import { useEffect } from "react";
import { BrowserRouter, HashRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "./context/AuthContext";
import { LanguageProvider } from "./context/LanguageContext";
import { scannerBridge } from "./lib/scannerBridge";
import ProtectedRoute from "./components/ProtectedRoute";
import AccessDenied from "./components/AccessDenied";
import { canAccess, type PageKey } from "./lib/permissions";
import Sidebar from "./pages/SideBar/Side_bar";
import Login from "./pages/Login/Login";
import { Products } from "./pages/Products/Products";
import { Clients } from "./pages/Clients/Clients";
import { Fournisseurs } from "./pages/Fournisseurs/Fournisseurs";
import { Achats } from "./pages/Achats/Achats";
import { AchatsHistory } from "./pages/AchatHistory.tsx/AchatHistory";
import { SalesHistory } from "./pages/SalesHistory/SalesHistory";
import { Users } from "./pages/Users/users";
import PosPage from "./pages/Pos/pos2";
import { Statistiques } from "./pages/Statistic/StatisticPage";
import { Settings } from "./pages/Settings/Settings";

function Guard({ page, children }: { page: PageKey; children: React.ReactNode }) {
  const { user } = useAuth();
  if (!canAccess(user?.role, page)) return <AccessDenied />;
  return <>{children}</>;
}

function AppShell() {
  return (
    <div className="flex h-screen bg-gray-50">
      <Sidebar />
      <div className="flex-1 bg-[#eef7f8] min-h-screen overflow-hidden">
        <Routes>
          <Route path="/" element={<Navigate to="/pos" replace />} />
          <Route path="/pos" element={<Guard page="pos"><PosPage /></Guard>} />
          <Route path="/products" element={<Guard page="products"><Products /></Guard>} />
          <Route path="/salesHistory" element={<Guard page="salesHistory"><SalesHistory /></Guard>} />
          <Route path="/achats" element={<Guard page="achats"><Achats /></Guard>} />
          <Route path="/achatsHistory" element={<Guard page="achatsHistory"><AchatsHistory /></Guard>} />
          <Route path="/clients" element={<Guard page="clients"><Clients /></Guard>} />
          <Route path="/fournisseurs" element={<Guard page="fournisseurs"><Fournisseurs /></Guard>} />
          <Route path="/users" element={<Guard page="users"><Users /></Guard>} />
          <Route path="/statistic" element={<Guard page="statistic"><Statistiques /></Guard>} />
          <Route path="/settings" element={<Guard page="settings"><Settings /></Guard>} />
          <Route path="*" element={<Navigate to="/pos" replace />} />
        </Routes>
      </div>
    </div>
  );
}

function App() {
  useEffect(() => {
    // Start the phone-as-scanner relay (arms whenever any field is focused).
    scannerBridge.init();
  }, []);

  const isElectron =
    typeof window !== "undefined" && !!window.electronAPI?.isElectron;
  const Router = isElectron ? HashRouter : BrowserRouter;

  return (
    <LanguageProvider>
      <AuthProvider>
        <Router>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route
              path="/*"
              element={
                <ProtectedRoute>
                  <AppShell />
                </ProtectedRoute>
              }
            />
          </Routes>
        </Router>
      </AuthProvider>
    </LanguageProvider>
  );
}

export default App;
