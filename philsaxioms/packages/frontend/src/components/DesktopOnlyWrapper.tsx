import { useState, useEffect, ReactNode } from 'react';
import { detectDevice, createDeviceListener, DeviceInfo } from '../utils/device-detection';

interface DesktopOnlyWrapperProps {
  children: ReactNode;
}

interface MobileBlockedScreenProps {
  deviceInfo: DeviceInfo;
}

function MobileBlockedScreen({ deviceInfo }: MobileBlockedScreenProps) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 flex items-center justify-center p-4">
      <div className="max-w-md mx-auto text-center">
        <div className="mb-8">
          <div className="w-24 h-24 mx-auto mb-6 bg-slate-700 rounded-full flex items-center justify-center">
            <svg 
              className="w-12 h-12 text-slate-400" 
              fill="none" 
              stroke="currentColor" 
              viewBox="0 0 24 24"
            >
              <path 
                strokeLinecap="round" 
                strokeLinejoin="round" 
                strokeWidth={2} 
                d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" 
              />
            </svg>
          </div>
          <h1 className="text-3xl font-bold text-white mb-4">
            Desktop Required
          </h1>
          <p className="text-slate-300 text-lg mb-6">
            PhilsAxioms requires a desktop computer for the best experience.
          </p>
        </div>
        
        <div className="bg-slate-800 rounded-lg p-6 mb-6">
          <h2 className="text-xl font-semibold text-white mb-3">
            Why Desktop Only?
          </h2>
          <ul className="text-slate-300 text-left space-y-2">
            <li className="flex items-start">
              <span className="inline-block w-2 h-2 bg-blue-400 rounded-full mt-2 mr-3 flex-shrink-0"></span>
              Complex philosophical argument graphs need large screens for clarity
            </li>
            <li className="flex items-start">
              <span className="inline-block w-2 h-2 bg-blue-400 rounded-full mt-2 mr-3 flex-shrink-0"></span>
              Interactive node manipulation requires precise mouse control
            </li>
            <li className="flex items-start">
              <span className="inline-block w-2 h-2 bg-blue-400 rounded-full mt-2 mr-3 flex-shrink-0"></span>
              Detailed text content is optimized for desktop reading
            </li>
          </ul>
        </div>
        
        <div className="text-slate-400 text-sm">
          <p className="mb-2">
            Please visit us on a desktop or laptop computer to explore philosophical axioms.
          </p>
          <p className="text-xs">
            Current device: {deviceInfo.isMobile ? 'Mobile' : 'Tablet'} 
            ({deviceInfo.screenWidth}px width)
          </p>
        </div>
      </div>
    </div>
  );
}

export default function DesktopOnlyWrapper({ children }: DesktopOnlyWrapperProps) {
  const [deviceInfo, setDeviceInfo] = useState<DeviceInfo>(() => detectDevice());
  
  useEffect(() => {
    // Set initial device info
    setDeviceInfo(detectDevice());
    
    // Listen for screen size changes
    const cleanup = createDeviceListener(setDeviceInfo);
    
    return cleanup;
  }, []);
  
  // Block mobile and tablet devices
  if (!deviceInfo.isDesktop) {
    return <MobileBlockedScreen deviceInfo={deviceInfo} />;
  }
  
  // Allow desktop access
  return <>{children}</>;
}