import { useEffect } from "react";
import { FileEvent } from "./lib/bus";

function DevEventListener() {
  useEffect(() => {
    const disposers: (() => void)[] = [];
    disposers.push(
      window.nole!.fs.onFileOpen((file) => {
        console.log("file open", file);
      }),
      window.nole!.fs.onFileDeleted((filepath) => {
        console.log("file deleted", filepath);
      }),
      window.nole!.fs.onDirDeleted((dirpath) => {
        console.log("dir deleted", dirpath);
      }),
      window.nole!.fs.onMoved((oldpath, newpath) => {
        console.log("file moved", oldpath, newpath);
      }),
      window.nole.bus.on(FileEvent.FileWrittenBinary, (path, content) => {
        console.log("file written binary", path, content);
      }),
      window.nole.bus.on(FileEvent.FileWritten, (path, content) => {
        console.log("file written", path, content);
      }),
      window.nole.bus.on(FileEvent.FileRead, (content) => {
        console.log("file read", content);
      }),
      window.nole.bus.on(FileEvent.FileReadBinary, (content) => {
        console.log("file read", content);
      })
    );
    return () => {
      disposers.forEach((disposer) => disposer());
    };
  }, []);
  return <></>;
}

export default DevEventListener;
