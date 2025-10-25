import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { Link } from 'react-router-dom';
import { TrendingUp, Upload, BarChart3, Target, DollarSign, Calendar, Plus, Sparkles } from 'lucide-react';

interface DashboardStats {
  totalTrades: number;
  winRate: number;
  totalPnL: number;
  recentTrades: number;
}

export default function Index() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<DashboardStats | null>(null);

  useEffect(() => {
    if (user) {
      fetchDashboardStats();
    } else {
      setLoading(false);
    }
  }, [user]);

  const fetchDashboardStats = async () => {
    if (!user) return;

    try {
      const { data: trades, error } = await supabase
        .from('trades')
        .select('outcome, risk, reward, created_at')
        .eq('user_id', user.id);

      if (error) throw error;

      const totalTrades = trades?.length || 0;
      const wins = trades?.filter(t => t.outcome === 'Win').length || 0;
      const winRate = totalTrades > 0 ? (wins / totalTrades) * 100 : 0;
      
      const totalPnL = trades?.reduce((sum, trade) => {
        if (trade.outcome === 'Win' && trade.reward) return sum + trade.reward;
        if (trade.outcome === 'Loss' && trade.risk) return sum - trade.risk;
        return sum;
      }, 0) || 0;

      const weekAgo = new Date();
      weekAgo.setDate(weekAgo.getDate() - 7);
      const recentTrades = trades?.filter(t => 
        new Date(t.created_at) >= weekAgo
      ).length || 0;

      setStats({ totalTrades, winRate, totalPnL, recentTrades });
    } catch (error) {
      console.error('Error fetching dashboard stats:', error);
    } finally {
      setLoading(false);
    }
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted">
        <div className="container mx-auto px-4 py-16">
          <div className="text-center space-y-8 animate-fade-in">
            <div className="space-y-4">
              <div className="flex items-center justify-center space-x-3">
                <TrendingUp className="h-12 w-12 text-primary" />
                <h1 className="text-5xl font-bold bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent">
                  Propfirm Knowledge
                </h1>
              </div>
              <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
                Professional backtesting tool for forex traders. 
                Track your trades, analyze performance, and improve your strategy.
              </p>
            </div>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button asChild size="lg"><Link to="/auth">Get Started</Link></Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="space-y-8">
        <div className="space-y-2">
          <h1 className="text-3xl font-bold">Welcome back!</h1>
          <p className="text-muted-foreground">Here's your trading performance overview</p>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <Card className="hover:shadow-lg transition-shadow cursor-pointer">
            <CardContent className="p-6">
              <Link to="/trade-input" className="block space-y-4">
                <div className="flex items-center space-x-3">
                  <div className="bg-primary/10 p-3 rounded-lg">
                    <Plus className="h-6 w-6 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-semibold">Add New Trade</h3>
                    <p className="text-sm text-muted-foreground">Log your latest trade with screenshots</p>
                  </div>
                </div>
              </Link>
            </CardContent>
          </Card>
          
          <Card className="hover:shadow-lg transition-shadow cursor-pointer">
            <CardContent className="p-6">
              <Link to="/analytics" className="block space-y-4">
                <div className="flex items-center space-x-3">
                  <div className="bg-primary/10 p-3 rounded-lg">
                    <BarChart3 className="h-6 w-6 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-semibold">View Analytics</h3>
                    <p className="text-sm text-muted-foreground">Analyze your trading performance</p>
                  </div>
                </div>
              </Link>
            </CardContent>
          </Card>

          <Card className="hover:shadow-lg transition-shadow cursor-pointer">
            <CardContent className="p-6">
              <Link to="/dashboard" className="block space-y-4">
                <div className="flex items-center space-x-3">
                  <div className="bg-primary/10 p-3 rounded-lg">
                    <Sparkles className="h-6 w-6 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-semibold">AI Insights</h3>
                    <p className="text-sm text-muted-foreground">Get personalized trading recommendations</p>
                  </div>
                </div>
              </Link>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
