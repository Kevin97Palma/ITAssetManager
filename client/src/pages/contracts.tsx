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
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { Plus, Search, Filter, Edit2, Trash2, Eye, Calendar, AlertTriangle } from "lucide-react";

export default function Contracts() {
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

  const { data: contracts = [], isLoading: isContractsLoading, error: contractsError } = useQuery({
    queryKey: ["/api/contracts", selectedCompanyId],
    enabled: !!selectedCompanyId,
  });

  useEffect(() => {
    if (contractsError && isUnauthorizedError(contractsError as Error)) {
      toast({
        title: "No autorizado",
        description: "Redirigiendo al inicio de sesión...",
        variant: "destructive",
      });
      setTimeout(() => {
        window.location.href = "/api/login";
      }, 500);
    }
  }, [contractsError, toast]);

  if (isLoading || !isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Skeleton className="w-32 h-8" />
      </div>
    );
  }

  // Filter by search term
  const filteredContracts = contracts.filter((contract: any) =>
    contract.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    contract.vendor.toLowerCase().includes(searchTerm.toLowerCase()) ||
    contract.contractType.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getStatusBadge = (status: string, endDate: string) => {
    const daysUntilExpiry = Math.ceil((new Date(endDate).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
    
    if (status === "expired") {
      return <Badge className="bg-destructive text-destructive-foreground">Expirado</Badge>;
    }
    if (status === "cancelled") {
      return <Badge variant="secondary">Cancelado</Badge>;
    }
    if (daysUntilExpiry <= 30 && daysUntilExpiry > 0) {
      return <Badge className="bg-chart-3 text-white">Por Vencer</Badge>;
    }
    if (status === "active") {
      return <Badge className="bg-accent text-accent-foreground">Activo</Badge>;
    }
    if (status === "pending_renewal") {
      return <Badge className="bg-chart-4 text-white">Pendiente Renovación</Badge>;
    }
    
    return <Badge variant="outline">{status}</Badge>;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('es-ES');
  };

  return (
    <div className="flex h-screen">
      <Sidebar 
        selectedCompanyId={selectedCompanyId} 
        onCompanyChange={setSelectedCompanyId} 
      />
      
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header 
          title="Contratos TI" 
          subtitle="Gestión de contratos y acuerdos de servicios" 
        />
        
        <main className="flex-1 overflow-y-auto bg-background">
          <div className="p-6 space-y-6">
            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <Card className="border-border">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Total Contratos</p>
                      <p className="text-2xl font-bold text-foreground" data-testid="text-total-contracts">
                        {isContractsLoading ? "..." : contracts.length}
                      </p>
                    </div>
                    <div className="w-12 h-12 bg-primary rounded-lg flex items-center justify-center">
                      <Calendar className="w-6 h-6 text-primary-foreground" />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-border">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Activos</p>
                      <p className="text-2xl font-bold text-foreground" data-testid="text-active-contracts">
                        {isContractsLoading ? "..." : contracts.filter((c: any) => c.status === "active").length}
                      </p>
                    </div>
                    <div className="w-12 h-12 bg-accent rounded-lg flex items-center justify-center">
                      <Calendar className="w-6 h-6 text-white" />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-border">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Por Vencer</p>
                      <p className="text-2xl font-bold text-foreground" data-testid="text-expiring-contracts">
                        {isContractsLoading ? "..." : contracts.filter((c: any) => {
                          const daysUntil = Math.ceil((new Date(c.endDate).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
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
                        ${isContractsLoading ? "..." : contracts.reduce((sum: number, c: any) => sum + Number(c.monthlyCost || 0), 0).toLocaleString()}
                      </p>
                    </div>
                    <div className="w-12 h-12 bg-chart-2 rounded-lg flex items-center justify-center">
                      <Calendar className="w-6 h-6 text-white" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Actions Bar */}
            <Card className="border-border">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>Lista de Contratos</CardTitle>
                  <div className="flex items-center space-x-4">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                      <Input
                        placeholder="Buscar contratos..."
                        className="pl-10 w-80"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        data-testid="input-search-contracts"
                      />
                    </div>
                    <Button variant="outline" data-testid="button-filters">
                      <Filter className="w-4 h-4 mr-2" />
                      Filtros
                    </Button>
                    <Button data-testid="button-add-contract">
                      <Plus className="w-4 h-4 mr-2" />
                      Nuevo Contrato
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {/* Contracts Table */}
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Nombre</TableHead>
                        <TableHead>Proveedor</TableHead>
                        <TableHead>Tipo</TableHead>
                        <TableHead>Fecha Inicio</TableHead>
                        <TableHead>Fecha Fin</TableHead>
                        <TableHead>Costo Mensual</TableHead>
                        <TableHead>Estado</TableHead>
                        <TableHead>Acciones</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {isContractsLoading ? (
                        Array.from({ length: 5 }).map((_, i) => (
                          <TableRow key={i}>
                            {Array.from({ length: 8 }).map((_, j) => (
                              <TableCell key={j}>
                                <Skeleton className="h-4 w-full" />
                              </TableCell>
                            ))}
                          </TableRow>
                        ))
                      ) : filteredContracts.length > 0 ? (
                        filteredContracts.map((contract: any) => (
                          <TableRow key={contract.id} data-testid={`row-contract-${contract.id}`}>
                            <TableCell className="font-medium" data-testid="text-contract-name">
                              {contract.name}
                            </TableCell>
                            <TableCell>{contract.vendor}</TableCell>
                            <TableCell>
                              <Badge variant="outline">{contract.contractType}</Badge>
                            </TableCell>
                            <TableCell>{formatDate(contract.startDate)}</TableCell>
                            <TableCell>{formatDate(contract.endDate)}</TableCell>
                            <TableCell>${Number(contract.monthlyCost || 0).toLocaleString()}</TableCell>
                            <TableCell>
                              {getStatusBadge(contract.status, contract.endDate)}
                            </TableCell>
                            <TableCell>
                              <div className="flex space-x-2">
                                <Button variant="ghost" size="sm" data-testid={`button-view-${contract.id}`}>
                                  <Eye className="w-4 h-4" />
                                </Button>
                                <Button variant="ghost" size="sm" data-testid={`button-edit-${contract.id}`}>
                                  <Edit2 className="w-4 h-4" />
                                </Button>
                                <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive" data-testid={`button-delete-${contract.id}`}>
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
                              <Calendar className="w-8 h-8 text-muted-foreground" />
                            </div>
                            <h3 className="text-lg font-semibold text-foreground mb-2">
                              No se encontraron contratos
                            </h3>
                            <p className="text-muted-foreground mb-6">
                              {searchTerm ? "No hay contratos que coincidan con tu búsqueda." : "Comienza agregando tu primer contrato."}
                            </p>
                            <Button data-testid="button-add-first-contract">
                              <Plus className="w-4 h-4 mr-2" />
                              Agregar Primer Contrato
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
