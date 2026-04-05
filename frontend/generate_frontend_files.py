#!/usr/bin/env python3
"""
Generate complete frontend applications for UBI Platform
This script creates all necessary files for portal-ui and admin-ui
"""

import os
from pathlib import Path

# Base paths
PORTAL_BASE = Path("portal-ui/src")
ADMIN_BASE = Path("admin-ui/src")


def ensure_dir(path):
    """Create directory if it doesn't exist"""
    path.parent.mkdir(parents=True, exist_ok=True)


def write_file(path, content):
    """Write content to file"""
    ensure_dir(path)
    with open(path, "w", encoding="utf-8") as f:
        f.write(content)
    print(f"✓ Created: {path}")


# =============================================================================
# PORTAL UI FILES
# =============================================================================


def generate_portal_ui():
    """Generate all portal-ui files"""

    print("\n📦 Generating Portal UI files...")

    # Auth Login Page
    write_file(
        PORTAL_BASE / "app/(auth)/login/page.tsx",
        """
'use client';

import { signIn } from 'next-auth/react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export default function LoginPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl font-bold">Welcome to UBI Platform</CardTitle>
          <CardDescription>
            Sign in to access your Universal Basic Income portal
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button 
            onClick={() => signIn('keycloak', { callbackUrl: '/dashboard' })}
            className="w-full"
            size="lg"
          >
            Sign in with Keycloak
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
""",
    )

    # Dashboard Layout
    write_file(
        PORTAL_BASE / "app/(dashboard)/layout.tsx",
        """
import { DashboardNav } from '@/components/layout/dashboard-nav';
import { DashboardHeader } from '@/components/layout/dashboard-header';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen">
      <DashboardNav />
      <div className="flex-1">
        <DashboardHeader />
        <main className="p-6">{children}</main>
      </div>
    </div>
  );
}
""",
    )

    # Dashboard Page
    write_file(
        PORTAL_BASE / "app/(dashboard)/dashboard/page.tsx",
        """
'use client';

import { useQuery } from '@tanstack/react-query';
import apiClient from '@/lib/api-client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { formatCurrency, formatNumber } from '@/lib/utils';
import { DollarSign, TrendingUp, Award, Users } from 'lucide-react';

export default function DashboardPage() {
  const { data: dashboard } = useQuery({
    queryKey: ['dashboard'],
    queryFn: () => apiClient.get('/api/dashboard'),
  });

  const stats = [
    {
      title: 'UBI Balance',
      value: dashboard?.ubiBalance || 0,
      icon: DollarSign,
      format: (v: number) => formatCurrency(v),
    },
    {
      title: 'Treasury APY',
      value: dashboard?.treasuryApy || 0,
      icon: TrendingUp,
      format: (v: number) => `${v.toFixed(2)}%`,
    },
    {
      title: 'Tasks Completed',
      value: dashboard?.tasksCompleted || 0,
      icon: Award,
      format: formatNumber,
    },
    {
      title: 'Reputation Score',
      value: dashboard?.reputationScore || 0,
      icon: Users,
      format: formatNumber,
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Dashboard</h1>
        <p className="text-muted-foreground">
          Welcome back! Here's your platform overview.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => (
          <Card key={stat.title}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{stat.title}</CardTitle>
              <stat.icon className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stat.format(stat.value)}</div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
""",
    )

    # UBI Page
    write_file(
        PORTAL_BASE / "app/(dashboard)/ubi/page.tsx",
        """
'use client';

import { useQuery } from '@tanstack/react-query';
import apiClient from '@/lib/api-client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { formatCurrency, formatDateTime } from '@/lib/utils';

export default function UBIPage() {
  const { data: ubiData } = useQuery({
    queryKey: ['ubi'],
    queryFn: () => apiClient.get('/api/ubi'),
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Universal Basic Income</h1>
        <p className="text-muted-foreground">
          Your UBI balance and distribution history
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Current Balance</CardTitle>
            <CardDescription>Your total UBI balance</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-4xl font-bold">
              {formatCurrency(ubiData?.balance || 0)}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Next Distribution</CardTitle>
            <CardDescription>Upcoming UBI payment</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-semibold">
              {ubiData?.nextDistribution ? formatDateTime(ubiData.nextDistribution) : 'N/A'}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Distribution History</CardTitle>
          <CardDescription>Your past UBI distributions</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {ubiData?.history?.map((item: any) => (
              <div key={item.id} className="flex justify-between items-center border-b pb-2">
                <div>
                  <div className="font-medium">{formatDateTime(item.date)}</div>
                  <div className="text-sm text-muted-foreground">{item.type}</div>
                </div>
                <div className="text-lg font-semibold">
                  {formatCurrency(item.amount)}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
""",
    )

    # Tasks Page
    write_file(
        PORTAL_BASE / "app/(dashboard)/tasks/page.tsx",
        """
'use client';

import { useQuery } from '@tanstack/react-query';
import apiClient from '@/lib/api-client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { formatCurrency } from '@/lib/utils';
import Link from 'next/link';

export default function TasksPage() {
  const { data: tasks } = useQuery({
    queryKey: ['tasks'],
    queryFn: () => apiClient.get('/api/tasks'),
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Task Marketplace</h1>
        <p className="text-muted-foreground">
          Browse and complete tasks to earn rewards
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {tasks?.map((task: any) => (
          <Card key={task.id}>
            <CardHeader>
              <div className="flex items-start justify-between">
                <CardTitle className="text-lg">{task.title}</CardTitle>
                <Badge>{task.category}</Badge>
              </div>
              <CardDescription>{task.description}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-2xl font-bold">
                    {formatCurrency(task.reward)}
                  </div>
                  <div className="text-sm text-muted-foreground">Reward</div>
                </div>
                <Button asChild>
                  <Link href={`/tasks/${task.id}`}>View Task</Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
""",
    )

    # Components - UI Button
    write_file(
        PORTAL_BASE / "components/ui/button.tsx",
        """
import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground hover:bg-primary/90",
        destructive: "bg-destructive text-destructive-foreground hover:bg-destructive/90",
        outline: "border border-input bg-background hover:bg-accent hover:text-accent-foreground",
        secondary: "bg-secondary text-secondary-foreground hover:bg-secondary/80",
        ghost: "hover:bg-accent hover:text-accent-foreground",
        link: "text-primary underline-offset-4 hover:underline",
      },
      size: {
        default: "h-10 px-4 py-2",
        sm: "h-9 rounded-md px-3",
        lg: "h-11 rounded-md px-8",
        icon: "h-10 w-10",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button"
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    )
  }
)
Button.displayName = "Button"

export { Button, buttonVariants }
""",
    )

    # Components - UI Card
    write_file(
        PORTAL_BASE / "components/ui/card.tsx",
        """
import * as React from "react"
import { cn } from "@/lib/utils"

const Card = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      className={cn("rounded-lg border bg-card text-card-foreground shadow-sm", className)}
      {...props}
    />
  )
)
Card.displayName = "Card"

const CardHeader = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn("flex flex-col space-y-1.5 p-6", className)} {...props} />
  )
)
CardHeader.displayName = "CardHeader"

const CardTitle = React.forwardRef<HTMLParagraphElement, React.HTMLAttributes<HTMLHeadingElement>>(
  ({ className, ...props }, ref) => (
    <h3 ref={ref} className={cn("text-2xl font-semibold leading-none tracking-tight", className)} {...props} />
  )
)
CardTitle.displayName = "CardTitle"

const CardDescription = React.forwardRef<HTMLParagraphElement, React.HTMLAttributes<HTMLParagraphElement>>(
  ({ className, ...props }, ref) => (
    <p ref={ref} className={cn("text-sm text-muted-foreground", className)} {...props} />
  )
)
CardDescription.displayName = "CardDescription"

const CardContent = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn("p-6 pt-0", className)} {...props} />
  )
)
CardContent.displayName = "CardContent"

export { Card, CardHeader, CardTitle, CardDescription, CardContent }
""",
    )

    # Components - UI Badge
    write_file(
        PORTAL_BASE / "components/ui/badge.tsx",
        """
import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"

const badgeVariants = cva(
  "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
  {
    variants: {
      variant: {
        default: "border-transparent bg-primary text-primary-foreground hover:bg-primary/80",
        secondary: "border-transparent bg-secondary text-secondary-foreground hover:bg-secondary/80",
        destructive: "border-transparent bg-destructive text-destructive-foreground hover:bg-destructive/80",
        outline: "text-foreground",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return <div className={cn(badgeVariants({ variant }), className)} {...props} />
}

export { Badge, badgeVariants }
""",
    )

    # Layout Components - Dashboard Nav
    write_file(
        PORTAL_BASE / "components/layout/dashboard-nav.tsx",
        """
'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { 
  LayoutDashboard, 
  DollarSign, 
  Briefcase, 
  TrendingUp, 
  Bot, 
  Award, 
  Users, 
  GitBranch,
  Vote,
  Shield,
  Settings
} from 'lucide-react';

const navItems = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/ubi', label: 'UBI', icon: DollarSign },
  { href: '/tasks', label: 'Tasks', icon: Briefcase },
  { href: '/treasury', label: 'Treasury', icon: TrendingUp },
  { href: '/agents', label: 'Agents', icon: Bot },
  { href: '/rewards', label: 'Rewards', icon: Award },
  { href: '/reputation', label: 'Reputation', icon: Users },
  { href: '/referrals', label: 'Referrals', icon: GitBranch },
  { href: '/governance', label: 'Governance', icon: Vote },
  { href: '/vault', label: 'Vault', icon: Shield },
  { href: '/settings', label: 'Settings', icon: Settings },
];

export function DashboardNav() {
  const pathname = usePathname();

  return (
    <div className="hidden border-r bg-gray-100/40 lg:block dark:bg-gray-800/40 w-64">
      <div className="flex h-full max-h-screen flex-col gap-2">
        <div className="flex h-[60px] items-center border-b px-6">
          <Link className="flex items-center gap-2 font-semibold" href="/">
            <span className="text-xl">UBI Platform</span>
          </Link>
        </div>
        <div className="flex-1 overflow-auto py-2">
          <nav className="grid items-start px-4 text-sm font-medium">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center gap-3 rounded-lg px-3 py-2 transition-all hover:text-primary",
                  pathname === item.href
                    ? "bg-gray-100 text-primary dark:bg-gray-800"
                    : "text-gray-500 dark:text-gray-400"
                )}
              >
                <item.icon className="h-4 w-4" />
                {item.label}
              </Link>
            ))}
          </nav>
        </div>
      </div>
    </div>
  );
}
""",
    )

    # Layout Components - Dashboard Header
    write_file(
        PORTAL_BASE / "components/layout/dashboard-header.tsx",
        """
'use client';

import { Bell, User } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { signOut } from 'next-auth/react';

export function DashboardHeader() {
  return (
    <header className="flex h-14 lg:h-[60px] items-center gap-4 border-b bg-gray-100/40 px-6 dark:bg-gray-800/40">
      <div className="flex-1"></div>
      <Button variant="ghost" size="icon">
        <Bell className="h-5 w-5" />
      </Button>
      <Button variant="ghost" size="icon" onClick={() => signOut()}>
        <User className="h-5 w-5" />
      </Button>
    </header>
  );
}
""",
    )

    print("✅ Portal UI files generated successfully!")


