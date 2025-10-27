import React, { useState, useEffect } from 'react';
import { Presentation, SlideObject, ChartData, TextContent, ImageContent, Slide, ShapeContent, VideoContent, ObjectAnimation } from '../../types';
import ChartRenderer from '../charts/ChartRenderer';
import { ShapeRenderer } from './shapes';
import { OBJECT_ANIMATION_PRESETS } from './animationPresets';

const allKeyframes = OBJECT_ANIMATION_PRESETS.map(p => p.keyframes).join('\n');

const buildFilterString = (obj: SlideObject): string => {
    let filterString = '';
    if (obj.shadow) {
        filterString += `drop-shadow(${obj.shadow.x}px ${obj.shadow.y}px ${obj.shadow.blur}px ${obj.shadow.color}) `;
    }
    if (obj.type === 'image') {
        const c = obj.content as ImageContent;
        if (c.filters) {
            filterString += `brightness(${c.filters.brightness}%) contrast(${c.filters.contrast}%) saturate(${c.filters.saturate}%) grayscale(${c.filters.grayscale}%) sepia(${c.filters.sepia}%) blur(${c.filters.blur}px)`;
        }
    }
    return filterString.trim();
};

interface RenderObjectProps {
    obj: SlideObject;
    isExiting: boolean;
    onClickedObjectIds: Set<string>;
    onObjectClick: (obj: SlideObject) => void;
}

const RenderedObject: React.FC<RenderObjectProps> = ({ obj, isExiting, onClickedObjectIds, onObjectClick }) => {
    let content;
    
    if (obj.type === 'text') {
        const textContent = obj.content as TextContent;
        const style: React.CSSProperties = {
            fontFamily: textContent.fontFamily,
            fontSize: `${textContent.fontSize}px`,
            fontWeight: textContent.fontWeight,
            fontStyle: textContent.fontStyle,
            textDecoration: textContent.textDecoration,
            textAlign: textContent.textAlign,
            color: textContent.color,
            backgroundColor: textContent.backgroundColor,
            letterSpacing: `${textContent.letterSpacing}px`,
            lineHeight: textContent.lineHeight,
            paddingBottom: `${textContent.paragraphSpacing}px`,
            whiteSpace: textContent.overflow === 'ellipsis' ? 'nowrap' : 'pre-wrap',
            overflow: textContent.overflow === 'ellipsis' ? 'hidden' : 'visible',
            textOverflow: textContent.overflow === 'ellipsis' ? 'ellipsis' : 'clip',
            textTransform: textContent.textTransform === 'none' ? undefined : textContent.textTransform,
            WebkitTextStroke: textContent.strokeWidth > 0 ? `${textContent.strokeWidth}px ${textContent.strokeColor}` : undefined,
        };
        content = <div className="p-2 w-full h-full whitespace-pre-wrap overflow-hidden" style={style}>{textContent.text}</div>
    } else if (obj.type === 'chart') {
        content = <div className="w-full h-full bg-white"><ChartRenderer chartData={obj.content as ChartData}/></div>
    } else if (obj.type === 'shape') {
        const shapeContent = obj.content as ShapeContent;
        content = <ShapeRenderer {...shapeContent} />;
    } else if (obj.type === 'image') {
        const imageContent = obj.content as ImageContent;
        const style: React.CSSProperties = {
             borderRadius: `${imageContent.borderRadius}px`,
             border: `${imageContent.borderWidth}px solid ${imageContent.borderColor}`,
             objectFit: imageContent.objectFit,
        };
        content = <img src={imageContent.src} className="w-full h-full" style={style} alt={imageContent.altText || "slide content"}/>;
    } else if (obj.type === 'video') {
        const videoContent = obj.content as VideoContent;
        content = <video src={videoContent.src} className="w-full h-full object-cover" controls autoPlay loop muted />;
    }

    const animation = isExiting ? obj.exitAnimation : obj.animation;
    
    const shouldPlayAnimation = 
        animation &&
        animation.preset !== 'none' &&
        (isExiting || 
         (animation.trigger === 'on-load') || 
         (animation.trigger === 'on-click' && onClickedObjectIds.has(obj.id))
        );

    const animationStyle: React.CSSProperties = {};
    if (shouldPlayAnimation) {
        const presetName = animation.preset.replace(/-(\w)/g, (_, p1) => p1.toUpperCase());
        animationStyle.animationName = presetName;
        animationStyle.animationDuration = `${animation.duration}ms`;
        animationStyle.animationDelay = `${animation.delay}ms`;
        animationStyle.animationFillMode = 'both';
        animationStyle.animationTimingFunction = 'ease-out';
        if (animation.loop) {
            animationStyle.animationIterationCount = 'infinite';
        }
        if (animation.preset === 'flip-3d') {
            animationStyle.backfaceVisibility = 'hidden';
        }
    }
    
    const scaleX = obj.flipX ? -1 : 1;
    const scaleY = obj.flipY ? -1 : 1;

    const wrapperStyle: React.CSSProperties = {
        position: 'absolute',
        left: obj.x,
        top: obj.y,
        width: obj.width,
        height: obj.height,
        transform: `rotate(${obj.rotation || 0}deg) scaleX(${scaleX}) scaleY(${scaleY})`,
        opacity: obj.opacity ?? 1,
        filter: buildFilterString(obj) || 'none',
        ...animationStyle
    };

    return (
        <div 
          key={obj.id} 
          style={wrapperStyle}
          onClick={() => onObjectClick(obj)}
        >
            {content}
        </div>
    );
};

