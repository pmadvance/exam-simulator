"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { browserApiFetch, apiUrl } from "../../../lib/api";
import { AdminModal } from "../components/AdminModal";
import { StatusBadge } from "../../components/admin/StatusBadge";
import type { AdminQuestion, AdminProduct, AdminExam, AdminDomain, AdminAsset } from "../../../lib/admin-api";

function resolveImageUrl(url: string | null): string | null {
  if (!url) return null;
  if (url.startsWith("http://") || url.startsWith("https://")) return url;
  return apiUrl + url;
}

type QuestionsContentProps = {
  initialQuestions: AdminQuestion[];
  products: AdminProduct[];
  exams: AdminExam[];
};

type QuestionFormState = {
  examId: string;
  questionType: "single_choice" | "multiple_response" | "true_false";
  prompt: string;
  optionA: string;
  optionB: string;
  optionC: string;
  optionD: string;
  optionE: string;
  correctAnswer: string;
  explanation: string;
  ecoDomain: string;
  performanceDomain: string;
  imageUrl: string;
  difficulty: "easy" | "medium" | "hard" | "";
  status: "draft" | "published";
};

export function QuestionsContent({ initialQuestions, products, exams }: QuestionsContentProps) {
  const searchParams = useSearchParams();
  const [questions, setQuestions] = useState<AdminQuestion[]>(initialQuestions);
  const [showQuestionForm, setShowQuestionForm] = useState(false);
  const [editingQuestion, setEditingQuestion] = useState<AdminQuestion | null>(null);
  const [questionForm, setQuestionForm] = useState<QuestionFormState>({
    examId: "1",
    questionType: "single_choice" as "single_choice" | "multiple_response" | "true_false",
    prompt: "",
    optionA: "",
    optionB: "",
    optionC: "",
    optionD: "",
    optionE: "",
    correctAnswer: "A",
    explanation: "",
    ecoDomain: "",
    performanceDomain: "",
    imageUrl: "",
    difficulty: "" as "easy" | "medium" | "hard" | "",
    status: "published" as "draft" | "published",
  });
  const [showCsvUpload, setShowCsvUpload] = useState(false);
  const [csvUploadExamId, setCsvUploadExamId] = useState("1");
  const [csvUploadText, setCsvUploadText] = useState("");
  const [showAssetPicker, setShowAssetPicker] = useState(false);
  const [availableAssets, setAvailableAssets] = useState<AdminAsset[]>([]);
  const [assetPickerBusy, setAssetPickerBusy] = useState(false);
  const [questionFilterProductId, setQuestionFilterProductId] = useState<number | "all">("all");
  const [questionFilterExamId, setQuestionFilterExamId] = useState<number | "all">("all");
  const [questionFilterStatus, setQuestionFilterStatus] = useState<string>("all");
  const [questionFilterEco, setQuestionFilterEco] = useState<string>("all");
  const [questionFilterPerf, setQuestionFilterPerf] = useState<string>("all");
  const [ecoDomains, setEcoDomains] = useState<AdminDomain[]>([]);
  const [perfDomains, setPerfDomains] = useState<AdminDomain[]>([]);
  const [statusMessage, setStatusMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [questionFilterType, setQuestionFilterType] = useState<string>("all");
  const [questionFilterDifficulty, setQuestionFilterDifficulty] = useState<string>("all");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [selectedQuestions, setSelectedQuestions] = useState<Set<number>>(new Set());

  function getDefaultQuestionForm(): QuestionFormState {
    const filteredExamId = questionFilterExamId === "all" ? null : String(questionFilterExamId);

    return {
      examId: filteredExamId ?? exams[0]?.id?.toString() ?? "1",
      questionType: "single_choice",
      prompt: "",
      optionA: "",
      optionB: "",
      optionC: "",
      optionD: "",
      optionE: "",
      correctAnswer: "A",
      explanation: "",
      ecoDomain: "",
      performanceDomain: "",
      imageUrl: "",
      difficulty: "",
      status: "published",
    };
  }

  // Read examId from URL query params on mount
  useEffect(() => {
    const examIdParam = searchParams.get("examId");
    const actionParam = searchParams.get("action");
    if (examIdParam) {
      const examId = Number(examIdParam);
      if (!isNaN(examId)) {
        setQuestionFilterExamId(examId);
        setQuestionForm(prev => ({ ...prev, examId: String(examId) }));
        // Load questions for this exam
        loadQuestions(examId);
        // If action is 'add', open the form
        if (actionParam === "add") {
          setShowQuestionForm(true);
        }
      }
    }
  }, [searchParams]);

  useEffect(() => {
    browserApiFetch<AdminDomain[]>("/api/admin/eco-domains").then(setEcoDomains).catch(() => {});
    browserApiFetch<AdminDomain[]>("/api/admin/performance-domains").then(setPerfDomains).catch(() => {});
  }, []);

  useEffect(() => {
    setPage(1);
  }, [searchQuery, questionFilterType, questionFilterStatus, questionFilterEco, questionFilterDifficulty, questionFilterPerf, questionFilterProductId, questionFilterExamId]);

  async function loadQuestions(examId?: number) {
    setBusy(true);
    try {
      const qs = examId ? "?examId=" + examId : "";
      const data = await browserApiFetch<AdminQuestion[]>(
        "/api/admin/questions" + qs,
      );
      setQuestions(data);
    } catch (error) {
      setStatusMessage(
        error instanceof Error ? error.message : "Failed to load questions.",
      );
    } finally {
      setBusy(false);
    }
  }

  async function createQuestion() {
    setBusy(true);
    try {
      const payload = {
        examId: Number(questionForm.examId),
        questionType: questionForm.questionType,
        prompt: questionForm.prompt,
        optionA: questionForm.optionA,
        optionB: questionForm.optionB,
        optionC: questionForm.questionType === "true_false" ? "" : questionForm.optionC,
        optionD: questionForm.questionType === "true_false" ? "" : questionForm.optionD,
        optionE: questionForm.questionType === "true_false" ? "" : (questionForm.optionE || ""),
        correctAnswer: questionForm.correctAnswer,
        explanation: questionForm.explanation,
        ecoDomain: questionForm.ecoDomain || null,
        performanceDomain: questionForm.performanceDomain || null,
        imageUrl: questionForm.imageUrl || null,
        difficulty: questionForm.difficulty || null,
        status: questionForm.status,
      };
      if (editingQuestion) {
        const { examId, ...updatePayload } = payload;
        const updated = await browserApiFetch<AdminQuestion>(
          "/api/admin/questions/" + editingQuestion.id,
          { method: "PATCH", body: JSON.stringify(updatePayload) },
        );
        setQuestions((q) => q.map((x) => x.id === editingQuestion.id ? { ...x, ...updated } : x));
        setStatusMessage("Question " + editingQuestion.id + " updated.");
      } else {
        const created = await browserApiFetch<AdminQuestion>(
          "/api/admin/questions",
          { method: "POST", body: JSON.stringify(payload) },
        );
        setQuestions((q) => [created, ...q]);
        setStatusMessage("Question " + created.id + " created.");
      }
      setShowQuestionForm(false);
      setEditingQuestion(null);
      setQuestionForm(getDefaultQuestionForm());
    } catch (error) {
      setStatusMessage(
        error instanceof Error ? error.message : "Failed to save question.",
      );
    } finally {
      setBusy(false);
    }
  }

  async function uploadQuestionsCsv() {
    setBusy(true);
    try {
      // Debug: Log first few lines of CSV being sent
      const lines = csvUploadText.split('\n').slice(0, 5);
      console.log('[CSV Upload] First 5 lines being sent:', lines);
      console.log('[CSV Upload] Total length:', csvUploadText.length);
      
      const result = await browserApiFetch<{ inserted: number; total: number; skippedRows?: number; skipReasons?: { row: number; reason: string }[]; insertErrors?: string[] }>(
        "/api/admin/questions/upload-csv",
        { method: "POST", body: JSON.stringify({ examId: Number(csvUploadExamId), csv: csvUploadText }) },
      );
      
      let msg = `CSV upload complete: ${result.inserted} of ${result.total} questions imported.`;
      
      if (result.skippedRows && result.skippedRows > 0) {
        msg += ` (${result.skippedRows} rows skipped)`;
        if (result.skipReasons && result.skipReasons.length > 0) {
          const reasons = result.skipReasons.slice(0, 3).map(r => `Row ${r.row}: ${r.reason}`).join("; ");
          msg += ` Examples: ${reasons}`;
        }
      }
      
      if (result.insertErrors && result.insertErrors.length > 0) {
        msg += ` ${result.insertErrors.length} insert errors.`;
      }
      
      setStatusMessage(msg);
      setShowCsvUpload(false);
      setCsvUploadText("");
      await loadQuestions(Number(csvUploadExamId));
    } catch (error) {
      setStatusMessage(
        error instanceof Error ? error.message : "CSV upload failed.",
      );
    } finally {
      setBusy(false);
    }
  }

  async function loadAvailableAssets() {
    setAssetPickerBusy(true);
    try {
      const data = await browserApiFetch<AdminAsset[]>("/api/admin/assets");
      setAvailableAssets(data);
    } catch (error) {
      setStatusMessage(error instanceof Error ? error.message : "Failed to load assets.");
    } finally {
      setAssetPickerBusy(false);
    }
  }

  function openAssetPicker() {
    setShowAssetPicker(true);
    if (availableAssets.length === 0) {
      void loadAvailableAssets();
    }
  }

  function chooseAsset(asset: AdminAsset) {
    setQuestionForm((prev) => ({ ...prev, imageUrl: asset.url }));
    setShowAssetPicker(false);
    setStatusMessage(`Selected ${asset.filename} from assets.`);
  }



  function handleCsvFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => { setCsvUploadText(reader.result as string); };
    reader.readAsText(file);
  }

  async function deleteQuestion(id: number) {
    if (!confirm("Delete question " + id + "?")) return;
    setBusy(true);
    try {
      await browserApiFetch<void>("/api/admin/questions/" + id, {
        method: "DELETE",
      });
      setQuestions((q) => q.filter((x) => x.id !== id));
      setSelectedQuestions((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
      setStatusMessage("Question " + id + " deleted.");
    } catch (error) {
      setStatusMessage(
        error instanceof Error ? error.message : "Failed to delete question.",
      );
    } finally {
      setBusy(false);
    }
  }

  function toggleSelectAll() {
    const allSelected = filteredQuestions.every(q => selectedQuestions.has(q.id));
    if (allSelected) {
      // Deselect all filtered
      setSelectedQuestions((prev) => {
        const next = new Set(prev);
        filteredQuestions.forEach(q => next.delete(q.id));
        return next;
      });
    } else {
      // Select all filtered
      setSelectedQuestions((prev) => {
        const next = new Set(prev);
        filteredQuestions.forEach(q => next.add(q.id));
        return next;
      });
    }
  }

  function toggleSelectQuestion(id: number) {
    setSelectedQuestions((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }

  async function deleteSelectedQuestions() {
    const ids = Array.from(selectedQuestions);
    if (ids.length === 0) {
      setStatusMessage("No questions selected.");
      return;
    }
    if (!confirm(`Delete ${ids.length} selected question(s)? This cannot be undone.`)) return;
    
    setBusy(true);
    let deleted = 0;
    const errors: string[] = [];
    
    for (const id of ids) {
      try {
        await browserApiFetch<void>("/api/admin/questions/" + id, { method: "DELETE" });
        deleted++;
      } catch (err) {
        errors.push(`Question ${id}: ${err instanceof Error ? err.message : "Failed"}`);
      }
    }
    
    // Refresh the list
    await loadQuestions(questionFilterExamId === "all" ? undefined : Number(questionFilterExamId));
    setSelectedQuestions(new Set());
    
    let msg = `Deleted ${deleted} question(s).`;
    if (errors.length > 0) {
      msg += ` ${errors.length} failed.`;
    }
    setStatusMessage(msg);
    setBusy(false);
  }

  async function deleteAllFiltered() {
    const ids = filteredQuestions.map(q => q.id);
    if (ids.length === 0) {
      setStatusMessage("No questions to delete.");
      return;
    }
    if (!confirm(`Delete ALL ${ids.length} questions in the current filter? This cannot be undone.`)) return;
    
    setBusy(true);
    let deleted = 0;
    const errors: string[] = [];
    
    for (const id of ids) {
      try {
        await browserApiFetch<void>("/api/admin/questions/" + id, { method: "DELETE" });
        deleted++;
      } catch (err) {
        errors.push(`Question ${id}: ${err instanceof Error ? err.message : "Failed"}`);
      }
    }
    
    // Refresh the list
    await loadQuestions(questionFilterExamId === "all" ? undefined : Number(questionFilterExamId));
    setSelectedQuestions(new Set());
    
    let msg = `Deleted ${deleted} question(s).`;
    if (errors.length > 0) {
      msg += ` ${errors.length} failed.`;
    }
    setStatusMessage(msg);
    setBusy(false);
  }

  async function bulkPublishQuestions() {
    const ids = Array.from(selectedQuestions);
    if (ids.length === 0) return;
    
    setBusy(true);
    let updated = 0;
    const errors: string[] = [];
    
    for (const id of ids) {
      try {
        await browserApiFetch<void>("/api/admin/questions/" + id, {
          method: "PATCH",
          body: JSON.stringify({ status: "published" }),
        });
        updated++;
      } catch (err) {
        errors.push(String(id));
      }
    }
    
    await loadQuestions(questionFilterExamId === "all" ? undefined : Number(questionFilterExamId));
    setSelectedQuestions(new Set());
    setStatusMessage(`Published ${updated} question(s). ${errors.length > 0 ? `${errors.length} failed.` : ""}`);
    setBusy(false);
  }

  async function bulkUnpublishQuestions() {
    const ids = Array.from(selectedQuestions);
    if (ids.length === 0) return;
    
    setBusy(true);
    let updated = 0;
    const errors: string[] = [];
    
    for (const id of ids) {
      try {
        await browserApiFetch<void>("/api/admin/questions/" + id, {
          method: "PATCH",
          body: JSON.stringify({ status: "draft" }),
        });
        updated++;
      } catch (err) {
        errors.push(String(id));
      }
    }
    
    await loadQuestions(questionFilterExamId === "all" ? undefined : Number(questionFilterExamId));
    setSelectedQuestions(new Set());
    setStatusMessage(`Unpublished ${updated} question(s). ${errors.length > 0 ? `${errors.length} failed.` : ""}`);
    setBusy(false);
  }

  const filteredQuestions = questions
    .filter((q) => !searchQuery || q.prompt.toLowerCase().includes(searchQuery.toLowerCase()))
    .filter((q) => questionFilterType === "all" || q.questionType === questionFilterType)
    .filter((q) => questionFilterStatus === "all" || q.status === questionFilterStatus)
    .filter((q) => questionFilterEco === "all" || q.ecoDomain === questionFilterEco)
    .filter((q) => questionFilterDifficulty === "all" || q.difficulty === questionFilterDifficulty)
    .filter((q) => questionFilterPerf === "all" || q.performanceDomain === questionFilterPerf);

  const paginatedQuestions = filteredQuestions.slice((page - 1) * pageSize, page * pageSize);
  const total = filteredQuestions.length;
  const allFilteredSelected = filteredQuestions.length > 0 && filteredQuestions.every(q => selectedQuestions.has(q.id));

  return (
    <>
      {statusMessage && (
        <div className="alert alert-info alert-dismissible fade show mb-3">
          {statusMessage}
          <button type="button" className="btn-close" onClick={() => setStatusMessage("")} />
        </div>
      )}

      {/* Autocomplete datalists for ECO/Performance domains */}
      <datalist id="eco-domain-suggestions">
        {[...new Set([...ecoDomains.map((d) => d.name), ...questions.map((q) => q.ecoDomain).filter(Boolean)])].map((v) => <option key={v} value={v!} />)}
      </datalist>
      <datalist id="perf-domain-suggestions">
        {[...new Set([...perfDomains.map((d) => d.name), ...questions.map((q) => q.performanceDomain).filter(Boolean)])].map((v) => <option key={v} value={v!} />)}
      </datalist>

      {/* Question Form */}
      {showQuestionForm && (
        <div className="card border-0 shadow-sm mb-3">
          <div className="card-header bg-white fw-bold">
            <i className="bi bi-pencil-square me-2"></i>{editingQuestion ? "Edit Question #" + editingQuestion.id : "New Question"}
          </div>
          <div className="card-body">
            <form onSubmit={(e) => { e.preventDefault(); createQuestion(); }}>
              <div className="row g-3">
                <div className="col-md-3">
                  <label className="form-label small fw-semibold">Test</label>
                  <select className="form-select form-select-sm" value={questionForm.examId} onChange={(e) => setQuestionForm({ ...questionForm, examId: e.target.value })} disabled={!!editingQuestion}>
                    {exams.map((e) => <option key={e.id} value={e.id}>{e.title}</option>)}
                  </select>
                </div>
                <div className="col-md-3">
                  <label className="form-label small fw-semibold">Question Type</label>
                  <select className="form-select form-select-sm" value={questionForm.questionType} onChange={(e) => {
                    const qt = e.target.value as "single_choice" | "multiple_response" | "true_false";
                    const defaults: Record<string, Partial<typeof questionForm>> = {
                      true_false: { optionA: "True", optionB: "False", optionC: "", optionD: "", optionE: "", correctAnswer: "A" },
                      multiple_response: { correctAnswer: "A,B" },
                      single_choice: { correctAnswer: "A" }
                    };
                    setQuestionForm({ ...questionForm, questionType: qt, ...defaults[qt] });
                  }}>
                    <option value="single_choice">Single Choice (A/B/C/D)</option>
                    <option value="multiple_response">Multiple Response</option>
                    <option value="true_false">True / False</option>
                  </select>
                </div>
                <div className="col-md-3">
                  <label className="form-label small fw-semibold">Status</label>
                  <select className="form-select form-select-sm" value={questionForm.status} onChange={(e) => setQuestionForm({ ...questionForm, status: e.target.value as "draft" | "published" })}>
                    <option value="published">Published</option>
                    <option value="draft">Draft</option>
                  </select>
                </div>
                <div className="col-md-3">
                  <label className="form-label small fw-semibold">Difficulty</label>
                  <select className="form-select form-select-sm" value={questionForm.difficulty} onChange={(e) => setQuestionForm({ ...questionForm, difficulty: e.target.value as "easy" | "medium" | "hard" | "" })}>
                    <option value="">— Select —</option>
                    <option value="easy">Easy</option>
                    <option value="medium">Medium</option>
                    <option value="hard">Hard</option>
                  </select>
                </div>
                <div className="col-md-3">
                  <label className="form-label small fw-semibold">ECO Domain</label>
                  <input className="form-control form-control-sm" list="eco-domain-suggestions" placeholder="e.g. People, Process" value={questionForm.ecoDomain} onChange={(e) => setQuestionForm({ ...questionForm, ecoDomain: e.target.value })} />
                </div>
                <div className="col-md-4">
                  <label className="form-label small fw-semibold">Performance Domain</label>
                  <input className="form-control form-control-sm" list="perf-domain-suggestions" placeholder="e.g. Team, Planning, Delivery" value={questionForm.performanceDomain} onChange={(e) => setQuestionForm({ ...questionForm, performanceDomain: e.target.value })} />
                </div>
                <div className="col-12">
                  <label className="form-label small fw-semibold">Question Prompt</label>
                  <textarea className="form-control form-control-sm" rows={3} placeholder="Enter the question text..." value={questionForm.prompt} onChange={(e) => setQuestionForm({ ...questionForm, prompt: e.target.value })} required />
                </div>
                <div className="col-md-6">
                  <label className="form-label small fw-semibold">Option A</label>
                  <input className="form-control form-control-sm" value={questionForm.optionA} onChange={(e) => setQuestionForm({ ...questionForm, optionA: e.target.value })} required />
                </div>
                <div className="col-md-6">
                  <label className="form-label small fw-semibold">Option B</label>
                  <input className="form-control form-control-sm" value={questionForm.optionB} onChange={(e) => setQuestionForm({ ...questionForm, optionB: e.target.value })} required />
                </div>
                {questionForm.questionType !== "true_false" && (
                  <>
                    <div className="col-md-6">
                      <label className="form-label small fw-semibold">Option C</label>
                      <input className="form-control form-control-sm" value={questionForm.optionC} onChange={(e) => setQuestionForm({ ...questionForm, optionC: e.target.value })} required />
                    </div>
                    <div className="col-md-6">
                      <label className="form-label small fw-semibold">Option D</label>
                      <input className="form-control form-control-sm" value={questionForm.optionD} onChange={(e) => setQuestionForm({ ...questionForm, optionD: e.target.value })} required />
                    </div>
                    <div className="col-md-6">
                      <label className="form-label small fw-semibold">Option E <span className="text-muted fw-normal">(optional)</span></label>
                      <input className="form-control form-control-sm" value={questionForm.optionE} onChange={(e) => setQuestionForm({ ...questionForm, optionE: e.target.value })} placeholder="Leave empty for 4-option questions" />
                    </div>
                  </>
                )}
                <div className="col-md-3">
                  <label className="form-label small fw-semibold">Correct Answer{questionForm.questionType === "multiple_response" ? " (comma-separated)" : ""}</label>
                  {questionForm.questionType === "multiple_response" ? (
                    <input className="form-control form-control-sm" placeholder="e.g. A,C" value={questionForm.correctAnswer} onChange={(e) => setQuestionForm({ ...questionForm, correctAnswer: e.target.value.toUpperCase() })} required />
                  ) : (
                    <select className="form-select form-select-sm" value={questionForm.correctAnswer} onChange={(e) => setQuestionForm({ ...questionForm, correctAnswer: e.target.value })}>
                      <option value="A">A</option>
                      <option value="B">B</option>
                      {questionForm.questionType !== "true_false" && <option value="C">C</option>}
                      {questionForm.questionType !== "true_false" && <option value="D">D</option>}
                      {questionForm.questionType !== "true_false" && questionForm.optionE && <option value="E">E</option>}
                    </select>
                  )}
                </div>
                <div className="col-md-9">
                  <label className="form-label small fw-semibold">Explanation</label>
                  <input className="form-control form-control-sm" placeholder="Brief explanation shown after answer" value={questionForm.explanation} onChange={(e) => setQuestionForm({ ...questionForm, explanation: e.target.value })} required />
                </div>
                <div className="col-12">
                  <label className="form-label small fw-semibold">Image <span className="text-muted fw-normal">(optional — for questions with charts, diagrams, etc.)</span></label>
                  <div className="d-flex gap-2 align-items-start">
                    <div className="flex-grow-1">
                      <input className="form-control form-control-sm" placeholder="Image URL or upload a file →" value={questionForm.imageUrl} onChange={(e) => setQuestionForm({ ...questionForm, imageUrl: e.target.value })} />
                    </div>
                    <label className="btn btn-sm btn-outline-secondary flex-shrink-0 mb-0" style={{ cursor: "pointer" }}>
                      <i className="bi bi-upload me-1"></i>Upload
                      <input type="file" accept="image/*" className="d-none" onChange={async (e) => {
                        const file = e.target.files?.[0];
                        if (!file) return;
                        if (file.size > 5 * 1024 * 1024) { setStatusMessage("File too large (max 5 MB)"); return; }
                        setStatusMessage("Uploading image...");
                        const fd = new FormData();
                        fd.append("image", file);
                        try {
                          const uploadUrl = apiUrl + "/api/admin/questions/upload-image";
                          console.log("Uploading to:", uploadUrl);
                          const res = await fetch(uploadUrl, { method: "POST", body: fd, credentials: "include" });
                          console.log("Upload response status:", res.status);
                          if (!res.ok) { 
                            const text = await res.text().catch(() => "");
                            console.error("Upload error response:", text);
                            let msg = "Upload failed";
                            try { const d = JSON.parse(text); msg = d.message || msg; } catch { msg = text || msg; }
                            throw new Error(msg); 
                          }
                          const data = await res.json() as { imageUrl: string };
                          console.log("Upload success:", data);
                          setQuestionForm((prev) => ({ ...prev, imageUrl: data.imageUrl }));
                          setStatusMessage("✓ Image uploaded successfully!");
                        } catch (err) {
                          console.error("Upload error:", err);
                          setStatusMessage("Upload failed: " + (err instanceof Error ? err.message : "Unknown error"));
                        }
                        e.target.value = "";
                      }} />
                    </label>
                    <button type="button" className="btn btn-sm btn-outline-primary flex-shrink-0" onClick={openAssetPicker}>
                      <i className="bi bi-folder2-open me-1"></i>Choose Existing
                    </button>
                  </div>
                  {questionForm.imageUrl && (
                    <div className="mt-3 p-3 border rounded bg-light">
                      <div className="d-flex justify-content-between align-items-center mb-2">
                        <span className="small fw-semibold text-muted">Image Preview</span>
                        <button 
                          type="button" 
                          className="btn btn-sm btn-link text-danger p-0" 
                          onClick={() => setQuestionForm(prev => ({ ...prev, imageUrl: "" }))}
                        >
                          <i className="bi bi-trash me-1"></i>Remove
                        </button>
                      </div>
                      <img 
                        src={resolveImageUrl(questionForm.imageUrl) ?? undefined} 
                        alt="Question image preview" 
                        style={{ maxHeight: 200, maxWidth: "100%", borderRadius: 4, display: "block" }} 
                      />
                      <code className="small text-muted d-block mt-2 text-truncate">{questionForm.imageUrl}</code>
                    </div>
                  )}
                </div>
              </div>
              <div className="mt-3 d-flex gap-2">
                <button type="submit" className="btn btn-sm btn-primary" disabled={busy}>
                  {busy ? "Saving..." : editingQuestion ? "Update Question" : "Create Question"}
                </button>
                <button type="button" className="btn btn-sm btn-outline-secondary" onClick={() => { setShowQuestionForm(false); setEditingQuestion(null); setShowAssetPicker(false); }}>Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}

      <AdminModal
        open={showAssetPicker}
        title="Choose Existing Image"
        onClose={() => setShowAssetPicker(false)}
        size="lg"
        footer={<button type="button" className="btn btn-light" onClick={() => setShowAssetPicker(false)}>Close</button>}
      >
        <div className="d-flex justify-content-between align-items-center gap-2 mb-3">
          <div className="text-muted small">Pick an image from the uploaded questions assets folder.</div>
          <button type="button" className="btn btn-sm btn-outline-secondary" onClick={() => void loadAvailableAssets()} disabled={assetPickerBusy}>
            <i className="bi bi-arrow-clockwise me-1"></i>Refresh
          </button>
        </div>
        {assetPickerBusy && availableAssets.length === 0 ? (
          <div className="text-center text-muted py-4">Loading assets...</div>
        ) : availableAssets.length === 0 ? (
          <div className="text-center text-muted py-4">No existing images found in the asset folder.</div>
        ) : (
          <div className="row g-3">
            {availableAssets.map((asset) => (
              <div key={asset.filename} className="col-6 col-md-4 col-lg-3">
                <button type="button" className="card h-100 border-0 shadow-sm text-start w-100 p-0" onClick={() => chooseAsset(asset)} style={{ overflow: "hidden" }}>
                  <div className="bg-light d-flex align-items-center justify-content-center" style={{ height: 120 }}>
                    <img src={apiUrl + asset.url} alt={asset.filename} style={{ maxWidth: "100%", maxHeight: "100%", objectFit: "contain" }} />
                  </div>
                  <div className="card-body p-2">
                    <div className="small fw-semibold text-truncate" title={asset.filename}>{asset.filename}</div>
                    <div className="small text-muted text-truncate" title={asset.url}>{asset.url}</div>
                  </div>
                </button>
              </div>
            ))}
          </div>
        )}
      </AdminModal>

      {/* CSV Upload */}
      {showCsvUpload && (
        <div className="card border-0 shadow-sm mb-3">
          <div className="card-header bg-white fw-bold">
            <i className="bi bi-filetype-csv me-2"></i>Upload Questions via CSV
          </div>
          <div className="card-body">
            <div className="row g-3">
              <div className="col-md-4">
                <label className="form-label small fw-semibold">Target Test</label>
                <select className="form-select form-select-sm" value={csvUploadExamId} onChange={(e) => setCsvUploadExamId(e.target.value)}>
                  {exams.map((e) => <option key={e.id} value={e.id}>{e.title} ({e.slug})</option>)}
                </select>
              </div>
              <div className="col-md-8">
                <label className="form-label small fw-semibold">CSV File</label>
                <input type="file" className="form-control form-control-sm" accept=".csv" onChange={handleCsvFile} />
              </div>
              <div className="col-12">
                <label className="form-label small fw-semibold">Or paste CSV text</label>
                <textarea className="form-control form-control-sm font-monospace" rows={4} placeholder={"prompt,optionA,optionB,optionC,optionD,optionE,correctAnswer,explanation,ecoDomain,performanceDomain,imageUrl\\n\"What is...\",\"A\",\"B\",\"C\",\"D\",\"E\",\"B\",\"Because...\",\"Process\",\"Team\",\"chart.png\""} value={csvUploadText} onChange={(e) => setCsvUploadText(e.target.value)} />
              </div>
              <div className="col-12">
                <div className="alert alert-info py-2 small mb-0">
                  <strong>Required columns:</strong> prompt, optionA, optionB, optionC, optionD, optionE, correctAnswer, explanation<br />
                  <strong>Optional columns:</strong> ecoDomain, performanceDomain, imageUrl, status, difficulty<br />
                  <strong>Auto-detection:</strong> Question type is inferred — 2 options = True/False, comma-separated answers = Multiple Response<br />
                  <strong>Images:</strong> Upload images in <strong>Assets</strong> tab first, then use filename in imageUrl column
                </div>
              </div>
            </div>
            <div className="mt-3 d-flex gap-2">
              <button className="btn btn-sm btn-primary" onClick={uploadQuestionsCsv} disabled={busy || !csvUploadText.trim()}>
                {busy ? "Uploading..." : "Upload & Import"}
              </button>
              <button className="btn btn-sm btn-outline-secondary" onClick={() => { setShowCsvUpload(false); setCsvUploadText(""); }}>Cancel</button>
            </div>
          </div>
        </div>
      )}

      <div className="toolbar" style={{ justifyContent: "space-between" }}>
        <div className="d-flex gap-2 flex-wrap">
          <button className="btn btn-secondary btn-sm" onClick={() => { setCsvUploadExamId(questionFilterExamId !== "all" ? String(questionFilterExamId) : (exams[0]?.id?.toString() ?? "1")); setShowCsvUpload(true); }} disabled={busy}>
            <i className="bi bi-upload me-1"></i>Import CSV
          </button>
          <button className="btn btn-outline-info btn-sm" onClick={async () => {
            try {
              const params = new URLSearchParams();
              if (questionFilterExamId !== "all") params.set("examId", String(questionFilterExamId));
              const res = await fetch(`/api/admin/questions/export${params.toString() ? "?" + params.toString() : ""}`, { credentials: "include" });
              if (!res.ok) throw new Error("Export failed");
              const blob = await res.blob();
              const url = URL.createObjectURL(blob);
              const a = document.createElement("a");
              a.href = url;
              const disposition = res.headers.get("Content-Disposition") ?? "";
              const match = disposition.match(/filename=([^;]+)/);
              a.download = match ? match[1] : "questions-export.csv";
              a.click();
              URL.revokeObjectURL(url);
              setStatusMessage("CSV exported.");
            } catch (err) { setStatusMessage(err instanceof Error ? err.message : "Export failed"); }
          }} disabled={busy || questions.length === 0}>
            <i className="bi bi-download me-1"></i>Export
          </button>
        </div>
        <button className="btn btn-primary btn-sm" onClick={() => { setEditingQuestion(null); setQuestionForm(getDefaultQuestionForm()); setShowQuestionForm(true); }} disabled={busy}>
          <i className="bi bi-plus-lg me-1"></i>Add Question
        </button>
      </div>

      <div className="toolbar">
        <div className="search-box">
          <input type="text" className="form-control form-control-sm" placeholder="Search questions..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
        </div>
        <select className="form-select form-select-sm" style={{ width: "auto" }} value={questionFilterType} onChange={(e) => setQuestionFilterType(e.target.value)}>
          <option value="all">All Types</option>
          <option value="single_choice">Single Choice</option>
          <option value="multiple_response">Multiple Response</option>
          <option value="true_false">True / False</option>
        </select>
        <select className="form-select form-select-sm" style={{ width: "auto" }} value={questionFilterEco} onChange={(e) => setQuestionFilterEco(e.target.value)}>
          <option value="all">All Domains</option>
          {[...new Set(questions.map((q) => q.ecoDomain).filter(Boolean))].sort().map((d) => <option key={d} value={d!}>{d}</option>)}
        </select>
        <select className="form-select form-select-sm" style={{ width: "auto" }} value={questionFilterDifficulty} onChange={(e) => setQuestionFilterDifficulty(e.target.value)}>
          <option value="all">All Difficulty</option>
          <option value="easy">Easy</option>
          <option value="medium">Medium</option>
          <option value="hard">Hard</option>
        </select>
        <select className="form-select form-select-sm" style={{ width: "auto" }} value={questionFilterStatus} onChange={(e) => setQuestionFilterStatus(e.target.value)}>
          <option value="all">All Status</option>
          <option value="published">Published</option>
          <option value="draft">Draft</option>
        </select>
        <select className="form-select form-select-sm" style={{ width: "auto" }} value={questionFilterProductId === "all" ? "all" : String(questionFilterProductId)} onChange={(e) => { const v = e.target.value === "all" ? "all" as const : Number(e.target.value); setQuestionFilterProductId(v); setQuestionFilterExamId("all"); if (v === "all") { loadQuestions(); } else { const firstExam = exams.find((ex) => ex.productId === v); if (firstExam) { loadQuestions(firstExam.id); } else { loadQuestions(); } } }}>
          <option value="all">All Products</option>
          {products.map((p) => <option key={p.id} value={p.id}>{p.title}</option>)}
        </select>
        <select className="form-select form-select-sm" style={{ width: "auto" }} value={questionFilterExamId === "all" ? "all" : String(questionFilterExamId)} onChange={(e) => { const v = e.target.value === "all" ? "all" as const : Number(e.target.value); setQuestionFilterExamId(v); if (v === "all") { loadQuestions(); } else { loadQuestions(v); } }}>
          <option value="all">All Exams</option>
          {exams.filter((e) => questionFilterProductId === "all" || e.productId === questionFilterProductId).map((e) => <option key={e.id} value={String(e.id)}>{e.title}</option>)}
        </select>
        <select className="form-select form-select-sm" style={{ width: "auto" }} value={questionFilterPerf} onChange={(e) => setQuestionFilterPerf(e.target.value)}>
          <option value="all">All Perf.</option>
          {[...new Set(questions.map((q) => q.performanceDomain).filter(Boolean))].sort().map((d) => <option key={d} value={d!}>{d}</option>)}
        </select>
      </div>

      <div className="card border-0 shadow-sm">
        {questions.length === 0 ? (
          <div className="card-body text-center py-5 text-muted">
            <i className="bi bi-question-circle fs-1 d-block mb-2"></i>
            Select a test or load all questions.
          </div>
        ) : (
          <>
            <div className="table-responsive" style={{ maxHeight: 500, overflowY: "auto" }}>
              <div className="d-flex gap-2 p-2 border-bottom bg-light justify-content-end">
                {selectedQuestions.size > 0 && (
                  <>
                    <button 
                      className="btn btn-sm btn-success" 
                      onClick={bulkPublishQuestions}
                      disabled={busy}
                    >
                      <i className="bi bi-check-circle me-1"></i>
                      Publish Selected ({selectedQuestions.size})
                    </button>
                    <button 
                      className="btn btn-sm btn-secondary" 
                      onClick={bulkUnpublishQuestions}
                      disabled={busy}
                    >
                      <i className="bi bi-eye-slash me-1"></i>
                      Unpublish Selected ({selectedQuestions.size})
                    </button>
                    <button 
                      className="btn btn-sm btn-outline-danger" 
                      onClick={deleteSelectedQuestions}
                      disabled={busy}
                    >
                      <i className="bi bi-trash me-1"></i>
                      Delete Selected ({selectedQuestions.size})
                    </button>
                  </>
                )}
                {filteredQuestions.length > 0 && selectedQuestions.size === 0 && (
                  <button 
                    className="btn btn-sm btn-outline-danger" 
                    onClick={deleteAllFiltered}
                    disabled={busy}
                  >
                    <i className="bi bi-trash me-1"></i>
                    Delete All ({filteredQuestions.length})
                  </button>
                )}
              </div>
              <table className="table table-hover align-middle mb-0 small">
              <thead className="table-light" style={{ position: "sticky", top: 0, zIndex: 1 }}>
                <tr>
                  <th style={{ width: 40 }}>
                    <input 
                      className="form-check-input" 
                      type="checkbox" 
                      checked={allFilteredSelected}
                      onChange={toggleSelectAll}
                      disabled={filteredQuestions.length === 0 || busy}
                    />
                  </th>
                  <th>ID</th>
                  <th>Question</th>
                  <th>Type</th>
                  <th>ECO Domain</th>
                  <th>Perf. Domain</th>
                  <th>Difficulty</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {paginatedQuestions.map((q) => (
                  <tr 
                    key={q.id} 
                    className={selectedQuestions.has(q.id) ? "table-primary" : ""}
                    style={{ cursor: "pointer" }}
                    onClick={(e) => {
                      // Don't trigger if clicking on checkbox
                      if ((e.target as HTMLElement).tagName === "INPUT") return;
                      setEditingQuestion(q); 
                      setQuestionForm({ 
                        examId: String(q.examId), 
                        questionType: q.questionType ?? "single_choice", 
                        prompt: q.prompt, 
                        optionA: q.optionA, 
                        optionB: q.optionB, 
                        optionC: q.optionC, 
                        optionD: q.optionD, 
                        optionE: q.optionE ?? "", 
                        correctAnswer: q.correctAnswer, 
                        explanation: q.explanation, 
                        ecoDomain: q.ecoDomain ?? "", 
                        performanceDomain: q.performanceDomain ?? "", 
                        imageUrl: q.imageUrl ?? "", 
                        difficulty: (q.difficulty as "easy" | "medium" | "hard" | "") ?? "", 
                        status: q.status ?? "published" 
                      }); 
                      setShowQuestionForm(true);
                    }}
                  >
                    <td onClick={(e) => e.stopPropagation()}>
                      <input 
                        className="form-check-input" 
                        type="checkbox" 
                        checked={selectedQuestions.has(q.id)}
                        onChange={() => toggleSelectQuestion(q.id)}
                        disabled={busy}
                      />
                    </td>
                    <td>{q.id}</td>
                    <td className="text-truncate" style={{ maxWidth: 300 }}>{q.imageUrl ? <i className="bi bi-image text-info me-1" title={resolveImageUrl(q.imageUrl) ?? undefined}></i> : null}{q.prompt}</td>
                    <td>{q.questionType === "single_choice" ? "Single Choice" : q.questionType === "multiple_response" ? "Multiple Response" : "True / False"}</td>
                    <td className="small text-muted">{q.ecoDomain ?? "\u2014"}</td>
                    <td className="small text-muted">{q.performanceDomain ?? "\u2014"}</td>
                    <td><StatusBadge status={q.difficulty ?? "\u2014"} /></td>
                    <td><StatusBadge status={q.status ?? "published"} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {total > 0 && (
            <div className="d-flex justify-content-between align-items-center p-3 border-top">
              <div className="small text-muted">
                Showing {(page - 1) * pageSize + 1}-{Math.min(page * pageSize, total)} of {total} questions
              </div>
              <div className="d-flex align-items-center gap-3">
                <select
                  className="form-select form-select-sm"
                  style={{ width: "auto" }}
                  value={pageSize}
                  onChange={(e) => { setPageSize(Number(e.target.value)); setPage(1); }}
                >
                  <option value={10}>10</option>
                  <option value={25}>25</option>
                  <option value={50}>50</option>
                  <option value={100}>100</option>
                </select>
                <ul className="pagination pagination-sm mb-0">
                  <li className={`page-item${page === 1 ? " disabled" : ""}`}>
                    <button className="page-link" onClick={() => setPage(page - 1)} disabled={page === 1}>Previous</button>
                  </li>
                  <li className={`page-item${page * pageSize >= total ? " disabled" : ""}`}>
                    <button className="page-link" onClick={() => setPage(page + 1)} disabled={page * pageSize >= total}>Next</button>
                  </li>
                </ul>
              </div>
            </div>
          )}
        </>)}
      </div>
    </>
  );
}
