import { useEffect, useState } from "react";
import { svg } from "../../../ipc/typst";

export interface SvgPageProps {
  page: number;
  update: string; // force update when this changes
  width?: number;
}

const SvgPage = ({ page, update, width }: SvgPageProps) => {
  const [data, setData] = useState<string>();

  useEffect(() => {
    svg(page).then((data) => {
        setData(data);
    });
  }, [update]);

  if (!data)
    return page === 1 ? (
      <div className="w-full h-full rounded-lg bg-slate-200 animate-pulse">
      </div>
    ) : (
      <></>
    );

  return (
    <div
      className="h-auto bg-white shadow-md"
      style={{ width: width || "100%" }}
      dangerouslySetInnerHTML={{ __html: data }}
    />
  );
};

export default SvgPage;