interface PresentationPlayerProps {
    presentation: Presentation;
    onExit: () => void;
}

const PresentationPlayer: React.FC<PresentationPlayerProps> = ({ presentation, onExit }) => {
  const [currentSlideIndex, setCurrentSlideIndex] = useState(0);
  const [previousSlideIndex, setPreviousSlideIndex] = useState(-1);
  const [isAnimating, setIsAnimating] = useState(false);
  const [onClickedObjectIds, setOnClickedObjectIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    setOnClickedObjectIds(new Set()); // Reset on-click animations when slide changes
  }, [currentSlideIndex]);
  
  const handleObjectClick = (obj: SlideObject) => {
      if(obj.animation.trigger === 'on-click') {
          setOnClickedObjectIds(prev => new Set(prev).add(obj.id));
      }
  };

  const getTransitionDuration = (slideIndex: number): number => {
    const slide = presentation.slides[slideIndex];
    if (!slide) return 500;

    const exitAnimations = slide.objects.map(o => o.exitAnimation).filter(Boolean) as ObjectAnimation[];
    const maxExitDuration = exitAnimations.length > 0 
        ? Math.max(...exitAnimations.map(a => a.delay + a.duration)) 
        : 0;
    
    return Math.max(slide.transition.duration, maxExitDuration);
  };

  const goToNextSlide = () => {
    if (currentSlideIndex < presentation.slides.length - 1 && !isAnimating) {
      const transitionDuration = getTransitionDuration(currentSlideIndex);
      setPreviousSlideIndex(currentSlideIndex);
      setCurrentSlideIndex(currentSlideIndex + 1);
      setIsAnimating(true);
      setTimeout(() => {
        setPreviousSlideIndex(-1);
        setIsAnimating(false);
      }, transitionDuration + 50);
    }
  };

  const goToPrevSlide = () => {
    if (currentSlideIndex > 0 && !isAnimating) {
      const transitionDuration = getTransitionDuration(currentSlideIndex -1);
      setPreviousSlideIndex(currentSlideIndex);
      setCurrentSlideIndex(currentSlideIndex - 1);
       setIsAnimating(true);
       setTimeout(() => {
           setPreviousSlideIndex(-1);
           setIsAnimating(false);
       }, transitionDuration + 50);
    }
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight' || e.key === ' ') {
        goToNextSlide();
      } else if (e.key === 'ArrowLeft') {
        goToPrevSlide();
      } else if (e.key === 'Escape') {
        onExit();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [currentSlideIndex, isAnimating, presentation.slides.length]);

  const getSlideStyle = (index: number, slide: Slide) => {
    const isCurrent = index === currentSlideIndex;
    const isPrevious = index === previousSlideIndex;
    
    // Determine which transition to use. If we are moving forward, the previous slide's transition matters for its exit.
    const transitionSlide = isCurrent ? presentation.slides[previousSlideIndex] : slide;
    const { preset: transitionPreset, duration } = transitionSlide?.transition || { preset: 'fade', duration: 500};

    const baseStyle: React.CSSProperties = {
        position: 'absolute',
        width: '100%',
        height: '100%',
        transition: `transform ${duration}ms ease-in-out, opacity ${duration}ms ease-in-out`,
        transformStyle: 'preserve-3d',
        backfaceVisibility: 'hidden',
    };
    
    const direction = currentSlideIndex > previousSlideIndex ? 1 : -1;

    switch(transitionPreset) {
        case 'cube-rotate':
            if (isCurrent) return { ...baseStyle, transform: 'rotateY(0deg) translateZ(640px)' };
            if (isPrevious) return { ...baseStyle, transform: `rotateY(${-90 * direction}deg) translateZ(640px)` };
            return { ...baseStyle, transform: `rotateY(${90 * direction}deg) translateZ(640px)` };

        case 'card-flip':
            if (isCurrent) return { ...baseStyle, transform: 'rotateY(0deg)' };
            if (isPrevious) return { ...baseStyle, transform: 'rotateY(180deg)' };
            return { ...baseStyle, transform: 'rotateY(180deg)' };

        case 'slide-in-left':
            if (isCurrent) return { ...baseStyle, transform: 'translateX(0%)' };
            if (isPrevious) return { ...baseStyle, transform: `translateX(${-100 * direction}%)` };
            return { ...baseStyle, transform: `translateX(${100 * direction}%)` };
            
        case 'slide-in-right':
             if (isCurrent) return { ...baseStyle, transform: 'translateX(0%)' };
            if (isPrevious) return { ...baseStyle, transform: `translateX(${100 * direction}%)` };
            return { ...baseStyle, transform: `translateX(${-100 * direction}%)` };

        case 'fade':
        default:
            return { ...baseStyle, opacity: isCurrent ? 1 : 0 };
    }
  };

  const currentSlide = presentation.slides[currentSlideIndex];
  const use3dTransform = currentSlide?.transition.preset === 'cube-rotate' || currentSlide?.transition.preset === 'card-flip';

  const sceneStyle: React.CSSProperties = {
      perspective: use3dTransform ? '2000px' : undefined,
      position: 'relative',
      width: '1280px',
      height: '720px',
  }
  
  const stageStyle: React.CSSProperties = {
      position: 'absolute',
      width: '100%',
      height: '100%',
      transformStyle: 'preserve-3d',
      transition: `transform ${currentSlide?.transition.duration}ms ease-in-out`,
      transform: currentSlide?.transition.preset === 'cube-rotate' ? `translateZ(-640px) rotateY(${currentSlideIndex * -90}deg)` : undefined,
  }

  return (
    <div className="fixed inset-0 bg-gray-800 text-white z-50 flex flex-col">
      <style>{allKeyframes}</style>
      <div className="flex-1 flex items-center justify-center p-8 overflow-hidden">
        <div style={sceneStyle}>
          <div style={stageStyle}>
            {presentation.slides.map((slide, index) => {
              const isVisible = index === currentSlideIndex || index === previousSlideIndex;
              if(!isVisible) return null;
              
              return (
                <div key={slide.id} style={getSlideStyle(index, slide)}>
                    <div 
                        className="w-full h-full shadow-lg relative" 
                        style={{ backgroundColor: slide.background }}
                    >
                        {slide.backgroundImage && (
                            <div className="absolute inset-0" style={{ opacity: slide.backgroundImage.opacity }}>
                                <img src={slide.backgroundImage.src}
                                    className="w-full h-full"
                                    style={{ objectFit: slide.backgroundImage.fit }}
                                    alt="background"
                                />
                            </div>
                        )}
                    {slide.objects.map((obj) => (
                        <RenderedObject 
                            key={obj.id}
                            obj={obj}
                            isExiting={index === previousSlideIndex}
                            onClickedObjectIds={onClickedObjectIds}
                            onObjectClick={handleObjectClick}
                        />
                    ))}
                    </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-4 p-2 bg-black/30 rounded-lg">
        <button onClick={goToPrevSlide} disabled={currentSlideIndex === 0} className="px-4 py-2 disabled:opacity-50">Prev</button>
        <span>{currentSlideIndex + 1} / {presentation.slides.length}</span>
        <button onClick={goToNextSlide} disabled={currentSlideIndex === presentation.slides.length - 1} className="px-4 py-2 disabled:opacity-50">Next</button>
      </div>
       <button onClick={onExit} className="absolute top-4 right-4 px-4 py-2 bg-red-500 rounded-lg hover:bg-red-600">Exit</button>
    </div>
  );
};

export default PresentationPlayer;