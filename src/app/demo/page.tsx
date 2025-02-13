"use client";

import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Plus, Moon } from "lucide-react";
import { motion } from "framer-motion";

export default function Dashboard() {
  const [components, setComponents] = useState<string[]>([]);

  const addFlashcard = () => {
    setComponents([...components, "flashcard"]);
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Notion-Like Dashboard</h1>
        <Button variant="ghost">
          <Moon className="w-5 h-5" />
        </Button>
      </div>
      <div className="space-y-4">
        <Textarea placeholder="Start typing..." className="bg-gray-800 border-gray-700 text-white" />
        <Button onClick={addFlashcard} className="flex items-center gap-2 bg-gray-700 hover:bg-gray-600">
          <Plus className="w-4 h-4" /> Add Flashcard
        </Button>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {components.map((component, index) => (
            <motion.div key={index} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
              {component === "flashcard" && (
                <Card className="bg-gray-800 border-gray-700 text-white p-4">
                  <CardContent>
                    <p className="text-sm">Flashcard Content</p>
                  </CardContent>
                </Card>
              )}
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
}
