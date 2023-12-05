import { useEffect, useRef, useState } from "react";

interface FilenameProps {
  filename: string;
  onRename: (newFilename: string) => void;
}

const RenameInputer: React.FC<FilenameProps> = ({ filename, onRename }) => {
  const [value, setValue] = useState(filename);
  const inputerRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (inputerRef) {
        inputerRef.current?.focus();
    }
  }, [inputerRef]);

  return (
    <input
      className="w-full select-text"
      value={value}
      ref={inputerRef}
      onChange={(e) => {
        setValue(e.target.value);
      }}
      onBlur={() => {
        onRename(value);
      }}
      onKeyDown={(e) => {
        if (e.key === "Enter") {
          inputerRef.current!.blur();
        }
      }}
      type="text"
    />
  );
};

export default RenameInputer;
