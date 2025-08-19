import React from "react";
import { useNavigate } from "react-router-dom";

interface Props {
  icon: React.ReactNode;
  label: string;
  to?: string;
  active?: boolean;
}

const NavItem: React.FC<Props> = ({ icon, label, to, active = false }) => {
  const navigate = useNavigate();
  return (
    <div
      onClick={() => to && navigate(to)}
      style={{
        display: "flex",
        alignItems: "center",
        padding: "0.5rem 1rem",
        borderRadius: "0.5rem",
        cursor: to ? "pointer" : "default",
        color: active ? "#fff" : "#374151",
        background: active ? "#6366f1" : "transparent",
        fontWeight: active ? "bold" : "normal",
      }}
    >
      <span style={{ marginRight: "0.5rem" }}>{icon}</span>
      {label}
    </div>
  );
};

export default NavItem;
