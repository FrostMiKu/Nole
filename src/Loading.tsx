import { Nole } from "./lib/nole";
import App from "./App";
import { useState } from "react";
import { open } from "@tauri-apps/api/dialog";

const path = localStorage.getItem("workspace");
if (path) {
  console.log("workspace: ", path);
  window.nole = new Nole(path);
}
console.log(window.nole);


function Loading() {
  const [loading, setLoading] = useState<boolean>(localStorage.getItem("workspace")===null);
  
  return (
    <>
      {loading ? (
        <div className="w-full h-screen flex flex-col justify-center items-center text-2xl text-gray-400">
          <div> Please Select Workspace </div>
          <button
            onClick={() => {
              open({
                multiple: false,
                directory: true,
              }).then((dirpath) => {
                if (dirpath === null) return;
                localStorage.setItem("workspace", dirpath as string);
                window.nole = new Nole(dirpath as string);
                setLoading(false)
              });
            }}
          >
            Select
          </button>
        </div>
      ) : (
        <App />
      )}
    </>
  );
}

export default Loading;
