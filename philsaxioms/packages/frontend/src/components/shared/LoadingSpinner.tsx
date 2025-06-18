import { motion } from 'framer-motion';

export interface LoadingSpinnerProps {
  message?: string;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
}

const sizeClasses = {
  sm: 'w-4 h-4',
  md: 'w-8 h-8', 
  lg: 'w-12 h-12'
};

const textSizeClasses = {
  sm: 'text-sm',
  md: 'text-base',
  lg: 'text-lg'
};

export function LoadingSpinner({ message = 'Loading...', className = '', size = 'md' }: LoadingSpinnerProps) {
  return (
    <div className={`flex flex-col items-center justify-center space-y-4 ${className}`}>
      <motion.div
        className={`border-4 border-gray-200 border-t-blue-500 rounded-full ${sizeClasses[size]}`}
        animate={{ rotate: 360 }}
        transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
      />
      {message && (
        <p className={`text-gray-600 ${textSizeClasses[size]}`}>
          {message}
        </p>
      )}
    </div>
  );
}

export function LoadingOverlay({ message, className }: LoadingSpinnerProps) {
  return (
    <div className={`absolute inset-0 bg-white/80 backdrop-blur-sm flex items-center justify-center z-50 ${className}`}>
      <LoadingSpinner message={message} size="lg" />
    </div>
  );
}