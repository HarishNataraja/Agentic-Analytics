

import React, { useState } from 'react';
// Fix: Import Agent enum to resolve 'Cannot find name 'Agent''.
import { Presentation, DashboardItem, Message, Agent, Slide, SlideObject, TextContent, ImageContent, ShapeContent, ObjectAnimationPreset, AnimationTrigger, ImageFilters, ObjectAnimation, SlideTransitionPreset, ShapeType } from '../../types';
// Fix: Use a named import for PresentationEditor to resolve the module resolution error.
import { PresentationEditor } from './PresentationEditor';
import ChatWindow from './ChatWindow';
import MessageInput from '../MessageInput';
import { BoldIcon, ItalicIcon, UnderlineIcon, AlignLeftIcon, AlignCenterIcon, AlignRightIcon } from '../icons';
import { OBJECT_ANIMATION_PRESETS, SLIDE_TRANSITION_PRESETS } from './animationPresets';


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
}

const FONT_FAMILIES = ['Arial', 'Verdana', 'Times New Roman', 'Courier New', 'Georgia', 'Poppins', 'Roboto'];
const FONT_SIZES = [12, 14, 18, 24, 32, 48, 64, 72, 96];

const PresentationWorkspace: React.FC<PresentationWorkspaceProps> = (props) => {
  const { presentation, onPresentationChange, selectedSlideId, selectedObjectIds } = props;
  const [activeAnimationTab, setActiveAnimationTab] = useState<'enter' | 'exit'>('enter');

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
  
  const renderAnimationProperties = (
    animation: ObjectAnimation | null,
    animationType: 'enter' | 'exit'
  ) => {
    const isEnter = animationType === 'enter';
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
                        <input type="color" value={selectedSlide.background} onChange={e => updateSlide(selectedSlideId!, {background: e.target.value}, true)} className="w-full h-8 p-1 border-none rounded bg-transparent" />
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
        return (
             <PropSection title="Multiple Objects">
                <p className="text-xs text-gray-500">{selectedObjectIds.length} objects selected.</p>
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
                    <PropInput label="X"><input type="number" value={Math.round(obj.x)} onChange={e => updateSelectedObjects({x: parseInt(e.target.value)})} className="w-16 p-1 rounded bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 text-xs" /></PropInput>
                    <PropInput label="Y"><input type="number" value={Math.round(obj.y)} onChange={e => updateSelectedObjects({y: parseInt(e.target.value)})} className="w-16 p-1 rounded bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 text-xs" /></PropInput>
                    <PropInput label="W"><input type="number" value={Math.round(obj.width)} onChange={e => updateSelectedObjects({width: parseInt(e.target.value)})} className="w-16 p-1 rounded bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 text-xs" /></PropInput>
                    <PropInput label="H"><input type="number" value={Math.round(obj.height)} onChange={e => updateSelectedObjects({height: parseInt(e.target.value)})} className="w-16 p-1 rounded bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 text-xs" /></PropInput>
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
                        <input type="color" value={textContent.color} onChange={e => updateObjectContent({ color: e.target.value }, true)} className="w-full h-8 p-1 border rounded bg-transparent"/>
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
                    <PropInput label="Fill"><input type="color" value={shapeContent.fillColor} onChange={e => updateObjectContent({ fillColor: e.target.value }, true)} className="w-full h-8 p-1 border-none rounded bg-transparent" /></PropInput>
                    <PropInput label="Border"><input type="color" value={shapeContent.borderColor} onChange={e => updateObjectContent({ borderColor: e.target.value }, true)} className="w-full h-8 p-1 border-none rounded bg-transparent" /></PropInput>
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

  return (
    <div className="flex-1 flex overflow-hidden">
      <div className="flex-1 flex flex-col">
        <PresentationEditor
          initialPresentation={props.presentation}
          dashboardItems={props.dashboardItems}
          onPresentationChange={props.onPresentationChange}
          onUndo={props.onUndo}
          onRedo={props.onRedo}
          canUndo={props.canUndo}
          canRedo={props.canRedo}
          onPresent={props.onPresent}
          selectedSlideId={props.selectedSlideId}
          onSelectSlide={props.onSelectSlide}
          selectedObjectIds={props.selectedObjectIds}
          onSelectObjects={props.onSelectObjects}
        />
      </div>
      <aside className="w-80 border-l border-gray-200 dark:border-gray-700 flex flex-col bg-gray-50 dark:bg-gray-800/50">
        <div className="flex-shrink-0 p-3 overflow-y-auto border-b border-gray-200 dark:border-gray-700">
          {renderPropertiesPanel()}
        </div>
        <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex-shrink-0">
            <h2 className="font-semibold text-lg">Presentation Assistant</h2>
            <p className="text-sm text-gray-500">Ask the AI to make changes.</p>
        </div>
        <div className="flex-1 flex flex-col min-h-0">
          <ChatWindow messages={props.messages} />
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
        </div>
      </aside>
    </div>
  );
};

export default PresentationWorkspace;