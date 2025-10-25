import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DatePickerWithRange } from '@/components/ui/date-picker';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, PieChart, Pie, Cell, ResponsiveContainer, LineChart, Line } from 'recharts';
import { TrendingUp, TrendingDown, DollarSign, Target, Calendar, BarChart3 } from 'lucide-react';
import { DateRange } from 'react-day-picker';
import { addDays, format, subDays } from 'date-fns';
import { TradeDetailsDialog } from '@/components/analytics/TradeDetailsDialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { AIInsights } from '@/components/analytics/AIInsights';

interface Trade {
  id: string;
  pair: string;
  session_name: string;
  trade_datetime: string;
  setup: string;
  risk: number;
  reward: number;
  risk_reward_ratio: number;
  outcome: string;
}

interface AnalyticsData {
  totalTrades: number;
  winRate: number;
  totalPnL: number;
  avgRiskReward: number;
  sessionStats: Array<{ session: string; wins: number; losses: number; winRate: number; total: number }>;
  setupStats: Array<{ setup: string; wins: number; losses: number; winRate: number; total: number }>;
  pairStats: Array<{ pair: string; wins: number; losses: number; winRate: number; pnl: number; total: number }>;
  hourlyStats: Array<{ hour: number; wins: number; losses: number; winRate: number; total: number }>;
  rrDistribution: Array<{ range: string; count: number }>;
}

