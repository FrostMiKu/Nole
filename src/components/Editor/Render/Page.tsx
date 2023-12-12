import React, { useRef, useEffect, useState, useMemo } from "react";
import { TypstRenderResult, render } from "../../../ipc/typst";
import { useUnmount } from "ahooks"

export interface PageProps {
  page: number;
  update: string; // force update when this changes
  scale: number;
  width?: number;
}

const Page: React.FC<PageProps> = ({ page, update, scale, width }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [image, setImage] = useState<CanvasImageSource>();
  const [data, setData] = useState<TypstRenderResult>();
  const [loading, setLoading] = useState<boolean>(true);

  useUnmount(() => {
    if (image) {
      (image as any).src = null;
      (image as any).remove();
      canvasRef.current?.remove();
    }
  });

  useEffect(() => {
    // setTimeout(() => {
    if (!canvasRef.current || !data || !image) return;
    const domWidth = Math.floor(width || canvasRef.current.clientWidth);
    const domHeight = Math.floor((domWidth * data.height) / data.width);
    const densityWidth = domWidth * scale;
    const densityHeight = domHeight * scale;
    canvasRef.current.style.width = domWidth + "px";
    canvasRef.current.style.height = domHeight + "px";
    canvasRef.current.width = densityWidth;
    canvasRef.current.height = densityHeight;
    const ctx = canvasRef.current.getContext("2d");
    if (ctx) {
      // ctx.scale(scale, scale);
      ctx.drawImage(image, 0, 0, densityWidth, densityHeight);
      setLoading(false);
    }
    // },20000); // emulate loading
  }, [image, width, scale]);

  useEffect(() => {
    const img = new Image();
    img.onload = () => {
      setImage(img);
    };
    render(page, Math.ceil(scale)).then((data) => {
      setData(data);
      const url = "data:image/png;base64," + data.frame;
      img.src = url;
    });
    return () => {
      img.onload = null;
      img.src = "";
      img.remove();
    };
  }, [update]);

  const className = useMemo(() => {
    const className = ["w-full"];
    if (loading) {
      className.push("h-full rounded-lg bg-slate-200 animate-pulse");
      if (page !== 0) className.push("hidden");
    } else {
      className.push("shadow-lg");
    }
    return className.join(" ");
  }, [loading]);

  return <canvas ref={canvasRef} className={className}></canvas>;
};

export default Page;
