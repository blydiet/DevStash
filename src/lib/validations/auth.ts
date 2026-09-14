import { z } from "zod";

const MAX_PASSWORD_LENGTH = 100;

export const credentialsSchema = z.object({
  email: z.email(),
  password: z.string().min(1).max(MAX_PASSWORD_LENGTH),
});

export const registerSchema = z
  .object({
    name: z.string().min(1),
    email: z.email(),
    password: z
      .string()
      .min(8, "Password must be at least 8 characters")
      .max(MAX_PASSWORD_LENGTH, `Password must be at most ${MAX_PASSWORD_LENGTH} characters`),
    confirmPassword: z
      .string()
      .min(8, "Password must be at least 8 characters")
      .max(MAX_PASSWORD_LENGTH, `Password must be at most ${MAX_PASSWORD_LENGTH} characters`),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

export const forgotPasswordSchema = z.object({
  email: z.email(),
});

export const resetPasswordSchema = z
  .object({
    password: z
      .string()
      .min(8, "Password must be at least 8 characters")
      .max(MAX_PASSWORD_LENGTH, `Password must be at most ${MAX_PASSWORD_LENGTH} characters`),
    confirmPassword: z
      .string()
      .min(8, "Password must be at least 8 characters")
      .max(MAX_PASSWORD_LENGTH, `Password must be at most ${MAX_PASSWORD_LENGTH} characters`),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

export const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1).max(MAX_PASSWORD_LENGTH),
    newPassword: z
      .string()
      .min(8, "Password must be at least 8 characters")
      .max(MAX_PASSWORD_LENGTH, `Password must be at most ${MAX_PASSWORD_LENGTH} characters`),
    confirmPassword: z
      .string()
      .min(8, "Password must be at least 8 characters")
      .max(MAX_PASSWORD_LENGTH, `Password must be at most ${MAX_PASSWORD_LENGTH} characters`),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });
