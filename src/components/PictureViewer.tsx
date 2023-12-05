import { useAtomValue } from "jotai";
import { CurrentFileAtom } from "../lib/state";

function PictureViewer() {
    const currentFile = useAtomValue(CurrentFileAtom);
    if (currentFile) {
        return (
            <div className="w-full h-full flex justify-center items-center text-2xl text-gray-400">
                <div className="w-1/4 hover:w-1/3">

                <img className="rounded-lg shadow-lg" src={currentFile.convertFileSrc()} alt="" />
                <div className="mt-2 text-center bg-fuchsia-50">{currentFile.filename}</div>
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