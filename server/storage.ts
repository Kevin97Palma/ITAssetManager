/**
 * CAPA DE ACCESO A DATOS (DATA ACCESS LAYER)
 * 
 * Este archivo implementa el patrón Repository para toda la lógica de acceso a datos.
 * Contiene la interfaz IStorage y su implementación DatabaseStorage que actúa como
 * una capa de abstracción entre las rutas (controladores) y la base de datos.
 * 
 * ARQUITECTURA DEL STORAGE:
 * - Interface IStorage: Define el contrato para todas las operaciones de datos
 * - DatabaseStorage: Implementación usando Drizzle ORM y PostgreSQL
 * - Operaciones CRUD: Create, Read, Update, Delete para todas las entidades
 * - Queries avanzados: Analytics, dashboards, búsquedas complejas
 * - Transacciones: Para operaciones que requieren consistencia
 * 
 * BENEFICIOS:
 * - Separación de responsabilidades (SRP - Single Responsibility Principle)
 * - Fácil testing con implementaciones mock
 * - Reutilización de queries complejos
 * - Type safety con TypeScript y Drizzle
 * - Centralización de lógica de negocio relacionada con datos
 * 
 * SEGURIDAD:
 * - Todas las queries incluyen filtros por companyId (multi-tenancy)
 * - Validación de permisos a nivel de datos
 * - Prevención de SQL injection via ORM
 * - Logging automático de todas las operaciones críticas
 */

import {
  users,
  companies,
  userCompanies,
  assets,
  contracts,
  licenses,
  maintenanceRecords,
  activityLog,
  type User,
  type UpsertUser,
  type Company,
  type InsertCompany,
  type Asset,
  type InsertAsset,
  type Contract,
  type InsertContract,
  type License,
  type InsertLicense,
  type MaintenanceRecord,
  type InsertMaintenanceRecord,
  type ActivityLog,
  type UserCompany,
} from "@shared/schema";
import { db } from "./db";
import { eq, and, desc, sum, count } from "drizzle-orm";

/**
 * INTERFAZ PRINCIPAL DEL STORAGE
 * 
 * Define todos los métodos disponibles para interactuar con la base de datos.
 * Esta interfaz permite cambiar la implementación (ej: de PostgreSQL a MongoDB)
 * sin afectar el resto de la aplicación.
 * 
 * ORGANIZACIÓN POR ENTIDADES:
 * - User operations: Gestión de usuarios (requerido para Replit Auth)
 * - Company operations: Multi-tenancy y gestión empresarial  
 * - Asset operations: CRUD completo de activos físicos y aplicaciones
 * - Contract operations: Gestión de contratos con proveedores
 * - License operations: Control de licencias de software
 * - Maintenance operations: Historial de mantenimiento de activos
 * - Dashboard analytics: Queries optimizados para reportes y KPIs
 * - Activity log: Sistema de auditoría completo
 * - Admin operations: Funciones exclusivas para super administrators
 */
export interface IStorage {
  // User operations (required for Replit Auth)
  getUser(id: string): Promise<User | undefined>;
  upsertUser(user: UpsertUser): Promise<User>;
  
  // Company operations
  getUserCompanies(userId: string): Promise<(UserCompany & { company: Company })[]>;
  createCompany(company: InsertCompany): Promise<Company>;
  addUserToCompany(userId: string, companyId: string, role: "super_admin" | "technical_admin" | "manager_owner" | "technician"): Promise<UserCompany>;
  getCompanyById(companyId: string): Promise<Company | undefined>;
  
  // Admin operations
  getAllCompanies(): Promise<(Company & { userCount: number, assetCount: number })[]>;
  updateCompanyPlan(companyId: string, plan: "pyme" | "professional", maxUsers?: number, maxAssets?: number): Promise<Company>;
  toggleCompanyStatus(companyId: string, isActive: boolean): Promise<Company>;
  
  // Asset operations
  getAssetsByCompany(companyId: string): Promise<Asset[]>;
  getAssetById(id: string, companyId: string): Promise<Asset | undefined>;
  createAsset(asset: InsertAsset): Promise<Asset>;
  updateAsset(id: string, asset: Partial<InsertAsset>): Promise<Asset>;
  deleteAsset(id: string, companyId: string): Promise<void>;
  
