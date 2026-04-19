import type { ReactNode } from 'react';
import { Handle, Position, useStore } from '@xyflow/react';
import Icon from '@shared/components/Icon';
import {
  type AccentColor,
  type IconStyle,
} from '../../../utils/activityIcons';

export interface OutputHandle {
  id: string;
  label: string;
}

export interface BaseNodeProps {
  nodeId: string;
  iconName: string;
  iconStyle?: IconStyle;
  accentColor: AccentColor;
  title: string;
  subtitle?: string;
  selected?: boolean;
  children?: ReactNode;
  outputs?: OutputHandle[];
  hasInput?: boolean;
  hasOutput?: boolean;
}

const TILE_SIZE = 72;

const TILE_BG = '#3a3e45';
const TILE_BG_HOVER = '#44484f';
const TILE_BORDER = '#4a4e57';
const CHECK_GREEN = '#22c55e';
const HANDLE_COLOR = '#8b8f97';
const STUB_COLOR = '#5a5f68';
const SELECT_RING = '#10b981';

const DOT_SIZE = 6;
const PLUS_SIZE = 14;
const STUB_LEN = 22; // stub line between dot and + box
const KNOB_START = DOT_SIZE + 4; // where the stub/plus starts (just past the dot)

const ICON_COLOR: Record<AccentColor, string> = {
  primary: '#818cf8',
  secondary: '#c084fc',
  success: '#34d399',
  warning: '#fbbf24',
  error: '#f87171',
  info: '#60a5fa',
};

function PlusIcon() {
  return (
    <svg width="8" height="8" viewBox="0 0 10 10" style={{ pointerEvents: 'none' }}>
      <path
        d="M5 1 V9 M1 5 H9"
        stroke="#9ca3af"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </svg>
  );
}

/** Stub + "+" rendered when the output is unconnected. The "+" itself is a
 *  real ReactFlow Handle with id `${realId}__plus`. WorkflowCanvas.onConnect
 *  strips the `__plus` suffix so the saved edge's sourceHandle is the real id. */
function PlusAffordance({
  handleId,
  topPct,
}: {
  handleId: string | undefined;
  topPct: number;
}) {
  const plusHandleId =
    handleId !== undefined ? `${handleId}__plus` : '__plus';
  return (
    <>
      {/* stub line — purely decorative */}
      <div
        aria-hidden
        className="pointer-events-none absolute"
        style={{
          top: `${topPct}%`,
          left: '100%',
          marginLeft: KNOB_START,
          width: STUB_LEN,
          height: 1,
          background: STUB_COLOR,
          transform: 'translateY(-50%)',
        }}
      />
      {/* + box is a real Handle — ReactFlow listens to its pointer events */}
      <Handle
        type="source"
        position={Position.Right}
        id={plusHandleId}
        style={{
          top: `${topPct}%`,
          left: '100%',
          right: 'auto',
          marginLeft: KNOB_START + STUB_LEN,
          width: PLUS_SIZE,
          height: PLUS_SIZE,
          borderRadius: 3,
          background: '#2a2d33',
          border: `1px solid ${STUB_COLOR}`,
          minWidth: 0,
          minHeight: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: 'crosshair',
          transform: 'translateY(-50%)',
        }}
      >
        <PlusIcon />
      </Handle>
    </>
  );
}

