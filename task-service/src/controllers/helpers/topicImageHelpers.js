function notFound(message) {
  const err = new Error(message);
  err.status = 404;
  return err;
}

function sendBinaryImage(res, image) {
  res.setHeader(
    "Content-Type",
    image.contentType || "application/octet-stream",
  );
  return res.send(image.data);
}

module.exports = {
  notFound,
  sendBinaryImage,
};
