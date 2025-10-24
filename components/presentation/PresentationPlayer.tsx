import React, { useState, useEffect } from 'react';
import { Presentation, SlideObject, ChartData, TextContent, ImageContent, Slide } from '../../types';
import ChartRenderer from '../charts/ChartRenderer';

interface PresentationPlayerProps {
  presentation: Presentation;
  onExit: () => void;
}

const animationStyles = `
  @keyframes fadeIn {
    from { opacity: 0; }
    to { opacity: 1; }
  }
  @keyframes flyInUp {
    from { opacity: 0; transform: translateY(30px); }
    to { opacity: 1; transform: translateY(0); }
  }
  @keyframes flyInLeft {
    from { opacity: 0; transform: translateX(-30px); }
    to { opacity: 1; transform: translateX(0); }
  }

  .animate-fade-in { animation: fadeIn 0.5s ease-out both; }
  .animate-fly-in-up { animation: flyInUp 0.5s ease-out both; }
  .animate-fly-in-left { animation: flyInLeft 0.5s ease-out both; }
`;

const renderObject = (obj: SlideObject) => {
    let content;
    let style: React.CSSProperties = {};
    if (obj.type === 'text') {
        const textContent = obj.content as TextContent;
        style.fontWeight = textContent.bold ? 'bold' : 'normal';
        style.fontStyle = textContent.italic ? 'italic' : 'normal';
        style.textDecoration = textContent.underline ? 'underline' : 'none';
        style.fontSize = `${textContent.fontSize}px`;
        style.textAlign = textContent.textAlign;
        style.lineHeight = 1.4;
        content = <div className="p-2 w-full h-full whitespace-pre-wrap overflow-hidden" style={style}>{textContent.text}</div>
    } else if (obj.type === 'chart') {
        content = <div className="w-full h-full bg-white"><ChartRenderer chartData={obj.content as ChartData}/></div>
    } else if (obj.type === 'shape') {
        const shapeContent = obj.content as { shape: 'rectangle' | 'ellipse', color: string };
        style.backgroundColor = shapeContent.color;
        if (shapeContent.shape === 'ellipse') style.borderRadius = '50%';
        content = <div className="w-full h-full" style={style}></div>
    } else if (obj.type === 'image') {
        const imageContent = obj.content as ImageContent;
        content = <img src={imageContent.src} className="w-full h-full object-cover" alt="slide content"/>;
    }

    const animationType = obj.animation?.type || 'none';
    const animationClass = animationType !== 'none' ? `animate-${animationType}` : '';

    return (
        <div
            key={obj.id}
            className={animationClass}
            style={{
              position: 'absolute',
              left: obj.x,
              top: obj.y,
              width: obj.width,
              height: obj.height,
            }}
          >
            {content}
        </div>
    );
};

const PresentationPlayer: React.FC<PresentationPlayerProps> = ({ presentation, onExit }) => {
  const [currentSlideIndex, setCurrentSlideIndex] = useState(0);
  const [isAnimating, setIsAnimating] = useState(false);

  const goToNextSlide = () => {
    if (currentSlideIndex < presentation.slides.length - 1 && !isAnimating) {
      setIsAnimating(true);
      setCurrentSlideIndex(currentSlideIndex + 1);
      setTimeout(() => setIsAnimating(false), 500); // Match CSS duration
    }
  };

  const goToPrevSlide = () => {
    if (currentSlideIndex > 0 && !isAnimating) {
      setIsAnimating(true);
      setCurrentSlideIndex(currentSlideIndex - 1);
       setTimeout(() => setIsAnimating(false), 500); // Match CSS duration
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

  return (
    <div className="fixed inset-0 bg-gray-800 text-white z-50 flex flex-col">
      <style>{animationStyles}</style>
      <div className="flex-1 relative overflow-hidden">
        {presentation.slides.map((slide, index) => {
          const transition = slide.transition?.type || 'fade';
          let transitionClasses = 'absolute inset-0 transition-all duration-500 ease-in-out';
          
          if(index === currentSlideIndex) {
              transitionClasses += ' opacity-100 z-10';
          } else if (index < currentSlideIndex) {
            if (transition === 'slide-in-left') transitionClasses += ' opacity-0 -translate-x-full';
            else if (transition === 'slide-in-right') transitionClasses += ' opacity-0 translate-x-full';
            else transitionClasses += ' opacity-0'; // Fade
          } else { // index > currentSlideIndex
             if (transition === 'slide-in-left') transitionClasses += ' opacity-0 translate-x-full';
             else if (transition === 'slide-in-right') transitionClasses += ' opacity-0 -translate-x-full';
             else transitionClasses += ' opacity-0'; // Fade
          }
          
          return (
            <div key={slide.id} className={transitionClasses}>
              <div className="w-full h-full flex items-center justify-center p-8">
                 <div 
                    className="w-[1280px] h-[720px] shadow-lg relative" 
                    style={{ backgroundColor: slide.background }}
                 >
                   {index === currentSlideIndex && slide.objects.map((obj, objIndex) => (
                       <div key={obj.id} style={{ animationDelay: `${objIndex * 150}ms`}}>
                           {renderObject(obj)}
                       </div>
                   ))}
                </div>
              </div>
            </div>
          );
        })}
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
