import React from "react";
import { createRoot } from "react-dom/client";
import { LocalApp } from "./LocalApp.jsx";
import "./local.css";

createRoot(document.getElementById("root")).render(
  <React.StrictMode><LocalApp /></React.StrictMode>,
);
