import { z } from "zod";

import { config } from "../config/env.js";

const requiredString = (label) =>
  z.string({
    error: (issue) =>
      issue.input === undefined
        ? `${label} is required`
        : `${label} must be a string`,
  });

const name = (label) =>
  requiredString(label)
    .trim()
    .min(1, `${label} must not be empty`)
    .max(80, `${label} must be at most 80 characters`);

const email = requiredString("email")
  .trim()
  .toLowerCase()
  .email("email must be a valid email address")
  .max(254);

const password = requiredString("password")
  .min(8, "password must be at least 8 characters")
  .max(72, "password must be at most 72 characters");

export const idParamSchema = z.object({
  id: z.coerce.number().int().positive("id must be a positive integer"),
});

/**
 * The ceiling comes from PAGE_MAX_LIMIT so validation and the service agree;
 * a hardcoded 100 here used to let `?limit=80` through and then silently clamp
 * it whenever PAGE_MAX_LIMIT was set lower.
 */
export const buildListUsersQuerySchema = (maxLimit) =>
  z.object({
    page: z.coerce.number().int().positive().default(1),
    limit: z.coerce
      .number()
      .int()
      .positive()
      .max(maxLimit, `limit must be at most ${maxLimit}`)
      .optional(),
  });

export const listUsersQuerySchema = buildListUsersQuerySchema(
  config.pagination.maxLimit
);

export const createUserSchema = z.object({
  firstName: name("firstName"),
  lastName: name("lastName"),
  email,
  password,
});

export const updateUserSchema = z
  .object({
    firstName: name("firstName").optional(),
    lastName: name("lastName").optional(),
    email: email.optional(),
    password: password.optional(),
  })
  .refine((value) => Object.keys(value).length > 0, {
    message: "At least one field must be provided",
  });
