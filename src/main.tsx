import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import "./styles.css";
// import { open } from "@tauri-apps/api/dialog";
// import Loading from "./Loading";
import { Nole } from "./lib/nole";




const path = localStorage.getItem("workspace");
if (path) {
  console.log("workspace: ", path);
  window.nole = new Nole(path);
}
console.log(window.nole);

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
