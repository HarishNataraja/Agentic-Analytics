import React, { useState, useRef, useEffect } from 'react';
import { Presentation, DashboardItem, Message, Agent, Slide, SlideObject, ShapeType, AspectRatio } from '../../types';
import { PresentationEditor, SlideLayoutType, slideLayouts, PresentationEditorHandles } from './PresentationEditor';
import ChatWindow from './ChatWindow';
import MessageInput from '../MessageInput';
import { BoldIcon, ItalicIcon, UnderlineIcon, AlignLeftIcon, AlignCenterIcon, AlignRightIcon, AddSlideIcon, AddTextIcon, TrashIcon, BringForwardIcon, SendBackwardIcon, UndoIcon, RedoIcon, PresentIcon, ShapesIcon, AddImageIcon, InfographicIcon, SlideSizeIcon, AnimateMotionIcon } from '../icons';
import { OBJECT_ANIMATION_PRESETS, SLIDE_TRANSITION_PRESETS } from './animationPresets';
import { shapeCategories, ShapeIcon } from './shapes';
import CustomSizeModal from './CustomSizeModal';
import AnimationPanel from './AnimationPanel';

interface PresentationWorkspaceProps {
  presentation: Presentation;
  dashboardItems: DashboardItem[];
  onPresentationChange: (presentation: Presentation, newHistoryEntry?: boolean) => void;
  onUndo: () => void;
  onRedo: () => void;
  canUndo: boolean;
  canRedo: boolean;
  onPresent: () => void;
  messages: Message[];
  onSendMessage: (prompt: string) => void;
  selectedSlideId: string | null;
  onSelectSlide: (id: string) => void;
  selectedObjectIds: string[];
  onSelectObjects: (ids: string[]) => void;
  aspectRatio: AspectRatio;
  onAspectRatioChange: (aspectRatio: AspectRatio) => void;
  customDimensions: { width: number; height: number };
  onCustomDimensionsChange: (dims: { width: number, height: number }) => void;
  slideWidth: number;
  slideHeight: number;
}

const FONT_FAMILIES = ['Arial', 'Verdana', 'Times New Roman', 'Courier New', 'Georgia', 'Poppins', 'Roboto'];
const FONT_SIZES = [12, 14, 18, 24, 32, 48, 64, 72, 96];

