import { Response, Request, NextFunction, ErrorRequestHandler } from "express";
import { AppError } from "../Errors";
import { StatusCodes } from "http-status-codes";
import Jwt from "jsonwebtoken";
import { IErrorResponse } from "../utils/response";

export const errorHandler: ErrorRequestHandler = (
  err: any,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  let statusCode: number = StatusCodes.INTERNAL_SERVER_ERROR;
  let message: string = err.message || "Internal Server Error";
  let details: any | undefined = err.message;

  if (err.cause) {
    details = err.cause.message || err.cause;
  }

  if (err instanceof AppError) {
    statusCode = err.statusCode;
    message = err.message;
    details = err.details;
  } else if (err.name === "ZodError") {
    statusCode = 400;
    message = "Validation failed";
    details = err.errors.map((error: any) => ({
      field: error.path.join("."),
      message: error.message,
    }));
  } else if (err instanceof Jwt.JsonWebTokenError) {
    statusCode = 401;
    message = "Invalid token";
  } else if (err instanceof Jwt.TokenExpiredError) {
    statusCode = 401;
    message = "Token expired";
  } else if (err.name === "MulterError") {
    statusCode = 400;
    message = err.message || "File upload error";
    if (err.code === "LIMIT_FILE_SIZE") {
      statusCode = 413;
      message = "File is too large. Maximum file size is 50MB.";
    }
  } else if (err.type === "entity.too.large") {
    statusCode = 413;
    message = "The uploaded file is too large. Please upload a smaller file.";
    details = "Max request size exceeded. Limit is 50MB.";
  }

  const response: IErrorResponse = {
    success: false,
    error: {
      code: statusCode,
      message: message,
      details: details,
    },
  };

  if (statusCode >= 500) {
    console.error(`[${new Date().toISOString()}] ${err.stack || err}`);
    console.log(response);
  }
  res.status(statusCode).json(response);
};
