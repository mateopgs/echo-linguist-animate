
import React from "react";
import { Switch } from "./ui/switch";
import { Label } from "./ui/label";
import { Card, CardContent } from "./ui/card";
import { RadioGroup, RadioGroupItem } from "./ui/radio-group";
import { useVoiceAssistant } from "../contexts/VoiceAssistantContext";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { Form, FormControl, FormField, FormItem, FormLabel } from "./ui/form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";

// Define the schema for the form
const formSchema = z.object({
  segmentProfile: z.string().default("spanish-conversation"),
  customSegmentInterval: z.number().min(100).max(3000).default(300),
});

type FormValues = z.infer<typeof formSchema>;

// Define segment profiles with their corresponding intervals in milliseconds
const segmentProfiles = {
  "spanish-presentation": 100,   // 0.1 seconds for Spanish presentations
  "spanish-conversation": 500,   // 0.5 seconds for Spanish conversations
  "german-presentation": 300,    // 0.3 seconds for German presentations
  "german-conversation": 800,    // 0.8 seconds for German conversations
  "custom": -1                   // Custom value (user-defined)
};

const ConfigForm: React.FC = () => {
  const {
    isRealTimeMode,
    setRealTimeMode,
    isCapturingWhileSpeaking,
    setCapturingWhileSpeaking,
    segmentInterval,
    setSegmentInterval
  } = useVoiceAssistant();

  // Initialize form with current values
  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      segmentProfile: "spanish-conversation",
      customSegmentInterval: segmentInterval,
    },
  });

  // Watch for profile changes to update interval automatically
  const selectedProfile = form.watch("segmentProfile");
  
  React.useEffect(() => {
    if (selectedProfile !== "custom") {
      const profileInterval = segmentProfiles[selectedProfile as keyof typeof segmentProfiles];
      if (profileInterval > 0) {
        setSegmentInterval(profileInterval);
      }
    }
  }, [selectedProfile, setSegmentInterval]);

  // Handler for custom interval slider
  const handleIntervalChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseInt(e.target.value);
    form.setValue("customSegmentInterval", value);
    if (selectedProfile === "custom") {
      setSegmentInterval(value);
    }
  };

  // Handler for profile changes
  const handleProfileChange = (value: string) => {
    form.setValue("segmentProfile", value);
  };

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardContent className="flex flex-col items-center justify-center py-6 space-y-6">
        <div className="flex items-center justify-center space-x-2">
          <Switch id="real-time-mode" checked={isRealTimeMode} onCheckedChange={setRealTimeMode} />
          <Label htmlFor="real-time-mode">Real-time translation mode</Label>
        </div>
        
        <div className="flex items-center justify-center space-x-2">
          <Switch id="simultaneous-capture" checked={isCapturingWhileSpeaking} onCheckedChange={setCapturingWhileSpeaking} />
          <Label htmlFor="simultaneous-capture">Capture audio while speaking (overlap)</Label>
        </div>
        
        <Form {...form}>
          <div className="flex flex-col items-start justify-center space-y-4 w-full">
            <FormField
              control={form.control}
              name="segmentProfile"
              render={({ field }) => (
                <FormItem className="w-full">
                  <FormLabel>Segmentation Profile</FormLabel>
                  <FormControl>
                    <Select 
                      value={field.value} 
                      onValueChange={handleProfileChange}
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Select profile" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="spanish-presentation">Spanish - Presentation (0.1s)</SelectItem>
                        <SelectItem value="spanish-conversation">Spanish - Conversation (0.5s)</SelectItem>
                        <SelectItem value="german-presentation">German - Presentation (0.3s)</SelectItem>
                        <SelectItem value="german-conversation">German - Conversation (0.8s)</SelectItem>
                        <SelectItem value="custom">Custom</SelectItem>
                      </SelectContent>
                    </Select>
                  </FormControl>
                </FormItem>
              )}
            />
            
            {selectedProfile === "custom" && (
              <div className="flex flex-col items-center justify-center space-y-1 w-full">
                <Label htmlFor="segment-interval">
                  Custom Segment Interval: {form.getValues("customSegmentInterval") / 1000} seconds
                </Label>
                <input
                  type="range"
                  id="segment-interval"
                  min="100"
                  max="3000"
                  step="100"
                  value={form.getValues("customSegmentInterval")}
                  onChange={handleIntervalChange}
                  className="w-3/4"
                />
              </div>
            )}
          </div>
        </Form>
      </CardContent>
    </Card>
  );
};

export default ConfigForm;
