import { db } from "@overdrip/core/firebase";
import { collection, deleteDoc, doc, onSnapshot } from "firebase/firestore";
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { DeviceCard, type Device } from "@/components/device-card";
import { useAuth } from "@/contexts/auth-context";

const Dashboard = () => {
  const { user } = useAuth();
  const [devices, setDevices] = useState<Device[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const handleUnregister = async (deviceId: string) => {
    if (!user) return;

    const deviceRef = doc(db, "users", user.uid, "devices", deviceId);
    await deleteDoc(deviceRef);
  };

  useEffect(() => {
    if (!user) return;

    // Subscribe to real-time updates for user's devices
    const devicesRef = collection(db, "users", user.uid, "devices");

    const unsubscribe = onSnapshot(
      devicesRef,
      (snapshot) => {
        const devicesList: Device[] = [];
        snapshot.forEach((doc) => {
          const data = doc.data();
          devicesList.push({
            id: doc.id,
            name: data.name,
            code: data.code,
            registeredAt: data.registeredAt?.toDate() || new Date(),
          });
        });

        // Sort by registration date (newest first)
        devicesList.sort(
          (a, b) => b.registeredAt.getTime() - a.registeredAt.getTime(),
        );

        setDevices(devicesList);
        setLoading(false);
      },
      (err) => {
        console.error("Error fetching devices:", err);
        setError("Failed to load devices");
        setLoading(false);
      },
    );

    // Cleanup subscription on unmount
    return () => unsubscribe();
  }, [user]);

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-center py-12">
          <div className="w-8 h-8 border-4 border-gray-200 border-t-gray-600 rounded-full animate-spin" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Card className="border-destructive">
          <CardContent className="pt-6">
            <p className="text-sm text-destructive">{error}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">My Devices</h1>
          <p className="text-gray-600 mt-1">
            Manage your Overdrip plant watering devices
          </p>
        </div>
        <Button asChild>
          <Link to="/register">Register New Device</Link>
        </Button>
      </div>

      {devices.length === 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>No devices registered yet</CardTitle>
            <CardDescription>
              Get started by registering your first Overdrip device
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild variant="outline">
              <Link to="/register">Register Your First Device</Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {devices.map((device) => (
            <DeviceCard
              key={device.id}
              device={device}
              onUnregister={handleUnregister}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export default Dashboard;
