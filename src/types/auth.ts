export interface SignInActionResult {
  success: boolean;
  error?: string;
  unverified?: boolean;
  email?: string;
}

export interface ResetPasswordActionResult {
  success: boolean;
  error?: string;
}
