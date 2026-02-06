import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useState, useEffect } from "react";

interface SystemSetting {
  id: number;
  settingKey: string;
  settingValue: string;
  settingDescription: string | null;
  updatedBy: number | null;
  updatedAt: string | null;
}

export function useTenantConfig<T extends Record<string, any>>(key: string, defaults: T) {
  const { data, isLoading } = useQuery<{ settings: SystemSetting[] }>({
    queryKey: ["/api/admin/settings"],
  });

  const setting = data?.settings.find(s => s.settingKey === key);
  let config: T = { ...defaults };

  if (setting?.settingValue) {
    try {
      const parsed = JSON.parse(setting.settingValue);
      config = { ...defaults, ...parsed };
    } catch {
      // Fall back to defaults
    }
  }

  const [localConfig, setLocalConfig] = useState<T>(config);
  const [hasChanges, setHasChanges] = useState(false);

  useEffect(() => {
    setLocalConfig(config);
    setHasChanges(false);
  }, [setting?.settingValue]);

  const updateField = <K extends keyof T>(field: K, value: T[K]) => {
    setLocalConfig(prev => ({ ...prev, [field]: value }));
    setHasChanges(true);
  };

  const updateConfig = (partial: Partial<T>) => {
    setLocalConfig(prev => ({ ...prev, ...partial }));
    setHasChanges(true);
  };

  const saveMutation = useMutation({
    mutationFn: async (value: T) => {
      return await apiRequest("PUT", `/api/admin/settings/${key}`, {
        value: JSON.stringify(value),
        description: `Tenant configuration: ${key}`,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/settings"] });
      setHasChanges(false);
    },
  });

  const save = () => saveMutation.mutate(localConfig);

  return {
    config: localConfig,
    isLoading,
    hasChanges,
    updateField,
    updateConfig,
    save,
    isPending: saveMutation.isPending,
    isSuccess: saveMutation.isSuccess,
  };
}
