"use client";
import { useState, useEffect, useCallback } from "react";
import { toast } from "react-hot-toast";
import { Assistant } from "@/types/mcp";
import { MY_ASSISTANTS_QUERY, CREATE_ASSISTANT_MUTATION, UPDATE_ASSISTANT_MUTATION, DELETE_ASSISTANT_MUTATION } from "@/lib/graphql";

export interface AssistantsState {
  assistants: Assistant[] | null;
  loading: boolean;
  error: string | null;
  activeAssistant: Assistant | null;
  refresh: () => Promise<void>;
  setActiveAssistant: (assistantId: string) => Promise<void>;
  createAssistant: (data: { name: string; instructions: string; description?: string; isActive?: boolean; config?: any }) => Promise<void>;
  updateAssistant: (id: string, data: { name?: string; instructions?: string; description?: string; isActive?: boolean; config?: any }) => Promise<void>;
  deleteAssistant: (id: string) => Promise<void>;
}

export function useAssistants(): AssistantsState {
  const [assistants, setAssistants] = useState<Assistant[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch assistants from GraphQL API
  const fetchAssistants = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/graphql', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          query: MY_ASSISTANTS_QUERY,
        }),
      });

      const result = await response.json();

      if (!response.ok || result.errors) {
        throw new Error(result.errors?.[0]?.message || 'Failed to fetch assistants');
      }

      const assistants = result.data?.myAssistants || [];
      setAssistants(assistants);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch assistants';
      setError(errorMessage);
      // Don't show toast for auth errors - user might not be logged in
      if (!errorMessage.includes('authenticated')) {
        toast.error(errorMessage);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  // Set an assistant as active
  const setActiveAssistant = useCallback(async (assistantId: string) => {
    try {
      const response = await fetch('/api/graphql', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          query: UPDATE_ASSISTANT_MUTATION,
          variables: {
            id: assistantId,
            isActive: true,
          },
        }),
      });
      const result = await response.json();
      if (!response.ok || result.errors) {
        throw new Error(result.errors?.[0]?.message || 'Failed to set active assistant');
      }
      const updatedAssistant = result.data?.updateAssistant;
      if (updatedAssistant) {
        setAssistants(prev => prev?.map(a => a.id === assistantId
          ? { ...a, ...updatedAssistant, isActive: true }
          : { ...a, isActive: false }
        ) || null);
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to set active assistant';
      toast.error(errorMessage);
      throw err;
    }
  }, []);

  // Create a new assistant
  const createAssistant = useCallback(async (data: { name: string; instructions: string; description?: string; isActive?: boolean; config?: any }) => {
    try {
      const response = await fetch('/api/graphql', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          query: CREATE_ASSISTANT_MUTATION,
          variables: {
            name: data.name,
            instructions: data.instructions,
            description: data.description,
            isActive: data.isActive,
            config: data.config,
          },
        }),
      });

      const result = await response.json();

      if (!response.ok || result.errors) {
        throw new Error(result.errors?.[0]?.message || 'Failed to create assistant');
      }

      const newAssistant = result.data?.createAssistant;
      if (newAssistant) {
        setAssistants(prev => prev ? [...prev.map(a => data.isActive ? { ...a, isActive: false } : a), newAssistant] : [newAssistant]);
      }
      toast.success('Assistant created successfully');
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to create assistant';
      toast.error(errorMessage);
      throw err;
    }
  }, []);

  // Update an existing assistant
  const updateAssistant = useCallback(async (id: string, data: { name?: string; instructions?: string; description?: string; isActive?: boolean; config?: any }) => {
    try {
      const response = await fetch('/api/graphql', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          query: UPDATE_ASSISTANT_MUTATION,
          variables: {
            id,
            ...data,
          },
        }),
      });

      const result = await response.json();

      if (!response.ok || result.errors) {
        throw new Error(result.errors?.[0]?.message || 'Failed to update assistant');
      }

      const updatedAssistant = result.data?.updateAssistant;
      if (updatedAssistant) {
        setAssistants(prev => prev ? prev.map(a => a.id === id ? { ...a, ...updatedAssistant } : a ) : null);
      }
      toast.success('Assistant updated successfully');
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to update assistant';
      toast.error(errorMessage);
      throw err;
    }
  }, []);

  // Delete an assistant
  const deleteAssistant = useCallback(async (id: string) => {
    try {
      const response = await fetch('/api/graphql', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          query: DELETE_ASSISTANT_MUTATION,
          variables: { id },
        }),
      });
      const result = await response.json();
      if (!response.ok || result.errors) {
        throw new Error(result.errors?.[0]?.message || 'Failed to delete assistant');
      }
      if (result.data?.deleteAssistant) {
        setAssistants(prev => prev ? prev.filter(a => a.id !== id) : null);
      }
      toast.success('Assistant deleted successfully');
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to delete assistant';
      toast.error(errorMessage);
      throw err;
    }
  }, []);

  // Get the currently active assistant
  const activeAssistant = assistants?.find(a => a.isActive) || null;

  // Load assistants on mount
  useEffect(() => {
    fetchAssistants();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return {
    assistants,
    loading,
    error,
    activeAssistant,
    refresh: fetchAssistants,
    setActiveAssistant,
    createAssistant,
    updateAssistant,
    deleteAssistant,
  };
}
