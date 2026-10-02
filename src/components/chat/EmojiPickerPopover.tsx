import React, { useState } from "react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Smile } from "lucide-react";

interface EmojiPickerPopoverProps {
  onSelectEmoji: (emoji: string) => void;
  disabled?: boolean;
}

const EMOJI_CATEGORIES = [
  {
    name: "Fe y Bendición 🙏",
    emojis: ["🙏", "🕊️", "✝️", "📖", "👑", "✨", "🕯️", "🛐", "🤍", "❤️", "🔥", "🌿", "⛪", "🛡️", "🎺", "🌟", "🌈", "☀️", "⚓"],
  },
  {
    name: "Emociones & Ánimo 🤍",
    emojis: ["😊", "😌", "🥺", "😢", "😭", "🤗", "🫂", "🫶", "🤝", "💔", "🩹", "🙌", "😇", "😔", "❤️‍🔥", "💐", "🌷", "🌾"],
  },
  {
    name: "Gestos y Símbolos 👍",
    emojis: ["👍", "👏", "🤲", "👐", "☝️", "✌️", "🕊️", "⭐", "🎉", "🔔", "💡", "✅", "💯", "🔥"],
  },
];

export const EmojiPickerPopover: React.FC<EmojiPickerPopoverProps> = ({ onSelectEmoji, disabled }) => {
  const [open, setOpen] = useState(false);
  const [selectedCat, setSelectedCat] = useState(0);

  const handleSelect = (emoji: string) => {
    onSelectEmoji(emoji);
    setOpen(false);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          disabled={disabled}
          className="h-10 w-10 text-slate-500 hover:text-amber-600 hover:bg-amber-50 rounded-xl transition-colors"
          title="Insertar emoji"
        >
          <Smile className="h-5 h-5" />
        </Button>
      </PopoverTrigger>
      <PopoverContent
        side="top"
        align="start"
        className="w-80 p-3 bg-white/95 backdrop-blur-md border border-slate-200 shadow-xl rounded-2xl z-50"
      >
        <div className="flex gap-1 border-b border-slate-100 pb-2 mb-2">
          {EMOJI_CATEGORIES.map((cat, idx) => (
            <button
              key={cat.name}
              type="button"
              onClick={() => setSelectedCat(idx)}
              className={`text-xs px-2.5 py-1 rounded-lg font-medium transition-all ${
                selectedCat === idx
                  ? "bg-teal-700 text-white shadow-xs"
                  : "text-slate-600 hover:bg-slate-100"
              }`}
            >
              {cat.name.split(" ")[0]}
            </button>
          ))}
        </div>

        <div className="text-xs font-semibold text-slate-400 mb-2 px-1">
          {EMOJI_CATEGORIES[selectedCat].name}
        </div>

        <div className="grid grid-cols-7 gap-1.5 max-h-48 overflow-y-auto p-1">
          {EMOJI_CATEGORIES[selectedCat].emojis.map((emoji, i) => (
            <button
              key={i}
              type="button"
              onClick={() => handleSelect(emoji)}
              className="text-xl h-9 w-9 flex items-center justify-center rounded-lg hover:bg-slate-100 hover:scale-125 transition-transform active:scale-95"
            >
              {emoji}
            </button>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
};
