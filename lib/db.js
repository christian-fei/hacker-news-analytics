const monk = require('monk')
module.exports = monk(process.env.MONGO_URI || 'mongodb://localhost:27017/hackernews')
