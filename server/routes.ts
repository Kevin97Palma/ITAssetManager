import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupAuth, isAuthenticated } from "./replitAuth";
import {
  insertAssetSchema,
  insertContractSchema,
  insertLicenseSchema,
  insertMaintenanceRecordSchema,
  insertCompanySchema,
  insertNotificationSchema,
} from "@shared/schema";

export async function registerRoutes(app: Express): Promise<Server> {
  // Auth middleware
  await setupAuth(app);

  // Auth routes
  app.get('/api/auth/user', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      res.json(user);
    } catch (error) {
      console.error("Error fetching user:", error);
      res.status(500).json({ message: "Failed to fetch user" });
    }
  });

  // Company routes
  app.get('/api/companies', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const userCompanies = await storage.getUserCompanies(userId);
      res.json(userCompanies);
    } catch (error) {
      console.error("Error fetching companies:", error);
      res.status(500).json({ message: "Failed to fetch companies" });
    }
  });

  app.post('/api/companies', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const validatedData = insertCompanySchema.parse(req.body);
      
      const company = await storage.createCompany(validatedData);
      await storage.addUserToCompany(userId, company.id, "manager_owner");
      
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

  // Dashboard routes
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

  // Asset routes
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
      const userId = req.user.claims.sub;
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
      const userId = req.user.claims.sub;
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
      const userId = req.user.claims.sub;
      
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
      const userId = req.user.claims.sub;
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
      const userId = req.user.claims.sub;
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
      const userId = req.user.claims.sub;
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
      const userId = req.user.claims.sub;
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
      const userId = req.user.claims.sub;
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
      const userId = req.user.claims.sub;
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

  const httpServer = createServer(app);
  return httpServer;
}
