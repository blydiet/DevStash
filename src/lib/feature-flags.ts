export function isEmailVerificationEnabled() {
  return process.env.EMAIL_VERIFICATION_ENABLED !== "false";
}
