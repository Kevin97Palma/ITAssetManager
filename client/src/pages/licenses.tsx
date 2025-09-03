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
import { Progress } from "@/components/ui/progress";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { Plus, Search, Filter, Edit2, Trash2, Eye, Key, Users, AlertTriangle } from "lucide-react";

export default function Licenses() {
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

  const { data: licenses = [], isLoading: isLicensesLoading, error: licensesError } = useQuery({
    queryKey: ["/api/licenses", selectedCompanyId],
    enabled: !!selectedCompanyId,
  });

  useEffect(() => {
    if (licensesError && isUnauthorizedError(licensesError as Error)) {
      toast({
        title: "No autorizado",
        description: "Redirigiendo al inicio de sesión...",
        variant: "destructive",
      });
      setTimeout(() => {
        window.location.href = "/api/login";
      }, 500);
    }
  }, [licensesError, toast]);

  if (isLoading || !isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Skeleton className="w-32 h-8" />
      </div>
    );
  }

  // Filter by search term
  const filteredLicenses = licenses.filter((license: any) =>
    license.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    license.vendor.toLowerCase().includes(searchTerm.toLowerCase()) ||
    license.licenseType?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getStatusBadge = (status: string, expiryDate: string) => {
    if (!expiryDate) return <Badge className="bg-accent text-accent-foreground">Perpetua</Badge>;
    
    const daysUntilExpiry = Math.ceil((new Date(expiryDate).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
    
    if (daysUntilExpiry < 0) {
      return <Badge className="bg-destructive text-destructive-foreground">Expirada</Badge>;
    }
    if (daysUntilExpiry <= 30) {
      return <Badge className="bg-chart-3 text-white">Por Vencer</Badge>;
    }
    if (status === "active") {
      return <Badge className="bg-accent text-accent-foreground">Activa</Badge>;
    }
    
    return <Badge variant="outline">{status}</Badge>;
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return "N/A";
    return new Date(dateString).toLocaleDateString('es-ES');
  };

  const calculateUsagePercentage = (current: number, max: number) => {
    if (!max) return 0;
    return Math.min((current / max) * 100, 100);
  };

  const getUsageColor = (percentage: number) => {
    if (percentage >= 90) return "bg-destructive";
    if (percentage >= 70) return "bg-chart-3";
    return "bg-accent";
  };

  return (
    <div className="flex h-screen">
      <Sidebar 
        selectedCompanyId={selectedCompanyId} 
        onCompanyChange={setSelectedCompanyId} 
      />
      
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header 
          title="Licencias de Software" 
          subtitle="Gestión y seguimiento de licencias" 
        />
        
        <main className="flex-1 overflow-y-auto bg-background">
          <div className="p-6 space-y-6">
            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <Card className="border-border">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Total Licencias</p>
                      <p className="text-2xl font-bold text-foreground" data-testid="text-total-licenses">
                        {isLicensesLoading ? "..." : licenses.length}
                      </p>
                    </div>
                    <div className="w-12 h-12 bg-primary rounded-lg flex items-center justify-center">
                      <Key className="w-6 h-6 text-primary-foreground" />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-border">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Activas</p>
                      <p className="text-2xl font-bold text-foreground" data-testid="text-active-licenses">
                        {isLicensesLoading ? "..." : licenses.filter((l: any) => l.status === "active").length}
                      </p>
                    </div>
                    <div className="w-12 h-12 bg-accent rounded-lg flex items-center justify-center">
                      <Key className="w-6 h-6 text-white" />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-border">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Por Vencer</p>
                      <p className="text-2xl font-bold text-foreground" data-testid="text-expiring-licenses">
                        {isLicensesLoading ? "..." : licenses.filter((l: any) => {
                          if (!l.expiryDate) return false;
                          const daysUntil = Math.ceil((new Date(l.expiryDate).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
                          return daysUntil <= 30 && daysUntil > 0;
                        }).length}
                      </p>
                    </div>
                    <div className="w-12 h-12 bg-chart-3 rounded-lg flex items-center justify-center">
                      <AlertTriangle className="w-6 h-6 text-white" />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-border">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Costo Mensual</p>
                      <p className="text-2xl font-bold text-foreground" data-testid="text-monthly-cost">
                        ${isLicensesLoading ? "..." : licenses.reduce((sum: number, l: any) => sum + Number(l.monthlyCost || 0), 0).toLocaleString()}
                      </p>
                    </div>
                    <div className="w-12 h-12 bg-chart-2 rounded-lg flex items-center justify-center">
                      <Users className="w-6 h-6 text-white" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Actions Bar */}
            <Card className="border-border">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>Lista de Licencias</CardTitle>
                  <div className="flex items-center space-x-4">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                      <Input
                        placeholder="Buscar licencias..."
                        className="pl-10 w-80"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        data-testid="input-search-licenses"
                      />
                    </div>
                    <Button variant="outline" data-testid="button-filters">
                      <Filter className="w-4 h-4 mr-2" />
                      Filtros
                    </Button>
                    <Button data-testid="button-add-license">
                      <Plus className="w-4 h-4 mr-2" />
                      Nueva Licencia
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {/* Licenses Table */}
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Nombre</TableHead>
                        <TableHead>Proveedor</TableHead>
                        <TableHead>Tipo</TableHead>
                        <TableHead>Uso</TableHead>
                        <TableHead>Fecha Compra</TableHead>
                        <TableHead>Fecha Expiración</TableHead>
                        <TableHead>Costo Mensual</TableHead>
                        <TableHead>Estado</TableHead>
                        <TableHead>Acciones</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {isLicensesLoading ? (
                        Array.from({ length: 5 }).map((_, i) => (
                          <TableRow key={i}>
                            {Array.from({ length: 9 }).map((_, j) => (
                              <TableCell key={j}>
                                <Skeleton className="h-4 w-full" />
                              </TableCell>
                            ))}
                          </TableRow>
                        ))
                      ) : filteredLicenses.length > 0 ? (
                        filteredLicenses.map((license: any) => {
                          const usagePercentage = calculateUsagePercentage(license.currentUsers || 0, license.maxUsers || 0);
                          
                          return (
                            <TableRow key={license.id} data-testid={`row-license-${license.id}`}>
                              <TableCell className="font-medium" data-testid="text-license-name">
                                {license.name}
                              </TableCell>
                              <TableCell>{license.vendor}</TableCell>
                              <TableCell>
                                <Badge variant="outline">{license.licenseType || "N/A"}</Badge>
                              </TableCell>
                              <TableCell>
                                <div className="space-y-1">
                                  <div className="flex justify-between text-xs">
                                    <span>{license.currentUsers || 0}</span>
                                    <span>{license.maxUsers || "∞"}</span>
                                  </div>
                                  {license.maxUsers && (
                                    <Progress 
                                      value={usagePercentage} 
                                      className="h-2"
                                    />
                                  )}
                                </div>
                              </TableCell>
                              <TableCell>{formatDate(license.purchaseDate)}</TableCell>
                              <TableCell>{formatDate(license.expiryDate)}</TableCell>
                              <TableCell>${Number(license.monthlyCost || 0).toLocaleString()}</TableCell>
                              <TableCell>
                                {getStatusBadge(license.status, license.expiryDate)}
                              </TableCell>
                              <TableCell>
                                <div className="flex space-x-2">
                                  <Button variant="ghost" size="sm" data-testid={`button-view-${license.id}`}>
                                    <Eye className="w-4 h-4" />
                                  </Button>
                                  <Button variant="ghost" size="sm" data-testid={`button-edit-${license.id}`}>
                                    <Edit2 className="w-4 h-4" />
                                  </Button>
                                  <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive" data-testid={`button-delete-${license.id}`}>
                                    <Trash2 className="w-4 h-4" />
                                  </Button>
                                </div>
                              </TableCell>
                            </TableRow>
                          );
                        })
                      ) : (
                        <TableRow>
                          <TableCell colSpan={9} className="text-center py-8">
                            <div className="w-16 h-16 bg-muted/50 rounded-full flex items-center justify-center mx-auto mb-4">
                              <Key className="w-8 h-8 text-muted-foreground" />
                            </div>
                            <h3 className="text-lg font-semibold text-foreground mb-2">
                              No se encontraron licencias
                            </h3>
                            <p className="text-muted-foreground mb-6">
                              {searchTerm ? "No hay licencias que coincidan con tu búsqueda." : "Comienza agregando tu primera licencia."}
                            </p>
                            <Button data-testid="button-add-first-license">
                              <Plus className="w-4 h-4 mr-2" />
                              Agregar Primera Licencia
                            </Button>
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </div>
        </main>
      </div>
    </div>
  );
}
