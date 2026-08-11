// src/middlewares/authenticated.ts

import { Request, Response, NextFunction } from "express";
import { verifyToken } from "../utils/auth";
import { UnauthorizedError } from "../Errors";
import { isBlacklisted } from "../utils/tokenBlacklist";

export const authenticated = (req: Request, res: Response, next: NextFunction) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    throw new UnauthorizedError("No token provided");
  }

  const token = authHeader.split(" ")[1];

  if (isBlacklisted(token)) {
    throw new UnauthorizedError("Token has been revoked. Please log in again.");
  }

  const decoded = verifyToken(token);

  req.user = decoded;
  next();
};
