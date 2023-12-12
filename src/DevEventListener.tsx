import { useEffect } from "react";
import { FileEvent } from "./lib/bus";

function DevEventListener() {
  useEffect(() => {
    const disposers: (() => void)[] = [];
    disposers.push(
      window.nole!.fs.onFileOpened((file) => {
        console.debug("file open", file);
      }),
      window.nole!.fs.onFileDeleted((filepath) => {
        console.debug("file deleted", filepath);
      }),
      window.nole!.fs.onDirDeleted((dirpath) => {
        console.debug("dir deleted", dirpath);
      }),
      window.nole!.fs.onMoved((oldpath, newpath) => {
        console.debug("file moved", oldpath, newpath);
      }),
      window.nole.bus.on(FileEvent.FileWrittenBinary, (path, content) => {
        console.debug("file written binary", path, content);
      }),
      window.nole.bus.on(FileEvent.FileWritten, (path, content) => {
        console.debug("file written", path, content);
      }),
      window.nole.bus.on(FileEvent.FileRead, (content) => {
        console.debug("file read", content);
      }),
      window.nole.bus.on(FileEvent.FileReadBinary, (content) => {
        console.debug("file read", content);
      })
    );
    return () => {
      disposers.forEach((disposer) => disposer());
    };
  }, []);
  return <></>;
}

export default DevEventListener;
