import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { isUnauthorizedError } from "@/lib/authUtils";
import { useAuth } from "@/hooks/useAuth";
import Sidebar from "@/components/layout/sidebar";
import Header from "@/components/layout/header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import CostPieChart from "@/components/charts/cost-pie-chart";
import TrendLineChart from "@/components/charts/trend-line-chart";
import AddAssetModal from "@/components/modals/add-asset-modal";
import { 
  DollarSign, 
  Calendar, 
  Laptop, 
  Server, 
  Plus, 
  FileText, 
  CalendarPlus,
  TrendingUp,
  AlertTriangle,
  Download
} from "lucide-react";

export default function Dashboard() {
  const { toast } = useToast();
  const { isAuthenticated, isLoading } = useAuth();
  const [selectedCompanyId, setSelectedCompanyId] = useState<string>("");
  const [showAddAssetModal, setShowAddAssetModal] = useState(false);

  // Redirect to home if not authenticated
  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
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
  }, [isAuthenticated, isLoading, toast]);

  const { data: userCompanies = [] } = useQuery({
    queryKey: ["/api/companies"],
    enabled: isAuthenticated,
  });

  // Set default company when companies are loaded
  useEffect(() => {
    if (userCompanies.length > 0 && !selectedCompanyId) {
      setSelectedCompanyId(userCompanies[0].company.id);
    }
  }, [userCompanies, selectedCompanyId]);

  const { data: dashboardData, isLoading: isDashboardLoading, error: dashboardError } = useQuery({
    queryKey: ["/api/dashboard", selectedCompanyId, "summary"],
    enabled: !!selectedCompanyId,
  });

  const { data: recentActivity = [], isLoading: isActivityLoading } = useQuery({
    queryKey: ["/api/dashboard", selectedCompanyId, "activity"],
    enabled: !!selectedCompanyId,
  });

  useEffect(() => {
    if (dashboardError && isUnauthorizedError(dashboardError as Error)) {
      toast({
        title: "No autorizado",
        description: "Redirigiendo al inicio de sesión...",
        variant: "destructive",
      });
      setTimeout(() => {
        window.location.href = "/api/login";
      }, 500);
    }
  }, [dashboardError, toast]);

  if (isLoading || !isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Skeleton className="w-32 h-8" />
      </div>
    );
  }

  const costs = dashboardData?.costs || {};
  const assets = dashboardData?.assets || {};

  return (
    <div className="flex h-screen">
      <Sidebar 
        selectedCompanyId={selectedCompanyId} 
        onCompanyChange={setSelectedCompanyId} 
      />
      
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header 
          title="Dashboard de Costos TI" 
          subtitle="Resumen ejecutivo de activos y gastos" 
        />
        
        <main className="flex-1 overflow-y-auto bg-background">
          <div className="p-6 space-y-6">
            {/* Cost Overview Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <Card className="border-border">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Gasto Mensual TI</p>
                      <p className="text-2xl font-bold text-foreground" data-testid="text-monthly-cost">
                        ${isDashboardLoading ? "..." : costs.monthlyTotal?.toLocaleString() || "0"}
                      </p>
                      <p className="text-xs text-accent flex items-center mt-1">
                        <TrendingUp className="w-3 h-3 mr-1" />
                        12% vs mes anterior
                      </p>
                    </div>
                    <div className="w-12 h-12 bg-primary rounded-lg flex items-center justify-center">
                      <DollarSign className="w-6 h-6 text-primary-foreground" />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-border">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Gasto Anual</p>
                      <p className="text-2xl font-bold text-foreground" data-testid="text-annual-cost">
                        ${isDashboardLoading ? "..." : costs.annualTotal?.toLocaleString() || "0"}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">Proyección actual</p>
                    </div>
                    <div className="w-12 h-12 bg-chart-2 rounded-lg flex items-center justify-center">
                      <Calendar className="w-6 h-6 text-white" />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-border">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Total Aplicaciones</p>
                      <p className="text-2xl font-bold text-foreground" data-testid="text-applications-count">
                        {isDashboardLoading ? "..." : assets.applications || 0}
                      </p>
                      <p className="text-xs text-accent flex items-center mt-1">
                        <Plus className="w-3 h-3 mr-1" />
                        3 nuevas este mes
                      </p>
                    </div>
                    <div className="w-12 h-12 bg-chart-3 rounded-lg flex items-center justify-center">
                      <Laptop className="w-6 h-6 text-white" />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-border">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Equipos Físicos</p>
                      <p className="text-2xl font-bold text-foreground" data-testid="text-physical-assets-count">
                        {isDashboardLoading ? "..." : assets.physicalAssets || 0}
                      </p>
                      <p className="text-xs text-destructive flex items-center mt-1">
                        <AlertTriangle className="w-3 h-3 mr-1" />
                        8 requieren mantenimiento
                      </p>
                    </div>
                    <div className="w-12 h-12 bg-chart-4 rounded-lg flex items-center justify-center">
                      <Server className="w-6 h-6 text-white" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Charts Section */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card className="border-border">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle>Distribución de Costos Mensuales</CardTitle>
                    <Button variant="ghost" size="sm" data-testid="button-export-costs">
                      <Download className="w-4 h-4 mr-1" />
                      Exportar
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  <CostPieChart data={costs} loading={isDashboardLoading} />
                </CardContent>
              </Card>

              <Card className="border-border">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle>Tendencia de Costos (12 meses)</CardTitle>
                    <select className="text-xs px-2 py-1 border border-border rounded text-foreground bg-background">
                      <option>Últimos 12 meses</option>
                      <option>Este año</option>
                      <option>Año anterior</option>
                    </select>
                  </div>
                </CardHeader>
                <CardContent>
                  <TrendLineChart companyId={selectedCompanyId} />
                </CardContent>
              </Card>
            </div>

            {/* Quick Actions & Recent Activity */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Quick Actions */}
              <Card className="border-border">
                <CardHeader>
                  <CardTitle>Acciones Rápidas</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <Button
                    variant="outline"
                    className="w-full justify-between h-auto p-3"
                    onClick={() => setShowAddAssetModal(true)}
                    data-testid="button-add-asset"
                  >
                    <div className="flex items-center">
                      <Plus className="w-4 h-4 text-accent mr-3" />
                      <span className="text-sm font-medium">Agregar Activo</span>
                    </div>
                  </Button>
                  
                  <Button
                    variant="outline"
                    className="w-full justify-between h-auto p-3"
                    data-testid="button-generate-report"
                  >
                    <div className="flex items-center">
                      <FileText className="w-4 h-4 text-chart-3 mr-3" />
                      <span className="text-sm font-medium">Generar Reporte</span>
                    </div>
                  </Button>
                  
                  <Button
                    variant="outline"
                    className="w-full justify-between h-auto p-3"
                    data-testid="button-schedule-maintenance"
                  >
                    <div className="flex items-center">
                      <CalendarPlus className="w-4 h-4 text-chart-2 mr-3" />
                      <span className="text-sm font-medium">Programar Mantenimiento</span>
                    </div>
                  </Button>
                </CardContent>
              </Card>

              {/* Recent Activity */}
              <Card className="lg:col-span-2 border-border">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle>Actividad Reciente</CardTitle>
                    <Button variant="link" size="sm" className="text-primary h-auto p-0" data-testid="link-view-all-activity">
                      Ver todo
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {isActivityLoading ? (
                      Array.from({ length: 3 }).map((_, i) => (
                        <div key={i} className="flex items-start space-x-3">
                          <Skeleton className="w-8 h-8 rounded-full" />
                          <div className="flex-1 space-y-1">
                            <Skeleton className="h-4 w-3/4" />
                            <Skeleton className="h-3 w-1/4" />
                          </div>
                        </div>
                      ))
                    ) : recentActivity.length > 0 ? (
                      recentActivity.map((activity: any, index: number) => (
                        <div key={activity.id} className="flex items-start space-x-3" data-testid={`activity-${index}`}>
                          <div className="w-8 h-8 bg-accent rounded-full flex items-center justify-center flex-shrink-0">
                            <Plus className="w-3 h-3 text-white" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm text-foreground">
                              <span className="font-medium">{activity.user?.firstName} {activity.user?.lastName}</span>
                              {" "}
                              {activity.action === "created" ? "agregó" : 
                               activity.action === "updated" ? "actualizó" : 
                               activity.action === "deleted" ? "eliminó" : activity.action}
                              {" "}
                              <span className="font-medium">{activity.entityName}</span>
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {new Date(activity.createdAt).toLocaleString()}
                            </p>
                          </div>
                        </div>
                      ))
                    ) : (
                      <p className="text-muted-foreground text-center py-4">No hay actividad reciente</p>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </main>
      </div>

      <AddAssetModal
        open={showAddAssetModal}
        onOpenChange={setShowAddAssetModal}
        companyId={selectedCompanyId}
      />
    </div>
  );
}
