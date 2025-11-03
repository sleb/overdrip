import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export interface Device {
  id: string;
  name: string;
  code: string;
  registeredAt: Date;
}

interface DeviceCardProps {
  device: Device;
  onUnregister: (deviceId: string) => Promise<void>;
}

export const DeviceCard = ({ device, onUnregister }: DeviceCardProps) => {
  const [loading, setLoading] = useState(false);

  const handleUnregister = async () => {
    if (!confirm(`Are you sure you want to unregister "${device.name}"?`)) {
      return;
    }

    setLoading(true);
    try {
      await onUnregister(device.id);
    } catch (error) {
      console.error("Failed to unregister device:", error);
      alert("Failed to unregister device. Please try again.");
      setLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">{device.name}</CardTitle>
        <CardDescription>Code: {device.code}</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="text-sm text-muted-foreground">
          <p>
            Registered:{" "}
            {device.registeredAt.toLocaleDateString("en-US", {
              year: "numeric",
              month: "short",
              day: "numeric",
            })}
          </p>
          <p className="text-xs mt-1">Device ID: {device.id}</p>
        </div>
      </CardContent>
      <CardFooter>
        <Button
          variant="destructive"
          size="sm"
          onClick={handleUnregister}
          disabled={loading}
          className="w-full"
        >
          {loading ? "Unregistering..." : "Unregister Device"}
        </Button>
      </CardFooter>
    </Card>
  );
};
