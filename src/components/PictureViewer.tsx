import { useAtomValue } from "jotai";
import { CurrentFileAtom } from "../lib/state";

function PictureViewer() {
  const currentFile = useAtomValue(CurrentFileAtom);
  if (currentFile) {
    return (
      <div className="w-full h-full flex flex-col justify-center items-center text-2xl text-gray-400">
        <img
          className="object-cover max-w-96 max-h-96 rounded-lg shadow-lg"
          src={currentFile.convertFileSrc()}
          alt={currentFile.filename}
        />
        <div className="mt-2 text-center overflow-hidden bg-fuchsia-50">
          {currentFile.filename}
        </div>
      </div>
    );
  }

  return (
    <div className="w-full h-full flex justify-center items-center text-2xl text-gray-400">
      No file selected
    </div>
  );
}

export default PictureViewer;
