import { useContext } from 'react';
import { BridgeContext, BridgeContextType } from '../contexts/BridgeContext';

export function useBridge(): BridgeContextType {
  const context = useContext(BridgeContext);
  if (context === undefined) {
    throw new Error('useBridge must be used within a BridgeProvider');
  }
  return context;
}
