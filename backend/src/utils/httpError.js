// Error with an HTTP status code. `expose` marks 5xx messages that are safe to show the client.
const httpError = (statusCode, message, { expose = statusCode < 500 } = {}) => {
  const err = new Error(message);
  err.statusCode = statusCode;
  err.expose = expose;
  return err;
};

// Sends an error raised in a controller as JSON.
const sendError = (res, err, fallbackStatus = 500) => {
  const status = err.statusCode || fallbackStatus;
  if (status >= 500 && !err.expose) console.error(err);
  res.status(status).json({ message: status >= 500 && !err.expose ? 'Internal Server Error' : err.message });
};

module.exports = { httpError, sendError };
