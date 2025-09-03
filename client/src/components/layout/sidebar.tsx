import { useState } from "react";
import { Link, useLocation } from "wouter";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useQuery } from "@tanstack/react-query";
import {
  Server,
  BarChart3,
  Monitor,
  Laptop,
  FileText,
  Key,
  Wrench,
  PieChart,
  Settings,
  ChevronDown,
} from "lucide-react";

interface SidebarProps {
  selectedCompanyId: string;
  onCompanyChange: (companyId: string) => void;
}

const navigationItems = [
  { path: "/", icon: BarChart3, label: "Dashboard" },
  { path: "/assets", icon: Monitor, label: "Activos Físicos" },
  { path: "/applications", icon: Laptop, label: "Aplicaciones" },
  { path: "/contracts", icon: FileText, label: "Contratos" },
  { path: "/licenses", icon: Key, label: "Licencias" },
  { path: "/maintenance", icon: Wrench, label: "Mantenimiento" },
  { path: "/reports", icon: PieChart, label: "Reportes" },
  { path: "/settings", icon: Settings, label: "Configuración" },
];

export default function Sidebar({ selectedCompanyId, onCompanyChange }: SidebarProps) {
  const [location] = useLocation();
  
  const { data: userCompanies = [] } = useQuery({
    queryKey: ["/api/companies"],
  });

  const selectedCompany = userCompanies.find((uc: any) => uc.company.id === selectedCompanyId);

  return (
    <aside className="w-64 bg-card border-r border-border">
      <div className="p-4 border-b border-border">
        <div className="flex items-center space-x-2 mb-4">
          <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
            <Server className="w-5 h-5 text-primary-foreground" />
          </div>
          <h1 className="text-lg font-semibold text-foreground">TechAssets Pro</h1>
        </div>
        
        {/* Company Selector */}
        <Select value={selectedCompanyId} onValueChange={onCompanyChange}>
          <SelectTrigger className="w-full" data-testid="select-company">
            <SelectValue placeholder="Seleccionar empresa">
              {selectedCompany?.company.name || "Seleccionar empresa"}
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            {userCompanies.map((uc: any) => (
              <SelectItem key={uc.company.id} value={uc.company.id} data-testid={`option-company-${uc.company.id}`}>
                {uc.company.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      
      <nav className="p-4 space-y-2">
        {navigationItems.map((item) => {
          const isActive = location === item.path;
          const Icon = item.icon;
          
          return (
            <Link key={item.path} href={item.path}>
              <Button
                variant={isActive ? "default" : "ghost"}
                className={cn(
                  "w-full justify-start",
                  isActive 
                    ? "bg-primary text-primary-foreground" 
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                )}
                data-testid={`nav-${item.path.replace('/', '') || 'dashboard'}`}
              >
                <Icon className="w-5 h-5 mr-3" />
                {item.label}
              </Button>
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
