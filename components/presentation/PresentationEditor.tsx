import React, { useState, useRef, useEffect, KeyboardEvent as ReactKeyboardEvent, MouseEvent as ReactMouseEvent, useCallback } from 'react';
import { Presentation, Slide, SlideObject, DashboardItem, ChartData, TextContent, ImageContent, SlideTransitionType, ObjectAnimationType, ShapeContent } from '../../types';
import { AddSlideIcon, AddTextIcon, AddChartIcon, AddImageIcon, TrashIcon, BringForwardIcon, SendBackwardIcon, RectangleIcon, EllipseIcon, BoldIcon, ItalicIcon, UnderlineIcon, AlignLeftIcon, AlignCenterIcon, AlignRightIcon, UndoIcon, RedoIcon, CopyIcon, PasteIcon, DuplicateIcon, PresentIcon, AlignObjectsLeftIcon, AlignObjectsCenterIcon, AlignObjectsRightIcon, AlignObjectsTopIcon, AlignObjectsMiddleIcon, AlignObjectsBottomIcon } from '../icons';
import ChartRenderer from '../charts/ChartRenderer';

interface PresentationEditorProps {
  initialPresentation: Presentation;
  dashboardItems: DashboardItem[];
  onPresentationChange: (presentation: Presentation) => void;
  onUndo: () => void;
  onRedo: () => void;
  canUndo: boolean;
  canRedo: boolean;
  onPresent: () => void;
}

type InteractionMode = 'idle' | 'dragging' | 'resizing';
type ResizeHandle = 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';

const FONT_SIZES = [12, 14, 18, 24, 32, 48, 64];
const SLIDE_TRANSITIONS: SlideTransitionType[] = ['none', 'fade', 'slide-in-left', 'slide-in-right'];
const OBJECT_ANIMATIONS: ObjectAnimationType[] = ['none', 'fade-in', 'fly-in-up', 'fly-in-left'];

