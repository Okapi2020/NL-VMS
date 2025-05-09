import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardHeader, 
  CardTitle 
} from "@/components/ui/card";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Loader2, RefreshCw, Check, AlertTriangle, XCircle, ChevronRight, ChevronLeft } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { formatDistance } from "date-fns";

type WebhookDelivery = {
  id: number;
  webhookId: number;
  event: string;
  payload: string;
  status: string;
  responseCode?: number;
  responseBody?: string;
  errorMessage?: string;
  timestamp: string;
  retryCount: number;
  nextRetryAt?: string;
};

type WebhookDeliveryHistoryProps = {
  webhookId: number;
};

export function WebhookDeliveryHistory({ webhookId }: WebhookDeliveryHistoryProps) {
  const [limit, setLimit] = useState(10);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [selectedDelivery, setSelectedDelivery] = useState<WebhookDelivery | null>(null);
  
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['/api/admin/webhooks', webhookId, 'deliveries', limit],
    enabled: webhookId > 0,
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString);
      return formatDistance(date, new Date(), { addSuffix: true });
    } catch (e) {
      return "Unknown";
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status.toLowerCase()) {
      case 'delivered':
        return <Badge className="bg-green-500">Delivered</Badge>;
      case 'failed':
        return <Badge variant="destructive">Failed</Badge>;
      case 'pending':
        return <Badge variant="secondary">Pending</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const handleViewDetails = (delivery: WebhookDelivery) => {
    setSelectedDelivery(delivery);
    setDetailsOpen(true);
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Webhook Delivery History</CardTitle>
          <CardDescription>Loading delivery history...</CardDescription>
        </CardHeader>
        <CardContent className="flex justify-center p-6">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  if (isError) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Webhook Delivery History</CardTitle>
          <CardDescription>Failed to load delivery history</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center gap-4 p-4">
            <AlertTriangle className="w-10 h-10 text-destructive" />
            <p className="text-sm text-muted-foreground">
              There was an error loading the webhook delivery history.
            </p>
            <Button variant="outline" onClick={() => refetch()}>
              <RefreshCw className="w-4 h-4 mr-2" />
              Try Again
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  const deliveries = data?.data?.deliveries || [];
  const hasDeliveries = deliveries.length > 0;

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle>Webhook Delivery History</CardTitle>
          <CardDescription>Recent delivery attempts and their status</CardDescription>
        </div>
        <Button variant="outline" size="sm" onClick={() => refetch()}>
          <RefreshCw className="w-4 h-4 mr-2" />
          Refresh
        </Button>
      </CardHeader>
      <CardContent>
        {!hasDeliveries ? (
          <div className="flex flex-col items-center gap-4 p-4 border rounded-lg bg-muted/30">
            <p className="text-sm text-muted-foreground">
              No delivery history available yet. Webhook deliveries will appear here after events are triggered.
            </p>
          </div>
        ) : (
          <>
            <ScrollArea className="h-[350px] rounded-md border">
              <Table>
                <TableHeader className="sticky top-0 bg-background">
                  <TableRow>
                    <TableHead>Event</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Response</TableHead>
                    <TableHead>Time</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {deliveries.map((delivery: WebhookDelivery) => (
                    <TableRow key={delivery.id}>
                      <TableCell className="font-medium">
                        {delivery.event}
                      </TableCell>
                      <TableCell>
                        {getStatusBadge(delivery.status)}
                        {delivery.retryCount > 0 && (
                          <span className="ml-2 text-xs text-muted-foreground">
                            ({delivery.retryCount} retries)
                          </span>
                        )}
                      </TableCell>
                      <TableCell>
                        {delivery.responseCode ? (
                          <span className={delivery.responseCode >= 200 && delivery.responseCode < 300 ? "text-green-500" : "text-destructive"}>
                            {delivery.responseCode}
                          </span>
                        ) : delivery.status.toLowerCase() === 'failed' ? (
                          <span className="text-xs text-destructive">Error</span>
                        ) : (
                          <span className="text-xs text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {formatDate(delivery.timestamp)}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          onClick={() => handleViewDetails(delivery)}
                        >
                          <ChevronRight className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </ScrollArea>
            <div className="flex justify-between items-center mt-4">
              <div className="text-sm text-muted-foreground">
                Showing {deliveries.length} deliveries
              </div>
              <div className="flex gap-2">
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => setLimit(prev => prev + 10)}
                  disabled={deliveries.length < limit}
                >
                  Load More
                </Button>
              </div>
            </div>
          </>
        )}
      </CardContent>

      {/* Delivery Details Dialog */}
      <Dialog open={detailsOpen} onOpenChange={setDetailsOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Webhook Delivery Details</DialogTitle>
            <DialogDescription>
              Detailed information about this webhook delivery attempt
            </DialogDescription>
          </DialogHeader>
          
          {selectedDelivery && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <h4 className="text-sm font-medium">Event Type</h4>
                  <p className="text-sm">{selectedDelivery.event}</p>
                </div>
                <div>
                  <h4 className="text-sm font-medium">Status</h4>
                  <div className="mt-1">{getStatusBadge(selectedDelivery.status)}</div>
                </div>
                <div>
                  <h4 className="text-sm font-medium">Timestamp</h4>
                  <p className="text-sm">{new Date(selectedDelivery.timestamp).toLocaleString()}</p>
                </div>
                <div>
                  <h4 className="text-sm font-medium">Response Code</h4>
                  <p className="text-sm">{selectedDelivery.responseCode || 'N/A'}</p>
                </div>
                {selectedDelivery.retryCount > 0 && (
                  <div>
                    <h4 className="text-sm font-medium">Retry Count</h4>
                    <p className="text-sm">{selectedDelivery.retryCount}</p>
                  </div>
                )}
                {selectedDelivery.nextRetryAt && (
                  <div>
                    <h4 className="text-sm font-medium">Next Retry</h4>
                    <p className="text-sm">{formatDate(selectedDelivery.nextRetryAt)}</p>
                  </div>
                )}
              </div>
              
              <div>
                <h4 className="text-sm font-medium mb-2">Payload</h4>
                <pre className="bg-muted p-4 rounded-md text-xs overflow-auto max-h-32">
                  {JSON.stringify(JSON.parse(selectedDelivery.payload), null, 2)}
                </pre>
              </div>
              
              {selectedDelivery.responseBody && (
                <div>
                  <h4 className="text-sm font-medium mb-2">Response Body</h4>
                  <pre className="bg-muted p-4 rounded-md text-xs overflow-auto max-h-32">
                    {selectedDelivery.responseBody}
                  </pre>
                </div>
              )}
              
              {selectedDelivery.errorMessage && (
                <div>
                  <h4 className="text-sm font-medium mb-2 text-destructive">Error Message</h4>
                  <pre className="bg-destructive/10 p-4 rounded-md text-xs overflow-auto max-h-32 text-destructive">
                    {selectedDelivery.errorMessage}
                  </pre>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </Card>
  );
}