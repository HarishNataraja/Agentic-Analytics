import React, { useState, useRef, useEffect, KeyboardEvent as ReactKeyboardEvent, MouseEvent as ReactMouseEvent, useCallback } from 'react';
import { Presentation, Slide, SlideObject, DashboardItem, ChartData, TextContent, ImageContent, SlideTransition, ObjectAnimation, ShapeContent, ShapeType, AspectRatio, VideoContent, Shadow, Gradient, ImageFilters, ObjectAnimationPreset, SlideTransitionPreset, AnimationTrigger } from '../../types';
import { AddSlideIcon, AddTextIcon, AddChartIcon, AddImageIcon, TrashIcon, BringForwardIcon, SendBackwardIcon, BoldIcon, ItalicIcon, UnderlineIcon, AlignLeftIcon, AlignCenterIcon, AlignRightIcon, UndoIcon, RedoIcon, CopyIcon, PasteIcon, DuplicateIcon, PresentIcon, AlignObjectsLeftIcon, AlignObjectsCenterIcon, AlignObjectsRightIcon, AlignObjectsTopIcon, AlignObjectsMiddleIcon, AlignObjectsBottomIcon, ShapesIcon, VideoIcon, PlayIcon } from '../icons';
import ChartRenderer from '../charts/ChartRenderer';
import { shapeCategories, ShapeIcon, ShapeRenderer } from './shapes';
import { readFileAsDataURL } from '../../utils/fileUtils';
import { OBJECT_ANIMATION_PRESETS, SLIDE_TRANSITION_PRESETS } from './animationPresets';


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

const FONT_FAMILIES = ['Arial', 'Verdana', 'Times New Roman', 'Courier New', 'Georgia', 'Poppins', 'Roboto'];
const FONT_SIZES = [12, 14, 18, 24, 32, 48, 64, 72, 96];

