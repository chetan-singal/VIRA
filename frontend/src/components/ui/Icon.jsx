import {
  House, LayoutDashboard, FilePlus2, BookOpen, Users, Package, Truck, Wallet, Search, Store, Settings, LogOut,
  Pencil, Trash2, Undo2, Eye, Printer, X, Check, Plus, ArrowRight, ChevronLeft, ChevronRight,
  CircleCheck, CircleAlert, Info, TriangleAlert, Receipt, IndianRupee, Banknote, Cog, Inbox, RefreshCw,
} from 'lucide-react';

/*
 * Every icon the app uses is registered here, once. If a future lucide-react release renames an icon,
 * the build points at this file and nothing else needs to change.
 */
const ICONS = {
  home: House, dashboard: LayoutDashboard, newBill: FilePlus2, daybook: BookOpen, parties: Users, items: Package,
  suppliers: Truck, vouchers: Wallet, search: Search, shop: Store, settings: Settings, exit: LogOut,
  edit: Pencil, delete: Trash2, restore: Undo2, view: Eye, print: Printer, close: X, check: Check, plus: Plus,
  arrowRight: ArrowRight, chevronLeft: ChevronLeft, chevronRight: ChevronRight,
  success: CircleCheck, error: CircleAlert, info: Info, warning: TriangleAlert,
  receipt: Receipt, rupee: IndianRupee, cash: Banknote, gear: Cog, inbox: Inbox, refresh: RefreshCw,
};

export default function Icon({ name, size = 18, ...rest }) {
  const Component = ICONS[name] ?? Info;
  return <Component size={size} strokeWidth={2} aria-hidden="true" focusable="false" {...rest} />;
}