# =============================================================================
# ADMIN UI FILES
# =============================================================================


def generate_admin_ui():
    """Generate all admin-ui files"""

    print("\n📦 Generating Admin UI files...")

    # Copy package.json for admin-ui
    write_file(
        Path("admin-ui/package.json"),
        """
{
  "name": "ubi-admin-ui",
  "version": "1.0.0",
  "private": true,
  "scripts": {
    "dev": "next dev -p 3001",
    "build": "next build",
    "start": "next start -p 3001",
    "lint": "next lint",
    "type-check": "tsc --noEmit"
  },
  "dependencies": {
    "@hookform/resolvers": "^3.3.4",
    "@radix-ui/react-dialog": "^1.0.5",
    "@radix-ui/react-dropdown-menu": "^2.0.6",
    "@radix-ui/react-label": "^2.0.2",
    "@radix-ui/react-slot": "^1.0.2",
    "@radix-ui/react-toast": "^1.1.5",
    "@tanstack/react-query": "^5.25.0",
    "@tanstack/react-table": "^8.13.2",
    "axios": "^1.6.7",
    "chart.js": "^4.4.1",
    "class-variance-authority": "^0.7.0",
    "clsx": "^2.1.0",
    "date-fns": "^3.3.1",
    "lucide-react": "^0.344.0",
    "next": "14.1.3",
    "next-auth": "^4.24.6",
    "next-themes": "^0.2.1",
    "react": "^18.2.0",
    "react-chartjs-2": "^5.2.0",
    "react-dom": "^18.2.0",
    "react-hook-form": "^7.50.1",
    "recharts": "^2.12.2",
    "sonner": "^1.4.3",
    "tailwind-merge": "^2.2.1",
    "tailwindcss-animate": "^1.0.7",
    "zod": "^3.22.4",
    "zustand": "^4.5.2"
  },
  "devDependencies": {
    "@types/node": "^20.11.24",
    "@types/react": "^18.2.61",
    "@types/react-dom": "^18.2.19",
    "autoprefixer": "^10.4.18",
    "eslint": "^8.57.0",
    "eslint-config-next": "14.1.3",
    "postcss": "^8.4.35",
    "tailwindcss": "^3.4.1",
    "typescript": "^5.3.3"
  }
}
""",
    )

    # Admin Dashboard Page
    write_file(
        ADMIN_BASE / "app/(admin)/admin/page.tsx",
        """
'use client';

import { useQuery } from '@tanstack/react-query';
import apiClient from '@/lib/api-client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { formatNumber, formatCurrency } from '@/lib/utils';
import { Users, DollarSign, Activity, AlertCircle } from 'lucide-react';

export default function AdminDashboardPage() {
  const { data: metrics } = useQuery({
    queryKey: ['admin-metrics'],
    queryFn: () => apiClient.get('/api/admin/metrics'),
  });

  const stats = [
    {
      title: 'Total Users',
      value: metrics?.totalUsers || 0,
      icon: Users,
      format: formatNumber,
    },
    {
      title: 'Total Revenue',
      value: metrics?.totalRevenue || 0,
      icon: DollarSign,
      format: formatCurrency,
    },
    {
      title: 'Active Tasks',
      value: metrics?.activeTasks || 0,
      icon: Activity,
      format: formatNumber,
    },
    {
      title: 'Open Alerts',
      value: metrics?.openAlerts || 0,
      icon: AlertCircle,
      format: formatNumber,
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Admin Dashboard</h1>
        <p className="text-muted-foreground">
          Platform metrics and system overview
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => (
          <Card key={stat.title}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{stat.title}</CardTitle>
              <stat.icon className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stat.format(stat.value)}</div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
""",
    )

    # Copy similar structure files from portal-ui
    for file_path, content in [
        ("app/layout.tsx", PORTAL_BASE / "app/layout.tsx"),
        ("app/globals.css", PORTAL_BASE / "app/globals.css"),
        ("lib/utils.ts", PORTAL_BASE / "lib/utils.ts"),
        ("lib/api-client.ts", PORTAL_BASE / "lib/api-client.ts"),
        ("components/ui/button.tsx", PORTAL_BASE / "components/ui/button.tsx"),
        ("components/ui/card.tsx", PORTAL_BASE / "components/ui/card.tsx"),
    ]:
        if Path(content).exists():
            with open(content, "r", encoding="utf-8") as f:
                write_file(ADMIN_BASE / file_path, f.read())

    print("✅ Admin UI files generated successfully!")


# =============================================================================
# MAIN
# =============================================================================


def main():
    print("🚀 UBI Platform Frontend Generator")
    print("=" * 60)

    try:
        generate_portal_ui()
        generate_admin_ui()

        print("\n" + "=" * 60)
        print("✅ All files generated successfully!")
        print("\n📝 Next steps:")
        print("1. cd frontend/portal-ui && npm install")
        print("2. cd frontend/admin-ui && npm install")
        print("3. Copy .env.example to .env.local")
        print("4. npm run dev")
        print("\n📚 See frontend/SETUP.md for detailed instructions")

    except Exception as e:
        print(f"\n❌ Error: {e}")
        return 1

    return 0


if __name__ == "__main__":
    exit(main())
