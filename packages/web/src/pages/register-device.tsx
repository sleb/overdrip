import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/contexts/auth-context";
import { registerDevice } from "@/lib/register-device";

const RegisterDevice = () => {
  const [deviceName, setDeviceName] = useState("");
  const [registrationCode, setRegistrationCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();
  const { user } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      // User is guaranteed to exist because this route is protected
      if (!user) {
        throw new Error("You must be signed in to register a device");
      }

      const response = await registerDevice({
        code: registrationCode.toUpperCase().trim(),
        deviceName: deviceName.trim() || "Plant Monitor",
      });

      console.log("Device registered successfully:", response.deviceId);
      // Navigate to dashboard to see the newly registered device
      navigate("/");
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to register device";
      console.error("Registration error:", err);
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-md mx-auto">
        <Card>
          <CardHeader className="space-y-1">
            <CardTitle className="text-2xl">Register New Device</CardTitle>
            <CardDescription>
              Enter the registration code displayed on your device
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <label htmlFor="deviceName" className="text-sm font-medium">
                  Device Name
                </label>
                <Input
                  id="deviceName"
                  type="text"
                  placeholder="Office Fern"
                  value={deviceName}
                  onChange={(e) => setDeviceName(e.target.value)}
                  disabled={loading}
                />
                <p className="text-xs text-muted-foreground">
                  Choose a friendly name for this device (optional)
                </p>
              </div>

              <div className="space-y-2">
                <label
                  htmlFor="registrationCode"
                  className="text-sm font-medium"
                >
                  Registration Code
                </label>
                <Input
                  id="registrationCode"
                  type="text"
                  placeholder="XXXX-XXXX"
                  value={registrationCode}
                  onChange={(e) => setRegistrationCode(e.target.value)}
                  disabled={loading}
                  required
                  pattern="[A-Z0-9]{4}-[A-Z0-9]{4}"
                  className="uppercase font-mono"
                />
                <p className="text-xs text-muted-foreground">
                  Enter the 8-character code shown on your device
                </p>
              </div>

              {error && (
                <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-lg">
                  <p className="text-sm text-destructive">{error}</p>
                </div>
              )}

              <Button type="submit" disabled={loading} className="w-full">
                {loading ? (
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  "Register Device"
                )}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default RegisterDevice;
