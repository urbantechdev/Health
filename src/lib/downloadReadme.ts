import { TASSIAHILL_README_MARKDOWN } from "../constants/readmeContent";
import { toast } from "./promptService";

/**
 * Triggers an instant download of the complete README.md file in the user's browser
 */
export function downloadReadmeFile(filename: string = "Tassiahill-Hospital-HMS-Documentation.md") {
  try {
    const blob = new Blob([TASSIAHILL_README_MARKDOWN], { type: "text/markdown;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    
    toast.success(`Documentation file "${filename}" downloaded successfully!`, "README Downloaded");
  } catch (error) {
    console.error("Failed to download README file:", error);
    toast.error("Could not trigger file download. Please check your browser permissions.", "Download Error");
  }
}
