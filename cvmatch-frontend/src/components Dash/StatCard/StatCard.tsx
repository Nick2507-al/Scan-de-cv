import React from "react";

const StatCard = ({
  title,
  value,
  change,
  description,
  icon,
  color,
  danger = false,
}: {
  title: string;
  value: string;
  change: string;
  description: string;
  icon: any;
  color: string;
  danger?: boolean;
}) => (
  <div style={{
    background: "#f9fafb",
    padding: "1.5rem",
    borderRadius: "1rem",
    boxShadow: "0 4px 12px rgba(0,0,0,0.05)",
    textAlign: "center",
  }}>
    <div style={{ fontSize: "2rem", color }}>{icon}</div>
    <h3>{title}</h3>
    <p style={{ fontSize: "1.8rem", fontWeight: "bold" }}>{value}</p>
    <p style={{ color: danger ? "red" : "#10b981", margin: 0 }}>{change}</p>
    <small style={{ color: "#6b7280" }}>{description}</small>
  </div>
);

export default StatCard;
