import FileTree from "./components/FileTree/FileTree";
import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { Editor } from "./components/Editor/Editor";
import { CurrentFileAtom } from "./lib/state";
import { useAtom } from "jotai";
import Ribbon from "./components/Ribbon";
import { useEffect } from "react";

function App() {
  const [currentFile, setCurrenFile] = useAtom(CurrentFileAtom);

  useEffect(() => {
    const disposers: (() => void)[] = [];
    disposers.push(
      window.nole!.fs.onFileOpen((file) => {
        setCurrenFile(file);
      }),
      window.nole!.fs.onFileDeleted((filepath) => {
        if (currentFile?.path === filepath) {
          setCurrenFile(null);
        }
      }),
      window.nole!.fs.onDirDeleted((dirpath) => {
        if (currentFile?.path.startsWith(dirpath)) {
          setCurrenFile(null);
        }
      }),
      window.nole!.fs.onMoved((oldpath, newpath) => {
        if (currentFile?.path === oldpath) {
          window.nole!.fs.openFile(newpath);
        }
      })
    );
    return () => {
      disposers.forEach((disposer) => disposer());
      window.nole!.clearCache()
    };
  }, [currentFile]);

  let workspace = (
    <div className="w-full h-full flex justify-center items-center text-2xl text-gray-400">
      No file selected
    </div>
  );

  switch (currentFile?.extname) {
    case ".typ":
      workspace = <Editor />;
      break;

    default:
      if (currentFile) {
        workspace = (
          <div className="w-full h-full flex justify-center items-center text-2xl text-red-400">
            Unknow file type
          </div>
        );
      }
      break;
  }

  return (
    <div className="flex flex-row w-full h-screen select-none overflow-hidden">
      <Ribbon />
      <FileTree />
      <div id="workspace" className="w-full h-full">
        {workspace}
      </div>
      <ToastContainer />
    </div>
  );
}

export default App;
