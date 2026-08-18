"use client";

import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { useSearchParams } from "next/navigation";
import { browserApiFetch } from "../../lib/api";

interface Enrollment {
  id: number;
  productSlug: string;
  productTitle: string;
  status: string;
  expiresAt: string;
}

interface User {
  id: number;
  email: string;
  fullName: string;
  role: string;
}

interface ExamContextType {
  selectedExamSlug: string;
  setSelectedExamSlug: (slug: string) => void;
  enrollments: Enrollment[];
  currentEnrollment: Enrollment | null;
  user: User | null;
  isLoading: boolean;
}

const ExamContext = createContext<ExamContextType | undefined>(undefined);

const STORAGE_KEY = "pm-selected-exam";

export function ExamProvider({ children }: { children: ReactNode }) {
  const [enrollments, setEnrollments] = useState<Enrollment[]>([]);
  const [selectedExamSlug, setSelectedExamSlugState] = useState<string>("");
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const searchParams = useSearchParams();

  // Load enrollments, user and selected exam
  useEffect(() => {
    let cancelled = false;
    
    async function loadData() {
      try {
        const [enrollmentsData, userData] = await Promise.all([
          browserApiFetch<Enrollment[]>("/api/enrollments"),
          browserApiFetch<User>("/api/auth/me").catch(() => null),
        ]);
        if (cancelled) return;
        
        setUser(userData);
        
        const active = enrollmentsData.filter((e) => e.status === "active" && new Date(e.expiresAt) > new Date());
        setEnrollments(active);
        
        // Check URL query param first (from product page)
        const urlProduct = searchParams.get("product");
        
        if (urlProduct && active.find((e) => e.productSlug === urlProduct)) {
          setSelectedExamSlugState(urlProduct);
          // Also save to localStorage for persistence
          if (typeof window !== "undefined") {
            localStorage.setItem(STORAGE_KEY, urlProduct);
          }
        } else {
          // Try to get saved selection from localStorage
          const saved = typeof window !== "undefined" ? localStorage.getItem(STORAGE_KEY) : null;
          
          if (saved && active.find((e) => e.productSlug === saved)) {
            setSelectedExamSlugState(saved);
          } else if (active.length > 0) {
            setSelectedExamSlugState(active[0].productSlug);
          }
        }
      } catch {
        // ignore
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }
    
    loadData();
    return () => { cancelled = true; };
  }, [searchParams]);

  // Persist selection to localStorage
  const setSelectedExamSlug = (slug: string) => {
    setSelectedExamSlugState(slug);
    if (typeof window !== "undefined") {
      localStorage.setItem(STORAGE_KEY, slug);
    }
  };

  const currentEnrollment = enrollments.find((e) => e.productSlug === selectedExamSlug) || null;

  return (
    <ExamContext.Provider
      value={{
        selectedExamSlug,
        setSelectedExamSlug,
        enrollments,
        currentEnrollment,
        user,
        isLoading,
      }}
    >
      {children}
    </ExamContext.Provider>
  );
}

export function useExam() {
  const context = useContext(ExamContext);
  if (context === undefined) {
    throw new Error("useExam must be used within an ExamProvider");
  }
  return context;
}
