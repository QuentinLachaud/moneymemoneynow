import { Resizable } from 're-resizable';
import { ReactNode } from 'react';

interface ResizablePanelProps {
  children: ReactNode;
  defaultWidth?: number;
  defaultHeight?: number;
  minWidth?: number;
  minHeight?: number;
  maxWidth?: number;
  maxHeight?: number;
  direction?: 'horizontal' | 'vertical' | 'both';
}

export function ResizablePanel({
  children,
  defaultWidth,
  defaultHeight,
  minWidth = 200,
  minHeight = 150,
  maxWidth,
  maxHeight,
  direction = 'both',
}: ResizablePanelProps) {
  const enable = {
    top: direction === 'vertical' || direction === 'both',
    right: direction === 'horizontal' || direction === 'both',
    bottom: direction === 'vertical' || direction === 'both',
    left: direction === 'horizontal' || direction === 'both',
    topRight: direction === 'both',
    bottomRight: direction === 'both',
    bottomLeft: direction === 'both',
    topLeft: direction === 'both',
  };

  return (
    <Resizable
      defaultSize={{
        width: defaultWidth || '100%',
        height: defaultHeight || '100%',
      }}
      minWidth={minWidth}
      minHeight={minHeight}
      maxWidth={maxWidth}
      maxHeight={maxHeight}
      enable={enable}
      handleStyles={{
        right: { 
          right: '-4px',
          width: '8px',
          cursor: 'col-resize',
        },
        bottom: { 
          bottom: '-4px',
          height: '8px',
          cursor: 'row-resize',
        },
        bottomRight: {
          right: '-4px',
          bottom: '-4px',
          width: '12px',
          height: '12px',
          cursor: 'nwse-resize',
        },
      }}
      className="relative"
    >
      {children}
    </Resizable>
  );
}
