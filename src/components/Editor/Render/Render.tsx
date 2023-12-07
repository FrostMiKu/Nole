import { useCallback, useEffect, useRef, useState } from "react";
// import { ResizeEntry, ResizeSensor } from "@blueprintjs/core";
import { TypstCompileResult } from "../../../ipc/typst";
import Page, { PageProps } from "./Page";
import { randomString } from "remeda";
import { ResizeEntry, ResizeSensor } from "@blueprintjs/core";
import { debounce } from "../../../lib/utils";
// import Page from "./Page";
// import { createCanvas, debounce } from "../../../lib/utils";
// import { randomString } from "remeda";

export interface RenderProps {
  doc: TypstCompileResult | null;
}

const Render: React.FC<RenderProps> = ({ doc }) => {
  const renderRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState<number>(1.5); // todo: [1, 2, 3, 4, 5]
  const [pages, setPages] = useState<PageProps[]>([]);
  const [renderWidth, setRenderWidth] = useState<number | null>(null);

  const onResizeDebounced = useCallback(
    debounce((entries: ResizeEntry[]) => {
      console.debug("resize", renderWidth, "==>", entries[0].contentRect.width);
      setRenderWidth(entries[0].contentRect.width);
    }, window.nole.config.resize_render_delay),
    []
  );

  useEffect(() => {
    console.log("render:", doc?.updated_idx);
    if (!doc) return;
    const newPages = [...pages];
    if (doc.n_pages > pages.length) {
      for (let i = pages.length; i < doc.n_pages; i++) {
        newPages.push({
          update: randomString(6),
          page: i,
          scale: scale,
        });
      }
    } else if (doc.n_pages < pages.length) {
      newPages.splice(doc.n_pages, pages.length - doc.n_pages);
    }
    // force re-render updated pages
    for (const idx of doc.updated_idx) {
      newPages[idx].update = randomString(6);
    }
    setPages(newPages);
  }, [doc]);

  return (
    <ResizeSensor targetRef={renderRef} onResize={onResizeDebounced}>
      <div
        ref={renderRef}
        className="p-2 rounded-lg bg-slate-50 w-full h-full flex flex-col gap-4 items-center overflow-auto"
      >
        {pages.map((item) => {
          return (
            <Page
              key={item.page}
              page={item.page}
              update={item.update}
              scale={scale}
              width={renderWidth ? renderWidth : undefined}
            />
          );
        })}
      </div>
    </ResizeSensor>
  );
};

export default Render;
