
import React, { useState, useRef, useEffect, KeyboardEvent as ReactKeyboardEvent, MouseEvent as ReactMouseEvent, useCallback } from 'react';
import { Presentation, Slide, SlideObject, DashboardItem, ChartData, TextContent, ImageContent, SlideTransition, ObjectAnimation, ShapeContent, ShapeType, AspectRatio, VideoContent, Shadow, Gradient, ImageFilters, ObjectAnimationPreset, SlideTransitionPreset, AnimationTrigger, ContextMenuItem } from '../../types';
import { AddSlideIcon, AddTextIcon, AddChartIcon, AddImageIcon, TrashIcon, BringForwardIcon, SendBackwardIcon, BoldIcon, ItalicIcon, UnderlineIcon, AlignLeftIcon, AlignCenterIcon, AlignRightIcon, UndoIcon, RedoIcon, CopyIcon, CutIcon, PasteIcon, DuplicateIcon, PresentIcon, AlignObjectsLeftIcon, AlignObjectsCenterIcon, AlignObjectsRightIcon, AlignObjectsTopIcon, AlignObjectsMiddleIcon, AlignObjectsBottomIcon, ShapesIcon, VideoIcon, PlayIcon, ZoomOutIcon, ZoomInIcon, FitToScreenIcon } from '../icons';
import ChartRenderer from '../charts/ChartRenderer';
import { shapeCategories, ShapeIcon, ShapeRenderer } from './shapes';
import { readFileAsDataURL } from '../../utils/fileUtils';
import { OBJECT_ANIMATION_PRESETS, SLIDE_TRANSITION_PRESETS } from './animationPresets';
import ContextMenu from './ContextMenu';


interface PresentationEditorProps {
  initialPresentation: Presentation;
  dashboardItems: DashboardItem[];
  onPresentationChange: (presentation: Presentation, newHistoryEntry?: boolean) => void;
  onUndo: () => void;
  onRedo: () => void;
  canUndo: boolean;
  canRedo: boolean;
  onPresent: () => void;
  selectedSlideId: string | null;
  onSelectSlide: (id: string) => void;
  selectedObjectIds: string[];
  onSelectObjects: (ids: string[]) => void;
}

type InteractionMode = 'idle' | 'dragging' | 'resizing';
type ResizeHandle = 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';

interface ContextMenuState {
  x: number;
  y: number;
  isVisible: boolean;
  items: ContextMenuItem[];
}