const PresentationEditor: React.FC<PresentationEditorProps> = ({
  initialPresentation,
  dashboardItems,
  onPresentationChange,
  onUndo,
  onRedo,
  canUndo,
  canRedo,
  onPresent
}) => {
  const presentation = initialPresentation;
  const [selectedSlideId, setSelectedSlideId] = useState<string>(initialPresentation.slides[0]?.id);
  const [selectedObjectIds, setSelectedObjectIds] = useState<string[]>([]);
  const [editingObjectId, setEditingObjectId] = useState<string | null>(null);
  const [clipboard, setClipboard] = useState<SlideObject[] | null>(null);

  const [draggedSlideId, setDraggedSlideId] = useState<string | null>(null);
  const [dropTargetIndex, setDropTargetIndex] = useState<number | null>(null);

  const interactionRef = useRef<{
    mode: InteractionMode;
    objectIds: string[];
    handle?: ResizeHandle;
    startX: number;
    startY: number;
    objectsStart: { id: string; x: number; y: number; width: number; height: number }[];
  }>({ mode: 'idle', objectIds: [], startX: 0, startY: 0, objectsStart: [] });
  
  const editorRef = useRef<HTMLDivElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  
  const selectedSlide = presentation.slides.find(s => s.id === selectedSlideId);
  const selectedObjects = selectedSlide?.objects.filter(o => selectedObjectIds.includes(o.id)) || [];
  
  // Reset selection if slide changes or presentation changes
  useEffect(() => {
    if (!presentation.slides.find(s => s.id === selectedSlideId)) {
        setSelectedSlideId(presentation.slides[0]?.id);
    }
    const currentSlideObjectIds = presentation.slides.find(s => s.id === selectedSlideId)?.objects.map(o => o.id) || [];
    setSelectedObjectIds(ids => ids.filter(id => currentSlideObjectIds.includes(id)));

  }, [presentation, selectedSlideId]);
  
  const handleCopy = useCallback(() => {
    if (selectedObjects.length === 0) return;
    const copiedObjects = JSON.parse(JSON.stringify(selectedObjects));
    setClipboard(copiedObjects);
  }, [selectedObjects]);

  const handlePaste = useCallback(() => {
    if (!clipboard || !selectedSlideId) return;
    const newObjects: SlideObject[] = clipboard.map(obj => ({
        ...obj,
        id: `obj-${Date.now()}-${Math.random()}`, // New unique ID
        x: obj.x + 20, // Offset for visibility
        y: obj.y + 20,
    }));

    const newSlides = presentation.slides.map(s => 
        s.id === selectedSlideId 
            ? { ...s, objects: [...s.objects, ...newObjects] } 
            : s
    );
    onPresentationChange({ ...presentation, slides: newSlides });
  }, [clipboard, selectedSlideId, presentation, onPresentationChange]);


  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
        if((e.key === 'Delete' || e.key === 'Backspace') && selectedObjectIds.length > 0 && !editingObjectId) {
            e.preventDefault();
            deleteObjects(selectedObjectIds);
        }
        if (e.ctrlKey || e.metaKey) {
            switch(e.key) {
                case 'z': e.preventDefault(); onUndo(); break;
                case 'y': e.preventDefault(); onRedo(); break;
                case 'c': 
                    if (selectedObjectIds.length > 0 && !editingObjectId) {
                        e.preventDefault();
                        handleCopy();
                    }
                    break;
                case 'v':
                    if (!editingObjectId) {
                        e.preventDefault();
                        handlePaste();
                    }
                    break;
                 case 'a':
                    e.preventDefault();
                    setSelectedObjectIds(selectedSlide?.objects.map(o => o.id) || []);
                    break;
            }
        }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedObjectIds, editingObjectId, onUndo, onRedo, handleCopy, handlePaste, selectedSlide]);

  const updateObjects = (slideId: string, updates: { id: string; newProps: Partial<SlideObject> }[]) => {
    const newSlides = presentation.slides.map(slide => {
      if (slide.id === slideId) {
        const newObjects = slide.objects.map(obj => {
          const update = updates.find(u => u.id === obj.id);
          return update ? { ...obj, ...update.newProps } : obj;
        });
        return { ...slide, objects: newObjects };
      }
      return slide;
    });
    onPresentationChange({ ...presentation, slides: newSlides });
  };
  
  const deleteObjects = (objectIds: string[]) => {
    if (!selectedSlideId || objectIds.length === 0) return;
    const newSlides = presentation.slides.map(slide => {
        if (slide.id === selectedSlideId) {
            return { ...slide, objects: slide.objects.filter(obj => !objectIds.includes(obj.id)) };
        }
        return slide;
    });
    onPresentationChange({...presentation, slides: newSlides });
    setSelectedObjectIds([]);
  }

  const handleObjectMouseDown = (e: ReactMouseEvent<HTMLDivElement>, object: SlideObject) => {
    e.stopPropagation();
    setEditingObjectId(null);
  
    const newSelection = e.shiftKey
      ? selectedObjectIds.includes(object.id)
        ? selectedObjectIds.filter(id => id !== object.id)
        : [...selectedObjectIds, object.id]
      : selectedObjectIds.includes(object.id)
        ? selectedObjectIds
        : [object.id];
  
    setSelectedObjectIds(newSelection);
  
    const currentSlide = presentation.slides.find(s => s.id === selectedSlideId);
    if (!currentSlide) return;
  
    const objectsToDrag = currentSlide.objects.filter(obj => newSelection.includes(obj.id));
  
    interactionRef.current = {
      mode: 'dragging',
      objectIds: newSelection,
      objectsStart: objectsToDrag.map(obj => ({ id: obj.id, x: obj.x, y: obj.y, width: obj.width, height: obj.height })),
      startX: e.clientX,
      startY: e.clientY,
    };
  };

  const handleResizeMouseDown = (e: ReactMouseEvent<HTMLDivElement>, object: SlideObject, handle: ResizeHandle) => {
    e.stopPropagation();
    interactionRef.current = {
        mode: 'resizing',
        objectIds: [object.id],
        handle,
        startX: e.clientX,
        startY: e.clientY,
        objectsStart: [{ id: object.id, x: object.x, y: object.y, width: object.width, height: object.height }],
    }
  }

  const handleMouseMove = (e: ReactMouseEvent<HTMLDivElement>) => {
    const { mode, objectIds, objectsStart, startX, startY, handle } = interactionRef.current;
    if (mode === 'idle' || objectIds.length === 0 || !selectedSlideId) return;

    const dx = e.clientX - startX;
    const dy = e.clientY - startY;
    
    let newSlides = JSON.parse(JSON.stringify(presentation.slides));
    const slideIndex = newSlides.findIndex((s: Slide) => s.id === selectedSlideId);
    if (slideIndex === -1) return;
    const slideToUpdate = newSlides[slideIndex];

    if (mode === 'dragging') {
        objectsStart.forEach(startState => {
            const objToUpdate = slideToUpdate.objects.find((o: SlideObject) => o.id === startState.id);
            if (objToUpdate) {
                objToUpdate.x = startState.x + dx;
                objToUpdate.y = startState.y + dy;
            }
        });
    } else if (mode === 'resizing' && handle && objectsStart.length === 1) {
        const objectToUpdate = slideToUpdate.objects.find((o: SlideObject) => o.id === objectsStart[0].id);
        if(!objectToUpdate) return;

        let {x, y, width, height} = objectsStart[0];
        if (handle.includes('left')) { width -= dx; x += dx; }
        if (handle.includes('right')) { width += dx; }
        if (handle.includes('top')) { height -= dy; y += dy; }
        if (handle.includes('bottom')) { height += dy; }
        
        objectToUpdate.x = x > 0 ? x : 0;
        objectToUpdate.y = y > 0 ? y : 0;
        objectToUpdate.width = width > 20 ? width : 20;
        objectToUpdate.height = height > 20 ? height : 20;
    }
    onPresentationChange({ ...presentation, slides: newSlides });
  };


  const handleMouseUp = () => {
    interactionRef.current.mode = 'idle';
  };
  
  const addSlide = () => {
    const newSlide: Slide = {
        id: `slide-${Date.now()}`,
        background: '#FFFFFF',
        transition: { type: 'fade' },
        objects: [{
            id: `obj-${Date.now()}`,
            type: 'text',
            x: 50, y: 50, width: 700, height: 60,
            animation: { type: 'fade-in' },
            content: { text: "New Slide Title", bold: true, italic: false, underline: false, fontSize: 32, textAlign: 'left' }
        }]
    };
    const newSlides = [...presentation.slides, newSlide];
    onPresentationChange({...presentation, slides: newSlides});
    setSelectedSlideId(newSlide.id);
  }
  
  const handleDuplicateSlide = (slideId: string) => {
    const slideIndex = presentation.slides.findIndex(s => s.id === slideId);
    if (slideIndex === -1) return;

    const originalSlide = presentation.slides[slideIndex];
    const newSlide: Slide = {
        ...JSON.parse(JSON.stringify(originalSlide)),
        id: `slide-${Date.now()}`,
        objects: originalSlide.objects.map((obj, i) => ({ ...JSON.parse(JSON.stringify(obj)), id: `obj-${Date.now()}-${i}` }))
    };
    
    const newSlides = [...presentation.slides];
    newSlides.splice(slideIndex + 1, 0, newSlide);

    onPresentationChange({ ...presentation, slides: newSlides });
    setSelectedSlideId(newSlide.id);
  };
  
  const addObject = (newObject: Omit<SlideObject, 'id'>) => {
    if (!selectedSlideId) return;
    const objectWithId: SlideObject = { ...newObject, id: `obj-${Date.now()}` };
    const newSlides = presentation.slides.map(s => s.id === selectedSlideId ? {...s, objects: [...s.objects, objectWithId]} : s);
    onPresentationChange({...presentation, slides: newSlides});
  };

  const addTextObject = () => addObject({ type: 'text', x: 100, y: 150, width: 300, height: 150, animation: { type: 'fade-in' }, content: { text: 'New Text Box\n- Point 1\n- Point 2', bold: false, italic: false, underline: false, fontSize: 18, textAlign: 'left' }});
  // FIX: Add missing properties to ShapeContent to match the type definition.
  const addShapeObject = (shape: 'rectangle' | 'ellipse') => addObject({ type: 'shape', x: 150, y: 150, width: 150, height: 100, animation: { type: 'fade-in' }, content: { shape, color: '#93c5fd', borderColor: '#60a5fa', borderWidth: 0, borderStyle: 'solid', opacity: 1 } });
  const addChartObject = (chartData: ChartData) => addObject({ type: 'chart', x: 150, y: 150, width: 500, height: 250, animation: { type: 'fade-in' }, content: chartData });
  const addImageObject = (src: string) => addObject({ type: 'image', x: 150, y: 150, width: 300, height: 200, animation: { type: 'fade-in' }, content: { src } });

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => event.target?.result && addImageObject(event.target.result as string);
      reader.readAsDataURL(file);
    }
  };

  const changeObjectLayer = (direction: 'forward' | 'backward') => {
    if (!selectedSlide || selectedObjectIds.length !== 1) return;
    const objectId = selectedObjectIds[0];
    const objects = [...selectedSlide.objects];
    const index = objects.findIndex(obj => obj.id === objectId);

    if (index === -1) return;
    if (direction === 'forward' && index < objects.length - 1) {
        [objects[index], objects[index + 1]] = [objects[index + 1], objects[index]];
    } else if (direction === 'backward' && index > 0) {
        [objects[index], objects[index - 1]] = [objects[index - 1], objects[index]];
    } else return;
    
    const newSlides = presentation.slides.map(s => s.id === selectedSlideId ? {...s, objects} : s);
    onPresentationChange({...presentation, slides: newSlides});
  };

  const updateSelectedObjects = (getNewProps: (obj: SlideObject) => Partial<SlideObject>) => {
    if (selectedObjectIds.length === 0 || !selectedSlideId) return;
    const updates = selectedObjectIds.map(id => {
      const obj = selectedSlide!.objects.find(o => o.id === id)!;
      return { id, newProps: getNewProps(obj) };
    });
    updateObjects(selectedSlideId, updates);
  };
  
  const updateSlideProperty = (updates: Partial<Slide>) => {
    if (!selectedSlideId) return;
    const newSlides = presentation.slides.map(slide => 
        slide.id === selectedSlideId ? { ...slide, ...updates } : slide
    );
    onPresentationChange({ ...presentation, slides: newSlides });
  };

  const handleAlign = (type: 'left' | 'center' | 'right' | 'top' | 'middle' | 'bottom') => {
    if (selectedObjects.length < 2) return;
    
    let updates: {id: string, newProps: Partial<SlideObject>}[] = [];
    
    switch (type) {
        case 'left':
            const minX = Math.min(...selectedObjects.map(o => o.x));
            updates = selectedObjects.map(o => ({ id: o.id, newProps: { x: minX } }));
            break;
        case 'right':
            const maxX = Math.max(...selectedObjects.map(o => o.x + o.width));
            updates = selectedObjects.map(o => ({ id: o.id, newProps: { x: maxX - o.width } }));
            break;
        case 'center':
            const minCenterX = Math.min(...selectedObjects.map(o => o.x));
            const maxCenterX = Math.max(...selectedObjects.map(o => o.x + o.width));
            const center = (minCenterX + maxCenterX) / 2;
            updates = selectedObjects.map(o => ({ id: o.id, newProps: { x: center - o.width / 2 } }));
            break;
        case 'top':
            const minY = Math.min(...selectedObjects.map(o => o.y));
            updates = selectedObjects.map(o => ({ id: o.id, newProps: { y: minY } }));
            break;
        case 'bottom':
            const maxY = Math.max(...selectedObjects.map(o => o.y + o.height));
            updates = selectedObjects.map(o => ({ id: o.id, newProps: { y: maxY - o.height } }));
            break;
        case 'middle':
            const minCenterY = Math.min(...selectedObjects.map(o => o.y));
            const maxCenterY = Math.max(...selectedObjects.map(o => o.y + o.height));
            const middle = (minCenterY + maxCenterY) / 2;
            updates = selectedObjects.map(o => ({ id: o.id, newProps: { y: middle - o.height / 2 } }));
            break;
    }
    updateObjects(selectedSlideId!, updates);
};

  const handleDragStart = (e: React.DragEvent<HTMLDivElement>, slideId: string) => { e.dataTransfer.effectAllowed = 'move'; setDraggedSlideId(slideId); };
  const handleDragOver = (e: React.DragEvent<HTMLDivElement>, index: number) => { e.preventDefault(); if(draggedSlideId) setDropTargetIndex(index); };
  const handleDragLeave = () => setDropTargetIndex(null);
  const handleDragEnd = () => { setDraggedSlideId(null); setDropTargetIndex(null); };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>, dropIndex: number) => {
    e.preventDefault();
    if (!draggedSlideId) return;
    const slides = [...presentation.slides];
    const draggedIndex = slides.findIndex(s => s.id === draggedSlideId);
    if (draggedIndex === -1) return;
    const [draggedSlide] = slides.splice(draggedIndex, 1);
    const finalDropIndex = draggedIndex < dropIndex ? dropIndex - 1 : dropIndex;
    slides.splice(finalDropIndex, 0, draggedSlide);
    onPresentationChange({ ...presentation, slides });
    handleDragEnd();
  };

  const renderObject = (obj: SlideObject) => {
    const isSelected = selectedObjectIds.includes(obj.id);
    const isEditing = editingObjectId === obj.id;
    let content, style: React.CSSProperties = {};

    if (obj.type === 'text') {
        const textContent = obj.content as TextContent;
        Object.assign(style, { fontWeight: textContent.bold ? 'bold' : 'normal', fontStyle: textContent.italic ? 'italic' : 'normal', textDecoration: textContent.underline ? 'underline' : 'none', fontSize: `${textContent.fontSize}px`, textAlign: textContent.textAlign, lineHeight: 1.4 });
        content = isEditing ? (
            <textarea value={textContent.text} onChange={e => updateSelectedObjects(() => ({ content: { ...textContent, text: e.target.value } }))} onBlur={() => { setEditingObjectId(null); if (textContent.text.startsWith('# ')) { updateSelectedObjects(() => ({ content: { ...textContent, text: textContent.text.substring(2), bold: true, fontSize: 32 } })); } }} autoFocus className="w-full h-full bg-transparent resize-none focus:outline-none p-2" style={style} />
        ) : ( <div className="p-2 w-full h-full whitespace-pre-wrap overflow-hidden" style={style}>{textContent.text}</div> );
    } else if (obj.type === 'chart') {
        content = <div className="w-full h-full bg-white"><ChartRenderer chartData={obj.content as ChartData}/></div>;
    } else if (obj.type === 'shape') {
        const shapeContent = obj.content as ShapeContent;
        style.backgroundColor = shapeContent.color;
        // FIX: Render border and opacity for shapes.
        style.border = `${shapeContent.borderWidth}px ${shapeContent.borderStyle} ${shapeContent.borderColor}`;
        style.opacity = shapeContent.opacity;
        if (shapeContent.shape === 'ellipse') style.borderRadius = '50%';
    } else if (obj.type === 'image') {
        content = <img src={(obj.content as ImageContent).src} className="w-full h-full object-cover" alt="slide content"/>;
    }

    const resizeHandles: ResizeHandle[] = ['top-left', 'top-right', 'bottom-left', 'bottom-right'];

    return (
        <div key={obj.id} onMouseDown={(e) => handleObjectMouseDown(e, obj)} onDoubleClick={() => obj.type === 'text' && setEditingObjectId(obj.id)} style={{ position: 'absolute', left: obj.x, top: obj.y, width: obj.width, height: obj.height, cursor: 'move', ...style, }} className={isSelected ? 'ring-2 ring-blue-500 z-10' : 'z-0'}>
            {content}
            {isSelected && selectedObjectIds.length === 1 && (
                <>
                    <button onClick={(e) => {e.stopPropagation(); deleteObjects([obj.id]);}} className="absolute -top-3 -right-3 bg-red-500 text-white rounded-full p-0.5 z-20 hover:bg-red-600"><TrashIcon className="w-4 h-4" /></button>
                    {resizeHandles.map(handle => (
                        <div key={handle} onMouseDown={(e) => handleResizeMouseDown(e, obj, handle)} className="absolute w-3 h-3 bg-white border border-blue-500 rounded-full z-20" style={{ top: handle.includes('top') ? -6 : undefined, bottom: handle.includes('bottom') ? -6 : undefined, left: handle.includes('left') ? -6 : undefined, right: handle.includes('right') ? -6 : undefined, cursor: `${handle.startsWith('top') ? 'n' : 's'}${handle.endsWith('left') ? 'w' : 'e'}-resize`, }} />
                    ))}
                </>
            )}
        </div>
    )
  }
  
  const showTextToolbar = selectedObjects.length > 0 && selectedObjects.every(o => o.type === 'text');
  const showShapeToolbar = selectedObjects.length > 0 && selectedObjects.every(o => o.type === 'shape');
  const showSingleObjectToolbar = selectedObjects.length === 1;
  const showMultiObjectToolbar = selectedObjects.length > 1;
  const showSlideToolbar = selectedObjects.length === 0;

  return (
    <div className="flex h-full bg-gray-200 dark:bg-gray-900 text-gray-900 dark:text-gray-100">
      <div className="w-48 bg-gray-100 dark:bg-gray-800 p-2 overflow-y-auto flex-shrink-0">
        {presentation.slides.map((slide, index) => (
          <div key={slide.id}>
             <div className={`h-1 w-full my-1 rounded-full transition-colors ${dropTargetIndex === index ? 'bg-blue-500' : ''}`} onDragOver={(e) => handleDragOver(e, index)} onDragLeave={handleDragLeave} onDrop={(e) => handleDrop(e, index)} />
            <div draggable onDragStart={(e) => handleDragStart(e, slide.id)} onDragEnd={handleDragEnd} onClick={() => { setSelectedSlideId(slide.id);}} className={`relative group cursor-pointer border-2 p-1 rounded ${selectedSlideId === slide.id ? 'border-blue-500 bg-blue-100 dark:bg-blue-900/50' : 'border-transparent'} ${draggedSlideId === slide.id ? 'opacity-30' : ''}`} >
             <div className="absolute top-1 right-1 hidden group-hover:block z-10">
                <button onClick={(e) => { e.stopPropagation(); handleDuplicateSlide(slide.id); }} className="p-1 bg-gray-700 text-white rounded-full hover:bg-gray-800" title="Duplicate Slide"><DuplicateIcon className="w-4 h-4" /></button>
              </div>
              <div className="aspect-video w-full text-xs flex items-center justify-center relative scale-95" style={{ backgroundColor: slide.background }}>
                <div className="absolute w-[800px] h-[450px] top-0 left-0 origin-top-left" style={{transform: 'scale(0.16)'}}>
                  {slide.objects.map(obj => {
                      let previewStyle: React.CSSProperties = { position: 'absolute', left: obj.x, top: obj.y, width: obj.width, height: obj.height, border: '1px solid #ccc' };
                      if (obj.type === 'shape') { const shapeContent = obj.content as ShapeContent; previewStyle.backgroundColor = shapeContent.color; if(shapeContent.shape === 'ellipse') previewStyle.borderRadius = '50%'; }
                      else if (obj.type === 'text') { const textContent = obj.content as TextContent; Object.assign(previewStyle, { fontSize: `${textContent.fontSize * 0.16}px`, fontWeight: textContent.bold ? 'bold' : 'normal', textAlign: textContent.textAlign }); }
                      else if (obj.type === 'image') { previewStyle.backgroundColor = '#d1d5db'; }
                      else { previewStyle.backgroundColor = '#e0e0e0'; }
                     return ( <div key={obj.id} style={previewStyle}>{obj.type === 'text' && <div className="text-xs overflow-hidden whitespace-nowrap p-1">{(obj.content as TextContent).text.split('\n')[0]}</div>}</div> );
                  })}
                </div>
              </div>
               <p className="text-center text-xs mt-1">Slide {index + 1}</p>
            </div>
          </div>
        ))}
         <div className={`h-1 w-full my-1 rounded-full transition-colors ${dropTargetIndex === presentation.slides.length ? 'bg-blue-500' : ''}`} onDragOver={(e) => handleDragOver(e, presentation.slides.length)} onDragLeave={handleDragLeave} onDrop={(e) => handleDrop(e, presentation.slides.length)} />
      </div>

      <div className="flex-1 flex flex-col" ref={editorRef}>
        <div className="bg-white dark:bg-gray-800 p-2 border-b border-gray-300 dark:border-gray-700 space-y-2">
            {/* --- TOP ROW: Primary Actions --- */}
            <div className="flex items-center space-x-2">
                <button onClick={onPresent} title="Present" className="p-2 bg-blue-500 text-white hover:bg-blue-600 rounded flex items-center gap-2"><PresentIcon className="w-5 h-5"/> Present</button>
                <div className="border-l border-gray-300 dark:border-gray-600 h-6 mx-1"></div>
                <button onClick={onUndo} disabled={!canUndo} title="Undo (Ctrl+Z)" className="p-2 hover:bg-gray-200 dark:hover:bg-gray-700 rounded disabled:opacity-50 disabled:cursor-not-allowed"><UndoIcon className="w-5 h-5"/></button>
                <button onClick={onRedo} disabled={!canRedo} title="Redo (Ctrl+Y)" className="p-2 hover:bg-gray-200 dark:hover:bg-gray-700 rounded disabled:opacity-50 disabled:cursor-not-allowed"><RedoIcon className="w-5 h-5"/></button>
                <div className="border-l border-gray-300 dark:border-gray-600 h-6 mx-1"></div>
                <button onClick={handleCopy} disabled={selectedObjects.length === 0} title="Copy (Ctrl+C)" className="p-2 hover:bg-gray-200 dark:hover:bg-gray-700 rounded disabled:opacity-50 disabled:cursor-not-allowed"><CopyIcon className="w-5 h-5"/></button>
                <button onClick={handlePaste} disabled={!clipboard} title="Paste (Ctrl+V)" className="p-2 hover:bg-gray-200 dark:hover:bg-gray-700 rounded disabled:opacity-50 disabled:cursor-not-allowed"><PasteIcon className="w-5 h-5"/></button>
                <div className="border-l border-gray-300 dark:border-gray-600 h-6 mx-1"></div>
                <button onClick={addSlide} title="Add Slide" className="p-2 hover:bg-gray-200 dark:hover:bg-gray-700 rounded"><AddSlideIcon className="w-5 h-5"/></button>
                <button onClick={addTextObject} title="Add Textbox" className="p-2 hover:bg-gray-200 dark:hover:bg-gray-700 rounded"><AddTextIcon className="w-5 h-5"/></button>
                <input type="file" ref={imageInputRef} onChange={handleImageUpload} accept="image/*" className="hidden" />
                <button onClick={() => imageInputRef.current?.click()} title="Add Image" className="p-2 hover:bg-gray-200 dark:hover:bg-gray-700 rounded"><AddImageIcon className="w-5 h-5"/></button>
                <button onClick={() => addShapeObject('rectangle')} title="Add Rectangle" className="p-2 hover:bg-gray-200 dark:hover:bg-gray-700 rounded"><RectangleIcon className="w-5 h-5"/></button>
                <button onClick={() => addShapeObject('ellipse')} title="Add Ellipse" className="p-2 hover:bg-gray-200 dark:hover:bg-gray-700 rounded"><EllipseIcon className="w-5 h-5"/></button>
                <div className="relative group"><button title="Add Chart" className="p-2 hover:bg-gray-200 dark:hover:bg-gray-700 rounded"><AddChartIcon className="w-5 h-5"/></button><div className="absolute left-0 mt-2 w-56 bg-white dark:bg-gray-700 rounded-md shadow-lg hidden group-hover:block z-20">{dashboardItems.length > 0 ? dashboardItems.map(item => (<a key={item.id} onClick={() => addChartObject(item.data)} className="block px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-600 cursor-pointer truncate">{item.title}</a>)) : <span className="block px-4 py-2 text-sm text-gray-500">No charts saved</span>}</div></div>
            </div>

            {/* --- SECOND ROW: Contextual Formatting --- */}
            <div className="flex items-center space-x-2 flex-wrap h-10">
                {showSlideToolbar && ( <> <div className="flex items-center space-x-2"><label htmlFor="slide-bg-color" className="text-sm">Slide Bg:</label><input type="color" id="slide-bg-color" value={selectedSlide?.background || '#FFFFFF'} onChange={(e) => updateSlideProperty({ background: e.target.value })} className="w-8 h-8 p-0 border-none bg-transparent cursor-pointer" title="Change slide background color" /></div><div className="border-l border-gray-300 dark:border-gray-600 h-6 mx-1"></div><select value={selectedSlide?.transition?.type || 'none'} onChange={e => updateSlideProperty({ transition: { type: e.target.value as SlideTransitionType }})} className="p-1 h-8 bg-gray-100 dark:bg-gray-700 rounded-md text-sm border border-gray-300 dark:border-gray-600 focus:outline-none" title="Slide Transition">{SLIDE_TRANSITIONS.map(trans => <option key={trans} value={trans}>{trans}</option>)}</select></>)}
                {showSingleObjectToolbar && ( <> <button onClick={() => changeObjectLayer('backward')} title="Send Backward" className="p-2 hover:bg-gray-200 dark:hover:bg-gray-700 rounded"><SendBackwardIcon className="w-5 h-5"/></button><button onClick={() => changeObjectLayer('forward')} title="Bring Forward" className="p-2 hover:bg-gray-200 dark:hover:bg-gray-700 rounded"><BringForwardIcon className="w-5 h-5"/></button><div className="border-l border-gray-300 dark:border-gray-600 h-6 mx-1"></div><select value={selectedObjects[0]?.animation?.type || 'none'} onChange={e => updateSelectedObjects(() => ({ animation: { type: e.target.value as ObjectAnimationType } }))} className="p-1 h-8 bg-gray-100 dark:bg-gray-700 rounded-md text-sm border border-gray-300 dark:border-gray-600 focus:outline-none" title="Object Animation">{OBJECT_ANIMATIONS.map(anim => <option key={anim} value={anim}>{anim}</option>)}</select></>)}
                {showMultiObjectToolbar && ( <> <div className="border-l border-gray-300 dark:border-gray-600 h-6 mx-1"></div><button onClick={() => handleAlign('left')} title="Align Left" className="p-2 hover:bg-gray-200 dark:hover:bg-gray-700 rounded"><AlignObjectsLeftIcon className="w-5 h-5"/></button><button onClick={() => handleAlign('center')} title="Align Center" className="p-2 hover:bg-gray-200 dark:hover:bg-gray-700 rounded"><AlignObjectsCenterIcon className="w-5 h-5"/></button><button onClick={() => handleAlign('right')} title="Align Right" className="p-2 hover:bg-gray-200 dark:hover:bg-gray-700 rounded"><AlignObjectsRightIcon className="w-5 h-5"/></button><div className="border-l border-gray-300 dark:border-gray-600 h-6 mx-1"></div><button onClick={() => handleAlign('top')} title="Align Top" className="p-2 hover:bg-gray-200 dark:hover:bg-gray-700 rounded"><AlignObjectsTopIcon className="w-5 h-5"/></button><button onClick={() => handleAlign('middle')} title="Align Middle" className="p-2 hover:bg-gray-200 dark:hover:bg-gray-700 rounded"><AlignObjectsMiddleIcon className="w-5 h-5"/></button><button onClick={() => handleAlign('bottom')} title="Align Bottom" className="p-2 hover:bg-gray-200 dark:hover:bg-gray-700 rounded"><AlignObjectsBottomIcon className="w-5 h-5"/></button></>)}
                {showShapeToolbar && ( <> <div className="border-l border-gray-300 dark:border-gray-600 h-6 mx-1"></div><input type="color" value={(selectedObjects[0].content as ShapeContent).color} onChange={(e) => updateSelectedObjects(obj => ({ content: { ...(obj.content as ShapeContent), color: e.target.value }}))} className="w-8 h-8 p-0 border-none bg-transparent cursor-pointer" title="Change shape color" /></>)}
                {showTextToolbar && ( <> <div className="border-l border-gray-300 dark:border-gray-600 h-6 mx-1"></div><select value={(selectedObjects[0].content as TextContent).fontSize} onChange={e => updateSelectedObjects(obj => ({ content: { ...(obj.content as TextContent), fontSize: parseInt(e.target.value) }}))} className="p-1 h-8 bg-gray-100 dark:bg-gray-700 rounded-md text-sm border border-gray-300 dark:border-gray-600 focus:outline-none">{FONT_SIZES.map(size => <option key={size} value={size}>{size}px</option>)}</select><button onClick={() => updateSelectedObjects(obj => ({ content: { ...(obj.content as TextContent), bold: !(obj.content as TextContent).bold }}))} title="Bold" className={`p-2 rounded ${(selectedObjects[0].content as TextContent).bold ? 'bg-blue-100 dark:bg-blue-900' : 'hover:bg-gray-200 dark:hover:bg-gray-700'}`}><BoldIcon className="w-5 h-5"/></button><button onClick={() => updateSelectedObjects(obj => ({ content: { ...(obj.content as TextContent), italic: !(obj.content as TextContent).italic }}))} title="Italic" className={`p-2 rounded ${(selectedObjects[0].content as TextContent).italic ? 'bg-blue-100 dark:bg-blue-900' : 'hover:bg-gray-200 dark:hover:bg-gray-700'}`}><ItalicIcon className="w-5 h-5"/></button><button onClick={() => updateSelectedObjects(obj => ({ content: { ...(obj.content as TextContent), underline: !(obj.content as TextContent).underline }}))} title="Underline" className={`p-2 rounded ${(selectedObjects[0].content as TextContent).underline ? 'bg-blue-100 dark:bg-blue-900' : 'hover:bg-gray-200 dark:hover:bg-gray-700'}`}><UnderlineIcon className="w-5 h-5"/></button><div className="border-l border-gray-300 dark:border-gray-600 h-6 mx-1"></div><button onClick={() => updateSelectedObjects(obj => ({ content: { ...(obj.content as TextContent), textAlign: 'left' }}))} title="Align Left" className={`p-2 rounded ${(selectedObjects[0].content as TextContent).textAlign === 'left' ? 'bg-blue-100 dark:bg-blue-900' : 'hover:bg-gray-200 dark:hover:bg-gray-700'}`}><AlignLeftIcon className="w-5 h-5"/></button><button onClick={() => updateSelectedObjects(obj => ({ content: { ...(obj.content as TextContent), textAlign: 'center' }}))} title="Align Center" className={`p-2 rounded ${(selectedObjects[0].content as TextContent).textAlign === 'center' ? 'bg-blue-100 dark:bg-blue-900' : 'hover:bg-gray-200 dark:hover:bg-gray-700'}`}><AlignCenterIcon className="w-5 h-5"/></button><button onClick={() => updateSelectedObjects(obj => ({ content: { ...(obj.content as TextContent), textAlign: 'right' }}))} title="Align Right" className={`p-2 rounded ${(selectedObjects[0].content as TextContent).textAlign === 'right' ? 'bg-blue-100 dark:bg-blue-900' : 'hover:bg-gray-200 dark:hover:bg-gray-700'}`}><AlignRightIcon className="w-5 h-5"/></button></>)}
            </div>
        </div>

        <div className="flex-1 p-8 overflow-auto bg-gray-200 dark:bg-gray-900" onMouseUp={handleMouseUp} onMouseMove={handleMouseMove}>
          <div 
            className="w-[800px] h-[450px] shadow-lg mx-auto relative" 
            style={{ backgroundColor: selectedSlide?.background || '#FFFFFF' }}
            onMouseDown={() => {setSelectedObjectIds([]); setEditingObjectId(null);}}
          >
            {selectedSlide?.objects.map(obj => renderObject(obj))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default PresentationEditor;