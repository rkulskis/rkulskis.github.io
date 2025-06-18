import { Variants } from 'framer-motion';

export const nodeAnimations = {
  hover: { 
    scale: 1.05, 
    y: -5,
    transition: { duration: 0.2 }
  },
  tap: { 
    scale: 0.95,
    transition: { duration: 0.1 }
  },
  initial: { 
    scale: 1, 
    y: 0 
  },
  snap: {
    scale: [1, 1.1, 1],
    rotate: [0, 2, -2, 0],
    transition: { duration: 0.3 }
  },
  pulse: {
    scale: [1, 1.02, 1],
    transition: { 
      duration: 2,
      repeat: Infinity,
      ease: 'easeInOut'
    }
  }
};

export const cardAnimations: Variants = {
  hidden: { 
    opacity: 0, 
    y: 20 
  },
  visible: { 
    opacity: 1, 
    y: 0,
    transition: { duration: 0.3 }
  },
  exit: { 
    opacity: 0, 
    y: -20,
    transition: { duration: 0.2 }
  }
};

export const modalAnimations: Variants = {
  hidden: {
    opacity: 0,
    scale: 0.8,
    y: 20
  },
  visible: {
    opacity: 1,
    scale: 1,
    y: 0,
    transition: { 
      type: 'spring',
      stiffness: 300,
      damping: 20
    }
  },
  exit: {
    opacity: 0,
    scale: 0.8,
    y: 20,
    transition: { duration: 0.2 }
  }
};

export const slideAnimations: Variants = {
  hidden: { x: '100%' },
  visible: { 
    x: 0,
    transition: { 
      type: 'spring',
      stiffness: 300,
      damping: 30
    }
  },
  exit: { 
    x: '100%',
    transition: { duration: 0.2 }
  }
};