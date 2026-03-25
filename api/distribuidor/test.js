export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Content-Type', 'application/json');
  return res.status(200).json({ message: 'Test endpoint works!', timestamp: new Date().toISOString() });
}
