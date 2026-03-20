export function downloadFileFromObjectUrl(fileUrl, filename = "download") {
  if (!fileUrl) return;

  const link = document.createElement("a");
  link.href = fileUrl;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
}