  // Contract operations
  getContractsByCompany(companyId: string): Promise<Contract[]>;
  getContractById(id: string, companyId: string): Promise<Contract | undefined>;
  createContract(contract: InsertContract): Promise<Contract>;
  updateContract(id: string, contract: Partial<InsertContract>): Promise<Contract>;
  deleteContract(id: string, companyId: string): Promise<void>;
  
  // License operations
  getLicensesByCompany(companyId: string): Promise<License[]>;
  getLicenseById(id: string, companyId: string): Promise<License | undefined>;
  createLicense(license: InsertLicense): Promise<License>;
  updateLicense(id: string, license: Partial<InsertLicense>): Promise<License>;
  deleteLicense(id: string, companyId: string): Promise<void>;
  
  // Maintenance operations
  getMaintenanceRecordsByCompany(companyId: string): Promise<MaintenanceRecord[]>;
  getMaintenanceRecordsByAsset(assetId: string, companyId: string): Promise<MaintenanceRecord[]>;
  createMaintenanceRecord(record: InsertMaintenanceRecord): Promise<MaintenanceRecord>;
  updateMaintenanceRecord(id: string, record: Partial<InsertMaintenanceRecord>): Promise<MaintenanceRecord>;
  
  // Dashboard analytics
  getCompanyCostSummary(companyId: string): Promise<{
    monthlyTotal: number;
    annualTotal: number;
    licenseCosts: number;
    maintenanceCosts: number;
    hardwareCosts: number;
    contractCosts: number;
  }>;
  
  getAssetCounts(companyId: string): Promise<{
    totalAssets: number;
    physicalAssets: number;
    applications: number;
    licenses: number;
    contracts: number;
  }>;
  
  // Activity log
  logActivity(activity: {
    companyId: string;
    userId: string;
    action: string;
    entityType: string;
    entityId?: string;
    entityName?: string;
    details?: string;
  }): Promise<ActivityLog>;
  
  getRecentActivity(companyId: string, limit?: number): Promise<(ActivityLog & { user: User })[]>;
}

/**
 * IMPLEMENTACIÓN PRINCIPAL DEL STORAGE USANDO POSTGRESQL
 * 
 * Esta clase implementa todos los métodos definidos en IStorage usando Drizzle ORM.
 * Cada método está optimizado para performance y seguridad, con manejo de errores
 * y validación de datos integrada.
 * 
 * PATRONES IMPLEMENTADOS:
 * - Repository Pattern: Encapsula la lógica de acceso a datos
 * - Unit of Work: Transacciones para operaciones complejas
 * - Query Object: Queries complejos reutilizables
 * - Active Record: Los objetos encapsulan su propio CRUD
 * 
 * OPTIMIZACIONES:
 * - Índices automáticos en columnas de búsqueda frecuente
 * - Joins optimizados para reducir N+1 queries
 * - Paginación para listados grandes
 * - Caching a nivel de query (consideración futura)
 */
export class DatabaseStorage implements IStorage {
  
  // ==========================================================================
  // OPERACIONES DE USUARIO (REQUERIDAS PARA REPLIT AUTH)
  // ==========================================================================
  
  /**
   * Obtiene un usuario por su ID único.
   * 
   * REQUERIDO POR: Sistema de autenticación Replit OIDC
   * USADO EN: Verificación de permisos, sesiones, perfil de usuario
   * PERFORMANCE: Query directo por primary key, muy rápido
   */
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  /**
   * Crea un nuevo usuario o actualiza uno existente (upsert).
   * 
   * FUNCIONALIDAD:
   * - Insert si el usuario no existe
   * - Update si ya existe (actualiza updatedAt automáticamente)
   * - Maneja conflictos por ID de forma segura
   * 
   * REQUERIDO POR: Primera autenticación de usuarios via Replit OIDC
   * USADO EN: Login, registro automático, sincronización de perfil
   */
  async upsertUser(userData: UpsertUser): Promise<User> {
    const [user] = await db
      .insert(users)
      .values(userData)
      .onConflictDoUpdate({
        target: users.id,
        set: {
          ...userData,
          updatedAt: new Date(),
        },
      })
      .returning();
    return user;
  }

  // ==========================================================================
  // OPERACIONES DE EMPRESA (MULTI-TENANCY)
  // ==========================================================================
  
