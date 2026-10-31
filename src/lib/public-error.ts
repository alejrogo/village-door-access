const FALLBACK = "Ha ocurrido un error inesperado. Recarga la página.";

const INTERNAL = /prisma|database_url|econn|password|secret|stack|errno/iu;

function thrownMessage(error: unknown): string | undefined {
  if (typeof error === "string") {
    return error;
  }
  if (error instanceof Error) {
    return error.message;
  }
  return undefined;
}

/** Visitor-facing copy. Hide implementation details from thrown Error messages. */
export function publicErrorMessage(error: unknown): string {
  const message = thrownMessage(error);
  if (!message || INTERNAL.test(message)) {
    return FALLBACK;
  }
  return message;
}

/** Rethrow so SSR does not serialize Prisma / env details into the HTML stream. */
export function rethrowPublic(err: unknown): never {
  throw new Error(publicErrorMessage(err));
}
