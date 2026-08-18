import { Suspense } from "react";

import { CheckoutScreen } from "./screen";
import { PublicNavbar } from "../PublicNavbar";
import { Footer } from "../Footer";
import { SkeletonCheckout } from "../../components/Skeleton";

export default function CheckoutPage() {
  return (
    <>
      <PublicNavbar />
      <Suspense fallback={<SkeletonCheckout />}>
        <CheckoutScreen />
      </Suspense>
      <Footer />
    </>
  );
}