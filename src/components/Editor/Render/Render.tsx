import { useCallback, useEffect, useRef, useState } from "react";
import { TypstCompileResult } from "../../../ipc/typst";
import ImagePage, { ImagePageProps } from "./ImagePage";
import { randomString } from "remeda";
import { ResizeEntry, ResizeSensor } from "@blueprintjs/core";
import { debounce } from "../../../lib/utils";
import SvgPage from "./SvgPage";

export interface RenderProps {
  doc: TypstCompileResult | null;
  renderSvg: boolean;
}

const devicePixelRatio = window.devicePixelRatio;

const Render: React.FC<RenderProps> = ({ doc, renderSvg }) => {
  const renderRef = useRef<HTMLDivElement>(null);
  const [scale, _] = useState<number>(devicePixelRatio); // todo: [1, 2, 3, 4, 5]
  const [pages, setPages] = useState<ImagePageProps[]>([]);
  const [renderWidth, setRenderWidth] = useState<number | null>(null);
  const [scollTop, setScrollTop] = useState<number>(0);

  console.log(renderSvg);
  

  useEffect(() => {
    if (!renderRef.current) return;
    renderRef.current.scrollTop = scollTop;
  });

  const onResizeDebounced = useCallback(
    debounce((entries: ResizeEntry[]) => {
      // console.debug("resize", renderWidth, "==>", entries[0].contentRect.width);
      setRenderWidth(entries[0].contentRect.width);
    }, window.nole.config.resize_render_delay),
    []
  );

  useEffect(() => {
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
        className="p-2 rounded-lg bg-slate-50 w-full h-full flex flex-col gap-4 items-center overflow-y-auto overflow-x-hidden"
        onScroll={(e) => {
          if (e.currentTarget.scrollTop === 0) return;
          setScrollTop(e.currentTarget.scrollTop);
        }}
      >
        {pages.map((item) => {
          return (
            renderSvg?
            <SvgPage
              key={item.page}
              page={item.page}
              update={item.update}
              width={renderWidth ? renderWidth : undefined}
            />
            :
            <ImagePage
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
