import { useState, useEffect, ReactNode } from 'react';
import { Tool } from '../types/chat';
import { getConfig } from '../config';
import { BridgeContext, BridgeContextType } from './BridgeContext';

interface BridgeProviderProps {
  children: ReactNode;
}

export function BridgeProvider({ children }: BridgeProviderProps) {
  const config = getConfig();
  const bridge = config.bridge;
  const [bridgeTools, setBridgeTools] = useState<Tool[]>([]);

  // Fetch bridge tools when bridge is connected
  useEffect(() => {
    const fetchTools = async () => {
      if (bridge.isConnected()) {
        try {
          const tools = await bridge.listTools();
          setBridgeTools(tools);
        } catch (error) {
          console.error("Failed to fetch bridge tools:", error);
          setBridgeTools([]);
        }
      } else {
        setBridgeTools([]);
      }
    };

    fetchTools();
    
    const interval = setInterval(fetchTools, 5000);    
    return () => clearInterval(interval);
  }, [bridge]);

  const value: BridgeContextType = {
    bridgeTools,
    isConnected: bridge.isConnected(),
  };

  return <BridgeContext.Provider value={value}>{children}</BridgeContext.Provider>;
}
