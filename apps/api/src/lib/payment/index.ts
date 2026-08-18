import type { PaymentProvider } from "./types.js";
import { billplzProvider } from "./billplz.js";
import { paypalProvider } from "./paypal.js";
import { toyyibpayProvider } from "./toyyibpay.js";
import { stripeProvider } from "./stripe.js";

/** Registry of all available payment providers, keyed by name. */
const providers = new Map<string, PaymentProvider>();

// Register built-in providers
providers.set(toyyibpayProvider.name, toyyibpayProvider);
providers.set(stripeProvider.name, stripeProvider);
providers.set(paypalProvider.name, paypalProvider);
providers.set(billplzProvider.name, billplzProvider);

/**
 * Register a new payment provider at runtime.
 * Call this at startup for any additional providers.
 */
export function registerProvider(provider: PaymentProvider) {
  providers.set(provider.name, provider);
}

/** Get a provider by name. Throws if not found. */
export function getProvider(name: string): PaymentProvider {
  const provider = providers.get(name);
  if (!provider) {
    throw new Error(`Payment provider "${name}" is not registered. Available: ${[...providers.keys()].join(", ")}`);
  }
  return provider;
}

/** Get the default (first registered) provider. */
export function getDefaultProvider(): PaymentProvider {
  const first = providers.values().next();
  if (first.done) {
    throw new Error("No payment providers registered");
  }
  return first.value;
}

/** List all registered provider names. */
export function listProviders(): string[] {
  return [...providers.keys()];
}

export type { PaymentProvider, CreateBillRequest, CreateBillResult, VerifyCallbackResult, PaymentStatus } from "./types.js";
