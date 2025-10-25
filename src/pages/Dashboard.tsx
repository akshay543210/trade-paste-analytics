import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar, Legend } from 'recharts';
import { TrendingUp, TrendingDown, DollarSign, Target, Sparkles, Clock, Award } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface DashboardData {
  profitableSessions: Array<{ session: string; pnl: number; winRate: number; count: number }>;
  profitableRR: Array<{ range: string; pnl: number; count: number; avgWinRate: number }>;
  profitableHours: Array<{ hour: number; pnl: number; winRate: number; count: number }>;
  profitablePairs: Array<{ pair: string; pnl: number; winRate: number; count: number }>;
  losingPatterns: Array<{ category: string; value: number }>;
  winningPatterns: Array<{ category: string; value: number }>;
  recommendations: string[];
}

export default function Dashboard() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
  const [aiInsights, setAiInsights] = useState<string>('');
  const [loadingAI, setLoadingAI] = useState(false);

  useEffect(() => {
    if (user) {
      fetchDashboardData();
    }
  }, [user]);

  const fetchDashboardData = async () => {
    if (!user) return;

    setLoading(true);
    try {
      const { data: trades, error } = await supabase
        .from('trades')
        .select(`
          id,
          pair,
          trade_datetime,
          session_id,
          setup,
          risk,
          reward,
          risk_reward_ratio,
          outcome,
          trading_sessions!inner(name)
        `)
        .eq('user_id', user.id);

      if (error) throw error;

      if (!trades || trades.length === 0) {
        setDashboardData(null);
        setLoading(false);
        return;
      }

      const formattedTrades = trades.map(trade => ({
        ...trade,
        session_name: (trade as any).trading_sessions.name,
      }));

      // Calculate profitable sessions
      const sessionGroups = formattedTrades.reduce((acc, trade) => {
        const session = (trade as any).session_name;
        if (!acc[session]) acc[session] = { pnl: 0, wins: 0, losses: 0, count: 0 };
        acc[session].count++;
        if (trade.outcome === 'Win' && trade.reward) {
          acc[session].pnl += trade.reward;
          acc[session].wins++;
        }
        if (trade.outcome === 'Loss' && trade.risk) {
          acc[session].pnl -= trade.risk;
          acc[session].losses++;
        }
        return acc;
      }, {} as Record<string, any>);

      const profitableSessions = Object.entries(sessionGroups)
        .map(([session, data]) => ({
          session,
          pnl: data.pnl,
          winRate: (data.wins / data.count) * 100,
          count: data.count,
        }))
        .sort((a, b) => b.pnl - a.pnl);

      // Calculate profitable R:R ranges
      const rrRanges = [
        { range: '< 1', min: 0, max: 1 },
        { range: '1-1.5', min: 1, max: 1.5 },
        { range: '1.5-2', min: 1.5, max: 2 },
        { range: '2-3', min: 2, max: 3 },
        { range: '> 3', min: 3, max: Infinity },
      ];

      const profitableRR = rrRanges.map(({ range, min, max }) => {
        const tradesInRange = formattedTrades.filter(
          t => t.risk_reward_ratio >= min && t.risk_reward_ratio < max
        );
        const pnl = tradesInRange.reduce((sum, t) => {
          if (t.outcome === 'Win' && t.reward) return sum + t.reward;
          if (t.outcome === 'Loss' && t.risk) return sum - t.risk;
          return sum;
        }, 0);
        const wins = tradesInRange.filter(t => t.outcome === 'Win').length;
        return {
          range,
          pnl,
          count: tradesInRange.length,
          avgWinRate: tradesInRange.length > 0 ? (wins / tradesInRange.length) * 100 : 0,
        };
      });

      // Calculate profitable hours
      const hourlyGroups = formattedTrades.reduce((acc, trade) => {
        const hour = new Date(trade.trade_datetime).getHours();
        if (!acc[hour]) acc[hour] = { pnl: 0, wins: 0, count: 0 };
        acc[hour].count++;
        if (trade.outcome === 'Win' && trade.reward) {
          acc[hour].pnl += trade.reward;
          acc[hour].wins++;
        }
        if (trade.outcome === 'Loss' && trade.risk) {
          acc[hour].pnl -= trade.risk;
        }
        return acc;
      }, {} as Record<number, any>);

      const profitableHours = Object.entries(hourlyGroups)
        .map(([hour, data]) => ({
          hour: parseInt(hour),
          pnl: data.pnl,
          winRate: (data.wins / data.count) * 100,
          count: data.count,
        }))
        .filter(h => h.count > 0)
        .sort((a, b) => b.pnl - a.pnl);

      // Calculate profitable pairs
      const pairGroups = formattedTrades.reduce((acc, trade) => {
        const pair = trade.pair;
        if (!acc[pair]) acc[pair] = { pnl: 0, wins: 0, count: 0 };
        acc[pair].count++;
        if (trade.outcome === 'Win' && trade.reward) {
          acc[pair].pnl += trade.reward;
          acc[pair].wins++;
        }
        if (trade.outcome === 'Loss' && trade.risk) {
          acc[pair].pnl -= trade.risk;
        }
        return acc;
      }, {} as Record<string, any>);

      const profitablePairs = Object.entries(pairGroups)
        .map(([pair, data]) => ({
          pair,
          pnl: data.pnl,
          winRate: (data.wins / data.count) * 100,
          count: data.count,
        }))
        .sort((a, b) => b.pnl - a.pnl);

      // Losing patterns (radar chart data)
      const losingTrades = formattedTrades.filter(t => t.outcome === 'Loss');
      const losingBySession = losingTrades.length;
      const losingByLowRR = losingTrades.filter(t => t.risk_reward_ratio < 1.5).length;
      const losingBySetup = losingTrades.filter(t => !t.setup).length;

      const losingPatterns = [
        { category: 'Poor R:R', value: (losingByLowRR / losingTrades.length) * 100 || 0 },
        { category: 'No Setup', value: (losingBySetup / losingTrades.length) * 100 || 0 },
        { category: 'Wrong Session', value: ((losingBySession - profitableSessions[0]?.count || 0) / losingBySession) * 30 || 0 },
      ];

      // Winning patterns
      const winningTrades = formattedTrades.filter(t => t.outcome === 'Win');
      const winningByHighRR = winningTrades.filter(t => t.risk_reward_ratio >= 2).length;
      const winningWithSetup = winningTrades.filter(t => t.setup).length;

      const winningPatterns = [
        { category: 'Good R:R', value: (winningByHighRR / winningTrades.length) * 100 || 0 },
        { category: 'Has Setup', value: (winningWithSetup / winningTrades.length) * 100 || 0 },
        { category: 'Best Session', value: profitableSessions[0]?.winRate || 0 },
      ];

      // Generate recommendations
      const recommendations = [];
      
      if (profitableSessions.length > 0) {
        recommendations.push(`Focus on ${profitableSessions[0].session} session (${profitableSessions[0].winRate.toFixed(1)}% win rate, $${profitableSessions[0].pnl.toFixed(2)} profit)`);
      }
      
      const bestRR = profitableRR.reduce((best, curr) => curr.pnl > best.pnl ? curr : best);
      if (bestRR.count > 0) {
        recommendations.push(`Target R:R ratio of ${bestRR.range} (${bestRR.avgWinRate.toFixed(1)}% win rate)`);
      }
      
      if (profitableHours.length > 0) {
        recommendations.push(`Trade during ${profitableHours[0].hour}:00-${profitableHours[0].hour + 1}:00 hours for best results`);
      }
      
      if (profitablePairs.length > 0 && profitablePairs[0].pnl > 0) {
        recommendations.push(`${profitablePairs[0].pair} is your most profitable pair ($${profitablePairs[0].pnl.toFixed(2)})`);
      }

      if (losingByLowRR / losingTrades.length > 0.5) {
        recommendations.push('⚠️ Avoid trades with R:R below 1.5 - they account for most losses');
      }

      setDashboardData({
        profitableSessions,
        profitableRR,
        profitableHours,
        profitablePairs,
        losingPatterns,
        winningPatterns,
        recommendations,
      });
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
      toast({
        title: 'Error',
        description: 'Failed to load dashboard data',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const getAIInsights = async () => {
    if (!user || !dashboardData) return;

    setLoadingAI(true);
    try {
      const { data, error } = await supabase.functions.invoke('analyze-trades', {
        body: {
          sessions: dashboardData.profitableSessions,
          rrData: dashboardData.profitableRR,
          hours: dashboardData.profitableHours,
          pairs: dashboardData.profitablePairs,
        },
      });

      if (error) throw error;
      setAiInsights(data.insights);
    } catch (error) {
      console.error('Error getting AI insights:', error);
      toast({
        title: 'Error',
        description: 'Failed to get AI insights',
        variant: 'destructive',
      });
    } finally {
      setLoadingAI(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!dashboardData) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Card>
          <CardContent className="py-16 text-center">
            <Target className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">No Data Available</h3>
            <p className="text-muted-foreground">
              Start adding trades to see your performance insights and recommendations.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const COLORS = ['hsl(var(--success))', 'hsl(var(--primary))', 'hsl(var(--danger))', 'hsl(var(--accent))'];

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Performance Dashboard</h1>
            <p className="text-muted-foreground">AI-powered insights to improve your trading</p>
          </div>
        </div>

        {/* Key Recommendations */}
        <Card className="border-primary/50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-primary" />
              Key Recommendations
            </CardTitle>
            <CardDescription>Actionable insights based on your trading data</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {dashboardData.recommendations.map((rec, idx) => (
                <div key={idx} className="flex items-start gap-3 p-3 bg-muted/50 rounded-lg">
                  <Award className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
                  <p className="text-sm">{rec}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Charts Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Most Profitable Sessions */}
          <Card>
            <CardHeader>
              <CardTitle>Most Profitable Sessions</CardTitle>
              <CardDescription>Which trading sessions make you the most money</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={dashboardData.profitableSessions.slice(0, 5)}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="session" stroke="hsl(var(--muted-foreground))" />
                  <YAxis stroke="hsl(var(--muted-foreground))" />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'hsl(var(--card))', 
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px'
                    }}
                    formatter={(value: any) => [`$${value.toFixed(2)}`, 'P&L']}
                  />
                  <Bar dataKey="pnl" fill="hsl(var(--success))" radius={[8, 8, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Most Profitable R:R Ranges */}
          <Card>
            <CardHeader>
              <CardTitle>Most Profitable R:R Ratios</CardTitle>
              <CardDescription>Risk-reward ranges that generate the best returns</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={dashboardData.profitableRR}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="range" stroke="hsl(var(--muted-foreground))" />
                  <YAxis stroke="hsl(var(--muted-foreground))" />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'hsl(var(--card))', 
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px'
                    }}
                    formatter={(value: any, name: string) => 
                      name === 'pnl' ? [`$${value.toFixed(2)}`, 'P&L'] : 
                      [`${value.toFixed(1)}%`, 'Win Rate']
                    }
                  />
                  <Bar dataKey="pnl" fill="hsl(var(--primary))" radius={[8, 8, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Most Profitable Hours */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5" />
                Best Trading Hours
              </CardTitle>
              <CardDescription>Time of day analysis for optimal performance</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={dashboardData.profitableHours.slice(0, 8)}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis 
                    dataKey="hour" 
                    stroke="hsl(var(--muted-foreground))"
                    tickFormatter={(hour) => `${hour}:00`}
                  />
                  <YAxis stroke="hsl(var(--muted-foreground))" />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'hsl(var(--card))', 
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px'
                    }}
                    labelFormatter={(hour) => `${hour}:00`}
                    formatter={(value: any) => [`$${value.toFixed(2)}`, 'P&L']}
                  />
                  <Bar dataKey="pnl" fill="hsl(var(--accent))" radius={[8, 8, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Most Profitable Pairs */}
          <Card>
            <CardHeader>
              <CardTitle>Top Performing Pairs</CardTitle>
              <CardDescription>Currency pairs ranked by profitability</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={dashboardData.profitablePairs.slice(0, 5)}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ pair, pnl }) => `${pair}: $${pnl.toFixed(0)}`}
                    outerRadius={100}
                    fill="hsl(var(--primary))"
                    dataKey="pnl"
                  >
                    {dashboardData.profitablePairs.slice(0, 5).map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'hsl(var(--card))', 
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px'
                    }}
                    formatter={(value: any) => [`$${value.toFixed(2)}`, 'P&L']}
                  />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Winning vs Losing Patterns */}
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle>Pattern Analysis</CardTitle>
              <CardDescription>Comparison of winning and losing trade characteristics</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={350}>
                <RadarChart data={[
                  ...dashboardData.winningPatterns.map(p => ({ ...p, type: 'Winning' })),
                ]}>
                  <PolarGrid stroke="hsl(var(--border))" />
                  <PolarAngleAxis dataKey="category" stroke="hsl(var(--muted-foreground))" />
                  <PolarRadiusAxis stroke="hsl(var(--muted-foreground))" />
                  <Radar
                    name="Winning Patterns"
                    dataKey="value"
                    stroke="hsl(var(--success))"
                    fill="hsl(var(--success))"
                    fillOpacity={0.6}
                  />
                  <Legend />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'hsl(var(--card))', 
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px'
                    }}
                    formatter={(value: any) => [`${value.toFixed(1)}%`, '']}
                  />
                </RadarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>

        {/* AI Insights Section */}
        <Card className="border-primary/30 bg-gradient-to-br from-card to-primary/5">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-primary" />
              AI Performance Analysis
            </CardTitle>
            <CardDescription>Get personalized insights powered by AI</CardDescription>
          </CardHeader>
          <CardContent>
            {!aiInsights ? (
              <div className="text-center py-8">
                <button
                  onClick={getAIInsights}
                  disabled={loadingAI}
                  className="inline-flex items-center gap-2 px-6 py-3 bg-primary text-primary-foreground rounded-lg font-medium hover:bg-primary/90 transition-colors disabled:opacity-50"
                >
                  {loadingAI ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary-foreground" />
                      Analyzing...
                    </>
                  ) : (
                    <>
                      <Sparkles className="h-4 w-4" />
                      Generate AI Insights
                    </>
                  )}
                </button>
              </div>
            ) : (
              <div className="prose prose-sm max-w-none dark:prose-invert">
                <p className="whitespace-pre-wrap">{aiInsights}</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
