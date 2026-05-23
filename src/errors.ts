// Trace: FR-020, FR-021, NFR-004, AC-008
export type CustomViewerErrorCode =
  | "RendererNotFound"
  | "RendererPathInvalid"
  | "RendererIndexMissing"
  | "RendererManifestInvalid"
  | "RendererBlockedByTrust";

export interface CustomViewerErrorDetails {
  extension?: string;
  id?: string;
  path?: string;
  reason?: string;
}

export class CustomViewerError extends Error {
  public readonly code: CustomViewerErrorCode;
  public readonly details: CustomViewerErrorDetails;

  public constructor(code: CustomViewerErrorCode, message: string, details: CustomViewerErrorDetails = {}) {
    super(message);
    this.name = "CustomViewerError";
    this.code = code;
    this.details = details;
  }
}

export function formatErrorMessage(error: unknown): string {
  if (error instanceof CustomViewerError) {
    return error.message;
  }

  if (error instanceof Error) {
    return error.message;
  }

  return String(error);
}