import { HttpError } from "@/lib/server/validators";

export interface SerializedError {
  status: number;
  message: string;
  code: string;
}

export function toSerializedError(error: unknown): SerializedError {
  if (error instanceof HttpError) {
    return {
      status: error.status,
      message: error.message,
      code: "HTTP_ERROR",
    };
  }

  if (error instanceof Error) {
    return {
      status: 500,
      message: error.message,
      code: "UNEXPECTED_ERROR",
    };
  }

  return {
    status: 500,
    message: "Unexpected server error",
    code: "UNKNOWN",
  };
}
