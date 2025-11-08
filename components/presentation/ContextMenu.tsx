import React, { useEffect, useRef } from 'react';
import { ContextMenuItem } from '../../types';

interface ContextMenuProps {
  x: number;
  y: number;
  items: ContextMenuItem[];
  onClose: () => void;
}

const ContextMenu: React.FC<ContextMenuProps> = ({ x, y, items, onClose }) => {
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        onClose();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [onClose]);

  return (
    <div
      ref={menuRef}
      className="absolute z-50 w-56 py-1 bg-white dark:bg-gray-800 rounded-md shadow-lg border border-gray-200 dark:border-gray-700"
      style={{ top: y, left: x }}
    >
      {items.map((item, index) => {
        if (item.isSeparator) {
          return <div key={`sep-${index}`} className="h-px my-1 bg-gray-200 dark:bg-gray-700" />;
        }
        
        const Icon = item.icon;
        return (
          <button
            key={item.label}
            onClick={() => {
              item.action();
              onClose();
            }}
            disabled={item.disabled}
            className="w-full flex items-center px-3 py-1.5 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed text-left"
          >
            {Icon && <Icon className="w-4 h-4 mr-3" />}
            <span className="flex-grow">{item.label}</span>
            {item.shortcut && <span className="text-xs text-gray-400">{item.shortcut}</span>}
          </button>
        );
      })}
    </div>
  );
};

export default ContextMenu;