import React from "react";

const UserInfo = () => (
  <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginTop: "1rem" }}>
    <img
      src="https://randomuser.me/api/portraits/women/44.jpg"
      alt="Marie Dupont"
      style={{ width: "40px", height: "40px", borderRadius: "50%" }}
    />
    <div>
      <strong>Marie Dupont</strong>
      <p style={{ fontSize: "0.8rem", margin: 0 }}>Recruteuse senior</p>
    </div>
  </div>
);

export default UserInfo;
