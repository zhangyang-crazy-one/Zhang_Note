import React, { useState, useRef, useEffect, useCallback } from 'react';
import { MarkdownFile, NoteLayoutItem, Theme } from '../types';
import { Move, Maximize2, RotateCw, Type, GripHorizontal, Search, ZoomIn, ZoomOut, RotateCcw } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

interface NoteSpaceProps {
  files: MarkdownFile[];
  activeFileId: string;
  onSelectFile: (id: string) => void;
  layout: Record<string, NoteLayoutItem>;
  onLayoutChange: (layout: Record<string, NoteLayoutItem>) => void;
  theme: Theme;
}

const GRID_SIZE = 20;

export const NoteSpace: React.FC<NoteSpaceProps> = ({
  files,
  activeFileId,
  onSelectFile,
  layout,
  onLayoutChange,
  theme
}) => {
  // --- Camera State ---
  const [camera, setCamera] = useState({ x: 0, y: 0, z: 0, zoom: 1 });
  const [isDraggingSpace, setIsDraggingSpace] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  
  // --- Interaction State ---
  const [draggedItem, setDraggedItem] = useState<{ id: string, type: 'move' | 'resize' | 'rotate', startX: number, startY: number, initialVals: any } | null>(null);
  const [hoveredId, setHoveredId] = useState<string | null>(null);

  // --- Pen Cursor SVG ---
  const penCursor = `url('data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="%23ec4899" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 19l7-7 3 3-7 7-3-3z"/><path d="M18 13l-1.5-7.5L2 2l3.5 14.5L13 18l5-5z"/><path d="M2 2l7.586 7.586"/><circle cx="11" cy="11" r="2"/></svg>') 0 24, auto`;

  // --- Initialize Layout for New Files ---
  useEffect(() => {
    const newLayout = { ...layout };
    let changed = false;
    
    files.forEach((file, index) => {
       if (!file.name.endsWith('.keep') && !newLayout[file.id]) {
           // Arrange in a grid or spiral initially
           const col = index % 4;
           const row = Math.floor(index / 4);
           
           newLayout[file.id] = {
               id: file.id,
               x: col * 320 - 400,
               y: row * 320 - 200,
               z: 0,
               rotation: 0,
               width: 280,
               height: 280,
               scale: 1,
               color: undefined
           };
           changed = true;
       }
    });
    
    // Cleanup removed files
    Object.keys(newLayout).forEach(id => {
        if (!files.find(f => f.id === id)) {
            delete newLayout[id];
            changed = true;
        }
    });

    if (changed) {
        onLayoutChange(newLayout);
    }
  }, [files]); // Intentionally not checking layout changes to avoid loop

  // --- Handlers ---

  const handleSpaceMouseDown = (e: React.MouseEvent) => {
      // Only drag space if clicking background
      if (e.target === e.currentTarget || (e.target as HTMLElement).classList.contains('note-space-bg')) {
          setIsDraggingSpace(true);
      }
  };

  const handleSpaceMouseMove = (e: React.MouseEvent) => {
      if (isDraggingSpace) {
          setCamera(prev => ({
              ...prev,
              x: prev.x + e.movementX,
              y: prev.y + e.movementY
          }));
      }

      if (draggedItem) {
          const deltaX = (e.clientX - draggedItem.startX) / camera.zoom;
          const deltaY = (e.clientY - draggedItem.startY) / camera.zoom;
          
          const newLayout = { ...layout };
          const item = { ...newLayout[draggedItem.id] };

          if (draggedItem.type === 'move') {
               let nx = draggedItem.initialVals.x + deltaX;
               let ny = draggedItem.initialVals.y + deltaY;
               // Snap
               if (!e.shiftKey) {
                   nx = Math.round(nx / GRID_SIZE) * GRID_SIZE;
                   ny = Math.round(ny / GRID_SIZE) * GRID_SIZE;
               }
               item.x = nx;
               item.y = ny;
          } else if (draggedItem.type === 'resize') {
               let nw = Math.max(200, draggedItem.initialVals.width + deltaX);
               let nh = Math.max(150, draggedItem.initialVals.height + deltaY);
               if (!e.shiftKey) {
                   nw = Math.round(nw / GRID_SIZE) * GRID_SIZE;
                   nh = Math.round(nh / GRID_SIZE) * GRID_SIZE;
               }
               item.width = nw;
               item.height = nh;
          } else if (draggedItem.type === 'rotate') {
               // Simple sensitivity for rotation
               item.rotation = (draggedItem.initialVals.rotation + deltaX * 0.5) % 360;
               // Snap rotation
               if (!e.shiftKey && Math.abs(item.rotation % 45) < 5) {
                   item.rotation = Math.round(item.rotation / 45) * 45;
               }
          }

          newLayout[draggedItem.id] = item;
          onLayoutChange(newLayout);
      }
  };

  const handleSpaceMouseUp = () => {
      setIsDraggingSpace(false);
      setDraggedItem(null);
  };

  const handleWheel = (e: React.WheelEvent) => {
     if (e.ctrlKey || e.metaKey) {
         // Zoom
         e.preventDefault();
         const factor = e.deltaY > 0 ? 0.9 : 1.1;
         setCamera(prev => ({
             ...prev,
             zoom: Math.min(Math.max(0.2, prev.zoom * factor), 3)
         }));
     } else {
         // Pan
         setCamera(prev => ({
             ...prev,
             x: prev.x - e.deltaX,
             y: prev.y - e.deltaY
         }));
     }
  };

  // --- Note Item Actions ---

  const startDrag = (e: React.MouseEvent, id: string, type: 'move' | 'resize' | 'rotate') => {
      e.stopPropagation();
      const item = layout[id];
      if (!item) return;
      
      setDraggedItem({
          id,
          type,
          startX: e.clientX,
          startY: e.clientY,
          initialVals: { ...item }
      });
      
      // Bring to front (naive: just reorder or we can use z-index in rendering)
      // For now, we update Z in layout if we want permanent stacking, or just rely on DOM order.
      // Let's bump Z slightly in layout
      const newLayout = { ...layout };
      const maxZ = Math.max(...Object.values(newLayout).map(i => i.z || 0), 0);
      newLayout[id].z = maxZ + 1;
      onLayoutChange(newLayout);
      onSelectFile(id);
  };

  const resetCamera = () => setCamera({ x: 0, y: 0, z: 0, zoom: 1 });

  return (
    <div 
        ref={containerRef}
        className="w-full h-full relative overflow-hidden bg-slate-100 dark:bg-slate-900 select-none note-space-bg"
        style={{ cursor: isDraggingSpace ? 'grabbing' : penCursor }}
        onMouseDown={handleSpaceMouseDown}
        onMouseMove={handleSpaceMouseMove}
        onMouseUp={handleSpaceMouseUp}
        onMouseLeave={handleSpaceMouseUp}
        onWheel={handleWheel}
    >
        {/* Background Grid - moves with camera */}
        <div 
            className="absolute inset-0 pointer-events-none opacity-20 dark:opacity-10 note-space-bg"
            style={{
                backgroundSize: `${GRID_SIZE * camera.zoom}px ${GRID_SIZE * camera.zoom}px`,
                backgroundImage: `
                    linear-gradient(to right, #808080 1px, transparent 1px),
                    linear-gradient(to bottom, #808080 1px, transparent 1px)
                `,
                backgroundPosition: `${camera.x}px ${camera.y}px`,
                transformOrigin: '0 0'
            }}
        />

        {/* 3D Scene Container */}
        <div 
            className="absolute left-1/2 top-1/2 w-0 h-0"
            style={{
                transform: `scale(${camera.zoom}) translate(${camera.x}px, ${camera.y}px)`,
                transformStyle: 'preserve-3d',
                perspective: '1000px'
            }}
        >
            {Object.values(layout).map(item => {
                const file = files.find(f => f.id === item.id);
                if (!file) return null;
                const isActive = activeFileId === item.id;
                
                return (
                    <div
                        key={item.id}
                        className={`
                            absolute flex flex-col bg-white dark:bg-cyber-800 rounded-lg shadow-xl
                            transition-shadow duration-200 group
                            ${isActive ? 'ring-2 ring-violet-500 shadow-2xl z-50' : 'hover:shadow-2xl border border-transparent'}
                        `}
                        style={{
                            width: item.width,
                            height: item.height,
                            left: 0, 
                            top: 0,
                            transform: `translate3d(${item.x}px, ${item.y}px, ${item.z}px) rotateZ(${item.rotation}deg)`,
                            zIndex: item.z
                        }}
                        onMouseEnter={() => setHoveredId(item.id)}
                        onMouseLeave={() => setHoveredId(null)}
                        onMouseDown={(e) => startDrag(e, item.id, 'move')}
                    >
                        {/* Header Handle */}
                        <div 
                           className="h-8 bg-paper-200 dark:bg-cyber-700 rounded-t-lg flex items-center justify-between px-2 cursor-grab active:cursor-grabbing border-b border-paper-300 dark:border-cyber-600"
                        >
                            <span className="text-xs font-bold text-slate-600 dark:text-slate-300 truncate max-w-[80%] flex items-center gap-2">
                                <GripHorizontal size={14} className="opacity-50" />
                                {file.name}
                            </span>
                            {isActive && (
                                <button 
                                    className="text-slate-400 hover:text-violet-500 cursor-ew-resize p-1"
                                    onMouseDown={(e) => startDrag(e, item.id, 'rotate')}
                                    title="Rotate"
                                >
                                    <RotateCw size={14} />
                                </button>
                            )}
                        </div>
                        
                        {/* Content Preview */}
                        <div className="flex-1 overflow-hidden p-3 relative bg-paper-50 dark:bg-cyber-900/50 rounded-b-lg">
                            <div className="prose dark:prose-invert prose-xs max-w-none select-none pointer-events-none transform origin-top-left scale-90">
                                <ReactMarkdown remarkPlugins={[remarkGfm]}>
                                    {file.content.slice(0, 500) + (file.content.length > 500 ? '...' : '')}
                                </ReactMarkdown>
                            </div>
                            {/* Overlay to catch clicks inside content to act as drag start too, or select */}
                            <div className="absolute inset-0 bg-transparent" />
                        </div>

                        {/* Resize Handle */}
                        <div 
                            className="absolute bottom-0 right-0 w-6 h-6 cursor-nwse-resize flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                            onMouseDown={(e) => startDrag(e, item.id, 'resize')}
                        >
                            <Maximize2 size={12} className="text-slate-400 transform rotate-90" />
                        </div>
                        
                        {/* 3D Depth Effect (Pseudo-extrusion) */}
                        <div 
                            className="absolute top-2 left-2 w-full h-full -z-10 rounded-lg bg-black/20 blur-sm transform translate-z-[-10px]"
                        ></div>
                    </div>
                );
            })}
        </div>

        {/* HUD Controls */}
        <div className="absolute bottom-6 left-1/2 transform -translate-x-1/2 flex items-center gap-2 px-4 py-2 bg-white/90 dark:bg-cyber-900/90 backdrop-blur rounded-full border border-paper-200 dark:border-cyber-700 shadow-xl z-50">
            <button onClick={() => setCamera(p => ({ ...p, zoom: p.zoom - 0.1 }))} className="p-2 hover:bg-paper-200 dark:hover:bg-cyber-700 rounded-full text-slate-600 dark:text-slate-300">
                <ZoomOut size={18} />
            </button>
            <span className="text-xs font-mono font-bold w-12 text-center text-slate-500">
                {Math.round(camera.zoom * 100)}%
            </span>
            <button onClick={() => setCamera(p => ({ ...p, zoom: p.zoom + 0.1 }))} className="p-2 hover:bg-paper-200 dark:hover:bg-cyber-700 rounded-full text-slate-600 dark:text-slate-300">
                <ZoomIn size={18} />
            </button>
            <div className="w-px h-4 bg-paper-300 dark:bg-cyber-600 mx-1"></div>
            <button onClick={resetCamera} className="p-2 hover:bg-paper-200 dark:hover:bg-cyber-700 rounded-full text-slate-600 dark:text-slate-300" title="Reset View">
                <RotateCcw size={18} />
            </button>
        </div>

        <div className="absolute top-4 right-4 px-3 py-1.5 bg-black/60 text-white text-xs font-bold rounded-full backdrop-blur pointer-events-none">
            3D Note Space
        </div>
    </div>
  );
};
