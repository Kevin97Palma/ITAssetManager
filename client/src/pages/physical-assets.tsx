import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { isUnauthorizedError } from "@/lib/authUtils";
import { useAuth } from "@/hooks/useAuth";
import Sidebar from "@/components/layout/sidebar";
import Header from "@/components/layout/header";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import AddAssetModal from "@/components/modals/add-asset-modal";
import { Plus, Search, Filter, Edit2, Trash2, Eye } from "lucide-react";

export default function PhysicalAssets() {
  const { toast } = useToast();
  const { isAuthenticated, isLoading } = useAuth();
  const [selectedCompanyId, setSelectedCompanyId] = useState<string>("");
  const [showAddAssetModal, setShowAddAssetModal] = useState(false);
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

  const { data: assets = [], isLoading: isAssetsLoading, error: assetsError } = useQuery({
    queryKey: ["/api/assets", selectedCompanyId],
    enabled: !!selectedCompanyId,
  });

  useEffect(() => {
    if (assetsError && isUnauthorizedError(assetsError as Error)) {
      toast({
        title: "No autorizado",
        description: "Redirigiendo al inicio de sesión...",
        variant: "destructive",
      });
      setTimeout(() => {
        window.location.href = "/api/login";
      }, 500);
    }
  }, [assetsError, toast]);

  if (isLoading || !isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Skeleton className="w-32 h-8" />
      </div>
    );
  }

  // Filter physical assets only
  const physicalAssets = assets.filter((asset: any) => asset.type === "physical");
  
  // Filter by search term
  const filteredAssets = physicalAssets.filter((asset: any) =>
    asset.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    asset.manufacturer?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    asset.model?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "active":
        return <Badge className="bg-accent text-accent-foreground">Activo</Badge>;
      case "maintenance":
        return <Badge className="bg-chart-3 text-white">Mantenimiento</Badge>;
      case "inactive":
        return <Badge variant="secondary">Inactivo</Badge>;
      case "deprecated":
        return <Badge className="bg-chart-4 text-white">Obsoleto</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  return (
    <div className="flex h-screen">
      <Sidebar 
        selectedCompanyId={selectedCompanyId} 
        onCompanyChange={setSelectedCompanyId} 
      />
      
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header 
          title="Activos Físicos" 
          subtitle="Gestión de equipos y hardware" 
        />
        
        <main className="flex-1 overflow-y-auto bg-background">
          <div className="p-6">
            {/* Actions Bar */}
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center space-x-4">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                  <Input
                    placeholder="Buscar activos físicos..."
                    className="pl-10 w-80"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    data-testid="input-search-assets"
                  />
                </div>
                <Button variant="outline" data-testid="button-filters">
                  <Filter className="w-4 h-4 mr-2" />
                  Filtros
                </Button>
              </div>
              <Button 
                onClick={() => setShowAddAssetModal(true)}
                data-testid="button-add-physical-asset"
              >
                <Plus className="w-4 h-4 mr-2" />
                Agregar Activo
              </Button>
            </div>

            {/* Assets Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {isAssetsLoading ? (
                Array.from({ length: 8 }).map((_, i) => (
                  <Card key={i} className="border-border">
                    <CardContent className="p-6">
                      <Skeleton className="h-4 w-3/4 mb-2" />
                      <Skeleton className="h-3 w-1/2 mb-4" />
                      <Skeleton className="h-8 w-full mb-2" />
                      <Skeleton className="h-6 w-20" />
                    </CardContent>
                  </Card>
                ))
              ) : filteredAssets.length > 0 ? (
                filteredAssets.map((asset: any) => (
                  <Card key={asset.id} className="border-border hover:shadow-md transition-shadow" data-testid={`card-asset-${asset.id}`}>
                    <CardContent className="p-6">
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex-1">
                          <h3 className="font-semibold text-foreground mb-1" data-testid="text-asset-name">
                            {asset.name}
                          </h3>
                          <p className="text-sm text-muted-foreground">
                            {asset.manufacturer} {asset.model}
                          </p>
                        </div>
                        {getStatusBadge(asset.status)}
                      </div>
                      
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Serial:</span>
                          <span className="text-foreground font-medium">{asset.serialNumber || "N/A"}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Ubicación:</span>
                          <span className="text-foreground font-medium">{asset.location || "N/A"}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Costo Mensual:</span>
                          <span className="text-foreground font-medium">
                            ${Number(asset.monthlyCost || 0).toLocaleString()}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center justify-between mt-4 pt-4 border-t border-border">
                        <div className="flex space-x-2">
                          <Button variant="ghost" size="sm" data-testid={`button-view-${asset.id}`}>
                            <Eye className="w-4 h-4" />
                          </Button>
                          <Button variant="ghost" size="sm" data-testid={`button-edit-${asset.id}`}>
                            <Edit2 className="w-4 h-4" />
                          </Button>
                          <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive" data-testid={`button-delete-${asset.id}`}>
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))
              ) : (
                <div className="col-span-full">
                  <Card className="border-border">
                    <CardContent className="p-12 text-center">
                      <div className="w-16 h-16 bg-muted/50 rounded-full flex items-center justify-center mx-auto mb-4">
                        <Search className="w-8 h-8 text-muted-foreground" />
                      </div>
                      <h3 className="text-lg font-semibold text-foreground mb-2">
                        No se encontraron activos físicos
                      </h3>
                      <p className="text-muted-foreground mb-6">
                        {searchTerm ? "No hay activos que coincidan con tu búsqueda." : "Comienza agregando tu primer activo físico."}
                      </p>
                      <Button 
                        onClick={() => setShowAddAssetModal(true)}
                        data-testid="button-add-first-asset"
                      >
                        <Plus className="w-4 h-4 mr-2" />
                        Agregar Primer Activo
                      </Button>
                    </CardContent>
                  </Card>
                </div>
              )}
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