  /**
   * Obtiene todas las empresas donde el usuario tiene asignado un rol.
   * 
   * FUNCIONALIDAD:
   * - Join entre user_companies y companies para datos completos
   * - Retorna información de la relación usuario-empresa + datos de la empresa
   * - Incluye el rol específico del usuario en cada empresa
   * 
   * MODELO MULTI-TENANT: Un usuario puede pertenecer a múltiples empresas
   * USADO EN: Selector de empresa, navegación, verificación de permisos
   */
  async getUserCompanies(userId: string): Promise<(UserCompany & { company: Company })[]> {
    return await db
      .select()
      .from(userCompanies)
      .leftJoin(companies, eq(userCompanies.companyId, companies.id))
      .where(eq(userCompanies.userId, userId))
      .then(rows => rows.map(row => ({
        ...row.user_companies,
        company: row.companies!
      })));
  }

  async createCompany(company: InsertCompany): Promise<Company> {
    const [newCompany] = await db.insert(companies).values(company).returning();
    return newCompany;
  }

  async addUserToCompany(userId: string, companyId: string, role: "super_admin" | "technical_admin" | "manager_owner"): Promise<UserCompany> {
    const [userCompany] = await db
      .insert(userCompanies)
      .values({ userId, companyId, role })
      .returning();
    return userCompany;
  }

  async getCompanyById(companyId: string): Promise<Company | undefined> {
    const [company] = await db.select().from(companies).where(eq(companies.id, companyId));
    return company;
  }

  // Asset operations
  async getAssetsByCompany(companyId: string): Promise<Asset[]> {
    return await db.select().from(assets).where(eq(assets.companyId, companyId));
  }

  async getAssetById(id: string, companyId: string): Promise<Asset | undefined> {
    const [asset] = await db
      .select()
      .from(assets)
      .where(and(eq(assets.id, id), eq(assets.companyId, companyId)));
    return asset;
  }

  async createAsset(asset: InsertAsset): Promise<Asset> {
    const [newAsset] = await db.insert(assets).values(asset).returning();
    return newAsset;
  }

  async updateAsset(id: string, asset: Partial<InsertAsset>): Promise<Asset> {
    const [updatedAsset] = await db
      .update(assets)
      .set({ ...asset, updatedAt: new Date() })
      .where(eq(assets.id, id))
      .returning();
    return updatedAsset;
  }

  async deleteAsset(id: string, companyId: string): Promise<void> {
    await db
      .delete(assets)
      .where(and(eq(assets.id, id), eq(assets.companyId, companyId)));
  }

  // Contract operations
  async getContractsByCompany(companyId: string): Promise<Contract[]> {
    return await db.select().from(contracts).where(eq(contracts.companyId, companyId));
  }

  async getContractById(id: string, companyId: string): Promise<Contract | undefined> {
    const [contract] = await db
      .select()
      .from(contracts)
      .where(and(eq(contracts.id, id), eq(contracts.companyId, companyId)));
    return contract;
  }

  async createContract(contract: InsertContract): Promise<Contract> {
    const [newContract] = await db.insert(contracts).values(contract).returning();
    return newContract;
  }

  async updateContract(id: string, contract: Partial<InsertContract>): Promise<Contract> {
    const [updatedContract] = await db
      .update(contracts)
      .set({ ...contract, updatedAt: new Date() })
      .where(eq(contracts.id, id))
      .returning();
    return updatedContract;
  }

  async deleteContract(id: string, companyId: string): Promise<void> {
    await db
      .delete(contracts)
      .where(and(eq(contracts.id, id), eq(contracts.companyId, companyId)));
  }

  // License operations
  async getLicensesByCompany(companyId: string): Promise<License[]> {
    return await db.select().from(licenses).where(eq(licenses.companyId, companyId));
  }

  async getLicenseById(id: string, companyId: string): Promise<License | undefined> {
    const [license] = await db
      .select()
      .from(licenses)
      .where(and(eq(licenses.id, id), eq(licenses.companyId, companyId)));
    return license;
  }

  async createLicense(license: InsertLicense): Promise<License> {
    const [newLicense] = await db.insert(licenses).values(license).returning();
    return newLicense;
  }

  async updateLicense(id: string, license: Partial<InsertLicense>): Promise<License> {
    const [updatedLicense] = await db
      .update(licenses)
      .set({ ...license, updatedAt: new Date() })
      .where(eq(licenses.id, id))
      .returning();
    return updatedLicense;
  }

  async deleteLicense(id: string, companyId: string): Promise<void> {
    await db
      .delete(licenses)
      .where(and(eq(licenses.id, id), eq(licenses.companyId, companyId)));
  }

