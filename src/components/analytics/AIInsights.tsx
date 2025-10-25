import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Sparkles, Loader2 } from 'lucide-react';

interface Trade {
  id: string;
  pair: string;
  outcome: string;
  risk: number | null;
  reward: number | null;
  setup: string | null;
  trade_datetime: string;
  session_name?: string;
}

interface AIInsightsProps {
  trades: Trade[];
}

export function AIInsights({ trades }: AIInsightsProps) {
  const [analysis, setAnalysis] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const generateInsights = async () => {
    if (trades.length === 0) {
      toast({
        title: 'No Data',
        description: 'Add some trades first to get AI insights',
        variant: 'destructive',
      });
      return;
    }

    setIsLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('analyze-trades', {
        body: { trades },
      });

      if (error) {
        throw error;
      }

      if (data.error) {
        throw new Error(data.error);
      }

      setAnalysis(data.analysis);
      toast({
        title: 'Analysis Complete',
        description: 'AI insights generated successfully',
      });
    } catch (error) {
      console.error('Error generating insights:', error);
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to generate insights',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-primary" />
              AI Trading Insights
            </CardTitle>
            <CardDescription>
              Get personalized recommendations to improve your trading performance
            </CardDescription>
          </div>
          <Button 
            onClick={generateInsights} 
            disabled={isLoading || trades.length === 0}
            className="min-w-[140px]"
          >
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Analyzing...
              </>
            ) : (
              <>
                <Sparkles className="mr-2 h-4 w-4" />
                Analyze Trades
              </>
            )}
          </Button>
        </div>
      </CardHeader>
      {analysis && (
        <CardContent>
          <div className="prose prose-sm max-w-none dark:prose-invert">
            <div className="bg-muted/50 rounded-lg p-6 space-y-4">
              {analysis.split('\n').map((line, index) => {
                if (line.startsWith('#')) {
                  const level = line.match(/^#+/)?.[0].length || 1;
                  const text = line.replace(/^#+\s*/, '');
                  const HeadingTag = `h${Math.min(level + 1, 6)}` as keyof JSX.IntrinsicElements;
                  return (
                    <HeadingTag key={index} className="font-semibold text-foreground mt-4 first:mt-0">
                      {text}
                    </HeadingTag>
                  );
                }
                if (line.trim().startsWith('-') || line.trim().startsWith('*')) {
                  return (
                    <li key={index} className="ml-4 text-muted-foreground">
                      {line.replace(/^[\s-*]+/, '')}
                    </li>
                  );
                }
                if (line.trim()) {
                  return (
                    <p key={index} className="text-muted-foreground">
                      {line}
                    </p>
                  );
                }
                return null;
              })}
            </div>
          </div>
        </CardContent>
      )}
    </Card>
  );
}
