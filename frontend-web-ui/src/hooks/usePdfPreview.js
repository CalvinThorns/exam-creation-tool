import { useCallback, useEffect, useState } from "react";
import { downloadFileFromObjectUrl } from "../utils/downloadFile";

function base64ToObjectUrl(base64, mimeType = "application/pdf") {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);

  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }

  const blob = new Blob([bytes], { type: mimeType });
  return URL.createObjectURL(blob);
}

export function usePdfPreview(defaultFilename = "document.pdf") {
  const [pdfUrl, setPdfUrl] = useState("");
  const [pdfFilename, setPdfFilename] = useState(defaultFilename);

  const clearPdf = useCallback(() => {
    setPdfUrl((currentUrl) => {
      if (currentUrl) {
        URL.revokeObjectURL(currentUrl);
      }
      return "";
    });
  }, []);

  const setPdfFromBase64 = useCallback(
    ({ base64, filename, mimeType = "application/pdf" }) => {
      if (!base64) {
        clearPdf();
        setPdfFilename(filename || defaultFilename);
        return;
      }

      setPdfUrl((currentUrl) => {
        if (currentUrl) {
          URL.revokeObjectURL(currentUrl);
        }
        return base64ToObjectUrl(base64, mimeType);
      });

      setPdfFilename(filename || defaultFilename);
    },
    [clearPdf, defaultFilename],
  );

  const downloadPdf = useCallback(() => {
    downloadFileFromObjectUrl(pdfUrl, pdfFilename);
  }, [pdfFilename, pdfUrl]);

  useEffect(() => clearPdf, [clearPdf]);

  return {
    pdfUrl,
    pdfFilename,
    setPdfFilename,
    setPdfFromBase64,
    clearPdf,
    downloadPdf,
  };
}
