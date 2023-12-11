import { Button, ButtonGroup } from "@blueprintjs/core";
import { useAtom, useSetAtom } from "jotai";
import { useEffect } from "react";
import { BlueprintIcons_16Id } from "@blueprintjs/icons/lib/esm/generated/16px/blueprint-icons-16";
import { AppInitializedAtom, RibbonAtom } from "../lib/state";
import { randomString } from "remeda";
import { UIEvent } from "../lib/bus";
import { open } from "@tauri-apps/api/shell";

function Ribbon(): JSX.Element {
  const [ribbons, setRibbons] = useAtom(RibbonAtom);
  const setAppInitialized = useSetAtom(AppInitializedAtom);
  useEffect(() => {
    if (ribbons.length > 0) return;
    setRibbons([
      {
        name: "Toggle File Tree",
        icon: "folder-close",
        action: () => {
          window.nole.bus.emit(UIEvent.ToggleFileTree);
        },
      },
      {
        name: "New file",
        icon: "annotation",
        action: async () => {
          const file = await window.nole!.fs.tryCreateFile("Untitled.typ");
          window.nole.fs.openFile(file.path);
        },
      },
      {
        name: "New Canvas",
        icon: "graph",
        action: async () => {
          const file = await window.nole!.fs.tryCreateFile("Untitled.draw");
          await file.writeAsBinary([]);
          window.nole.fs.openFile(file.path);
        },
      },
    ]);
  }, []);

  return (
    <ButtonGroup className="w-8" minimal={true} vertical={true}>
      {ribbons.map((ribbonItem) => (
        <Button
          minimal={true}
          key={randomString(6)}
          icon={ribbonItem.icon as BlueprintIcons_16Id}
          // eslint-disable-next-line @typescript-eslint/explicit-function-return-type
          onClick={ribbonItem.action}
          title={ribbonItem.name}
        >
          {/* {tool.name} */}
        </Button>
      ))}
      <div className="h-full"></div>
      <Button
        key="Help"
        title="Help"
        icon="help"
        onClick={() => {
          open("https://typst-doc-cn.github.io/docs/chinese/");
        }}
      />
      <Button
        key="switch workspace"
        title="Switch workspace"
        icon="control"
        onClick={() => {
          localStorage.removeItem("workspace");
          setAppInitialized(false);
        }}
      />
      <Button
        key="setting"
        title="Setting"
        icon="settings"
        onClick={() => {
          window.nole!.notify.warn({ content: "Setting: todo..." });
        }}
      />
    </ButtonGroup>
  );
}

export default Ribbon;
