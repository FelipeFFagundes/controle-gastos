export class HttpError extends Error {
  constructor(status, message, extra = {}) {
    super(message);
    this.status = status;
    this.extra = extra;
  }
}

export const badRequest = (message, extra) => new HttpError(400, message, extra);
export const notFound = (message) => new HttpError(404, message);
export const conflict = (message, extra) => new HttpError(409, message, extra);
