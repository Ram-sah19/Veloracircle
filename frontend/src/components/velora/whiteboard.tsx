import { Eraser, PenTool, RotateCcw, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import type { Socket } from "socket.io-client";

const COLORS = [
  "#ffffff",
  "#ef4444",
  "#3b82f6",
  "#22c55e",
  "#eab308",
  "#a855f7",
  "#ec4899",
  "#f97316",
];

const STROKE_WIDTHS = [2, 4, 8, 14];

interface StrokePoint {
  x: number;
  y: number;
}

interface StrokeData {
  from: StrokePoint;
  to: StrokePoint;
  color: string;
  width: number;
  mode: "pen" | "eraser";
}

export function CollaborativeWhiteboard({
  meetingId,
  socket,
  onClose,
}: {
  meetingId: string;
  socket: Socket | null;
  onClose: () => void;
}) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const isDrawing = useRef(false);
  const lastPoint = useRef<StrokePoint | null>(null);

  const [color, setColor] = useState("#ffffff");
  const [strokeWidth, setStrokeWidth] = useState(4);
  const [mode, setMode] = useState<"pen" | "eraser">("pen");

  // Resize canvas to match display size
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width;
    canvas.height = rect.height;

    const ctx = canvas.getContext("2d");
    if (ctx) {
      ctx.fillStyle = "#18181b"; // zinc-900 background
      ctx.fillRect(0, 0, canvas.width, canvas.height);
    }
  }, []);

  // Listen to remote whiteboard events
  useEffect(() => {
    const handleRemoteStroke = (e: Event) => {
      const data = (e as CustomEvent).detail;
      if (!data || !canvasRef.current) return;

      const canvas = canvasRef.current;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      if (data.clear) {
        ctx.fillStyle = "#18181b";
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        return;
      }

      if (data.stroke) {
        const { from, to, color: strokeColor, width, mode: strokeMode } = data.stroke as StrokeData;
        ctx.beginPath();
        ctx.strokeStyle = strokeMode === "eraser" ? "#18181b" : strokeColor;
        ctx.lineWidth = width;
        ctx.lineCap = "round";
        ctx.lineJoin = "round";
        ctx.moveTo(from.x * canvas.width, from.y * canvas.height);
        ctx.lineTo(to.x * canvas.width, to.y * canvas.height);
        ctx.stroke();
      }
    };

    window.addEventListener("velora_whiteboard_remote", handleRemoteStroke);
    return () => {
      window.removeEventListener("velora_whiteboard_remote", handleRemoteStroke);
    };
  }, []);

  const getCanvasCoords = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>): StrokePoint | null => {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    const rect = canvas.getBoundingClientRect();

    let clientX = 0;
    let clientY = 0;

    if ("touches" in e) {
      if (e.touches.length === 0) return null;
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
    } else {
      clientX = e.clientX;
      clientY = e.clientY;
    }

    return {
      x: (clientX - rect.left) / rect.width,
      y: (clientY - rect.top) / rect.height,
    };
  };

  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    isDrawing.current = true;
    lastPoint.current = getCanvasCoords(e);
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawing.current || !lastPoint.current || !canvasRef.current) return;
    const currentPoint = getCanvasCoords(e);
    if (!currentPoint) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.beginPath();
    ctx.strokeStyle = mode === "eraser" ? "#18181b" : color;
    ctx.lineWidth = strokeWidth;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.moveTo(lastPoint.current.x * canvas.width, lastPoint.current.y * canvas.height);
    ctx.lineTo(currentPoint.x * canvas.width, currentPoint.y * canvas.height);
    ctx.stroke();

    const strokePayload: StrokeData = {
      from: lastPoint.current,
      to: currentPoint,
      color,
      width: strokeWidth,
      mode,
    };

    socket?.emit("meeting:whiteboard_update", {
      meetingId,
      stroke: strokePayload,
    });

    lastPoint.current = currentPoint;
  };

  const stopDrawing = () => {
    isDrawing.current = false;
    lastPoint.current = null;
  };

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.fillStyle = "#18181b";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    socket?.emit("meeting:whiteboard_update", {
      meetingId,
      clear: true,
    });
  };

  return (
    <div className="fixed inset-4 sm:inset-8 z-50 flex flex-col rounded-3xl border border-white/10 bg-zinc-950/95 backdrop-blur-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95">
      {/* Header / Toolbar */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-white/10 bg-zinc-900/50">
        <div className="flex items-center gap-3">
          <span className="text-sm font-semibold text-white flex items-center gap-2">
            <PenTool className="h-4 w-4 text-primary" /> Collaborative Whiteboard
          </span>
          <span className="text-xs text-muted-foreground hidden sm:inline">
            Real-time peer canvas
          </span>
        </div>

        {/* Tools */}
        <div className="flex items-center gap-2">
          {/* Pen / Eraser toggle */}
          <div className="flex rounded-xl bg-zinc-800 p-0.5 border border-white/10">
            <button
              type="button"
              title="Pen"
              onClick={() => setMode("pen")}
              className={`p-1.5 rounded-lg transition ${mode === "pen" ? "bg-primary text-primary-foreground" : "text-zinc-400 hover:text-white"}`}
            >
              <PenTool className="h-4 w-4" />
            </button>
            <button
              type="button"
              title="Eraser"
              onClick={() => setMode("eraser")}
              className={`p-1.5 rounded-lg transition ${mode === "eraser" ? "bg-primary text-primary-foreground" : "text-zinc-400 hover:text-white"}`}
            >
              <Eraser className="h-4 w-4" />
            </button>
          </div>

          {/* Color swatches */}
          {mode === "pen" && (
            <div className="hidden sm:flex items-center gap-1 bg-zinc-800/80 px-2 py-1 rounded-xl border border-white/10">
              {COLORS.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setColor(c)}
                  className={`h-5 w-5 rounded-full transition-transform ${color === c ? "scale-125 ring-2 ring-white" : "hover:scale-110"}`}
                  style={{ backgroundColor: c }}
                />
              ))}
            </div>
          )}

          {/* Stroke width selector */}
          <div className="flex items-center gap-1 bg-zinc-800/80 px-2 py-1 rounded-xl border border-white/10">
            {STROKE_WIDTH_BUTTONS(strokeWidth, setStrokeWidth)}
          </div>

          {/* Clear board */}
          <button
            type="button"
            title="Clear canvas"
            onClick={clearCanvas}
            className="p-2 rounded-xl bg-zinc-800 text-zinc-400 hover:text-destructive hover:bg-zinc-700 transition"
          >
            <RotateCcw className="h-4 w-4" />
          </button>

          {/* Close */}
          <button
            type="button"
            title="Close whiteboard"
            onClick={onClose}
            className="p-2 rounded-xl bg-zinc-800 text-zinc-400 hover:text-white hover:bg-zinc-700 transition ml-2"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Canvas */}
      <div className="flex-1 relative cursor-crosshair touch-none">
        <canvas
          ref={canvasRef}
          onMouseDown={startDrawing}
          onMouseMove={draw}
          onMouseUp={stopDrawing}
          onMouseLeave={stopDrawing}
          onTouchStart={startDrawing}
          onTouchMove={draw}
          onTouchEnd={stopDrawing}
          className="w-full h-full block"
        />
      </div>
    </div>
  );
}

function STROKE_WIDTH_BUTTONS(current: number, setWidth: (w: number) => void) {
  return STROKE_WIDTHS.map((w) => (
    <button
      key={w}
      type="button"
      onClick={() => setWidth(w)}
      className={`h-6 w-6 grid place-items-center rounded-lg transition ${current === w ? "bg-white/20 text-white font-bold" : "text-zinc-400 hover:text-white"}`}
    >
      <span
        className="rounded-full bg-current"
        style={{ width: `${Math.max(w, 3)}px`, height: `${Math.max(w, 3)}px` }}
      />
    </button>
  ));
}