export default function Analytics() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [trades, setTrades] = useState<Trade[]>([]);
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [dateRange, setDateRange] = useState<DateRange | undefined>({
    from: subDays(new Date(), 30),
    to: new Date(),
  });
  const [selectedPair, setSelectedPair] = useState<string>('all');
  const [selectedSession, setSelectedSession] = useState<string>('all');
  const [selectedTrade, setSelectedTrade] = useState<any>(null);
  const [tradeDialogOpen, setTradeDialogOpen] = useState(false);
  const [selectedPairForHistory, setSelectedPairForHistory] = useState<string | null>(null);
  const [sessions, setSessions] = useState<any[]>([]);

  const COLORS = ['hsl(var(--success))', 'hsl(var(--danger))', 'hsl(var(--muted))'];

  useEffect(() => {
    if (user) {
      fetchTrades();
      fetchSessions();
    }
  }, [user, dateRange, selectedPair, selectedSession]);

  const fetchSessions = async () => {
    const { data } = await supabase.from('trading_sessions').select('id, name');
    if (data) setSessions(data);
  };

  const fetchTrades = async () => {
    if (!user) return;

    setLoading(true);
    try {
      let query = supabase
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
          notes,
          screenshot_url,
          trading_sessions!inner(name)
        `)
        .eq('user_id', user.id)
        .order('trade_datetime', { ascending: false });

      if (dateRange?.from && dateRange?.to) {
        query = query
          .gte('trade_datetime', dateRange.from.toISOString())
          .lte('trade_datetime', dateRange.to.toISOString());
      }

      if (selectedPair !== 'all') {
        query = query.eq('pair', selectedPair);
      }

      if (selectedSession !== 'all') {
        query = query.eq('trading_sessions.name', selectedSession);
      }

      const { data, error } = await query;

      if (error) throw error;

      const formattedTrades = data?.map(trade => ({
        ...trade,
        session_name: (trade as any).trading_sessions.name,
      })) || [];

      setTrades(formattedTrades);
      calculateAnalytics(formattedTrades);
    } catch (error) {
      console.error('Error fetching trades:', error);
    } finally {
      setLoading(false);
    }
  };

  const calculateAnalytics = (tradesData: Trade[]) => {
    if (tradesData.length === 0) {
      setAnalytics(null);
      return;
    }

    const totalTrades = tradesData.length;
    const wins = tradesData.filter(t => t.outcome === 'Win').length;
    const winRate = (wins / totalTrades) * 100;
    
    const totalPnL = tradesData.reduce((sum, trade) => {
      if (trade.outcome === 'Win' && trade.reward) return sum + trade.reward;
      if (trade.outcome === 'Loss' && trade.risk) return sum - trade.risk;
      return sum;
    }, 0);

    const avgRiskReward = tradesData
      .filter(t => t.risk_reward_ratio)
      .reduce((sum, t) => sum + t.risk_reward_ratio, 0) / 
      tradesData.filter(t => t.risk_reward_ratio).length || 0;

    // Session statistics
    const sessionGroups = tradesData.reduce((acc, trade) => {
      const session = trade.session_name;
      if (!acc[session]) acc[session] = { wins: 0, losses: 0, total: 0 };
      acc[session].total++;
      if (trade.outcome === 'Win') acc[session].wins++;
      if (trade.outcome === 'Loss') acc[session].losses++;
      return acc;
    }, {} as Record<string, any>);

    const sessionStats = Object.entries(sessionGroups).map(([session, data]) => ({
      session,
      wins: data.wins,
      losses: data.losses,
      total: data.total,
      winRate: (data.wins / data.total) * 100,
    }));

    // Setup statistics
    const setupGroups = tradesData.reduce((acc, trade) => {
      const setup = trade.setup || 'Unknown';
      if (!acc[setup]) acc[setup] = { wins: 0, losses: 0, total: 0 };
      acc[setup].total++;
      if (trade.outcome === 'Win') acc[setup].wins++;
      if (trade.outcome === 'Loss') acc[setup].losses++;
      return acc;
    }, {} as Record<string, any>);

    const setupStats = Object.entries(setupGroups)
      .map(([setup, data]) => ({
        setup,
        wins: data.wins,
        losses: data.losses,
        total: data.total,
        winRate: (data.wins / data.total) * 100,
      }))
      .sort((a, b) => b.total - a.total)
      .slice(0, 10);

    // Pair statistics
    const pairGroups = tradesData.reduce((acc, trade) => {
      const pair = trade.pair;
      if (!acc[pair]) acc[pair] = { wins: 0, losses: 0, total: 0, pnl: 0 };
      acc[pair].total++;
      if (trade.outcome === 'Win') {
        acc[pair].wins++;
        if (trade.reward) acc[pair].pnl += trade.reward;
      }
      if (trade.outcome === 'Loss') {
        acc[pair].losses++;
        if (trade.risk) acc[pair].pnl -= trade.risk;
      }
      return acc;
    }, {} as Record<string, any>);

    const pairStats = Object.entries(pairGroups)
      .map(([pair, data]) => ({
        pair,
        wins: data.wins,
        losses: data.losses,
        total: data.total,
        pnl: data.pnl,
        winRate: (data.wins / data.total) * 100,
      }))
      .sort((a, b) => b.total - a.total);

    // Hourly statistics
    const hourlyGroups = tradesData.reduce((acc, trade) => {
      const hour = new Date(trade.trade_datetime).getHours();
      if (!acc[hour]) acc[hour] = { wins: 0, losses: 0, total: 0 };
      acc[hour].total++;
      if (trade.outcome === 'Win') acc[hour].wins++;
      if (trade.outcome === 'Loss') acc[hour].losses++;
      return acc;
    }, {} as Record<number, any>);

    const hourlyStats = Array.from({ length: 24 }, (_, hour) => ({
      hour,
      wins: hourlyGroups[hour]?.wins || 0,
      losses: hourlyGroups[hour]?.losses || 0,
      total: hourlyGroups[hour]?.total || 0,
      winRate: hourlyGroups[hour] ? (hourlyGroups[hour].wins / hourlyGroups[hour].total) * 100 : 0,
    }));

    // Risk-Reward distribution
    const rrRanges = [
      { range: '0-0.5', min: 0, max: 0.5 },
      { range: '0.5-1', min: 0.5, max: 1 },
      { range: '1-1.5', min: 1, max: 1.5 },
      { range: '1.5-2', min: 1.5, max: 2 },
      { range: '2-3', min: 2, max: 3 },
      { range: '3+', min: 3, max: Infinity },
    ];

    const rrDistribution = rrRanges.map(({ range, min, max }) => ({
      range,
      count: tradesData.filter(t => 
        t.risk_reward_ratio >= min && t.risk_reward_ratio < max
      ).length,
    }));

    setAnalytics({
      totalTrades,
      winRate,
      totalPnL,
      avgRiskReward,
      sessionStats,
      setupStats,
      pairStats,
      hourlyStats,
      rrDistribution,
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  const uniquePairs = [...new Set(trades.map(t => t.pair))];
  const uniqueSessions = [...new Set(trades.map(t => t.session_name))];

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="space-y-6">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between space-y-4 lg:space-y-0">
          <div>
            <h1 className="text-3xl font-bold">Trading Analytics</h1>
            <p className="text-muted-foreground">
              Analyze your trading performance and identify patterns
            </p>
          </div>
          
          <div className="flex flex-wrap gap-4">
            <DatePickerWithRange
              date={dateRange}
              onDateChange={setDateRange}
            />
            
            <Select value={selectedPair} onValueChange={setSelectedPair}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="All Pairs" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Pairs</SelectItem>
                {uniquePairs.map(pair => (
                  <SelectItem key={pair} value={pair}>{pair}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            
            <Select value={selectedSession} onValueChange={setSelectedSession}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="All Sessions" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Sessions</SelectItem>
                {uniqueSessions.map(session => (
                  <SelectItem key={session} value={session}>{session}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {!analytics ? (
          <Card>
            <CardContent className="py-16 text-center">
              <BarChart3 className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">No Data Available</h3>
              <p className="text-muted-foreground">
                No trades found for the selected filters. Try adjusting your date range or filters.
              </p>
            </CardContent>
          </Card>
        ) : (
          <>
            {/* AI Insights Section */}
            <AIInsights trades={trades} />

            {/* Key Metrics */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Total Trades</p>
                      <p className="text-3xl font-bold">{analytics.totalTrades}</p>
                    </div>
                    <Target className="h-8 w-8 text-primary" />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Win Rate</p>
                      <p className="text-3xl font-bold">{analytics.winRate.toFixed(1)}%</p>
                    </div>
                    {analytics.winRate >= 50 ? (
                      <TrendingUp className="h-8 w-8 text-success" />
                    ) : (
                      <TrendingDown className="h-8 w-8 text-danger" />
                    )}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Total P&L</p>
                      <p className={`text-3xl font-bold ${
                        analytics.totalPnL >= 0 ? 'text-success' : 'text-danger'
                      }`}>
                        ${analytics.totalPnL.toFixed(2)}
                      </p>
                    </div>
                    <DollarSign className="h-8 w-8 text-primary" />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Avg R:R</p>
                      <p className="text-3xl font-bold">{analytics.avgRiskReward.toFixed(2)}</p>
                    </div>
                    <BarChart3 className="h-8 w-8 text-primary" />
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Charts Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Session Performance */}
              <Card>
                <CardHeader>
                  <CardTitle>Performance by Session</CardTitle>
                  <CardDescription>Win rate across different trading sessions</CardDescription>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={analytics.sessionStats}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="session" />
                      <YAxis />
                      <Tooltip 
                        formatter={(value, name) => [
                          name === 'winRate' ? `${value}%` : value,
                          name === 'winRate' ? 'Win Rate' : name
                        ]}
                      />
                      <Bar dataKey="wins" fill="hsl(var(--success))" name="Wins" />
                      <Bar dataKey="losses" fill="hsl(var(--danger))" name="Losses" />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              {/* Setup Performance */}
              <Card>
                <CardHeader>
                  <CardTitle>Performance by Setup</CardTitle>
                  <CardDescription>Your most traded setups and their success rate</CardDescription>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={analytics.setupStats} layout="horizontal">
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis type="number" />
                      <YAxis dataKey="setup" type="category" width={80} />
                      <Tooltip />
                      <Bar dataKey="wins" fill="hsl(var(--success))" name="Wins" />
                      <Bar dataKey="losses" fill="hsl(var(--danger))" name="Losses" />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              {/* Hourly Performance */}
              <Card>
                <CardHeader>
                  <CardTitle>Hourly Performance</CardTitle>
                  <CardDescription>Trading performance by hour of day</CardDescription>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <LineChart data={analytics.hourlyStats}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="hour" />
                      <YAxis />
                      <Tooltip 
                        formatter={(value) => [`${value}%`, 'Win Rate']}
                        labelFormatter={(hour) => `${hour}:00`}
                      />
                      <Line 
                        type="monotone" 
                        dataKey="winRate" 
                        stroke="hsl(var(--primary))" 
                        strokeWidth={2}
                        name="Win Rate"
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              {/* Risk-Reward Distribution */}
              <Card>
                <CardHeader>
                  <CardTitle>Risk-Reward Distribution</CardTitle>
                  <CardDescription>Distribution of your risk-reward ratios</CardDescription>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie
                        data={analytics.rrDistribution}
                        cx="50%"
                        cy="50%"
                        outerRadius={80}
                        fill="#8884d8"
                        dataKey="count"
                        label={({ range, count }) => count > 0 ? `${range}: ${count}` : ''}
                      >
                        {analytics.rrDistribution.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </div>

            {/* Pair Performance Table */}
            <Card>
              <CardHeader>
                <CardTitle>Pair Performance</CardTitle>
                <CardDescription>Click on a pair to view trade history</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Pair</TableHead>
                        <TableHead className="text-right">Trades</TableHead>
                        <TableHead className="text-right">Wins</TableHead>
                        <TableHead className="text-right">Losses</TableHead>
                        <TableHead className="text-right">Win Rate</TableHead>
                        <TableHead className="text-right">P&L</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {analytics.pairStats.map((pair) => (
                        <TableRow 
                          key={pair.pair} 
                          className="cursor-pointer hover:bg-muted/50"
                          onClick={() => setSelectedPairForHistory(pair.pair)}
                        >
                          <TableCell className="font-medium">{pair.pair}</TableCell>
                          <TableCell className="text-right">{pair.total}</TableCell>
                          <TableCell className="text-right text-success">{pair.wins}</TableCell>
                          <TableCell className="text-right text-danger">{pair.losses}</TableCell>
                          <TableCell className="text-right">{pair.winRate.toFixed(1)}%</TableCell>
                          <TableCell className={`text-right ${
                            pair.pnl >= 0 ? 'text-success' : 'text-danger'
                          }`}>
                            ${pair.pnl.toFixed(2)}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>

            {/* Trade History for Selected Pair */}
            {selectedPairForHistory && (
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle>Trade History - {selectedPairForHistory}</CardTitle>
                      <CardDescription>All trades for this pair</CardDescription>
                    </div>
                    <Button variant="outline" onClick={() => setSelectedPairForHistory(null)}>
                      Close
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Date & Time</TableHead>
                        <TableHead>Session</TableHead>
                        <TableHead>Setup</TableHead>
                        <TableHead className="text-right">R:R</TableHead>
                        <TableHead>Outcome</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {trades
                        .filter(t => t.pair === selectedPairForHistory)
                        .map((trade) => (
                          <TableRow 
                            key={trade.id}
                            className="cursor-pointer hover:bg-muted/50"
                            onClick={() => {
                              setSelectedTrade(trade);
                              setTradeDialogOpen(true);
                            }}
                          >
                            <TableCell>{format(new Date(trade.trade_datetime), 'PPP HH:mm')}</TableCell>
                            <TableCell>{trade.session_name}</TableCell>
                            <TableCell>{trade.setup || 'N/A'}</TableCell>
                            <TableCell className="text-right">
                              {trade.risk_reward_ratio ? trade.risk_reward_ratio.toFixed(2) : 'N/A'}
                            </TableCell>
                            <TableCell>
                              <span className={`px-2 py-1 rounded-full text-xs ${
                                trade.outcome === 'Win' ? 'bg-success/20 text-success' :
                                trade.outcome === 'Loss' ? 'bg-danger/20 text-danger' :
                                'bg-muted text-muted-foreground'
                              }`}>
                                {trade.outcome}
                              </span>
                            </TableCell>
                          </TableRow>
                        ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            )}
          </>
        )}
      </div>

      {/* Trade Details Dialog */}
      <TradeDetailsDialog
        trade={selectedTrade}
        session={sessions.find(s => s.id === selectedTrade?.session_id) || null}
        open={tradeDialogOpen}
        onOpenChange={setTradeDialogOpen}
      />
    </div>
  );
}