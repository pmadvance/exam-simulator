import { Suspense } from "react";
import { getAdminQuestions, getAdminProducts, getAdminExams } from "../../../lib/admin-api";
import { QuestionsContent } from "./QuestionsContent";

export default async function QuestionsPage() {
  const [questions, products, exams] = await Promise.all([
    getAdminQuestions(),
    getAdminProducts(),
    getAdminExams(),
  ]);

  return (
    <>
      <h1 className="page-title">Questions</h1>
      <p className="page-subtitle">Manage exam questions and content</p>
      <Suspense fallback={<div style={{ padding: "20px" }}>Loading...</div>}>
        <QuestionsContent initialQuestions={questions} products={products} exams={exams} />
      </Suspense>
    </>
  );
}
