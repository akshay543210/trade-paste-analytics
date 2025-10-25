import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { TrendingUp, Upload, BarChart3, User, LogOut, Sparkles, Menu, X } from 'lucide-react';
import { FaTwitter, FaTelegram, FaDiscord } from 'react-icons/fa';
import { ThemeToggle } from '@/components/ui/theme-toggle';
import { useIsMobile } from '@/hooks/use-mobile';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Sheet,
  SheetContent,
  SheetTrigger,
} from '@/components/ui/sheet';

export const Navbar: React.FC = () => {
  const { user, signOut } = useAuth();
  const location = useLocation();
  const isMobile = useIsMobile();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const isActive = (path: string) => {
    return location.pathname === path;
  };

  return (
    <nav className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container mx-auto px-4 h-16 flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Link to="/" className="flex items-center space-x-2">
            <TrendingUp className="h-6 w-6 text-primary" />
            <span className="font-bold text-lg sm:text-xl">Propfirm Knowledge</span>
          </Link>
          
          {user && (
            <>
              {/* Desktop Navigation */}
              <div className="hidden md:flex items-center space-x-1">
                <Button
                  variant={isActive('/') ? 'default' : 'ghost'}
                  asChild
                  size="sm"
                >
                  <Link to="/">Dashboard</Link>
                </Button>
                <Button
                  variant={isActive('/trade-input') ? 'default' : 'ghost'}
                  asChild
                  size="sm"
                >
                  <Link to="/trade-input" className="flex items-center space-x-2">
                    <Upload className="h-4 w-4" />
                    <span>Add Trade</span>
                  </Link>
                </Button>
                <Button
                  variant={isActive('/analytics') ? 'default' : 'ghost'}
                  asChild
                  size="sm"
                >
                  <Link to="/analytics" className="flex items-center space-x-2">
                    <BarChart3 className="h-4 w-4" />
                    <span>Analytics</span>
                  </Link>
                </Button>
                <Button
                  variant={isActive('/dashboard') ? 'default' : 'ghost'}
                  asChild
                  size="sm"
                >
                  <Link to="/dashboard" className="flex items-center space-x-2">
                    <Sparkles className="h-4 w-4" />
                    <span>AI Insights</span>
                  </Link>
                </Button>
              </div>

              {/* Mobile Navigation */}
              <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
                <SheetTrigger asChild>
                  <Button variant="ghost" size="sm" className="md:hidden">
                    <Menu className="h-5 w-5" />
                  </Button>
                </SheetTrigger>
                <SheetContent side="right" className="w-80">
                  <div className="flex flex-col space-y-6 mt-6">
                    <div className="space-y-2">
                      <h3 className="font-semibold text-lg">Navigation</h3>
                      <div className="space-y-1">
                        <Button
                          variant={isActive('/') ? 'default' : 'ghost'}
                          asChild
                          className="w-full justify-start"
                          onClick={() => setMobileMenuOpen(false)}
                        >
                          <Link to="/" className="flex items-center space-x-2">
                            <TrendingUp className="h-4 w-4" />
                            <span>Dashboard</span>
                          </Link>
                        </Button>
                        <Button
                          variant={isActive('/trade-input') ? 'default' : 'ghost'}
                          asChild
                          className="w-full justify-start"
                          onClick={() => setMobileMenuOpen(false)}
                        >
                          <Link to="/trade-input" className="flex items-center space-x-2">
                            <Upload className="h-4 w-4" />
                            <span>Add Trade</span>
                          </Link>
                        </Button>
                        <Button
                          variant={isActive('/analytics') ? 'default' : 'ghost'}
                          asChild
                          className="w-full justify-start"
                          onClick={() => setMobileMenuOpen(false)}
                        >
                          <Link to="/analytics" className="flex items-center space-x-2">
                            <BarChart3 className="h-4 w-4" />
                            <span>Analytics</span>
                          </Link>
                        </Button>
                        <Button
                          variant={isActive('/dashboard') ? 'default' : 'ghost'}
                          asChild
                          className="w-full justify-start"
                          onClick={() => setMobileMenuOpen(false)}
                        >
                          <Link to="/dashboard" className="flex items-center space-x-2">
                            <Sparkles className="h-4 w-4" />
                            <span>AI Insights</span>
                          </Link>
                        </Button>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <h3 className="font-semibold text-lg">Social</h3>
                      <div className="flex items-center space-x-4">
                        <a 
                          href="https://x.com/propfirm_forex" 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="text-muted-foreground hover:text-primary transition-colors"
                          aria-label="Twitter"
                        >
                          <FaTwitter className="h-5 w-5" />
                        </a>
                        <a 
                          href="https://telegram.dog/free_propfirm_accounts" 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="text-muted-foreground hover:text-primary transition-colors"
                          aria-label="Telegram"
                        >
                          <FaTelegram className="h-5 w-5" />
                        </a>
                        <a 
                          href="https://discord.com/invite/7MRsuqqT3n" 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="text-muted-foreground hover:text-primary transition-colors"
                          aria-label="Discord"
                        >
                          <FaDiscord className="h-5 w-5" />
                        </a>
                      </div>
                    </div>
                  </div>
                </SheetContent>
              </Sheet>
            </>
          )}
        </div>

        <div className="flex items-center gap-2 sm:gap-4">
          {/* Social Icons - Desktop Only */}
          <div className="hidden md:flex items-center gap-3">
            <a 
              href="https://x.com/propfirm_forex" 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-muted-foreground hover:text-primary transition-colors"
              aria-label="Twitter"
            >
              <FaTwitter className="h-5 w-5" />
            </a>
            <a 
              href="https://telegram.dog/free_propfirm_accounts" 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-muted-foreground hover:text-primary transition-colors"
              aria-label="Telegram"
            >
              <FaTelegram className="h-5 w-5" />
            </a>
            <a 
              href="https://discord.com/invite/7MRsuqqT3n" 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-muted-foreground hover:text-primary transition-colors"
              aria-label="Discord"
            >
              <FaDiscord className="h-5 w-5" />
            </a>
          </div>

          {/* Theme Toggle */}
          <ThemeToggle />

          {user ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="flex items-center space-x-2">
                  <User className="h-4 w-4" />
                  <span className="hidden sm:inline">{user.email}</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuItem
                  onClick={signOut}
                  className="flex items-center space-x-2 text-destructive"
                >
                  <LogOut className="h-4 w-4" />
                  <span>Sign Out</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <Button asChild size="sm">
              <Link to="/auth">Sign In</Link>
            </Button>
          )}
        </div>
      </div>
    </nav>
  );
};