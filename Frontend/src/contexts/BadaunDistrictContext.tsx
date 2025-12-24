/**
 * Badaun District Context
 *
 * Global context for managing Badaun district data including:
 * - Basic district information
 * - Complaint statistics and list
 * - Administrative heads (MLAs, MLCs, local body heads, executive authorities)
 * - Demographic data (religion and caste)
 *
 * This context centralizes all Badaun district data fetching and state management,
 * making it accessible throughout the application without prop drilling.
 */

import React, {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
  ReactNode,
} from "react";
import {
  districtService,
  type DistrictData,
} from "@/services/district.service";
import type { EntityData } from "@/components/DynamicEntityPanel";

import type { EntityData, EntityType } from "@/components/DynamicEntityPanel";

interface BadaunDistrictContextType {
  // Data state
  districtData: DistrictData | null;
  loading: boolean;
  error: string | null;

  // Actions
  fetchDistrictData: () => Promise<void>;
  refreshDistrictData: () => Promise<void>;
  clearDistrictData: () => void;

  // Computed values
  hasData: boolean;
  isPanelOpen: boolean;
  setIsPanelOpen: (open: boolean) => void;

  // Entity selection (for dynamic panel)
  selectedEntity: EntityData | null;
  setSelectedEntity: (entity: EntityData | null) => void;
  isEntityPanelOpen: boolean;
  setIsEntityPanelOpen: (open: boolean) => void;
}

const BadaunDistrictContext = createContext<
  BadaunDistrictContextType | undefined
>(undefined);

/**
 * Hook to access Badaun District Context
 * @throws Error if used outside of BadaunDistrictProvider
 */
export const useBadaunDistrict = () => {
  const context = useContext(BadaunDistrictContext);
  if (context === undefined) {
    throw new Error(
      "useBadaunDistrict must be used within a BadaunDistrictProvider"
    );
  }
  return context;
};

interface BadaunDistrictProviderProps {
  children: ReactNode;
  /**
   * If true, automatically fetch district data when the provider mounts
   * @default false
   */
  autoFetch?: boolean;
}

/**
 * Badaun District Provider
 *
 * Provides global access to Badaun district data throughout the application.
 *
 * @example
 * ```tsx
 * <BadaunDistrictProvider autoFetch={true}>
 *   <App />
 * </BadaunDistrictProvider>
 * ```
 */
export const BadaunDistrictProvider: React.FC<BadaunDistrictProviderProps> = ({
  children,
  autoFetch = false,
}) => {
  const [districtData, setDistrictData] = useState<DistrictData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPanelOpen, setIsPanelOpen] = useState(false);

  // Entity selection state (for dynamic panel)
  const [selectedEntity, setSelectedEntity] = useState<EntityData | null>(null);
  const [isEntityPanelOpen, setIsEntityPanelOpen] = useState(false);

  /**
   * Fetch Badaun district data from the API
   */
  const fetchDistrictData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const data = await districtService.getBadaunDistrict();
      setDistrictData(data);
    } catch (err: any) {
      const errorMessage =
        err?.message || "Failed to fetch Badaun district data";
      setError(errorMessage);
      console.error("Error fetching Badaun district data:", err);

      // Set districtData to null on error to indicate no data available
      setDistrictData(null);
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Refresh district data (same as fetch but with explicit naming)
   */
  const refreshDistrictData = useCallback(async () => {
    await fetchDistrictData();
  }, [fetchDistrictData]);

  /**
   * Clear district data from context
   */
  const clearDistrictData = useCallback(() => {
    setDistrictData(null);
    setError(null);
    setIsPanelOpen(false);
  }, []);

  // Auto-fetch on mount if enabled
  useEffect(() => {
    if (autoFetch) {
      fetchDistrictData();
    }
  }, [autoFetch, fetchDistrictData]);

  const value: BadaunDistrictContextType = {
    districtData,
    loading,
    error,
    fetchDistrictData,
    refreshDistrictData,
    clearDistrictData,
    hasData: districtData !== null,
    isPanelOpen,
    setIsPanelOpen,
    selectedEntity,
    setSelectedEntity,
    isEntityPanelOpen,
    setIsEntityPanelOpen,
  };

  return (
    <BadaunDistrictContext.Provider value={value}>
      {children}
    </BadaunDistrictContext.Provider>
  );
};

export default BadaunDistrictContext;
