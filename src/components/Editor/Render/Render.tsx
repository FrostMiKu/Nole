import { useEffect, useRef, useState } from "react";
import { ResizeEntry, ResizeSensor } from "@blueprintjs/core";
import { TypstDocument } from "../../../ipc/typst";
import Page from "./Page";
import { createCanvas, debounce } from "../../../lib/utils";
import { randomString } from "remeda";

let aspect = 0;

export interface RenderProps {
  doc: TypstDocument | null;
}

const Render: React.FC<RenderProps> = ({ doc }) => {
  const [canvasList, setCanvasList] = useState<HTMLCanvasElement[]>([]);
  const [savedScrollPosition, setSavedScrollPosition] = useState(20);
  const renderRef = useRef<HTMLDivElement>(null);  

  // restore scroll position
  useEffect(() => {
    if (renderRef.current) {
      renderRef.current.scrollTop = savedScrollPosition;
    }
  });

  // debounce resize event
  const handleResize = debounce((entries: ResizeEntry[]) => {
    console.debug("render resize!");
    if (canvasList.length === 0) return;
    createCanvas(
      window.nole!.framesCache.getPages(canvasList.length),
      aspect,
      entries[0].contentRect.width
    ).then((e) => {
      setCanvasList(e);
    });
  }, window.nole!.config.resize_render_delay);

  useEffect(() => {
    if (doc === null || (doc.frames.length === 0 && canvasList.length !== 0)) {
      return;
    }
    // const l = doc?.frames.length;
    // console.log("当前文档页数为",l);
    // console.log("当前刷新页面为第",doc?.frames[l-1][0]+1);
    aspect = doc.height / doc.width;
    for (const i of doc.frames) {
      window.nole!.framesCache.set(i[0], i[1]);
    }
    createCanvas(
      window.nole!.framesCache.getPages(doc.n_pages),
      aspect,
      renderRef.current!.clientWidth - 16
    ).then((e) => {
      setCanvasList(e);
    });
  }, [doc]);

  return (
    <ResizeSensor targetRef={renderRef} onResize={handleResize}>
      <div
        ref={renderRef}
        onScroll={(e) => {     
          if (e.currentTarget.scrollTop === 0) {
            return;
          }
          setSavedScrollPosition(e.currentTarget.scrollTop);
        }}
        className="p-2 rounded-lg bg-slate-50 w-full h-full flex flex-col gap-4 overflow-auto"
      >
        {canvasList.map((c) => (
          <Page canvas={c} key={randomString(6)} />
        ))}
      </div>
    </ResizeSensor>
  );
};

export default Render;
