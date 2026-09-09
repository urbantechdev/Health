import { TASSIAHILL_README_MARKDOWN } from "../constants/readmeContent";

export function downloadReadmeFile(filename: string = "The-Tassia-Hill-Hospital-HMS-Documentation.md") {
  try {
    const blob = new Blob([TASSIAHILL_README_MARKDOWN], { type: "text/markdown;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  } catch (err) {
    console.error("Failed to download README:", err);
  }
}
