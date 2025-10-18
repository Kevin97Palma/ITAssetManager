/**
 * MÓDULO DE AUTENTICACIÓN
 *
 * Sistema de autenticación basado en email/password con sesiones
 * NO depende de servicios externos como Replit OIDC
 *
 * Características:
 * - Hash de contraseñas con bcrypt
 * - Sesiones persistentes con express-session
 * - Middleware para proteger rutas
 * - Endpoints de login/logout/verificación
 */
import connectPgSimple from "connect-pg-simple";
import {
  type Express,
  type Request,
  type Response,
  type NextFunction,
} from "express";
import session from "express-session";
import bcrypt from "bcrypt";
const pgSessionStore = connectPgSimple(session);
// Extender tipos de Express para incluir información de sesión
declare module "express-session" {
  interface SessionData {
    userId: string;
    email: string;
    firstName: string;
    lastName: string;
    role: string;
  }
}

/**
 * Configurar middleware de sesiones
 *
 * VARIABLES DE ENTORNO REQUERIDAS:
 * - SESSION_SECRET: Secret para firmar cookies de sesión (requerido en producción)
 * - NODE_ENV: 'development' | 'production'
 *
 * En producción, considere usar connect-pg-simple para almacenar sesiones en PostgreSQL
 */
export function setupSession(app: Express) {
  const sessionSecret =
    process.env.SESSION_SECRET || "dev-secret-change-in-production";

  if (
    process.env.NODE_ENV === "production" &&
    sessionSecret === "dev-secret-change-in-production"
  ) {
    console.warn(
      "⚠️  WARNING: Usando SESSION_SECRET por defecto en producción. Configure SESSION_SECRET en variables de entorno."
    );
  }

  app.use(
    session({
      secret: sessionSecret,
      resave: false,
      saveUninitialized: false,
      cookie: {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production", // HTTPS en producción
        maxAge: 1000 * 60 * 60 * 24 * 7, // 7 días
        sameSite: "lax",
      },
      // En producción, usar almacenamiento persistente:
      store: new pgSessionStore({
        conString: process.env.DATABASE_URL,
        tableName: "sessions",
      }),
    })
  );
}

/**
 * Middleware de autenticación
 * Protege rutas verificando que el usuario esté autenticado
 *
 * USO:
 * app.get('/api/protected', isAuthenticated, (req, res) => { ... });
 */
export function isAuthenticated(
  req: Request,
  res: Response,
  next: NextFunction
) {
  if (req.session && req.session.userId) {
    return next();
  }

  return res.status(401).json({
    message: "Unauthorized",
    error: "Debe iniciar sesión para acceder a este recurso",
  });
}

/**
 * Utilidades de hash para contraseñas
 */
export const passwordUtils = {
  /**
   * Crear hash de contraseña usando bcrypt
   * @param password - Contraseña en texto plano
   * @returns Hash bcrypt de la contraseña
   */
  async hash(password: string): Promise<string> {
    const saltRounds = 10;
    return bcrypt.hash(password, saltRounds);
  },

  /**
   * Verificar contraseña contra hash
   * @param password - Contraseña en texto plano
   * @param hash - Hash almacenado en la base de datos
   * @returns true si la contraseña coincide
   */
  async verify(password: string, hash: string): Promise<boolean> {
    return bcrypt.compare(password, hash);
  },
};
