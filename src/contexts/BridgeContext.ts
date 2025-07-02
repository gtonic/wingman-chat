import { createContext } from 'react';
import { Tool } from '../types/chat';

export type BridgeContextType = {
  bridgeTools: Tool[];
  isConnected: boolean;
};

export const BridgeContext = createContext<BridgeContextType | undefined>(undefined);
