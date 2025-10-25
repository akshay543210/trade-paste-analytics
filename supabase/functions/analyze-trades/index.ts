import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import "https://deno.land/x/xhr@0.1.0/mod.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { trades } = await req.json();
    
    if (!trades || trades.length === 0) {
      return new Response(
        JSON.stringify({ error: 'No trade data provided' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY not configured');
    }

    // Prepare trade statistics for AI analysis
    const tradeStats = {
      totalTrades: trades.length,
      wins: trades.filter((t: any) => t.outcome === 'Win').length,
      losses: trades.filter((t: any) => t.outcome === 'Loss').length,
      breakevens: trades.filter((t: any) => t.outcome === 'Breakeven').length,
      pairs: trades.map((t: any) => ({ pair: t.pair, outcome: t.outcome })),
      sessions: trades.map((t: any) => ({ session: t.session_name, outcome: t.outcome })),
      setups: trades.map((t: any) => ({ setup: t.setup, outcome: t.outcome })).filter((t: any) => t.setup),
      rrRatios: trades.map((t: any) => ({ rr: t.risk && t.reward ? t.reward / t.risk : null, outcome: t.outcome })).filter((t: any) => t.rr !== null),
      hours: trades.map((t: any) => ({ hour: new Date(t.trade_datetime).getHours(), outcome: t.outcome })),
    };

    const systemPrompt = `You are an expert trading performance analyst. Analyze the provided trading data and give specific, actionable insights to help the trader improve their performance.

Focus on:
1. Most profitable sessions (times of day)
2. Best performing currency pairs
3. Most successful risk-reward ratios
4. Best performing trading setups
5. Time patterns (which hours produce best results)
6. Specific recommendations for improvement

Be concise, data-driven, and actionable. Format your response in clear sections.`;

    const userPrompt = `Analyze this trading data and provide insights:

Total Trades: ${tradeStats.totalTrades}
Wins: ${tradeStats.wins} (${((tradeStats.wins / tradeStats.totalTrades) * 100).toFixed(1)}%)
Losses: ${tradeStats.losses} (${((tradeStats.losses / tradeStats.totalTrades) * 100).toFixed(1)}%)
Breakevens: ${tradeStats.breakevens}

Trading Pairs Performance:
${JSON.stringify(tradeStats.pairs, null, 2)}

Session Performance:
${JSON.stringify(tradeStats.sessions, null, 2)}

Setup Performance:
${JSON.stringify(tradeStats.setups, null, 2)}

Risk-Reward Analysis:
${JSON.stringify(tradeStats.rrRatios, null, 2)}

Hourly Performance:
${JSON.stringify(tradeStats.hours, null, 2)}`;

    console.log('Calling Lovable AI for trade analysis...');

    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('AI API error:', response.status, errorText);
      
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: 'Rate limit exceeded. Please try again later.' }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: 'Payment required. Please add credits to your workspace.' }),
          { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      throw new Error(`AI API error: ${response.status}`);
    }

    const data = await response.json();
    const analysis = data.choices[0].message.content;

    console.log('Analysis completed successfully');

    return new Response(
      JSON.stringify({ analysis }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in analyze-trades function:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
