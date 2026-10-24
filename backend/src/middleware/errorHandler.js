// 404 for unknown routes.
const notFound = (req, res) => res.status(404).json({ message: 'Not found' });

// Final error handler: malformed JSON, errors thrown with a statusCode, and anything unexpected.
// eslint-disable-next-line no-unused-vars
const errorHandler = (err, req, res, next) => {
  if (err.type === 'entity.parse.failed') return res.status(400).json({ message: 'Invalid JSON body' });
  const status = err.statusCode || err.status || 500;
  if (status >= 500) console.error(err);
  res.status(status).json({ message: status >= 500 && !err.expose ? 'Internal Server Error' : err.message });
};

module.exports = { notFound, errorHandler };
