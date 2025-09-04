import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { isUnauthorizedError } from "@/lib/authUtils";
import { useAuth } from "@/hooks/useAuth";
import { apiRequest } from "@/lib/queryClient";
import Sidebar from "@/components/layout/sidebar";
import Header from "@/components/layout/header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { 
  Building2, 
  Users, 
  HardDrive,
  Settings,
  TrendingUp,
  AlertCircle,
  CheckCircle,
  Crown
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export default function AdminPanel() {
  const { toast } = useToast();
  const { isAuthenticated, isLoading, user } = useAuth();
  const queryClient = useQueryClient();
  const [selectedCompanyId, setSelectedCompanyId] = useState<string>("");
  const [editingCompany, setEditingCompany] = useState<any>(null);

  // Redirect if not authenticated or not super admin
  useEffect(() => {
    if (!isLoading && (!isAuthenticated || user?.role !== 'super_admin')) {
      toast({
        title: "Acceso denegado",
        description: "Esta área es solo para super administradores.",
        variant: "destructive",
      });
      setTimeout(() => {
        window.location.href = "/";
      }, 1500);
      return;
    }
  }, [isAuthenticated, isLoading, user, toast]);

  // Get all companies for super admin
  const { data: companies = [], isLoading: isCompaniesLoading } = useQuery({
    queryKey: ["/api/admin/companies"],
    enabled: isAuthenticated && user?.role === 'super_admin',
    retry: false,
  });

  // Update company plan mutation
  const updatePlanMutation = useMutation({
    mutationFn: async ({ companyId, plan, maxUsers, maxAssets }: any) => {
      return apiRequest(`/api/admin/companies/${companyId}/plan`, "PUT", {
        plan,
        maxUsers,
        maxAssets
      });
    },
    onSuccess: (data, variables) => {
      toast({
        title: "Plan actualizado",
        description: `Plan de la empresa actualizado a ${variables.plan.toUpperCase()}`,
      });
      queryClient.invalidateQueries(["/api/admin/companies"]);
      setEditingCompany(null);
    },
    onError: (error) => {
      if (isUnauthorizedError(error as Error)) {
        toast({
          title: "No autorizado",
          description: "Redirigiendo al inicio de sesión...",
          variant: "destructive",
        });
        setTimeout(() => {
          window.location.href = "/api/login";
        }, 500);
        return;
      }
      toast({
        title: "Error",
        description: "No se pudo actualizar el plan de la empresa",
        variant: "destructive",
      });
    },
  });

  // Toggle company status mutation
  const toggleStatusMutation = useMutation({
    mutationFn: async ({ companyId, isActive }: any) => {
      return apiRequest(`/api/admin/companies/${companyId}/status`, "PUT", {
        isActive
      });
    },
    onSuccess: (data, variables) => {
      toast({
        title: "Estado actualizado",
        description: `Empresa ${variables.isActive ? 'activada' : 'desactivada'} correctamente`,
      });
      queryClient.invalidateQueries(["/api/admin/companies"]);
    },
    onError: (error) => {
      if (isUnauthorizedError(error as Error)) {
        toast({
          title: "No autorizado",
          description: "Redirigiendo al inicio de sesión...",
          variant: "destructive",
        });
        setTimeout(() => {
          window.location.href = "/api/login";
        }, 500);
        return;
      }
      toast({
        title: "Error",
        description: "No se pudo actualizar el estado de la empresa",
        variant: "destructive",
      });
    },
  });

  if (isLoading || !isAuthenticated || user?.role !== 'super_admin') {
    return <div className="flex items-center justify-center min-h-screen">
      <div className="text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
        <p className="mt-2 text-sm text-muted-foreground">Verificando permisos...</p>
      </div>
    </div>;
  }

  const handlePlanChange = (company: any, newPlan: string) => {
    const maxUsers = newPlan === 'pyme' ? 10 : 1;
    const maxAssets = newPlan === 'pyme' ? 500 : 100;
    
    updatePlanMutation.mutate({
      companyId: company.id,
      plan: newPlan,
      maxUsers,
      maxAssets
    });
  };

  const handleStatusToggle = (company: any, isActive: boolean) => {
    toggleStatusMutation.mutate({
      companyId: company.id,
      isActive
    });
  };

  const getPlanBadgeVariant = (plan: string) => {
    return plan === 'pyme' ? 'default' : 'secondary';
  };

  const totalCompanies = companies.length;
  const activeCompanies = companies.filter((c: any) => c.isActive).length;
  const pymeCompanies = companies.filter((c: any) => c.plan === 'pyme').length;
  const professionalCompanies = companies.filter((c: any) => c.plan === 'professional').length;

  return (
    <div className="flex h-screen">
      <Sidebar 
        selectedCompanyId={selectedCompanyId} 
        onCompanyChange={setSelectedCompanyId}
        showAdminPanel={true}
      />
      
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header 
          title="Panel de Administración" 
          subtitle="Gestión de empresas y planes"
        />
        
        <main className="flex-1 overflow-y-auto bg-background">
          <div className="p-6 space-y-6">
            {/* Header with Super Admin indicator */}
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Crown className="w-6 h-6 text-yellow-500" />
                <h1 className="text-2xl font-bold">Super Administrador</h1>
              </div>
              <Badge variant="outline" className="text-yellow-600 border-yellow-300">
                Acceso Completo
              </Badge>
            </div>

            {/* Statistics Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Total Empresas</p>
                      <p className="text-2xl font-bold text-foreground">{totalCompanies}</p>
                    </div>
                    <Building2 className="w-8 h-8 text-primary" />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Empresas Activas</p>
                      <p className="text-2xl font-bold text-green-600">{activeCompanies}</p>
                    </div>
                    <CheckCircle className="w-8 h-8 text-green-600" />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Plan PyME</p>
                      <p className="text-2xl font-bold text-blue-600">{pymeCompanies}</p>
                    </div>
                    <Users className="w-8 h-8 text-blue-600" />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Plan Profesional</p>
                      <p className="text-2xl font-bold text-purple-600">{professionalCompanies}</p>
                    </div>
                    <HardDrive className="w-8 h-8 text-purple-600" />
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Companies Table */}
            <Card>
              <CardHeader>
                <CardTitle>Gestión de Empresas</CardTitle>
                <CardDescription>
                  Administra los planes y estados de todas las empresas registradas
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {isCompaniesLoading ? (
                    <div className="text-center py-8">
                      <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary mx-auto"></div>
                      <p className="mt-2 text-sm text-muted-foreground">Cargando empresas...</p>
                    </div>
                  ) : companies.length === 0 ? (
                    <div className="text-center py-8">
                      <Building2 className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                      <p className="text-muted-foreground">No hay empresas registradas</p>
                    </div>
                  ) : (
                    <div className="grid gap-4">
                      {companies.map((company: any) => (
                        <div 
                          key={company.id} 
                          className="flex items-center justify-between p-4 border border-border rounded-lg hover:bg-muted/50 transition-colors"
                        >
                          <div className="flex items-center space-x-4">
                            <div className="flex items-center space-x-2">
                              <Building2 className="w-5 h-5 text-muted-foreground" />
                              <div>
                                <h3 className="font-medium">{company.name}</h3>
                                <p className="text-sm text-muted-foreground">
                                  {company.userCount} usuario{company.userCount !== 1 ? 's' : ''} • {company.assetCount} activo{company.assetCount !== 1 ? 's' : ''}
                                </p>
                              </div>
                            </div>
                          </div>
                          
                          <div className="flex items-center space-x-4">
                            {/* Plan Badge and Selector */}
                            <div className="flex items-center space-x-2">
                              <Select
                                value={company.plan}
                                onValueChange={(value) => handlePlanChange(company, value)}
                                disabled={updatePlanMutation.isPending}
                              >
                                <SelectTrigger className="w-32">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="pyme">PyME</SelectItem>
                                  <SelectItem value="professional">Profesional</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>

                            {/* Limits */}
                            <div className="text-xs text-muted-foreground">
                              <p>{company.maxUsers} usuarios máx</p>
                              <p>{company.maxAssets} activos máx</p>
                            </div>

                            {/* Status Toggle */}
                            <div className="flex items-center space-x-2">
                              <Switch
                                checked={company.isActive}
                                onCheckedChange={(checked) => handleStatusToggle(company, checked)}
                                disabled={toggleStatusMutation.isPending}
                              />
                              <span className="text-sm">
                                {company.isActive ? 'Activa' : 'Inactiva'}
                              </span>
                            </div>

                            {/* Status Indicator */}
                            {company.isActive ? (
                              <CheckCircle className="w-5 h-5 text-green-500" />
                            ) : (
                              <AlertCircle className="w-5 h-5 text-red-500" />
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </main>
      </div>
    </div>
  );
}