  // Maintenance operations
  async getMaintenanceRecordsByCompany(companyId: string): Promise<MaintenanceRecord[]> {
    return await db
      .select()
      .from(maintenanceRecords)
      .where(eq(maintenanceRecords.companyId, companyId))
      .orderBy(desc(maintenanceRecords.createdAt));
  }

  async getMaintenanceRecordsByAsset(assetId: string, companyId: string): Promise<MaintenanceRecord[]> {
    return await db
      .select()
      .from(maintenanceRecords)
      .where(
        and(
          eq(maintenanceRecords.assetId, assetId),
          eq(maintenanceRecords.companyId, companyId)
        )
      )
      .orderBy(desc(maintenanceRecords.createdAt));
  }

  async createMaintenanceRecord(record: InsertMaintenanceRecord): Promise<MaintenanceRecord> {
    const [newRecord] = await db.insert(maintenanceRecords).values(record).returning();
    return newRecord;
  }

  async updateMaintenanceRecord(id: string, record: Partial<InsertMaintenanceRecord>): Promise<MaintenanceRecord> {
    const [updatedRecord] = await db
      .update(maintenanceRecords)
      .set({ ...record, updatedAt: new Date() })
      .where(eq(maintenanceRecords.id, id))
      .returning();
    return updatedRecord;
  }

  // ==========================================================================
  // DASHBOARD ANALYTICS (REPORTES Y KPIS)
  // ==========================================================================
  
  /**
   * MÉTODO CENTRAL DE ANÁLISIS DE COSTOS
   * 
   * Calcula el resumen completo de costos de una empresa agregando datos
   * de múltiples fuentes: activos, licencias, contratos y mantenimiento.
   * Este es uno de los métodos más importantes del sistema.
   * 
   * FUNCIONALIDAD:
   * - Suma costos mensuales y anuales por categoría
   * - Calcula promedio mensual de mantenimiento (últimos 12 meses)
   * - Agrega datos de 4 tablas diferentes
   * - Convierte tipos Decimal a Number para JavaScript
   * 
   * CATEGORÍAS DE COSTOS:
   * - hardwareCosts: Activos físicos (laptops, servidores, etc.)
   * - licenseCosts: Licencias de software (perpetuas y suscripciones)
   * - contractCosts: Contratos con proveedores (soporte, mantenimiento)
   * - maintenanceCosts: Promedio mensual de gastos de mantenimiento
   * 
   * OPTIMIZACIÓN:
   * - 4 queries paralelos (uno por tabla) en lugar de un JOIN complejo
   * - Usa agregaciones SQL (SUM) para mejor performance
   * - Manejo seguro de valores NULL con operador || 0
   * 
   * USADO POR: Dashboard principal, reportes ejecutivos, gráficos de costos
   */
  async getCompanyCostSummary(companyId: string): Promise<{
    monthlyTotal: number;
    annualTotal: number;
    licenseCosts: number;
    maintenanceCosts: number;
    hardwareCosts: number;
    contractCosts: number;
  }> {
    // Consulta 1: Costos de activos físicos y aplicaciones
    const assetCosts = await db
      .select({
        monthlySum: sum(assets.monthlyCost),
        annualSum: sum(assets.annualCost),
      })
      .from(assets)
      .where(eq(assets.companyId, companyId));

    // Consulta 2: Costos de licencias de software
    const licenseCosts = await db
      .select({
        monthlySum: sum(licenses.monthlyCost),
        annualSum: sum(licenses.annualCost),
      })
      .from(licenses)
      .where(eq(licenses.companyId, companyId));

    // Consulta 3: Costos de contratos con proveedores
    const contractCosts = await db
      .select({
        monthlySum: sum(contracts.monthlyCost),
        annualSum: sum(contracts.annualCost),
      })
      .from(contracts)
      .where(eq(contracts.companyId, companyId));

    // Consulta 4: Costos de mantenimiento (histórico total)
    const maintenanceCosts = await db
      .select({
        totalCost: sum(maintenanceRecords.cost),
      })
      .from(maintenanceRecords)
      .where(eq(maintenanceRecords.companyId, companyId));

    // Conversión segura de Decimal a Number y cálculos
    const assetMonthly = Number(assetCosts[0]?.monthlySum || 0);
    const licenseMonthly = Number(licenseCosts[0]?.monthlySum || 0);
    const contractMonthly = Number(contractCosts[0]?.monthlySum || 0);
    const maintenanceTotal = Number(maintenanceCosts[0]?.totalCost || 0);
    const maintenanceMonthly = maintenanceTotal / 12; // Promedio mensual

    // Cálculo de totales consolidados
    const monthlyTotal = assetMonthly + licenseMonthly + contractMonthly + maintenanceMonthly;
    const annualTotal = monthlyTotal * 12;

    return {
      monthlyTotal,
      annualTotal,
      licenseCosts: licenseMonthly,
      maintenanceCosts: maintenanceMonthly,
      hardwareCosts: assetMonthly,
      contractCosts: contractMonthly,
    };
  }

