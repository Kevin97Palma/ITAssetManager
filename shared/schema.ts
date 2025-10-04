import { sql, relations } from "drizzle-orm";
import {
  pgTable,
  text,
  varchar,
  timestamp,
  decimal,
  integer,
  boolean,
  pgEnum,
  jsonb,
  index,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Session storage table (for express-session)
export const sessions = pgTable(
  "sessions",
  {
    sid: varchar("sid").primaryKey(),
    sess: jsonb("sess").notNull(),
    expire: timestamp("expire").notNull(),
  },
  (table) => [index("IDX_session_expire").on(table.expire)],
);

// Enums
export const userRoleEnum = pgEnum("user_role", [
  "super_admin",
  "technical_admin", 
  "manager_owner"
]);

export const assetStatusEnum = pgEnum("asset_status", [
  "active",
  "inactive", 
  "maintenance",
  "deprecated",
  "disposed"
]);

export const assetTypeEnum = pgEnum("asset_type", [
  "physical",
  "application",
  "license",
  "contract"
]);

export const applicationTypeEnum = pgEnum("application_type", [
  "saas",
  "custom_development"
]);

export const maintenanceTypeEnum = pgEnum("maintenance_type", [
  "preventive",
  "corrective",
  "emergency",
  "upgrade"
]);

export const maintenanceStatusEnum = pgEnum("maintenance_status", [
  "scheduled",
  "in_progress",
  "completed",
  "cancelled"
]);

export const contractStatusEnum = pgEnum("contract_status", [
  "active",
  "expired",
  "pending_renewal",
  "cancelled"
]);

export const companyPlanEnum = pgEnum("company_plan", [
  "pyme",
  "professional"
]);

// Users table
export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  email: varchar("email").unique().notNull(),
  passwordHash: varchar("password_hash").notNull(), // Hash bcrypt de la contraseña
  firstName: varchar("first_name").notNull(),
  lastName: varchar("last_name").notNull(),
  profileImageUrl: varchar("profile_image_url"),
  role: userRoleEnum("role").notNull().default("technical_admin"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Companies table
export const companies = pgTable("companies", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: varchar("name").notNull(),
  description: text("description"),
  plan: companyPlanEnum("plan").notNull().default("pyme"),
  maxUsers: integer("max_users").default(10), // For pyme plan
  maxAssets: integer("max_assets").default(500), // For pyme plan  
  isActive: boolean("is_active").default(true),
  // Registration fields
  ruc: varchar("ruc").unique(), // For PyME companies
  cedula: varchar("cedula").unique(), // For Professional companies
  address: text("address"), // Dirección
  phone: varchar("phone"), // Celular
  email: varchar("email"), // Correo
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// User-Company relationship (many-to-many)
export const userCompanies = pgTable("user_companies", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  companyId: varchar("company_id").notNull().references(() => companies.id, { onDelete: "cascade" }),
  role: userRoleEnum("role").notNull().default("technical_admin"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Assets table (unified for all asset types)
export const assets = pgTable("assets", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  companyId: varchar("company_id").notNull().references(() => companies.id, { onDelete: "cascade" }),
  name: varchar("name").notNull(),
  type: assetTypeEnum("type").notNull(),
  description: text("description"),
  serialNumber: varchar("serial_number"),
  model: varchar("model"),
  manufacturer: varchar("manufacturer"),
  purchaseDate: timestamp("purchase_date"),
  warrantyExpiry: timestamp("warranty_expiry"),
  monthlyCost: decimal("monthly_cost", { precision: 10, scale: 2 }).default("0"),
  annualCost: decimal("annual_cost", { precision: 10, scale: 2 }).default("0"),
  status: assetStatusEnum("status").notNull().default("active"),
  location: varchar("location"),
  assignedTo: varchar("assigned_to"),
  notes: text("notes"),
  // Application-specific fields
  applicationType: applicationTypeEnum("application_type"),
  url: varchar("url"), // For SaaS applications
  version: varchar("version"),
  // Infrastructure costs
  domainCost: decimal("domain_cost", { precision: 10, scale: 2 }).default("0"),
  sslCost: decimal("ssl_cost", { precision: 10, scale: 2 }).default("0"),
  hostingCost: decimal("hosting_cost", { precision: 10, scale: 2 }).default("0"),
  serverCost: decimal("server_cost", { precision: 10, scale: 2 }).default("0"),
  // Infrastructure expiry dates
  domainExpiry: timestamp("domain_expiry"),
  sslExpiry: timestamp("ssl_expiry"),
  hostingExpiry: timestamp("hosting_expiry"),
  serverExpiry: timestamp("server_expiry"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Contracts table
export const contracts = pgTable("contracts", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  companyId: varchar("company_id").notNull().references(() => companies.id, { onDelete: "cascade" }),
  name: varchar("name").notNull(),
  vendor: varchar("vendor").notNull(),
  description: text("description"),
  contractType: varchar("contract_type").notNull(), // support, maintenance, license, etc.
  startDate: timestamp("start_date").notNull(),
  endDate: timestamp("end_date").notNull(),
  renewalDate: timestamp("renewal_date"),
  monthlyCost: decimal("monthly_cost", { precision: 10, scale: 2 }).default("0"),
  annualCost: decimal("annual_cost", { precision: 10, scale: 2 }).default("0"),
  status: contractStatusEnum("status").notNull().default("active"),
  autoRenewal: boolean("auto_renewal").default(false),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Licenses table
export const licenses = pgTable("licenses", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  companyId: varchar("company_id").notNull().references(() => companies.id, { onDelete: "cascade" }),
  assetId: varchar("asset_id").references(() => assets.id, { onDelete: "set null" }),
  name: varchar("name").notNull(),
  vendor: varchar("vendor").notNull(),
  licenseKey: text("license_key"),
  licenseType: varchar("license_type"), // perpetual, subscription, etc.
  maxUsers: integer("max_users"),
  currentUsers: integer("current_users").default(0),
  purchaseDate: timestamp("purchase_date"),
  expiryDate: timestamp("expiry_date"),
  monthlyCost: decimal("monthly_cost", { precision: 10, scale: 2 }).default("0"),
  annualCost: decimal("annual_cost", { precision: 10, scale: 2 }).default("0"),
  status: assetStatusEnum("status").notNull().default("active"),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Maintenance records table
export const maintenanceRecords = pgTable("maintenance_records", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  assetId: varchar("asset_id").notNull().references(() => assets.id, { onDelete: "cascade" }),
  companyId: varchar("company_id").notNull().references(() => companies.id, { onDelete: "cascade" }),
  maintenanceType: maintenanceTypeEnum("maintenance_type").notNull(),
  title: varchar("title").notNull(),
  description: text("description").notNull(),
  vendor: varchar("vendor"),
  cost: decimal("cost", { precision: 10, scale: 2 }).default("0"),
  scheduledDate: timestamp("scheduled_date"),
  completedDate: timestamp("completed_date"),
  nextMaintenanceDate: timestamp("next_maintenance_date"),
  status: maintenanceStatusEnum("status").notNull().default("scheduled"),
  priority: varchar("priority").default("medium"), // low, medium, high, critical
  technician: varchar("technician"),
  partsReplaced: text("parts_replaced"), // JSON or text list of replaced parts
  timeSpent: integer("time_spent"), // minutes
  notes: text("notes"),
  attachments: text("attachments").array(), // file paths or URLs
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Activity log for audit trail
export const activityLog = pgTable("activity_log", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  companyId: varchar("company_id").notNull().references(() => companies.id, { onDelete: "cascade" }),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  action: varchar("action").notNull(), // created, updated, deleted, etc.
  entityType: varchar("entity_type").notNull(), // asset, contract, license, etc.
  entityId: varchar("entity_id"),
  entityName: varchar("entity_name"),
  details: text("details"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Relations
export const usersRelations = relations(users, ({ many }) => ({
  userCompanies: many(userCompanies),
  activityLogs: many(activityLog),
}));

export const companiesRelations = relations(companies, ({ many }) => ({
  userCompanies: many(userCompanies),
  assets: many(assets),
  contracts: many(contracts),
  licenses: many(licenses),
  maintenanceRecords: many(maintenanceRecords),
  activityLogs: many(activityLog),
}));

export const userCompaniesRelations = relations(userCompanies, ({ one }) => ({
  user: one(users, {
    fields: [userCompanies.userId],
    references: [users.id],
  }),
  company: one(companies, {
    fields: [userCompanies.companyId],
    references: [companies.id],
  }),
}));

export const assetsRelations = relations(assets, ({ one, many }) => ({
  company: one(companies, {
    fields: [assets.companyId],
    references: [companies.id],
  }),
  licenses: many(licenses),
  maintenanceRecords: many(maintenanceRecords),
}));

export const contractsRelations = relations(contracts, ({ one }) => ({
  company: one(companies, {
    fields: [contracts.companyId],
    references: [companies.id],
  }),
}));

export const licensesRelations = relations(licenses, ({ one }) => ({
  company: one(companies, {
    fields: [licenses.companyId],
    references: [companies.id],
  }),
  asset: one(assets, {
    fields: [licenses.assetId],
    references: [assets.id],
  }),
}));

export const maintenanceRecordsRelations = relations(maintenanceRecords, ({ one }) => ({
  asset: one(assets, {
    fields: [maintenanceRecords.assetId],
    references: [assets.id],
  }),
  company: one(companies, {
    fields: [maintenanceRecords.companyId],
    references: [companies.id],
  }),
}));

export const activityLogRelations = relations(activityLog, ({ one }) => ({
  user: one(users, {
    fields: [activityLog.userId],
    references: [users.id],
  }),
  company: one(companies, {
    fields: [activityLog.companyId],
    references: [companies.id],
  }),
}));

// Insert schemas
export const insertUserSchema = createInsertSchema(users).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertCompanySchema = createInsertSchema(companies).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertAssetSchema = createInsertSchema(assets).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertContractSchema = createInsertSchema(contracts).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertLicenseSchema = createInsertSchema(licenses).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertMaintenanceRecordSchema = createInsertSchema(maintenanceRecords).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

// Registration schema for new companies
export const companyRegistrationSchema = z.object({
  name: z.string().min(1, "Nombre es requerido"),
  plan: z.enum(["pyme", "professional"]),
  ruc: z.string().optional(),
  cedula: z.string().optional(), 
  address: z.string().min(1, "Dirección es requerida"),
  phone: z.string().min(1, "Celular es requerido"),
  email: z.string().email("Email inválido"),
  // User info
  firstName: z.string().min(1, "Nombre es requerido"),
  lastName: z.string().min(1, "Apellido es requerido"),
  password: z.string().min(6, "La contraseña debe tener al menos 6 caracteres"),
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Las contraseñas no coinciden",
  path: ["confirmPassword"]
}).refine((data) => {
  if (data.plan === "pyme") {
    return data.ruc && data.ruc.length > 0;
  } else {
    return data.cedula && data.cedula.length > 0;
  }
}, {
  message: "RUC es requerido para empresas PyME, Cédula es requerida para profesionales",
  path: ["ruc"]
});

// Login schema
export const loginSchema = z.object({
  email: z.string().email("Email inválido"),
  password: z.string().min(1, "Contraseña es requerida"),
});

// Types
export type UpsertUser = typeof users.$inferInsert;
export type User = typeof users.$inferSelect;
export type Company = typeof companies.$inferSelect;
export type InsertCompany = z.infer<typeof insertCompanySchema>;
export type Asset = typeof assets.$inferSelect;
export type InsertAsset = z.infer<typeof insertAssetSchema>;
export type Contract = typeof contracts.$inferSelect;
export type InsertContract = z.infer<typeof insertContractSchema>;
export type License = typeof licenses.$inferSelect;
export type InsertLicense = z.infer<typeof insertLicenseSchema>;
export type MaintenanceRecord = typeof maintenanceRecords.$inferSelect;
export type InsertMaintenanceRecord = z.infer<typeof insertMaintenanceRecordSchema>;
export type CompanyRegistration = z.infer<typeof companyRegistrationSchema>;
export type ActivityLog = typeof activityLog.$inferSelect;
export type UserCompany = typeof userCompanies.$inferSelect;
