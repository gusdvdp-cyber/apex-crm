export type ModuleCategory = 'core' | 'base' | 'nicho'

export interface ModuleDefinition {
  key: string
  label: string
  icon: string
  route: string
  category: ModuleCategory
  description: string
}

export const MODULE_DEFINITIONS: ModuleDefinition[] = [
  // ── CORE (siempre visibles si activos)
  {
    key: 'inbox',
    label: 'Inbox',
    icon: 'MessageSquare',
    route: '/inbox',
    category: 'core',
    description: 'Conversaciones WhatsApp, Instagram, email',
  },
  {
    key: 'contactos',
    label: 'Contactos',
    icon: 'Users',
    route: '/contactos',
    category: 'core',
    description: 'Base de datos de clientes y leads',
  },
  {
    key: 'pipeline',
    label: 'Pipeline',
    icon: 'Kanban',
    route: '/pipeline',
    category: 'core',
    description: 'Kanban de deals y oportunidades',
  },
  {
    key: 'metricas',
    label: 'Métricas',
    icon: 'BarChart2',
    route: '/metricas',
    category: 'core',
    description: 'KPIs y gráficos de performance',
  },

  // ── BASE (módulos estándar opcionales)
  {
    key: 'calendario',
    label: 'Calendario',
    icon: 'CalendarDays',
    route: '/calendario',
    category: 'base',
    description: 'Turnos, reservas y eventos del equipo',
  },
  {
    key: 'stock',
    label: 'Stock',
    icon: 'Package',
    route: '/stock',
    category: 'base',
    description: 'Inventario y control de productos',
  },
  {
    key: 'facturacion',
    label: 'Facturación',
    icon: 'FileText',
    route: '/facturacion',
    category: 'base',
    description: 'Presupuestos, facturas y cobros',
  },
  {
    key: 'empleados',
    label: 'Empleados',
    icon: 'UserCheck',
    route: '/empleados',
    category: 'base',
    description: 'Equipo, roles y horarios',
  },
  {
    key: 'reportes',
    label: 'Reportes',
    icon: 'TrendingUp',
    route: '/reportes',
    category: 'base',
    description: 'Exportables PDF / Excel',
  },

  // ── NICHO (verticales específicas)
  {
    key: 'reservas_hotel',
    label: 'Reservas Hotel',
    icon: 'BedDouble',
    route: '/reservas-hotel',
    category: 'nicho',
    description: 'Check-in, check-out, habitaciones',
  },
  {
    key: 'menu_restaurante',
    label: 'Restaurante',
    icon: 'UtensilsCrossed',
    route: '/menu-restaurante',
    category: 'nicho',
    description: 'Menú, mesas y pedidos',
  },
  {
    key: 'seguros_autos',
    label: 'Seguros Autos',
    icon: 'Car',
    route: '/seguros-autos',
    category: 'nicho',
    description: 'Pólizas, vehículos y vencimientos',
  },
  {
    key: 'expedientes',
    label: 'Expedientes',
    icon: 'FolderOpen',
    route: '/expedientes',
    category: 'nicho',
    description: 'Casos legales, médicos o similares',
  },
  {
    key: 'obra',
    label: 'Obra',
    icon: 'HardHat',
    route: '/obra',
    category: 'nicho',
    description: 'Proyectos de construcción y avance',
  },
]

export const MODULE_CATEGORY_LABELS: Record<ModuleCategory, string> = {
  core: 'Core',
  base: 'Módulos base',
  nicho: 'Verticales de nicho',
}