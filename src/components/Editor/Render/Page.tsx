import React, { useRef, useEffect, useState, useMemo } from "react";
import { TypstRenderResult, render } from "../../../ipc/typst";

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
      ctx.scale(scale, scale);
      ctx.drawImage(image, 0, 0, domWidth, domHeight);
      setLoading(false);
    }
    // },20000); // emulate loading
  }, [image, width, scale]);

  useEffect(() => {
    render(page, scale).then((data) => {
      setData(data);
      const url = "data:image/png;base64," + data.frame;
      const img = new Image();
      img.onload = () => {
        setImage(img);
      };
      img.src = url;
    });
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
