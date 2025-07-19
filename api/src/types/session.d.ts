import 'express-session';

declare module 'express-session' {
  interface SessionData {
    csrfSecret?: string;
  }
}

declare global {
  namespace Express {
    interface Request {
      csrfToken?: () => string;
    }
  }
}