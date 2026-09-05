import React from "react";
import { createRoot } from "react-dom/client";
import TileEditor from "../components/TileEditor";
import "../app/globals.css";

createRoot(document.getElementById("root")!).render(
  <React.StrictMode><TileEditor /></React.StrictMode>,
);
