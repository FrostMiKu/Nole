import { useEffect } from "react";
import { useAtom } from "jotai";
import { CurrentFileAtom } from "../lib/state";
import Whiteboard from "./Whiteboard";
import PictureViewer from "./PictureViewer";
import Editor from "./Editor/Editor";
import Welcome from "./Welcome";

function Workspace() {
  const [currentFile, setCurrenFile] = useAtom(CurrentFileAtom);

  useEffect(() => {
    const disposers: (() => void)[] = [];
    disposers.push(
      window.nole!.fs.onFileOpened((file) => {
        setCurrenFile(file);
      })
    );
    return () => {
      disposers.forEach((disposer) => disposer());
    };
  }, []);

  useEffect(() => {
    const disposers: (() => void)[] = [];
    disposers.push(
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
        console.log("moved", oldpath, newpath, currentFile?.path);
        if (currentFile?.path.startsWith(oldpath)) {
          console.log("reopen");
          const newFilepath = currentFile.path.replace(oldpath, newpath);
          window.nole!.fs.openFile(newFilepath);
        }
      })
    );
    return () => {
      disposers.forEach((disposer) => disposer());
    };
  }, [currentFile]);

  let workspace = <Welcome/>;

  switch (currentFile?.extname) {
    case ".typ":
      workspace = <Editor key={currentFile.path} />; // key: force rerender for different files
      break;
    case ".draw":
      workspace = <Whiteboard key={currentFile.path} />;
      break;
    case ".png":
    case ".jpg":
    case ".jpeg":
    case ".bmp":
    case ".gif":
    case ".webp":
    case ".svg":
      workspace = <PictureViewer />;
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
    <div id="workspace" className="w-full h-full">
      {workspace}
    </div>
  );
}

export default Workspace;
