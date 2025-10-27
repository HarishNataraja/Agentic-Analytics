
import React from 'react';
import { ShapeType, ShapeContent } from '../../types';

export const SHAPE_PATHS: Record<ShapeType, string> = {
    // Basic Shapes
    'rectangle': 'M0,0 H100 V100 H0 Z',
    'rectangle-rounded-corners': 'M10,0 H90 A10,10 0 0 1 100,10 V90 A10,10 0 0 1 90,100 H10 A10,10 0 0 1 0,90 V10 A10,10 0 0 1 10,0 Z',
    'ellipse': 'M50,0 C77.6,0 100,22.4 100,50 C100,77.6 77.6,100 50,100 C22.4,100 0,77.6 0,50 C0,22.4 22.4,0 50,0 Z',
    'triangle': 'M50,0 L100,100 L0,100 Z',
    'right-triangle': 'M0,0 L0,100 L100,100 Z',
    'diamond': 'M50,0 L100,50 L50,100 L0,50 Z',
    'pentagon': 'M50,0 L100,38 L81,100 L19,100 L0,38 Z',
    'hexagon': 'M50,0 L100,25 L100,75 L50,100 L0,75 L0,25 Z',
    'octagon': 'M30,0 L70,0 L100,30 L100,70 L70,100 L30,100 L0,70 L0,30 Z',
    'cross': 'M30,0 H70 V30 H100 V70 H70 V100 H30 V70 H0 V30 H30 Z',
    'ring': 'M50,10 A40,40 0 1 1 49.9,10 Z M50,30 A20,20 0 1 0 50.1,30 Z',
    'heart': 'M50,30 C30,10 0,40 0,60 C0,80 20,100 50,100 C80,100 100,80 100,60 C100,40 70,10 50,30 Z',
    'smiley-face': 'M50,0 A50,50 0 1 1 49.9,0 Z M35,40 A5,5 0 1 0 35.1,40 Z M65,40 A5,5 0 1 0 65.1,40 Z M20,60 A30,30 0 0 0 80,60',
    'lightning-bolt': 'M40,0 L10,60 H45 L30,100 L90,40 H55 Z',
    // Block Arrows
    'right-arrow': 'M0,35 H70 V15 L100,50 L70,85 V65 H0 Z',
    'left-arrow': 'M100,35 H30 V15 L0,50 L30,85 V65 H100 Z',
    'up-arrow': 'M35,100 V30 H15 L50,0 L85,30 H65 V100 Z',
    'down-arrow': 'M35,0 V70 H15 L50,100 L85,70 H65 V0 Z',
    'left-right-arrow': 'M0,50 L30,20 V35 H70 V20 L100,50 L70,80 V65 H30 V80 Z',
    'chevron': 'M20,0 L100,50 L20,100 L0,80 L60,50 L0,20 Z',
    // Flowchart
    'flowchart-process': 'M0,0 H100 V100 H0 Z',
    'flowchart-decision': 'M50,0 L100,50 L50,100 L0,50 Z',
    'flowchart-data': 'M20,0 H100 L80,100 H0 Z',
    'flowchart-terminator': 'M25,0 H75 A25,50 0 0 1 75,100 H25 A25,50 0 0 1 25,0 Z',
    // Stars and Banners
    'star-5-point': 'M50,0 L61,35 L98,35 L68,57 L79,91 L50,70 L21,91 L32,57 L2,35 L39,35 Z',
    'star-8-point': 'M50,0 L60,25 L85,15 L75,40 L100,50 L75,60 L85,85 L60,75 L50,100 L40,75 L15,85 L25,60 L0,50 L25,40 L15,15 L40,25 Z',
    'banner-up': 'M0,20 L100,20 L100,80 L50,60 L0,80 Z',
    'scroll-horizontal': 'M0,20 C0,-20 100,-20 100,20 V80 C100,120 0,120 0,80 Z M5,20 H95 M5,80 H95',
    // Callouts
    'callout-rectangle': 'M0,0 H100 V75 H0 Z M20,75 L30,95 L40,75 Z',
    'callout-cloud': 'M50,0 C20,0 0,20 0,40 C0,60 10,65 20,70 L10,90 L30,70 C40,75 60,75 70,70 C90,70 100,60 100,40 C100,20 80,0 50,0 Z',
};

export const shapeCategories = [
    {
        name: 'Basic Shapes',
        shapes: ['rectangle', 'ellipse', 'triangle', 'right-triangle', 'diamond', 'pentagon', 'hexagon', 'octagon', 'cross', 'ring', 'heart', 'smiley-face', 'lightning-bolt'],
    },
    {
        name: 'Block Arrows',
        shapes: ['right-arrow', 'left-arrow', 'up-arrow', 'down-arrow', 'left-right-arrow', 'chevron'],
    },
    {
        name: 'Flowchart',
        shapes: ['flowchart-process', 'flowchart-decision', 'flowchart-data', 'flowchart-terminator'],
    },
    {
        name: 'Stars and Banners',
        shapes: ['star-5-point', 'star-8-point', 'banner-up', 'scroll-horizontal'],
    },
    {
        name: 'Callouts',
        shapes: ['callout-rectangle', 'callout-cloud'],
    }
];

export const ShapeIcon = ({ shape }: { shape: ShapeType }) => {
    const path = SHAPE_PATHS[shape] || SHAPE_PATHS['rectangle'];
    return (
        <svg viewBox="0 0 100 100" preserveAspectRatio="xMidYMid meet" className="w-6 h-6 text-gray-700 dark:text-gray-200">
            <path d={path} stroke="currentColor" fill="currentColor" fillOpacity="0.3" strokeWidth="5" vectorEffect="non-scaling-stroke" />
        </svg>
    );
}

export const ShapeRenderer: React.FC<Omit<ShapeContent, 'opacity'>> = ({ shape, fillColor, gradient, borderColor, borderWidth, borderStyle }) => {
    const path = SHAPE_PATHS[shape] || SHAPE_PATHS['rectangle'];
    const strokeDasharray = borderStyle === 'dashed' ? '8, 8' : borderStyle === 'dotted' ? '3, 5' : 'none';
    const gradientId = `grad-${shape}-${JSON.stringify(gradient)}`;
    
    let fill = fillColor;
    if(gradient) {
        fill = `url(#${gradientId})`;
    }

    return (
        <svg width="100%" height="100%" viewBox="0 0 100 100" preserveAspectRatio="none">
            {gradient && (
                <defs>
                    {gradient.type === 'linear' ? (
                        <linearGradient id={gradientId} gradientTransform={`rotate(${gradient.angle})`}>
                            <stop offset="0%" stopColor={gradient.startColor} />
                            <stop offset="100%" stopColor={gradient.endColor} />
                        </linearGradient>
                    ) : (
                         <radialGradient id={gradientId}>
                            <stop offset="0%" stopColor={gradient.startColor} />
                            <stop offset="100%" stopColor={gradient.endColor} />
                        </radialGradient>
                    )}
                </defs>
            )}
            <path 
                d={path} 
                fill={fill}
                stroke={borderColor} 
                strokeWidth={borderWidth} 
                strokeDasharray={strokeDasharray} 
                vectorEffect="non-scaling-stroke" 
            />
        </svg>
    );
};