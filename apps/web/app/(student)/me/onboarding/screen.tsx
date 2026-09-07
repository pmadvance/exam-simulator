"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { browserApiFetch } from "../../../../lib/api";

type Profile = {
  age: number | null;
  occupation: string | null;
  gender: string | null;
};

export function OnboardingScreen() {
  const router = useRouter();
  const [age, setAge] = useState("");
  const [occupation, setOccupation] = useState("");
  const [gender, setGender] = useState("");
  const [certification, setCertification] = useState("");
  const [examDate, setExamDate] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    void browserApiFetch<Profile>("/api/auth/me")
      .then((profile) => {
        setAge(profile.age ? String(profile.age) : "");
        setOccupation(profile.occupation ?? "");
        setGender(profile.gender ?? "");
      })
      .catch(() => setMessage("We could not load your profile. You may skip this step."));
  }, []);

  async function save(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setMessage("");
    try {
      await browserApiFetch("/api/auth/profile", {
        method: "PATCH",
        body: JSON.stringify({
          age: age ? Number(age) : null,
          occupation: occupation.trim() || null,
          gender: gender || null,
        }),
      });
      if (examDate) {
        await browserApiFetch("/api/exam-goal", {
          method: "PUT",
          body: JSON.stringify({ examDate, certificationLabel: certification || undefined }),
        });
      }
      router.push("/me/dashboard");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to save your profile.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="container py-5" style={{ maxWidth: 680 }}>
      <div className="card border-0 shadow-sm">
        <div className="card-body p-4 p-md-5">
          <p className="text-uppercase fw-semibold small mb-2" style={{ color: "#E8792B", letterSpacing: ".08em" }}>Optional</p>
          <h1 className="h3 fw-bold">Tell us a little about yourself</h1>
          <p className="text-muted">This helps PM Exam Pro understand who it serves. You can skip this now or change it later in Account.</p>
          <form onSubmit={save}>
            <div className="row g-3">
              <div className="col-sm-4">
                <label className="form-label" htmlFor="onboardingAge">Age</label>
                <input id="onboardingAge" className="form-control" type="number" min={13} max={120} value={age} onChange={(event) => setAge(event.target.value)} />
              </div>
              <div className="col-sm-8">
                <label className="form-label" htmlFor="onboardingOccupation">Occupation</label>
                <input id="onboardingOccupation" className="form-control" maxLength={120} value={occupation} onChange={(event) => setOccupation(event.target.value)} autoComplete="organization-title" />
              </div>
              <div className="col-12">
                <label className="form-label" htmlFor="onboardingGender">Gender</label>
                <select id="onboardingGender" className="form-select" value={gender} onChange={(event) => setGender(event.target.value)}>
                  <option value="">Prefer not to say</option>
                  <option value="female">Female</option>
                  <option value="male">Male</option>
                  <option value="non_binary">Non-binary</option>
                  <option value="other">Other</option>
                </select>
              </div>
              <div className="col-sm-7">
                <label className="form-label" htmlFor="onboardingCertification">Target certification</label>
                <select id="onboardingCertification" className="form-select" value={certification} onChange={(event) => setCertification(event.target.value)}>
                  <option value="">Choose later</option>
                  <option value="PMP">PMP®</option>
                  <option value="CAPM">CAPM®</option>
                  <option value="PMI-RMP">PMI-RMP®</option>
                  <option value="PMI-ACP">PMI-ACP®</option>
                </select>
              </div>
              <div className="col-sm-5">
                <label className="form-label" htmlFor="onboardingExamDate">Planned exam date</label>
                <input id="onboardingExamDate" className="form-control" type="date" min={new Date().toISOString().slice(0, 10)} value={examDate} onChange={(event) => setExamDate(event.target.value)} />
              </div>
            </div>
            {message && <div className="alert alert-warning mt-3 mb-0" role="status">{message}</div>}
            <div className="d-flex flex-wrap gap-2 mt-4">
              <button className="btn btn-primary" type="submit" disabled={busy}>{busy ? "Saving…" : "Save and continue"}</button>
              <Link className="btn btn-outline-secondary" href="/me/dashboard">Skip for now</Link>
            </div>
          </form>
        </div>
      </div>
    </main>
  );
}
