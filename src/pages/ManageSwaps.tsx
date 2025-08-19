import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowLeftRight, Clock, MapPin, User, Calendar } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { format } from "date-fns";

// Mock data - replace with actual API calls
const mockSwapRequests = [
  {
    id: 1,
    requesterName: "Sarah Johnson",
    requesterShift: { date: "2024-01-15", time: "06:00-14:00", location: "LHR" },
    accepterShift: { date: "2024-01-18", time: "14:00-22:00", location: "LGW" },
    status: "pending",
    createdAt: new Date("2024-01-10")
  },
  {
    id: 2,
    requesterName: "Mike Chen",
    requesterShift: { date: "2024-01-20", time: "22:00-06:00", location: "LGW" },
    accepterShift: { date: "2024-01-22", time: "06:00-14:00", location: "LHR" },
    status: "accepted",
    createdAt: new Date("2024-01-12")
  }
];

const mockMyRequests = [
  {
    id: 3,
    accepterName: "Emma Wilson",
    myShift: { date: "2024-01-25", time: "14:00-22:00", location: "LHR" },
    theirShift: { date: "2024-01-28", time: "06:00-14:00", location: "LGW" },
    status: "pending",
    createdAt: new Date("2024-01-14")
  }
];

const ManageSwaps = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("incoming");

  const getStatusBadge = (status: string) => {
    const variants: Record<string, any> = {
      pending: "secondary",
      accepted: "default",
      rejected: "destructive"
    };
    return variants[status] || "secondary";
  };

  const handleAcceptSwap = (swapId: number) => {
    // TODO: Implement swap acceptance
    console.log("Accepting swap:", swapId);
  };

  const handleRejectSwap = (swapId: number) => {
    // TODO: Implement swap rejection
    console.log("Rejecting swap:", swapId);
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-bold">Manage Swaps</h1>
            <Button variant="outline" onClick={() => navigate('/dashboard')}>
              Back to Dashboard
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="incoming">Incoming Requests</TabsTrigger>
              <TabsTrigger value="my-requests">My Requests</TabsTrigger>
            </TabsList>

            <TabsContent value="incoming" className="space-y-4">
              <div className="text-center mb-6">
                <h2 className="text-xl font-semibold mb-2">Swap Requests for You</h2>
                <p className="text-muted-foreground">
                  Review and respond to shift swap requests from other crew members
                </p>
              </div>

              {mockSwapRequests.length === 0 ? (
                <Card>
                  <CardContent className="pt-6 text-center">
                    <ArrowLeftRight className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                    <p className="text-lg font-medium mb-2">No incoming requests</p>
                    <p className="text-muted-foreground">
                      You don't have any pending swap requests at the moment.
                    </p>
                  </CardContent>
                </Card>
              ) : (
                <div className="space-y-4">
                  {mockSwapRequests.map((request) => (
                    <Card key={request.id}>
                      <CardHeader>
                        <div className="flex items-center justify-between">
                          <CardTitle className="flex items-center gap-2">
                            <User className="h-5 w-5" />
                            Swap Request from {request.requesterName}
                          </CardTitle>
                          <Badge variant={getStatusBadge(request.status)}>
                            {request.status}
                          </Badge>
                        </div>
                        <CardDescription>
                          Requested {format(request.createdAt, 'MMM d, yyyy')}
                        </CardDescription>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <h4 className="font-medium text-sm text-muted-foreground">
                              THEY GIVE YOU
                            </h4>
                            <div className="bg-green-50 dark:bg-green-950/20 p-3 rounded-lg">
                              <div className="flex items-center gap-2 mb-1">
                                <Calendar className="h-4 w-4" />
                                <span className="font-medium">{request.requesterShift.date}</span>
                              </div>
                              <div className="flex items-center gap-2 mb-1">
                                <Clock className="h-4 w-4" />
                                <span>{request.requesterShift.time}</span>
                              </div>
                              <div className="flex items-center gap-2">
                                <MapPin className="h-4 w-4" />
                                <span>{request.requesterShift.location}</span>
                              </div>
                            </div>
                          </div>

                          <div className="space-y-2">
                            <h4 className="font-medium text-sm text-muted-foreground">
                              YOU GIVE THEM
                            </h4>
                            <div className="bg-blue-50 dark:bg-blue-950/20 p-3 rounded-lg">
                              <div className="flex items-center gap-2 mb-1">
                                <Calendar className="h-4 w-4" />
                                <span className="font-medium">{request.accepterShift.date}</span>
                              </div>
                              <div className="flex items-center gap-2 mb-1">
                                <Clock className="h-4 w-4" />
                                <span>{request.accepterShift.time}</span>
                              </div>
                              <div className="flex items-center gap-2">
                                <MapPin className="h-4 w-4" />
                                <span>{request.accepterShift.location}</span>
                              </div>
                            </div>
                          </div>
                        </div>

                        {request.status === "pending" && (
                          <div className="flex gap-2 pt-2">
                            <Button 
                              onClick={() => handleAcceptSwap(request.id)}
                              className="flex-1"
                            >
                              Accept Swap
                            </Button>
                            <Button 
                              variant="outline"
                              onClick={() => handleRejectSwap(request.id)}
                              className="flex-1"
                            >
                              Decline
                            </Button>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </TabsContent>

            <TabsContent value="my-requests" className="space-y-4">
              <div className="text-center mb-6">
                <h2 className="text-xl font-semibold mb-2">Your Swap Requests</h2>
                <p className="text-muted-foreground">
                  Track the status of swap requests you've sent to other crew members
                </p>
              </div>

              {mockMyRequests.length === 0 ? (
                <Card>
                  <CardContent className="pt-6 text-center">
                    <ArrowLeftRight className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                    <p className="text-lg font-medium mb-2">No active requests</p>
                    <p className="text-muted-foreground">
                      You haven't sent any swap requests recently.
                    </p>
                  </CardContent>
                </Card>
              ) : (
                <div className="space-y-4">
                  {mockMyRequests.map((request) => (
                    <Card key={request.id}>
                      <CardHeader>
                        <div className="flex items-center justify-between">
                          <CardTitle className="flex items-center gap-2">
                            <User className="h-5 w-5" />
                            Swap Request to {request.accepterName}
                          </CardTitle>
                          <Badge variant={getStatusBadge(request.status)}>
                            {request.status}
                          </Badge>
                        </div>
                        <CardDescription>
                          Sent {format(request.createdAt, 'MMM d, yyyy')}
                        </CardDescription>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <h4 className="font-medium text-sm text-muted-foreground">
                              YOU GIVE
                            </h4>
                            <div className="bg-blue-50 dark:bg-blue-950/20 p-3 rounded-lg">
                              <div className="flex items-center gap-2 mb-1">
                                <Calendar className="h-4 w-4" />
                                <span className="font-medium">{request.myShift.date}</span>
                              </div>
                              <div className="flex items-center gap-2 mb-1">
                                <Clock className="h-4 w-4" />
                                <span>{request.myShift.time}</span>
                              </div>
                              <div className="flex items-center gap-2">
                                <MapPin className="h-4 w-4" />
                                <span>{request.myShift.location}</span>
                              </div>
                            </div>
                          </div>

                          <div className="space-y-2">
                            <h4 className="font-medium text-sm text-muted-foreground">
                              YOU GET
                            </h4>
                            <div className="bg-green-50 dark:bg-green-950/20 p-3 rounded-lg">
                              <div className="flex items-center gap-2 mb-1">
                                <Calendar className="h-4 w-4" />
                                <span className="font-medium">{request.theirShift.date}</span>
                              </div>
                              <div className="flex items-center gap-2 mb-1">
                                <Clock className="h-4 w-4" />
                                <span>{request.theirShift.time}</span>
                              </div>
                              <div className="flex items-center gap-2">
                                <MapPin className="h-4 w-4" />
                                <span>{request.theirShift.location}</span>
                              </div>
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </TabsContent>
          </Tabs>
        </div>
      </main>
    </div>
  );
};

export default ManageSwaps;