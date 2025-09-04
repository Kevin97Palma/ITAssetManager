import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { isUnauthorizedError } from "@/lib/authUtils";
import { useAuth } from "@/hooks/useAuth";
import Sidebar from "@/components/layout/sidebar";
import Header from "@/components/layout/header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { Plus, Search, Filter, Edit2, Trash2, Eye, Wrench, Calendar, CheckCircle, Clock } from "lucide-react";

export default function Maintenance() {
  const { toast } = useToast();
  const { isAuthenticated, isLoading } = useAuth();
  const [selectedCompanyId, setSelectedCompanyId] = useState<string>("");
  const [searchTerm, setSearchTerm] = useState("");

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

  // Check if we're in support mode
  const { data: supportStatus } = useQuery({
    queryKey: ["/api/admin/support-status"],
    enabled: isAuthenticated,
    retry: false,
    refetchInterval: 10000,
  });

  const { data: userCompanies = [] } = useQuery({
    queryKey: ["/api/companies"],
    enabled: isAuthenticated && !supportStatus?.supportMode,
  });

  // Use support company or user companies
  const companies = supportStatus?.supportMode 
    ? [{ company: supportStatus.company }] 
    : userCompanies;

  // Set default company when companies are loaded
  useEffect(() => {
    if (companies.length > 0 && !selectedCompanyId) {
      setSelectedCompanyId(companies[0].company.id);
    }
  }, [companies, selectedCompanyId]);

  const { data: maintenanceRecords = [], isLoading: isMaintenanceLoading, error: maintenanceError } = useQuery({
    queryKey: ["/api/maintenance", selectedCompanyId],
    enabled: !!selectedCompanyId,
  });

  useEffect(() => {
    if (maintenanceError && isUnauthorizedError(maintenanceError as Error)) {
      toast({
        title: "No autorizado",
        description: "Redirigiendo al inicio de sesión...",
        variant: "destructive",
      });
      setTimeout(() => {
        window.location.href = "/api/login";
      }, 500);
    }
  }, [maintenanceError, toast]);

  if (isLoading || !isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Skeleton className="w-32 h-8" />
      </div>
    );
  }

  // Filter by search term
  const filteredRecords = maintenanceRecords.filter((record: any) =>
    record.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
    record.vendor?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    record.maintenanceType.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "completed":
        return <Badge className="bg-accent text-accent-foreground">Completado</Badge>;
      case "in_progress":
        return <Badge className="bg-chart-3 text-white">En Progreso</Badge>;
      case "scheduled":
        return <Badge className="bg-chart-2 text-white">Programado</Badge>;
      case "cancelled":
        return <Badge variant="secondary">Cancelado</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getMaintenanceTypeBadge = (type: string) => {
    switch (type) {
      case "preventive":
        return <Badge className="bg-accent text-accent-foreground">Preventivo</Badge>;
      case "corrective":
        return <Badge className="bg-chart-3 text-white">Correctivo</Badge>;
      case "emergency":
        return <Badge className="bg-destructive text-destructive-foreground">Emergencia</Badge>;
      default:
        return <Badge variant="outline">{type}</Badge>;
    }
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return "N/A";
    return new Date(dateString).toLocaleDateString('es-ES');
  };

  const scheduledRecords = filteredRecords.filter((r: any) => r.status === "scheduled");
  const inProgressRecords = filteredRecords.filter((r: any) => r.status === "in_progress");
  const completedRecords = filteredRecords.filter((r: any) => r.status === "completed");

  return (
    <div className="flex h-screen">
      <Sidebar 
        selectedCompanyId={selectedCompanyId} 
        onCompanyChange={setSelectedCompanyId} 
      />
      
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header 
          title="Mantenimiento de Equipos" 
          subtitle="Programación y seguimiento de mantenimientos" 
        />
        
        <main className="flex-1 overflow-y-auto bg-background">
          <div className="p-6 space-y-6">
            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <Card className="border-border">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Total Registros</p>
                      <p className="text-2xl font-bold text-foreground" data-testid="text-total-maintenance">
                        {isMaintenanceLoading ? "..." : maintenanceRecords.length}
                      </p>
                    </div>
                    <div className="w-12 h-12 bg-primary rounded-lg flex items-center justify-center">
                      <Wrench className="w-6 h-6 text-primary-foreground" />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-border">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Programados</p>
                      <p className="text-2xl font-bold text-foreground" data-testid="text-scheduled-maintenance">
                        {isMaintenanceLoading ? "..." : scheduledRecords.length}
                      </p>
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
                      <p className="text-sm font-medium text-muted-foreground">En Progreso</p>
                      <p className="text-2xl font-bold text-foreground" data-testid="text-inprogress-maintenance">
                        {isMaintenanceLoading ? "..." : inProgressRecords.length}
                      </p>
                    </div>
                    <div className="w-12 h-12 bg-chart-3 rounded-lg flex items-center justify-center">
                      <Clock className="w-6 h-6 text-white" />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-border">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Costo Total</p>
                      <p className="text-2xl font-bold text-foreground" data-testid="text-maintenance-cost">
                        ${isMaintenanceLoading ? "..." : maintenanceRecords.reduce((sum: number, r: any) => sum + Number(r.cost || 0), 0).toLocaleString()}
                      </p>
                    </div>
                    <div className="w-12 h-12 bg-accent rounded-lg flex items-center justify-center">
                      <CheckCircle className="w-6 h-6 text-white" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Actions Bar */}
            <Card className="border-border">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>Registros de Mantenimiento</CardTitle>
                  <div className="flex items-center space-x-4">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                      <Input
                        placeholder="Buscar mantenimientos..."
                        className="pl-10 w-80"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        data-testid="input-search-maintenance"
                      />
                    </div>
                    <Button variant="outline" data-testid="button-filters">
                      <Filter className="w-4 h-4 mr-2" />
                      Filtros
                    </Button>
                    <Button data-testid="button-add-maintenance">
                      <Plus className="w-4 h-4 mr-2" />
                      Programar Mantenimiento
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {/* Maintenance Tabs */}
                <Tabs defaultValue="all" className="w-full">
                  <TabsList className="grid w-full grid-cols-4">
                    <TabsTrigger value="all" data-testid="tab-all-maintenance">Todos</TabsTrigger>
                    <TabsTrigger value="scheduled" data-testid="tab-scheduled-maintenance">Programados</TabsTrigger>
                    <TabsTrigger value="in_progress" data-testid="tab-inprogress-maintenance">En Progreso</TabsTrigger>
                    <TabsTrigger value="completed" data-testid="tab-completed-maintenance">Completados</TabsTrigger>
                  </TabsList>
                  
                  <TabsContent value="all" className="mt-4">
                    <MaintenanceTable records={filteredRecords} loading={isMaintenanceLoading} />
                  </TabsContent>
                  
                  <TabsContent value="scheduled" className="mt-4">
                    <MaintenanceTable records={scheduledRecords} loading={isMaintenanceLoading} />
                  </TabsContent>
                  
                  <TabsContent value="in_progress" className="mt-4">
                    <MaintenanceTable records={inProgressRecords} loading={isMaintenanceLoading} />
                  </TabsContent>
                  
                  <TabsContent value="completed" className="mt-4">
                    <MaintenanceTable records={completedRecords} loading={isMaintenanceLoading} />
                  </TabsContent>
                </Tabs>
              </CardContent>
            </Card>
          </div>
        </main>
      </div>
    </div>
  );
}

