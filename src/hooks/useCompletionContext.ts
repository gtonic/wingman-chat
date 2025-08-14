import { useMemo } from "react";
import { Tool } from "../types/chat";
import { useProfile } from "./useProfile";
import { useArtifacts } from "./useArtifacts";
import { useRepository } from "./useRepository";
import { useRepositories } from "./useRepositories";
import { useBridge } from "./useBridge";
import { useSearch } from "./useSearch";

export interface ChatContext {
  tools: Tool[];
  instructions: string;
}

/**
 * Shared hook for gathering completion tools and instructions
 * Used by both ChatProvider and VoiceProvider
 */
export function useChatContext(): ChatContext {
  const { generateInstructions } = useProfile();
  const { artifactsTools, artifactsInstructions, isEnabled: isArtifactsEnabled } = useArtifacts();
  const { currentRepository } = useRepositories();
  const { queryTools, queryInstructions } = useRepository(currentRepository?.id || '');
  const { bridgeTools, bridgeInstructions } = useBridge();
  const { searchTools, searchInstructions } = useSearch();

  return useMemo(() => {
    const profileInstructions = generateInstructions();
    
    const filesTools = isArtifactsEnabled ? artifactsTools() : [];
    const filesInstructions = isArtifactsEnabled ? artifactsInstructions() : '';
    
    const repositoryTools = currentRepository ? queryTools() : [];
    const repositoryInstructions = currentRepository ? queryInstructions() : '';

    const webSearchTools = searchTools();
    const webSearchInstructions = searchInstructions();

    const completionTools = [...bridgeTools, ...repositoryTools, ...filesTools, ...webSearchTools];

    const instructionsList: string[] = [];

    if (profileInstructions.trim()) {
      instructionsList.push(profileInstructions);
    }

    if (filesInstructions.trim()) {
      instructionsList.push(filesInstructions);
    }

    if (repositoryInstructions.trim()) {
      instructionsList.push(repositoryInstructions);
    }

    if (bridgeTools.length > 0 && bridgeInstructions?.trim()) {
      instructionsList.push(bridgeInstructions);
    }

    if (webSearchTools.length > 0 && webSearchInstructions?.trim()) {
      instructionsList.push(webSearchInstructions);
    }

    return {
      tools: completionTools,
      instructions: instructionsList.join('\n\n')
    };
  }, [
    generateInstructions,
    isArtifactsEnabled,
    artifactsTools,
    artifactsInstructions,
    currentRepository,
    queryTools,
    queryInstructions,
    bridgeTools,
    bridgeInstructions,
    searchTools,
    searchInstructions
  ]);
}