const PresentationEditor: React.FC<PresentationEditorProps> = ({
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
  const [activeAnimationTab, setActiveAnimationTab] = useState<'enter' | 'exit'>('enter');

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
  const shapesButtonRef = useRef<HTMLDivElement>(null);
  
  const selectedSlide = presentation.slides.find(s => s.id === selectedSlideId);
  const selectedObjects = (selectedSlide?.objects || []).filter(o => selectedObjectIds.includes(o.id));
  
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
  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files && e.target.files[0]) {
          const file = e.target.files[0];
          const dataUrl = await readFileAsDataURL(file);
          addImageObject(dataUrl, file.name);
          e.target.value = ''; // Reset input
      }
  };

  const deleteObjects = (objectIds: string[]) => {
    if (!selectedSlideId || objectIds.length === 0) return;
    const newObjects = selectedSlide!.objects.filter(obj => !objectIds.includes(obj.id));
    updateSlide(selectedSlideId, { objects: newObjects });
    onSelectObjects([]);
  };

  const changeLayer = (direction: 1 | -1) => { // 1 for forward, -1 for backward
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
  };
  
  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (interactionRef.current.mode === 'idle' || !editorRef.current || !selectedSlideId) return;
    e.preventDefault();

    const { mode, startX, startY, objectsStart, handle } = interactionRef.current;
    const editorBounds = editorRef.current.getBoundingClientRect();
    const scale = 0.6; // This should ideally not be hardcoded
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
  }, [selectedSlideId, onPresentationChange, presentation]);

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
    const scale = 0.6;
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
  
  const PropInput: React.FC<{label: string, children: React.ReactNode}> = ({label, children}) => (
      <div className="flex items-center justify-between">
          <label className="text-xs text-gray-600 dark:text-gray-400">{label}</label>
          {children}
      </div>
  );
  
  const PropSection: React.FC<{title: string, children: React.ReactNode}> = ({title, children}) => (
    <div className="border-b border-gray-200 dark:border-gray-700 pb-3 mb-3">
        <h3 className="font-semibold text-sm mb-2">{title}</h3>
        <div className="space-y-2">{children}</div>
    </div>
  );

  const renderAnimationProperties = (
    animation: ObjectAnimation | null,
    animationType: 'enter' | 'exit'
  ) => {
    const isEnter = animationType === 'enter';
    const animationKey = isEnter ? 'animation' : 'exitAnimation';
    const presets = OBJECT_ANIMATION_PRESETS.filter(p => 
        isEnter ? !p.id.includes('out') : p.id.includes('out') || p.id === 'none' || p.id === 'fade-in' // fade-in can be fade-out
    );

    const handleAnimationChange = (props: Partial<ObjectAnimation>) => {
        if (isEnter) {
            updateSelectedObjects(obj => ({
                animation: { ...obj.animation, ...props }
            }), true);
        } else {
             updateSelectedObjects(obj => ({
                exitAnimation: obj.exitAnimation ? { ...obj.exitAnimation, ...props } : {
                    preset: 'fade-out', trigger: 'on-load', duration: 500, delay: 0, loop: false, ...props
                }
            }), true);
        }
    };
    
    if (!isEnter && !animation) {
        return <button onClick={() => handleAnimationChange({ preset: 'fade-out' })} className="text-xs text-blue-500 hover:underline">Add Exit Animation</button>
    }
    if (!animation) return null;

    return (
        <div className="space-y-2">
            <PropInput label="Preset">
                <select value={animation.preset} onChange={e => handleAnimationChange({ preset: e.target.value as ObjectAnimationPreset })} className="w-full p-1 rounded bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 text-xs">
                    {presets.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
            </PropInput>
            <PropInput label="Start">
                 <select value={animation.trigger} onChange={e => handleAnimationChange({ trigger: e.target.value as AnimationTrigger })} className="w-full p-1 rounded bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 text-xs">
                    <option value="on-load">On Load</option>
                    <option value="on-click">On Click</option>
                </select>
            </PropInput>
            <div className="grid grid-cols-2 gap-2">
                <PropInput label="Duration">
                    <input type="number" step="100" value={animation.duration} onChange={e => handleAnimationChange({ duration: parseInt(e.target.value) })} className="w-full p-1 rounded bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 text-xs" />
                </PropInput>
                <PropInput label="Delay">
                    <input type="number" step="100" value={animation.delay} onChange={e => handleAnimationChange({ delay: parseInt(e.target.value) })} className="w-full p-1 rounded bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 text-xs" />
                </PropInput>
            </div>
             <div className="flex items-center justify-between">
                <label className="text-xs text-gray-600 dark:text-gray-400">Repeat</label>
                <input type="checkbox" checked={animation.loop} onChange={e => handleAnimationChange({ loop: e.target.checked })} />
            </div>
             {!isEnter && (
                 <button onClick={() => updateSelectedObjects({ exitAnimation: null }, true)} className="text-xs text-red-500 hover:underline mt-2">Remove Exit</button>
             )}
        </div>
    )
  }

  const renderPropertiesPanel = () => {
    if (selectedObjectIds.length === 0 && selectedSlide) {
        return (
            <>
                <PropSection title="Slide Properties">
                    <PropInput label="Background">
                        <input type="color" value={selectedSlide.background} onChange={e => updateSlide(selectedSlideId!, {background: e.target.value}, true)} className="w-20 h-6 p-0 border-none rounded bg-transparent" />
                    </PropInput>
                </PropSection>
                <PropSection title="Transition">
                    <PropInput label="Effect">
                        <select value={selectedSlide.transition.preset} onChange={e => updateSlide(selectedSlideId!, { transition: { ...selectedSlide.transition, preset: e.target.value as SlideTransitionPreset } }, true)} className="w-full p-1 rounded bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 text-xs">
                            {SLIDE_TRANSITION_PRESETS.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                        </select>
                    </PropInput>
                    <PropInput label="Duration (ms)">
                         <input type="number" step="100" value={selectedSlide.transition.duration} onChange={e => updateSlide(selectedSlideId!, { transition: { ...selectedSlide.transition, duration: parseInt(e.target.value) } }, true)} className="w-20 p-1 rounded bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 text-xs" />
                    </PropInput>
                </PropSection>
            </>
        );
    }
    
    if (selectedObjectIds.length > 1) {
        // Multi-select panel
        return (
             <PropSection title="Multiple Objects">
                <p className="text-xs text-gray-500">{selectedObjectIds.length} objects selected.</p>
                {/* Add alignment buttons here later */}
            </PropSection>
        );
    }

    const obj = selectedObjects[0];
    if (!obj) return null;

    const textContent = obj.type === 'text' ? obj.content as TextContent : null;
    const imageContent = obj.type === 'image' ? obj.content as ImageContent : null;
    const shapeContent = obj.type === 'shape' ? obj.content as ShapeContent : null;

    return (
        <div className="text-sm">
            <PropSection title="Transform">
                <div className="grid grid-cols-2 gap-2">
                    <PropInput label="X"><input type="number" value={obj.x} onChange={e => updateSelectedObjects({x: parseInt(e.target.value)})} className="w-16 p-1 rounded bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 text-xs" /></PropInput>
                    <PropInput label="Y"><input type="number" value={obj.y} onChange={e => updateSelectedObjects({y: parseInt(e.target.value)})} className="w-16 p-1 rounded bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 text-xs" /></PropInput>
                    <PropInput label="W"><input type="number" value={obj.width} onChange={e => updateSelectedObjects({width: parseInt(e.target.value)})} className="w-16 p-1 rounded bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 text-xs" /></PropInput>
                    <PropInput label="H"><input type="number" value={obj.height} onChange={e => updateSelectedObjects({height: parseInt(e.target.value)})} className="w-16 p-1 rounded bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 text-xs" /></PropInput>
                </div>
                 <PropInput label="Rotation"><input type="number" value={obj.rotation} onChange={e => updateSelectedObjects({rotation: parseInt(e.target.value)})} className="w-16 p-1 rounded bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 text-xs" /></PropInput>
            </PropSection>

            {textContent && (
                <PropSection title="Text">
                    <select value={textContent.fontFamily} onChange={e => updateObjectContent({ fontFamily: e.target.value }, true)} className="w-full p-1 rounded bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 text-xs">
                        {FONT_FAMILIES.map(f => <option key={f} value={f}>{f}</option>)}
                    </select>
                    <div className="flex items-center gap-2">
                        <select value={textContent.fontSize} onChange={e => updateObjectContent({ fontSize: parseInt(e.target.value) }, true)} className="w-20 p-1 rounded bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 text-xs">
                            {FONT_SIZES.map(s => <option key={s} value={s}>{s}</option>)}
                        </select>
                        <input type="color" value={textContent.color} onChange={e => updateObjectContent({ color: e.target.value }, true)} className="w-10 h-6 p-0 border-none rounded bg-transparent"/>
                    </div>
                     <div className="flex items-center gap-1">
                        <button onClick={() => updateObjectContent({ fontWeight: textContent.fontWeight === 'bold' ? 'normal' : 'bold'}, true)} className={`p-1 rounded ${textContent.fontWeight === 'bold' ? 'bg-blue-200 dark:bg-blue-800' : ''}`}><BoldIcon className="w-4 h-4"/></button>
                        <button onClick={() => updateObjectContent({ fontStyle: textContent.fontStyle === 'italic' ? 'normal' : 'italic'}, true)} className={`p-1 rounded ${textContent.fontStyle === 'italic' ? 'bg-blue-200 dark:bg-blue-800' : ''}`}><ItalicIcon className="w-4 h-4"/></button>
                        <button onClick={() => updateObjectContent({ textDecoration: textContent.textDecoration === 'underline' ? 'none' : 'underline'}, true)} className={`p-1 rounded ${textContent.textDecoration === 'underline' ? 'bg-blue-200 dark:bg-blue-800' : ''}`}><UnderlineIcon className="w-4 h-4"/></button>
                     </div>
                      <div className="flex items-center gap-1">
                        <button onClick={() => updateObjectContent({ textAlign: 'left'}, true)} className={`p-1 rounded ${textContent.textAlign === 'left' ? 'bg-blue-200 dark:bg-blue-800' : ''}`}><AlignLeftIcon className="w-4 h-4"/></button>
                        <button onClick={() => updateObjectContent({ textAlign: 'center'}, true)} className={`p-1 rounded ${textContent.textAlign === 'center' ? 'bg-blue-200 dark:bg-blue-800' : ''}`}><AlignCenterIcon className="w-4 h-4"/></button>
                        <button onClick={() => updateObjectContent({ textAlign: 'right'}, true)} className={`p-1 rounded ${textContent.textAlign === 'right' ? 'bg-blue-200 dark:bg-blue-800' : ''}`}><AlignRightIcon className="w-4 h-4"/></button>
                     </div>
                </PropSection>
            )}
            
            {shapeContent && (
                 <PropSection title="Shape Style">
                    <PropInput label="Fill"><input type="color" value={shapeContent.fillColor} onChange={e => updateObjectContent({ fillColor: e.target.value }, true)} className="w-20 h-6 p-0 border-none rounded bg-transparent" /></PropInput>
                    <PropInput label="Border"><input type="color" value={shapeContent.borderColor} onChange={e => updateObjectContent({ borderColor: e.target.value }, true)} className="w-20 h-6 p-0 border-none rounded bg-transparent" /></PropInput>
                    <PropInput label="Border Width"><input type="number" min="0" value={shapeContent.borderWidth} onChange={e => updateObjectContent({ borderWidth: parseInt(e.target.value) }, true)} className="w-16 p-1 rounded bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 text-xs" /></PropInput>
                </PropSection>
            )}

            {imageContent && (
                 <PropSection title="Image Style">
                    <PropInput label="Fit">
                        <select value={imageContent.objectFit} onChange={e => updateObjectContent({ objectFit: e.target.value as 'cover' | 'contain' }, true)} className="w-24 p-1 rounded bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 text-xs">
                           <option value="cover">Cover</option>
                           <option value="contain">Contain</option>
                        </select>
                    </PropInput>
                    <PropInput label="Corners"><input type="number" min="0" value={imageContent.borderRadius} onChange={e => updateObjectContent({ borderRadius: parseInt(e.target.value) }, true)} className="w-16 p-1 rounded bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 text-xs" /></PropInput>
                    <h4 className="font-medium text-xs mt-2">Filters</h4>
                    {Object.keys(imageContent.filters).map(key => (
                         <PropInput key={key} label={key.charAt(0).toUpperCase() + key.slice(1)}>
                            <input type="range" min="0" max={key === 'blur' ? 20 : 200} defaultValue={100} value={imageContent.filters[key as keyof ImageFilters]} onChange={e => updateObjectContent({ filters: { ...imageContent.filters, [key]: parseInt(e.target.value)} })} className="w-24" />
                         </PropInput>
                    ))}
                </PropSection>
            )}

            <PropSection title="Appearance">
                <PropInput label="Opacity">
                    <input type="range" min="0" max="100" value={obj.opacity * 100} onChange={e => updateSelectedObjects({ opacity: parseInt(e.target.value) / 100 })} className="w-24" />
                </PropInput>
            </PropSection>

            <PropSection title="Animation">
                <div className="flex border-b border-gray-200 dark:border-gray-700 mb-2">
                    <button onClick={() => setActiveAnimationTab('enter')} className={`px-3 py-1 text-xs font-medium ${activeAnimationTab === 'enter' ? 'border-b-2 border-blue-500 text-blue-600 dark:text-blue-400' : 'text-gray-500'}`}>Enter</button>
                    <button onClick={() => setActiveAnimationTab('exit')} className={`px-3 py-1 text-xs font-medium ${activeAnimationTab === 'exit' ? 'border-b-2 border-blue-500 text-blue-600 dark:text-blue-400' : 'text-gray-500'}`}>Exit</button>
                </div>
                {activeAnimationTab === 'enter' && renderAnimationProperties(obj.animation, 'enter')}
                {activeAnimationTab === 'exit' && renderAnimationProperties(obj.exitAnimation, 'exit')}
            </PropSection>
        </div>
    );
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
         <ToolbarButton onClick={onUndo} disabled={!canUndo} title="Undo"><UndoIcon className="w-5 h-5" /></ToolbarButton>
         <ToolbarButton onClick={onRedo} disabled={!canRedo} title="Redo"><RedoIcon className="w-5 h-5" /></ToolbarButton>
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
         <ToolbarButton onClick={() => imageInputRef.current?.click()} title="Add Image"><AddImageIcon className="w-5 h-5" /></ToolbarButton>
         <input type="file" ref={imageInputRef} onChange={handleImageUpload} accept="image/*" className="hidden" />
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
        <div className="flex-1 flex items-center justify-center p-4" onMouseDown={() => onSelectObjects([])}>
          <div ref={editorRef} className="w-[1280px] h-[720px] bg-white shadow-lg relative" style={{ transform: 'scale(0.6)', transformOrigin: 'center center' }}>
              <div className="absolute inset-0" style={{ backgroundColor: selectedSlide.background }}></div>
                {selectedSlide.objects.map(obj => (
                    <div key={obj.id} 
                         onMouseDown={(e) => handleObjectMouseDown(e, obj)}
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
        </div>

        {/* Properties Panel */}
        <div className="w-64 bg-gray-50 dark:bg-gray-800/50 p-3 overflow-y-auto border-l border-gray-200 dark:border-gray-700">
            {renderPropertiesPanel()}
        </div>

       </div>
    </div>
  );
};

export default PresentationEditor;