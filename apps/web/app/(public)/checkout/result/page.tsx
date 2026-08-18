import { Suspense } from "react";
import { CheckoutResultScreen } from "./screen";
import { PublicNavbar } from "../../PublicNavbar";
import { Footer } from "../../Footer";
import { SkeletonCard } from "../../../components/Skeleton";

export default function CheckoutResultPage() {
  return (
    <>
      <PublicNavbar />
      <Suspense fallback={<div className="container py-5 animate-fade" style={{ maxWidth: 600, margin: "0 auto" }}><SkeletonCard lines={4} /></div>}>
        <CheckoutResultScreen />
      </Suspense>
      <Footer />
    </>
  );
}
