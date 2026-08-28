import { useEffect, useRef } from 'react';
import { PALETTE } from '../content/sprites';

interface Props {
  matrix: string[];
  scale?: number;
  className?: string;
}

/** 把字符像素矩阵画到 canvas 上，image-rendering: pixelated 放大 */
export function PixelSprite({ matrix, scale = 4, className }: Props) {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const rows = matrix.length;
    const cols = matrix[0]?.length ?? 0;
    canvas.width = cols * scale;
    canvas.height = rows * scale;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    for (let y = 0; y < rows; y++) {
      const row = matrix[y];
      for (let x = 0; x < cols; x++) {
        const color = PALETTE[row[x]];
        if (!color) continue;
        ctx.fillStyle = color;
        ctx.fillRect(x * scale, y * scale, scale, scale);
      }
    }
  }, [matrix, scale]);

  return (
    <canvas
      ref={ref}
      className={className}
      style={{ imageRendering: 'pixelated' }}
      aria-hidden
    />
  );
}
