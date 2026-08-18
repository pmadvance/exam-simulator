"use client";

import { useCurrency } from "../../lib/currency";

export function PriceDisplay({
  amountUsd,
  className,
  localClassName,
}: {
  amountUsd?: number;
  className?: string;
  localClassName?: string;
}) {
  const { currency, formatUsd, formatLocalFromUsd } = useCurrency();
  const usd = amountUsd ?? 0;
  const local = currency === "USD" ? null : formatLocalFromUsd(usd);
  return (
    <span className={className}>
      <span>{formatUsd(usd)}</span>
      {local ? (
        <span
          className={localClassName ?? "d-block text-muted fw-medium"}
          style={{ fontSize: "0.46em", lineHeight: 1.2, marginTop: 4 }}
        >
          Approx. {local}
        </span>
      ) : null}
    </span>
  );
}
