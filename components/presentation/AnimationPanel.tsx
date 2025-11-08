import React from 'react';
import { SlideObject, ObjectAnimation, ObjectAnimationPreset } from '../../types';
import { OBJECT_ANIMATION_PRESETS } from './animationPresets';
import { ChevronLeftIcon, AddSlideIcon, TrashIcon } from '../icons';

interface AnimationPanelProps {
  selectedObjects: SlideObject[];
  onUpdateObjects: (props: Partial<SlideObject> | ((obj: SlideObject) => Partial<SlideObject>), historyEntry?: boolean) => void;
  onClose: () => void;
}

const PropInput: React.FC<{label: string, children: React.ReactNode}> = ({label, children}) => (
    <div className="flex items-center justify-between text-xs">
        <label className="text-gray-600 dark:text-gray-400">{label}</label>
        {children}
    </div>
);

const AnimationEditor: React.FC<{
    title: string;
    animation: ObjectAnimation;
    presets: typeof OBJECT_ANIMATION_PRESETS;
    onChange: (props: Partial<ObjectAnimation>) => void;
}> = ({ title, animation, presets, onChange }) => {
    return (
        <div className="border-b border-gray-200 dark:border-gray-700 pb-3 mb-3">
            <h3 className="font-semibold text-sm mb-2">{title}</h3>
            <div className="space-y-2">
                <PropInput label="Preset">
                    <select
                        value={animation.preset}
                        onChange={e => onChange({ preset: e.target.value as ObjectAnimationPreset })}
                        className="w-32 p-1 rounded bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 text-xs"
                    >
                        {presets.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                    </select>
                </PropInput>
                <PropInput label="Trigger">
                    <select
                        value={animation.trigger}
                        onChange={e => onChange({ trigger: e.target.value as 'on-load' | 'on-click' })}
                        className="w-32 p-1 rounded bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 text-xs"
                    >
                        <option value="on-load">On Load</option>
                        <option value="on-click">On Click</option>
                    </select>
                </PropInput>
                <PropInput label="Duration (ms)">
                    <input
                        type="number"
                        step="100"
                        value={animation.duration}
                        onChange={e => onChange({ duration: parseInt(e.target.value, 10) || 0 })}
                        className="w-20 p-1 rounded bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 text-xs"
                    />
                </PropInput>
                <PropInput label="Delay (ms)">
                    <input
                        type="number"
                        step="100"
                        value={animation.delay}
                        onChange={e => onChange({ delay: parseInt(e.target.value, 10) || 0 })}
                        className="w-20 p-1 rounded bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 text-xs"
                    />
                </PropInput>
                <PropInput label="Loop">
                    <input
                        type="checkbox"
                        checked={animation.loop}
                        onChange={e => onChange({ loop: e.target.checked })}
                        className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600"
                    />
                </PropInput>
            </div>
        </div>
    );
};

const AnimationPanel: React.FC<AnimationPanelProps> = ({ selectedObjects, onUpdateObjects, onClose }) => {
  if (selectedObjects.length !== 1) {
    return (
      <div className="p-4">
        <button onClick={onClose} className="flex items-center gap-2 text-sm font-medium mb-4 text-gray-600 dark:text-gray-300 hover:text-blue-600">
            <ChevronLeftIcon className="w-5 h-5" /> Back to Properties
        </button>
        <p className="text-sm text-gray-500 text-center mt-8">Select a single object to edit its animations.</p>
      </div>
    );
  }

  const object = selectedObjects[0];
  const enterPresets = OBJECT_ANIMATION_PRESETS.filter(p => !p.id.includes('out'));
  const exitPresets = OBJECT_ANIMATION_PRESETS.filter(p => p.id.includes('out') || p.id === 'none');

  return (
    <div className="p-4 overflow-y-auto h-full">
        <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold">Animation</h2>
            <button onClick={onClose} className="text-sm font-medium text-gray-600 dark:text-gray-300 hover:text-blue-600">
                Done
            </button>
        </div>
        
        <AnimationEditor
            title="Enter Animation"
            animation={object.animation}
            presets={enterPresets}
            onChange={(props) => onUpdateObjects(obj => ({ animation: { ...obj.animation, ...props } }), true)}
        />

        {object.exitAnimation ? (
            <div>
                 <AnimationEditor
                    title="Exit Animation"
                    animation={object.exitAnimation}
                    presets={exitPresets}
                    onChange={(props) => onUpdateObjects(obj => ({ exitAnimation: { ...obj.exitAnimation!, ...props } }), true)}
                />
                <button 
                    onClick={() => onUpdateObjects({ exitAnimation: null }, true)}
                    className="w-full mt-2 text-xs flex items-center justify-center gap-2 px-3 py-1.5 text-red-600 bg-red-100 dark:bg-red-900/50 rounded-md hover:bg-red-200"
                >
                    <TrashIcon className="w-4 h-4" />
                    Remove Exit Animation
                </button>
            </div>
        ) : (
            <div>
                <h3 className="font-semibold text-sm mb-2">Exit Animation</h3>
                <button 
                    onClick={() => onUpdateObjects({ exitAnimation: { preset: 'fade-out', trigger: 'on-click', duration: 500, delay: 0, loop: false } }, true)}
                    className="w-full text-xs flex items-center justify-center gap-2 px-3 py-1.5 text-blue-600 bg-blue-100 dark:bg-blue-900/50 rounded-md hover:bg-blue-200"
                >
                    <AddSlideIcon className="w-4 h-4" />
                    Add Exit Animation
                </button>
            </div>
        )}
    </div>
  );
};

export default AnimationPanel;