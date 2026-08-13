import { httpsCallable } from "firebase/functions";
import { auth, functions } from "../firebase";

export async function requestBrandedVerificationEmail() {
  const user = auth?.currentUser;
  if (!user) throw new Error("Sign in before requesting an email verification link.");
  if (user.emailVerified) return { sent: false, alreadyVerified: true };
  if (!functions) throw new Error("The verification email service is not configured.");

  const requestVerificationEmail = httpsCallable(functions, "requestVerificationEmail", { timeout: 30000 });
  const result = await requestVerificationEmail();
  return { sent: result.data?.queued === true, alreadyVerified: result.data?.alreadyVerified === true };
}
