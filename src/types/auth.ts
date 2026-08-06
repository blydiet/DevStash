export interface SignInActionResult {
  success: boolean;
  error?: string;
  unverified?: boolean;
  email?: string;
}
