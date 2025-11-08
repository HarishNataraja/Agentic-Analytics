import React, { useState } from 'react';

interface CustomSizeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (width: number, height: number) => void;
  initialWidth: number;
  initialHeight: number;
}

const CustomSizeModal: React.FC<CustomSizeModalProps> = ({ isOpen, onClose, onSave, initialWidth, initialHeight }) => {
  const [width, setWidth] = useState(initialWidth);
  const [height, setHeight] = useState(initialHeight);

  if (!isOpen) return null;

  const handleSave = () => {
    onSave(width, height);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-sm" onClick={e => e.stopPropagation()}>
        <div className="p-6 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-xl font-bold">Custom Slide Size</h2>
          <p className="text-sm text-gray-500">Enter dimensions in pixels.</p>
        </div>
        <div className="p-6 space-y-4">
          <div>
            <label htmlFor="width" className="block mb-1 text-sm font-medium text-gray-700 dark:text-gray-300">Width</label>
            <input
              type="number"
              id="width"
              value={width}
              onChange={(e) => setWidth(parseInt(e.target.value) || 0)}
              className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-md bg-gray-50 dark:bg-gray-700"
            />
          </div>
          <div>
            <label htmlFor="height" className="block mb-1 text-sm font-medium text-gray-700 dark:text-gray-300">Height</label>
            <input
              type="number"
              id="height"
              value={height}
              onChange={(e) => setHeight(parseInt(e.target.value) || 0)}
              className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-md bg-gray-50 dark:bg-gray-700"
            />
          </div>
        </div>
        <div className="p-4 bg-gray-50 dark:bg-gray-900/50 flex justify-end items-center space-x-2">
          <button type="button" onClick={onClose} className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 dark:bg-gray-600 dark:border-gray-500 dark:text-gray-200 rounded-md hover:bg-gray-100 dark:hover:bg-gray-500">
            Cancel
          </button>
          <button type="button" onClick={handleSave} className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700">
            Save
          </button>
        </div>
      </div>
    </div>
  );
};

export default CustomSizeModal;
