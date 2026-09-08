import { httpsCallable } from "firebase/functions";
import { functions } from "../firebase";

export async function startSubscriptionCheckout(tierId, billingMode, kernelIds = []) {
  if (!functions) throw new Error("Firebase Functions is not configured.");
  const createCheckout = httpsCallable(functions, "createCheckoutSession");
  const response = await createCheckout({ tierId, billingMode, kernelIds });
  if (!response.data?.url) throw new Error("Checkout did not return a destination.");
  window.location.assign(response.data.url);
}

export async function openCustomerBillingPortal() {
  if (!functions) throw new Error("Firebase Functions is not configured.");
  const createPortal = httpsCallable(functions, "createBillingPortalSession");
  const response = await createPortal({});
  if (!response.data?.url) throw new Error("Billing portal did not return a destination.");
  window.location.assign(response.data.url);
}

export async function stageKernelSelection(tierId, kernelIds) {
  if (!functions) throw new Error("Firebase Functions is not configured.");
  const stageSelection = httpsCallable(functions, "stageKernelSelection");
  return (await stageSelection({ tierId, kernelIds })).data;
}

export async function recoverSubscriptionEntitlement() {
  if (!functions) throw new Error("Firebase Functions is not configured.");
  const recover = httpsCallable(functions, "recoverSubscriptionEntitlement");
  const response = await recover({});
  return response.data;
}