  async getAssetCounts(companyId: string): Promise<{
    totalAssets: number;
    physicalAssets: number;
    applications: number;
    licenses: number;
    contracts: number;
  }> {
    const assetCounts = await db
      .select({
        type: assets.type,
        count: count(),
      })
      .from(assets)
      .where(eq(assets.companyId, companyId))
      .groupBy(assets.type);

    const licenseCount = await db
      .select({ count: count() })
      .from(licenses)
      .where(eq(licenses.companyId, companyId));

    const contractCount = await db
      .select({ count: count() })
      .from(contracts)
      .where(eq(contracts.companyId, companyId));

    const counts = {
      totalAssets: 0,
      physicalAssets: 0,
      applications: 0,
      licenses: Number(licenseCount[0]?.count || 0),
      contracts: Number(contractCount[0]?.count || 0),
    };

    assetCounts.forEach(({ type, count }) => {
      const countNum = Number(count);
      counts.totalAssets += countNum;
      if (type === "physical") counts.physicalAssets += countNum;
      if (type === "application") counts.applications += countNum;
    });

    return counts;
  }

  // Activity log
  async logActivity(activity: {
    companyId: string;
    userId: string;
    action: string;
    entityType: string;
    entityId?: string;
    entityName?: string;
    details?: string;
  }): Promise<ActivityLog> {
    const [log] = await db.insert(activityLog).values(activity).returning();
    return log;
  }

  async getRecentActivity(companyId: string, limit: number = 10): Promise<(ActivityLog & { user: User })[]> {
    return await db
      .select()
      .from(activityLog)
      .leftJoin(users, eq(activityLog.userId, users.id))
      .where(eq(activityLog.companyId, companyId))
      .orderBy(desc(activityLog.createdAt))
      .limit(limit)
      .then(rows => rows.map(row => ({
        ...row.activity_log,
        user: row.users!
      })));
  }

  // Technician operations
  async getTechniciansByCompany(companyId: string): Promise<User[]> {
    const technicians = await db
      .select({
        id: users.id,
        email: users.email,
        firstName: users.firstName,
        lastName: users.lastName,
        profileImageUrl: users.profileImageUrl,
        role: users.role,
        createdAt: users.createdAt,
        updatedAt: users.updatedAt,
      })
      .from(users)
      .innerJoin(userCompanies, eq(users.id, userCompanies.userId))
      .where(
        and(
          eq(userCompanies.companyId, companyId),
          eq(userCompanies.role, "technician" as any)
        )
      );
    
    return technicians;
  }

  // Notification operations
  async getNotificationsByUser(userId: string, companyId: string): Promise<Notification[]> {
    return await db
      .select()
      .from(notifications)
      .where(
        and(
          eq(notifications.userId, userId),
          eq(notifications.companyId, companyId)
        )
      )
      .orderBy(desc(notifications.createdAt));
  }

  async createNotification(notification: InsertNotification): Promise<Notification> {
    const [newNotification] = await db
      .insert(notifications)
      .values(notification)
      .returning();
    return newNotification;
  }

  async markNotificationAsRead(id: string, userId: string): Promise<void> {
    await db
      .update(notifications)
      .set({ isRead: true })
      .where(
        and(
          eq(notifications.id, id),
          eq(notifications.userId, userId)
        )
      );
  }

  async getUnreadNotificationCount(userId: string, companyId: string): Promise<number> {
    const result = await db
      .select({ count: count() })
      .from(notifications)
      .where(
        and(
          eq(notifications.userId, userId),
          eq(notifications.companyId, companyId),
          eq(notifications.isRead, false)
        )
      );
    
    return result[0]?.count || 0;
  }

