/**
 * Device detection utilities for restricting mobile access
 */

export interface DeviceInfo {
  isMobile: boolean;
  isTablet: boolean;
  isDesktop: boolean;
  screenWidth: number;
  userAgent: string;
}

/**
 * Detect if the current device is mobile based on screen size and user agent
 */
export function detectDevice(): DeviceInfo {
  const screenWidth = window.innerWidth;
  const userAgent = navigator.userAgent.toLowerCase();
  
  // Mobile breakpoint - consider anything under 768px as mobile
  const mobileBreakpoint = 768;
  
  // Tablet breakpoint - between 768px and 1024px
  const tabletBreakpoint = 1024;
  
  // User agent patterns for mobile devices
  const mobilePatterns = [
    /android.*mobile/,
    /iphone/,
    /ipod/,
    /blackberry/,
    /opera mini/,
    /iemobile/,
    /mobile.*firefox/,
    /mobile.*safari/
  ];
  
  // User agent patterns for tablets
  const tabletPatterns = [
    /ipad/,
    /android(?!.*mobile)/,
    /tablet/,
    /kindle/,
    /playbook/,
    /nook/
  ];
  
  const isMobileByUA = mobilePatterns.some(pattern => pattern.test(userAgent));
  const isTabletByUA = tabletPatterns.some(pattern => pattern.test(userAgent));
  const isMobileByScreen = screenWidth < mobileBreakpoint;
  const isTabletByScreen = screenWidth >= mobileBreakpoint && screenWidth < tabletBreakpoint;
  
  const isMobile = isMobileByUA || isMobileByScreen;
  const isTablet = isTabletByUA || isTabletByScreen;
  const isDesktop = !isMobile && !isTablet;
  
  return {
    isMobile,
    isTablet,
    isDesktop,
    screenWidth,
    userAgent
  };
}

/**
 * Check if the current device should be allowed to access the app
 */
export function isDesktopDevice(): boolean {
  const device = detectDevice();
  return device.isDesktop;
}

/**
 * Listen for window resize events and re-check device type
 */
export function createDeviceListener(callback: (deviceInfo: DeviceInfo) => void): () => void {
  const handleResize = () => {
    callback(detectDevice());
  };
  
  window.addEventListener('resize', handleResize);
  
  // Return cleanup function
  return () => {
    window.removeEventListener('resize', handleResize);
  };
}