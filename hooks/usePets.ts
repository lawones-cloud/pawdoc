import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/lib/supabase";

export interface Pet {
  id: string;
  user_id: string;
  name: string;
  species: "dog" | "cat" | "other";
  breed: string | null;
  dob: string | null;
  weight: number | null;
  sex: "male" | "female" | null;
  neutered: boolean | null;
  allergies: string[] | null;
  conditions: string[] | null;
  medications: string[] | null;
  photo_url: string | null;
  created_at: string;
}

export interface HealthLog {
  id: string;
  pet_id: string;
  type: "triage" | "nutrition_advice";
  summary: string;
  ai_response: Record<string, unknown>;
  severity_score: number | null;
  created_at: string;
}

export function usePets() {
  const [pets, setPets] = useState<Pet[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchPets = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        setPets([]);
        return;
      }
      const { data, error: fetchError } = await supabase
        .from("pets")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: true });

      if (fetchError) throw fetchError;
      setPets(data ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load pets");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPets();
  }, [fetchPets]);

  return { pets, loading, error, refetch: fetchPets };
}

export function usePet(pet_id: string | null) {
  const [pet, setPet] = useState<Pet | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchPet = useCallback(async () => {
    if (!pet_id) {
      setPet(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const { data, error: fetchError } = await supabase
        .from("pets")
        .select("*")
        .eq("id", pet_id)
        .single();

      if (fetchError) throw fetchError;
      setPet(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load pet");
    } finally {
      setLoading(false);
    }
  }, [pet_id]);

  useEffect(() => {
    fetchPet();
  }, [fetchPet]);

  return { pet, loading, error, refetch: fetchPet };
}

export function useHealthLogs(pet_id: string | null) {
  const [logs, setLogs] = useState<HealthLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchLogs = useCallback(async () => {
    if (!pet_id) {
      setLogs([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const { data, error: fetchError } = await supabase
        .from("health_logs")
        .select("*")
        .eq("pet_id", pet_id)
        .order("created_at", { ascending: false });

      if (fetchError) throw fetchError;
      setLogs(data ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load health logs");
    } finally {
      setLoading(false);
    }
  }, [pet_id]);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  return { logs, loading, error, refetch: fetchLogs };
}