export function BaseNode({
  nodeId,
  iconName,
  iconStyle = 'solid',
  accentColor,
  title,
  subtitle,
  selected = false,
  children,
  outputs,
  hasInput = true,
  hasOutput = true,
}: BaseNodeProps) {
  const iconColor = ICON_COLOR[accentColor];
  const hasLabeledOutputs = outputs !== undefined && outputs.length > 0;
  const outputCount = hasLabeledOutputs ? outputs.length : 1;

  const { inputConnected, connectedOutputs } = useStore((s) => {
    let input = false;
    const outs = new Set<string | undefined>();
    for (const e of s.edges) {
      if (e.target === nodeId) input = true;
      if (e.source === nodeId) outs.add(e.sourceHandle ?? undefined);
    }
    return { inputConnected: input, connectedOutputs: outs };
  });

  const tileHeight =
    outputCount > 1 ? Math.max(TILE_SIZE, outputCount * 24 + 24) : TILE_SIZE;

  // Reserve horizontal space outside the tile for dot + stub + plus.
  const wrapperPadRight = KNOB_START + STUB_LEN + PLUS_SIZE + 8;

  return (
    <div
      className="group/node relative flex flex-col items-center"
      style={{
        width: TILE_SIZE + 24 + wrapperPadRight,
        paddingLeft: 12,
        paddingRight: wrapperPadRight,
      }}
    >
      {selected && (
        <div
          aria-hidden
          className="pointer-events-none absolute rounded-[14px]"
          style={{
            width: TILE_SIZE + 12,
            height: tileHeight + 12,
            top: -6,
            left: 6,
            boxShadow: `0 0 0 2px ${SELECT_RING}, 0 0 24px 4px ${SELECT_RING}40`,
          }}
        />
      )}

      {/* Ghost arrow for unconnected input */}
      {hasInput && !inputConnected && (
        <div
          aria-hidden
          className="pointer-events-none absolute"
          style={{
            top: tileHeight / 2,
            left: -2,
            transform: 'translateY(-50%)',
          }}
        >
          <svg width="10" height="12" viewBox="0 0 10 12">
            <path
              d="M1 1 L9 6 L1 11 Z"
              fill="none"
              stroke={STUB_COLOR}
              strokeWidth="1.5"
              strokeLinejoin="round"
            />
          </svg>
        </div>
      )}

      {/* Icon tile */}
      <div
        className="relative flex items-center justify-center rounded-[10px] transition-colors duration-150"
        style={{
          width: TILE_SIZE,
          height: tileHeight,
          background: TILE_BG,
          border: `1px solid ${TILE_BORDER}`,
          boxShadow: '0 1px 2px rgba(0,0,0,0.3)',
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.background = TILE_BG_HOVER;
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.background = TILE_BG;
        }}
      >
        {/* Input handle */}
        {hasInput && (
          <Handle
            type="target"
            position={Position.Left}
            style={{
              width: DOT_SIZE,
              height: DOT_SIZE,
              borderRadius: '50%',
              background: HANDLE_COLOR,
              border: 'none',
              minWidth: 0,
              minHeight: 0,
              left: -3,
            }}
          />
        )}

        {/* Icon */}
        <div
          className="flex h-7 w-7 items-center justify-center [&_svg]:h-full [&_svg]:w-full [&_svg]:fill-current"
          style={{ color: iconColor }}
        >
          <Icon name={iconName} style={iconStyle} />
        </div>

        {/* Bottom check */}
        <div
          className="pointer-events-none absolute left-1/2 -translate-x-1/2"
          style={{ bottom: 4 }}
        >
          <div
            className="flex h-3 w-3 items-center justify-center rounded-full"
            style={{ background: CHECK_GREEN }}
          >
            <svg
              viewBox="0 0 16 16"
              className="h-2 w-2"
              fill="none"
              stroke="white"
              strokeWidth="3"
            >
              <path d="M3 8.5 L6.5 12 L13 4.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
        </div>

        {/* Output handles — real drag source, always small dot at tile edge.
            Keeping position constant ensures connected edges route cleanly. */}
        {hasOutput && hasLabeledOutputs && outputs
          ? outputs.map((out, i) => {
              const topPct = ((i + 1) / (outputs.length + 1)) * 100;
              const connected = connectedOutputs.has(out.id);
              return (
                <div key={out.id}>
                  <Handle
                    type="source"
                    position={Position.Right}
                    id={out.id}
                    style={{
                      top: `${topPct}%`,
                      right: -3,
                      width: DOT_SIZE,
                      height: DOT_SIZE,
                      borderRadius: '50%',
                      background: HANDLE_COLOR,
                      border: 'none',
                      minWidth: 0,
                      minHeight: 0,
                    }}
                  />
                  {/* Port label — floats over the stub/plus area, no layout cost.
                      Pointer-events off so it never intercepts the drag. */}
                  <span
                    className="pointer-events-none absolute whitespace-nowrap text-[10px] font-semibold leading-none"
                    style={{
                      top: `${topPct}%`,
                      left: '100%',
                      marginLeft: KNOB_START,
                      transform: 'translateY(-50%)',
                      color: '#e5e7eb',
                      textShadow:
                        '0 0 3px #1e1f24, 0 0 3px #1e1f24, 0 0 3px #1e1f24',
                      zIndex: 5,
                    }}
                  >
                    {out.label}
                  </span>
                  {/* When unconnected: stub + plus to the right of the label */}
                  {!connected && (
                    <PlusAffordance handleId={out.id} topPct={topPct} />
                  )}
                </div>
              );
            })
          : hasOutput && (
              (() => {
                const connected = connectedOutputs.size > 0;
                return (
                  <>
                    <Handle
                      type="source"
                      position={Position.Right}
                      style={{
                        top: '50%',
                        right: -3,
                        width: DOT_SIZE,
                        height: DOT_SIZE,
                        borderRadius: '50%',
                        background: HANDLE_COLOR,
                        border: 'none',
                        minWidth: 0,
                        minHeight: 0,
                      }}
                    />
                    {!connected && (
                      <PlusAffordance handleId={undefined} topPct={50} />
                    )}
                  </>
                );
              })()
            )}
      </div>

      {/* Label below */}
      <div className="mt-2 flex max-w-[160px] flex-col items-center text-center">
        <div
          className="truncate text-[11px] font-medium leading-tight tracking-tight"
          style={{ color: '#e5e7eb' }}
        >
          {title}
        </div>
        {subtitle && (
          <div
            className="mt-0.5 truncate text-[10px] leading-tight"
            style={{ color: '#9ca3af' }}
          >
            {subtitle}
          </div>
        )}
        {children && (
          <div className="mt-1 flex max-w-[160px] flex-wrap justify-center gap-1">
            {children}
          </div>
        )}
      </div>
    </div>
  );
}
