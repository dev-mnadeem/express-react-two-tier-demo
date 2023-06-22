import express from "express";

import * as userController from "../controllers/user.controller.js";
import { validate } from "../middleware/validate.js";
import {
  createUserSchema,
  idParamSchema,
  listUsersQuerySchema,
  updateUserSchema,
} from "../validation/user.schema.js";

const router = express.Router();

router.get(
  "/",
  validate(listUsersQuerySchema, "query"),
  userController.listUsers
);

router.post("/", validate(createUserSchema), userController.createUser);

router.get(
  "/:id",
  validate(idParamSchema, "params"),
  userController.getUserById
);

router.put(
  "/:id",
  validate(idParamSchema, "params"),
  validate(updateUserSchema),
  userController.updateUser
);

router.delete(
  "/:id",
  validate(idParamSchema, "params"),
  userController.deleteUser
);

export { router as userRouter };
