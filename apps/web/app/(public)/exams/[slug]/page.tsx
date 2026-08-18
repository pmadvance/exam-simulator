import Link from "next/link";

import { getExam } from "../../../../lib/api";
import { Simulator } from "./simulator";
import { PublicNavbar } from "../../PublicNavbar";

export default async function ExamPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const exam = await getExam(slug);

  return (
    <>
    <PublicNavbar />
    <main className="shell">
      <section className="sectionHeader">
        <div>
          <p className="eyebrow">Exam In Progress</p>
          <h2>{exam.title}</h2>
        </div>
        <Link href="/#catalog" className="textLink">
          Back to catalog
        </Link>
      </section>

      <Simulator
        slug={slug}
        title={exam.title}
        timeLimitMinutes={exam.timeLimitMinutes}
        questionCount={exam.questionCount}
        productSlug={exam.productSlug}
        previewQuestion={exam.previewQuestion}
        trialQuestions={exam.trialQuestions}
      />
    </main>
    </>
  );
}