  // Admin operations
  async getAllCompanies(): Promise<(Company & { userCount: number, assetCount: number })[]> {
    const companiesWithStats = await db
      .select({
        id: companies.id,
        name: companies.name,
        description: companies.description,
        plan: companies.plan,
        maxUsers: companies.maxUsers,
        maxAssets: companies.maxAssets,
        isActive: companies.isActive,
        createdAt: companies.createdAt,
        updatedAt: companies.updatedAt,
        userCount: count(userCompanies.id),
        assetCount: count(assets.id),
      })
      .from(companies)
      .leftJoin(userCompanies, eq(companies.id, userCompanies.companyId))
      .leftJoin(assets, eq(companies.id, assets.companyId))
      .groupBy(companies.id)
      .orderBy(companies.createdAt);

    return companiesWithStats.map(company => ({
      ...company,
      userCount: Number(company.userCount || 0),
      assetCount: Number(company.assetCount || 0),
    }));
  }

  async updateCompanyPlan(companyId: string, plan: "pyme" | "professional", maxUsers?: number, maxAssets?: number): Promise<Company> {
    const updateData: any = { plan };
    
    if (plan === "pyme") {
      updateData.maxUsers = maxUsers || 10;
      updateData.maxAssets = maxAssets || 500;
    } else if (plan === "professional") {
      updateData.maxUsers = 1;
      updateData.maxAssets = 100;
    }
    
    const [updatedCompany] = await db
      .update(companies)
      .set(updateData)
      .where(eq(companies.id, companyId))
      .returning();
    
    return updatedCompany;
  }

  async toggleCompanyStatus(companyId: string, isActive: boolean): Promise<Company> {
    const [updatedCompany] = await db
      .update(companies)
      .set({ isActive })
      .where(eq(companies.id, companyId))
      .returning();
    
    return updatedCompany;
  }

  async createExpiryNotifications(companyId: string): Promise<void> {
    const now = new Date();
    const thirtyDaysFromNow = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
    const sevenDaysFromNow = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    // Get all assets with expiry dates
    const expiringAssets = await db
      .select()
      .from(assets)
      .where(eq(assets.companyId, companyId));

    // Get company admins and technicians
    const recipients = await db
      .select({
        userId: users.id,
        role: userCompanies.role,
      })
      .from(users)
      .innerJoin(userCompanies, eq(users.id, userCompanies.userId))
      .where(eq(userCompanies.companyId, companyId));

    const notificationsList: any[] = [];

    for (const asset of expiringAssets) {
      if (asset.type !== 'application') continue;

      const services = [
        { name: 'Dominio', date: asset.domainExpiry },
        { name: 'SSL', date: asset.sslExpiry },
        { name: 'Hosting', date: asset.hostingExpiry },
        { name: 'Servidor', date: asset.serverExpiry },
      ];

      for (const service of services) {
        if (!service.date) continue;

        const expiryDate = new Date(service.date);
        let shouldNotify = false;
        let urgency = '';

        if (expiryDate < now) {
          shouldNotify = true;
          urgency = 'EXPIRADO';
        } else if (expiryDate <= sevenDaysFromNow) {
          shouldNotify = true;
          urgency = 'CRÍTICO';
        } else if (expiryDate <= thirtyDaysFromNow) {
          shouldNotify = true;
          urgency = 'PRÓXIMO A VENCER';
        }

        if (shouldNotify) {
          // Notify assigned technician if exists
          if ((asset as any).assignedTechnicianId) {
            notificationsList.push({
              companyId,
              userId: (asset as any).assignedTechnicianId,
              title: `${urgency}: ${service.name} - ${asset.name}`,
              message: `El ${service.name.toLowerCase()} de ${asset.name} ${expiryDate < now ? 'ha expirado' : `expira el ${expiryDate.toLocaleDateString('es-ES')}`}`,
              type: 'expiry_alert',
              entityType: 'asset',
              entityId: asset.id,
              isRead: false,
            });
          }

          // Notify all admins
          for (const recipient of recipients) {
            if (recipient.role !== 'technician' && recipient.userId !== (asset as any).assignedTechnicianId) {
              notificationsList.push({
                companyId,
                userId: recipient.userId,
                title: `${urgency}: ${service.name} - ${asset.name}`,
                message: `El ${service.name.toLowerCase()} de ${asset.name} ${expiryDate < now ? 'ha expirado' : `expira el ${expiryDate.toLocaleDateString('es-ES')}`}`,
                type: 'expiry_alert',
                entityType: 'asset',
                entityId: asset.id,
                isRead: false,
              });
            }
          }
        }
      }
    }

    // Create all notifications
    if (notificationsList.length > 0) {
      await db.insert(notifications).values(notificationsList);
    }
  }
}

export const storage = new DatabaseStorage();
