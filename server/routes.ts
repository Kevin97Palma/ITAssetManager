/**
 * ARCHIVO PRINCIPAL DE RUTAS DEL BACKEND
 * 
 * Este archivo contiene todas las rutas de la API REST del sistema de gestión de activos IT.
 * El sistema está estructurado como un backend de microservicios con separación clara de responsabilidades:
 * 
 * ARQUITECTURA DEL SISTEMA:
 * - Modelo MVC: Controladores (routes) -> Servicios (storage) -> Modelos (schema)
 * - Autenticación: Replit OIDC con roles jerárquicos y sesiones seguras
 * - Base de Datos: PostgreSQL con Drizzle ORM para operaciones type-safe
 * - Validación: Esquemas Zod para validación de entrada y tipos TypeScript
 * 
 * ROLES Y PERMISOS:
 * - super_admin: Acceso completo a todas las empresas y configuración del sistema
 * - manager_owner: Gestión completa de su empresa (crear/editar/eliminar activos)
 * - technical_admin: Gestión técnica (activos, contratos, licencias, mantenimiento)
 * - technician: Solo lectura y creación de registros de mantenimiento
 * 
 * SEGURIDAD:
 * - Todas las rutas requieren autenticación via middleware isAuthenticated
 * - Validación de entrada con esquemas Zod antes de procesar datos
 * - Scope de empresa: Todos los datos están aislados por companyId
 * - Logging de actividad: Todas las acciones se registran para auditoría
 */

import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupSession, isAuthenticated, passwordUtils } from "./auth";
import {
  insertAssetSchema,
  insertContractSchema,
  insertLicenseSchema,
  insertMaintenanceRecordSchema,
  insertCompanySchema,
  insertNotificationSchema,
  companyRegistrationSchema,
  loginSchema,
} from "@shared/schema";

/**
 * FUNCIÓN PRINCIPAL DE REGISTRO DE RUTAS
 * 
 * Esta función configura todas las rutas de la API y el middleware de autenticación.
 * Retorna un servidor HTTP configurado para producción.
 * 
 * @param app - Aplicación Express configurada
 * @returns Servidor HTTP listo para iniciar
 */
