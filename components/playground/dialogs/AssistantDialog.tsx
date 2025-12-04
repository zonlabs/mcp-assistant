import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Bot, Pencil, Loader2 } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import React from "react";

const PROVIDERS = [
  { id: "openai", name: "OpenAI" },
  { id: "deepseek", name: "DeepSeek" },
];

export type AssistantFormData = {
  name: string;
  description: string;
  instructions: string;
  config: {
    ask_mode: boolean;
    max_tokens: number;
    temperature: number;
    datetime_context: boolean;
    llm_provider?: string;
    llm_api_key?: string;
    llm_name?: string;
  };
};

interface AssistantDialogProps {
  mode: "create" | "edit";
  open: boolean;
  onOpenChange: (v: boolean) => void;
  formData: AssistantFormData;
  setFormData: (v: AssistantFormData) => void;
  onSubmit: (saveApiKey: boolean) => void;
  loading: boolean;
  handleCancel: () => void;
}

const AssistantDialog: React.FC<AssistantDialogProps> = ({
  mode,
  open,
  onOpenChange,
  formData,
  setFormData,
  onSubmit,
  loading,
  handleCancel
}) => {
  const isEditMode = mode === "edit";
  const Icon = isEditMode ? Pencil : Bot;
  const title = isEditMode ? "Edit Assistant" : "Create New Assistant";
  const description = isEditMode
    ? "Update your assistant's configuration and instructions."
    : "Create a custom assistant with specific instructions to personalize your experience.";
  const submitButtonText = isEditMode ? "Update Assistant" : "Create Assistant";
  const loadingText = isEditMode ? "Updating..." : "Creating...";

  // Local state for checkbox (checked = save to DB, unchecked = localStorage only)
  const [saveApiKey, setSaveApiKey] = React.useState(false);

  // Load LLM config from localStorage when dialog opens if no config in formData
  React.useEffect(() => {
    if (open && !formData.config.llm_api_key) {
      const storedConfig = localStorage.getItem('llm_config');
      if (storedConfig) {
        try {
          const config = JSON.parse(storedConfig);
          setFormData({
            ...formData,
            config: {
              ...formData.config,
              llm_provider: config.llm_provider || formData.config.llm_provider,
              llm_api_key: config.llm_api_key
            }
          });
          setSaveApiKey(false); // If loaded from localStorage, checkbox should be unchecked
        } catch (e) {
          console.error('Failed to parse llm_config from localStorage:', e);
        }
      }
    } else if (open && formData.config.llm_api_key) {
      // If API key exists in formData (from DB), checkbox should be checked
      setSaveApiKey(true);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[550px] max-h-[85vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <div className="flex items-center gap-2 mb-1">
            <div className="p-1.5 rounded-full bg-gray-100 dark:bg-zinc-800">
              <Icon className="h-4 w-4 text-gray-900 dark:text-white" />
            </div>
            <DialogTitle className="text-base">{title}</DialogTitle>
          </div>
          <DialogDescription className="text-sm leading-relaxed">
            {description}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4 px-1 overflow-y-auto flex-1 scrollbar-minimal">
          {/* Name */}
          <div className="space-y-2">
            <Label htmlFor="assistant-name">Name *</Label>
            <Input
              id="assistant-name"
              placeholder="My Assistant"
              value={formData.name}
              onChange={e => setFormData({ ...formData, name: e.target.value })}
            />
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="assistant-description">Description</Label>
            <Input
              id="assistant-description"
              placeholder="Brief description of the assistant"
              value={formData.description}
              onChange={e => setFormData({ ...formData, description: e.target.value })}
            />
          </div>

          {/* Instructions */}
          <div className="space-y-2">
            <Label htmlFor="assistant-instructions">Instructions *</Label>
            <Textarea
              id="assistant-instructions"
              placeholder="You are a helpful assistant that..."
              value={formData.instructions}
              onChange={e => setFormData({ ...formData, instructions: e.target.value })}
              rows={5}
            />
          </div>

          {/* LLM Provider Config Section */}
          <div className="space-y-3 pt-2 border-t border-gray-200 dark:border-zinc-700">
            <Label className="text-sm font-semibold">LLM Provider</Label>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Configure your LLM provider and API key (optional, overrides global settings)
            </p>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="llm-provider">Provider</Label>
                <Select
                  value={formData.config.llm_provider || "openai"}
                  onValueChange={value => {
                    setFormData({ ...formData, config: { ...formData.config, llm_provider: value } });

                    // Update localStorage if checkbox is unchecked and we have an API key
                    if (!saveApiKey && formData.config.llm_api_key) {
                      localStorage.setItem('llm_config', JSON.stringify({
                        llm_provider: value,
                        llm_api_key: formData.config.llm_api_key
                      }));
                    }
                  }}
                >
                  <SelectTrigger id="llm-provider">
                    <SelectValue placeholder="Select provider" />
                  </SelectTrigger>
                  <SelectContent>
                    {PROVIDERS.map((p) => (
                      <SelectItem key={p.id} value={p.id}>
                        {p.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="llm-name">LLM Name</Label>
                <Input
                  id="llm-name"
                  placeholder="e.g., gpt-4, claude-3"
                  value={formData.config.llm_name || ""}
                  onChange={e => {
                    setFormData({ ...formData, config: { ...formData.config, llm_name: e.target.value } });
                  }}
                  className="text-sm"
                />
              </div>
            </div>

            <p className="text-xs text-gray-500 dark:text-gray-400">
              If LLM Name is specified, it will replace default models in the dropdown
            </p>

            <div className="space-y-2">
              <Label htmlFor="llm-api-key">API Key</Label>
              <Input
                id="llm-api-key"
                type="password"
                placeholder="Enter your API key (optional)"
                value={formData.config.llm_api_key || ""}
                onChange={e => {
                  const newKey = e.target.value;
                  setFormData({ ...formData, config: { ...formData.config, llm_api_key: newKey } });

                  // Save to localStorage JSON if checkbox is unchecked
                  if (!saveApiKey && newKey) {
                    localStorage.setItem('llm_config', JSON.stringify({
                      llm_provider: formData.config.llm_provider || "openai",
                      llm_api_key: newKey
                    }));
                  }
                }}
                className="font-mono text-sm"
              />

              {/* Checkbox for API key storage preference */}
              <div className="flex items-center space-x-2 pt-1">
                <Checkbox
                  id="save-api-key-db"
                  checked={saveApiKey}
                  onCheckedChange={(checked) => {
                    setSaveApiKey(checked === true);

                    // If switching to localStorage, save the current key
                    if (checked === false && formData.config.llm_api_key) {
                      localStorage.setItem('llm_config', JSON.stringify({
                        llm_provider: formData.config.llm_provider || "openai",
                        llm_api_key: formData.config.llm_api_key
                      }));
                    } else if (checked === true) {
                      // If switching to database, remove from localStorage
                      localStorage.removeItem('llm_config');
                    }
                  }}
                />
                <Label
                  htmlFor="save-api-key-db"
                  className="text-xs font-normal cursor-pointer text-gray-600 dark:text-gray-400"
                >
                  If left unchecked, the API key will be stored locally in your browser&apos;s localStorage.
                </Label>
              </div>
            </div>
          </div>

          {/* Configuration Section */}
          <div className="space-y-3 pt-2 border-t border-gray-200 dark:border-zinc-700">
            <Label className="text-sm font-semibold">Configuration</Label>

            {/* Ask Mode */}
            <div className="flex items-center justify-between">
              <div className="space-y-0.5 flex-1 pr-4">
                <Label htmlFor="ask-mode" className="text-sm font-normal">Ask Mode</Label>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Agent will ask to approve before executing tools/performing actions
                </p>
              </div>
              <Switch
                id="ask-mode"
                checked={formData.config.ask_mode}
                onCheckedChange={checked => setFormData({ ...formData, config: { ...formData.config, ask_mode: checked } })}
              />
            </div>

            {/* DateTime Context */}
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="datetime-context" className="text-sm font-normal">DateTime Context</Label>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Include date and time information
                </p>
              </div>
              <Switch
                id="datetime-context"
                checked={formData.config.datetime_context}
                onCheckedChange={checked => setFormData({ ...formData, config: { ...formData.config, datetime_context: checked } })}
              />
            </div>

            {/* Max Tokens */}
            <div className="space-y-2">
              <Label htmlFor="max-tokens">Max Tokens</Label>
              <Input
                id="max-tokens"
                type="number"
                min={100}
                max={10000}
                step={100}
                value={formData.config.max_tokens}
                onChange={e => setFormData({ ...formData, config: { ...formData.config, max_tokens: parseInt(e.target.value) || 2000 } })}
              />
            </div>

            {/* Temperature */}
            <div className="space-y-2">
              <Label htmlFor="temperature">Temperature</Label>
              <div className="flex items-center gap-3">
                <Input
                  id="temperature"
                  type="number"
                  min={0}
                  max={2}
                  step={0.1}
                  value={formData.config.temperature}
                  onChange={e => setFormData({ ...formData, config: { ...formData.config, temperature: parseFloat(e.target.value) || 0.7 } })}
                  className="flex-1"
                />
              </div>
            </div>
          </div>
        </div>

        <DialogFooter className="flex-row gap-2 sm:gap-2">
          <Button
            variant="outline"
            onClick={handleCancel}
            className="flex-1 cursor-pointer"
          >
            Cancel
          </Button>
          <Button
            onClick={() => onSubmit(saveApiKey)}
            disabled={loading}
            className="flex-1 bg-zinc-900 hover:bg-zinc-800 dark:bg-white dark:hover:bg-gray-100 dark:text-black cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                {loadingText}
              </>
            ) : (
              submitButtonText
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default AssistantDialog;
