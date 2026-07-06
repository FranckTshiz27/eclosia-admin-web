export function extractApiErrorMessage(error: unknown, fallback: string): string {
  const httpError = error as {
    error?: unknown;
    message?: string;
    statusText?: string;
  };

  const payload = httpError?.error;
  if (typeof payload === 'string' && payload.trim()) {
    return payload.trim();
  }

  if (Array.isArray(payload)) {
    const first = payload.map((item) => String(item ?? '').trim()).find(Boolean);
    if (first) {
      return first;
    }
  }

  if (payload && typeof payload === 'object') {
    const body = payload as {
      message?: string;
      error?: string;
      details?: Record<string, string>;
      errors?: Array<{ defaultMessage?: string; message?: string }>;
    };

    const message = String(body.message ?? body.error ?? '').trim();
    if (message) {
      return message;
    }

    const details = body.details;
    if (details) {
      const firstDetail = Object.values(details).map((value) => String(value).trim()).find(Boolean);
      if (firstDetail) {
        return firstDetail;
      }
    }

    const fieldErrors = body.errors;
    if (Array.isArray(fieldErrors) && fieldErrors.length) {
      const firstFieldError = fieldErrors
        .map((item) => String(item.defaultMessage ?? item.message ?? '').trim())
        .find(Boolean);
      if (firstFieldError) {
        return firstFieldError;
      }
    }
  }

  const transportMessage = String(httpError?.message ?? httpError?.statusText ?? '').trim();
  if (transportMessage && !transportMessage.startsWith('Http failure response')) {
    return transportMessage;
  }

  return fallback;
}
