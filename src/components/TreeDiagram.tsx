import { edgeKey, leafCount, type EdgeStatus, type NodeView, type TNode } from '../lib/smalltree.ts';

interface Props {
  root: TNode;
  nodes?: Record<string, NodeView>;
  edges?: Record<string, EdgeStatus>;
  /** Fallback text for nodes without a view (e.g. live-computed values). */
  valueText?: (n: TNode) => string | undefined;
  onLeafClick?: (n: TNode, index: number) => void;
  selectedLeaf?: string;
  leafGap?: number;
  levelGap?: number;
  showNames?: boolean;
  ariaLabel?: string;
}

const S = 15; // half-size of a node shape

/** SVG game-tree diagram: ▲ MAX, ▼ MIN, ● CHANCE, ■ leaf (like the AIMA slides). */
export default function TreeDiagram({
  root, nodes = {}, edges = {}, valueText, onLeafClick, selectedLeaf,
  leafGap = 58, levelGap = 92, showNames = true, ariaLabel,
}: Props) {
  const pos = new Map<string, { x: number; y: number }>();
  const list: { n: TNode; parent?: TNode; depth: number }[] = [];
  let leafX = 0;
  let maxDepth = 0;
  const pad = 36;

  const layout = (n: TNode, depth: number, parent?: TNode): number => {
    maxDepth = Math.max(maxDepth, depth);
    list.push({ n, parent, depth });
    let x: number;
    if (!n.children) x = pad + leafGap / 2 + leafX++ * leafGap;
    else {
      const xs = n.children.map((c) => layout(c, depth + 1, n));
      x = (xs[0] + xs[xs.length - 1]) / 2;
    }
    pos.set(n.id, { x, y: 34 + depth * levelGap });
    return x;
  };
  layout(root, 0);

  const width = leafCount(root) * leafGap + pad * 2;
  const height = 34 + maxDepth * levelGap + 46;
  let leafIndex = -1;

  return (
    <svg
      className="tree-svg"
      viewBox={`0 0 ${width} ${height}`}
      role="img"
      aria-label={ariaLabel}
      // on narrow screens keep labels legible: scroll sideways instead of shrinking past ~0.55×
      style={{ maxWidth: width, minWidth: Math.min(width, Math.max(320, leafCount(root) * 28)) }}
    >
      {/* edges */}
      {list.map(({ n, parent }) => {
        if (!parent) return null;
        const a = pos.get(parent.id)!;
        const b = pos.get(n.id)!;
        const st = edges[edgeKey(parent.id, n.id)];
        const midX = (a.x + b.x) / 2;
        const midY = (a.y + b.y) / 2;
        const edgeLabel = n.prob !== undefined ? fmtProb(n.prob) : n.label;
        return (
          <g key={`e-${n.id}`} className={`edge ${st ?? ''}`}>
            <line x1={a.x} y1={a.y + S * 0.6} x2={b.x} y2={b.y - S * 0.7} />
            {st === 'pruned' && (
              <text x={midX} y={midY + 5} className="cut" textAnchor="middle">✕</text>
            )}
            {edgeLabel && st !== 'pruned' && (
              <text x={midX + (b.x < a.x ? -8 : b.x > a.x ? 8 : 10)} y={midY} className="edge-label"
                textAnchor={b.x < a.x ? 'end' : 'start'}>{edgeLabel}</text>
            )}
          </g>
        );
      })}

      {/* nodes */}
      {list.map(({ n }) => {
        const { x, y } = pos.get(n.id)!;
        const v = nodes[n.id];
        const status = v?.status ?? 'idle';
        const text = v?.text ?? valueText?.(n);
        if (n.kind === 'leaf') {
          leafIndex++;
          const idx = leafIndex;
          const clickable = !!onLeafClick;
          return (
            <g
              key={n.id}
              className={`node leaf ${status} ${selectedLeaf === n.id ? 'selected' : ''} ${clickable ? 'clickable' : ''}`}
              onClick={clickable ? () => onLeafClick!(n, idx) : undefined}
              role={clickable ? 'button' : undefined}
              aria-label={clickable ? `แก้ค่า leaf ${n.name}` : undefined}
            >
              <rect x={x - 17} y={y - 15} width={34} height={30} rx={7} />
              <text x={x} y={y + 5} textAnchor="middle" className="leaf-val">{text ?? n.value}</text>
            </g>
          );
        }
        const shape =
          n.kind === 'max' ? <polygon points={`${x},${y - S} ${x + S},${y + S * 0.75} ${x - S},${y + S * 0.75}`} />
          : n.kind === 'min' ? <polygon points={`${x - S},${y - S * 0.75} ${x + S},${y - S * 0.75} ${x},${y + S}`} />
          : <circle cx={x} cy={y} r={S * 0.85} />;
        return (
          <g key={n.id} className={`node ${n.kind} ${status}`}>
            {shape}
            {showNames && n.name && <text x={x} y={y + (n.kind === 'min' ? -1 : 6)} textAnchor="middle" className="node-name">{n.name}</text>}
            {text !== undefined && <text x={x + S + 6} y={y + 5} className="node-val">{text}</text>}
            {v?.sub && <text x={x} y={y + S + 16} textAnchor="middle" className="node-sub">{v.sub}</text>}
          </g>
        );
      })}
    </svg>
  );
}

function fmtProb(p: number) {
  return String(Math.round(p * 100) / 100).replace(/^0\./, '.');
}
