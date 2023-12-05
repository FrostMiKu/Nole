import React, { useRef, useEffect } from "react";

interface PageProps {
  canvas: HTMLCanvasElement;
}

const Page: React.FC<PageProps> = ({ canvas }) => {
  const divRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (divRef.current) {
      divRef.current.appendChild(canvas);
    }
    return () => {
      if (divRef.current) {
        divRef.current.removeChild(canvas);
      }
    };
  }, []);

  return <div className="bg-white shadow-md w-fit h-fit" ref={divRef}></div>;
};

export default Page;
