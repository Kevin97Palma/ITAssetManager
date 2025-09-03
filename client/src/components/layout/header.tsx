import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Bell, LogOut, AlertTriangle, Calendar, ExternalLink } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";

interface HeaderProps {
  title: string;
  subtitle?: string;
  selectedCompanyId?: string;
}

export default function Header({ title, subtitle, selectedCompanyId }: HeaderProps) {
  const { user } = useAuth();
  const [showNotifications, setShowNotifications] = useState(false);

  // Get assets for notifications
  const { data: assets = [] } = useQuery({
    queryKey: ["/api/assets", selectedCompanyId],
    enabled: !!selectedCompanyId,
  });

  // Get expiring services notifications
  const getExpiringServices = () => {
    const now = new Date();
    const thirtyDaysFromNow = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
    
    const notifications: any[] = [];
    
    assets.forEach((asset: any) => {
      if (asset.type !== 'application') return;
      
      const services = [
        { name: 'Dominio', date: asset.domainExpiry, app: asset.name },
        { name: 'SSL', date: asset.sslExpiry, app: asset.name },
        { name: 'Hosting', date: asset.hostingExpiry, app: asset.name },
        { name: 'Servidor', date: asset.serverExpiry, app: asset.name }
      ];
      
      services.forEach(service => {
        if (!service.date) return;
        
        const expiryDate = new Date(service.date);
        if (expiryDate < now) {
          notifications.push({
            type: 'expired',
            service: service.name,
            app: service.app,
            date: expiryDate,
            message: `${service.name} de ${service.app} ha expirado`
          });
        } else if (expiryDate <= thirtyDaysFromNow) {
          const daysLeft = Math.ceil((expiryDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
          notifications.push({
            type: 'expiring',
            service: service.name,
            app: service.app,
            date: expiryDate,
            daysLeft,
            message: `${service.name} de ${service.app} expira en ${daysLeft} día${daysLeft === 1 ? '' : 's'}`
          });
        }
      });
    });
    
    return notifications.sort((a, b) => {
      if (a.type === 'expired' && b.type !== 'expired') return -1;
      if (a.type !== 'expired' && b.type === 'expired') return 1;
      return a.date.getTime() - b.date.getTime();
    });
  };

  const notifications = getExpiringServices();
  const hasNotifications = notifications.length > 0;

  const getInitials = (firstName?: string, lastName?: string) => {
    if (!firstName && !lastName) return "U";
    return `${firstName?.[0] || ""}${lastName?.[0] || ""}`.toUpperCase();
  };

  const getDisplayName = (firstName?: string, lastName?: string, email?: string) => {
    if (firstName || lastName) {
      return `${firstName || ""} ${lastName || ""}`.trim();
    }
    return email || "Usuario";
  };

  return (
    <header className="bg-card border-b border-border px-6 py-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-foreground" data-testid="text-page-title">{title}</h2>
          {subtitle && (
            <p className="text-sm text-muted-foreground" data-testid="text-page-subtitle">{subtitle}</p>
          )}
        </div>
        <div className="flex items-center space-x-4">
          <DropdownMenu open={showNotifications} onOpenChange={setShowNotifications}>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="relative text-muted-foreground hover:text-foreground"
                data-testid="button-notifications"
              >
                <Bell className="w-5 h-5" />
                {hasNotifications && (
                  <Badge className="absolute -top-1 -right-1 min-w-[1.2rem] h-5 p-1 text-xs bg-destructive text-destructive-foreground">
                    {notifications.length > 9 ? '9+' : notifications.length}
                  </Badge>
                )}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-80">
              <div className="p-4 border-b">
                <h4 className="font-semibold text-sm">Notificaciones</h4>
                <p className="text-xs text-muted-foreground">
                  {notifications.length === 0 ? 'No hay notificaciones' : `${notifications.length} notificación${notifications.length === 1 ? '' : 'es'}`}
                </p>
              </div>
              <ScrollArea className="max-h-64">
                {notifications.length === 0 ? (
                  <div className="p-4 text-center text-sm text-muted-foreground">
                    No hay servicios próximos a expirar
                  </div>
                ) : (
                  notifications.map((notification, index) => (
                    <div key={index} className={`p-3 border-b last:border-b-0 hover:bg-muted/50 cursor-pointer ${
                      notification.type === 'expired' ? 'bg-destructive/5' : 'bg-chart-4/5'
                    }`}>
                      <div className="flex items-start space-x-2">
                        <AlertTriangle className={`w-4 h-4 mt-0.5 ${
                          notification.type === 'expired' ? 'text-destructive' : 'text-chart-4'
                        }`} />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-foreground truncate">
                            {notification.app}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {notification.message}
                          </p>
                          <p className="text-xs text-muted-foreground mt-1">
                            {notification.date.toLocaleDateString()}
                          </p>
                        </div>
                        <Badge variant={notification.type === 'expired' ? 'destructive' : 'outline'} className="text-xs">
                          {notification.type === 'expired' ? 'Vencido' : `${notification.daysLeft}d`}
                        </Badge>
                      </div>
                    </div>
                  ))
                )}
              </ScrollArea>
              {notifications.length > 0 && (
                <div className="p-2 border-t">
                  <Button variant="ghost" size="sm" className="w-full text-xs" onClick={() => setShowNotifications(false)}>
                    <ExternalLink className="w-3 h-3 mr-1" />
                    Ver todas las aplicaciones
                  </Button>
                </div>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
          
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="flex items-center space-x-2 p-2" data-testid="button-user-menu">
                <Avatar className="w-8 h-8">
                  <AvatarImage src={user?.profileImageUrl || ""} />
                  <AvatarFallback className="bg-primary text-primary-foreground text-xs">
                    {getInitials(user?.firstName, user?.lastName)}
                  </AvatarFallback>
                </Avatar>
                <div className="text-left">
                  <p className="text-sm font-medium text-foreground" data-testid="text-user-name">
                    {getDisplayName(user?.firstName, user?.lastName, user?.email)}
                  </p>
                  <p className="text-xs text-muted-foreground" data-testid="text-user-role">
                    {user?.role === "super_admin" ? "Super Administrador" :
                     user?.role === "technical_admin" ? "Administrador TI" :
                     "Gerente/Propietario"}
                  </p>
                </div>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => window.location.href = '/api/logout'} data-testid="button-logout">
                <LogOut className="w-4 h-4 mr-2" />
                Cerrar Sesión
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  );
}