function MaintenanceTable({ records, loading }: { records: any[], loading: boolean }) {
  const getStatusBadge = (status: string) => {
    switch (status) {
      case "completed":
        return <Badge className="bg-accent text-accent-foreground">Completado</Badge>;
      case "in_progress":
        return <Badge className="bg-chart-3 text-white">En Progreso</Badge>;
      case "scheduled":
        return <Badge className="bg-chart-2 text-white">Programado</Badge>;
      case "cancelled":
        return <Badge variant="secondary">Cancelado</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getMaintenanceTypeBadge = (type: string) => {
    switch (type) {
      case "preventive":
        return <Badge className="bg-accent text-accent-foreground">Preventivo</Badge>;
      case "corrective":
        return <Badge className="bg-chart-3 text-white">Correctivo</Badge>;
      case "emergency":
        return <Badge className="bg-destructive text-destructive-foreground">Emergencia</Badge>;
      default:
        return <Badge variant="outline">{type}</Badge>;
    }
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return "N/A";
    return new Date(dateString).toLocaleDateString('es-ES');
  };

  return (
    <div className="overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Descripción</TableHead>
            <TableHead>Tipo</TableHead>
            <TableHead>Proveedor</TableHead>
            <TableHead>Fecha Programada</TableHead>
            <TableHead>Fecha Completada</TableHead>
            <TableHead>Costo</TableHead>
            <TableHead>Estado</TableHead>
            <TableHead>Acciones</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {loading ? (
            Array.from({ length: 5 }).map((_, i) => (
              <TableRow key={i}>
                {Array.from({ length: 8 }).map((_, j) => (
                  <TableCell key={j}>
                    <Skeleton className="h-4 w-full" />
                  </TableCell>
                ))}
              </TableRow>
            ))
          ) : records.length > 0 ? (
            records.map((record: any) => (
              <TableRow key={record.id} data-testid={`row-maintenance-${record.id}`}>
                <TableCell className="font-medium" data-testid="text-maintenance-description">
                  {record.description}
                </TableCell>
                <TableCell>
                  {getMaintenanceTypeBadge(record.maintenanceType)}
                </TableCell>
                <TableCell>{record.vendor || "N/A"}</TableCell>
                <TableCell>{formatDate(record.scheduledDate)}</TableCell>
                <TableCell>{formatDate(record.completedDate)}</TableCell>
                <TableCell>${Number(record.cost || 0).toLocaleString()}</TableCell>
                <TableCell>
                  {getStatusBadge(record.status)}
                </TableCell>
                <TableCell>
                  <div className="flex space-x-2">
                    <Button variant="ghost" size="sm" data-testid={`button-view-${record.id}`}>
                      <Eye className="w-4 h-4" />
                    </Button>
                    <Button variant="ghost" size="sm" data-testid={`button-edit-${record.id}`}>
                      <Edit2 className="w-4 h-4" />
                    </Button>
                    <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive" data-testid={`button-delete-${record.id}`}>
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))
          ) : (
            <TableRow>
              <TableCell colSpan={8} className="text-center py-8">
                <div className="w-16 h-16 bg-muted/50 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Wrench className="w-8 h-8 text-muted-foreground" />
                </div>
                <h3 className="text-lg font-semibold text-foreground mb-2">
                  No se encontraron registros
                </h3>
                <p className="text-muted-foreground mb-6">
                  No hay registros de mantenimiento para mostrar.
                </p>
                <Button data-testid="button-add-first-maintenance">
                  <Plus className="w-4 h-4 mr-2" />
                  Programar Primer Mantenimiento
                </Button>
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );
}
