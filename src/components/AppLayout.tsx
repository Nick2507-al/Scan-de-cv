import { useEffect, useState } from "react";
import { NavLink, Outlet, useLocation } from "react-router";
import {
  LayoutDashboard, ScanSearch, Users, BriefcaseBusiness, History, CalendarClock, ChartColumn, Settings, LogOut, Menu,
} from "lucide-react";
import { useAuth } from "../auth/AuthContext";
import { initials } from "../lib/format";
import { Logo } from "./Logo";

const NAV = [
  { to: "/", label: "Tableau de bord", icon: LayoutDashboard, end: true },
  { to: "/analyse", label: "Analyser des CV", icon: ScanSearch },
  { to: "/candidats", label: "Candidats", icon: Users },
  { to: "/offres", label: "Offres d'emploi", icon: BriefcaseBusiness },
  { to: "/historique", label: "Historique", icon: History },
  { to: "/entretiens", label: "Entretiens", icon: CalendarClock },
  { to: "/rapports", label: "Rapports", icon: ChartColumn },
];

export default function AppLayout() {
  const { user, logout } = useAuth();
  const [open, setOpen] = useState(false);
  const location = useLocation();
  useEffect(() => setOpen(false), [location.pathname]);

  return (
    <div className="app">
      <div className="topbar">
        <button className="btn sec icon" aria-label="Ouvrir le menu" onClick={() => setOpen(true)}><Menu size={18} /></button>
        <Logo size={30} />
        <b className="wm">GENESIS</b>
      </div>
      {open && <div className="scrim" onClick={() => setOpen(false)} />}
      <aside className={`side${open ? " open" : ""}`} aria-label="Navigation principale">
        <NavLink to="/" className="brand">
          <Logo />
          <div><b className="wm">GENESIS</b><small>Recrutement</small></div>
        </NavLink>
        {NAV.map(({ to, label, icon: Icon, end }) => (
          <NavLink key={to} to={to} end={end} className={({ isActive }) => `nav${isActive ? " on" : ""}`}>
            <Icon size={19} strokeWidth={1.8} />{label}
          </NavLink>
        ))}
        <div className="navsep" />
        <NavLink to="/parametres" className={({ isActive }) => `nav${isActive ? " on" : ""}`}>
          <Settings size={19} strokeWidth={1.8} />Paramètres
        </NavLink>
        <div className="me">
          {user?.avatarUrl ? <img className="av" src={user.avatarUrl} alt="" /> : <div className="av">{initials(user?.fullName || "")}</div>}
          <div style={{ minWidth: 0 }}>
            <b title={user?.fullName}>{user?.fullName}</b>
            <span>Recruteur</span>
          </div>
          <button title="Se déconnecter" aria-label="Se déconnecter" onClick={logout}><LogOut size={17} /></button>
        </div>
      </aside>
      <main className="main" id="contenu">
        <Outlet />
      </main>
    </div>
  );
}
