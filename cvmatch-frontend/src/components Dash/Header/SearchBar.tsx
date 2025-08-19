import React from "react";

const SearchBar = () => {
  return (
    <input
      type="text"
      placeholder="Rechercher…"
      style={{
        width: "85%",
        padding: "0.8rem",
        borderRadius: "0.6rem",
        border: "1px solid #d1d5db",
        marginBottom: "1.5rem",
        fontSize: "1rem",
      }}
    />
  );
};

export default SearchBar;
