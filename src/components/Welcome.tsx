import { Button } from "@blueprintjs/core";

function Welcome() {
  const help = (
    <div className="my-4 text-slate-400 max-w-prose">
      Tips:
      <div className="pl-4">
        <div>
          Use <code>#image("path/to/canvas.draw")</code> import canvas as a
          figure.
        </div>
        <div>
          <code>Alt + Enter</code> to trigger auto complete.
        </div>
      </div>
    </div>
  );

  return (
    <div className="h-full w-full flex flex-col items-center justify-center">
      <div className="text-6xl text-gray-700">
        <a href="https://github.com/FrostMiKu" target="_blank">
        📔 Nólë
        </a>
    </div>
      {help}
      <div className="w-52 flex flex-col items-center justify-center gap-2">
        <Button
          fill
          alignText="left"
          icon="annotation"
          // eslint-disable-next-line @typescript-eslint/explicit-function-return-type
          onClick={async () => {
            const file = await window.nole!.fs.tryCreateFile("Untitled.typ");
            window.nole.fs.openFile(file.path);
          }}
          title="New file"
        >
          New file
        </Button>
        <Button
          fill
          alignText="left"
          icon="graph"
          // eslint-disable-next-line @typescript-eslint/explicit-function-return-type
          onClick={async () => {
            const file = await window.nole!.fs.tryCreateFile("Untitled.draw");
            await file.writeAsBinary([]);
            window.nole.fs.openFile(file.path);
          }}
          title="New canvas"
        >
          New canvas
        </Button>
      </div>
    </div>
  );
}

export default Welcome;
