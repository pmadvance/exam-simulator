import { Suspense } from "react";
import { CartCheckoutScreen } from "./screen";
import { PublicNavbar } from "../../PublicNavbar";
import { Footer } from "../../Footer";
import { SkeletonCheckout } from "../../../components/Skeleton";

export default function CartCheckoutPage() {
  return (
    <>
      <PublicNavbar />
      <Suspense fallback={<SkeletonCheckout />}>
        <CartCheckoutScreen />
      </Suspense>
      <Footer />
    </>
  );
}
