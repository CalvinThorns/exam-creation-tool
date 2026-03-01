export function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onerror = reject;
    r.onload = () => {
      const result = String(r.result || "");
      const base64 = result.split(",")[1] || "";
      resolve(base64);
    };
    r.readAsDataURL(file);
  });
}
