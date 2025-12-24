import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';

interface Trade {
  id: string;
  pair: string;
  trade_datetime: string;
  session_id: string;
  setup: string | null;
  risk: number | null;
  reward: number | null;
  outcome: string;
  notes: string | null;
  screenshot_url: string | null;
}

interface Session {
  id: string;
  name: string;
}

interface TradeDetailsDialogProps {
  trade: Trade | null;
  session: Session | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function TradeDetailsDialog({ trade, session, open, onOpenChange }: TradeDetailsDialogProps) {
  if (!trade) return null;

  const rrRatio = trade.risk && trade.reward && trade.risk > 0 
    ? (trade.reward / trade.risk).toFixed(2) 
    : 'N/A';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <span>{trade.pair}</span>
            <Badge 
              variant={
                trade.outcome === 'Win' ? 'default' : 
                trade.outcome === 'Loss' ? 'destructive' : 
                'secondary'
              }
            >
              {trade.outcome}
            </Badge>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Trade Details */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-muted-foreground">Date & Time</p>
              <p className="font-medium">{format(new Date(trade.trade_datetime), 'PPP HH:mm')}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Session</p>
              <p className="font-medium">{session?.name || 'Unknown'}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Setup</p>
              <p className="font-medium">{trade.setup || 'N/A'}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">R:R Ratio</p>
              <p className="font-medium">{rrRatio}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Risk</p>
              <p className="font-medium">{trade.risk ? `${trade.risk.toFixed(2)}%` : 'N/A'}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Reward</p>
              <p className="font-medium">{trade.reward ? `${trade.reward.toFixed(2)}%` : 'N/A'}</p>
            </div>
          </div>

          {/* Notes */}
          {trade.notes && (
            <div>
              <p className="text-sm text-muted-foreground mb-2">Notes</p>
              <div className="bg-muted/50 rounded-lg p-4">
                <p className="text-sm whitespace-pre-wrap">{trade.notes}</p>
              </div>
            </div>
          )}

          {/* Screenshot */}
          {trade.screenshot_url && (
            <div>
              <p className="text-sm text-muted-foreground mb-2">Screenshot</p>
              <img 
                src={trade.screenshot_url} 
                alt="Trade screenshot" 
                className="w-full rounded-lg border border-border"
                crossOrigin="anonymous"
                onError={(e) => {
                  console.error('Image failed to load:', trade.screenshot_url);
                  e.currentTarget.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgZmlsbD0iI2YzZjRmNiIvPjx0ZXh0IHg9IjUwJSIgeT0iNTAlIiBmb250LWZhbWlseT0iQXJpYWwiIGZvbnQtc2l6ZT0iMTQiIGZpbGw9IiM5Y2EzYWYiIHRleHQtYW5jaG9yPSJtaWRkbGUiIGR5PSIuM2VtIj5JbWFnZSBub3QgYXZhaWxhYmxlPC90ZXh0Pjwvc3ZnPg==';
                }}
              />
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
