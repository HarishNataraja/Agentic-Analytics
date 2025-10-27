import { ObjectAnimationPreset, SlideTransitionPreset } from "../../types";

export interface AnimationPreset {
    id: ObjectAnimationPreset;
    name: string;
    keyframes: string;
}

export interface TransitionPreset {
    id: SlideTransitionPreset;
    name: string;
}

export const OBJECT_ANIMATION_PRESETS: AnimationPreset[] = [
    { id: 'none', name: 'None', keyframes: '' },
    // Enter
    { id: 'fade-in', name: 'Fade In', keyframes: '@keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }' },
    { id: 'fly-in-up', name: 'Fly In Up', keyframes: '@keyframes flyInUp { from { opacity: 0; transform: translateY(30px); } to { opacity: 1; transform: translateY(0); } }' },
    { id: 'fly-in-left', name: 'Fly In Left', keyframes: '@keyframes flyInLeft { from { opacity: 0; transform: translateX(-30px); } to { opacity: 1; transform: translateX(0); } }' },
    { id: 'zoom-in', name: 'Zoom In', keyframes: '@keyframes zoomIn { from { opacity: 0; transform: scale(0.8); } to { opacity: 1; transform: scale(1); } }' },
    { id: 'bounce-in', name: 'Bounce In', keyframes: `@keyframes bounceIn {
        0%, 20%, 40%, 60%, 80%, 100% { transition-timing-function: cubic-bezier(0.215, 0.610, 0.355, 1.000); }
        0% { opacity: 0; transform: scale3d(.3, .3, .3); }
        20% { transform: scale3d(1.1, 1.1, 1.1); }
        40% { transform: scale3d(.9, .9, .9); }
        60% { opacity: 1; transform: scale3d(1.03, 1.03, 1.03); }
        80% { transform: scale3d(.97, .97, .97); }
        100% { opacity: 1; transform: scale3d(1, 1, 1); }
    }` },
    { id: 'flip-3d', name: '3D Flip', keyframes: `@keyframes flip3d {
        from { transform: perspective(400px) rotate3d(0, 1, 0, 90deg); animation-timing-function: ease-in; opacity: 0; }
        40% { transform: perspective(400px) rotate3d(0, 1, 0, -20deg); animation-timing-function: ease-in; }
        60% { transform: perspective(400px) rotate3d(0, 1, 0, 10deg); opacity: 1; }
        80% { transform: perspective(400px) rotate3d(0, 1, 0, -5deg); }
        to { transform: perspective(400px); }
    }`},
    { id: 'reveal-mask', name: 'Reveal Mask', keyframes: `@keyframes revealMask {
        from { clip-path: circle(0%); }
        to { clip-path: circle(75%); }
    }`},
    { id: 'parallax-drift-slow', name: 'Parallax Drift (Slow)', keyframes: `@keyframes parallaxDriftSlow { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }` },
    { id: 'parallax-drift-medium', name: 'Parallax Drift (Medium)', keyframes: `@keyframes parallaxDriftMedium { from { opacity: 0; transform: translateY(30px); } to { opacity: 1; transform: translateY(0); } }` },
    { id: 'parallax-drift-fast', name: 'Parallax Drift (Fast)', keyframes: `@keyframes parallaxDriftFast { from { opacity: 0; transform: translateY(60px); } to { opacity: 1; transform: translateY(0); } }` },
    // Exit
    { id: 'fade-out', name: 'Fade Out', keyframes: '@keyframes fadeOut { from { opacity: 1; } to { opacity: 0; } }' },
    { id: 'fly-out-down', name: 'Fly Out Down', keyframes: '@keyframes flyOutDown { from { opacity: 1; transform: translateY(0); } to { opacity: 0; transform: translateY(30px); } }' },
    { id: 'fly-out-right', name: 'Fly Out Right', keyframes: '@keyframes flyOutRight { from { opacity: 1; transform: translateX(0); } to { opacity: 0; transform: translateX(30px); } }' },
    { id: 'zoom-out', name: 'Zoom Out', keyframes: '@keyframes zoomOut { from { opacity: 1; transform: scale(1); } to { opacity: 0; transform: scale(0.8); } }' },
];

export const SLIDE_TRANSITION_PRESETS: TransitionPreset[] = [
    { id: 'none', name: 'None' },
    { id: 'fade', name: 'Fade' },
    { id: 'slide-in-left', name: 'Slide In (from Right)' },
    { id: 'slide-in-right', name: 'Slide In (from Left)' },
    { id: 'cube-rotate', name: 'Cube Rotate' },
    { id: 'card-flip', name: 'Card Flip' },
];