// Fix: Changed to a named export to resolve module resolution issues.
export const PresentationEditor: React.FC<PresentationEditorProps> = ({
  initialPresentation,
  dashboardItems,
  onPresentationChange,
  onUndo,
  onRedo,
  canUndo,
  canRedo,
  onPresent,
  selectedSlideId,
  onSelectSlide,
  selectedObjectIds,
  onSelectObjects,
}) => {
  const presentation = initialPresentation;
  const [editingObjectId, setEditingObjectId] = useState<string | null>(null);
  const [clipboard, setClipboard] = useState<SlideObject[] | null>(null);
  const [isShapesMenuOpen, setIsShapesMenuOpen] = useState(false);
  const [contextMenu, setContextMenu] = useState<ContextMenuState>({ x: 0, y: 0, isVisible: false, items: [] });
  const [scale, setScale] = useState(0.6);

  const interactionRef = useRef<{
    mode: InteractionMode;
    objectIds: string[];
    handle?: ResizeHandle;
    startX: number;
    startY: number;
    objectsStart: { id: string; x: number; y: number; width: number; height: number }[];
  }>({ mode: 'idle', objectIds: [], startX: 0, startY: 0, objectsStart: [] });
  
  const editorRef = useRef<HTMLDivElement>(null);
  const canvasContainerRef = useRef<HTMLDivElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const shapesButtonRef = useRef<HTMLDivElement>(null);
  
  const selectedSlide = presentation.slides.find(s => s.id === selectedSlideId);
  
  const calculateFitScale = useCallback(() => {
    if (canvasContainerRef.current) {
        const containerWidth = canvasContainerRef.current.clientWidth;
        const containerHeight = canvasContainerRef.current.clientHeight;
        const padding = 64; // Corresponds to px-8 on each side
        const scaleX = (containerWidth - padding) / 1280;
        const scaleY = (containerHeight - padding) / 720;
        setScale(Math.max(0.1, Math.min(scaleX, scaleY)));
    }
  }, []);

  useEffect(() => {
    calculateFitScale();
    window.addEventListener('resize', calculateFitScale);
    return () => window.removeEventListener('resize', calculateFitScale);
  }, [calculateFitScale]);


  useEffect(() => {
    if (presentation.slides.length > 0 && !presentation.slides.find(s => s.id === selectedSlideId)) {
        onSelectSlide(presentation.slides[0]?.id);
    }
  }, [presentation, selectedSlideId, onSelectSlide]);
  
  const updateSlide = (slideId: string, newProps: Partial<Slide>, historyEntry = true) => {
    const newSlides = presentation.slides.map(s => s.id === slideId ? { ...s, ...newProps } : s);
    onPresentationChange({ ...presentation, slides: newSlides }, historyEntry);
  };
  
  const updateSelectedObjects = (newProps: Partial<SlideObject> | ((obj: SlideObject) => Partial<SlideObject>), historyEntry = false) => {
    if (!selectedSlideId) return;
    const newSlides = presentation.slides.map(slide => {
        if (slide.id === selectedSlideId) {
            const newObjects = slide.objects.map(obj => {
                if (selectedObjectIds.includes(obj.id)) {
                    const propsToUpdate = typeof newProps === 'function' ? newProps(obj) : newProps;
                    return { ...obj, ...propsToUpdate };
                }
                return obj;
            });
            return { ...slide, objects: newObjects };
        }
        return slide;
    });
    onPresentationChange({ ...presentation, slides: newSlides }, historyEntry);
  };
  
  const updateObjectContent = (newContentProps: any, historyEntry = false) => {
    updateSelectedObjects(obj => ({
        content: { ...obj.content, ...newContentProps }
    }), historyEntry);
  };

  const addSlide = () => {
    const newSlide: Slide = {
        id: `slide-${Date.now()}`,
        background: '#FFFFFF',
        notes: '',
        transition: { preset: 'fade', duration: 500 },
        objects: [],
    };
    const newSlides = [...presentation.slides, newSlide];
    onPresentationChange({ ...presentation, slides: newSlides }, true);
    onSelectSlide(newSlide.id);
  };

  const addTextObject = () => {
    if (!selectedSlideId) return;
    const newObject: SlideObject = {
        id: `obj-text-${Date.now()}`,
        type: 'text',
        x: 100, y: 100, width: 300, height: 50,
        rotation: 0, opacity: 1, flipX: false, flipY: false,
        animation: { preset: 'fade-in', trigger: 'on-load', duration: 500, delay: 0, loop: false },
        exitAnimation: null,
        content: {
            text: "New Text Box",
            fontFamily: 'Arial', fontSize: 24, fontWeight: 'normal', fontStyle: 'normal',
            textDecoration: 'none', textAlign: 'left', color: '#000000', backgroundColor: 'transparent',
            letterSpacing: 0, lineHeight: 1.2, paragraphSpacing: 0, textTransform: 'none',
            overflow: 'visible', strokeColor: '#000000', strokeWidth: 0,
        }
    };
    updateSlide(selectedSlideId, { objects: [...selectedSlide!.objects, newObject] });
    onSelectObjects([newObject.id]);
  };

  const addShapeObject = (shape: ShapeType) => {
     const newObject: SlideObject = {
      id: `obj-shape-${Date.now()}`,
      type: 'shape',
      x: 100, y: 100, width: 100, height: 100, rotation: 0, opacity: 1,
      flipX: false, flipY: false,
      animation: { preset: 'fade-in', trigger: 'on-load', duration: 500, delay: 0, loop: false },
      exitAnimation: null,
      content: { 
          shape,
          fillColor: '#cccccc',
          borderColor: '#000000',
          borderWidth: 2,
          borderStyle: 'solid',
      }
    };
    updateSlide(selectedSlideId!, { objects: [...selectedSlide!.objects, newObject] });
    onSelectObjects([newObject.id]);
    setIsShapesMenuOpen(false);
  };
  
  const addImageObject = (src: string, alt: string) => {
     const newObject: SlideObject = {
      id: `obj-img-${Date.now()}`,
      type: 'image',
      x: 50, y: 50, width: 400, height: 300, rotation: 0, opacity: 1,
      flipX: false, flipY: false,
      animation: { preset: 'fade-in', trigger: 'on-load', duration: 500, delay: 0, loop: false },
      exitAnimation: null,
      content: { 
          src,
          altText: alt,
          borderRadius: 0,
          borderColor: '#000000',
          borderWidth: 0,
          objectFit: 'cover',
          filters: { brightness: 100, contrast: 100, saturate: 100, grayscale: 0, sepia: 0, blur: 0 }
      }
    };
    updateSlide(selectedSlideId!, { objects: [...selectedSlide!.objects, newObject] });
    onSelectObjects([newObject.id]);
  };

  const handleImageUpload = async () => {
    imageInputRef.current?.click();
  };

  const onImageFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files && e.target.files[0]) {
          const file = e.target.files[0];
          const dataUrl = await readFileAsDataURL(file);
          addImageObject(dataUrl, file.name);
          e.target.value = ''; // Reset input
      }
  };

  const deleteObjects = useCallback((objectIds: string[]) => {
    if (!selectedSlideId || objectIds.length === 0) return;
    const newObjects = selectedSlide!.objects.filter(obj => !objectIds.includes(obj.id));
    updateSlide(selectedSlideId, { objects: newObjects });
    onSelectObjects([]);
  }, [selectedSlide, selectedSlideId, onPresentationChange, onSelectObjects]);

  const changeLayer = useCallback((direction: 1 | -1) => { // 1 for forward, -1 for backward
    if (!selectedSlideId || selectedObjectIds.length === 0) return;

    let objects = [...selectedSlide!.objects];
    const selectedIndices = selectedObjectIds.map(id => objects.findIndex(o => o.id === id)).sort((a,b) => a - b);
    
    if (direction === 1) { // Bring forward
        for (let i = selectedIndices.length - 1; i >= 0; i--) {
            const index = selectedIndices[i];
            if (index < objects.length - 1) {
                const [item] = objects.splice(index, 1);
                objects.splice(index + 1, 0, item);
            }
        }
    } else { // Send backward
        for (const index of selectedIndices) {
            if (index > 0) {
                const [item] = objects.splice(index, 1);
                objects.splice(index - 1, 0, item);
            }
        }
    }
    updateSlide(selectedSlideId, { objects }, true);
  }, [selectedSlide, selectedSlideId, selectedObjectIds, onPresentationChange]);

  const handleCopy = useCallback(() => {
    if (!selectedSlide || selectedObjectIds.length === 0) return;
    const objectsToCopy = selectedSlide.objects.filter(o => selectedObjectIds.includes(o.id));
    setClipboard(objectsToCopy);
  }, [selectedSlide, selectedObjectIds]);

  const handleCut = useCallback(() => {
    handleCopy();
    deleteObjects(selectedObjectIds);
  }, [handleCopy, deleteObjects, selectedObjectIds]);
  
  const handlePaste = useCallback(() => {
    if (!clipboard || !selectedSlideId) return;
    const newObjects = clipboard.map(obj => ({
        ...obj,
        id: `${obj.type}-${Date.now()}-${Math.random()}`,
        x: obj.x + 20,
        y: obj.y + 20,
    }));
    updateSlide(selectedSlideId, { objects: [...selectedSlide!.objects, ...newObjects] });
    onSelectObjects(newObjects.map(o => o.id));
  }, [clipboard, selectedSlide, selectedSlideId, onPresentationChange, onSelectObjects]);

  const handleDuplicate = useCallback(() => {
    if (!selectedSlide || selectedObjectIds.length === 0) return;
    const objectsToDuplicate = selectedSlide.objects.filter(o => selectedObjectIds.includes(o.id));
    const newObjects = objectsToDuplicate.map(obj => ({
        ...obj,
        id: `${obj.type}-${Date.now()}-${Math.random()}`,
        x: obj.x + 20,
        y: obj.y + 20,
    }));
    updateSlide(selectedSlideId!, { objects: [...selectedSlide.objects, ...newObjects] });
    onSelectObjects(newObjects.map(o => o.id));
  }, [selectedSlide, selectedObjectIds, selectedSlideId, onPresentationChange, onSelectObjects]);
  
  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (interactionRef.current.mode === 'idle' || !editorRef.current || !selectedSlideId) return;
    e.preventDefault();

    const { mode, startX, startY, objectsStart, handle } = interactionRef.current;
    const editorBounds = editorRef.current.getBoundingClientRect();
    const currentX = (e.clientX - editorBounds.left) / scale;
    const currentY = (e.clientY - editorBounds.top) / scale;
    const dx = currentX - startX;
    const dy = currentY - startY;

    if (mode === 'dragging') {
        updateSelectedObjects(obj => {
            const startState = objectsStart.find(o => o.id === obj.id);
            if(startState) {
                return { x: startState.x + dx, y: startState.y + dy };
            }
            return {};
        });
    } else if (mode === 'resizing' && objectsStart.length === 1) {
        const startState = objectsStart[0];
        let newX = startState.x;
        let newY = startState.y;
        let newWidth = startState.width;
        let newHeight = startState.height;

        if (handle?.includes('right')) newWidth = Math.max(20, startState.width + dx);
        if (handle?.includes('bottom')) newHeight = Math.max(20, startState.height + dy);
        
        if (handle?.includes('left')) {
            const newW = startState.width - dx;
            if (newW > 20) {
                newWidth = newW;
                newX = startState.x + dx;
            }
        }
        if (handle?.includes('top')) {
            const newH = startState.height - dy;
            if (newH > 20) {
                newHeight = newH;
                newY = startState.y + dy;
            }
        }
        updateSelectedObjects({ x: newX, y: newY, width: newWidth, height: newHeight });
    }
  }, [selectedSlideId, onPresentationChange, presentation, scale]);

  const handleMouseUp = useCallback(() => {
    if (interactionRef.current.mode !== 'idle') {
        onPresentationChange(presentation, true);
        interactionRef.current.mode = 'idle';
    }
  }, [presentation, onPresentationChange]);

  useEffect(() => {
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
        window.removeEventListener('mousemove', handleMouseMove);
        window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [handleMouseMove, handleMouseUp]);
  
  const handleObjectMouseDown = (e: ReactMouseEvent<HTMLDivElement>, object: SlideObject) => {
    e.stopPropagation();
    
    const isResizing = (e.target as HTMLElement).dataset.handle;
    const editorBounds = editorRef.current!.getBoundingClientRect();
    const startX = (e.clientX - editorBounds.left) / scale;
    const startY = (e.clientY - editorBounds.top) / scale;

    let currentSelection = selectedObjectIds;
    if (e.shiftKey) {
        currentSelection = selectedObjectIds.includes(object.id)
            ? selectedObjectIds.filter(id => id !== object.id)
            : [...selectedObjectIds, object.id];
    } else if (!selectedObjectIds.includes(object.id)) {
        currentSelection = [object.id];
    }
    onSelectObjects(currentSelection);

    const objectsToInteract = presentation.slides
        .find(s => s.id === selectedSlideId)!
        .objects
        .filter(o => currentSelection.includes(o.id));

    interactionRef.current = {
        mode: isResizing ? 'resizing' : 'dragging',
        objectIds: currentSelection,
        handle: isResizing as ResizeHandle,
        startX,
        startY,
        objectsStart: objectsToInteract.map(o => ({ id: o.id, x: o.x, y: o.y, width: o.width, height: o.height }))
    };
  };

   // Keyboard Shortcuts
   useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
        const target = e.target as HTMLElement;
        if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) {
            return;
        }

        const isCmdOrCtrl = e.metaKey || e.ctrlKey;
        const isShift = e.shiftKey;

        // Object movement
        if (selectedObjectIds.length > 0 && e.key.startsWith('Arrow')) {
            e.preventDefault();
            const amount = isShift ? 10 : 1;
            let dx = 0;
            let dy = 0;
            if (e.key === 'ArrowUp') dy = -amount;
            if (e.key === 'ArrowDown') dy = amount;
            if (e.key === 'ArrowLeft') dx = -amount;
            if (e.key === 'ArrowRight') dx = amount;
            
            updateSelectedObjects(obj => ({ x: obj.x + dx, y: obj.y + dy }));
            // Debounced history update
            const timer = setTimeout(() => onPresentationChange(presentation, true), 500);
            return () => clearTimeout(timer);
        }

        if (e.key === 'Delete' || e.key === 'Backspace') {
            e.preventDefault();
            deleteObjects(selectedObjectIds);
        }

        if (isCmdOrCtrl) {
            switch(e.key) {
                case 'c': e.preventDefault(); handleCopy(); break;
                case 'x': e.preventDefault(); handleCut(); break;
                case 'v': e.preventDefault(); handlePaste(); break;
                case 'd': e.preventDefault(); handleDuplicate(); break;
                case 'z': e.preventDefault(); isShift ? onRedo() : onUndo(); break;
                case 'y': e.preventDefault(); onRedo(); break;
            }
        }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
   }, [selectedObjectIds, handleCopy, handleCut, handlePaste, handleDuplicate, deleteObjects, onUndo, onRedo, presentation, onPresentationChange]);


  const handleObjectContextMenu = (e: ReactMouseEvent, object: SlideObject) => {
      e.preventDefault();
      e.stopPropagation();
      if (!selectedObjectIds.includes(object.id)) {
          onSelectObjects([object.id]);
      }
      setContextMenu({
          x: e.clientX,
          y: e.clientY,
          isVisible: true,
          items: [
              { label: 'Copy', icon: CopyIcon, action: handleCopy, shortcut: '⌘C' },
              { label: 'Cut', icon: CutIcon, action: handleCut, shortcut: '⌘X' },
              { label: 'Paste', icon: PasteIcon, action: handlePaste, disabled: !clipboard, shortcut: '⌘V' },
              { label: 'Duplicate', icon: DuplicateIcon, action: handleDuplicate, shortcut: '⌘D' },
              { label: 'Delete', icon: TrashIcon, action: () => deleteObjects(selectedObjectIds), shortcut: 'Del' },
              { isSeparator: true, label: '', icon: () => null, action: () => {} },
              { label: 'Bring Forward', icon: BringForwardIcon, action: () => changeLayer(1) },
              { label: 'Send Backward', icon: SendBackwardIcon, action: () => changeLayer(-1) },
          ]
      });
  };

  const handleCanvasContextMenu = (e: ReactMouseEvent) => {
      e.preventDefault();
      onSelectObjects([]);
      setContextMenu({
          x: e.clientX,
          y: e.clientY,
          isVisible: true,
          items: [
              { label: 'Paste', icon: PasteIcon, action: handlePaste, disabled: !clipboard, shortcut: '⌘V' },
              { isSeparator: true, label: '', icon: () => null, action: () => {} },
              { label: 'Add Text Box', icon: AddTextIcon, action: addTextObject },
              { label: 'Upload Image', icon: AddImageIcon, action: handleImageUpload },
          ]
      });
  };
  
  const getObjectStyle = (obj: SlideObject): React.CSSProperties => {
      let filterString = '';
      if (obj.shadow) {
          filterString += `drop-shadow(${obj.shadow.x}px ${obj.shadow.y}px ${obj.shadow.blur}px ${obj.shadow.color}) `;
      }
      if (obj.type === 'image') {
          const c = obj.content as ImageContent;
          // Fix: Added a safeguard to prevent crashes if `c.filters` is missing from the data.
          if (c.filters) {
              filterString += `brightness(${c.filters.brightness}%) contrast(${c.filters.contrast}%) saturate(${c.filters.saturate}%) grayscale(${c.filters.grayscale}%) sepia(${c.filters.sepia}%) blur(${c.filters.blur}px)`;
          }
      }

      const scaleX = obj.flipX ? -1 : 1;
      const scaleY = obj.flipY ? -1 : 1;

      return {
          left: obj.x, top: obj.y, width: obj.width, height: obj.height,
          transform: `rotate(${obj.rotation || 0}deg) scaleX(${scaleX}) scaleY(${scaleY})`,
          opacity: obj.opacity ?? 1,
          filter: filterString.trim() || 'none',
          transition: 'all 0.4s cubic-bezier(0.25, 0.8, 0.25, 1)',
      };
  };

  const renderObjectContent = (obj: SlideObject) => {
    const textContent = obj.type === 'text' ? obj.content as TextContent : null;
    const textStyles: React.CSSProperties | undefined = textContent ? {
        fontSize: textContent.fontSize,
        fontFamily: textContent.fontFamily,
        fontWeight: textContent.fontWeight,
        fontStyle: textContent.fontStyle,
        textDecoration: textContent.textDecoration,
        textAlign: textContent.textAlign,
        color: textContent.color,
        backgroundColor: textContent.backgroundColor,
        letterSpacing: `${textContent.letterSpacing}px`,
        lineHeight: textContent.lineHeight,
        textTransform: textContent.textTransform === 'none' ? undefined : textContent.textTransform,
        WebkitTextStroke: `${textContent.strokeWidth}px ${textContent.strokeColor}`,
        paddingBottom: `${textContent.paragraphSpacing}px`,
        whiteSpace: textContent.overflow === 'ellipsis' ? 'nowrap' : 'pre-wrap',
        overflow: textContent.overflow === 'ellipsis' ? 'hidden' : 'visible',
        textOverflow: textContent.overflow === 'ellipsis' ? 'ellipsis' : 'clip',
    } : undefined;

    if (editingObjectId === obj.id && textContent && textStyles) {
        return (
            <textarea
                value={textContent.text}
                onChange={e => updateObjectContent({ text: e.target.value })}
                onBlur={() => {
                    setEditingObjectId(null);
                    onPresentationChange(presentation, true);
                }}
                onKeyDown={e => { if (e.key === 'Escape') setEditingObjectId(null); }}
                className="w-full h-full p-2 resize-none outline-none"
                style={{ ...textStyles, backgroundColor: 'rgba(255, 255, 255, 0.9)', WebkitTextStroke: '0' }}
                autoFocus
            />
        )
    }

    switch (obj.type) {
      case 'text':
        return (
          <div
            className="w-full h-full p-2 overflow-hidden"
            onDoubleClick={() => obj.type === 'text' && setEditingObjectId(obj.id)}
            style={textStyles}
          >
            {textContent!.text}
          </div>
        );
      case 'chart': return <div className="w-full h-full bg-white"><ChartRenderer chartData={obj.content as ChartData}/></div>;
      case 'shape':
        return <ShapeRenderer {...obj.content as ShapeContent} />;
      case 'image':
        const imgContent = obj.content as ImageContent;
        return <img src={imgContent.src} className="w-full h-full" style={{ borderRadius: `${imgContent.borderRadius}px`, border: `${imgContent.borderWidth}px solid ${imgContent.borderColor}`, objectFit: imgContent.objectFit }} alt={imgContent.altText || "slide content"}/>;
      case 'video':
        const videoContent = obj.content as VideoContent;
        return <div className="w-full h-full relative bg-black"><video src={videoContent.src} className="w-full h-full object-contain" poster={videoContent.thumbnail} /><div className="absolute inset-0 flex items-center justify-center bg-black/30"><PlayIcon className="w-16 h-16 text-white/70" /></div></div>
      default:
        return <div className="bg-gray-200 w-full h-full">Unsupported</div>;
    }
  };

  if (!presentation || !selectedSlide) {
    return <div className="flex-1 flex items-center justify-center">Loading Presentation...</div>;
  }
  
  const ToolbarButton: React.FC<{onClick?: () => void, disabled?: boolean, children: React.ReactNode, title?: string}> = ({onClick, disabled, children, title}) => (
      <button onClick={onClick} disabled={disabled} title={title} className="p-2 rounded-md hover:bg-gray-200 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed">
          {children}
      </button>
  );

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden bg-gray-200 dark:bg-gray-900">
       <div className="flex items-center space-x-1 p-1 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 flex-wrap">
         <ToolbarButton onClick={onUndo} disabled={!canUndo} title="Undo (Ctrl+Z)"><UndoIcon className="w-5 h-5" /></ToolbarButton>
         <ToolbarButton onClick={onRedo} disabled={!canRedo} title="Redo (Ctrl+Y)"><RedoIcon className="w-5 h-5" /></ToolbarButton>
         <div className="h-6 w-px bg-gray-300 dark:bg-gray-600 mx-1" />
         <ToolbarButton onClick={addSlide} title="Add Slide"><AddSlideIcon className="w-5 h-5" /></ToolbarButton>
         <ToolbarButton onClick={addTextObject} title="Add Text"><AddTextIcon className="w-5 h-5" /></ToolbarButton>
         <div ref={shapesButtonRef} className="relative">
            <ToolbarButton onClick={() => setIsShapesMenuOpen(p => !p)} title="Add Shape"><ShapesIcon className="w-5 h-5" /></ToolbarButton>
            {isShapesMenuOpen && (
                <div className="absolute top-full mt-2 left-0 bg-white dark:bg-gray-800 border dark:border-gray-700 rounded-lg shadow-lg z-20 w-72 p-2">
                    {shapeCategories.map(category => (
                        <div key={category.name}>
                            <h4 className="text-xs font-bold uppercase text-gray-500 dark:text-gray-400 my-1 px-1">{category.name}</h4>
                            <div className="grid grid-cols-6 gap-1">
                                {category.shapes.map(shape => (
                                    <button key={shape} onClick={() => addShapeObject(shape as ShapeType)} className="p-2 rounded hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center justify-center">
                                        <ShapeIcon shape={shape as ShapeType} />
                                    </button>
                                ))}
                            </div>
                        </div>
                    ))}
                </div>
            )}
         </div>
         <ToolbarButton onClick={handleImageUpload} title="Add Image"><AddImageIcon className="w-5 h-5" /></ToolbarButton>
         <input type="file" ref={imageInputRef} onChange={onImageFileChange} accept="image/*" className="hidden" />
         <div className="h-6 w-px bg-gray-300 dark:bg-gray-600 mx-1" />
         <ToolbarButton onClick={() => deleteObjects(selectedObjectIds)} disabled={selectedObjectIds.length === 0} title="Delete"><TrashIcon className="w-5 h-5" /></ToolbarButton>
         <ToolbarButton onClick={() => changeLayer(1)} disabled={selectedObjectIds.length === 0} title="Bring Forward"><BringForwardIcon className="w-5 h-5" /></ToolbarButton>
         <ToolbarButton onClick={() => changeLayer(-1)} disabled={selectedObjectIds.length === 0} title="Send Backward"><SendBackwardIcon className="w-5 h-5" /></ToolbarButton>
         <div className="flex-grow" />
         <button onClick={onPresent} className="px-3 py-1.5 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 flex items-center gap-2">
            <PresentIcon className="w-5 h-5" />
            Present
        </button>
      </div>

       <div className="flex-1 flex overflow-hidden">
        {/* Slides Panel */}
        <div className="w-48 bg-gray-50 dark:bg-gray-800/50 p-2 overflow-y-auto border-r border-gray-200 dark:border-gray-700 space-y-2">
            {presentation.slides.map((slide, index) => (
                <div key={slide.id} onClick={() => onSelectSlide(slide.id)} className={`aspect-video w-full rounded-md cursor-pointer border-2 ${selectedSlideId === slide.id ? 'border-blue-500' : 'border-transparent'}`}>
                    <div className="w-full h-full bg-white shadow-sm p-1 flex items-center justify-center relative scale-100">
                        <span className="absolute top-1 left-1 text-xs text-gray-500">{index + 1}</span>
                         <div className="w-full h-full bg-white shadow-lg relative overflow-hidden" style={{ transform: 'scale(0.2)', transformOrigin: 'center center' }}>
                            <div className="absolute inset-0" style={{ backgroundColor: slide.background }}></div>
                            {slide.objects.map(obj => (
                                <div key={obj.id} className="absolute" style={getObjectStyle(obj)}>
                                    {/* Simplified render for thumbnail */}
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            ))}
        </div>
        
        {/* Canvas */}
        <div ref={canvasContainerRef} className="flex-1 flex items-center justify-center px-8 relative" onMouseDown={() => onSelectObjects([])} onContextMenu={handleCanvasContextMenu}>
          <div ref={editorRef} className="w-[1280px] h-[720px] bg-white shadow-lg relative" style={{ transform: `scale(${scale})`, transformOrigin: 'center center' }}>
              <div className="absolute inset-0" style={{ backgroundColor: selectedSlide.background }}></div>
                {selectedSlide.objects.map(obj => (
                    <div key={obj.id} 
                         onMouseDown={(e) => handleObjectMouseDown(e, obj)}
                         onContextMenu={(e) => handleObjectContextMenu(e, obj)}
                         className={`absolute cursor-move ${selectedObjectIds.includes(obj.id) ? 'outline outline-2 outline-blue-500' : 'outline outline-2 outline-transparent hover:outline-blue-300/50'}`}
                         style={getObjectStyle(obj)}>
                        {renderObjectContent(obj)}
                        {selectedObjectIds.includes(obj.id) && !editingObjectId && (
                            <>
                                <div data-handle="top-left" className="absolute w-2.5 h-2.5 bg-white border border-blue-500 -m-1.5 top-0 left-0 cursor-nwse-resize" />
                                <div data-handle="top-right" className="absolute w-2.5 h-2.5 bg-white border border-blue-500 -m-1.5 top-0 right-0 cursor-nesw-resize" />
                                <div data-handle="bottom-left" className="absolute w-2.5 h-2.5 bg-white border border-blue-500 -m-1.5 bottom-0 left-0 cursor-nesw-resize" />
                                <div data-handle="bottom-right" className="absolute w-2.5 h-2.5 bg-white border border-blue-500 -m-1.5 bottom-0 right-0 cursor-nwse-resize" />
                            </>
                        )}
                    </div>
                ))}
          </div>
           <div className="absolute bottom-4 right-4 bg-white dark:bg-gray-800 rounded-lg shadow-md p-1 flex items-center space-x-1 text-gray-700 dark:text-gray-200">
                <ToolbarButton onClick={() => setScale(s => Math.max(0.1, s - 0.1))} title="Zoom Out"><ZoomOutIcon className="w-5 h-5" /></ToolbarButton>
                <span className="text-xs font-semibold w-12 text-center select-none">{Math.round(scale * 100)}%</span>
                <ToolbarButton onClick={() => setScale(s => Math.min(2, s + 0.1))} title="Zoom In"><ZoomInIcon className="w-5 h-5" /></ToolbarButton>
                <div className="h-5 w-px bg-gray-300 dark:bg-gray-600 mx-1" />
                <ToolbarButton onClick={calculateFitScale} title="Fit to Screen"><FitToScreenIcon className="w-5 h-5" /></ToolbarButton>
            </div>
         {contextMenu.isVisible && <ContextMenu {...contextMenu} onClose={() => setContextMenu({ ...contextMenu, isVisible: false })} />}
       </div>
    </div>
  );
};