const PresentationWorkspace: React.FC<PresentationWorkspaceProps> = (props) => {
  const { presentation, onPresentationChange, selectedSlideId, selectedObjectIds } = props;

  const editorRef = useRef<PresentationEditorHandles>(null);
  const [isShapesMenuOpen, setIsShapesMenuOpen] = useState(false);
  const [isLayoutsMenuOpen, setIsLayoutsMenuOpen] = useState(false);
  const [isSlideSizeMenuOpen, setIsSlideSizeMenuOpen] = useState(false);
  const [isCustomSizeModalOpen, setIsCustomSizeModalOpen] = useState(false);
  const [isAnimationPanelOpen, setIsAnimationPanelOpen] = useState(false);
  const shapesButtonRef = useRef<HTMLDivElement>(null);
  const layoutsButtonRef = useRef<HTMLDivElement>(null);
  const slideSizeButtonRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (shapesButtonRef.current && !shapesButtonRef.current.contains(event.target as Node)) {
        setIsShapesMenuOpen(false);
      }
      if (layoutsButtonRef.current && !layoutsButtonRef.current.contains(event.target as Node)) {
        setIsLayoutsMenuOpen(false);
      }
      if (slideSizeButtonRef.current && !slideSizeButtonRef.current.contains(event.target as Node)) {
        setIsSlideSizeMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);


  const selectedSlide = presentation.slides.find(s => s.id === selectedSlideId);
  const selectedObjects = (selectedSlide?.objects || []).filter(o => selectedObjectIds.includes(o.id));
  
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

  const renderPropertiesPanel = () => {
    if (selectedObjectIds.length === 0 && selectedSlide) {
        return (
            <>
                <PropSection title="Slide Properties">
                    <PropInput label="Background">
                        <input type="color" value={selectedSlide.background} onChange={e => updateSlide(selectedSlideId!, {background: e.target.value}, true)} className="w-full h-8 p-1 border-none rounded bg-transparent" />
                    </PropInput>
                </PropSection>
                <PropSection title="Transition">
                    <PropInput label="Effect">
                        <select value={selectedSlide.transition.preset} onChange={e => updateSlide(selectedSlideId!, { transition: { ...selectedSlide.transition, preset: e.target.value as any } }, true)} className="w-full p-1 rounded bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 text-xs">
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
    
    // Incomplete, only showing a subset of properties for brevity in this example
    if (selectedObjects.length > 0) {
        const obj = selectedObjects[0];
        const textContent = obj.type === 'text' ? obj.content as any : null;

        return (
            <div className="text-sm">
                <PropSection title="Transform">
                  <div className="grid grid-cols-2 gap-2">
                      <PropInput label="X"><input type="number" value={Math.round(obj.x)} onChange={e => updateSelectedObjects({x: parseInt(e.target.value)})} className="w-16 p-1 rounded bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 text-xs" /></PropInput>
                      <PropInput label="Y"><input type="number" value={Math.round(obj.y)} onChange={e => updateSelectedObjects({y: parseInt(e.target.value)})} className="w-16 p-1 rounded bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 text-xs" /></PropInput>
                      <PropInput label="W"><input type="number" value={Math.round(obj.width)} onChange={e => updateSelectedObjects({width: parseInt(e.target.value)})} className="w-16 p-1 rounded bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 text-xs" /></PropInput>
                      <PropInput label="H"><input type="number" value={Math.round(obj.height)} onChange={e => updateSelectedObjects({height: parseInt(e.target.value)})} className="w-16 p-1 rounded bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 text-xs" /></PropInput>
                  </div>
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
                        <input type="color" value={textContent.color} onChange={e => updateObjectContent({ color: e.target.value }, true)} className="w-full h-8 p-1 border rounded bg-transparent"/>
                    </div>
                     <div className="flex items-center gap-1">
                        <button onClick={() => updateObjectContent({ fontWeight: textContent.fontWeight === 'bold' ? 'normal' : 'bold'}, true)} className={`p-1 rounded ${textContent.fontWeight === 'bold' ? 'bg-blue-200 dark:bg-blue-800' : ''}`}><BoldIcon className="w-4 h-4"/></button>
                        <button onClick={() => updateObjectContent({ fontStyle: textContent.fontStyle === 'italic' ? 'normal' : 'italic'}, true)} className={`p-1 rounded ${textContent.fontStyle === 'italic' ? 'bg-blue-200 dark:bg-blue-800' : ''}`}><ItalicIcon className="w-4 h-4"/></button>
                        <button onClick={() => updateObjectContent({ textDecoration: textContent.textDecoration === 'underline' ? 'none' : 'underline'}, true)} className={`p-1 rounded ${textContent.textDecoration === 'underline' ? 'bg-blue-200 dark:bg-blue-800' : ''}`}><UnderlineIcon className="w-4 h-4"/></button>
                     </div>
                  </PropSection>
                )}
            </div>
        );
    }

    return null;
  };

  const ToolbarButton: React.FC<{onClick?: () => void, disabled?: boolean, children: React.ReactNode, title?: string}> = ({onClick, disabled, children, title}) => (
      <button onClick={onClick} disabled={disabled} title={title} className="p-2 rounded-md hover:bg-gray-200 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed">
          {children}
      </button>
  );

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden bg-gray-200 dark:bg-gray-900">
       <div className="flex items-center space-x-1 p-1 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
         <ToolbarButton onClick={props.onUndo} disabled={!props.canUndo} title="Undo (Ctrl+Z)"><UndoIcon className="w-5 h-5" /></ToolbarButton>
         <ToolbarButton onClick={props.onRedo} disabled={!props.canRedo} title="Redo (Ctrl+Y)"><RedoIcon className="w-5 h-5" /></ToolbarButton>
         <div className="h-6 w-px bg-gray-300 dark:bg-gray-600 mx-1" />
         <div ref={slideSizeButtonRef} className="relative">
            <ToolbarButton onClick={() => setIsSlideSizeMenuOpen(p => !p)} title="Slide Size">
                <SlideSizeIcon className="w-5 h-5" />
            </ToolbarButton>
            {isSlideSizeMenuOpen && (
                <div className="absolute top-full mt-2 left-0 bg-white dark:bg-gray-800 border dark:border-gray-700 rounded-lg shadow-lg z-20 w-56 p-1">
                    <button 
                        onClick={() => { props.onAspectRatioChange('16:9'); setIsSlideSizeMenuOpen(false); }}
                        className="w-full text-left px-3 py-1.5 text-sm rounded hover:bg-gray-100 dark:hover:bg-gray-700 flex justify-between items-center"
                    >
                        <span>Widescreen (16:9)</span>
                        {props.aspectRatio === '16:9' && <span className="text-blue-500">✓</span>}
                    </button>
                    <button 
                        onClick={() => { props.onAspectRatioChange('4:3'); setIsSlideSizeMenuOpen(false); }}
                        className="w-full text-left px-3 py-1.5 text-sm rounded hover:bg-gray-100 dark:hover:bg-gray-700 flex justify-between items-center"
                    >
                        <span>Standard (4:3)</span>
                        {props.aspectRatio === '4:3' && <span className="text-blue-500">✓</span>}
                    </button>
                    <div className="h-px my-1 bg-gray-200 dark:bg-gray-700" />
                    <button 
                        onClick={() => { setIsCustomSizeModalOpen(true); setIsSlideSizeMenuOpen(false); }}
                        className="w-full text-left px-3 py-1.5 text-sm rounded hover:bg-gray-100 dark:hover:bg-gray-700 flex justify-between items-center"
                    >
                        <span>Custom Slide Size...</span>
                        {props.aspectRatio === 'custom' && <span className="text-blue-500">✓</span>}
                    </button>
                </div>
            )}
        </div>
         <div className="h-6 w-px bg-gray-300 dark:bg-gray-600 mx-1" />
         <ToolbarButton onClick={() => editorRef.current?.addSlide()} title="Add Slide"><AddSlideIcon className="w-5 h-5" /></ToolbarButton>
         <div ref={layoutsButtonRef} className="relative">
            <ToolbarButton onClick={() => setIsLayoutsMenuOpen(p => !p)} title="Change Layout">
                <InfographicIcon className="w-5 h-5" />
            </ToolbarButton>
            {isLayoutsMenuOpen && (
                <div className="absolute top-full mt-2 left-0 bg-white dark:bg-gray-800 border dark:border-gray-700 rounded-lg shadow-lg z-20 w-48 p-1">
                    {slideLayouts.map(layout => (
                        <button 
                            key={layout.type} 
                            onClick={() => { editorRef.current?.applyLayout(layout.type); setIsLayoutsMenuOpen(false); }}
                            className="w-full text-left px-3 py-1.5 text-sm rounded hover:bg-gray-100 dark:hover:bg-gray-700"
                        >
                            {layout.name}
                        </button>
                    ))}
                </div>
            )}
        </div>
         <div className="h-6 w-px bg-gray-300 dark:bg-gray-600 mx-1" />
         <ToolbarButton onClick={() => editorRef.current?.addTextObject()} title="Add Text"><AddTextIcon className="w-5 h-5" /></ToolbarButton>
         <div ref={shapesButtonRef} className="relative">
            <ToolbarButton onClick={() => setIsShapesMenuOpen(p => !p)} title="Add Shape"><ShapesIcon className="w-5 h-5" /></ToolbarButton>
            {isShapesMenuOpen && (
                <div className="absolute top-full mt-2 left-0 bg-white dark:bg-gray-800 border dark:border-gray-700 rounded-lg shadow-lg z-20 w-72 p-2">
                    {shapeCategories.map(category => (
                        <div key={category.name}>
                            <h4 className="text-xs font-bold uppercase text-gray-500 dark:text-gray-400 my-1 px-1">{category.name}</h4>
                            <div className="grid grid-cols-6 gap-1">
                                {category.shapes.map(shape => (
                                    <button key={shape} onClick={() => {editorRef.current?.addShapeObject(shape as ShapeType); setIsShapesMenuOpen(false);}} className="p-2 rounded hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center justify-center">
                                        <ShapeIcon shape={shape as ShapeType} />
                                    </button>
                                ))}
                            </div>
                        </div>
                    ))}
                </div>
            )}
         </div>
         <ToolbarButton onClick={() => editorRef.current?.handleImageUpload()} title="Add Image"><AddImageIcon className="w-5 h-5" /></ToolbarButton>
         <div className="h-6 w-px bg-gray-300 dark:bg-gray-600 mx-1" />
         <ToolbarButton onClick={() => setIsAnimationPanelOpen(true)} disabled={selectedObjectIds.length === 0} title="Animate Object">
            <AnimateMotionIcon className="w-5 h-5" />
         </ToolbarButton>
         <div className="h-6 w-px bg-gray-300 dark:bg-gray-600 mx-1" />
         <ToolbarButton onClick={() => editorRef.current?.deleteObjects(props.selectedObjectIds)} disabled={props.selectedObjectIds.length === 0} title="Delete"><TrashIcon className="w-5 h-5" /></ToolbarButton>
         <ToolbarButton onClick={() => editorRef.current?.changeLayer(1)} disabled={props.selectedObjectIds.length === 0} title="Bring Forward"><BringForwardIcon className="w-5 h-5" /></ToolbarButton>
         <ToolbarButton onClick={() => editorRef.current?.changeLayer(-1)} disabled={props.selectedObjectIds.length === 0} title="Send Backward"><SendBackwardIcon className="w-5 h-5" /></ToolbarButton>
         <div className="flex-grow" />
         <button onClick={props.onPresent} className="px-3 py-1.5 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 flex items-center gap-2">
            <PresentIcon className="w-5 h-5" />
            Present
        </button>
      </div>
      <div className="flex-1 flex overflow-hidden">
        <div className="flex-1 flex flex-col min-w-0">
          <PresentationEditor
            ref={editorRef}
            initialPresentation={props.presentation}
            onPresentationChange={props.onPresentationChange}
            onUndo={props.onUndo}
            onRedo={props.onRedo}
            selectedSlideId={props.selectedSlideId}
            onSelectSlide={props.onSelectSlide}
            selectedObjectIds={props.selectedObjectIds}
            onSelectObjects={props.onSelectObjects}
            slideWidth={props.slideWidth}
            slideHeight={props.slideHeight}
          />
        </div>
        <aside className="w-80 border-l border-gray-200 dark:border-gray-700 flex flex-col bg-gray-50 dark:bg-gray-800/50">
           {isAnimationPanelOpen ? (
                <AnimationPanel
                    selectedObjects={selectedObjects}
                    onUpdateObjects={updateSelectedObjects}
                    onClose={() => setIsAnimationPanelOpen(false)}
                />
            ) : (
                <>
                    <div className="flex-1 p-3 overflow-y-auto min-h-0">
                        {renderPropertiesPanel()}
                        <div className="border-t border-gray-200 dark:border-gray-700 pt-3 mt-3">
                            <h3 className="font-semibold text-sm mb-2">Presentation Assistant</h3>
                            <p className="text-xs text-gray-600 dark:text-gray-400 -mt-2 mb-2">Ask the AI to make changes.</p>
                            <ChatWindow messages={props.messages} />
                        </div>
                    </div>
                    <MessageInput
                        onSendMessage={(prompt) => props.onSendMessage(prompt)}
                        agent={Agent.PRESENTATION}
                        isThinking={false}
                        onThinkingChange={() => {}}
                        isVoiceRecording={false}
                        onMagicLayout={() => props.onSendMessage("Arrange this slide nicely for me.")}
                        aspectRatio="16:9"
                        onAspectRatioChange={() => {}}
                        />
                </>
            )}
        </aside>
      </div>
      <CustomSizeModal
        isOpen={isCustomSizeModalOpen}
        onClose={() => setIsCustomSizeModalOpen(false)}
        initialWidth={props.customDimensions.width}
        initialHeight={props.customDimensions.height}
        onSave={(width, height) => {
            props.onAspectRatioChange('custom');
            props.onCustomDimensionsChange({ width, height });
        }}
      />
    </div>
  );
};

export default PresentationWorkspace;