import { describe, expect, it } from "vitest";
import {
  changePasswordSchema,
  credentialsSchema,
  forgotPasswordSchema,
  registerSchema,
  resetPasswordSchema,
} from "@/lib/validations/auth";

describe("credentialsSchema", () => {
  it("accepts a valid email and non-empty password", () => {
    const result = credentialsSchema.safeParse({ email: "a@b.com", password: "x" });
    expect(result.success).toBe(true);
  });

  it("rejects an invalid email", () => {
    const result = credentialsSchema.safeParse({ email: "not-an-email", password: "x" });
    expect(result.success).toBe(false);
  });

  it("rejects an empty password", () => {
    const result = credentialsSchema.safeParse({ email: "a@b.com", password: "" });
    expect(result.success).toBe(false);
  });
});

describe("registerSchema", () => {
  const base = {
    name: "Ada",
    email: "ada@example.com",
    password: "password1",
    confirmPassword: "password1",
  };

  it("accepts matching passwords of sufficient length", () => {
    expect(registerSchema.safeParse(base).success).toBe(true);
  });

  it("rejects mismatched passwords with an error on confirmPassword", () => {
    const result = registerSchema.safeParse({ ...base, confirmPassword: "different" });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].path).toEqual(["confirmPassword"]);
      expect(result.error.issues[0].message).toBe("Passwords do not match");
    }
  });

  it("rejects a password shorter than 8 characters", () => {
    const result = registerSchema.safeParse({ ...base, password: "short", confirmPassword: "short" });
    expect(result.success).toBe(false);
  });

  it("rejects an empty name", () => {
    const result = registerSchema.safeParse({ ...base, name: "" });
    expect(result.success).toBe(false);
  });
});

describe("forgotPasswordSchema", () => {
  it("accepts a valid email", () => {
    expect(forgotPasswordSchema.safeParse({ email: "a@b.com" }).success).toBe(true);
  });

  it("rejects an invalid email", () => {
    expect(forgotPasswordSchema.safeParse({ email: "nope" }).success).toBe(false);
  });
});

describe("resetPasswordSchema", () => {
  it("accepts matching passwords of sufficient length", () => {
    const result = resetPasswordSchema.safeParse({
      password: "password1",
      confirmPassword: "password1",
    });
    expect(result.success).toBe(true);
  });

  it("rejects mismatched passwords", () => {
    const result = resetPasswordSchema.safeParse({
      password: "password1",
      confirmPassword: "password2",
    });
    expect(result.success).toBe(false);
  });
});

describe("changePasswordSchema", () => {
  it("accepts a valid current + matching new passwords", () => {
    const result = changePasswordSchema.safeParse({
      currentPassword: "old-password",
      newPassword: "newpassword1",
      confirmPassword: "newpassword1",
    });
    expect(result.success).toBe(true);
  });

  it("rejects an empty current password", () => {
    const result = changePasswordSchema.safeParse({
      currentPassword: "",
      newPassword: "newpassword1",
      confirmPassword: "newpassword1",
    });
    expect(result.success).toBe(false);
  });

  it("rejects mismatched new passwords", () => {
    const result = changePasswordSchema.safeParse({
      currentPassword: "old-password",
      newPassword: "newpassword1",
      confirmPassword: "different1",
    });
    expect(result.success).toBe(false);
  });
});
