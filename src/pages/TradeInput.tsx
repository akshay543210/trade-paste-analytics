import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { PasteImageUpload } from '@/components/trade/PasteImageUpload';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { CalendarIcon, Save, DollarSign } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';

const tradeSchema = z.object({
  pair: z.string().min(1, 'Currency pair is required'),
  session: z.string().min(1, 'Trading session is required'),
  trade_datetime: z.date({
    required_error: 'Trade date and time is required',
  }),
  setup: z.string().optional(),
  risk: z.string().optional(),
  reward: z.string().optional(),
  outcome: z.enum(['Win', 'Loss', 'BE'], {
    required_error: 'Trade outcome is required',
  }),
  notes: z.string().optional(),
});

type TradeFormData = z.infer<typeof tradeSchema>;

interface TradingSession {
  id: string;
  name: string;
}

interface Instrument {
  id: string;
  symbol: string;
  name: string;
}

export default function TradeInput() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [screenshotUrl, setScreenshotUrl] = useState('');
  const [sessions, setSessions] = useState<TradingSession[]>([]);
  const [instruments, setInstruments] = useState<Instrument[]>([]);

  const form = useForm<TradeFormData>({
    resolver: zodResolver(tradeSchema),
    defaultValues: {
      pair: '',
      session: '',
      setup: '',
      risk: '',
      reward: '',
      outcome: undefined,
      notes: '',
    },
  });

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [sessionsResponse, instrumentsResponse] = await Promise.all([
          supabase.from('trading_sessions').select('id, name'),
          supabase.from('instruments').select('id, symbol, name'),
        ]);

        if (sessionsResponse.data) {
          setSessions(sessionsResponse.data);
        }

        if (instrumentsResponse.data) {
          setInstruments(instrumentsResponse.data);
        }
      } catch (error) {
        console.error('Error fetching data:', error);
      }
    };

    fetchData();
  }, []);

  const onSubmit = async (data: TradeFormData) => {
    if (!user) return;

    setLoading(true);
    try {
      const tradeData = {
        user_id: user.id,
        pair: data.pair,
        session_id: data.session,
        trade_datetime: data.trade_datetime.toISOString(),
        setup: data.setup || null,
        entry_price: null,
        exit_price: null,
        risk: data.risk ? parseFloat(data.risk) : null,
        reward: data.reward ? parseFloat(data.reward) : null,
        outcome: data.outcome,
        notes: data.notes || null,
        screenshot_url: screenshotUrl || null,
      };

      const { error } = await supabase
        .from('trades')
        .insert([tradeData]);

      if (error) {
        throw error;
      }

      toast({
        title: 'Trade Saved',
        description: 'Your trade has been recorded successfully',
      });

      // Reset form
      form.reset();
      setScreenshotUrl('');
    } catch (error) {
      console.error('Error saving trade:', error);
      toast({
        title: 'Error',
        description: 'Failed to save trade. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container mx-auto px-4 py-6 sm:py-8 max-w-4xl">
      <div className="space-y-4 sm:space-y-6">
        <div className="text-center space-y-2">
          <h1 className="text-2xl sm:text-3xl font-bold">Add New Trade</h1>
          <p className="text-sm sm:text-base text-muted-foreground">
            Record your trading data and upload screenshots for analysis
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <DollarSign className="h-5 w-5 text-primary" />
              <span>Trade Details</span>
            </CardTitle>
            <CardDescription>
              Fill in the trade information below. All fields marked with * are required.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 sm:space-y-6">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
                  <FormField
                    control={form.control}
                    name="pair"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Currency Pair *</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select pair" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent className="max-h-60">
                            {instruments.map((instrument) => (
                              <SelectItem key={instrument.id} value={instrument.symbol}>
                                {instrument.symbol} - {instrument.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="session"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Trading Session *</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select session" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {sessions.map((session) => (
                              <SelectItem key={session.id} value={session.id}>
                                {session.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="trade_datetime"
                    render={({ field }) => (
                      <FormItem className="flex flex-col">
                        <FormLabel>Trade Date & Time *</FormLabel>
                        <Popover>
                          <PopoverTrigger asChild>
                            <FormControl>
                              <Button
                                variant="outline"
                                className={cn(
                                  'w-full pl-3 text-left font-normal',
                                  !field.value && 'text-muted-foreground'
                                )}
                              >
                                {field.value ? (
                                  format(field.value, 'PPP HH:mm')
                                ) : (
                                  <span>Pick a date</span>
                                )}
                                <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                              </Button>
                            </FormControl>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-0" align="start">
                            <Calendar
                              mode="single"
                              selected={field.value}
                              onSelect={field.onChange}
                              disabled={(date) =>
                                date > new Date() || date < new Date('1900-01-01')
                              }
                              initialFocus
                              className="pointer-events-auto"
                            />
                          </PopoverContent>
                        </Popover>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="setup"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Setup/Strategy</FormLabel>
                        <FormControl>
                          <Input placeholder="e.g., Breakout, Support/Resistance" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="risk"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Risk ($)</FormLabel>
                        <FormControl>
                          <Input 
                            type="number" 
                            step="0.01" 
                            placeholder="100.00" 
                            {...field} 
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="reward"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Reward ($)</FormLabel>
                        <FormControl>
                          <Input 
                            type="number" 
                            step="0.01" 
                            placeholder="200.00" 
                            {...field} 
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="outcome"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Outcome *</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select outcome" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="Win">
                              <span className="flex items-center space-x-2">
                                <div className="w-2 h-2 bg-success rounded-full"></div>
                                <span>Win</span>
                              </span>
                            </SelectItem>
                            <SelectItem value="Loss">
                              <span className="flex items-center space-x-2">
                                <div className="w-2 h-2 bg-danger rounded-full"></div>
                                <span>Loss</span>
                              </span>
                            </SelectItem>
                            <SelectItem value="BE">
                              <span className="flex items-center space-x-2">
                                <div className="w-2 h-2 bg-muted rounded-full"></div>
                                <span>Break Even</span>
                              </span>
                            </SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="notes"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Notes</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Trade analysis, market conditions, lessons learned..."
                          className="min-h-24"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="space-y-2">
                  <label className="text-sm font-medium">Trade Screenshot</label>
                  <PasteImageUpload
                    onImageUploaded={setScreenshotUrl}
                    currentImageUrl={screenshotUrl}
                  />
                </div>

                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary-foreground mr-2" />
                      Saving Trade...
                    </>
                  ) : (
                    <>
                      <Save className="mr-2 h-4 w-4" />
                      Save Trade
                    </>
                  )}
                </Button>
              </form>
            </Form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}