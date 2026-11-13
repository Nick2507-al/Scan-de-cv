import { lazy, Suspense, useEffect, type ReactNode } from "react";
import { BrowserRouter, Navigate, Route, Routes, useLocation } from "react-router";
import { AuthProvider, useAuth } from "./auth/AuthContext";
import AppLayout from "./components/AppLayout";
import { Loading } from "./components/ui";

const Connexion = lazy(() => import("./pages/Connexion"));
const Inscription = lazy(() => import("./pages/Inscription"));
const Dashboard = lazy(() => import("./pages/Dashboard"));
const Analyse = lazy(() => import("./pages/Analyse"));
const Candidats = lazy(() => import("./pages/Candidats"));
const CandidatFiche = lazy(() => import("./pages/CandidatFiche"));
const Offres = lazy(() => import("./pages/Offres"));
const Historique = lazy(() => import("./pages/Historique"));
const AnalyseDetail = lazy(() => import("./pages/AnalyseDetail"));
const Entretiens = lazy(() => import("./pages/Entretiens"));
const Rapports = lazy(() => import("./pages/Rapports"));
const Parametres = lazy(() => import("./pages/Parametres"));
const NotFound = lazy(() => import("./pages/NotFound"));

const TITLES: Record<string, string> = {
  "/": "Tableau de bord", "/analyse": "Analyser des CV", "/candidats": "Candidats", "/offres": "Offres d'emploi",
  "/historique": "Historique", "/entretiens": "Entretiens", "/rapports": "Rapports", "/parametres": "Paramètres",
  "/connexion": "Connexion", "/inscription": "Créer un compte",
};

function TitleSync() {
  const { pathname } = useLocation();
  useEffect(() => {
    const key = Object.keys(TITLES).find((k) => k === pathname) ?? (pathname.startsWith("/candidats/") ? "/candidats" : pathname.startsWith("/historique/") ? "/historique" : "");
    document.title = `${TITLES[key] ?? "Genesis"} · Genesis`;
    window.scrollTo(0, 0);
  }, [pathname]);
  return null;
}

function RequireAuth({ children }: { children: ReactNode }) {
  const { user, ready } = useAuth();
  const location = useLocation();
  if (!ready) return <Loading />;
  if (!user) return <Navigate to="/connexion" state={{ from: location.pathname }} replace />;
  return <>{children}</>;
}

function GuestOnly({ children }: { children: ReactNode }) {
  const { user, ready } = useAuth();
  if (!ready) return <Loading />;
  return user ? <Navigate to="/" replace /> : <>{children}</>;
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <TitleSync />
        <Suspense fallback={<Loading />}>
          <Routes>
            <Route path="/connexion" element={<GuestOnly><Connexion /></GuestOnly>} />
            <Route path="/inscription" element={<GuestOnly><Inscription /></GuestOnly>} />
            <Route element={<RequireAuth><AppLayout /></RequireAuth>}>
              <Route index element={<Dashboard />} />
              <Route path="/analyse" element={<Analyse />} />
              <Route path="/candidats" element={<Candidats />} />
              <Route path="/candidats/:id" element={<CandidatFiche />} />
              <Route path="/offres" element={<Offres />} />
              <Route path="/historique" element={<Historique />} />
              <Route path="/historique/:id" element={<AnalyseDetail />} />
              <Route path="/entretiens" element={<Entretiens />} />
              <Route path="/rapports" element={<Rapports />} />
              <Route path="/parametres" element={<Parametres />} />
              <Route path="*" element={<NotFound />} />
            </Route>
          </Routes>
        </Suspense>
      </BrowserRouter>
    </AuthProvider>
  );
}