export async function registerRoutes(app: Express): Promise<Server> {
  // Configurar middleware de sesiones
  setupSession(app);

  // =============================================================================
  // RUTAS PÚBLICAS (sin autenticación)
  // =============================================================================
  
  /**
   * POST /api/register
   * Registra una nueva empresa con su usuario administrador.
   * NO requiere autenticación (ruta pública)
   */
  app.post('/api/register', async (req: any, res) => {
    try {
      const registrationData = companyRegistrationSchema.parse(req.body);
      
      // Hash the password before storing
      const passwordHash = await passwordUtils.hash(registrationData.password);
      
      // Register company with hashed password
      const result = await storage.registerCompany({
        ...registrationData,
        passwordHash,
      });
      
      // Automatically log in the user after registration
      req.session.userId = result.user.id;
      req.session.email = result.user.email;
      req.session.firstName = result.user.firstName;
      req.session.lastName = result.user.lastName;
      req.session.role = result.user.role;
      
      res.json({
        message: "Empresa registrada exitosamente",
        company: result.company,
        user: {
          id: result.user.id,
          email: result.user.email,
          firstName: result.user.firstName,
          lastName: result.user.lastName,
          role: result.user.role,
        },
      });
    } catch (error: any) {
      console.error("Error registering company:", error);
      if (error.message === "El email ya está registrado") {
        res.status(400).json({ message: error.message });
      } else if (error.code === '23505') {
        res.status(400).json({ 
          message: "Ya existe una empresa con este RUC/Cédula o email" 
        });
      } else {
        res.status(500).json({ message: "Error al registrar empresa" });
      }
    }
  });

  /**
   * POST /api/login
   * Inicia sesión con email y contraseña.
   * NO requiere autenticación (ruta pública)
   */
  app.post('/api/login', async (req: any, res) => {
    try {
      const { email, password } = loginSchema.parse(req.body);
      
      // Find user by email
      const user = await storage.getUserByEmail(email);
      if (!user) {
        return res.status(401).json({ message: "Email o contraseña incorrectos" });
      }
      
      // Verify password
      const isValidPassword = await passwordUtils.verify(password, user.passwordHash);
      if (!isValidPassword) {
        return res.status(401).json({ message: "Email o contraseña incorrectos" });
      }
      
      // Create session
      req.session.userId = user.id;
      req.session.email = user.email;
      req.session.firstName = user.firstName;
      req.session.lastName = user.lastName;
      req.session.role = user.role;
      
      res.json({
        message: "Login exitoso",
        user: {
          id: user.id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          role: user.role,
        },
      });
    } catch (error: any) {
      console.error("Error during login:", error);
      res.status(500).json({ message: "Error al iniciar sesión" });
    }
  });

  /**
   * POST /api/logout
   * Cierra la sesión del usuario.
   */
  app.post('/api/logout', (req: any, res) => {
    req.session.destroy((err: any) => {
      if (err) {
        return res.status(500).json({ message: "Error al cerrar sesión" });
      }
      res.json({ message: "Sesión cerrada exitosamente" });
    });
  });

  // =============================================================================
  // RUTAS DE AUTENTICACIÓN
  // =============================================================================
  
  /**
   * GET /api/auth/user
   * Obtiene la información del usuario autenticado actual.
   * 
   * FUNCIONALIDAD:
   * - Extrae el ID de usuario desde la sesión (req.session.userId)
   * - Consulta los datos completos del usuario en la base de datos
   * - Retorna el perfil del usuario con rol y metadatos
   * 
   * SEGURIDAD: Requiere autenticación válida via isAuthenticated middleware
   * USADO POR: Header, perfil de usuario, verificación de permisos
   */
  app.get('/api/auth/user', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.session.userId;
      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ message: "Usuario no encontrado" });
      }
      // Don't send password hash to frontend
      const { passwordHash, ...userWithoutPassword } = user;
      res.json(userWithoutPassword);
    } catch (error) {
      console.error("Error fetching user:", error);
      res.status(500).json({ message: "Failed to fetch user" });
    }
  });

  // =============================================================================
  // RUTAS DE GESTIÓN DE EMPRESAS
  // =============================================================================
  
  /**
   * GET /api/companies
   * Obtiene todas las empresas a las que pertenece el usuario autenticado.
   * 
   * FUNCIONALIDAD:
   * - Lista las empresas donde el usuario tiene asignado un rol
   * - Incluye información del plan (PyME/Professional) y límites
   * - Filtra solo empresas activas donde el usuario tiene permisos
   * 
   * MODELO DE DATOS: Retorna UserCompany[] con información anidada de Company
   * USADO POR: Selector de empresa, dashboard, navegación
   */
  app.get('/api/companies', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.session.userId;
      const userCompanies = await storage.getUserCompanies(userId);
      res.json(userCompanies);
    } catch (error) {
      console.error("Error fetching companies:", error);
      res.status(500).json({ message: "Failed to fetch companies" });
    }
  });

  /**
   * POST /api/companies
   * Crea una nueva empresa y asigna al usuario como manager_owner.
   * 
   * FUNCIONALIDAD:
   * - Valida los datos de entrada con insertCompanySchema (Zod)
   * - Crea la empresa con valores por defecto según el plan seleccionado
   * - Asigna automáticamente al creador como manager_owner
   * - Registra la acción en el log de auditoría
   * 
   * VALIDACIÓN: Esquema Zod garantiza integridad de datos
   * AUDITORÍA: Todas las creaciones se registran con detalles completos
   * AUTORIZACIÓN: El creador automáticamente recibe permisos de propietario
   */
  app.post('/api/companies', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.session.userId;
      const validatedData = insertCompanySchema.parse(req.body);
      
      const company = await storage.createCompany(validatedData);
      await storage.addUserToCompany(userId, company.id, "manager_owner");
      
      // Registrar actividad para auditoría
      await storage.logActivity({
        companyId: company.id,
        userId,
        action: "created",
        entityType: "company",
        entityId: company.id,
        entityName: company.name,
      });
      
      res.json(company);
    } catch (error) {
      console.error("Error creating company:", error);
      res.status(400).json({ message: "Failed to create company" });
    }
  });

  // =============================================================================
  // RUTAS DE DASHBOARD Y ANALYTICS
  // =============================================================================
  
  /**
   * GET /api/dashboard/:companyId/summary
   * Obtiene el resumen ejecutivo de costos y activos para el dashboard principal.
   * 
   * FUNCIONALIDAD:
   * - Calcula costos totales mensuales y anuales por categoría
   * - Cuenta activos por tipo (físicos, aplicaciones, licencias, contratos)
   * - Agrega datos de múltiples fuentes (assets, licenses, contracts, maintenance)
   * - Optimizado para mostrar KPIs en tiempo real
   * 
   * MODELO DE DATOS:
   * costs: { monthlyTotal, annualTotal, licenseCosts, maintenanceCosts, hardwareCosts, contractCosts }
   * assets: { totalAssets, physicalAssets, applications, licenses, contracts }
   * 
   * USADO POR: Dashboard principal, gráficos de resumen, reportes ejecutivos
   */
  app.get('/api/dashboard/:companyId/summary', isAuthenticated, async (req: any, res) => {
    try {
      const { companyId } = req.params;
      const costSummary = await storage.getCompanyCostSummary(companyId);
      const assetCounts = await storage.getAssetCounts(companyId);
      
      res.json({
        costs: costSummary,
        assets: assetCounts,
      });
    } catch (error) {
      console.error("Error fetching dashboard summary:", error);
      res.status(500).json({ message: "Failed to fetch dashboard summary" });
    }
  });

  /**
   * GET /api/dashboard/:companyId/activity
   * Obtiene el log de actividad reciente para mostrar en el dashboard.
   * 
   * FUNCIONALIDAD:
   * - Lista las últimas acciones realizadas en la empresa (crear, editar, eliminar)
   * - Incluye información del usuario que realizó la acción
   * - Parámetro opcional 'limit' para controlar cantidad de registros
   * - Ordenado por fecha de creación descendente (más recientes primero)
   * 
   * USADO POR: Timeline de actividad, auditoría, seguimiento de cambios
   */
  app.get('/api/dashboard/:companyId/activity', isAuthenticated, async (req: any, res) => {
    try {
      const { companyId } = req.params;
      const limit = parseInt(req.query.limit as string) || 10;
      const activity = await storage.getRecentActivity(companyId, limit);
      res.json(activity);
    } catch (error) {
      console.error("Error fetching recent activity:", error);
      res.status(500).json({ message: "Failed to fetch recent activity" });
    }
  });

  // =============================================================================
  // RUTAS DE GESTIÓN DE ACTIVOS
  // =============================================================================
  
  /**
   * GET /api/assets/:companyId
   * Obtiene todos los activos de una empresa específica.
   * 
   * FUNCIONALIDAD:
   * - Lista activos físicos (laptops, servidores, impresoras, etc.)
   * - Lista aplicaciones (SaaS, desarrollo personalizado)
   * - Incluye información de costos, estado, y fechas de vencimiento
   * - Filtrado automático por companyId para seguridad multi-tenant
   * 
   * MODELO UNIFICADO: Un solo endpoint para todos los tipos de activos
   * USADO POR: Tabla de activos, inventario, reportes, dashboard
   */
  app.get('/api/assets/:companyId', isAuthenticated, async (req: any, res) => {
    try {
      const { companyId } = req.params;
      const assets = await storage.getAssetsByCompany(companyId);
      res.json(assets);
    } catch (error) {
      console.error("Error fetching assets:", error);
      res.status(500).json({ message: "Failed to fetch assets" });
    }
  });

  app.post('/api/assets', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.session.userId;
      const validatedData = insertAssetSchema.parse(req.body);
      
      const asset = await storage.createAsset(validatedData);
      
      await storage.logActivity({
        companyId: validatedData.companyId,
        userId,
        action: "created",
        entityType: "asset",
        entityId: asset.id,
        entityName: asset.name,
      });
      
      res.json(asset);
    } catch (error) {
      console.error("Error creating asset:", error);
      res.status(400).json({ message: "Failed to create asset" });
    }
  });

  app.put('/api/assets/:id', isAuthenticated, async (req: any, res) => {
    try {
      const { id } = req.params;
      const userId = req.session.userId;
      const validatedData = insertAssetSchema.partial().parse(req.body);
      
      const asset = await storage.updateAsset(id, validatedData);
      
      await storage.logActivity({
        companyId: asset.companyId,
        userId,
        action: "updated",
        entityType: "asset",
        entityId: asset.id,
        entityName: asset.name,
      });
      
      res.json(asset);
    } catch (error) {
      console.error("Error updating asset:", error);
      res.status(400).json({ message: "Failed to update asset" });
    }
  });

  app.delete('/api/assets/:id/:companyId', isAuthenticated, async (req: any, res) => {
    try {
      const { id, companyId } = req.params;
      const userId = req.session.userId;
      
      const asset = await storage.getAssetById(id, companyId);
      if (!asset) {
        return res.status(404).json({ message: "Asset not found" });
      }
      
      await storage.deleteAsset(id, companyId);
      
      await storage.logActivity({
        companyId,
        userId,
        action: "deleted",
        entityType: "asset",
        entityId: id,
        entityName: asset.name,
      });
      
      res.json({ message: "Asset deleted successfully" });
    } catch (error) {
      console.error("Error deleting asset:", error);
      res.status(500).json({ message: "Failed to delete asset" });
    }
  });

  // Contract routes
  app.get('/api/contracts/:companyId', isAuthenticated, async (req: any, res) => {
    try {
      const { companyId } = req.params;
      const contracts = await storage.getContractsByCompany(companyId);
      res.json(contracts);
    } catch (error) {
      console.error("Error fetching contracts:", error);
      res.status(500).json({ message: "Failed to fetch contracts" });
    }
  });

  app.post('/api/contracts', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.session.userId;
      const validatedData = insertContractSchema.parse(req.body);
      
      const contract = await storage.createContract(validatedData);
      
      await storage.logActivity({
        companyId: validatedData.companyId,
        userId,
        action: "created",
        entityType: "contract",
        entityId: contract.id,
        entityName: contract.name,
      });
      
      res.json(contract);
    } catch (error) {
      console.error("Error creating contract:", error);
      res.status(400).json({ message: "Failed to create contract" });
    }
  });

  // License routes
  app.get('/api/licenses/:companyId', isAuthenticated, async (req: any, res) => {
    try {
      const { companyId } = req.params;
      const licenses = await storage.getLicensesByCompany(companyId);
      res.json(licenses);
    } catch (error) {
      console.error("Error fetching licenses:", error);
      res.status(500).json({ message: "Failed to fetch licenses" });
    }
  });

  app.post('/api/licenses', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.session.userId;
      const validatedData = insertLicenseSchema.parse(req.body);
      
      const license = await storage.createLicense(validatedData);
      
      await storage.logActivity({
        companyId: validatedData.companyId,
        userId,
        action: "created",
        entityType: "license",
        entityId: license.id,
        entityName: license.name,
      });
      
      res.json(license);
    } catch (error) {
      console.error("Error creating license:", error);
      res.status(400).json({ message: "Failed to create license" });
    }
  });

  // Maintenance routes
  app.get('/api/maintenance/:companyId', isAuthenticated, async (req: any, res) => {
    try {
      const { companyId } = req.params;
      const records = await storage.getMaintenanceRecordsByCompany(companyId);
      res.json(records);
    } catch (error) {
      console.error("Error fetching maintenance records:", error);
      res.status(500).json({ message: "Failed to fetch maintenance records" });
    }
  });

  app.get('/api/maintenance/asset/:assetId/:companyId', isAuthenticated, async (req: any, res) => {
    try {
      const { assetId, companyId } = req.params;
      const records = await storage.getMaintenanceRecordsByAsset(assetId, companyId);
      res.json(records);
    } catch (error) {
      console.error("Error fetching asset maintenance records:", error);
      res.status(500).json({ message: "Failed to fetch asset maintenance records" });
    }
  });

  app.post('/api/maintenance', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.session.userId;
      const validatedData = insertMaintenanceRecordSchema.parse(req.body);
      
      const record = await storage.createMaintenanceRecord(validatedData);
      
      await storage.logActivity({
        companyId: validatedData.companyId,
        userId,
        action: "created",
        entityType: "maintenance_record",
        entityId: record.id,
        entityName: `Maintenance for ${record.description}`,
      });
      
      res.json(record);
    } catch (error) {
      console.error("Error creating maintenance record:", error);
      res.status(400).json({ message: "Failed to create maintenance record" });
    }
  });

  // Technician routes
  app.get('/api/technicians/:companyId', isAuthenticated, async (req: any, res) => {
    try {
      const { companyId } = req.params;
      const technicians = await storage.getTechniciansByCompany(companyId);
      res.json(technicians);
    } catch (error) {
      console.error("Error fetching technicians:", error);
      res.status(500).json({ message: "Failed to fetch technicians" });
    }
  });

  // Notification routes
  app.get('/api/notifications/:companyId', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.session.userId;
      const { companyId } = req.params;
      const notifications = await storage.getNotificationsByUser(userId, companyId);
      res.json(notifications);
    } catch (error) {
      console.error("Error fetching notifications:", error);
      res.status(500).json({ message: "Failed to fetch notifications" });
    }
  });

  app.get('/api/notifications/unread-count/:companyId', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.session.userId;
      const { companyId } = req.params;
      const count = await storage.getUnreadNotificationCount(userId, companyId);
      res.json({ count });
    } catch (error) {
      console.error("Error fetching unread notification count:", error);
      res.status(500).json({ message: "Failed to fetch unread notification count" });
    }
  });

  app.post('/api/notifications/:id/mark-read', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.session.userId;
      const { id } = req.params;
      await storage.markNotificationAsRead(id, userId);
      res.json({ success: true });
    } catch (error) {
      console.error("Error marking notification as read:", error);
      res.status(500).json({ message: "Failed to mark notification as read" });
    }
  });

  app.post('/api/notifications/create-expiry-alerts/:companyId', isAuthenticated, async (req: any, res) => {
    try {
      const { companyId } = req.params;
      await storage.createExpiryNotifications(companyId);
      res.json({ success: true });
    } catch (error) {
      console.error("Error creating expiry notifications:", error);
      res.status(500).json({ message: "Failed to create expiry notifications" });
    }
  });

  // Admin routes (Super Admin only)
  app.get('/api/admin/companies', isAuthenticated, async (req: any, res) => {
    try {
      const user = await storage.getUser(req.session.userId);
      if (user?.role !== 'super_admin') {
        return res.status(403).json({ message: "Access denied. Super admin required." });
      }
      
      const companies = await storage.getAllCompanies();
      res.json(companies);
    } catch (error) {
      console.error("Error fetching companies:", error);
      res.status(500).json({ message: "Failed to fetch companies" });
    }
  });

  app.put('/api/admin/companies/:companyId/plan', isAuthenticated, async (req: any, res) => {
    try {
      const user = await storage.getUser(req.session.userId);
      if (user?.role !== 'super_admin') {
        return res.status(403).json({ message: "Access denied. Super admin required." });
      }
      
      const { companyId } = req.params;
      const { plan, maxUsers, maxAssets } = req.body;
      
      if (!['pyme', 'professional'].includes(plan)) {
        return res.status(400).json({ message: "Invalid plan type" });
      }
      
      const updatedCompany = await storage.updateCompanyPlan(companyId, plan, maxUsers, maxAssets);
      res.json(updatedCompany);
    } catch (error) {
      console.error("Error updating company plan:", error);
      res.status(500).json({ message: "Failed to update company plan" });
    }
  });

  app.put('/api/admin/companies/:companyId/status', isAuthenticated, async (req: any, res) => {
    try {
      const user = await storage.getUser(req.session.userId);
      if (user?.role !== 'super_admin') {
        return res.status(403).json({ message: "Access denied. Super admin required." });
      }
      
      const { companyId } = req.params;
      const { isActive } = req.body;
      
      const updatedCompany = await storage.toggleCompanyStatus(companyId, isActive);
      res.json(updatedCompany);
    } catch (error) {
      console.error("Error updating company status:", error);
      res.status(500).json({ message: "Failed to update company status" });
    }
  });

  // Super Admin - Support Mode Routes
  app.post('/api/admin/support-access/:companyId', isAuthenticated, async (req: any, res) => {
    try {
      const user = await storage.getUser(req.session.userId);
      if (user?.role !== 'super_admin') {
        return res.status(403).json({ message: "Access denied. Super admin required." });
      }
      
      const { companyId } = req.params;
      const company = await storage.getCompanyById(companyId);
      
      if (!company) {
        return res.status(404).json({ message: "Company not found" });
      }
      
      // Set support mode session flag
      req.session.supportMode = {
        companyId: companyId,
        adminId: user.id,
        startTime: new Date().toISOString()
      };
      
      // Log this access for auditing
      await storage.logActivity({
        companyId: companyId,
        userId: user.id,
        action: "accessed",
        entityType: "company",
        entityId: companyId,
        entityName: `Support access to ${company.name}`,
      });
      
      res.json({ 
        message: "Support access granted", 
        company: company,
        supportMode: true 
      });
    } catch (error) {
      console.error("Error granting support access:", error);
      res.status(500).json({ message: "Failed to grant support access" });
    }
  });

  app.post('/api/admin/exit-support', isAuthenticated, async (req: any, res) => {
    try {
      const user = await storage.getUser(req.session.userId);
      if (user?.role !== 'super_admin') {
        return res.status(403).json({ message: "Access denied. Super admin required." });
      }
      
      if (req.session.supportMode) {
        const supportInfo = req.session.supportMode;
        
        // Log exit from support mode
        await storage.logActivity({
          companyId: supportInfo.companyId,
          userId: user.id,
          action: "exited",
          entityType: "company",
          entityId: supportInfo.companyId,
          entityName: "Exited support mode",
        });
        
        delete req.session.supportMode;
      }
      
      res.json({ message: "Exited support mode", supportMode: false });
    } catch (error) {
      console.error("Error exiting support mode:", error);
      res.status(500).json({ message: "Failed to exit support mode" });
    }
  });

  app.get('/api/admin/support-status', isAuthenticated, async (req: any, res) => {
    try {
      const user = await storage.getUser(req.session.userId);
      if (user?.role !== 'super_admin') {
        return res.status(403).json({ message: "Access denied. Super admin required." });
      }
      
      const supportMode = req.session.supportMode || null;
      let currentCompany = null;
      
      if (supportMode) {
        currentCompany = await storage.getCompanyById(supportMode.companyId);
      }
      
      res.json({ 
        supportMode: !!supportMode,
        company: currentCompany,
        startTime: supportMode?.startTime || null
      });
    } catch (error) {
      console.error("Error checking support status:", error);
      res.status(500).json({ message: "Failed to check support status" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
